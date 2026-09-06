'use client';

import { StaticPageSkeleton } from '@/components/ui/skeleton';
import { useNavigation } from '@/components/providers';

/**
 * Loading state for the Markdown-backed Terms of Service page.
 *
 * The route is ISR (`revalidate = 3600`), so a warm cache streams the page
 * immediately; this skeleton covers the cold path — the first request after a
 * deploy or a revalidation, when `getCachedPageContent` still has to hydrate
 * the content repository and read `pages/terms-of-service.<locale>.md`.
 *
 * Matches the sibling loading states: skipped during client-side navigation so
 * a cached route change does not flash a skeleton over content the user can
 * already see.
 */
export default function Loading() {
	const { isInitialLoad } = useNavigation();

	if (!isInitialLoad) {
		return null;
	}

	return <StaticPageSkeleton />;
}
