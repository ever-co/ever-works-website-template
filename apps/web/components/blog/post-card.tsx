import { Link } from '@/i18n/navigation';
import type { PostSummary } from '@/types/post';
import { buildCategoryHref, buildPostHref, formatPostDate, toDateTimeAttribute } from '@/lib/blog/urls';
import { HighlightText } from './highlight-text';
import { PostImage, hasRenderablePostImage } from './post-image';

interface PostCardLabels {
	readMore: string;
	byAuthor: string;
	readingTime: string;
}

interface PostCardProps {
	post: PostSummary;
	locale: string;
	labels: PostCardLabels;
	/** Active search query — occurrences are highlighted in the title and excerpt. */
	query?: string;
}

/**
 * One post in the listing grid: featured image, category chips, title,
 * excerpt, author, date, reading time and a "Read more" affordance.
 *
 * The whole card is a single link (EW-26 asks for a "Read More" link to the
 * post) with the category chips rendered as separate links inside the card
 * header, above the link overlay, so they remain independently clickable.
 */
export function PostCard({ post, locale, labels, query }: PostCardProps) {
	const formattedDate = formatPostDate(post.date, locale);
	const dateTime = toDateTimeAttribute(post.date);

	return (
		<article className="group relative flex h-full flex-col overflow-hidden rounded-sm bg-white/80 shadow-md ring-1 ring-gray-200/50 transition-all duration-500 hover:shadow-xl hover:ring-theme-primary/70 dark:bg-white/3 dark:ring-white/6 dark:hover:ring-white/40">
			{/* Gated on the same predicate `PostImage` uses: an unusable frontmatter
			    image would otherwise reserve a blank 16:9 band on the card. */}
			{hasRenderablePostImage(post.image) ? (
				<div className="relative aspect-16/9 w-full overflow-hidden bg-gray-100 dark:bg-white/5">
					<PostImage
						src={post.image}
						alt={post.title}
						sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
						className="object-cover transition-transform duration-500 group-hover:scale-105"
					/>
				</div>
			) : null}

			<div className="flex flex-1 flex-col p-6">
				{post.categories.length > 0 ? (
					<div className="relative z-20 mb-4 flex flex-wrap gap-2">
						{post.categories.map((category) => (
							<Link
								key={category.id}
								href={buildCategoryHref(category.id)}
								className="rounded-full border border-theme-primary/30 bg-theme-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-theme-primary transition-colors hover:bg-theme-primary/20"
							>
								{category.name}
							</Link>
						))}
					</div>
				) : null}

				<h2 className="mb-3 text-base font-semibold leading-6 text-gray-900 transition-colors group-hover:text-theme-primary dark:text-gray-100">
					<Link href={buildPostHref(post.slug)} className="before:absolute before:inset-0 before:z-10">
						<HighlightText text={post.title} query={query} />
					</Link>
				</h2>

				{post.description ? (
					<p className="mb-6 line-clamp-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
						<HighlightText text={post.description} query={query} />
					</p>
				) : null}

				<div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-gray-200 pt-4 text-xs text-gray-500 dark:border-white/10 dark:text-gray-400">
					{post.author ? <span className="font-medium">{labels.byAuthor}</span> : null}
					{formattedDate ? (
						<time dateTime={dateTime} className="font-extralight">
							{formattedDate}
						</time>
					) : null}
					<span className="font-extralight">{labels.readingTime}</span>
					<span className="ml-auto font-medium text-theme-primary transition-transform group-hover:translate-x-1">
						{labels.readMore} &rarr;
					</span>
				</div>
			</div>
		</article>
	);
}
