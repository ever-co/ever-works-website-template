import { test, expect } from '@playwright/test';
import { ADMIN_STATE_FILE } from '../../helpers/test-data';

/**
 * Query-surface smoke for the admin billing-issues API (Spec 051, Jira EW-116),
 * served by `apps/web/app/api/admin/billing-issues/**`.
 *
 * These routes are the only place in the template that can move real money — the
 * refund handler calls `PaymentProviderInterface.refundPayment` on whichever
 * provider the underlying payment record names. That makes the authorization
 * gate the load-bearing invariant, and it is what every assertion below pins:
 *
 *   - `GET /api/admin/billing-issues` — list, gated by `checkAdminAuth()`
 *     (401 unauthenticated / 403 non-admin) after `checkDatabaseAvailability()`.
 *   - `GET /api/admin/billing-issues/stats` — counters, same gate.
 *   - `GET /api/admin/billing-issues/{id}` — one issue, same gate.
 *   - `PATCH /api/admin/billing-issues/{id}` — status change, gated by
 *     `requireAdminSession()` so the acting admin id can be stamped on the row.
 *   - `POST /api/admin/billing-issues/{id}/refund` — the money mover, also
 *     `requireAdminSession()`.
 *
 * The gate runs BEFORE any filter parsing, so no query permutation may change
 * the unauthenticated status. A future contributor who reads `?userId=` as a
 * fallback for the session, or adds a `?token=` bypass, would turn "always 4xx"
 * into "200 (or a refund!) for any anonymous caller" — the sweeps below are what
 * catch that.
 */
const BILLING_ISSUE_QUERIES = [
	// Baseline.
	'/api/admin/billing-issues',
	'/api/admin/billing-issues/stats',

	// Pagination — clamped inline with Number() + Math.min/max after the gate.
	'/api/admin/billing-issues?page=1',
	'/api/admin/billing-issues?page=2',
	'/api/admin/billing-issues?page=0',
	'/api/admin/billing-issues?page=-1',
	'/api/admin/billing-issues?page=invalid',
	'/api/admin/billing-issues?limit=10',
	'/api/admin/billing-issues?limit=100',
	'/api/admin/billing-issues?limit=99999',
	'/api/admin/billing-issues?limit=invalid',
	'/api/admin/billing-issues?page=&limit=',

	// `?status=` — validated against the BillingIssueStatus enum after the gate.
	'/api/admin/billing-issues?status=open',
	'/api/admin/billing-issues?status=in_review',
	'/api/admin/billing-issues?status=refunded',
	'/api/admin/billing-issues?status=resolved',
	'/api/admin/billing-issues?status=dismissed',
	'/api/admin/billing-issues?status=invalid',
	'/api/admin/billing-issues?status=OPEN',
	'/api/admin/billing-issues?status=',

	// `?type=` — validated against the BillingIssueType enum.
	'/api/admin/billing-issues?type=payment_failed',
	'/api/admin/billing-issues?type=refund_request',
	'/api/admin/billing-issues?type=dispute',
	'/api/admin/billing-issues?type=subscription_state',
	'/api/admin/billing-issues?type=other',
	'/api/admin/billing-issues?type=invalid',

	// `?provider=` — validated against the PaymentProvider enum. A bypass here
	// would let an anonymous caller aim the list at a specific processor.
	'/api/admin/billing-issues?provider=stripe',
	'/api/admin/billing-issues?provider=polar',
	'/api/admin/billing-issues?provider=lemonsqueezy',
	'/api/admin/billing-issues?provider=solidgate',
	'/api/admin/billing-issues?provider=invalid',

	// `?search=` — forwarded to a Drizzle ilike; a regression to raw SQL
	// interpolation would open injection, and the gate must hold regardless.
	'/api/admin/billing-issues?search=test',
	'/api/admin/billing-issues?search=%27%20OR%201%3D1',
	'/api/admin/billing-issues?search=%3Cscript%3E',
	'/api/admin/billing-issues?search=%25',
	`/api/admin/billing-issues?search=${'x'.repeat(500)}`,

	// Impersonation / magic-token / override keys the route must ignore.
	'/api/admin/billing-issues?userId=admin',
	'/api/admin/billing-issues?adminId=admin',
	'/api/admin/billing-issues?as=admin',
	'/api/admin/billing-issues?impersonate=admin',
	'/api/admin/billing-issues?token=anything',
	'/api/admin/billing-issues?secret=anything',
	'/api/admin/billing-issues?api_key=anything',
	'/api/admin/billing-issues?authorization=Bearer+anything',
	'/api/admin/billing-issues?bypass=1',
	'/api/admin/billing-issues?admin=true',
	'/api/admin/billing-issues?override=true',

	// Per-row targeting keys a future contributor might add.
	'/api/admin/billing-issues?issueId=issue_123',
	'/api/admin/billing-issues?subscriptionId=sub_123',
	'/api/admin/billing-issues/stats?userId=admin',

	// Combinations, repeats and unknown keys.
	'/api/admin/billing-issues?page=1&limit=20&status=open&type=payment_failed&provider=stripe',
	'/api/admin/billing-issues?status=open&status=resolved',
	'/api/admin/billing-issues?unknown=value&foo=bar'
] as const;

test.describe('API: /api/admin/billing-issues query-param surface (unauthenticated)', () => {
	for (const path of BILLING_ISSUE_QUERIES) {
		test(`GET ${path} is refused for an anonymous caller`, async ({ request }) => {
			const response = await request.get(path);

			// Not just "no 5xx": the point of sweeping the whole query surface is that
			// NO permutation may become reachable. A future `?token=` or `?userId=`
			// shortcut would answer 200 with customer and payment data and still pass
			// a `< 500` assertion, which is how this class of regression ships.
			expect([401, 403, 503]).toContain(response.status());
		});
	}

	test('GET /api/admin/billing-issues rejects an anonymous caller', async ({ request }) => {
		const response = await request.get('/api/admin/billing-issues');

		expect([401, 403]).toContain(response.status());

		const body = await response.json();
		expect(body.success).toBe(false);
		expect(body.error).toMatch(/Unauthorized|Forbidden/i);
	});

	test('GET /api/admin/billing-issues/stats rejects an anonymous caller', async ({ request }) => {
		const response = await request.get('/api/admin/billing-issues/stats');
		expect([401, 403]).toContain(response.status());
	});

	test('the status is invariant across every query permutation', async ({ request }) => {
		// The gate fires before any `searchParams` read, so a filter can never
		// change the unauthenticated answer.
		const baseline = await request.get('/api/admin/billing-issues');
		const responses = await Promise.all([
			request.get('/api/admin/billing-issues?status=open&type=dispute&provider=stripe'),
			request.get('/api/admin/billing-issues?userId=admin&token=foo&bypass=1'),
			request.get('/api/admin/billing-issues?page=invalid&limit=99999&status=invalid'),
			request.get('/api/admin/billing-issues?search=%27%20OR%201%3D1')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('POST /api/admin/billing-issues does NOT let an anonymous caller open or sync issues', async ({ request }) => {
		// POST both creates a manual issue and (with `{action:'sync'}`) writes rows
		// derived from the payment records. Neither may run unauthenticated.
		const responses = await Promise.all([
			request.post('/api/admin/billing-issues', { data: { action: 'sync' } }),
			request.post('/api/admin/billing-issues', { data: { userId: 'someone', type: 'refund_request' } }),
			request.post('/api/admin/billing-issues', { data: {} })
		]);

		for (const response of responses) {
			expect([401, 403]).toContain(response.status());
		}
	});

	test('PATCH /api/admin/billing-issues/{id} does NOT let an anonymous caller close an issue', async ({
		request
	}) => {
		const response = await request.patch('/api/admin/billing-issues/does-not-exist', {
			data: { status: 'resolved' }
		});

		// The gate must answer before the row lookup — a 404 here would mean the
		// handler queried the database for an anonymous caller.
		expect([401, 403]).toContain(response.status());
	});

	test('POST /api/admin/billing-issues/{id}/refund does NOT let an anonymous caller move money', async ({
		request
	}) => {
		// The single most important assertion in this file: the refund route calls
		// the payment provider. It must never be reachable without an admin session.
		const responses = await Promise.all([
			request.post('/api/admin/billing-issues/does-not-exist/refund', { data: {} }),
			request.post('/api/admin/billing-issues/does-not-exist/refund', { data: { amount: 100 } }),
			request.post('/api/admin/billing-issues/does-not-exist/refund?token=anything&admin=true', {
				data: { amount: 100 }
			})
		]);

		for (const response of responses) {
			expect([401, 403]).toContain(response.status());
		}
	});

	test('the refund route does NOT accept a GET', async ({ request }) => {
		// Only POST is exported, so a GET must be a 405 (or the same auth rejection)
		// — never a 200 that performs the refund as a side effect of a link visit.
		const response = await request.get('/api/admin/billing-issues/does-not-exist/refund');
		expect(response.status()).toBeLessThan(500);
		expect(response.status()).not.toBe(200);
	});
});

test.describe('API: /api/admin/billing-issues (admin)', () => {
	test.use({ storageState: ADMIN_STATE_FILE });

	test('GET /api/admin/billing-issues returns the list envelope for an admin', async ({ request }) => {
		const response = await request.get('/api/admin/billing-issues?page=1&limit=10');
		// 503 is the documented answer when the database is unavailable, and it is the
		// only status this test tolerates. `toBeLessThan(500)` used to stand in for
		// the whole contract, which let a 401 or a 403 pass — i.e. a broken admin
		// session, or a route that stopped answering at all, looked green while the
		// envelope below was never checked. `global-setup.ts` THROWS if it cannot
		// create the admin storage state, so reaching here with a session that is not
		// an admin's is itself the bug.
		if (response.status() === 503) return;

		expect(response.status(), 'an admin must be served the list').toBe(200);

		const body = await response.json();
		expect(body.success).toBe(true);
		expect(Array.isArray(body.data.issues)).toBe(true);
		expect(body.data.pagination).toMatchObject({ page: 1, limit: 10 });
	});

	test('GET /api/admin/billing-issues/stats returns counters for an admin', async ({ request }) => {
		const response = await request.get('/api/admin/billing-issues/stats');
		// `toBeLessThan(500)` was also wrong in the other direction here: 503 is NOT
		// less than 500, so the documented database-unavailable answer FAILED this
		// test rather than skipping it.
		if (response.status() === 503) return;

		expect(response.status(), 'an admin must be served the counters').toBe(200);

		const body = await response.json();
		expect(body.success).toBe(true);
		expect(typeof body.data.total).toBe('number');
		expect(typeof body.data.openCount).toBe('number');
		// Per currency, not a scalar: adding 100 JPY to 100 USD would produce a
		// number with no meaning and no honest label.
		expect(Array.isArray(body.data.amountAtRisk)).toBe(true);
		for (const row of body.data.amountAtRisk) {
			expect(typeof row.currency).toBe('string');
			expect(typeof row.amount).toBe('number');
		}
	});

	test('an invalid filter is a 400 for an admin, not a silent empty list', async ({ request }) => {
		// A dropped filter would widen the list rather than narrow it, so the route
		// rejects an unknown enum value instead of ignoring it.
		for (const path of [
			'/api/admin/billing-issues?status=not-a-status',
			'/api/admin/billing-issues?type=not-a-type',
			'/api/admin/billing-issues?provider=not-a-provider'
		]) {
			const response = await request.get(path);
			if (response.status() !== 503) {
				expect(response.status(), `${path} should be rejected`).toBe(400);
			}
		}
	});

	test('PATCH rejects the refunded status, which only the refund route may set', async ({ request }) => {
		// Letting an admin type "refunded" without the money moving would make the
		// row lie about a refund that never happened.
		const response = await request.patch('/api/admin/billing-issues/does-not-exist', {
			data: { status: 'refunded' }
		});

		if (response.status() !== 503) {
			expect(response.status()).toBe(400);
		}
	});

	test('PATCH rejects a body with no status', async ({ request }) => {
		const response = await request.patch('/api/admin/billing-issues/does-not-exist', { data: {} });

		if (response.status() !== 503) {
			expect(response.status()).toBe(400);
		}
	});

	test('the refund route rejects a non-positive or fractional amount', async ({ request }) => {
		// The amount is in the smallest currency unit; a fractional or negative
		// value reaching the provider would be a real money bug.
		for (const amount of [0, -1, 1.5]) {
			const response = await request.post('/api/admin/billing-issues/does-not-exist/refund', {
				data: { amount }
			});

			if (response.status() !== 503) {
				expect(response.status(), `amount=${amount} should be rejected`).toBe(400);
			}
		}
	});

	test('a supplied but non-numeric refund amount is a 400, never a silent FULL refund', async ({ request }) => {
		/*
		 * The dangerous half of a partial-refund payload is the `amount` field itself.
		 *
		 * `{"amount": null}` and `{"amount": ""}` are what a truncated or
		 * mis-serialised body arrives as, and the route used to skip its validation
		 * block for both — leaving `amount` undefined, which means "refund the WHOLE
		 * charge". A typo in a partial-refund request moved the entire payment.
		 *
		 * `true` and `["5"]` are the other half: `Number()` coerces them to 1 and 5,
		 * so a malformed field became a silent partial refund of an amount nobody
		 * asked for. `"100"` is included because the sibling create route already
		 * requires a real number, and the route that actually calls a provider must
		 * not be the looser of the two.
		 *
		 * 404 is the tell here, not 200: these run against an issue id that does not
		 * exist, so "rejected at validation" is a 400 and "accepted, then looked up"
		 * is a 404. Only an ABSENT `amount` key may reach the lookup.
		 */
		for (const amount of [null, '', true, ['5'], '100', {}]) {
			const response = await request.post('/api/admin/billing-issues/does-not-exist/refund', {
				headers: { 'Content-Type': 'application/json' },
				data: JSON.stringify({ amount })
			});

			if (response.status() !== 503) {
				expect(response.status(), `amount=${JSON.stringify(amount)} must be rejected`).toBe(400);
			}
		}
	});

	test('an omitted amount key still means a full refund, so the issue is looked up', async ({ request }) => {
		// The counterpart to the test above: tightening `amount` must not break the
		// documented full-refund call, which sends no `amount` at all.
		const response = await request.post('/api/admin/billing-issues/does-not-exist/refund', {
			headers: { 'Content-Type': 'application/json' },
			data: JSON.stringify({ note: 'full refund' })
		});

		if (response.status() !== 503) {
			expect(response.status(), 'an omitted amount must reach the issue lookup').toBe(404);
		}
	});

	test('the refund route answers 404 for an unknown issue rather than calling a provider', async ({ request }) => {
		const response = await request.post('/api/admin/billing-issues/does-not-exist/refund', { data: {} });

		if (response.status() !== 503) {
			expect(response.status()).toBe(404);
		}
	});

	test('a malformed refund body is a 400, never a silent FULL refund', async ({ request }) => {
		// The dangerous shape: a partial-refund payload with a typo in it. Treating
		// an unparseable body as "no body" would turn that typo into a full refund,
		// so the route must refuse instead of guessing.
		//
		// `' '` is in the list on purpose. A whitespace-only body is what a truncated
		// or mis-serialised payload arrives as, and any route that trims before
		// testing for emptiness reads it as "no body supplied" — i.e. a full refund.
		for (const body of ['{"amount": 100', 'null', '"amount=100"', '[100]', ' ', '\n\t']) {
			const response = await request.post('/api/admin/billing-issues/does-not-exist/refund', {
				headers: { 'Content-Type': 'application/json' },
				data: body
			});

			if (response.status() !== 503) {
				expect(response.status(), `body ${body} should be rejected`).toBe(400);
			}
		}
	});

	test('a PATCH body of JSON null is a 400, not a 500', async ({ request }) => {
		const response = await request.patch('/api/admin/billing-issues/does-not-exist', {
			headers: { 'Content-Type': 'application/json' },
			data: 'null'
		});

		if (response.status() !== 503) {
			expect(response.status()).toBe(400);
		}
	});

	test('fractional pagination is rejected instead of reaching the database', async ({ request }) => {
		// `Number('1.5')` survives a clamp and becomes a fractional OFFSET, which
		// Postgres answers with an error — a 500 where a 400 belongs.
		for (const query of ['page=1.5', 'limit=2.5', 'page=NaN', 'limit=0']) {
			const response = await request.get(`/api/admin/billing-issues?${query}`);

			if (response.status() !== 503) {
				expect(response.status(), `${query} should be rejected`).toBe(400);
			}
		}
	});

	test('a whitespace-only POST body is a 400, not a silent re-scan', async ({ request }) => {
		// POST with an empty body means "re-scan the payment records", which WRITES
		// issue rows. A body of `' '` is a malformed request, not an omitted one, so
		// it must be refused rather than trimmed into the write path.
		for (const body of [' ', '\n\t']) {
			const response = await request.post('/api/admin/billing-issues', {
				headers: { 'Content-Type': 'application/json' },
				data: body
			});

			if (response.status() !== 503) {
				expect(response.status(), `body ${JSON.stringify(body)} should be rejected`).toBe(400);
			}
		}
	});

	test('a manual create with an out-of-tenant user is a 400, not a created issue', async ({ request }) => {
		const response = await request.post('/api/admin/billing-issues', {
			data: { userId: 'user-that-does-not-exist', type: 'refund_request' }
		});

		if (response.status() !== 503) {
			expect(response.status()).toBe(400);
			expect(await response.text()).not.toContain('"success":true');
		}
	});

	test('a manual create with an invalid amount is rejected rather than stored as zero', async ({ request }) => {
		const response = await request.post('/api/admin/billing-issues', {
			data: { userId: 'someone', type: 'refund_request', amount: 'not-a-number' }
		});

		if (response.status() !== 503) {
			expect(response.status()).toBe(400);
		}
	});
});
