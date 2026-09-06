import { Fragment } from 'react';

/**
 * Maximum query length considered for highlighting. Anything longer is almost
 * certainly not a real search term and building a RegExp from it wastes work.
 */
const MAX_HIGHLIGHT_QUERY_LENGTH = 120;

/** Escape every RegExp metacharacter so a query like `c++` cannot break the pattern. */
function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface HighlightTextProps {
	/** The text to render. */
	text: string;
	/** Search query whose occurrences should be marked. Empty disables highlighting. */
	query?: string;
	/** Extra classes for the `<mark>` elements. */
	markClassName?: string;
}

/**
 * Render `text`, wrapping case-insensitive occurrences of `query` in `<mark>`.
 *
 * Splitting is done in React rather than with `dangerouslySetInnerHTML`, so
 * post content can never inject markup through the search box or the
 * frontmatter. Returns the plain string when there is nothing to highlight.
 */
export function HighlightText({ text, query, markClassName }: HighlightTextProps) {
	const needle = query?.trim() ?? '';

	if (!needle || needle.length > MAX_HIGHLIGHT_QUERY_LENGTH || !text) {
		return <>{text}</>;
	}

	const pattern = new RegExp(`(${escapeRegExp(needle)})`, 'gi');
	const segments = text.split(pattern);

	if (segments.length <= 1) {
		return <>{text}</>;
	}

	const lowerNeedle = needle.toLowerCase();

	return (
		<>
			{segments.map((segment, index) =>
				segment.toLowerCase() === lowerNeedle ? (
					<mark
						key={index}
						className={
							markClassName ??
							'rounded-sm bg-theme-primary/20 px-0.5 text-inherit dark:bg-theme-primary/30 dark:text-white'
						}
					>
						{segment}
					</mark>
				) : (
					<Fragment key={index}>{segment}</Fragment>
				)
			)}
		</>
	);
}
