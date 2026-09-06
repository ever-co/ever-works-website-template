import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import Hero from '@/components/hero';
import { Container } from '@/components/ui/container';
import DecorativeBg, { DotBgsible } from '@/components/shared/decorative-bg';
import { BreadcrumbJsonLd } from '@/components/seo/breadcrumb-json-ld';
import { BlogListing } from '@/components/blog/blog-listing';
import { getCachedPostTaxonomies } from '@/lib/content';
import { generateListingMetadata } from '@/lib/seo/listing-metadata';
import { BLOG_BASE_PATH, buildCategoryHref, firstSearchParam, listingRobots, parsePageParam } from '@/lib/blog/urls';
import { DEFAULT_LOCALE } from '@/lib/constants';

export const revalidate = 600;
export const dynamicParams = true;

type SearchParams = Record<string, string | string[] | undefined>;

interface CategoryPageProps {
	params: Promise<{ slug: string; locale: string }>;
	searchParams: Promise<SearchParams>;
}

export async function generateStaticParams() {
	try {
		const { categories } = await getCachedPostTaxonomies();
		return categories.map((category) => ({ slug: category.id }));
	} catch {
		return [];
	}
}

export async function generateMetadata({ params, searchParams }: CategoryPageProps): Promise<Metadata> {
	const [{ slug, locale }, resolvedSearchParams] = await Promise.all([params, searchParams]);
	const [{ categories }, t] = await Promise.all([
		getCachedPostTaxonomies(locale),
		getTranslations({ locale, namespace: 'blog' })
	]);

	const category = categories.find((entry) => entry.id === slug);
	if (!category) return {};

	const metadata = await generateListingMetadata({
		title: t('CATEGORY_TITLE', { name: category.name }),
		description: t('CATEGORY_DESCRIPTION', { name: category.name }),
		path: buildCategoryHref(category.id),
		locale,
		itemCount: category.count,
		keywords: ['blog', 'category', category.name]
	});

	// Same thin-page policy as /blog: a searched or deeply paginated
	// archive is a near-duplicate of the archive's first page.
	const robots = listingRobots(
		firstSearchParam(resolvedSearchParams.q)?.trim() ?? '',
		parsePageParam(resolvedSearchParams.page)
	);
	return robots ? { ...metadata, robots } : metadata;
}

/**
 * Per-category archive (EW-28).
 *
 * Reuses `BlogListing` with the category pinned by the route rather than by a
 * query param, so `/blog/category/tutorials` is a stable, indexable URL. The
 * chip rows are hidden here — the taxonomy is already decided by the route —
 * but search and pagination still work within the category.
 */
export default async function BlogCategoryPage({ params, searchParams }: CategoryPageProps) {
	const [{ slug, locale }, resolvedSearchParams] = await Promise.all([params, searchParams]);

	const [{ categories }, t, tCommon] = await Promise.all([
		getCachedPostTaxonomies(locale),
		getTranslations({ locale, namespace: 'blog' }),
		getTranslations({ locale, namespace: 'common' })
	]);

	const category = categories.find((entry) => entry.id === slug);
	if (!category) {
		notFound();
	}

	const page = parsePageParam(resolvedSearchParams.page);
	const query = firstSearchParam(resolvedSearchParams.q)?.trim() ?? '';
	const localePrefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;

	return (
		<div className="relative">
			<BreadcrumbJsonLd
				items={[
					{ name: tCommon('HOME'), url: `${localePrefix || '/'}` },
					{ name: t('BADGE_TEXT'), url: `${localePrefix}${BLOG_BASE_PATH}` },
					{ name: category.name }
				]}
			/>
			<Hero
				badgeText={t('CATEGORIES')}
				title={
					<span className="bg-linear-to-r from-theme-primary-500 via-purple-500 to-theme-primary-600 bg-clip-text text-transparent">
						{t('CATEGORY_TITLE', { name: category.name })}
					</span>
				}
				description={t('CATEGORY_DESCRIPTION', { name: category.name })}
				className="relative flex min-h-screen flex-col pb-24 text-center"
			>
				<Container maxWidth="7xl" padding="default" useGlobalWidth className="pb-20">
					<DecorativeBg reverse className="-mt-10" />
					<div className="mt-10">
						<BlogListing
							locale={locale}
							basePath={buildCategoryHref(category.id)}
							page={page}
							query={query}
							category={category.id}
							hideFilters
						/>
					</div>
				</Container>
			</Hero>
			<DotBgsible />
		</div>
	);
}
