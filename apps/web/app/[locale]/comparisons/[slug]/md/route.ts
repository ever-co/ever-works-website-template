/**
 * Internal handler for the `/comparisons/<slug>.md` Markdown mirror.
 * Public URL: `/<locale>/comparisons/<slug>.md`.
 */

import { NextResponse } from 'next/server';
import { getCachedComparisons } from '@/lib/content';
import { getBaseUrl } from '@/lib/utils/url-cleaner';
import { renderComparisonMarkdown, MARKDOWN_RESPONSE_HEADERS } from '@/lib/seo/markdown-mirror';

export const revalidate = 600;

export async function GET(
	_req: Request,
	{ params }: { params: Promise<{ slug: string; locale: string }> }
): Promise<Response> {
	const { slug, locale } = await params;
	const { comparisons } = await getCachedComparisons({ lang: locale });

	const comparison = comparisons.find((c) => c.slug === slug);
	if (!comparison) {
		return NextResponse.json({ error: 'Not found' }, { status: 404 });
	}

	const md = renderComparisonMarkdown(comparison, { baseUrl: getBaseUrl(), locale });

	return new Response(md, { status: 200, headers: { ...MARKDOWN_RESPONSE_HEADERS } });
}
