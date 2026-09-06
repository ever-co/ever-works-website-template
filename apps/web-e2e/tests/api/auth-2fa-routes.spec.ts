import { test, expect } from '@playwright/test';

/**
 * Contract coverage for the email two-factor endpoints added by spec 047
 * (EW-137 enable/disable, EW-138/EW-140 resend, EW-142 OAuth gate):
 *
 *   POST /api/auth/security/2fa/enable
 *   POST /api/auth/security/2fa/disable
 *   POST /api/auth/2fa/resend
 *
 * The e2e request context carries no session by default, so the invariant
 * these specs pin is the **authentication gate** on the two security
 * routes and the **enumeration-resistant** shape of the resend route:
 *
 *   - `enable` / `disable` answer 401 `{ success: false, error: … }` for an
 *     unauthenticated caller, before any tenant lookup or profile write.
 *     Their OAuth refusal (403 + `code: 'OAUTH_ACCOUNT'`) sits *behind*
 *     that gate and is exercised through the UI in
 *     `tests/auth/two-factor-login.spec.ts`.
 *   - `resend` is deliberately session-free (there is no session mid-login)
 *     and re-checks the account password instead. It answers 400 for a
 *     malformed body, and one generic 200 for every outcome that depends on
 *     whether the address exists, the password is right or 2FA is on — so the
 *     body cannot be used to probe which addresses exist. Its other answers
 *     (429 once a budget is spent, 502 when a code could not be emailed) sit
 *     BEHIND the password check, so reaching them tells a caller nothing the
 *     password they already hold did not.
 *
 * The 404-tolerance in the "route exists" assertions keeps this spec honest
 * on a deployment that has not shipped spec 047 yet, in the same spirit as
 * the other skip-on-absence probes in this suite.
 */

const ENABLE = '/api/auth/security/2fa/enable';
const DISABLE = '/api/auth/security/2fa/disable';
const RESEND = '/api/auth/2fa/resend';

/**
 * The resend budget is keyed on the caller's IP as well as the email, and
 * every request from this suite would otherwise land in the same `unknown`
 * bucket — so the browsers running in parallel would spend each other's
 * budget and the enumeration assertions would be skipped by a 429 rather
 * than executed. Each test therefore claims its own forwarded address.
 */
let ipCounter = 0;
// One random base per worker process. Playwright runs each browser project in
// its own worker, so a bare counter would hand the same addresses to every
// project; the random third octet keeps them apart.
const ipBase = 1 + Math.floor(Math.random() * 250);
function isolatedIp(): string {
	ipCounter += 1;
	// 198.18.0.0/15 is reserved for benchmarking (RFC 2544), so these can never
	// collide with a real client address.
	return `198.18.${ipBase}.${(ipCounter % 250) + 1}`;
}

function isolatedHeaders(): Record<string, string> {
	return { 'x-forwarded-for': isolatedIp() };
}

test.describe('API: 2FA enable/disable are session-gated (EW-137)', () => {
	for (const path of [ENABLE, DISABLE]) {
		test(`POST ${path} rejects an unauthenticated caller with 401`, async ({ request }) => {
			const response = await request.post(path, { data: {} });

			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(body).toMatchObject({ success: false });
			expect(typeof body.error).toBe('string');
		});

		test(`GET ${path} is not a valid method`, async ({ request }) => {
			// Only POST is exported, so Next answers 405 for anything else.
			const response = await request.get(path);
			expect([404, 405]).toContain(response.status());
		});
	}

	test('an unauthenticated caller never learns whether 2FA is on', async ({ request }) => {
		const response = await request.get('/api/auth/security/settings');
		expect(response.status()).toBe(401);
		const body = await response.json();
		expect(body.data).toBeUndefined();
	});
});

test.describe('API: 2FA resend is enumeration-resistant (EW-138/EW-140)', () => {
	test('rejects a malformed body with 400', async ({ request }) => {
		const response = await request.post(RESEND, {
			headers: isolatedHeaders(),
			data: { email: 'not-an-email' }
		});

		expect(response.status()).toBe(400);
		expect(await response.json()).toMatchObject({ success: false });
	});

	test('requires a password — email alone is not a valid request', async ({ request }) => {
		const response = await request.post(RESEND, {
			headers: isolatedHeaders(),
			data: { email: `someone-${Date.now()}@test.local` }
		});

		expect(response.status()).toBe(400);
	});

	test('answers 200 for an unknown account, leaking nothing about it', async ({ request }) => {
		const response = await request.post(RESEND, {
			headers: isolatedHeaders(),
			data: { email: `no-such-user-${Date.now()}@test.local`, password: 'not-the-password' }
		});

		expect(response.status()).toBe(200);
		const body = await response.json();
		expect(body.success).toBe(true);
		// Nothing in the payload distinguishes a real account from a miss.
		expect(Object.keys(body.data ?? {})).toEqual(['expiresInMinutes']);
		expect(body.data.expiresInMinutes).toBeGreaterThan(0);
	});

	test('spends its per-IP budget and then answers 429', async ({ request }) => {
		const email = `rate-limit-probe-${Date.now()}@test.local`;
		const headers = isolatedHeaders();
		const statuses: number[] = [];

		// The budget is 3 per 10 minutes per IP and per email. This test owns
		// both keys (a fresh forwarded IP and a unique address), so the first
		// three must pass and the rest must be refused.
		for (let i = 0; i < 6; i++) {
			const response = await request.post(RESEND, { headers, data: { email, password: 'not-the-password' } });
			statuses.push(response.status());
		}

		expect(statuses.slice(0, 3)).toEqual([200, 200, 200]);
		expect(statuses.slice(3)).toEqual([429, 429, 429]);
	});
});
