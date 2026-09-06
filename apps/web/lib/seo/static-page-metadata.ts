import type { Metadata } from 'next';
import { getCachedPageContent } from '@/lib/content';
import { getBaseUrl } from '@/lib/utils/url-cleaner';
import { getSiteName } from '@/lib/seo/site-identity';
import { generateHreflangAlternates, getLocalizedUrl } from '@/lib/seo/hreflang';
import { frontmatterString } from '@/lib/seo/frontmatter';
import type { Locale } from '@/lib/constants';

/**
 * SEO metadata for the dedicated static info pages (`/terms-of-service`,
 * `/privacy-policy`, …) whose body already comes from the data repository's
 * `pages/<slug>.<locale>.md` Markdown file.
 *
 * Those routes rendered the frontmatter `title` in their `<h1>` but built the
 * document `<title>` / `<meta name="description">` from the i18n bundle, so a
 * directory that customised its legal copy still shipped the template's
 * generic SERP snippet. `app/[locale]/pages/[slug]/page.tsx` and the `.md`
 * mirrors (`lib/seo/markdown-mirror.ts`) already prefer the frontmatter; this
 * helper gives the dedicated routes the same resolution so the three surfaces
 * cannot drift again.
 *
 * Resolution per field: **frontmatter → i18n fallback**. A Work with no
 * `pages/` content in its data repository (or a CI build with no data
 * repository at all) keeps exactly the metadata it had before.
 *
 * Server-only: `getCachedPageContent` reads the content directory and
 * `getSiteName` reads `.works/works.yml`. Import from `generateMetadata` /
 * server components only.
 */
export interface StaticPageMetadataOptions {
	/** Page slug in the data repository's `pages/` directory, e.g. `terms-of-service`. */
	slug: string;
	/** Public route path without the locale prefix, e.g. `/terms-of-service`. */
	path: string;
	/** Active locale from the route params. */
	locale: string;
	/** Title used when the Markdown file has no `title` frontmatter. */
	fallbackTitle: string;
	/** Description used when the Markdown file has no `description` frontmatter. */
	fallbackDescription: string;
}

/**
 * Builds the `Metadata` object for a dedicated static info page, preferring the
 * Markdown frontmatter over the i18n fallbacks.
 *
 * Every field the routes already emitted is preserved: `metadataBase`,
 * `alternates.canonical`, `alternates.languages` (hreflang) and the
 * `text/markdown` mirror link. Open Graph and Twitter card fields are added to
 * match `pages/[slug]`.
 */
export async function buildStaticPageMetadata({
	slug,
	path,
	locale,
	fallbackTitle,
	fallbackDescription
}: StaticPageMetadataOptions): Promise<Metadata> {
	const appUrl = getBaseUrl();

	// Metadata generation must never fail the route. `getCachedPageContent`
	// already returns null for a missing file, but a cold container can still
	// throw on the content clone; degrade to the i18n fallbacks in that case.
	let pageData: Awaited<ReturnType<typeof getCachedPageContent>> = null;
	try {
		pageData = await getCachedPageContent(slug, locale);
	} catch (error) {
		console.error(`[SEO] Failed to read page content for "${slug}" (locale: ${locale}):`, error);
	}

	const title = frontmatterString(pageData?.metadata, 'title') ?? fallbackTitle;
	const description = frontmatterString(pageData?.metadata, 'description') ?? fallbackDescription;

	// Suffix with the resolved site name (Spec 042) so a short frontmatter
	// title such as "Cookies" still clears the 10-char SERP floor asserted by
	// `each-page-document-title-length.spec.ts`. Titles that already name the
	// site are left alone rather than repeating it.
	const siteName = await getSiteName();
	const documentTitle = title.toLowerCase().includes(siteName.toLowerCase()) ? title : `${title} | ${siteName}`;

	// `getLocalizedUrl` already returns an absolute URL, so it is NOT prefixed
	// with `appUrl` again here.
	const canonicalUrl = getLocalizedUrl(path, locale as Locale);

	return {
		metadataBase: new URL(appUrl),
		title: documentTitle,
		description,
		openGraph: {
			title: documentTitle,
			description,
			url: canonicalUrl,
			siteName,
			locale,
			type: 'website'
		},
		twitter: {
			card: 'summary_large_image',
			title: documentTitle,
			description
		},
		alternates: {
			canonical: canonicalUrl,
			languages: generateHreflangAlternates(path),
			types: { 'text/markdown': `${canonicalUrl}.md` }
		}
	};
}
