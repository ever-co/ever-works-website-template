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
import { BLOG_BASE_PATH, buildTagHref, firstSearchParam, listingRobots, parsePageParam } from '@/lib/blog/urls';
import { DEFAULT_LOCALE } from '@/lib/constants';

export const revalidate = 600;
export const dynamicParams = true;

type SearchParams = Record<string, string | string[] | undefined>;

interface TagPageProps {
	params: Promise<{ slug: string; locale: string }>;
	searchParams: Promise<SearchParams>;
}

export async function generateStaticParams() {
	try {
		const { tags } = await getCachedPostTaxonomies();
		return tags.map((tag) => ({ slug: tag.id }));
	} catch {
		return [];
	}
}

export async function generateMetadata({ params, searchParams }: TagPageProps): Promise<Metadata> {
	const [{ slug, locale }, resolvedSearchParams] = await Promise.all([params, searchParams]);
	const [{ tags }, t] = await Promise.all([
		getCachedPostTaxonomies(locale),
		getTranslations({ locale, namespace: 'blog' })
	]);

	const tag = tags.find((entry) => entry.id === slug);
	if (!tag) return {};

	const metadata = await generateListingMetadata({
		title: t('TAG_TITLE', { name: tag.name }),
		description: t('TAG_DESCRIPTION', { name: tag.name }),
		path: buildTagHref(tag.id),
		locale,
		itemCount: tag.count,
		keywords: ['blog', 'tag', tag.name]
	});

	// Same thin-page policy as /blog: a searched or deeply paginated
	// archive is a near-duplicate of the archive's first page.
	const robots = listingRobots(
		firstSearchParam(resolvedSearchParams.q)?.trim() ?? '',
		parsePageParam(resolvedSearchParams.page)
	);
	return robots ? { ...metadata, robots } : metadata;
}

/** Per-tag archive (EW-28). Mirrors the category archive. */
export default async function BlogTagPage({ params, searchParams }: TagPageProps) {
	const [{ slug, locale }, resolvedSearchParams] = await Promise.all([params, searchParams]);

	const [{ tags }, t, tCommon] = await Promise.all([
		getCachedPostTaxonomies(locale),
		getTranslations({ locale, namespace: 'blog' }),
		getTranslations({ locale, namespace: 'common' })
	]);

	const tag = tags.find((entry) => entry.id === slug);
	if (!tag) {
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
					{ name: tag.name }
				]}
			/>
			<Hero
				badgeText={t('TAGS')}
				title={
					<span className="bg-linear-to-r from-theme-primary-500 via-purple-500 to-theme-primary-600 bg-clip-text text-transparent">
						{t('TAG_TITLE', { name: tag.name })}
					</span>
				}
				description={t('TAG_DESCRIPTION', { name: tag.name })}
				className="relative flex min-h-screen flex-col pb-24 text-center"
			>
				<Container maxWidth="7xl" padding="default" useGlobalWidth className="pb-20">
					<DecorativeBg reverse className="-mt-10" />
					<div className="mt-10">
						<BlogListing
							locale={locale}
							basePath={buildTagHref(tag.id)}
							page={page}
							query={query}
							tag={tag.id}
							hideFilters
						/>
					</div>
				</Container>
			</Hero>
			<DotBgsible />
		</div>
	);
}
