import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { PageContainer } from '@/components/ui/container';
import { Breadcrumb, type BreadcrumbItem } from '@/components/ui/breadcrumb';
import { BreadcrumbJsonLd } from '@/components/seo/breadcrumb-json-ld';
import { MDX } from '@/components/mdx';
import { PostImage, hasRenderablePostImage } from '@/components/blog/post-image';
import { getCachedAdjacentPosts, getCachedAllPostSummaries, getCachedPost } from '@/lib/content';
import { getSiteName } from '@/lib/seo/site-identity';
import { getLocalizedUrl } from '@/lib/seo/hreflang';
import { getBaseUrl } from '@/lib/utils/url-cleaner';
import {
	BLOG_BASE_PATH,
	buildCategoryHref,
	buildPostHref,
	buildTagHref,
	formatPostDate,
	toDateTimeAttribute
} from '@/lib/blog/urls';
import { DEFAULT_LOCALE, type Locale } from '@/lib/constants';

// ISR, matching the other content-driven detail routes. `dynamicParams` lets a
// post added to the data repository after the build render on demand.
export const revalidate = 600;
export const dynamicParams = true;

interface PostPageProps {
	params: Promise<{ slug: string; locale: string }>;
}

/**
 * Pre-render the posts that exist at build time.
 *
 * Uses the unpaginated loader: this is the static-generation manifest, not a
 * rendered page, so it must not be truncated by the listing's page size.
 */
export async function generateStaticParams() {
	try {
		const posts = await getCachedAllPostSummaries();
		return posts.map((post) => ({ slug: post.slug }));
	} catch {
		// A missing / unclonable data repository must not fail the build —
		// `dynamicParams` renders posts on demand instead.
		return [];
	}
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
	const { slug, locale } = await params;
	const post = await getCachedPost(slug, locale);

	if (!post) {
		return {};
	}

	const canonical = getLocalizedUrl(buildPostHref(post.slug), locale as Locale);
	const siteName = await getSiteName();
	const imageUrl = post.image ? new URL(post.image, getBaseUrl()).toString() : undefined;

	return {
		title: post.title,
		description: post.description,
		keywords: [...post.categories, ...post.tags].map((term) => term.name).join(', ') || undefined,
		authors: post.author ? [{ name: post.author.name, url: post.author.url }] : undefined,
		openGraph: {
			type: 'article',
			title: post.title,
			description: post.description,
			url: canonical,
			siteName,
			locale,
			publishedTime: post.date || undefined,
			authors: post.author ? [post.author.name] : undefined,
			tags: post.tags.map((tag) => tag.name),
			...(imageUrl && { images: [{ url: imageUrl, alt: post.title }] })
		},
		twitter: {
			card: 'summary_large_image',
			title: post.title,
			description: post.description,
			...(imageUrl && { images: [imageUrl] })
		},
		alternates: {
			canonical
		}
	};
}

export default async function BlogPostPage({ params }: PostPageProps) {
	const { slug, locale } = await params;
	const post = await getCachedPost(slug, locale);

	if (!post) {
		notFound();
	}

	const [t, tCommon, adjacent] = await Promise.all([
		getTranslations({ locale, namespace: 'blog' }),
		getTranslations({ locale, namespace: 'common' }),
		getCachedAdjacentPosts(slug, locale)
	]);

	const formattedDate = formatPostDate(post.date, locale);
	const dateTime = toDateTimeAttribute(post.date);
	const localePrefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;

	const breadcrumbItems: BreadcrumbItem[] = [{ label: t('BADGE_TEXT'), href: BLOG_BASE_PATH }, { label: post.title }];

	const articleSchema = {
		'@context': 'https://schema.org',
		'@type': 'BlogPosting',
		headline: post.title,
		description: post.description || undefined,
		datePublished: post.date || undefined,
		author: post.author ? { '@type': 'Person', name: post.author.name, url: post.author.url } : undefined,
		image: post.image ? new URL(post.image, getBaseUrl()).toString() : undefined,
		keywords: [...post.categories, ...post.tags].map((term) => term.name).join(', ') || undefined,
		mainEntityOfPage: getLocalizedUrl(buildPostHref(post.slug), locale as Locale)
	};

	return (
		<PageContainer className="py-8 sm:py-12 md:py-16">
			<BreadcrumbJsonLd
				items={[
					{ name: tCommon('HOME'), url: `${localePrefix || '/'}` },
					{ name: t('BADGE_TEXT'), url: `${localePrefix}${BLOG_BASE_PATH}` },
					{ name: post.title }
				]}
			/>
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(articleSchema).replace(/</g, '\\u003c')
				}}
			/>

			<Breadcrumb items={breadcrumbItems} homeLabel={tCommon('HOME')} />

			<article className="mx-auto max-w-3xl" data-testid="blog-post">
				<header className="mb-8">
					{post.categories.length > 0 ? (
						<div className="mb-4 flex flex-wrap gap-2">
							{post.categories.map((category) => (
								<Link
									key={category.id}
									href={buildCategoryHref(category.id)}
									className="rounded-full border border-theme-primary/30 bg-theme-primary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-theme-primary transition-colors hover:bg-theme-primary/20"
								>
									{category.name}
								</Link>
							))}
						</div>
					) : null}

					<h1 className="mb-4 text-2xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white md:text-4xl">
						{post.title}
					</h1>

					{post.description ? (
						<p className="mb-5 text-base leading-relaxed text-gray-600 dark:text-gray-400">
							{post.description}
						</p>
					) : null}

					<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
						{post.author ? (
							<span
								data-testid="blog-post-author"
								className="font-medium text-gray-700 dark:text-gray-300"
							>
								{t('BY_AUTHOR', { author: post.author.name })}
							</span>
						) : null}
						{formattedDate ? (
							<time dateTime={dateTime} data-testid="blog-post-date">
								{formattedDate}
							</time>
						) : null}
						<span data-testid="blog-post-reading-time">
							{t('READING_TIME', { minutes: post.readingTimeMinutes })}
						</span>
					</div>
				</header>

				{hasRenderablePostImage(post.image) ? (
					<figure className="relative mb-10 aspect-16/9 w-full overflow-hidden rounded-lg bg-gray-100 dark:bg-white/5">
						<PostImage src={post.image} alt={post.title} sizes="(max-width: 768px) 100vw, 768px" priority />
					</figure>
				) : null}

				<div className="prose prose-lg max-w-none leading-relaxed dark:prose-invert">
					{post.content.trim() ? (
						<MDX source={post.content} />
					) : (
						<p className="text-gray-500 dark:text-gray-400">{tCommon('NO_CONTENT_PROVIDED')}</p>
					)}
				</div>

				{post.tags.length > 0 ? (
					<div className="mt-10 flex flex-wrap items-center gap-2 border-t border-gray-200 pt-6 dark:border-white/10">
						<span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
							{t('TAGS')}
						</span>
						{post.tags.map((tag) => (
							<Link
								key={tag.id}
								href={buildTagHref(tag.id)}
								className="rounded-full border border-gray-200 px-2.5 py-0.5 text-xs text-gray-600 transition-colors hover:border-theme-primary hover:text-theme-primary dark:border-white/10 dark:text-gray-300 dark:hover:border-white/40 dark:hover:text-white"
							>
								{tag.name}
							</Link>
						))}
					</div>
				) : null}

				<nav
					aria-label={t('POST_NAVIGATION')}
					className="mt-10 grid gap-4 border-t border-gray-200 pt-6 sm:grid-cols-2 dark:border-white/10"
				>
					{adjacent.previous ? (
						<Link
							href={buildPostHref(adjacent.previous.slug)}
							data-testid="blog-post-previous"
							className="group rounded-md border border-gray-200 p-4 transition-colors hover:border-theme-primary dark:border-white/10 dark:hover:border-white/40"
						>
							<span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
								&larr; {t('PREVIOUS_POST')}
							</span>
							<span className="mt-1 block text-sm font-medium text-gray-900 group-hover:text-theme-primary dark:text-gray-100">
								{adjacent.previous.title}
							</span>
						</Link>
					) : (
						<span />
					)}

					{adjacent.next ? (
						<Link
							href={buildPostHref(adjacent.next.slug)}
							data-testid="blog-post-next"
							className="group rounded-md border border-gray-200 p-4 text-end transition-colors hover:border-theme-primary dark:border-white/10 dark:hover:border-white/40"
						>
							<span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
								{t('NEXT_POST')} &rarr;
							</span>
							<span className="mt-1 block text-sm font-medium text-gray-900 group-hover:text-theme-primary dark:text-gray-100">
								{adjacent.next.title}
							</span>
						</Link>
					) : (
						<span />
					)}
				</nav>

				<div className="mt-8">
					<Link
						href={BLOG_BASE_PATH}
						data-testid="blog-back-to-listing"
						className="text-sm font-medium text-theme-primary underline-offset-2 hover:underline"
					>
						&larr; {t('BACK_TO_BLOG')}
					</Link>
				</div>
			</article>
		</PageContainer>
	);
}
