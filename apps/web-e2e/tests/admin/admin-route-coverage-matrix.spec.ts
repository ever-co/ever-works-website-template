import { test, expect } from '@playwright/test';
import { ADMIN_STATE_FILE, CLIENT_STATE_FILE } from '../../helpers/test-data';

// Coverage matrix for every page under /[locale]/admin/* — three flavors:
//   1. authenticated admin gets a 200 page with a heading (no signin bounce)
//   2. authenticated client gets bounced (not allowed on admin surface)
//   3. anonymous gets bounced to /admin/auth/signin (NextAuth pages.signIn)
//
// Auth via storageState so the matrix runs in seconds, not minutes.

const ADMIN_ROUTES: Array<{ path: string; name: string }> = [
	{ path: '/admin', name: 'Admin dashboard' },
	{ path: '/admin/billing-issues', name: 'Admin billing issues' },
	{ path: '/admin/categories', name: 'Admin categories' },
	{ path: '/admin/clients', name: 'Admin clients list' },
	{ path: '/admin/collections', name: 'Admin collections' },
	{ path: '/admin/comments', name: 'Admin comments' },
	{ path: '/admin/companies', name: 'Admin companies' },
	{ path: '/admin/featured-items', name: 'Admin featured items' },
	{ path: '/admin/items', name: 'Admin items list' },
	{ path: '/admin/payment-reports', name: 'Admin payment reports' },
	{ path: '/admin/reports', name: 'Admin reports' },
	{ path: '/admin/roles', name: 'Admin roles' },
	{ path: '/admin/settings', name: 'Admin settings' },
	{ path: '/admin/sponsorships', name: 'Admin sponsorships' },
	{ path: '/admin/surveys', name: 'Admin surveys' },
	{ path: '/admin/surveys/create', name: 'Admin create survey' },
	{ path: '/admin/tags', name: 'Admin tags' },
	{ path: '/admin/users', name: 'Admin users' }
];

test.describe('Admin route coverage — admin user', () => {
	test.use({ storageState: ADMIN_STATE_FILE });
	for (const { path, name } of ADMIN_ROUTES) {
		test(`${name} (${path}) loads for admin`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status(), `${path} should not 5xx`).toBeLessThan(500);
			expect(page.url(), `${path} should not bounce admin to signin`).not.toMatch(
				/\/auth\/signin/
			);
			await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 30_000 });
		});
	}
});

test.describe('Admin route coverage — client user (denied)', () => {
	test.use({ storageState: CLIENT_STATE_FILE });
	for (const { path, name } of ADMIN_ROUTES) {
		test(`${name} (${path}) rejects authenticated client`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status()).toBeLessThan(500);
			// Client should not be able to see admin UI — accept either signin
			// redirect, /unauthorized, or /client/* fallback. AdminLayoutClient
			// does this client-side, so poll until the URL settles somewhere
			// acceptable.
			await expect(page).toHaveURL(
				/(auth\/signin|unauthorized|\/client\/|admin\/auth\/signin)/,
				{ timeout: 30_000 }
			);
		});
	}
});

test.describe('Admin route coverage — anonymous (signin gate)', () => {
	for (const { path, name } of ADMIN_ROUTES) {
		test(`${name} (${path}) gates anonymous`, async ({ browser }) => {
			const ctx = await browser.newContext();
			const anon = await ctx.newPage();
			const resp = await anon.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status()).toBeLessThan(500);
			// AdminLayoutClient redirects to signin client-side after the page
			// hydrates — wait for that rather than polling once synchronously.
			await expect(anon).toHaveURL(/auth\/signin/, { timeout: 30_000 });
			await ctx.close();
		});
	}
});
