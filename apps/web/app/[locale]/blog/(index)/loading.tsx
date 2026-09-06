import { Container } from '@/components/ui/container';

/**
 * Loading state for the blog listing (EW-26).
 *
 * Rendered by the App Router while the server component streams — the layout
 * mirrors the real grid (search bar, chip row, card grid) so the page does not
 * shift when the posts arrive.
 *
 * It lives inside the `(index)` route group, and that placement is load-bearing.
 * A `loading.tsx` applies to its segment AND every child segment, and a segment
 * with one is streamed: Next flushes the shell with a 200 before the page
 * component runs, so a later `notFound()` can only swap the body, not the
 * status. Sitting directly under `blog/` it therefore turned every unknown
 * `/blog/<slug>`, `/blog/category/<slug>` and `/blog/tag/<slug>` into a
 * soft 404 — a "Page Not Found" body served as 200, which lets crawlers index
 * unlimited nonexistent URLs. The route group contributes no path segment, so
 * `/blog` still resolves here while the detail and archive routes stay
 * unstreamed and return a real 404. Do not move this file up a level.
 */
export default function BlogLoading() {
	return (
		<div className="relative w-full bg-white pt-8 dark:bg-[#0a0a0a] sm:pt-12" aria-busy="true" aria-live="polite">
			<Container maxWidth="7xl" padding="default" useGlobalWidth className="pb-20">
				<div className="flex flex-col items-center gap-4 pt-6">
					<div className="h-5 w-24 animate-pulse rounded-full bg-gray-200/70 dark:bg-white/6" />
					<div className="h-9 w-72 animate-pulse rounded bg-gray-200/70 dark:bg-white/6" />
					<div className="h-4 w-96 max-w-full animate-pulse rounded bg-gray-200/50 dark:bg-white/4" />
				</div>

				<div className="mt-10 flex flex-col items-center gap-5">
					<div className="h-10 w-full max-w-xl animate-pulse rounded-md bg-gray-200/70 dark:bg-white/6" />
					<div className="flex flex-wrap justify-center gap-2">
						{[0, 1, 2, 3].map((index) => (
							<div
								key={index}
								className="h-6 w-24 animate-pulse rounded-full bg-gray-200/50 dark:bg-white/4"
							/>
						))}
					</div>
				</div>

				<div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
					{[0, 1, 2, 3, 4, 5].map((index) => (
						<div
							key={index}
							className="overflow-hidden rounded-sm ring-1 ring-gray-200/50 dark:ring-white/6"
						>
							<div className="aspect-16/9 w-full animate-pulse bg-gray-200/70 dark:bg-white/6" />
							<div className="space-y-3 p-6">
								<div className="h-4 w-20 animate-pulse rounded-full bg-gray-200/50 dark:bg-white/4" />
								<div className="h-5 w-3/4 animate-pulse rounded bg-gray-200/70 dark:bg-white/6" />
								<div className="h-3 w-full animate-pulse rounded bg-gray-200/50 dark:bg-white/4" />
								<div className="h-3 w-5/6 animate-pulse rounded bg-gray-200/50 dark:bg-white/4" />
								<div className="h-3 w-1/2 animate-pulse rounded bg-gray-200/50 dark:bg-white/4" />
							</div>
						</div>
					))}
				</div>
			</Container>
		</div>
	);
}
