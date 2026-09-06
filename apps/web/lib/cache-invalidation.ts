import { revalidateTag } from 'next/cache';
import { CACHE_TAGS } from './cache-config';
import { clearFetchItemsCache } from './content';

/**
 * Check if error is a Next.js render phase restriction error
 * Uses multiple patterns to be resilient to error message changes
 * @param error - Error to check
 * @returns true if error is related to render phase restrictions
 */
function isRenderPhaseError(error: Error): boolean {
  const message = error.message.toLowerCase();

  // Check for multiple patterns to be more robust against Next.js changes:
  // - "during render": Current Next.js error message
  // - "render phase": Alternative phrasing
  // - "revalidate" + "render": Both keywords present
  // - "unsupported" + "render": Combination for unsupported during render
  return (
    message.includes('during render') ||
    message.includes('render phase') ||
    (message.includes('revalidate') && message.includes('render')) ||
    (message.includes('unsupported') && message.includes('render'))
  );
}

/**
 * Safely call revalidateTag with error handling
 * Catches errors when called during render phase and logs warning
 * @param tag - Cache tag to revalidate
 *
 * Note: In Next.js 16, revalidateTag requires a second argument (profile).
 * Using 'max' profile for stale-while-revalidate semantics (recommended).
 */
function safeRevalidateTag(tag: string): void {
  try {
    // Next.js 16: revalidateTag now requires a profile parameter
    // Using 'max' for stale-while-revalidate semantics (recommended)
    revalidateTag(tag, 'max');
  } catch (error) {
    // revalidateTag throws error when called during render phase
    // This is expected when background sync runs during request handling
    // Cache will be invalidated on next sync outside of render phase
    if (error instanceof Error && isRenderPhaseError(error)) {
      console.warn(`[CACHE] Skipping cache invalidation during render phase (tag: ${tag})`);
    } else {
      // Log unexpected errors for debugging before re-throwing
      console.error(`[CACHE] Unexpected error during cache invalidation (tag: ${tag}):`, error);
      throw error;
    }
  }
}

/**
 * Invalidates all content-related caches
 * Should be called after repository sync completes successfully
 */
export async function invalidateContentCaches(): Promise<void> {
  console.log('[CACHE] Invalidating all content caches after sync');

  // Invalidate all content-related cache tags
  // Using safe wrapper to handle render phase restrictions
  safeRevalidateTag(CACHE_TAGS.CONTENT);
  safeRevalidateTag(CACHE_TAGS.ITEMS);
  safeRevalidateTag(CACHE_TAGS.CATEGORIES);
  safeRevalidateTag(CACHE_TAGS.TAGS);
  safeRevalidateTag(CACHE_TAGS.COLLECTIONS);
  safeRevalidateTag(CACHE_TAGS.COMPARISONS);
  safeRevalidateTag(CACHE_TAGS.POSTS);
  safeRevalidateTag(CACHE_TAGS.PAGES);

  // Clear in-memory fetchItems cache
  await clearFetchItemsCache();

  console.log('[CACHE] Content caches invalidated successfully');
}

/**
 * Invalidates cache for a specific item
 * @param slug - Item slug to invalidate
 */
export async function invalidateItemCache(slug: string): Promise<void> {
  console.log(`[CACHE] Invalidating cache for item: ${slug}`);
  safeRevalidateTag(CACHE_TAGS.ITEM(slug));
}

/**
 * Invalidates cache for a specific page
 * @param slug - Page slug to invalidate
 */
export async function invalidatePageCache(slug: string): Promise<void> {
  console.log(`[CACHE] Invalidating cache for page: ${slug}`);
  safeRevalidateTag(CACHE_TAGS.PAGE(slug));
}
