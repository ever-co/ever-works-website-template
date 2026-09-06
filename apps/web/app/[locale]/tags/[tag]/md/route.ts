/**
 * Internal handler for the `/tags/<tag>.md` Markdown mirror.
 * Public URL: `/<locale>/tags/<tag>.md`.
 */

import { NextResponse } from 'next/server';
import { getCachedItems } from '@/lib/content';
import { getBaseUrl } from '@/lib/utils/url-cleaner';
import { getTagsEnabled } from '@/lib/utils/settings';
import { renderTagMarkdown, MARKDOWN_RESPONSE_HEADERS } from '@/lib/seo/markdown-mirror';

export const revalidate = 600;

export async function GET(
	_req: Request,
	{ params }: { params: Promise<{ tag: string; locale: string }> }
): Promise<Response> {
	// A site can switch the whole tag surface off (`settings.tags_enabled` in
	// `.works/works.yml`), and the HTML listing `notFound()`s when it is off.
	// The mirror has to give the same answer, or a withdrawn surface stays
	// readable at `.md`.
	if (!getTagsEnabled()) {
		return NextResponse.json({ error: 'Not found' }, { status: 404 });
	}

	const { tag, locale } = await params;
	const decoded = decodeURIComponent(tag);
	const { items, tags } = await getCachedItems({ lang: locale });

	const matchedTag = tags.find(
		(t) => t.id === decoded || t.name.toLowerCase() === decoded.toLowerCase()
	);
	// Unknown tag slug → 404, the same answer the HTML page gives. Rendering
	// an empty listing here would make the mirror a soft-404 that disagrees
	// with the page it mirrors.
	if (!matchedTag) {
		return NextResponse.json({ error: 'Not found' }, { status: 404 });
	}

	const matchingItems = items.filter((item) =>
		item.tags?.some((t: string | { id: string }) => {
			const value = typeof t === 'string' ? t : t?.id;
			return value?.toLowerCase() === decoded.toLowerCase();
		})
	);

	const md = renderTagMarkdown(matchedTag, matchingItems, {
		baseUrl: getBaseUrl(),
		locale,
		tagRef: tag
	});

	return new Response(md, { status: 200, headers: { ...MARKDOWN_RESPONSE_HEADERS } });
}
