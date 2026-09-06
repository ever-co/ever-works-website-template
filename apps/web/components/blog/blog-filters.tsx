import { Link } from '@/i18n/navigation';
import type { PostTermWithCount } from '@/types/post';
import { buildBlogListingHref, type BlogListingQuery } from '@/lib/blog/urls';

interface BlogFiltersLabels {
	categories: string;
	tags: string;
	all: string;
}

interface BlogFiltersProps {
	basePath: string;
	categories: PostTermWithCount[];
	tags: PostTermWithCount[];
	/** Currently active category id, if any. */
	activeCategory?: string;
	/** Currently active tag id, if any. */
	activeTag?: string;
	/** Other active filters preserved on every chip link. */
	query: BlogListingQuery;
	labels: BlogFiltersLabels;
}

const chipBase = 'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors';
const chipInactive =
	'border-gray-200 bg-white/70 text-gray-600 hover:border-theme-primary hover:text-theme-primary dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:border-white/40 dark:hover:text-white';
const chipActive = 'border-theme-primary bg-theme-primary/10 text-theme-primary';

function TermRow({
	basePath,
	heading,
	terms,
	activeId,
	query,
	paramKey,
	allLabel,
	testId
}: {
	basePath: string;
	heading: string;
	terms: PostTermWithCount[];
	activeId?: string;
	query: BlogListingQuery;
	paramKey: 'category' | 'tag';
	allLabel: string;
	testId: string;
}) {
	// Only terms that actually have posts get a chip — a chip that leads to an
	// empty archive is worse than no chip at all.
	const visible = terms.filter((term) => term.count > 0);
	if (visible.length === 0) return null;

	return (
		<div className="flex flex-wrap items-center gap-2" data-testid={testId}>
			<span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
				{heading}
			</span>
			<Link
				href={buildBlogListingHref(basePath, { ...query, [paramKey]: undefined, page: undefined })}
				className={`${chipBase} ${activeId ? chipInactive : chipActive}`}
			>
				{allLabel}
			</Link>
			{visible.map((term) => {
				const isActive = activeId === term.id;
				return (
					<Link
						key={term.id}
						href={buildBlogListingHref(basePath, {
							...query,
							[paramKey]: isActive ? undefined : term.id,
							page: undefined
						})}
						aria-current={isActive ? 'true' : undefined}
						className={`${chipBase} ${isActive ? chipActive : chipInactive}`}
					>
						{term.name}
						<span className="text-[10px] opacity-70">{term.count}</span>
					</Link>
				);
			})}
		</div>
	);
}

/**
 * Category and tag filter rows for the blog listing (EW-28).
 *
 * Chips are plain links that toggle `?category=` / `?tag=` on the current
 * path, so filtered views are server-rendered, shareable and indexable, and
 * clicking an active chip clears it.
 */
export function BlogFilters({
	basePath,
	categories,
	tags,
	activeCategory,
	activeTag,
	query,
	labels
}: BlogFiltersProps) {
	if (categories.length === 0 && tags.length === 0) return null;

	return (
		<div className="flex flex-col gap-3" data-testid="blog-filters">
			<TermRow
				basePath={basePath}
				heading={labels.categories}
				terms={categories}
				activeId={activeCategory}
				query={query}
				paramKey="category"
				allLabel={labels.all}
				testId="blog-category-filters"
			/>
			<TermRow
				basePath={basePath}
				heading={labels.tags}
				terms={tags}
				activeId={activeTag}
				query={query}
				paramKey="tag"
				allLabel={labels.all}
				testId="blog-tag-filters"
			/>
		</div>
	);
}
