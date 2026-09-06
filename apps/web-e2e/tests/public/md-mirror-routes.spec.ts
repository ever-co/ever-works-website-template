import { test, expect, type APIRequestContext } from '@playwright/test';

/**
 * Contract guard for the Markdown-mirror SEO surface (Spec 047).
 *
 * Every public page advertises a Markdown twin at the same path with `.md`
 * appended (`<link rel="alternate" type="text/markdown">`). `next.config.ts`
 * rewrites each `<path>.md` URL onto an internal route handler that renders
 * the same content the HTML page renders.
 *
 * **Why the assertions below are exact.** The previous version of this file
 * asserted only `status < 500` and gated its content-type check behind
 * `status < 400`. Every mirror URL 404'd — the route handlers lived in
 * `_`-prefixed folders, which the App Router excludes from routing, so the
 * rewrite destinations did not exist — and this spec stayed green the whole
 * time. A guard that a 404 satisfies is not a guard. Everything here now
 * asserts the real contract: exactly 200, `text/markdown`, and a body that
 * is the actual page content.
 */

/** `Content-Type` the mirrors must serve. */
const MARKDOWN_CONTENT_TYPE = /^text\/markdown\b/;

/**
 * Static info pages. These always render — the handler falls back to a
 * built-in body when the CMS has no page file — so they are asserted
 * unconditionally, with no content fixtures required.
 */
const STATIC_INFO_PATHS = [
	'/about',
	'/help',
	'/pricing',
	'/privacy-policy',
	'/terms-of-service',
	'/cookies'
] as const;

/** A non-default locale that is in `LOCALES` and therefore routable. */
const OTHER_LOCALE = 'fr';

/** Slug that cannot exist in any content repository. */
const MISSING = 'e2e-definitely-not-a-real-slug-9f3a7c';

type ItemsJsonItem = {
	slug?: string;
	name?: string;
	categories?: string[];
	tags?: string[];
};

/**
 * Pull one real item out of the public `/items.json` dump so the item /
 * category / tag mirrors are exercised against whatever content the
 * environment actually serves (the demo repo locally, the seeded stub in
 * CI) instead of a hard-coded fixture slug.
 */
async function allItems(request: APIRequestContext): Promise<ItemsJsonItem[]> {
	const resp = await request.get('/items.json');
	expect(resp.status(), '/items.json status').toBe(200);
	const json = (await resp.json()) as { items?: ItemsJsonItem[] };
	return json.items ?? [];
}

async function firstItem(request: APIRequestContext): Promise<ItemsJsonItem> {
	const item = (await allItems(request)).find(
		(i) => typeof i.slug === 'string' && i.slug.length > 0
	);
	expect(
		item,
		'/items.json returned no items, so the item/category/tag Markdown mirrors cannot be verified'
	).toBeTruthy();
	return item!;
}

/**
 * First non-empty category / tag value anywhere in `/items.json`.
 *
 * Deliberately *not* `firstItem().categories[0]`: whether item #1 carries a
 * category and a tag depends on the content repository's ordering, not on
 * whether the mirror route works, so keying off it turns an unrelated content
 * change into a red build. Scanning for the first item that actually has the
 * facet exercises the same route with no such coupling.
 */
async function firstFacet(
	request: APIRequestContext,
	facet: 'categories' | 'tags'
): Promise<string | null> {
	for (const item of await allItems(request)) {
		const value = (item[facet] ?? []).find((v) => typeof v === 'string' && v.length > 0);
		if (value) return value;
	}
	return null;
}

/**
 * Assert that `path` serves a real Markdown mirror: exactly 200, a
 * `text/markdown` content type, the `noindex` robots header (search engines
 * must index the canonical HTML, not the mirror), and a non-empty body that
 * opens with a Markdown H1.
 */
async function expectMarkdownMirror(
	request: APIRequestContext,
	path: string
): Promise<string> {
	const resp = await request.get(path);
	expect(resp.status(), `${path} must serve its Markdown mirror`).toBe(200);

	const headers = resp.headers();
	expect(headers['content-type'] ?? '', `${path} content-type`).toMatch(MARKDOWN_CONTENT_TYPE);
	expect(headers['x-robots-tag'] ?? '', `${path} robots header`).toContain('noindex');

	const body = await resp.text();
	expect(body.trim().length, `${path} body must not be empty`).toBeGreaterThan(0);
	expect(body, `${path} must open with a Markdown H1`).toMatch(/^#[ \t]+\S/);
	return body;
}

/**
 * Every renderer emits the canonical HTML URL of the page it mirrors, as
 * `_Canonical page: <url>_` or `- **Canonical page:** <url>`. Extract it so
 * we can prove the mirror rendered the page we asked for (and the locale we
 * asked for) rather than some other page's content.
 */
function canonicalPathOf(body: string, label: string): string {
	const match = body.match(/Canonical page:\**[ \t]+(\S+)/);
	expect(match?.[1], `${label} body must name its canonical page`).toBeTruthy();
	const url = match![1].replace(/[_.]+$/, '');
	return new URL(url).pathname;
}

/**
 * Assert `path` is a hard 404 from the *handler* — not a 500, not a soft empty
 * 200, and not Next.js' HTML not-found page.
 *
 * The content type is the load-bearing part. A missing rewrite or an
 * unroutable handler also answers 404, but with `text/html`; only a handler
 * that ran and decided the slug does not exist answers with the JSON
 * envelope. That distinction is what makes these cases evidence of
 * reachability rather than of the very breakage this spec guards against.
 */
async function expectNotFound(request: APIRequestContext, path: string): Promise<void> {
	const resp = await request.get(path);
	expect(resp.status(), `${path} must 404 for an unknown slug`).toBe(404);
	expect(resp.headers()['content-type'] ?? '', `${path} 404 must come from the mirror handler`).toMatch(
		/^application\/json\b/
	);
	expect(await resp.json(), `${path} 404 body`).toEqual({ error: 'Not found' });
}

/**
 * Find one slug that really exists for a route family, from the links on its
 * listing page, so these assertions run against whatever content the
 * environment serves. Returns `null` when the directory ships none of that
 * resource — the CI content stub has no comparisons, the demo repository has
 * no collections — rather than pinning a fixture slug that exists in only one
 * of them. (`/sitemap.xml` is not usable for this: it passes slugs through
 * `sanitizeSlug()`, which collapses the `--` in comparison slugs.)
 */
async function discoverListedSlug(
	request: APIRequestContext,
	family: 'collections' | 'comparisons'
): Promise<string | null> {
	const resp = await request.get(`/${family}`);
	expect(resp.status(), `/${family} status`).toBe(200);
	const html = await resp.text();
	const href = new RegExp(`href="(?:https?://[^"]*)?/(?:[a-z]{2}/)?${family}/([^"/?#]+)"`, 'g');
	for (const match of html.matchAll(href)) {
		const slug = decodeURIComponent(match[1]);
		if (slug !== 'paging') return slug;
	}
	return null;
}

/**
 * CMS documents under `/pages/<slug>` have no listing to scrape, so probe the
 * conventional slugs and take the first one this content repository actually
 * publishes.
 */
const CMS_PAGE_CANDIDATES = ['about', 'privacy-policy', 'terms-of-service', 'cookies', 'contact'] as const;

async function discoverCmsPageSlug(request: APIRequestContext): Promise<string | null> {
	for (const slug of CMS_PAGE_CANDIDATES) {
		const resp = await request.get(`/pages/${slug}`);
		if (resp.status() === 200) return slug;
	}
	return null;
}

test.describe('Markdown mirror routes', () => {
	for (const path of STATIC_INFO_PATHS) {
		test(`${path}.md serves the page as Markdown`, async ({ request }) => {
			const body = await expectMarkdownMirror(request, `${path}.md`);
			expect(canonicalPathOf(body, `${path}.md`), `${path}.md canonical page`).toBe(path);
		});
	}

	test(`/${OTHER_LOCALE}/<page>.md serves the mirror for that locale`, async ({ request }) => {
		for (const path of ['/about', '/pricing']) {
			const localized = `/${OTHER_LOCALE}${path}.md`;
			const body = await expectMarkdownMirror(request, localized);
			expect(canonicalPathOf(body, localized), `${localized} canonical page`).toBe(
				`/${OTHER_LOCALE}${path}`
			);
		}
	});

	test('/items/<slug>.md serves the item as Markdown', async ({ request }) => {
		const { slug } = await firstItem(request);
		const path = `/items/${slug}.md`;
		const body = await expectMarkdownMirror(request, path);
		expect(canonicalPathOf(body, path), `${path} canonical page`).toBe(`/items/${slug}`);
	});

	test('/<locale>/items/<slug>.md serves the item mirror for that locale', async ({ request }) => {
		const { slug } = await firstItem(request);
		const path = `/${OTHER_LOCALE}/items/${slug}.md`;
		const body = await expectMarkdownMirror(request, path);
		expect(canonicalPathOf(body, path), `${path} canonical page`).toBe(
			`/${OTHER_LOCALE}/items/${slug}`
		);
	});

	test('/categories/<category>.md serves the category listing as Markdown', async ({ request }) => {
		const category = await firstFacet(request, 'categories');
		test.skip(category === null, 'this content repository categorises no items');
		await expectMarkdownMirror(request, `/categories/${encodeURIComponent(category!)}.md`);
	});

	test('/tags/<tag>.md serves the tag listing as Markdown', async ({ request }) => {
		const tag = await firstFacet(request, 'tags');
		test.skip(tag === null, 'this content repository tags no items');
		await expectMarkdownMirror(request, `/tags/${encodeURIComponent(tag!)}.md`);
	});

	// The category and tag surfaces can be switched off for a whole site
	// (`settings.categories_enabled` / `settings.tags_enabled` in
	// `.works/works.yml`), and the HTML listings `notFound()` when they are.
	// A mirror that kept serving the listing would publish a surface the site
	// has withdrawn, so it has to answer like the page it mirrors whichever
	// way the switch is set. Measured against a build without the gate:
	// `/categories/<c>` 404 `text/html` while `/categories/<c>.md` 200
	// `text/markdown`.
	for (const [family, facet] of [
		['categories', 'categories'],
		['tags', 'tags']
	] as const) {
		test(`/${family}/<slug>.md answers like the page it mirrors`, async ({ request }) => {
			const value = await firstFacet(request, facet);
			test.skip(value === null, `this content repository has no ${facet}`);
			const encoded = encodeURIComponent(value!);
			const page = await request.get(`/${family}/${encoded}`);
			const mirror = await request.get(`/${family}/${encoded}.md`);
			expect(
				mirror.status(),
				`/${family}/${encoded}.md must answer like /${family}/${encoded}`
			).toBe(page.status());
		});
	}

	test('/pages/<slug>.md serves the CMS page as Markdown', async ({ request }) => {
		const slug = await discoverCmsPageSlug(request);
		test.skip(slug === null, 'this content repository publishes no /pages/<slug> documents');
		const path = `/pages/${slug}.md`;
		const body = await expectMarkdownMirror(request, path);
		expect(canonicalPathOf(body, path), `${path} canonical page`).toBe(`/pages/${slug}`);
	});

	test('/collections/<slug>.md serves the collection as Markdown', async ({ request }) => {
		const slug = await discoverListedSlug(request, 'collections');
		test.skip(slug === null, 'this content repository publishes no collections');
		const path = `/collections/${slug}.md`;
		const body = await expectMarkdownMirror(request, path);
		expect(canonicalPathOf(body, path), `${path} canonical page`).toBe(`/collections/${slug}`);
	});

	test('/comparisons/<slug>.md serves the comparison as Markdown', async ({ request }) => {
		const slug = await discoverListedSlug(request, 'comparisons');
		test.skip(slug === null, 'this content repository publishes no comparisons');
		const path = `/comparisons/${slug}.md`;
		const body = await expectMarkdownMirror(request, path);
		expect(canonicalPathOf(body, path), `${path} canonical page`).toBe(`/comparisons/${slug}`);
	});

	// `proxy.ts` skips dotted paths, so nothing but the rewrite source itself
	// rejects an unsupported locale here. `/zz/about` 404s; `/zz/about.md`
	// must too, or the mirrors would answer for locales the site does not have.
	for (const path of ['/zz/about.md', '/zz/pricing.md']) {
		test(`${path} is not served for an unsupported locale`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), `${path} must not serve a mirror`).toBe(404);
			expect(resp.headers()['content-type'] ?? '', `${path} content-type`).not.toMatch(
				/^text\/markdown\b/
			);
		});
	}

	// An unknown slug must reach the handler and be rejected by it. The JSON
	// envelope `expectNotFound` requires is what separates "the handler said
	// no" from "the route does not exist" — the pre-Spec-047 breakage produced
	// an HTML 404 for *every* slug and would fail these too.
	for (const path of [
		`/items/${MISSING}.md`,
		`/pages/${MISSING}.md`,
		`/collections/${MISSING}.md`,
		`/comparisons/${MISSING}.md`,
		`/categories/${MISSING}.md`,
		`/tags/${MISSING}.md`
	]) {
		test(`${path} 404s`, async ({ request }) => {
			await expectNotFound(request, path);
		});
	}

	// The mirrors exist to be discovered, so the href the HTML advertises has
	// to resolve. Scoped to /help and /pricing: the four other info pages
	// build that href through a separate code path whose origin handling is
	// owned by `md-alternate-link-absolute-url.spec.ts`.
	for (const page of ['/help', '/pricing']) {
		test(`${page} advertises a Markdown alternate that resolves`, async ({ request, baseURL }) => {
			const resp = await request.get(page);
			expect(resp.status(), `${page} status`).toBe(200);
			const html = await resp.text();

			const tag = html.match(/<link[^>]+type="text\/markdown"[^>]*>/i);
			expect(tag?.[0], `${page} must advertise a text/markdown alternate`).toBeTruthy();
			const href = tag![0].match(/href="([^"]+)"/i)?.[1];
			expect(href, `${page} markdown alternate must have an href`).toBeTruthy();

			const advertised = new URL(href!, baseURL).pathname;
			expect(advertised, `${page} markdown alternate path`).toBe(`${page}.md`);
			await expectMarkdownMirror(request, advertised);
		});
	}
});
