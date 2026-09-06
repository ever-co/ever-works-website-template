'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Search, X } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { BLOG_QUERY_KEYS } from '@/lib/blog/urls';

/** Debounce before a keystroke turns into a navigation. */
const SEARCH_DEBOUNCE_MS = 300;

interface BlogSearchLabels {
	placeholder: string;
	label: string;
	clear: string;
}

interface BlogSearchProps {
	/** Path the search navigates to (the listing, a category page, …). */
	basePath: string;
	/** Query currently reflected by the URL, used to seed the input. */
	initialQuery: string;
	labels: BlogSearchLabels;
}

/**
 * Search box for the blog listing (EW-29).
 *
 * The input is a controlled client component, but the *result* is always a URL
 * change: typing debounces into `router.replace('?q=…')` and the server
 * component re-renders the filtered list. That keeps results shareable and
 * indexable, and means the highlighting on the cards is rendered on the server
 * from the same query the loader filtered on.
 *
 * Submitting the form flushes the pending debounce immediately, so pressing
 * Enter never loses the last keystroke.
 */
export function BlogSearch({ basePath, initialQuery, labels }: BlogSearchProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [value, setValue] = useState(initialQuery);
	const [isPending, startTransition] = useTransition();
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// The debounced navigation must build its query string from whatever the
	// URL holds WHEN IT FIRES, not from the render that scheduled it. Between a
	// keystroke and the 300 ms timeout the user can click a category chip or a
	// pagination link; a callback closed over the old `searchParams` would
	// serialize the pre-click state and silently drop that filter or page.
	// Mirroring the value into a ref (assigned during render, never read during
	// render) keeps the callback rebased on the current URL with no stale window.
	const searchParamsString = searchParams?.toString() ?? '';
	const searchParamsRef = useRef(searchParamsString);
	searchParamsRef.current = searchParamsString;

	// Keep the field in sync when the URL changes from elsewhere — a category
	// chip, the "clear search" link, or the browser back button.
	useEffect(() => {
		setValue(initialQuery);
	}, [initialQuery]);

	useEffect(() => {
		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
	}, []);

	const navigate = (nextQuery: string) => {
		const params = new URLSearchParams(searchParamsRef.current);
		const trimmed = nextQuery.trim();

		if (trimmed) {
			params.set(BLOG_QUERY_KEYS.query, trimmed);
		} else {
			params.delete(BLOG_QUERY_KEYS.query);
		}
		// A new query invalidates the current page offset.
		params.delete(BLOG_QUERY_KEYS.page);

		const search = params.toString();
		startTransition(() => {
			router.replace(search ? `${basePath}?${search}` : basePath, { scroll: false });
		});
	};

	const handleChange = (nextValue: string) => {
		setValue(nextValue);
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => navigate(nextValue), SEARCH_DEBOUNCE_MS);
	};

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (debounceRef.current) clearTimeout(debounceRef.current);
		navigate(value);
	};

	const handleClear = () => {
		if (debounceRef.current) clearTimeout(debounceRef.current);
		setValue('');
		navigate('');
	};

	return (
		<form role="search" onSubmit={handleSubmit} className="relative w-full max-w-xl" data-testid="blog-search">
			<label htmlFor="blog-search-input" className="sr-only">
				{labels.label}
			</label>
			<Search
				aria-hidden="true"
				className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500"
			/>
			<input
				id="blog-search-input"
				data-testid="blog-search-input"
				type="search"
				name={BLOG_QUERY_KEYS.query}
				value={value}
				onChange={(event) => handleChange(event.target.value)}
				placeholder={labels.placeholder}
				autoComplete="off"
				aria-busy={isPending}
				className="w-full rounded-md border border-gray-200 bg-white/80 py-2 pl-9 pr-9 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-theme-primary focus:ring-1 focus:ring-theme-primary dark:border-white/10 dark:bg-white/5 dark:text-gray-100 dark:placeholder:text-gray-500"
			/>
			{value ? (
				<button
					type="button"
					onClick={handleClear}
					aria-label={labels.clear}
					data-testid="blog-search-clear"
					className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-white"
				>
					<X className="h-4 w-4" aria-hidden="true" />
				</button>
			) : null}
		</form>
	);
}
