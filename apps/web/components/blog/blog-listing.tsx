import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getCachedPostTaxonomies, getCachedPosts } from '@/lib/content';
import { buildBlogListingHref, type BlogListingQuery } from '@/lib/blog/urls';
import { BlogFilters } from './blog-filters';
import { BlogPagination } from './blog-pagination';
import { BlogSearch } from './blog-search';
import { PostCard } from './post-card';

interface BlogListingProps {
	locale: string;
	/** Path the search box, chips and pagination link back to. */
	basePath: string;
	page: number;
	query: string;
	/** Category id, from `?category=` or a `/blog/category/[slug]` route. */
	category?: string;
	/** Tag id, from `?tag=` or a `/blog/tag/[slug]` route. */
	tag?: string;
	/**
	 * Hide the category / tag chip rows. Set on the dedicated archive pages,
	 * where the taxonomy is already fixed by the route.
	 */
	hideFilters?: boolean;
}

/**
 * The blog listing body, shared by `/blog` and the category / tag archives
 * (EW-26, EW-28, EW-29).
 *
 * A server component: posts, taxonomies and the active filters are resolved on
 * the server so the rendered HTML is complete for crawlers and the search
 * highlighting matches exactly what the loader filtered on. The only client
 * island is the search input.
 */
export async function BlogListing({
	locale,
	basePath,
	page,
	query,
	category,
	tag,
	hideFilters = false
}: BlogListingProps) {
	const [t, result, taxonomies] = await Promise.all([
		getTranslations({ locale, namespace: 'blog' }),
		getCachedPosts({ lang: locale, page, q: query, category, tag }),
		getCachedPostTaxonomies(locale)
	]);

	const activeQuery: BlogListingQuery = { q: query, category, tag };
	const hasFilters = Boolean(query || category || tag);

	return (
		<div className="flex flex-col gap-8">
			<div className="flex flex-col items-center gap-5">
				<BlogSearch
					basePath={basePath}
					initialQuery={query}
					labels={{
						placeholder: t('SEARCH_PLACEHOLDER'),
						label: t('SEARCH_LABEL'),
						clear: t('CLEAR_SEARCH')
					}}
				/>

				{hideFilters ? null : (
					<BlogFilters
						basePath={basePath}
						categories={taxonomies.categories}
						tags={taxonomies.tags}
						activeCategory={category}
						activeTag={tag}
						query={activeQuery}
						labels={{
							categories: t('CATEGORIES'),
							tags: t('TAGS'),
							all: t('ALL')
						}}
					/>
				)}

				{hasFilters ? (
					<div
						className="flex flex-wrap items-center justify-center gap-3 text-sm text-gray-600 dark:text-gray-400"
						data-testid="blog-result-count"
					>
						<span>
							{query
								? t('RESULTS_COUNT', { count: result.total, query })
								: t('FILTERED_COUNT', { count: result.total })}
						</span>
						<Link
							href={buildBlogListingHref(basePath)}
							data-testid="blog-clear-filters"
							className="font-medium text-theme-primary underline-offset-2 hover:underline"
						>
							{t('CLEAR_SEARCH')}
						</Link>
					</div>
				) : null}
			</div>

			{result.posts.length === 0 ? (
				<div className="py-16 text-center" data-testid="blog-empty-state">
					<h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
						{hasFilters ? t('NO_RESULTS_TITLE') : t('EMPTY_TITLE')}
					</h2>
					<p className="text-gray-600 dark:text-gray-400">
						{hasFilters ? t('NO_RESULTS_DESCRIPTION') : t('EMPTY_DESCRIPTION')}
					</p>
				</div>
			) : (
				<div
					data-testid="blog-post-grid"
					className="grid grid-cols-1 gap-6 text-start sm:grid-cols-2 xl:grid-cols-3"
				>
					{result.posts.map((post) => (
						<PostCard
							key={post.slug}
							post={post}
							locale={locale}
							query={query}
							labels={{
								readMore: t('READ_MORE'),
								byAuthor: t('BY_AUTHOR', { author: post.author?.name ?? '' }),
								readingTime: t('READING_TIME', { minutes: post.readingTimeMinutes })
							}}
						/>
					))}
				</div>
			)}

			<BlogPagination
				basePath={basePath}
				page={result.page}
				totalPages={result.totalPages}
				query={activeQuery}
				labels={{
					previous: t('PREVIOUS'),
					next: t('NEXT'),
					pageOf: t('PAGE_OF', { page: result.page, totalPages: result.totalPages }),
					navLabel: t('PAGINATION_LABEL')
				}}
			/>
		</div>
	);
}
