import { test, expect } from '@playwright/test';
import {
	RESEND_SEND_FAILED_MESSAGE,
	RESEND_THROTTLED_MESSAGE,
	resendResponseForIssuance
} from '../../../web/lib/auth/two-factor-resend';

/**
 * Unit coverage for the resend route's answer (spec 047 — EW-140).
 *
 * `POST /api/auth/2fa/resend` used to `await issueTwoFactorCode(...)` and
 * throw the result away, so a caller whose per-account issuance budget was
 * spent — or whose mail send failed — was still answered
 * `200 {success:true, data:{expiresInMinutes}}`. The sign-in form reads that
 * as "a new code is on its way": it resets the countdown and CLEARS the code
 * box, leaving the user waiting on an email that will never arrive and no
 * longer holding the code they already had.
 *
 * Every assertion here is on that decision. The route's only job with an
 * issuance result is to hand it to this function and echo what comes back.
 *
 * The same assertions also live as a `node:test` spec beside the module
 * (`apps/web/lib/auth/__tests__/two-factor-resend.spec.ts`), which is the copy CI runs on every
 * PR via `pnpm --filter @ever-works/web test:unit`. This one runs with the
 * rest of the Playwright suite on stage/main.
 */
test.describe('Email 2FA: resend reports what actually happened (EW-140)', () => {
	test('a sent code answers 200 with the expiry the form counts down from', () => {
		const response = resendResponseForIssuance({ emailSent: true, expiresInMinutes: 10 }, 10);

		expect(response.status).toBe(200);
		expect(response.body).toEqual({ success: true, data: { expiresInMinutes: 10 } });
	});

	test('a spent issuance budget answers 429, never a successful resend', () => {
		// `throttled` means no code was minted and no mail was sent.
		const response = resendResponseForIssuance({ emailSent: false, throttled: true }, 10);

		expect(response.status).toBe(429);
		expect(response.body).toMatchObject({ success: false, error: RESEND_THROTTLED_MESSAGE });
		expect(response.body).not.toHaveProperty('data');
	});

	test('a failed mail send answers 502, never a successful resend', () => {
		const response = resendResponseForIssuance({ emailSent: false, expiresInMinutes: 10 }, 10);

		expect(response.status).toBe(502);
		expect(response.body).toMatchObject({ success: false, error: RESEND_SEND_FAILED_MESSAGE });
		expect(response.body).not.toHaveProperty('data');
	});

	test('throttling wins over a send failure — the remedy is to wait, not to retry', () => {
		// A throttled call never attempted a send, so reporting "we could not
		// send it" would point the user at a transient mail problem that is not
		// the reason nothing arrived.
		expect(resendResponseForIssuance({ emailSent: false, throttled: true }, 10).status).toBe(429);
	});

	test('no outcome that failed to send a code can ever answer success', () => {
		const failures = [
			{ emailSent: false },
			{ emailSent: false, throttled: true },
			{ emailSent: false, throttled: false },
			{ emailSent: true, throttled: true }
		];

		for (const issued of failures) {
			const response = resendResponseForIssuance(issued, 10);
			expect(response.status, JSON.stringify(issued)).not.toBe(200);
			expect(response.body.success, JSON.stringify(issued)).toBe(false);
		}
	});

	test('falls back to the configured TTL when issuance did not report one', () => {
		expect(resendResponseForIssuance({ emailSent: true }, 7).body).toEqual({
			success: true,
			data: { expiresInMinutes: 7 }
		});
	});
});
