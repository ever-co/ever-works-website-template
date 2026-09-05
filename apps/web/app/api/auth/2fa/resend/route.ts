import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getClientAccountByEmail, getClientProfileByUserId, verifyClientPassword } from '@/lib/db/queries';
import { issueTwoFactorCode } from '@/lib/auth/two-factor';
import { TWO_FACTOR_CODE_TTL_MINUTES } from '@/lib/auth/two-factor-code';
import { ratelimit } from '@/lib/utils/rate-limit';
import { resendResponseForIssuance } from '@/lib/auth/two-factor-resend';
import { comparePasswords } from '@/lib/auth/credentials';

/**
 * bcrypt hash of a value nobody holds, used only to equalise timing on the
 * unknown-account path. Constant rather than generated per request because
 * hashing on every miss would itself be a distinguishable cost.
 */
const DUMMY_PASSWORD_HASH = '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

/**
 * Resend budget: 3 per 10 minutes, keyed by IP *and* by email.
 *
 * Deliberately tighter than the sign-in limiter because this endpoint
 * sends mail: without it, a stranger who knows an address could use it
 * to bomb that inbox. Both keys are checked so neither a single noisy
 * IP nor a distributed attempt on one address gets a free pass — but the
 * per-address budget is only CONSULTED once the account, password and 2FA
 * flag have all checked out. Consulting it earlier would both let a stranger
 * lock the real owner out of their own resends and turn its 429 into an
 * enumeration signal.
 */
const RESEND_LIMIT = 3;
const RESEND_WINDOW_MS = 10 * 60 * 1000;

/**
 * A bcrypt comparison against a throwaway hash, so an unknown address costs
 * roughly what a known one does. Never throws: a failure here must not turn
 * the generic 200 into a 500 and reintroduce the very signal it removes.
 */
async function burnPasswordComparison(password: string): Promise<void> {
	try {
		await comparePasswords(password, DUMMY_PASSWORD_HASH);
	} catch {
		// ignored on purpose
	}
}

const resendSchema = z.object({
	email: z.string().email().max(255),
	// The password is re-checked here, exactly as on the first sign-in leg.
	// There is no session yet at this point in the flow, so it is the only
	// proof that the caller is the person mid-login rather than a passer-by
	// who guessed an email address.
	password: z.string().min(1).max(100)
});

/**
 * @swagger
 * /api/auth/2fa/resend:
 *   post:
 *     tags: ["Authentication"]
 *     summary: "Resend the email two-factor sign-in code"
 *     description: "Issues a fresh one-time code for an account with 2FA enabled and emails it, invalidating any previous code. Requires the account password because no session exists mid-login. Every outcome that depends on whether the address exists, the password is right or 2FA is on shares one generic 200 envelope, so it cannot be used to enumerate accounts. Once the credentials have checked out it reports the truth: 429 when a resend or issuance budget is spent, 502 when the code could not be emailed. Rate limited to 3 requests per 10 minutes per IP and per email."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: "Request accepted; a code was sent when the credentials and 2FA state allow it"
 *       400:
 *         description: "Invalid request body"
 *       429:
 *         description: "Too many resend requests, or the account's issuance budget is spent"
 *       500:
 *         description: "Internal server error"
 *       502:
 *         description: "The credentials checked out but the code could not be emailed"
 */
export async function POST(request: NextRequest) {
	try {
		// `x-forwarded-for` is a comma-separated chain, and the whole string is
		// caller-controllable: keying on it verbatim would let one client rotate
		// the header and mint a fresh budget on every request. Take only the
		// first entry — the conventional client address — and normalise it.
		const forwardedFor = request.headers.get('x-forwarded-for');
		const clientIP =
			forwardedFor?.split(',')[0]?.trim() || request.headers.get('x-real-ip')?.trim() || 'unknown';

		const body = await request.json().catch(() => null);
		const parsed = resendSchema.safeParse(body);
		if (!parsed.success) {
			return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 });
		}

		const email = parsed.data.email.toLowerCase().trim();

		const tooManyRequests = (retryAfter?: number) =>
			NextResponse.json(
				{
					success: false,
					error: 'Too many code requests. Please wait before trying again.',
					retryAfter
				},
				{ status: 429 }
			);

		// The IP bucket is spent up front — it is the circuit breaker that bounds
		// the work an anonymous caller can make this route do.
		const ipBudget = await ratelimit(`2fa-resend:ip:${clientIP}`, RESEND_LIMIT, RESEND_WINDOW_MS);
		if (!ipBudget.success) {
			return tooManyRequests(ipBudget.retryAfter);
		}

		// The EMAIL bucket is neither read nor spent here. It is checked ONLY
		// after the account, the password and the 2FA flag have all checked out,
		// for two reasons: spending it up front would let a stranger deny the
		// real owner their resends with three wrong-password requests, and even
		// *reading* it up front would turn a 429 into a signal that the address
		// exists and has had recent authenticated activity.
		const emailBudgetKey = `2fa-resend:email:${email}`;

		// Generic success envelope used for every non-rate-limited outcome so
		// the response body never reveals whether the address exists, whether
		// the password was right, or whether 2FA is on for it.
		const accepted = NextResponse.json({
			success: true,
			data: { expiresInMinutes: TWO_FACTOR_CODE_TTL_MINUTES }
		});

		const clientAccount = await getClientAccountByEmail(email);
		if (!clientAccount) {
			// Spend a comparable amount of time on a miss. Without this, "no such
			// account" returns before any bcrypt work and "wrong password" returns
			// after it, so the response TIME distinguishes the two even though the
			// body does not.
			await burnPasswordComparison(parsed.data.password);
			return accepted;
		}

		const passwordValid = await verifyClientPassword(email, parsed.data.password);
		if (!passwordValid) return accepted;

		const profile = await getClientProfileByUserId(clientAccount.userId);
		if (!profile || !profile.twoFactorEnabled) return accepted;

		// Credentials are good: NOW charge the per-address budget, so only the
		// account's real owner can spend it.
		const emailBudget = await ratelimit(emailBudgetKey, RESEND_LIMIT, RESEND_WINDOW_MS);
		if (!emailBudget.success) {
			return tooManyRequests(emailBudget.retryAfter);
		}

		const issued = await issueTwoFactorCode({
			userId: profile.userId,
			email: profile.email,
			tenantId: profile.tenantId,
			userName: profile.displayName || profile.name
		});

		// Answer what actually happened. Returning the generic `accepted` here
		// regardless would tell the sign-in form "a new code is on its way",
		// which resets its countdown and CLEARS the code box — stranding a user
		// whose issuance budget was spent (or whose mail send failed) with no
		// code, no way to reach the one they already had, and a timer counting
		// down on nothing. This branch is only reachable once the account, the
		// password and the 2FA flag have all checked out — the same point the
		// per-address 429 above sits at — so it leaks nothing to a caller who
		// does not already hold the password. See `lib/auth/two-factor-resend.ts`.
		const outcome = resendResponseForIssuance(issued, TWO_FACTOR_CODE_TTL_MINUTES);
		if (outcome.status === 200) return accepted;

		return NextResponse.json(outcome.body, { status: outcome.status });
	} catch (error) {
		console.error('Two-factor resend error:', error);
		return NextResponse.json(
			{ success: false, error: 'Internal server error. Please try again later.' },
			{ status: 500 }
		);
	}
}
