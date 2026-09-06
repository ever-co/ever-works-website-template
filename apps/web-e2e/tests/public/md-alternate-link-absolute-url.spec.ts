import { test, expect, type Page } from '@playwright/test';

/**
 * Every page that ships a Markdown mirror advertises it to crawlers via
 *
 *   <link rel="alternate" type="text/markdown" href="https://host/about.md" />
 *
 * `getLocalizedUrl()` (apps/web/lib/seo/hreflang.ts) already returns an
 * ABSOLUTE url. Six routes (about, cookies, privacy-policy,
 * terms-of-service, items/[slug], pages/[slug]) additionally prefixed it
 * with `appUrl`, so the metadata value was
 * `https://hosthttps://host/about.md`.
 *
 * What actually shipped in the HTML is worse than that string suggests.
 * `https://hosthttps://host/about.md` is not parseable as an absolute
 * url (`3000http:` is not a port), so Next.js resolved it RELATIVE to
 * `metadataBase` — which both `app/layout.tsx` and
 * `app/[locale]/layout.tsx` set. Observed on a dev server:
 *
 *   href="http://localhost:3000/http:/localhost:3000http:/localhost:3000/about.md"
 *
 * Note the `://` were collapsed to `:/` by url normalisation, and that
 * there is NO separator between the first `localhost:3000` and the
 * `http:` that follows it. So a "contains exactly one ://" check does
 * NOT catch the real regression on its own, and neither does
 * `new URL(href)` — that parses the mangled href quite happily. The
 * load-bearing assertion is the pathname one: the doubled origin
 * survives buried inside the PATH, and comparing the path against the
 * mirror path it is supposed to advertise is what actually fails. The
 * `://` count is kept as a cheap second net for a future page that omits
 * `metadataBase` and emits the raw doubled string verbatim.
 *
 * `md-mirror-routes.spec.ts` could not have caught this: it fetches the
 * `.md` paths directly and never looks at the href the HTML advertises.
 */

// Static info slugs wired into the `/_static-md` catch-all in
// next.config.ts that also render an HTML page emitting the alternate
// link. `faq` is intentionally absent: it is not on develop yet.
const MD_ALTERNATE_PAGES = ['/about', '/cookies', '/privacy-policy', '/terms-of-service', '/help', '/pricing'];

// `pages/[slug]` — the CMS slug bucket — built its alternate the same way and
// carried the same doubled origin. These slugs come from the content
// repository, so an install without them 404s, which this guard skips.
const MD_ALTERNATE_CMS_PAGES = ['/pages/about', '/pages/privacy-policy'];

// Default locale is unprefixed ("as-needed"); `/fr` exercises the
// prefixed branch of getLocalizedUrl(), which is where a doubled origin
// produces a different-but-equally-broken string.
const LOCALE_PREFIXES = ['', '/fr'];

const MD_ALTERNATE_SELECTOR = 'link[rel="alternate"][type="text/markdown"]';

// Item-slug discovery reads the listing endpoint, and the item detail route
// itself renders from the whole git-CMS catalogue. Both are slow when cold —
// slower than the suite defaults (30s action, 60s navigation) allow — so they
// get budgets of their own. Together these stay under the tripled test
// timeout that `test.slow()` buys those two tests.
const ITEM_DISCOVERY_TIMEOUT = 30_000;
const ITEM_NAVIGATION_TIMEOUT = 120_000;

/**
 * Everything wrong with ONE advertised markdown-alternate href, as a list
 * of human-readable problems. An empty list means the href is a single
 * absolute http(s) URL whose pathname is exactly `expectedPathname`.
 *
 * Kept as a pure function so that EVERY matched <link> is held to the same
 * rules. An earlier revision of this guard validated only `.first()`, so a
 * page emitting a well-formed alternate followed by a malformed duplicate
 * would have passed — see the "malformed duplicate" test at the bottom.
 */
function markdownAlternateProblems(href: string | null, expectedPathname: string): string[] {
	const value = (href ?? '').trim();
	if (!value) {
		return ['href is missing or empty'];
	}

	// 1. It must parse as an absolute http(s) url.
	let parsed: URL | undefined;
	try {
		parsed = new URL(value);
	} catch {
		parsed = undefined;
	}
	if (!parsed) {
		return [`"${value}" does not parse as an absolute URL`];
	}

	const problems: string[] = [];
	if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
		problems.push(`"${value}" protocol is "${parsed.protocol}", expected http: or https:`);
	}
	if (parsed.hostname === '') {
		problems.push(`"${value}" has an empty hostname`);
	}

	// 2. The origin must appear exactly once — a raw, unresolved doubled
	// origin still carries two "://".
	const schemeSeparators = value.split('://').length - 1;
	if (schemeSeparators !== 1) {
		problems.push(`"${value}" contains ${schemeSeparators} "://", expected exactly 1`);
	}

	// 3. The real detector. A doubled origin that Next.js resolved against
	// metadataBase hides in the PATH, e.g. "/http:/host/http:/host/about.md"
	// instead of "/about.md".
	if (parsed.pathname !== expectedPathname) {
		problems.push(`"${value}" pathname is "${parsed.pathname}", expected "${expectedPathname}"`);
	}

	return problems;
}

/**
 * Reads EVERY markdown alternate the current document declares and returns
 * how many there were plus every problem found across all of them.
 *
 * "Across all of them" is the point: validating only `.first()` let a page
 * emit a well-formed alternate followed by a malformed duplicate and still
 * pass. The "malformed duplicate" test at the bottom exercises this exact
 * function, so weakening it back to first-only turns that test red.
 */
async function collectMarkdownAlternates(
	page: Page,
	expectedPathname: string
): Promise<{ count: number; problems: string[] }> {
	// Probe the count first: `getAttribute()` waits for the element and
	// would burn the full expect timeout if it were absent.
	const links = page.locator(MD_ALTERNATE_SELECTOR);
	const count = await links.count();
	const hrefs = await Promise.all((await links.all()).map((link) => link.getAttribute('href')));
	const problems = hrefs.flatMap((href, index) =>
		markdownAlternateProblems(href, expectedPathname).map((problem) => `alternate #${index + 1}: ${problem}`)
	);
	return { count, problems };
}

/**
 * Asserts the page under test advertises exactly one markdown alternate and
 * that every matched href is well formed.
 *
 * Both halves matter. The count assertion is what stops a malformed
 * duplicate from shipping behind a well-formed first link; validating every
 * href keeps this a real guard even if a future page legitimately needs the
 * count relaxed.
 */
async function expectWellFormedMarkdownAlternate(page: Page, pagePath: string, expectedPathname: string) {
	const { count, problems } = await collectMarkdownAlternates(page, expectedPathname);
	expect(count, `${pagePath} must declare exactly one ${MD_ALTERNATE_SELECTOR}`).toBe(1);
	expect(problems, `${pagePath} markdown alternate(s)`).toEqual([]);
}

/**
 * Navigates and reports whether the page is actually served here.
 * A 5xx FAILS rather than skips, so a broken page cannot quietly opt itself
 * out of this guard; only 404/410 count as "this deployment does not serve
 * it".
 */
async function pageIsServed(page: Page, pagePath: string, navigationTimeout?: number): Promise<boolean> {
	const response = await page.goto(pagePath, { waitUntil: 'domcontentloaded', timeout: navigationTimeout });
	expect(response, pagePath).not.toBeNull();
	const status = response!.status();
	expect(status, `${pagePath} must not 5xx`).toBeLessThan(500);
	return status !== 404 && status !== 410;
}

test.describe('Markdown alternate link is a single absolute URL', () => {
	for (const prefix of LOCALE_PREFIXES) {
		for (const path of [...MD_ALTERNATE_PAGES, ...MD_ALTERNATE_CMS_PAGES]) {
			const pagePath = `${prefix}${path}`;

			test(`${pagePath} advertises a well-formed text/markdown alternate`, async ({ page }) => {
				// A page a given deployment genuinely does not serve is out of
				// scope; the url-shape assertions stay strict.
				test.skip(!(await pageIsServed(page, pagePath)), `${pagePath} is not served by this deployment`);
				await expectWellFormedMarkdownAlternate(page, pagePath, `${pagePath}.md`);
			});
		}
	}

	// `items/[slug]` builds its alternate the same way and carried the same
	// doubled origin. Item slugs are content-dependent, so one is discovered
	// at runtime. One test per locale prefix, each doing a single navigation,
	// so an item detail page gets the same time budget as the static pages
	// above rather than having to compile two heavy routes inside one.
	for (const prefix of LOCALE_PREFIXES) {
		test(`${prefix}/items/<first published item> advertises a well-formed text/markdown alternate`, async ({
			page
		}) => {
			// Slug discovery and the item detail route both read the whole
			// git-CMS catalogue, which is slow when cold. Against a local dev
			// server a first, uncompiled `/items/<slug>` blew straight through
			// the suite's 60s navigation timeout. Triple the test budget and
			// give the navigation its own, so a cold compile cannot turn a
			// passing shape assertion into a timeout. CI runs these against a
			// production build where the route is already compiled.
			test.slow();

			const slug = await discoverItemSlug(page);
			test.skip(slug === null, 'This deployment publishes no items');

			const itemPath = `${prefix}/items/${slug}`;
			test.skip(
				!(await pageIsServed(page, itemPath, ITEM_NAVIGATION_TIMEOUT)),
				`${itemPath} is not served by this deployment`
			);
			await expectWellFormedMarkdownAlternate(page, itemPath, `${itemPath}.md`);
		});
	}

	test('a malformed duplicate alternate is caught, not hidden behind a well-formed first link', async ({ page }) => {
		// Exactly the shape observed on a dev server before the fix: the
		// doubled origin, normalised by Next.js against `metadataBase`, buried
		// in the pathname.
		const malformed = 'http://localhost:3000/http:/localhost:3000http:/localhost:3000/about.md';
		await page.setContent(
			'<!doctype html><html><head>' +
				'<link rel="alternate" type="text/markdown" href="http://localhost:3000/about.md" />' +
				`<link rel="alternate" type="text/markdown" href="${malformed}" />` +
				'</head><body></body></html>'
		);

		// The first alternate is clean, which is precisely why checking only
		// `.first()` used to let the second one through.
		const firstHref = await page.locator(MD_ALTERNATE_SELECTOR).first().getAttribute('href');
		expect(markdownAlternateProblems(firstHref, '/about.md'), 'first alternate is well formed').toEqual([]);

		// The page tests above run this same collection over every matched
		// link, so it reports the malformed second one...
		const { count, problems } = await collectMarkdownAlternates(page, '/about.md');
		expect(problems.join(' | '), 'the malformed duplicate must be reported').toContain('pathname is');
		// ...and the count assertion rejects the pair outright.
		expect(count, 'fixture emits two markdown alternates').toBe(2);

		// `new URL()` parses the mangled href happily, so the parse check alone
		// would not have caught it either.
		expect(() => new URL(malformed), 'the mangled href is still a parseable URL').not.toThrow();
	});
});

/**
 * Returns the slug of the first item this deployment publishes, or null when
 * it publishes none / cannot say in time.
 *
 * Read from `/api/items/listing` — the ~10KB paginated JSON peer of the
 * listing page — rather than from the ~1.5MB `/items.json` catalogue or by
 * scraping an anchor out of a rendered `/discover/1`. It also yields the raw
 * slug directly, instead of a `/en/items/<slug>` href that 307-redirects to
 * the unprefixed form the metadata actually advertises.
 *
 * Discovery is FAIL-SOFT on purpose. This guard's job is the shape of the
 * advertised href, not catalogue availability, so a slow or absent listing
 * endpoint must skip the test rather than redden it. The static and CMS
 * pages above cover the same defect on routes that need no discovery.
 */
async function discoverItemSlug(page: Page): Promise<string | null> {
	try {
		const response = await page.request.get('/api/items/listing?page=1', { timeout: ITEM_DISCOVERY_TIMEOUT });
		if (!response.ok()) {
			return null;
		}
		const body = (await response.json()) as { items?: Array<{ slug?: unknown }> };
		const slug = body.items?.[0]?.slug;
		// Only a plain single-segment slug builds a `/items/<slug>` detail path.
		return typeof slug === 'string' && slug !== '' && !slug.includes('/') ? slug : null;
	} catch {
		return null;
	}
}
