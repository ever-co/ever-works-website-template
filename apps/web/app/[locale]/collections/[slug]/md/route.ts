/**
 * Internal handler for the `/collections/<slug>.md` Markdown mirror.
 * Public URL: `/<locale>/collections/<slug>.md`.
 */

import { NextResponse } from 'next/server';
import { getCachedItems } from '@/lib/content';
import { getBaseUrl } from '@/lib/utils/url-cleaner';
import { renderCollectionMarkdown, MARKDOWN_RESPONSE_HEADERS } from '@/lib/seo/markdown-mirror';

export const revalidate = 600;

export async function GET(
	_req: Request,
	{ params }: { params: Promise<{ slug: string; locale: string }> }
): Promise<Response> {
	const { slug, locale } = await params;
	const { items, collections } = await getCachedItems({ lang: locale });

	const collection = collections.find((c) => c.slug === slug || c.id === slug);
	if (!collection || collection.isActive === false) {
		return NextResponse.json({ error: 'Not found' }, { status: 404 });
	}

	const collectionItems = collection.items
		? items.filter((item) => collection.items!.includes(item.slug))
		: [];

	const md = renderCollectionMarkdown(collection, collectionItems, {
		baseUrl: getBaseUrl(),
		locale
	});

	return new Response(md, { status: 200, headers: { ...MARKDOWN_RESPONSE_HEADERS } });
}
