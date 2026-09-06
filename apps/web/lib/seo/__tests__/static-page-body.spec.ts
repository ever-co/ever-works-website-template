import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { DEFAULT_FAQ_CONTENT, resolveStaticPageBody } from '../../default-page-content';
import { extractFaqEntries } from '../faq-parser';
import { renderStaticPageMarkdown } from '../markdown-mirror';

/**
 * A static info page exists twice: as HTML at `/faq` and as Markdown at
 * `/faq.md`, which the HTML page itself advertises to crawlers via
 * `<link rel="alternate" type="text/markdown">`. Telling a crawler that two
 * URLs are the same document and then serving different content from them is
 * the defect this file guards against, and the only way the two have ever
 * managed to disagree is by each deciding for itself what "empty" means.
 *
 * `pages/<slug>.<locale>.md` is author-controlled and frequently blank in the
 * ways that matter here: the frontmatter parser in `lib/content.ts` returns
 * everything after the closing `---`, so a file with no body loads as `''` and
 * one that ends with a blank line or two — the ordinary shape of a
 * hand-written file — loads as `'\n\n'`, which is truthy.
 *
 * Run with: `npx tsx --test apps/web/lib/seo/__tests__/static-page-body.spec.ts`
 */

/** Every shape `getCachedPageContent` produces for "the repository shipped no body". */
const BLANK_BODIES: ReadonlyArray<readonly [string, string | null | undefined]> = [
	['no file at all', null],
	['frontmatter and nothing after it', ''],
	['frontmatter then one newline', '\n'],
	['frontmatter then a blank line', '\n\n'],
	['spaces and tabs only', '   \n\t\n  ']
];

const MIRROR_OPTIONS = {
	title: 'FAQ',
	path: '/faq',
	baseUrl: 'https://directory.test',
	locale: 'en',
	defaultContent: DEFAULT_FAQ_CONTENT
};

/** First question of the built-in FAQ — present iff the default body was used. */
const DEFAULT_MARKER = '## What is this directory?';

describe('resolveStaticPageBody', () => {
	it('treats every blank body as "no body shipped"', () => {
		for (const [label, body] of BLANK_BODIES) {
			assert.equal(
				resolveStaticPageBody(body, DEFAULT_FAQ_CONTENT),
				DEFAULT_FAQ_CONTENT,
				`${label} should resolve to the built-in default`
			);
		}
	});

	it('returns authored content verbatim, whitespace and all', () => {
		const authored = '\n## Real question?\n\nReal answer.\n';
		assert.equal(resolveStaticPageBody(authored, DEFAULT_FAQ_CONTENT), authored);
		// A body that is only *mostly* blank still counts as authored.
		assert.equal(resolveStaticPageBody('\n\n  x  \n\n', DEFAULT_FAQ_CONTENT), '\n\n  x  \n\n');
	});
});

describe('the /faq page and its /faq.md mirror agree on emptiness', () => {
	it('serves the built-in FAQ from both representations for every blank body', () => {
		for (const [label, body] of BLANK_BODIES) {
			const pageData = body === null ? null : { metadata: { title: 'FAQ' }, content: body };

			// What the HTML page renders and feeds to the FAQPage generator.
			const pageBody = resolveStaticPageBody(pageData?.content, DEFAULT_FAQ_CONTENT);
			// What `/faq.md` returns.
			const mirror = renderStaticPageMarkdown(pageData, MIRROR_OPTIONS);

			assert.ok(pageBody.includes(DEFAULT_MARKER), `${label}: /faq lost the built-in FAQ`);
			assert.ok(mirror.includes(DEFAULT_MARKER), `${label}: /faq.md lost the built-in FAQ`);

			// The rich result is the whole SEO point of the page, and it is what
			// silently disappears when the page resolves to an empty body while
			// the mirror keeps advertising questions.
			assert.ok(
				extractFaqEntries(pageBody, pageData?.metadata).length > 0,
				`${label}: /faq emitted no FAQPage entries`
			);
			assert.match(mirror, /^#{2,6}\s+\S/m, `${label}: /faq.md carried no question headings`);
		}
	});

	it('serves the authored body from both representations, never the default', () => {
		const authored = '## Authored question?\n\nAuthored answer.\n';
		const pageData = { metadata: { title: 'FAQ' }, content: authored };

		const pageBody = resolveStaticPageBody(pageData.content, DEFAULT_FAQ_CONTENT);
		const mirror = renderStaticPageMarkdown(pageData, MIRROR_OPTIONS);

		assert.ok(pageBody.includes('Authored question?'));
		assert.ok(mirror.includes('Authored question?'));
		assert.ok(!pageBody.includes(DEFAULT_MARKER), '/faq should not mix in the built-in FAQ');
		assert.ok(!mirror.includes(DEFAULT_MARKER), '/faq.md should not mix in the built-in FAQ');

		assert.deepEqual(extractFaqEntries(pageBody, pageData.metadata), [
			{ question: 'Authored question?', answer: 'Authored answer.' }
		]);
	});
});

/**
 * The pages themselves are React Server Components that import `next-intl`,
 * MDX and the app's component tree, so they cannot be loaded into this
 * process. What can be checked — and what actually regressed — is that each
 * one resolves its body through the shared rule instead of hand-writing a
 * fallback that then drifts from its mirror's.
 */
describe('every static info page with a .md mirror uses the shared rule', () => {
	const slugs = ['faq', 'about', 'cookies', 'privacy-policy', 'terms-of-service'];
	// `[locale]` is a literal directory name, so it is percent-escaped in a URL.
	const pageSource = (slug: string): string =>
		readFileSync(fileURLToPath(new URL(`../../../app/%5Blocale%5D/${slug}/page.tsx`, import.meta.url)), 'utf8');

	for (const slug of slugs) {
		it(`/${slug} resolves its body through resolveStaticPageBody`, () => {
			const source = pageSource(slug);

			assert.match(
				source,
				/const content = resolveStaticPageBody\(pageData\?\.content,/,
				`/${slug} must resolve its body through the rule its .md mirror uses`
			);
			assert.doesNotMatch(
				source,
				/const content = pageData\?\.content \|\|/,
				`/${slug} hand-writes a fallback; a blank-line-only body is truthy, so this ` +
					`renders an empty page while /${slug}.md serves the built-in default`
			);
		});
	}
});
