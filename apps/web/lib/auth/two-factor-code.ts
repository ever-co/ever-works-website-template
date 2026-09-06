import crypto from 'crypto';
import { getRuntimeAuthSecret } from './auth-secret';

/**
 * Pure, dependency-free primitives behind email two-factor authentication
 * (spec 053 — EW-135 … EW-142).
 *
 * Everything here is deliberately free of database, mail, `next/headers`
 * and session imports so that it can be unit-tested directly (see
 * `apps/web-e2e/tests/unit/two-factor-code.spec.ts`) without spinning up an
 * app. It does use `node:crypto`, so it belongs to the Node runtime — every
 * caller (the API routes, the server action, the NextAuth `authorize`
 * callback) already runs there. The stateful half — reading and writing
 * `twoFactorCodes` / `client_profiles` — lives in `lib/auth/two-factor.ts`.
 *
 * **The plaintext code is never persisted.** `issueTwoFactorCode` stores
 * only `hashTwoFactorCode(code)` — an HMAC-SHA256 under a server-only key,
 * not a bare digest, because the six-digit code space is small enough to
 * reverse a plain SHA-256 in about a second. Verification re-hashes the
 * submitted value and compares the two digests with
 * {@link constantTimeEqualsHex}. A database dump therefore yields no
 * usable code without the key, and comparison leaks no timing signal about
 * how many leading characters were right.
 */

/** Number of decimal digits in a generated code. */
export const TWO_FACTOR_CODE_LENGTH = 6;

/**
 * Read a `TWO_FACTOR_*` override, falling back on anything that is not a
 * positive whole number.
 *
 * Exported for the unit spec: every constant below is resolved once at
 * import time from `process.env`, so the only way to pin the parsing rules
 * is to call the parser directly.
 *
 * `Number.isSafeInteger` rather than `Number.isFinite` + `Math.floor`.
 * Flooring silently turned a positive fraction into ZERO, and zero is not
 * an inert value here — it is the most dangerous one these settings can
 * take: `TWO_FACTOR_CODE_TTL_MS=0.5` would have made every code expire the
 * instant it was minted (nobody with 2FA on could ever sign in), and
 * `TWO_FACTOR_MAX_ATTEMPTS=0.5` would have locked an account on its first
 * wrong digit. A typo must land on the documented default, never
 * reconfigure the control. Values past `Number.MAX_SAFE_INTEGER` are
 * refused for the same reason: they no longer round-trip as themselves.
 */
export function readPositiveIntEnv(name: string, fallback: number): number {
	const raw = process.env[name];
	if (!raw) return fallback;
	const parsed = Number(raw);
	return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Code lifetime in milliseconds. Ten minutes by default (EW-140);
 * override with `TWO_FACTOR_CODE_TTL_MS`.
 */
export const TWO_FACTOR_CODE_TTL_MS = readPositiveIntEnv('TWO_FACTOR_CODE_TTL_MS', 10 * 60 * 1000);

/**
 * Consecutive failed verifications tolerated before the account is
 * temporarily locked out of code validation. Five by default (EW-141);
 * override with `TWO_FACTOR_MAX_ATTEMPTS`.
 */
export const TWO_FACTOR_MAX_ATTEMPTS = readPositiveIntEnv('TWO_FACTOR_MAX_ATTEMPTS', 5);

/**
 * How long the lockout lasts once the threshold is crossed. Fifteen
 * minutes by default; override with `TWO_FACTOR_LOCK_MS`.
 */
export const TWO_FACTOR_LOCK_MS = readPositiveIntEnv('TWO_FACTOR_LOCK_MS', 15 * 60 * 1000);

/** Minutes of validity, for display in the email and the sign-in UI. */
export const TWO_FACTOR_CODE_TTL_MINUTES = Math.max(1, Math.round(TWO_FACTOR_CODE_TTL_MS / 60_000));

/**
 * Generate a cryptographically random zero-padded decimal code.
 *
 * `crypto.randomInt` is used rather than `Math.random()` (not a CSPRNG)
 * and rather than `randomBytes % 10**n` (which would bias the low
 * digits): `randomInt` rejection-samples internally, so every value in
 * `[0, 10**length)` is equally likely.
 */
export function generateTwoFactorCode(length: number = TWO_FACTOR_CODE_LENGTH): string {
	const max = 10 ** length;
	return String(crypto.randomInt(0, max)).padStart(length, '0');
}

/**
 * The key the code digest is computed under.
 *
 * `TWO_FACTOR_CODE_SECRET` when set, otherwise whatever
 * {@link getRuntimeAuthSecret} resolves — `AUTH_SECRET`, falling back to the
 * legacy `COOKIE_SECRET`. Deliberately the SAME resolution the auth config
 * uses: a deployment running on `COOKIE_SECRET` alone boots fine, so keying
 * only off `AUTH_SECRET` here would have thrown at code-issuing time on an
 * otherwise valid install.
 *
 * Throwing rather than falling back to an unkeyed digest is deliberate: a
 * silent fallback would leave the very property this key exists to provide
 * (see {@link hashTwoFactorCode}) quietly absent in production.
 */
export function twoFactorCodeSecret(): string {
	const secret = process.env.TWO_FACTOR_CODE_SECRET?.trim() || getRuntimeAuthSecret();
	if (!secret) {
		throw new Error(
			'Two-factor codes require a server secret: set AUTH_SECRET (or COOKIE_SECRET, or TWO_FACTOR_CODE_SECRET) before enabling 2FA.'
		);
	}
	return secret;
}

/**
 * Hex HMAC-SHA256 of a code under a server-only key. The only
 * representation that reaches the database.
 *
 * **Why keyed and not a plain digest.** The code space is only 10^6, so an
 * unkeyed SHA-256 of a six-digit code is reversible by anyone who can read
 * the table — a full rainbow table fits in a few megabytes and takes about
 * a second to build. A keyed HMAC makes the digest useless without the
 * server secret, which lives in the environment and not in the database, so
 * a stolen dump alone yields nothing. A slow KDF would also work, but it
 * would put a deliberate cost on a sign-in hot path for a secret that
 * already expires in ten minutes and tolerates only five guesses.
 */
export function hashTwoFactorCode(code: string, secret: string = twoFactorCodeSecret()): string {
	return crypto.createHmac('sha256', secret).update(normalizeTwoFactorCode(code)).digest('hex');
}

/**
 * Strip whitespace (and the separators people paste from an email, e.g.
 * `123 456` or `123-456`) so a visually correct code is not rejected for
 * cosmetic reasons.
 */
export function normalizeTwoFactorCode(code: string): string {
	return code.replace(/[\s-]/g, '');
}

/** `true` when the submitted value is a plausible code, before any DB work. */
export function isWellFormedTwoFactorCode(code: string, length: number = TWO_FACTOR_CODE_LENGTH): boolean {
	const normalized = normalizeTwoFactorCode(code);
	return normalized.length === length && /^[0-9]+$/.test(normalized);
}

/** Even-length, non-empty, hexadecimal. */
const HEX_DIGEST = /^(?:[0-9a-fA-F]{2})+$/;

/**
 * Constant-time comparison of two hex digests.
 *
 * `crypto.timingSafeEqual` throws when the buffers differ in length, so
 * mismatched lengths are rejected up front — safe here because both
 * operands are always SHA-256 digests of the same width, and a
 * length difference therefore carries no secret.
 *
 * Both operands are also validated as real hex FIRST, which is not
 * decoration: `Buffer.from('zzzz', 'hex')` silently stops at the first
 * invalid character and yields an EMPTY buffer, and
 * `timingSafeEqual(empty, empty)` is `true` — so without this check any
 * pair of equal-length non-hex strings would compare equal. A corrupted
 * or attacker-planted `code_hash` would then be satisfied by any digest.
 */
export function constantTimeEqualsHex(a: string, b: string): boolean {
	if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length || a.length === 0) {
		return false;
	}
	if (!HEX_DIGEST.test(a) || !HEX_DIGEST.test(b)) {
		return false;
	}
	try {
		return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
	} catch {
		return false;
	}
}

/** Verify a submitted plaintext code against a stored digest, in constant time. */
export function verifyTwoFactorCodeHash(
	submittedCode: string,
	storedHash: string,
	secret: string = twoFactorCodeSecret()
): boolean {
	if (!isWellFormedTwoFactorCode(submittedCode)) return false;
	return constantTimeEqualsHex(hashTwoFactorCode(submittedCode, secret), storedHash);
}

/** Expiry instant for a code minted at `issuedAt`. */
export function twoFactorCodeExpiry(issuedAt: Date = new Date(), ttlMs: number = TWO_FACTOR_CODE_TTL_MS): Date {
	return new Date(issuedAt.getTime() + ttlMs);
}

/** `true` once `expires` is in the past relative to `now` (EW-140). */
export function isTwoFactorCodeExpired(expires: Date, now: Date = new Date()): boolean {
	return expires.getTime() <= now.getTime();
}

/** `true` while an account-level lockout is still in force (EW-141). */
export function isTwoFactorLocked(lockedUntil: Date | null | undefined, now: Date = new Date()): boolean {
	if (!lockedUntil) return false;
	return lockedUntil.getTime() > now.getTime();
}

/** Whole seconds until a lockout lifts; `0` once it has. */
export function twoFactorLockRetryAfterSeconds(lockedUntil: Date | null | undefined, now: Date = new Date()): number {
	if (!isTwoFactorLocked(lockedUntil, now)) return 0;
	return Math.ceil(((lockedUntil as Date).getTime() - now.getTime()) / 1000);
}

/** Outcome of recording one failed verification. */
export interface FailedAttemptOutcome {
	/** Failure count after this attempt. */
	failedAttempts: number;
	/** `true` when this attempt crossed the threshold. */
	locked: boolean;
	/** Lock expiry when `locked`, otherwise `null`. */
	lockedUntil: Date | null;
}

/**
 * Decide what a failed verification does to the brute-force budget.
 *
 * Pure so the threshold behaviour is unit-testable without a database:
 * the caller persists whatever this returns.
 */
export function registerFailedAttempt(
	previousFailedAttempts: number,
	now: Date = new Date(),
	maxAttempts: number = TWO_FACTOR_MAX_ATTEMPTS,
	lockMs: number = TWO_FACTOR_LOCK_MS
): FailedAttemptOutcome {
	const failedAttempts = Math.max(0, previousFailedAttempts) + 1;
	const locked = failedAttempts >= maxAttempts;
	return {
		failedAttempts,
		locked,
		lockedUntil: locked ? new Date(now.getTime() + lockMs) : null
	};
}

/** Attempts left before the next failure locks the account. */
export function remainingTwoFactorAttempts(
	failedAttempts: number,
	maxAttempts: number = TWO_FACTOR_MAX_ATTEMPTS
): number {
	return Math.max(0, maxAttempts - Math.max(0, failedAttempts));
}
