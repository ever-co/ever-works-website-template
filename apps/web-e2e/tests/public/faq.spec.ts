import { test, expect } from '@playwright/test';

// /faq is a static info page backed by the data repository
// (`pages/faq.<locale>.md`) with a built-in fallback FAQ, so it must render
// real content on a freshly generated site that ships no faq file at all.
//
// Unlike the other info pages it also carries a Schema.org FAQPage block —
// that rich result is the whole SEO point of an FAQ, and it is the piece most
// likely to silently disappear (a parser change, a heading-shape change in the
// content, a missing null-check) while the page still returns 200.

test.describe('Public: FAQ', () => {
	test('faq page loads successfully', async ({ page }) => {
		const response = await page.goto('/faq', { waitUntil: 'domcontentloaded' });

		expect(response?.status()).toBeLessThan(400);
		await expect(page.locator('body')).toBeVisible();
	});

	test('faq page renders an h1 and substantive content', async ({ page }) => {
		await page.goto('/faq', { waitUntil: 'domcontentloaded' });

		const h1 = page.getByRole('heading', { level: 1 }).first();
		await expect(h1).toBeVisible({ timeout: 30_000 });

		const main = page.locator('main, article, [role="main"]').first();
		await expect(main).toBeVisible({ timeout: 30_000 });
		const text = (await main.innerText()) ?? '';
		expect(text.length, '/faq content length').toBeGreaterThan(100);
	});

	test('faq page emits a valid FAQPage JSON-LD block', async ({ page }) => {
		await page.goto('/faq', { waitUntil: 'domcontentloaded' });

		const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
		expect(blocks.length, 'at least one JSON-LD block').toBeGreaterThan(0);

		const faqBlocks = blocks
			.map((raw) => {
				try {
					return JSON.parse(raw) as Record<string, unknown>;
				} catch {
					return null;
				}
			})
			.filter((parsed): parsed is Record<string, unknown> => parsed?.['@type'] === 'FAQPage');

		expect(faqBlocks.length, 'exactly one FAQPage block').toBe(1);

		const mainEntity = faqBlocks[0].mainEntity;
		expect(Array.isArray(mainEntity), 'mainEntity is an array').toBe(true);
		const questions = mainEntity as Array<Record<string, unknown>>;
		expect(questions.length, 'at least one Question').toBeGreaterThan(0);

		// Google rejects a Question without a non-empty acceptedAnswer, so an
		// entry that lost either half is a broken rich result, not a nit.
		for (const question of questions) {
			expect(question['@type']).toBe('Question');
			expect(typeof question.name).toBe('string');
			expect((question.name as string).length).toBeGreaterThan(0);

			const answer = question.acceptedAnswer as Record<string, unknown> | undefined;
			expect(answer?.['@type']).toBe('Answer');
			expect(typeof answer?.text).toBe('string');
			expect((answer!.text as string).length).toBeGreaterThan(0);
		}
	});

	test('faq page advertises its markdown mirror and a canonical URL', async ({ page }) => {
		await page.goto('/faq', { waitUntil: 'domcontentloaded' });

		expect(await page.locator('link[rel="canonical"]').count(), 'canonical link').toBeGreaterThan(0);
		const mdAlternate = page.locator('link[rel="alternate"][type="text/markdown"]');
		expect(await mdAlternate.count(), 'text/markdown alternate link').toBeGreaterThan(0);
		expect(await mdAlternate.first().getAttribute('href')).toContain('/faq.md');
	});

	test('faq markdown mirror serves markdown', async ({ request }) => {
		const resp = await request.get('/faq.md');

		expect(resp.status(), '/faq.md status').toBeLessThan(400);
		expect((resp.headers()['content-type'] ?? '').toLowerCase()).toMatch(/text\/(markdown|plain)/);
		const body = await resp.text();
		expect(body.length, '/faq.md body should be non-empty').toBeGreaterThan(0);

		// The mirror must carry the same substance as the HTML page. A
		// `faq.<locale>.md` with frontmatter but no body used to render the
		// built-in FAQ at /faq while /faq.md returned a heading and nothing
		// else, so the alternate advertised to crawlers said less than the page.
		//
		// Any level from `##` to `######` counts: the parser treats them all as
		// question headings, so a data repository whose FAQ nests questions
		// under `###` sections is valid content and must not fail here.
		expect(body, '/faq.md should carry question headings, not just a title').toMatch(/^#{2,6}\s+\S/m);
	});

	test('faq is reachable from the footer', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });

		// Tolerate the locale-prefixed form (/en/faq) as well as the bare path.
		const faqLinks = page.locator('footer a[href$="/faq"]');
		expect(await faqLinks.count(), 'footer should link to /faq').toBeGreaterThan(0);
	});

	test('faq is listed in the sitemap', async ({ request }) => {
		const resp = await request.get('/sitemap.xml');
		test.skip(resp.status() >= 400, 'sitemap unavailable in this environment');

		const body = await resp.text();
		expect(body, 'sitemap should list /faq').toContain('/faq');
	});
});
