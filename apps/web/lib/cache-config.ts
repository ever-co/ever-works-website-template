/**
 * Cache configuration for Next.js unstable_cache
 * Centralized cache tags and TTL settings
 */

/**
 * Cache TTL (Time To Live) in seconds
 * Optimized for performance: longer cache duration reduces filesystem reads
 */
export const CACHE_TTL = {
	/** Content cache duration - 10 minutes (600 seconds) */
	CONTENT: 600,
	/** Listing cache - 60s. Short TTL bounds staleness if a partially-repaired listing slips in. */
	LISTING: 60,
	/** Individual item cache duration - 10 minutes (600 seconds) */
	ITEM: 600,
	/** Site config cache duration - 10 minutes (600 seconds) */
	CONFIG: 600,
	/** Static pages cache duration - 10 minutes (600 seconds) */
	PAGES: 600
} as const;

/**
 * Cache tags for revalidation
 * Used with revalidateTag() to invalidate specific caches
 */
export const CACHE_TAGS = {
	/** Master content tag - invalidates all content-related caches */
	CONTENT: 'content',

	/** All items collection */
	ITEMS: 'items',

	/** Specific item by slug */
	ITEM: (slug: string) => `item:${slug}`,

	/** All categories */
	CATEGORIES: 'categories',

	/** All tags */
	TAGS: 'tags',

	/** All collections */
	COLLECTIONS: 'collections',

	/** All comparisons */
	COMPARISONS: 'comparisons',

	/** All blog posts */
	POSTS: 'posts',

	/** Specific blog post by slug */
	POST: (slug: string) => `post:${slug}`,

	/** Site configuration */
	CONFIG: 'config' /** All static pages */,
	PAGES: 'pages',

	/** Specific page by slug */
	PAGE: (slug: string) => `page:${slug}`,

	/** Items filtered by locale */
	ITEMS_LOCALE: (locale: string) => `items:${locale}`,

	/** Categories by locale */
	CATEGORIES_LOCALE: (locale: string) => `categories:${locale}`,

	/** Tags by locale */
	TAGS_LOCALE: (locale: string) => `tags:${locale}`,

	/** Collections by locale */
	COLLECTIONS_LOCALE: (locale: string) => `collections:${locale}`,

	/** Comparisons by locale */
	COMPARISONS_LOCALE: (locale: string) => `comparisons:${locale}`,

	/** Blog posts by locale */
	POSTS_LOCALE: (locale: string) => `posts:${locale}`
} as const;

/**
 * Max number of items a *listing* may contain to still be persisted in Next's Data Cache
 * (`unstable_cache`).
 *
 * `unstable_cache` hard-caps a single entry at 2MB and *silently drops* anything larger — the
 * entry is then recomputed AND re-serialized on every request (`Failed to set Next.js data cache …
 * items over 2MB can not be cached`). On a large directory this pegs CPU. Listing items are
 * metadata-only (the markdown body is stripped in `fetchItems`, ~0.8KB/item), so ~2000 items
 * ≈ 1.6MB stays safely under the 2MB ceiling. Bigger catalogues skip the persistent layer and
 * fall back to the in-memory `fetchItems` cache (10-min TTL, cleared on content sync) instead.
 *
 * Override with the `CONTENT_DATA_CACHE_MAX_ITEMS` env var if your items are unusually large/small.
 */
export const DATA_CACHE_MAX_ITEMS: number = (() => {
	const raw = Number(process.env.CONTENT_DATA_CACHE_MAX_ITEMS);
	return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 2000;
})();
