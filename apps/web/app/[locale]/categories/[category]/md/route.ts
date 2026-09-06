/**
 * Internal handler for the `/categories/<category>.md` Markdown mirror.
 * Public URL: `/<locale>/categories/<category>.md`.
 */

import { NextResponse } from 'next/server';
import { getCachedItems } from '@/lib/content';
import { getBaseUrl } from '@/lib/utils/url-cleaner';
import { getCategoriesEnabled } from '@/lib/utils/settings';
import { slugify } from '@/lib/utils';
import { renderCategoryMarkdown, MARKDOWN_RESPONSE_HEADERS } from '@/lib/seo/markdown-mirror';

export const revalidate = 600;

export async function GET(
	_req: Request,
	{ params }: { params: Promise<{ category: string; locale: string }> }
): Promise<Response> {
	// A site can switch the whole category surface off
	// (`settings.categories_enabled` in `.works/works.yml`), and the HTML
	// listing `notFound()`s when it is off. The mirror has to give the same
	// answer, or a withdrawn surface stays readable at `.md`.
	if (!getCategoriesEnabled()) {
		return NextResponse.json({ error: 'Not found' }, { status: 404 });
	}

	const { category, locale } = await params;
	const decoded = decodeURIComponent(category);
	const { categories, items } = await getCachedItems({ lang: locale });

	const slug = slugify(decoded);
	const matched = categories.find(
		(c) => c.id === decoded || c.id === slug || c.name.toLowerCase() === decoded.toLowerCase()
	);
	// Unknown category slug → 404, the same answer the HTML page gives.
	// Rendering an empty listing here would make the mirror a soft-404 that
	// disagrees with the page it mirrors.
	if (!matched) {
		return NextResponse.json({ error: 'Not found' }, { status: 404 });
	}
	const resolvedId = matched.id;
	const matchingItems = items.filter((item) => {
		const cat = item.category;
		if (!cat) return false;
		if (Array.isArray(cat)) {
			return cat.some((c) => (typeof c === 'string' ? c === resolvedId : c?.id === resolvedId));
		}
		return typeof cat === 'string' ? cat === resolvedId : cat.id === resolvedId;
	});

	const md = renderCategoryMarkdown(matched, matchingItems, {
		baseUrl: getBaseUrl(),
		locale,
		categoryRef: category
	});

	return new Response(md, { status: 200, headers: { ...MARKDOWN_RESPONSE_HEADERS } });
}
