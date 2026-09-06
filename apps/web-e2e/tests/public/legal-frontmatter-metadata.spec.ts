import { test, expect } from '@playwright/test';

/**
 * The Terms of Service and Privacy Policy pages render Markdown that lives in
 * the data repository (`pages/<slug>.<locale>.md`). Their SEO metadata must be
 * derived from that file's frontmatter — `title` and `description` — instead of
 * the template's i18n strings, otherwise a directory that customised its legal
 * copy still ships the generic template snippet in search results (EW-17).
 *
 * The assertions are deliberately content-agnostic so they hold in every
 * environment:
 *
 *   - CI seeds `.content/pages/` from the workflow, so the frontmatter path is
 *     the one exercised there;
 *   - a checkout with no `DATA_REPOSITORY` falls back to the i18n strings.
 *
 * In both cases the SAME resolved title/description must reach the `<h1>`, the
 * `<title>`, the meta description, the Open Graph tags and the `.md` mirror —
 * which is exactly the drift this spec guards against.
 *
 * Where the fixture IS seeded, `E2E_STATIC_PAGES_SEEDED` unlocks the strict
 * assertions: the exact frontmatter values must appear, and because the fixture
 * titles ("CI Fixture …") differ from the i18n labels ("Terms of Service"),
 * passing them proves the frontmatter actually won rather than the fallback
 * merely being non-empty.
 */

/**
 * Set by `.github/workflows/e2e.yml` next to the `.content/pages/` seeding.
 * Absent locally and on any environment whose data repository ships its own
 * legal copy, where the exact strings are unknowable.
 */
const SEEDED = process.env.E2E_STATIC_PAGES_SEEDED === 'true';

/** Must match the frontmatter written by the e2e workflow's seeding step. */
const LEGAL_PAGES = [
	{
		path: '/privacy-policy',
		name: 'Privacy Policy',
		seededTitle: 'CI Fixture Privacy Policy',
		seededDescription: 'How this CI fixture directory collects, uses and protects your information'
	},
	{
		path: '/terms-of-service',
		name: 'Terms of Service',
		seededTitle: 'CI Fixture Terms of Service',
		seededDescription: 'Terms and conditions for using this CI fixture directory service'
	}
] as const;

/**
 * `renderStaticPageMarkdown` emits a fixed header block before the body:
 *
 * ```
 * # <title>
 *
 * > <description>          <- only when the frontmatter has one
 *
 * _Last updated: <date>_   <- only when the frontmatter has one
 *
 * <body>
 * ```
 *
 * Both helpers read that header block by POSITION rather than with a loose
 * document-wide regex: the Markdown body is author-supplied and may itself
 * contain a blockquote, which a `/^>/m` search would happily mistake for the
 * description.
 */
function mirrorHeaderLines(markdown: string): string[] {
	return markdown.split(/\r?\n/).slice(0, 5);
}

/** `# Heading` on the first line of the `.md` mirror is the resolved page title. */
function mirrorTitle(markdown: string): string | null {
	const match = /^#\s+(.+)$/.exec(mirrorHeaderLines(markdown)[0] ?? '');
	return match ? match[1].trim() : null;
}

/**
 * `renderStaticPageMarkdown` collapses newlines in the description
 * (`description.replace(/\n+/g, ' ')`) so the blockquote stays one line, while
 * the HTML `<meta>` keeps whatever the frontmatter had. Compare them in the
 * mirror's normalised form so a legitimately multi-line `description:` does not
 * fail this spec.
 */
function collapseWhitespace(value: string): string {
	return value.replace(/\s+/g, ' ').trim();
}

/** `> quoted line` right after the heading is the resolved frontmatter description. */
function mirrorDescription(markdown: string): string | null {
	const match = /^>\s+(.+)$/.exec(mirrorHeaderLines(markdown)[2] ?? '');
	return match ? match[1].trim() : null;
}

test.describe('Legal pages: SEO metadata comes from Markdown frontmatter', () => {
	for (const legalPage of LEGAL_PAGES) {
		test(`${legalPage.name} document title matches the rendered heading`, async ({ page }) => {
			const response = await page.goto(legalPage.path, { waitUntil: 'domcontentloaded' });
			expect(response, legalPage.path).not.toBeNull();
			expect(response!.status(), `${legalPage.path} status`).toBeLessThan(400);

			const heading = page.getByRole('heading', { level: 1 }).first();
			await expect(heading).toBeVisible({ timeout: 30_000 });
			const headingText = (await heading.innerText()).trim();
			expect(headingText.length, `${legalPage.path} h1 is non-empty`).toBeGreaterThan(0);

			// The <h1> already resolved frontmatter-title-or-fallback before this
			// change; the document title must now resolve identically (the site
			// name may be appended as a suffix).
			const title = (await page.title()).trim();
			expect(title, `${legalPage.path} <title> should start with the h1`).toContain(headingText);
		});

		test(`${legalPage.name} meta description and Open Graph tags are populated`, async ({ page }) => {
			const response = await page.goto(legalPage.path, { waitUntil: 'domcontentloaded' });
			expect(response!.status(), `${legalPage.path} status`).toBeLessThan(400);

			const description = await page.locator('meta[name="description"]').first().getAttribute('content');
			expect(description, `${legalPage.path} meta description present`).toBeTruthy();
			expect(description!.trim().length, `${legalPage.path} meta description length`).toBeGreaterThanOrEqual(20);

			const ogTitle = await page.locator('meta[property="og:title"]').first().getAttribute('content');
			expect(ogTitle, `${legalPage.path} og:title present`).toBeTruthy();
			expect(ogTitle!.trim()).toBe((await page.title()).trim());

			const ogDescription = await page.locator('meta[property="og:description"]').first().getAttribute('content');
			expect(ogDescription, `${legalPage.path} og:description present`).toBeTruthy();
			expect(ogDescription!.trim()).toBe(description!.trim());

			const ogType = await page.locator('meta[property="og:type"]').first().getAttribute('content');
			expect(ogType, `${legalPage.path} og:type`).toBe('website');

			const twitterCard = await page.locator('meta[name="twitter:card"]').first().getAttribute('content');
			expect(twitterCard, `${legalPage.path} twitter:card`).toBe('summary_large_image');

			// Twitter tags must carry the same resolved values, not a second
			// resolution of the same two fields.
			const twitterTitle = await page.locator('meta[name="twitter:title"]').first().getAttribute('content');
			expect(twitterTitle?.trim(), `${legalPage.path} twitter:title`).toBe(ogTitle!.trim());

			const twitterDescription = await page
				.locator('meta[name="twitter:description"]')
				.first()
				.getAttribute('content');
			expect(twitterDescription?.trim(), `${legalPage.path} twitter:description`).toBe(description!.trim());

			if (SEEDED) {
				// The strict contract: the seeded frontmatter, not the i18n label
				// ("Terms of Service") nor the i18n meta description.
				expect(description!.trim(), `${legalPage.path} description is the frontmatter one`).toBe(
					legalPage.seededDescription
				);
				expect((await page.title()).trim(), `${legalPage.path} <title> is the frontmatter one`).toContain(
					legalPage.seededTitle
				);
				const heading = await page.getByRole('heading', { level: 1 }).first().innerText();
				expect(heading.trim(), `${legalPage.path} <h1> is the frontmatter one`).toBe(legalPage.seededTitle);
			}
		});

		test(`${legalPage.name} HTML metadata agrees with its .md mirror`, async ({ page, request }) => {
			const mirror = await request.get(`${legalPage.path}.md`);
			expect(mirror.status(), `${legalPage.path}.md status`).toBeLessThan(500);

			// The `.md` rewrite is not wired on every deployment shape; its own
			// availability is `md-mirror-routes.spec.ts`'s contract, not this
			// spec's. When it is unavailable there is nothing to cross-check.
			const contentType = mirror.headers()['content-type'] ?? '';
			test.skip(
				mirror.status() >= 400 || !/text\/(markdown|plain)/i.test(contentType),
				`${legalPage.path}.md mirror unavailable in this environment`
			);

			const markdown = await mirror.text();

			// `renderStaticPageMarkdown` resolves the same frontmatter fields, so
			// the mirror is the environment-independent source of truth for what
			// the HTML page's metadata is supposed to say.
			const expectedTitle = mirrorTitle(markdown);
			expect(expectedTitle, `${legalPage.path}.md should render a heading`).toBeTruthy();

			const response = await page.goto(legalPage.path, { waitUntil: 'domcontentloaded' });
			expect(response!.status()).toBeLessThan(400);

			expect((await page.title()).trim(), `${legalPage.path} <title> should carry the mirror's title`).toContain(
				expectedTitle!
			);

			if (SEEDED) {
				// With the fixture in place the mirror's own header must be the
				// seeded frontmatter too, so all three surfaces are pinned.
				expect(expectedTitle, `${legalPage.path}.md heading is the frontmatter one`).toBe(
					legalPage.seededTitle
				);
				expect(mirrorDescription(markdown), `${legalPage.path}.md blockquote is the frontmatter one`).toBe(
					legalPage.seededDescription
				);
			}

			const expectedDescription = mirrorDescription(markdown);
			if (expectedDescription) {
				// The mirror only emits the blockquote when the frontmatter has a
				// `description`, so this branch is the real frontmatter assertion.
				const description = await page.locator('meta[name="description"]').first().getAttribute('content');
				expect(
					description ? collapseWhitespace(description) : description,
					`${legalPage.path} meta description from frontmatter`
				).toBe(collapseWhitespace(expectedDescription));
			}
		});

		test(`${legalPage.name} exposes a well-formed text/markdown alternate`, async ({ page }) => {
			const response = await page.goto(legalPage.path, { waitUntil: 'domcontentloaded' });
			expect(response!.status()).toBeLessThan(400);

			const href = await page.locator('link[rel="alternate"][type="text/markdown"]').first().getAttribute('href');
			// `buildStaticPageMetadata` always emits this alternate for these two
			// routes, so its absence is a regression, not an environment quirk.
			expect(href, `${legalPage.path} should advertise its .md mirror`).not.toBeNull();

			// A single absolute URL — the base URL used to be concatenated twice,
			// producing `https://hosthttps://host/terms-of-service.md`.
			expect(href, `${legalPage.path} markdown alternate should end in .md`).toMatch(/\.md$/);
			expect(
				href!.match(/https?:\/\//g)?.length ?? 0,
				`${legalPage.path} markdown alternate should contain exactly one scheme`
			).toBe(1);
			expect(() => new URL(href!), `${legalPage.path} markdown alternate parses`).not.toThrow();
		});
	}
});
