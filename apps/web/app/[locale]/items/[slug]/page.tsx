import { getCachedItem, getCachedSimilarItems } from '@/lib/content';
import { notFound } from 'next/navigation';
import { getCategoriesName } from '@/lib/utils';
import { getTranslations } from 'next-intl/server';
import { ItemDetailWrapper } from '@/components/item-detail';
import { ServerItemContent } from '@/components/item-detail/server-item-content';
import { Container } from '@/components/ui/container';
import { ItemViewTracker } from '@/components/tracking/item-view-tracker';
import { Metadata } from 'next';
import { siteConfig } from '@/lib/config';
import { getSiteName } from '@/lib/seo/site-identity';
import { getBaseUrl } from '@/lib/utils/url-cleaner';
import { generateItemHreflangAlternates, getLocalizedUrl } from '@/lib/seo/hreflang';
import { type Locale } from '@/lib/constants';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { getCommentsByItemId } from '@/lib/db/queries';
import { extractHeadings } from '@/lib/utils/extract-headings';

// Enable ISR with 10 minutes revalidation
// Using dynamicParams allows on-demand generation without build-time MDX errors
export const revalidate = 600;
export const dynamicParams = true;

const appUrl = getBaseUrl();

/**
 * Generate metadata for item detail pages
 * Includes: title, description, Open Graph, Twitter Cards, canonical URL
 */
export async function generateMetadata({
	params
}: {
	params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
	const { slug, locale } = await params;

	// See note next to MAX_SLUG_LENGTH below — short-circuit before the
	// git-CMS lookup so a 2KB slug returns a clean noindex envelope
	// instead of crashing inside `realpath`.
	if (slug.length > 255) {
		return {
			metadataBase: new URL(appUrl),
			title: `Not Found | ${await getSiteName()}`,
			description: '',
			robots: { index: false, follow: false }
		};
	}

	try {
		const item = await getCachedItem(slug, { lang: locale });

		if (!item) {
			return {
				metadataBase: new URL(appUrl),
				title: `Item Not Found | ${await getSiteName()}`,
				description: "The item you're looking for doesn't exist.",
				robots: {
					index: false,
					follow: false
				}
			};
		}

		const { meta } = item;

		// Extract keywords from tags
		const keywords = Array.isArray(meta.tags)
			? meta.tags.map((tag) => (typeof tag === 'string' ? tag : tag.name))
			: [];

		// Truncate description to 160 characters for meta description
		const MAX_DESCRIPTION_LENGTH = 160;
		const metaDescription = meta.description
			? meta.description.length > MAX_DESCRIPTION_LENGTH
				? `${meta.description.slice(0, MAX_DESCRIPTION_LENGTH - 3)}...`
				: meta.description
			: `Discover ${meta.name} on ${await getSiteName()}`;

		// Use dynamic OG image endpoint, with fallback to icon or logo
		const ogImageUrl = new URL(`/${locale}/items/${slug}/opengraph-image`, appUrl).toString();
		const fallbackImageUrl = new URL(meta.icon_url ?? siteConfig.logo, appUrl).toString();

		return {
			metadataBase: new URL(appUrl),
			title: `${meta.name} | ${await getSiteName()}`,
			description: metaDescription,
			keywords,
			openGraph: {
				title: meta.name,
				description: meta.description || metaDescription,
				images: [
					{
						url: ogImageUrl,
						width: 1200,
						height: 630,
						alt: meta.name
					},
					{
						url: fallbackImageUrl,
						alt: `${meta.name} icon`
					}
				],
				type: 'website',
				siteName: await getSiteName(),
				url: getLocalizedUrl(`/items/${slug}`, locale as Locale)
			},
			twitter: {
				card: 'summary_large_image',
				title: meta.name,
				description: metaDescription,
				images: [ogImageUrl, fallbackImageUrl]
			},
			alternates: {
				canonical: getLocalizedUrl(`/items/${slug}`, locale as Locale),
				languages: generateItemHreflangAlternates(slug),
				types: {
					'text/markdown': `${getLocalizedUrl(`/items/${slug}`, locale as Locale)}.md`
				}
			}
		};
	} catch (error) {
		console.error(`Failed to generate metadata for item ${slug}:`, error);
		return {
			metadataBase: new URL(appUrl),
			title: `Error | ${await getSiteName()}`,
			description: 'An error occurred while loading this page.',
			robots: {
				index: false,
				follow: false
			}
		};
	}
}

// Remove generateStaticParams to prevent build-time MDX compilation
// export async function generateStaticParams() {
//   const params = LOCALES.map(async (locale) => {
//     try {
//       const { items } = await fetchItems({ lang: locale });
//       return items.map((item) => ({ slug: item.slug, locale }));
//     } catch (error) {
//       console.error(`Failed to generate static params for locale ${locale}:`, error);
//       return [];
//     }
//   });

//   return (await Promise.all(params)).flat();
// }

// Filesystems (ext4, NTFS) cap a single path segment at ~255 bytes. A
// pathological 2KB slug bubbles up as `ENAMETOOLONG` from `realpath`
// inside the git-CMS lookup and 500s. Reject anything obviously too
// long up-front — see `directory-traversal-defense.spec.ts`.
const MAX_SLUG_LENGTH = 255;

export default async function ItemDetails({ params }: { params: Promise<{ slug: string; locale: string }> }) {
	const { slug, locale } = await params;

	if (slug.length > MAX_SLUG_LENGTH) {
		return notFound();
	}

	try {
		const queryClient = getQueryClient();

		// Run item CMS fetch, i18n load, and comment prefetch all in parallel.
		// Comment prefetch populates the server-side queryClient so HydrationBoundary
		// below embeds the data in the HTML — CommentsSection renders without a
		// client-side waterfall.
		const [[item, t]] = await Promise.all([
			Promise.all([getCachedItem(slug, { lang: locale }), getTranslations('common')]),
			queryClient.prefetchQuery({
				queryKey: ['comments', slug],
				queryFn: () => getCommentsByItemId(slug).catch(() => []),
			}),
		]);

		if (!item) {
			return notFound();
		}

		const { meta, content } = item;
		const categoryName = getCategoriesName(meta.category);
		const headings = extractHeadings(content ?? '');

		// Similar items scan and score the *entire* catalogue, but only feed the
		// "Similar Products" carousel at the very bottom of the page. We do NOT
		// await it here: awaiting blocks the whole HTML response (blank first
		// paint) on work that's below the fold. Instead we pass the promise down
		// and let the carousel stream in behind its own Suspense boundary, so the
		// hero + content + sidebar paint immediately. `getCachedSimilarItems`
		// still persists the scored result in Next's Data Cache.
		const similarItemsPromise = getCachedSimilarItems(meta, 6, { lang: locale }).then((items) =>
			items.flatMap((similar) => similar.item)
		);

		const metaWithVideo = {
			...meta,
			video_url: '' // e.g. https://www.youtube.com/watch?v=eDqfg_LexCQ,
		};

		// Render the MDX content on the server
		const renderedContent = <ServerItemContent content={content} noContentMessage={t('NO_CONTENT_PROVIDED')} />;

		return (
			<HydrationBoundary state={dehydrate(queryClient)}>
				<div className='relative overflow-hidden dark:bg-[#0a0a0a] text-gray-800 dark:text-white'>
					{/* <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.05),transparent_50%)] dark:bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.1),transparent_50%)]"></div>
					<div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(168,85,247,0.05),transparent_50%)] dark:bg-[radial-gradient(circle_at_70%_80%,rgba(168,85,247,0.1),transparent_50%)]"></div> */}
					<Container maxWidth="7xl" padding="default" useGlobalWidth>
						<ItemViewTracker slug={slug} />
						<ItemDetailWrapper
							meta={metaWithVideo}
							renderedContent={renderedContent}
							categoryName={categoryName}
							similarItemsPromise={similarItemsPromise}
							headings={headings}
						/>
					</Container>
				</div>
			</HydrationBoundary>
		);
	} catch (error) {
		console.error(`Failed to load item ${slug} for locale ${locale}:`, error);
		return notFound();
	}
}
