import { test, expect, type Page } from '@playwright/test';

/**
 * Frontmatter is author-supplied YAML, so a `title:` or `description:` key can
 * legitimately parse to something that is not a string — `title: 2026` is a
 * number, and a `title:` followed by an indented block is a mapping.
 *
 * Every surface that renders `pages/<slug>.<locale>.md` metadata must resolve
 * those fields through the SAME validated read (`lib/seo/frontmatter.ts`), or
 * the surfaces disagree: the routes used to cast the raw value, which put
 * `[object Object]` in the meta description and handed React a non-string
 * child (EW-17).
 *
 * The fixture is seeded by `.github/workflows/e2e.yml` under the slug
 * `frontmatter-hostile`, which no other spec visits, so these assertions do
 * not change what the rest of the suite sees.
 */

/** Set by `.github/workflows/e2e.yml` next to the `.content/pages/` seeding. */
const SEEDED = process.env.E2E_STATIC_PAGES_SEEDED === 'true';

/** Slug of the hostile fixture, and the title `formatDisplayName` derives from it. */
const HOSTILE_PATH = '/pages/frontmatter-hostile';
const SLUG_FALLBACK_TITLE = 'Frontmatter Hostile';

/**
 * What a cast of a non-string frontmatter value looks like once it reaches an
 * HTML attribute. Its presence anywhere in the head is the regression.
 */
const CAST_ARTIFACT = '[object Object]';

async function metaContent(page: Page, selector: string): Promise<string | null> {
	const locator = page.locator(selector).first();
	if ((await locator.count()) === 0) return null;
	return locator.getAttribute('content');
}

test.describe('Non-string frontmatter values fall back instead of leaking', () => {
	test.skip(!SEEDED, 'requires the `frontmatter-hostile` fixture seeded by the e2e workflow');

	test('a mapping-valued title and description do not break the page', async ({ page }) => {
		const response = await page.goto(HOSTILE_PATH, { waitUntil: 'domcontentloaded' });
		expect(response, HOSTILE_PATH).not.toBeNull();

		// A non-string frontmatter value must never take the route down: the old
		// cast handed React an object child, which renders as a 500.
		expect(response!.status(), `${HOSTILE_PATH} status`).toBeLessThan(400);

		// `title:` parsed to a mapping, so the slug-derived name must win.
		const heading = page.getByRole('heading', { level: 1 }).first();
		await expect(heading).toBeVisible({ timeout: 30_000 });
		expect((await heading.innerText()).trim(), `${HOSTILE_PATH} h1 falls back to the slug`).toBe(
			SLUG_FALLBACK_TITLE
		);

		const documentTitle = (await page.title()).trim();
		expect(documentTitle, `${HOSTILE_PATH} <title> falls back to the slug`).toContain(SLUG_FALLBACK_TITLE);
		expect(documentTitle, `${HOSTILE_PATH} <title> is not a cast object`).not.toContain(CAST_ARTIFACT);
	});

	test('no head metadata carries a cast frontmatter object', async ({ page }) => {
		const response = await page.goto(HOSTILE_PATH, { waitUntil: 'domcontentloaded' });
		expect(response!.status(), `${HOSTILE_PATH} status`).toBeLessThan(400);

		// `description:` parsed to a mapping. Casting it put the string
		// "[object Object]" straight into the SERP snippet; the validated read
		// falls back to an empty description instead.
		for (const selector of [
			'meta[name="description"]',
			'meta[property="og:description"]',
			'meta[name="twitter:description"]',
			'meta[property="og:title"]',
			'meta[name="twitter:title"]'
		]) {
			const content = await metaContent(page, selector);
			if (content === null) continue;
			expect(content, `${HOSTILE_PATH} ${selector} is not a cast object`).not.toContain(CAST_ARTIFACT);
		}

		// The whole rendered head, in case a future field is added without a
		// validated read.
		const head = await page.locator('head').first().innerHTML();
		expect(head, `${HOSTILE_PATH} head is free of cast frontmatter objects`).not.toContain(CAST_ARTIFACT);
	});
});
