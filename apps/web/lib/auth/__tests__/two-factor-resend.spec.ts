import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	RESEND_SEND_FAILED_MESSAGE,
	RESEND_THROTTLED_MESSAGE,
	resendResponseForIssuance
} from '../two-factor-resend';

/**
 * Spec 047 / EW-140 — what `POST /api/auth/2fa/resend` answers.
 *
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * The route used to `await issueTwoFactorCode(...)` and throw the result away,
 * so a caller whose per-account issuance budget was spent — or whose mail send
 * failed — was still answered `200 {success:true, data:{expiresInMinutes}}`.
 * The sign-in form reads that as "a new code is on its way": it restarts the
 * countdown and CLEARS the code box, so the user ends up waiting on an email
 * that will never arrive, no longer holding the code they already had.
 *
 * The route's only job with an issuance result is to hand it to this function
 * and echo what comes back, so this is where that decision is pinned.
 */
describe('resendResponseForIssuance', () => {
	it('CONTROL: a sent code answers 200 with the expiry the form counts down from', () => {
		const response = resendResponseForIssuance({ emailSent: true, expiresInMinutes: 10 }, 10);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body, { success: true, data: { expiresInMinutes: 10 } });
	});

	it('CONTROL: falls back to the configured TTL when issuance did not report one', () => {
		assert.deepEqual(resendResponseForIssuance({ emailSent: true }, 7).body, {
			success: true,
			data: { expiresInMinutes: 7 }
		});
	});

	it('🛑 a spent issuance budget answers 429, never a successful resend', () => {
		const response = resendResponseForIssuance({ emailSent: false, throttled: true }, 10);

		assert.equal(response.status, 429);
		assert.equal(response.body.success, false);
		assert.equal('error' in response.body && response.body.error, RESEND_THROTTLED_MESSAGE);
		assert.ok(!('data' in response.body));
	});

	it('🛑 a failed mail send answers 502, never a successful resend', () => {
		const response = resendResponseForIssuance({ emailSent: false, expiresInMinutes: 10 }, 10);

		assert.equal(response.status, 502);
		assert.equal(response.body.success, false);
		assert.equal('error' in response.body && response.body.error, RESEND_SEND_FAILED_MESSAGE);
		assert.ok(!('data' in response.body));
	});

	it('throttling wins over a send failure — the remedy is to wait, not to retry', () => {
		// A throttled call never attempted a send, so "we could not send it"
		// would point the user at a transient mail problem that is not why
		// nothing arrived.
		assert.equal(resendResponseForIssuance({ emailSent: false, throttled: true }, 10).status, 429);
	});

	it('🛑 no outcome that failed to send a code can answer success', () => {
		const failures = [
			{ emailSent: false },
			{ emailSent: false, throttled: true },
			{ emailSent: false, throttled: false },
			{ emailSent: true, throttled: true }
		];

		for (const issued of failures) {
			const response = resendResponseForIssuance(issued, 10);
			assert.notEqual(response.status, 200, JSON.stringify(issued));
			assert.equal(response.body.success, false, JSON.stringify(issued));
		}
	});
});
