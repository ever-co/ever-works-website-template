import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { PageContainer } from '@/components/ui/container';
import { Breadcrumb, type BreadcrumbItem } from '@/components/ui/breadcrumb';
import { MDX } from '@/components/mdx';
import { getCachedPageContent } from '@/lib/content';
import { formatDisplayName } from '@/components/filters/utils/text-utils';
import { getSiteName } from '@/lib/seo/site-identity';
import { generatePageHreflangAlternates, getLocalizedUrl } from '@/lib/seo/hreflang';
import { frontmatterString } from '@/lib/seo/frontmatter';
import { type Locale, DEFAULT_LOCALE } from '@/lib/constants';
import { BreadcrumbJsonLd } from '@/components/seo/breadcrumb-json-ld';

interface PageProps {
	params: Promise<{ slug: string; locale: string }>;
}

// Enable ISR with 10 minutes revalidation
// dynamicParams allows on-demand generation for any slug
export const revalidate = 600;
export const dynamicParams = true;

/**
 * Extracts page title from metadata or generates it from slug.
 *
 * Delegates to `frontmatterString` so this route resolves `title` by exactly
 * the same rule as the dedicated legal routes, their `<head>` metadata and the
 * `.md` mirror: author-supplied YAML that parses to a number, a mapping or a
 * whitespace-only string falls back instead of reaching the page.
 *
 * @param metadata - Page metadata object
 * @param slug - Page slug as fallback
 * @returns Formatted page title
 */
function getPageTitle(metadata: Record<string, unknown> | undefined, slug: string): string {
	return frontmatterString(metadata, 'title') ?? formatDisplayName(slug);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { slug, locale } = await params;
	const pageData = await getCachedPageContent(slug, locale);

	if (!pageData) {
		notFound();
	}

	const title = getPageTitle(pageData.metadata, slug);
	// A bare cast let a non-string `description:` through to `Metadata`, which
	// Next then stringifies into `<meta name="description" content="[object
	// Object]">`. Same validated read as the title above.
	const description = frontmatterString(pageData.metadata, 'description') ?? '';

	return {
		title,
		description,
		openGraph: {
			title,
			description,
			url: getLocalizedUrl(`/pages/${slug}`, locale as Locale),
			siteName: await getSiteName(),
			locale,
			type: 'website'
		},
		twitter: {
			card: 'summary_large_image',
			title,
			description
		},
		alternates: {
			canonical: getLocalizedUrl(`/pages/${slug}`, locale as Locale),
			languages: generatePageHreflangAlternates(slug),
			types: {
				'text/markdown': `${getLocalizedUrl(`/pages/${slug}`, locale as Locale)}.md`
			}
		}
	};
}

export default async function DynamicPage({ params }: PageProps) {
	const { slug, locale } = await params;
	const t = await getTranslations('common');
	const pageData = await getCachedPageContent(slug, locale);

	if (!pageData) {
		return notFound();
	}

	const { content, metadata } = pageData;
	const title = getPageTitle(metadata, slug);

	const breadcrumbItems: BreadcrumbItem[] = [
		{
			label: title
		}
	];

	const localePrefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;

	return (
		<PageContainer className="py-8 sm:py-12 md:py-16">
			<BreadcrumbJsonLd
				items={[
					{ name: t('HOME'), url: `${localePrefix || '/'}` },
					{ name: title }
				]}
			/>
			<Breadcrumb items={breadcrumbItems} homeLabel={t('HOME')} />

			<article className="prose prose-lg dark:prose-invert max-w-none">
				{content ? (
					<MDX source={content} />
				) : (
					<p className="text-gray-500 dark:text-gray-400">{t('NO_CONTENT_PROVIDED')}</p>
				)}
			</article>
		</PageContainer>
	);
}
