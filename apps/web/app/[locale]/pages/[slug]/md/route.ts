/**
 * Internal handler for the `/pages/<slug>.md` Markdown mirror.
 * Public URL: `/<locale>/pages/<slug>.md`.
 *
 * Renders the same MDX content that the HTML page renders, but
 * stripped of UI chrome.
 */

import { NextResponse } from 'next/server';
import { getCachedPageContent } from '@/lib/content';
import { getBaseUrl } from '@/lib/utils/url-cleaner';
import { formatDisplayName } from '@/components/filters/utils/text-utils';
import { renderStaticPageMarkdown, MARKDOWN_RESPONSE_HEADERS } from '@/lib/seo/markdown-mirror';

export const revalidate = 600;

export async function GET(
	_req: Request,
	{ params }: { params: Promise<{ slug: string; locale: string }> }
): Promise<Response> {
	const { slug, locale } = await params;
	const pageData = await getCachedPageContent(slug, locale);

	if (!pageData) {
		return NextResponse.json({ error: 'Not found' }, { status: 404 });
	}

	const title = (pageData.metadata?.title as string) || formatDisplayName(slug);
	const md = renderStaticPageMarkdown(pageData, {
		title,
		path: `/pages/${slug}`,
		baseUrl: getBaseUrl(),
		locale
	});

	return new Response(md, { status: 200, headers: { ...MARKDOWN_RESPONSE_HEADERS } });
}
