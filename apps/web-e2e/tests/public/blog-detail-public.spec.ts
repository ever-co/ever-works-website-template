import { test, expect } from '@playwright/test';

/**
 * Blog post detail and taxonomy archives (Spec 050 — EW-27, EW-28).
 *
 * As with the listing spec, the data-dependent assertions skip when the
 * content fixture ships no posts; the tolerance probes always run so a crash
 * on an unknown slug is caught even on an empty fixture.
 */

const PAGE_READY_TIMEOUT = 15_000;

const UNKNOWN_ROUTES = [
	'/blog/zzqx-post-that-cannot-exist-zzqx',
	'/blog/category/zzqx-category-that-cannot-exist-zzqx',
	'/blog/tag/zzqx-tag-that-cannot-exist-zzqx'
];

const XML_ENTITIES: Record<string, string> = {
	'&amp;': '&',
	'&lt;': '<',
	'&gt;': '>',
	'&quot;': '"',
	'&apos;': "'"
};

/**
 * Undo the XML entity escaping the feed applies to a URL.
 *
 * One scan with a lookup rather than a chain of `.replace()` calls: replacing
 * `&amp;` first turns `&amp;lt;` into `<`, so a chain double-unescapes its own
 * output (CodeQL `js/double-escaping`). A single pass cannot re-consume what
 * it has already produced, whatever order the entities appear in.
 */
function unescapeXml(value: string): string {
	return value.replace(/&(?:amp|lt|gt|quot|apos);/g, (entity) => XML_ENTITIES[entity]);
}

/** Navigate to the listing and return the href of the first post link, if any. */
async function firstPostHref(page: import('@playwright/test').Page): Promise<string | null> {
	await page.goto('/blog', { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
	const link = page.locator('[data-testid="blog-post-grid"] article h2 a').first();
	if ((await link.count()) === 0) return null;
	return link.getAttribute('href');
}

test.describe('Public: Blog post detail', () => {
	for (const route of UNKNOWN_ROUTES) {
		test(`${route} responds non-5xx`, async ({ page }) => {
			const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
			expect(response).toBeTruthy();
			expect(response!.status(), route).toBeLessThan(500);
		});

		// Regression guard for a soft 404. A `loading.tsx` anywhere above a
		// segment makes that segment stream, so Next flushes the shell with a
		// 200 before the page runs and `notFound()` can then only swap the
		// body — the page reads "Page Not Found" while the status stays 200,
		// which invites crawlers to index unlimited nonexistent URLs. The
		// listing skeleton lives in a `(index)` route group precisely so these
		// routes are not streamed. Asserting the STATUS is the only way to
		// catch a regression; the rendered body looks correct either way.
		test(`${route} returns a real 404 status, not a soft 404`, async ({ page }) => {
			const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
			expect(response, route).toBeTruthy();
			expect(response!.status(), `${route} must answer 404, not a 200 "not found" body`).toBe(404);
		});
	}

	test('a post page renders the title, header metadata and body', async ({ page }) => {
		const href = await firstPostHref(page);
		test.skip(!href, 'No posts in the content fixture');

		await page.goto(href!, { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
		await expect(page.getByTestId('blog-post')).toBeVisible({ timeout: PAGE_READY_TIMEOUT });
		await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
		await expect(page.getByTestId('blog-post-reading-time')).toBeVisible();
	});

	test('a post page exposes BlogPosting structured data', async ({ page }) => {
		const href = await firstPostHref(page);
		test.skip(!href, 'No posts in the content fixture');

		await page.goto(href!, { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
		const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
		expect(
			blocks.some((block) => block.includes('BlogPosting')),
			'expected BlogPosting JSON-LD'
		).toBe(true);
	});

	test('a post page links back to the blog listing', async ({ page }) => {
		const href = await firstPostHref(page);
		test.skip(!href, 'No posts in the content fixture');

		await page.goto(href!, { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
		const back = page.getByTestId('blog-back-to-listing');
		await expect(back).toBeVisible();
		await back.click();
		await expect(page).toHaveURL(/\/blog\/?(\?.*)?$/, { timeout: PAGE_READY_TIMEOUT });
	});

	test('the breadcrumb keeps the locale prefix on a localized post', async ({ page }) => {
		const href = await firstPostHref(page);
		test.skip(!href, 'No posts in the content fixture');

		const slug = href!.split('/').filter(Boolean).pop();
		const response = await page.goto(`/fr/blog/${slug}`, {
			waitUntil: 'domcontentloaded',
			timeout: PAGE_READY_TIMEOUT
		});
		expect(response?.status() ?? 0).toBeLessThan(500);
		await expect(page).toHaveURL(/\/fr\/blog\//);
	});

	test('a category archive renders and stays inside the blog', async ({ page }) => {
		await page.goto('/blog', { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
		const chip = page.locator('[data-testid="blog-category-filters"] a').nth(1);
		test.skip((await chip.count()) === 0, 'Fixture has no blog categories');

		const href = await chip.getAttribute('href');
		test.skip(!href, 'Category chip has no href');

		const response = await page.goto(href!, { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
		expect(response?.status() ?? 0).toBeLessThan(400);
		await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
	});

	// A post slug is its filename, and a filename may legally contain a space or
	// a non-ASCII character. `buildPostHref()` percent-encodes it, so four
	// surfaces have to agree on the same encoded URL: the in-app link, the feed,
	// the sitemap and the post route itself. They did not — the listing and the
	// feed advertised `/blog/<encoded>` while the route answered 404, because a
	// page component is handed the RAW path segment (only `generateMetadata()`
	// gets the decoded one), and the sitemap dropped such posts entirely on an
	// ASCII-only slug filter. The CI fixture seeds exactly such a post
	// (`épsilon release notes`), so this pins all three halves at once.
	//
	// The feed is the source of URLs deliberately: it is unpaginated, so this
	// covers every post rather than whichever ones land on listing page 1.
	test('every post the feed announces resolves and is listed in the sitemap', async ({ request }) => {
		const feed = await request.get('/blog/rss.xml');
		expect(feed.status()).toBeLessThan(400);

		const xml = await feed.text();
		const postLinks = [...xml.matchAll(/<link>([^<]*\/blog\/[^<]*)<\/link>/g)].map((match) =>
			unescapeXml(match[1])
		);
		test.skip(postLinks.length === 0, 'No dated posts in the content fixture');

		const sitemap = await (await request.get('/sitemap.xml')).text();

		for (const link of postLinks) {
			// Compare paths, not absolute URLs: the feed and the sitemap are built
			// from the configured site URL, which need not equal the test baseURL.
			// `URL.pathname` preserves the percent-encoding, which is the point.
			const path = new URL(link).pathname;

			const response = await request.get(path);
			expect(response.status(), `${path} is announced in the feed and must resolve`).toBe(200);
			expect(sitemap, `${path} is announced in the feed and must be in the sitemap`).toContain(path);
		}
	});

	test('every post card links to a page that resolves', async ({ page, request }) => {
		await page.goto('/blog', { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
		const hrefs = await page
			.locator('[data-testid="blog-post-grid"] article h2 a')
			.evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));
		test.skip(hrefs.length === 0, 'No posts in the content fixture');

		for (const href of hrefs) {
			const response = await request.get(href);
			expect(response.status(), `${href} is linked from a post card and must resolve`).toBe(200);
		}
	});

	test('a tag archive renders when the fixture has tags', async ({ page }) => {
		await page.goto('/blog', { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
		const chip = page.locator('[data-testid="blog-tag-filters"] a').nth(1);
		test.skip((await chip.count()) === 0, 'Fixture has no blog tags');

		const href = await chip.getAttribute('href');
		test.skip(!href, 'Tag chip has no href');

		const response = await page.goto(href!, { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
		expect(response?.status() ?? 0).toBeLessThan(400);
		await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
	});
});
