import { test, expect } from '@playwright/test';
import { ADMIN_STATE_FILE } from '../../helpers/test-data';

/**
 * Query-surface smoke for the admin payment-report API (Spec 047, Jira EW-117),
 * served by `apps/web/app/api/admin/payment-reports/**`.
 *
 * Two routes, one filter contract:
 *   - `GET /api/admin/payment-reports` — rows plus revenue roll-ups (JSON).
 *   - `GET /api/admin/payment-reports/export?format=csv|xlsx` — the same filter
 *     set rendered as a downloadable file.
 *
 * Both parse their filters through the SAME exported validator
 * (`lib/services/payment-report-filters.ts`). That shared validator is the reason
 * the export can be trusted: if the two routes could interpret `?from=` or
 * `?planId=` differently, an admin would hand a stakeholder a CSV that does not
 * match the table it was exported from. The specs below pin that equivalence by
 * asserting the same rejection on both paths.
 *
 * The report reads customer emails and revenue, so the admin gate is the other
 * load-bearing invariant: the list route uses `checkAdminAuth()` and the export
 * route uses `requireAdminSession()` (it stamps the download in the activity
 * log). Neither may be reachable anonymously under any query permutation.
 */
const PAYMENT_REPORT_QUERIES = [
	'/api/admin/payment-reports',
	'/api/admin/payment-reports/export',

	// Pagination.
	'/api/admin/payment-reports?page=1',
	'/api/admin/payment-reports?page=0',
	'/api/admin/payment-reports?page=invalid',
	'/api/admin/payment-reports?limit=20',
	'/api/admin/payment-reports?limit=200',
	'/api/admin/payment-reports?limit=99999',

	// Date range — the headline filter from the acceptance criteria.
	'/api/admin/payment-reports?from=2026-01-01',
	'/api/admin/payment-reports?to=2026-12-31',
	'/api/admin/payment-reports?from=2026-01-01&to=2026-12-31',
	'/api/admin/payment-reports?from=2026-01-01T00:00:00Z',
	'/api/admin/payment-reports?from=not-a-date',
	'/api/admin/payment-reports?to=not-a-date',
	'/api/admin/payment-reports?from=2026-12-31&to=2026-01-01',
	'/api/admin/payment-reports?from=&to=',

	// Plan / status / provider.
	'/api/admin/payment-reports?planId=free',
	'/api/admin/payment-reports?planId=standard',
	'/api/admin/payment-reports?planId=premium',
	'/api/admin/payment-reports?planId=PREMIUM',
	'/api/admin/payment-reports?status=active',
	'/api/admin/payment-reports?status=cancelled',
	'/api/admin/payment-reports?status=expired',
	'/api/admin/payment-reports?status=pending',
	'/api/admin/payment-reports?status=paused',
	'/api/admin/payment-reports?status=invalid',
	'/api/admin/payment-reports?provider=stripe',
	'/api/admin/payment-reports?provider=polar',
	'/api/admin/payment-reports?provider=invalid',

	// Search.
	'/api/admin/payment-reports?search=test',
	'/api/admin/payment-reports?search=%27%20OR%201%3D1',
	`/api/admin/payment-reports?search=${'x'.repeat(500)}`,

	// Export formats, including the one the repo deliberately does not ship.
	'/api/admin/payment-reports/export?format=csv',
	'/api/admin/payment-reports/export?format=xlsx',
	'/api/admin/payment-reports/export?format=CSV',
	'/api/admin/payment-reports/export?format=pdf',
	'/api/admin/payment-reports/export?format=exe',
	'/api/admin/payment-reports/export?format=',
	'/api/admin/payment-reports/export?format=csv&from=2026-01-01&to=2026-12-31&planId=premium&status=active&provider=stripe',

	// Impersonation / magic-token / override keys the routes must ignore.
	'/api/admin/payment-reports?userId=admin',
	'/api/admin/payment-reports?adminId=admin',
	'/api/admin/payment-reports?as=admin',
	'/api/admin/payment-reports?token=anything',
	'/api/admin/payment-reports?secret=anything',
	'/api/admin/payment-reports?bypass=1',
	'/api/admin/payment-reports?admin=true',
	'/api/admin/payment-reports/export?token=anything&format=csv',
	'/api/admin/payment-reports/export?userId=admin&format=csv',

	// Unknown and repeated keys.
	'/api/admin/payment-reports?unknown=value',
	'/api/admin/payment-reports?status=active&status=cancelled'
] as const;

test.describe('API: /api/admin/payment-reports query-param surface (unauthenticated)', () => {
	for (const path of PAYMENT_REPORT_QUERIES) {
		test(`GET ${path} is refused for an anonymous caller`, async ({ request }) => {
			const response = await request.get(path);

			// The file's stated invariant is "neither route is reachable anonymously
			// under any query permutation" — a `< 500` assertion does not pin that. An
			// auth regression answering 200 with customer emails and revenue on, say,
			// `?token=anything` has to fail HERE, not in a reviewer's memory.
			expect([401, 403, 503]).toContain(response.status());
		});
	}

	test('GET /api/admin/payment-reports rejects an anonymous caller', async ({ request }) => {
		const response = await request.get('/api/admin/payment-reports');

		expect([401, 403]).toContain(response.status());

		const body = await response.json();
		expect(body.success).toBe(false);
		expect(body.error).toMatch(/Unauthorized|Forbidden/i);
	});

	test('the export never leaks a file to an anonymous caller', async ({ request }) => {
		// The most important assertion here: an anonymous 200 with a CSV body would
		// publish every customer email and payment amount on the site.
		const responses = await Promise.all([
			request.get('/api/admin/payment-reports/export'),
			request.get('/api/admin/payment-reports/export?format=csv'),
			request.get('/api/admin/payment-reports/export?format=xlsx'),
			request.get('/api/admin/payment-reports/export?format=csv&token=anything&admin=true')
		]);

		for (const response of responses) {
			expect([401, 403]).toContain(response.status());
			expect(response.headers()['content-disposition']).toBeUndefined();
		}
	});

	test('the status is invariant across every query permutation', async ({ request }) => {
		const baseline = await request.get('/api/admin/payment-reports');
		const responses = await Promise.all([
			request.get('/api/admin/payment-reports?from=2026-01-01&to=2026-12-31&planId=premium'),
			request.get('/api/admin/payment-reports?userId=admin&token=foo&bypass=1'),
			request.get('/api/admin/payment-reports?from=not-a-date&status=invalid')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('the report routes do NOT accept a POST', async ({ request }) => {
		// Only GET is exported on both routes; a POST must not be silently routed
		// to the GET handler.
		const responses = await Promise.all([
			request.post('/api/admin/payment-reports', { data: {} }),
			request.post('/api/admin/payment-reports/export', { data: {} })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
			expect(response.status()).not.toBe(200);
		}
	});
});

test.describe('API: /api/admin/payment-reports (admin)', () => {
	test.use({ storageState: ADMIN_STATE_FILE });

	test('returns rows, a summary and pagination for an admin', async ({ request }) => {
		const response = await request.get('/api/admin/payment-reports?page=1&limit=20');
		// 503 is the documented database-unavailable answer and the only status this
		// test tolerates. `toBeLessThan(500)` was wrong in both directions: it FAILED
		// on 503 (503 is not less than 500) and it PASSED on a 401/403, which then
		// skipped every envelope assertion below. `global-setup.ts` throws if it cannot
		// create the admin storage state, so a non-admin session reaching here is the bug.
		if (response.status() === 503) return;

		expect(response.status(), 'an admin must be served the report').toBe(200);

		const body = await response.json();
		expect(body.success).toBe(true);
		expect(Array.isArray(body.data.records)).toBe(true);
		expect(Array.isArray(body.data.summary.totalsByCurrency)).toBe(true);
		expect(Array.isArray(body.data.summary.byPlan)).toBe(true);
		expect(Array.isArray(body.data.summary.byProvider)).toBe(true);
		expect(body.data.pagination).toMatchObject({ page: 1, limit: 20 });
	});

	test('a malformed or inverted date range is a 400 on BOTH the list and the export', async ({ request }) => {
		// Both routes share one validator; if they ever diverge, the export would
		// silently return a wider result set than the table it came from.
		for (const query of ['from=not-a-date', 'to=not-a-date', 'from=2026-12-31&to=2026-01-01']) {
			const list = await request.get(`/api/admin/payment-reports?${query}`);
			const exported = await request.get(`/api/admin/payment-reports/export?format=csv&${query}`);

			if (list.status() !== 503) {
				expect(list.status(), `list ?${query}`).toBe(400);
				expect(exported.status(), `export ?${query}`).toBe(400);
			}
		}
	});

	test('an unsupported export format is rejected with the supported list', async ({ request }) => {
		// PDF is deliberately not shipped (no PDF library in the repo), so the
		// route must say so rather than 500 or hand back an empty file.
		const response = await request.get('/api/admin/payment-reports/export?format=pdf');

		if (response.status() !== 503) {
			expect(response.status()).toBe(400);
			const body = await response.json();
			expect(body.error).toMatch(/csv/i);
			expect(body.error).toMatch(/xlsx/i);
		}
	});

	test('the CSV export is returned as an attachment with a header row', async ({ request }) => {
		const response = await request.get('/api/admin/payment-reports/export?format=csv');
		// Same 503 correction as the list test above. Not tightened to 200 here: an
		// over-cap filter is a legitimate 400 on this route, so `< 500` is the honest
		// bound once the database-unavailable answer is taken out of the comparison.
		if (response.status() === 503) return;
		expect(response.status()).toBeLessThan(500);

		if (response.status() === 200) {
			expect(response.headers()['content-type']).toMatch(/text\/csv/);
			expect(response.headers()['content-disposition']).toMatch(/attachment; filename="payment-report-.*\.csv"/);

			// The header row is the contract a stakeholder's spreadsheet depends on.
			const body = await response.text();
			expect(body.split(/\r?\n/)[0]).toContain('Date');
			expect(body.split(/\r?\n/)[0]).toContain('Amount');
			expect(body.split(/\r?\n/)[0]).toContain('Currency');
		}
	});

	test('the XLSX export is returned as a spreadsheet attachment', async ({ request }) => {
		const response = await request.get('/api/admin/payment-reports/export?format=xlsx');
		// Same 503 correction as the list test above. Not tightened to 200 here: an
		// over-cap filter is a legitimate 400 on this route, so `< 500` is the honest
		// bound once the database-unavailable answer is taken out of the comparison.
		if (response.status() === 503) return;
		expect(response.status()).toBeLessThan(500);

		if (response.status() === 200) {
			expect(response.headers()['content-type']).toMatch(/spreadsheetml/);
			expect(response.headers()['content-disposition']).toMatch(/attachment; filename="payment-report-.*\.xlsx"/);

			// A real XLSX is a ZIP container; the magic bytes catch an empty or
			// JSON-encoded body that a browser would fail to open.
			const buffer = await response.body();
			expect(buffer.length).toBeGreaterThan(0);
			expect(buffer.subarray(0, 2).toString('latin1')).toBe('PK');
		}
	});

	test('a calendar-invalid date is rejected on BOTH the list and the export', async ({ request }) => {
		// `new Date('2026-02-30')` does not fail — it rolls over to 2 March. A plain
		// isNaN check would therefore accept it and silently widen the report window
		// past the range the admin selected, on both routes at once.
		for (const value of ['2026-02-30', '2026-04-31', '2026-00-10']) {
			const [list, exported] = await Promise.all([
				request.get(`/api/admin/payment-reports?from=${value}`),
				request.get(`/api/admin/payment-reports/export?format=csv&from=${value}`)
			]);

			if (list.status() !== 503) {
				expect(list.status(), `list should reject from=${value}`).toBe(400);
				expect(exported.status(), `export should reject from=${value}`).toBe(400);
			}
		}
	});

	test('fractional pagination is rejected instead of reaching the database', async ({ request }) => {
		for (const query of ['page=1.5', 'limit=3.5', 'page=NaN']) {
			const response = await request.get(`/api/admin/payment-reports?${query}`);

			if (response.status() !== 503) {
				expect(response.status(), `${query} should be rejected`).toBe(400);
			}
		}
	});

	test('the roll-ups carry their own currency, so no amount is mislabelled', async ({ request }) => {
		const response = await request.get('/api/admin/payment-reports');

		if (response.status() === 200) {
			const body = await response.json();
			for (const group of ['byPlan', 'byProvider', 'byStatus'] as const) {
				for (const row of body.data.summary[group]) {
					expect(typeof row.currency, `${group} row must name its currency`).toBe('string');
					expect(row.currency.length).toBeGreaterThan(0);
				}
			}
		}
	});
});
