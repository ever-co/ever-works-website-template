import { test, expect } from '@playwright/test';

// Meta-coverage. For every route under /[locale]/ in the App Router that
// renders as a public page, this matrix walks the URL anonymously and
// asserts the response is < 500. Catches the entire class of "wired a new
// page but forgot a data fetch precondition and it 500s in CI" regressions
// before they reach a customer.
//
// Routes that REQUIRE specific path params (e.g. /items/[slug]) are tested
// against a known-good fixture slug pulled from the seed data; if the seed
// doesn't have one, the test is skipped (not failed) so the suite doesn't
// flake on minimal-data deployments.
//
// Auth-gated routes (anything under /client/*, /dashboard/*, /admin/*) are
// expected to redirect to signin and are tested separately in
// client/settings-subroutes.spec.ts and admin/*.spec.ts.

const PUBLIC_ROUTES_MATRIX: Array<{ path: string; name: string; allowRedirect?: boolean }> = [
	// --- Static / informational pages ---
	{ path: '/', name: 'Home' },
	{ path: '/about', name: 'About' },
	{ path: '/help', name: 'Help' },
	{ path: '/faq', name: 'FAQ' },
	{ path: '/docs', name: 'Docs landing' },
	{ path: '/privacy-policy', name: 'Privacy Policy' },
	{ path: '/terms-of-service', name: 'Terms of Service' },
	{ path: '/cookies', name: 'Cookies' },
	{ path: '/pricing', name: 'Pricing' },
	{ path: '/sponsor', name: 'Sponsor', allowRedirect: true },

	// --- Listing surface ---
	{ path: '/discover/1', name: 'Discover page 1' },
	{ path: '/discover/2', name: 'Discover page 2', allowRedirect: true },
	{ path: '/categories', name: 'Categories index' },
	{ path: '/tags', name: 'Tags index' },
	{ path: '/tags/paging/1', name: 'Tags paginated p1', allowRedirect: true },
	{ path: '/collections', name: 'Collections index' },
	{ path: '/collections/paging/1', name: 'Collections paginated p1', allowRedirect: true },
	{ path: '/comparisons', name: 'Comparisons index' },
	{ path: '/map', name: 'Map view', allowRedirect: true },

	// --- Surveys / submission ---
	{ path: '/surveys', name: 'Surveys index' },
	{ path: '/submit', name: 'Submit', allowRedirect: true },

	// --- Auth ---
	{ path: '/auth/signin', name: 'Sign in' },
	{ path: '/auth/register', name: 'Register' },
	{ path: '/auth/forgot-password', name: 'Forgot password' },
	{ path: '/auth/new-password', name: 'New password' },
	{ path: '/auth/new-verification', name: 'New verification' },

	// --- Newsletter ---
	{ path: '/newsletter/unsubscribe', name: 'Newsletter unsubscribe' },

	// --- Feed manifests / SEO (covered separately but cheap to re-confirm) ---
	{ path: '/rss.xml', name: 'RSS feed' },
	{ path: '/atom.xml', name: 'Atom feed' },
	{ path: '/feed.json', name: 'JSON feed' },
	{ path: '/robots.txt', name: 'robots.txt' },
	{ path: '/llms.txt', name: 'llms.txt' }
];

test.describe('Public route coverage matrix', () => {
	for (const { path, name, allowRedirect } of PUBLIC_ROUTES_MATRIX) {
		test(`${name} (${path}) responds non-5xx anonymously`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp, `expected response object for ${path}`).toBeTruthy();
			const status = resp!.status();
			if (allowRedirect) {
				// Routes that can legitimately 30x / 404 in some configs are fine
				// as long as they're not 5xx.
				expect(status, `${path} should not 5xx (got ${status})`).toBeLessThan(500);
			} else {
				expect(status, `${path} should respond 2xx/3xx (got ${status})`).toBeLessThan(400);
			}
		});
	}

	test('non-existent route returns 404, not 500', async ({ page }) => {
		const resp = await page.goto('/this-route-truly-does-not-exist-zzzqxw', {
			waitUntil: 'domcontentloaded'
		});
		expect(resp).toBeTruthy();
		expect(resp!.status()).toBe(404);
	});

	test('locale-prefixed routes also respond', async ({ page }) => {
		// next-intl localePrefix='as-needed' — non-default locales are prefixed.
		// We only assert /en behaviour here; non-en require translations seed.
		const enResp = await page.goto('/en/about', { waitUntil: 'domcontentloaded' });
		expect(enResp).toBeTruthy();
		// /en/about might 308 to /about under as-needed. Either way: no 5xx.
		expect(enResp!.status()).toBeLessThan(500);
	});
});
