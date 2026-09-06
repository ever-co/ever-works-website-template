/**
 * Internal handler for the static-page `.md` mirrors:
 *   /<locale>/about.md, /help.md, /pricing.md,
 *   /privacy-policy.md, /terms-of-service.md, /cookies.md, /faq.md
 *
 * The rewrite in next.config.ts dispatches each of those public URLs
 * to `/<locale>/_static-md/<slug>` for unified rendering.
 */

import { NextResponse } from 'next/server';
import { getCachedPageContent } from '@/lib/content';
import { getBaseUrl } from '@/lib/utils/url-cleaner';
import { renderStaticPageMarkdown, MARKDOWN_RESPONSE_HEADERS } from '@/lib/seo/markdown-mirror';
import { DEFAULT_FAQ_CONTENT } from '@/lib/default-page-content';

const ALLOWED_STATIC_SLUGS = new Set([
	'about',
	'help',
	'pricing',
	'privacy-policy',
	'terms-of-service',
	'cookies',
	'faq'
] as const);
type AllowedSlug = typeof ALLOWED_STATIC_SLUGS extends Set<infer T> ? T : never;

const TITLES: Record<AllowedSlug, string> = {
	about: 'About',
	help: 'Help',
	pricing: 'Pricing',
	'privacy-policy': 'Privacy Policy',
	'terms-of-service': 'Terms of Service',
	cookies: 'Cookies',
	faq: 'FAQ'
};

const DEFAULT_BODIES: Record<AllowedSlug, string> = {
	about:
		"No content yet. Add an `about.en.md` file to your content repository's `pages/` directory to customize this page.",
	help: 'See the in-app guides for help topics.',
	pricing: 'Pricing details are configured via the site admin and rendered on the canonical HTML page.',
	'privacy-policy':
		"No content yet. Add a `privacy-policy.en.md` file to your content repository's `pages/` directory to customize this page.",
	'terms-of-service':
		"No content yet. Add a `terms-of-service.en.md` file to your content repository's `pages/` directory to customize this page.",
	cookies:
		"No content yet. Add a `cookies.en.md` file to your content repository's `pages/` directory to customize this page.",
	// Unlike the other slugs the FAQ default is real content, not a
	// placeholder: the mirror must say the same thing as the HTML page at
	// /faq, which renders this same constant when the data repository ships
	// no `faq.<locale>.md`.
	faq: DEFAULT_FAQ_CONTENT
};

export const revalidate = 3600;

export async function GET(
	_req: Request,
	{ params }: { params: Promise<{ slug: string; locale: string }> }
): Promise<Response> {
	const { slug, locale } = await params;

	if (!ALLOWED_STATIC_SLUGS.has(slug as AllowedSlug)) {
		return NextResponse.json({ error: 'Not found' }, { status: 404 });
	}
	const allowedSlug = slug as AllowedSlug;

	const pageData = await getCachedPageContent(allowedSlug, locale);
	const md = renderStaticPageMarkdown(pageData, {
		title: TITLES[allowedSlug],
		path: `/${allowedSlug}`,
		baseUrl: getBaseUrl(),
		locale,
		defaultContent: DEFAULT_BODIES[allowedSlug]
	});

	return new Response(md, { status: 200, headers: { ...MARKDOWN_RESPONSE_HEADERS } });
}
