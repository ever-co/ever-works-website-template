import { test, expect } from '@playwright/test';

// /about, /help, /privacy-policy, /terms-of-service, /cookies are static
// info pages backed by Markdown (or CMS) content. Each must render real
// content (more than a header/footer skeleton) — if the content loader
// silently fails, these pages are technically 200 but empty.

const INFO_PAGES = [
	'/about',
	'/help',
	'/faq',
	'/privacy-policy',
	'/terms-of-service',
	'/cookies'
];

test.describe('Static info pages have substantive content', () => {
	for (const path of INFO_PAGES) {
		test(`${path} renders main content with meaningful body length`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status()).toBeLessThan(400);

			// Find a main / article element and check text length.
			const main = page.locator('main, article, [role="main"]').first();
			await expect(main).toBeVisible({ timeout: 30_000 });
			const text = (await main.innerText()) ?? '';
			// 100 chars is a generous floor — even an empty page has nav and
			// footer text but a real content page is much longer.
			expect(text.length, `${path} content length`).toBeGreaterThan(100);
		});
	}

	test('about page has at least one heading and one paragraph', async ({ page }) => {
		await page.goto('/about', { waitUntil: 'domcontentloaded' });
		const h1 = page.getByRole('heading', { level: 1 }).first();
		await expect(h1).toBeVisible({ timeout: 30_000 });
		const paragraphCount = await page.locator('p').count();
		expect(paragraphCount, 'at least one paragraph').toBeGreaterThan(0);
	});
});
