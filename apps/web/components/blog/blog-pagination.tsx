import { Link } from '@/i18n/navigation';
import { buildBlogListingHref, type BlogListingQuery } from '@/lib/blog/urls';

/** How many numbered page links to render around the current page. */
const PAGE_WINDOW = 2;

interface BlogPaginationLabels {
	previous: string;
	next: string;
	pageOf: string;
	navLabel: string;
}

interface BlogPaginationProps {
	basePath: string;
	page: number;
	totalPages: number;
	/** Active filters, preserved on every page link. */
	query: BlogListingQuery;
	labels: BlogPaginationLabels;
}

/** Page numbers to render: always first and last, plus a window around `page`. */
function pageNumbers(page: number, totalPages: number): Array<number | 'gap'> {
	const pages = new Set<number>([1, totalPages]);
	for (let candidate = page - PAGE_WINDOW; candidate <= page + PAGE_WINDOW; candidate += 1) {
		if (candidate >= 1 && candidate <= totalPages) pages.add(candidate);
	}

	const sorted = [...pages].sort((a, b) => a - b);
	const result: Array<number | 'gap'> = [];
	let previous = 0;
	for (const value of sorted) {
		if (previous && value - previous > 1) result.push('gap');
		result.push(value);
		previous = value;
	}
	return result;
}

const linkClasses =
	'inline-flex min-w-9 items-center justify-center rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:border-theme-primary hover:text-theme-primary dark:border-white/10 dark:text-gray-300 dark:hover:border-white/40 dark:hover:text-white';

const disabledClasses =
	'inline-flex min-w-9 cursor-not-allowed items-center justify-center rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-400 dark:border-white/10 dark:text-gray-600';

/**
 * Server-rendered, link-based pagination.
 *
 * Every control is a real `<a href="?page=N">` so pages are crawlable,
 * shareable and work without JavaScript — and so `rel="prev"`/`rel="next"`
 * in the page metadata line up with what the user can click.
 */
export function BlogPagination({ basePath, page, totalPages, query, labels }: BlogPaginationProps) {
	if (totalPages <= 1) return null;

	const hrefFor = (target: number) => buildBlogListingHref(basePath, { ...query, page: target });

	return (
		<nav
			aria-label={labels.navLabel}
			data-testid="blog-pagination"
			className="mt-12 flex flex-col items-center gap-3"
		>
			<div className="flex flex-wrap items-center justify-center gap-2">
				{page > 1 ? (
					<Link href={hrefFor(page - 1)} rel="prev" className={linkClasses} data-testid="blog-page-prev">
						&larr; {labels.previous}
					</Link>
				) : (
					<span className={disabledClasses} aria-disabled="true">
						&larr; {labels.previous}
					</span>
				)}

				{pageNumbers(page, totalPages).map((entry, index) =>
					entry === 'gap' ? (
						<span key={`gap-${index}`} className="px-1 text-sm text-gray-400 dark:text-gray-600">
							…
						</span>
					) : entry === page ? (
						<span
							key={entry}
							aria-current="page"
							className="inline-flex min-w-9 items-center justify-center rounded-md border border-theme-primary bg-theme-primary/10 px-3 py-1.5 text-sm font-semibold text-theme-primary"
						>
							{entry}
						</span>
					) : (
						<Link key={entry} href={hrefFor(entry)} className={linkClasses}>
							{entry}
						</Link>
					)
				)}

				{page < totalPages ? (
					<Link href={hrefFor(page + 1)} rel="next" className={linkClasses} data-testid="blog-page-next">
						{labels.next} &rarr;
					</Link>
				) : (
					<span className={disabledClasses} aria-disabled="true">
						{labels.next} &rarr;
					</span>
				)}
			</div>

			<p className="text-xs text-gray-500 dark:text-gray-400">{labels.pageOf}</p>
		</nav>
	);
}
