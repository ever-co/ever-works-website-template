/**
 * The response contract of `POST /api/auth/2fa/resend`, as a pure function
 * of what {@link issueTwoFactorCode} actually did.
 *
 * Split out of the route so it can be unit-tested without a database, a
 * mail provider or a Next request (see
 * `apps/web-e2e/tests/unit/two-factor-resend.spec.ts`). The route does
 * nothing with the issuance result except hand it to
 * {@link resendResponseForIssuance} and echo the answer, so the decision
 * that matters — *did a code actually go out?* — is covered by the spec.
 *
 * **Why this exists.** The route used to `await issueTwoFactorCode(...)`
 * and discard the result, so a caller whose per-account issuance budget
 * was spent, or whose mail send failed, was still told "a new code is on
 * its way" with a fresh ten-minute expiry. The sign-in form then reset its
 * countdown and cleared the code box, leaving the user waiting on an email
 * that would never arrive and no longer holding the code they already had.
 *
 * **Why saying so leaks nothing.** These two answers are reachable only
 * after the account, the password and the 2FA flag have ALL checked out —
 * the same point in the flow at which the route already answers `429` for
 * the per-address resend budget. Someone who can reach them is holding the
 * account's password; they learn nothing here that the password did not
 * already tell them. Every outcome *before* that point still shares the
 * one generic `200` envelope, so the route stays enumeration-resistant.
 */

/** The subset of `IssuedTwoFactorCode` this decision depends on. */
export interface TwoFactorIssuanceOutcome {
	emailSent: boolean;
	throttled?: boolean;
	expiresInMinutes?: number;
}

export interface TwoFactorResendResponse {
	status: 200 | 429 | 502;
	body:
		| { success: true; data: { expiresInMinutes: number } }
		| { success: false; error: string; code?: string };
}

/** Copy reused for the throttled answer so it matches the budget 429 above it. */
export const RESEND_THROTTLED_MESSAGE = 'Too many code requests. Please wait before trying again.';

/** Copy for a mail send that did not happen. */
export const RESEND_SEND_FAILED_MESSAGE = 'We could not send a new code right now. Please try again shortly.';

/**
 * Map an issuance outcome onto the HTTP answer the sign-in form expects.
 *
 * - throttled  → `429`, which the form renders as `TWO_FACTOR.RESEND_RATE_LIMITED`
 * - not sent   → `502`, which the form renders as `TWO_FACTOR.RESEND_FAILED`
 * - sent       → `200` with the expiry the form counts down from
 *
 * `throttled` wins over `emailSent` because a throttled call never even
 * tried to send: reporting "send failed" there would point the user at a
 * transient mail problem when the real remedy is to wait.
 */
export function resendResponseForIssuance(
	issued: TwoFactorIssuanceOutcome,
	fallbackExpiresInMinutes: number
): TwoFactorResendResponse {
	if (issued.throttled) {
		return { status: 429, body: { success: false, error: RESEND_THROTTLED_MESSAGE } };
	}

	if (!issued.emailSent) {
		return {
			status: 502,
			body: { success: false, error: RESEND_SEND_FAILED_MESSAGE, code: 'EMAIL_SEND_FAILED' }
		};
	}

	return {
		status: 200,
		body: { success: true, data: { expiresInMinutes: issued.expiresInMinutes ?? fallbackExpiresInMinutes } }
	};
}
