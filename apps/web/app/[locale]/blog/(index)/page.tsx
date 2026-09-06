import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Hero from '@/components/hero';
import { Container } from '@/components/ui/container';
import DecorativeBg, { DotBgsible } from '@/components/shared/decorative-bg';
import { BreadcrumbJsonLd } from '@/components/seo/breadcrumb-json-ld';
import { BlogListing } from '@/components/blog/blog-listing';
import { getCachedPosts } from '@/lib/content';
import { generateListingMetadata } from '@/lib/seo/listing-metadata';
import { BLOG_BASE_PATH, buildBlogListingHref, firstSearchParam, listingRobots, parsePageParam } from '@/lib/blog/urls';
import { DEFAULT_LOCALE } from '@/lib/constants';

// ISR: the blog listing is content-driven and changes only when the data
// repository syncs, so mirror the 10-minute revalidation the other public
// listings use.
export const revalidate = 600;
export const dynamicParams = true;

type SearchParams = Record<string, string | string[] | undefined>;

interface BlogPageProps {
	params: Promise<{ locale: string }>;
	searchParams: Promise<SearchParams>;
}

export async function generateMetadata({ params, searchParams }: BlogPageProps): Promise<Metadata> {
	const [{ locale }, resolvedSearchParams] = await Promise.all([params, searchParams]);
	const query = firstSearchParam(resolvedSearchParams.q)?.trim() ?? '';
	const page = parsePageParam(resolvedSearchParams.page);

	const [t, result] = await Promise.all([
		getTranslations({ locale, namespace: 'blog' }),
		getCachedPosts({ lang: locale, page, q: query })
	]);

	const metadata = await generateListingMetadata({
		title: t('BADGE_TEXT'),
		description: t('DESCRIPTION'),
		path: BLOG_BASE_PATH,
		locale,
		itemCount: result.totalUnfiltered,
		keywords: ['blog', 'articles', 'news', 'guides', 'updates']
	});

	// Search-result and deep pagination pages are thin duplicates of the
	// canonical listing — keep them out of the index while still letting
	// crawlers follow the post links.
	const robots = listingRobots(query, page);
	return robots ? { ...metadata, robots } : metadata;
}

export default async function BlogPage({ params, searchParams }: BlogPageProps) {
	const [{ locale }, resolvedSearchParams] = await Promise.all([params, searchParams]);

	const page = parsePageParam(resolvedSearchParams.page);
	const query = firstSearchParam(resolvedSearchParams.q)?.trim() ?? '';
	const category = firstSearchParam(resolvedSearchParams.category)?.trim() || undefined;
	const tag = firstSearchParam(resolvedSearchParams.tag)?.trim() || undefined;

	const [t, tCommon] = await Promise.all([
		getTranslations({ locale, namespace: 'blog' }),
		getTranslations({ locale, namespace: 'common' })
	]);

	const localePrefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;

	return (
		<div className="relative">
			<BreadcrumbJsonLd
				items={[{ name: tCommon('HOME'), url: `${localePrefix || '/'}` }, { name: t('BADGE_TEXT') }]}
			/>
			<Hero
				badgeText={t('BADGE_TEXT')}
				title={
					<span className="bg-linear-to-r from-theme-primary-500 via-purple-500 to-theme-primary-600 bg-clip-text text-transparent">
						{t('TITLE')}
					</span>
				}
				description={t('DESCRIPTION')}
				className="relative flex min-h-screen flex-col pb-24 text-center"
			>
				<Container maxWidth="7xl" padding="default" useGlobalWidth className="pb-20">
					<DecorativeBg reverse className="-mt-10" />
					<div className="mt-10">
						<BlogListing
							locale={locale}
							basePath={buildBlogListingHref(BLOG_BASE_PATH)}
							page={page}
							query={query}
							category={category}
							tag={tag}
						/>
					</div>
				</Container>
			</Hero>
			<DotBgsible />
		</div>
	);
}
