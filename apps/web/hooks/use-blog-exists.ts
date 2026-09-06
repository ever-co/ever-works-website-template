import { useSettings } from '@/components/providers/settings-provider';

interface BlogExistsResult {
	exists: boolean;
}

/**
 * Whether the data repository ships at least one blog post.
 *
 * Mirrors `useComparisonsExists()`: the signal is computed on the server in
 * `lib/content-signals.ts` and handed to the client through `SettingsProvider`,
 * so this hook never fetches and is always resolved.
 */
export function useBlogExists(): {
	data: BlogExistsResult | undefined;
	isLoading: boolean;
	error: Error | null;
} {
	const { hasPosts } = useSettings();

	return {
		data: { exists: hasPosts },
		isLoading: false,
		error: null
	};
}
