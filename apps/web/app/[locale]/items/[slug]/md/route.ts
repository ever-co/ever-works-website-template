/**
 * Internal handler for the `/items/<slug>.md` Markdown mirror.
 *
 * Reachable directly at `/<locale>/items/<slug>/md`, but the public
 * URL is `/<locale>/items/<slug>.md` via the rewrite in next.config.ts.
 * Returns the same item content as the HTML page, formatted as
 * Markdown for consumption by AI agents.
 */

import { NextResponse } from 'next/server';
import { getCachedItem } from '@/lib/content';
import { getBaseUrl } from '@/lib/utils/url-cleaner';
import { renderItemMarkdown, MARKDOWN_RESPONSE_HEADERS } from '@/lib/seo/markdown-mirror';

export const revalidate = 600;

export async function GET(
	_req: Request,
	{ params }: { params: Promise<{ slug: string; locale: string }> }
): Promise<Response> {
	const { slug, locale } = await params;
	const item = await getCachedItem(slug, { lang: locale });
	if (!item) {
		return NextResponse.json({ error: 'Not found' }, { status: 404 });
	}

	const md = renderItemMarkdown(
		// `getCachedItem` returns `{ meta, content? }`; the helper accepts the same shape.
		item as { meta: NonNullable<typeof item>['meta']; content?: string },
		{ baseUrl: getBaseUrl(), locale }
	);

	return new Response(md, { status: 200, headers: { ...MARKDOWN_RESPONSE_HEADERS } });
}
