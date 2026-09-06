/**
 * Blog pagination constants (Spec 050).
 *
 * These live outside `lib/content.ts` because that module carries a
 * `'use server'` directive, which restricts its exports to async functions —
 * a plain `export const` there is a build error. Route handlers and pages
 * import them from here; `lib/content.ts` imports them too, so there is a
 * single source of truth.
 */

/** Posts per page when neither the caller nor `works.yml` specifies one. */
export const DEFAULT_POSTS_PER_PAGE = 9;

/**
 * Hard ceiling on posts-per-page.
 *
 * Guards two things: a bad `blog.pagination.per_page` in a data repository
 * cannot render the whole archive in one request, and the cached listing
 * payload stays well under Next's 2 MB Data Cache entry limit.
 */
export const MAX_POSTS_PER_PAGE = 48;
