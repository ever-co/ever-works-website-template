import { test, expect } from '@playwright/test';

/**
 * Blog listing surface (Spec 050 — EW-25, EW-26, EW-28, EW-29).
 *
 * The blog is content-driven: a data repository without a `posts/` folder
 * renders a graceful empty state and the nav entry is hidden. So every
 * assertion here is written to hold in BOTH worlds — "the route is reachable
 * and rendered something coherent" — and the data-dependent checks
 * (pagination, chips, highlighting) skip when the fixture has no posts.
 */

const PAGE_READY_TIMEOUT = 15_000;

/**
 * Escape RegExp metacharacters.
 *
 * The keyword is taken from a real post title in the content fixture, so it
 * can contain `.`, `(`, `+` and friends — "Node.js Tips" being the obvious
 * case. Interpolated raw into `toHaveURL(new RegExp(...))`, such a keyword
 * either throws on an invalid pattern or matches far too loosely, which makes
 * the assertion flaky in a way that looks like a product bug.
 *
 * `encodeURIComponent` does not solve this on its own: it leaves the
 * unreserved characters `. - _ ~ ! * ' ( )` untouched, and every one of those
 * except `-`, `_`, `~` and `!` is a RegExp metacharacter. So escape after
 * encoding. The app's own `HighlightText` escapes for exactly this reason.
 */
function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** True when the CI fixture seeded at least one post. */
async function hasPosts(page: import('@playwright/test').Page): Promise<boolean> {
	return (await page.locator('[data-testid="blog-post-grid"] article').count()) > 0;
}

test.describe('Public: Blog listing', () => {
	test('blog listing page loads successfully', async ({ page }) => {
		const response = await page.goto('/blog', {
			waitUntil: 'domcontentloaded',
			timeout: PAGE_READY_TIMEOUT
		});
		expect(response?.status()).toBeLessThan(400);
		await expect(page.locator('body')).toBeVisible();
	});

	test('blog listing renders an h1 heading', async ({ page }) => {
		await page.goto('/blog', { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
		await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
	});

	test('blog listing exposes a canonical link and a description meta tag', async ({ page }) => {
		await page.goto('/blog', { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
		await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
		const description = await page.locator('meta[name="description"]').first().getAttribute('content');
		expect(description ?? '').not.toEqual('');
	});

	test('blog listing renders either post cards or the empty state', async ({ page }) => {
		await page.goto('/blog', { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
		const cards = await page.locator('[data-testid="blog-post-grid"] article').count();
		const empty = await page.locator('[data-testid="blog-empty-state"]').count();
		expect(cards + empty, 'expected post cards or a graceful empty state').toBeGreaterThan(0);
	});

	test('blog listing renders a search box', async ({ page }) => {
		await page.goto('/blog', { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
		await expect(page.getByTestId('blog-search-input')).toBeVisible();
	});

	test('searching narrows the listing and reflects the query in the URL', async ({ page }) => {
		await page.goto('/blog', { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
		test.skip(!(await hasPosts(page)), 'No posts in the content fixture');

		const firstTitle = (await page.locator('[data-testid="blog-post-grid"] article h2').first().innerText()).trim();
		const keyword = firstTitle.split(/\s+/)[0];

		await page.getByTestId('blog-search-input').fill(keyword);
		await expect(page).toHaveURL(new RegExp(`[?&]q=${escapeRegExp(encodeURIComponent(keyword))}`, 'i'), {
			timeout: PAGE_READY_TIMEOUT
		});
		await expect(page.getByTestId('blog-result-count')).toBeVisible({ timeout: PAGE_READY_TIMEOUT });
	});

	test('search results highlight the matched keyword', async ({ page }) => {
		await page.goto('/blog', { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
		test.skip(!(await hasPosts(page)), 'No posts in the content fixture');

		const firstTitle = (await page.locator('[data-testid="blog-post-grid"] article h2').first().innerText()).trim();
		const keyword = firstTitle.split(/\s+/)[0];

		await page.goto(`/blog?q=${encodeURIComponent(keyword)}`, {
			waitUntil: 'domcontentloaded',
			timeout: PAGE_READY_TIMEOUT
		});
		await expect(page.locator('[data-testid="blog-post-grid"] mark').first()).toBeVisible({
			timeout: PAGE_READY_TIMEOUT
		});
	});

	test('a nonsense query shows the no-results message and a clear control', async ({ page }) => {
		await page.goto('/blog?q=zzqx-no-such-post-zzqx', {
			waitUntil: 'domcontentloaded',
			timeout: PAGE_READY_TIMEOUT
		});
		await expect(page.getByTestId('blog-empty-state')).toBeVisible({ timeout: PAGE_READY_TIMEOUT });
		await expect(page.getByTestId('blog-clear-filters')).toBeVisible();
	});

	test('clearing the search returns to the unfiltered listing', async ({ page }) => {
		await page.goto('/blog?q=zzqx-no-such-post-zzqx', {
			waitUntil: 'domcontentloaded',
			timeout: PAGE_READY_TIMEOUT
		});
		await page.getByTestId('blog-clear-filters').click();
		await expect(page).toHaveURL(/\/blog(\?.*)?$/, { timeout: PAGE_READY_TIMEOUT });
		await expect(page.getByTestId('blog-result-count')).toHaveCount(0);
	});

	test('search results are excluded from the index', async ({ page }) => {
		await page.goto('/blog?q=anything', { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
		const robots = await page.locator('meta[name="robots"]').first().getAttribute('content');
		expect(robots ?? '').toContain('noindex');
	});

	test('pagination links preserve the listing route when more than one page exists', async ({ page }) => {
		await page.goto('/blog', { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
		const next = page.getByTestId('blog-page-next');
		test.skip((await next.count()) === 0, 'Fixture has a single page of posts');

		await next.click();
		await expect(page).toHaveURL(/[?&]page=2/, { timeout: PAGE_READY_TIMEOUT });
		await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
	});

	test('an out-of-range page clamps instead of erroring', async ({ page }) => {
		const response = await page.goto('/blog?page=9999', {
			waitUntil: 'domcontentloaded',
			timeout: PAGE_READY_TIMEOUT
		});
		expect(response?.status() ?? 0).toBeLessThan(400);
		await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
	});

	test('category chip navigates to a filtered listing', async ({ page }) => {
		await page.goto('/blog', { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
		const chips = page.locator('[data-testid="blog-category-filters"] a');
		// The first chip is the "All" reset; a real category chip is the second.
		test.skip((await chips.count()) < 2, 'Fixture has no blog categories');

		await chips.nth(1).click();
		await expect(page).toHaveURL(/[?&]category=|\/blog\/category\//, { timeout: PAGE_READY_TIMEOUT });
		await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
	});

	test('/blog/rss.xml serves an RSS feed', async ({ request }) => {
		const response = await request.get('/blog/rss.xml');
		expect(response.status()).toBeLessThan(400);
		expect(response.headers()['content-type'] ?? '').toContain('rss+xml');
		expect(await response.text()).toContain('<rss');
	});

	test('the sitemap advertises the blog listing', async ({ request }) => {
		const response = await request.get('/sitemap.xml');
		expect(response.status()).toBeLessThan(400);
		expect(await response.text()).toContain('/blog');
	});
});
