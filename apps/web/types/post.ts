/**
 * Blog post types (Spec 050).
 *
 * Posts live in the Git-based CMS repository under `.content/posts/` as
 * Markdown files with YAML frontmatter — the folder the template README
 * has documented since 2025 but nothing read until now.
 *
 * These types live outside `lib/content.ts` because that module carries a
 * `'use server'` directive, which restricts its runtime exports to async
 * functions. Types are erased at compile time, but keeping them here also
 * lets client components (search box, highlight) import them without
 * pulling the server-only content module into a client bundle.
 */

/** Resolved author of a post. `name` is always present; the rest is optional. */
export interface PostAuthor {
	/** Display name, e.g. "Ada Lovelace". */
	name: string;
	/** Optional slug when the author is defined in `.content/posts/authors/`. */
	slug?: string;
	/** Optional avatar URL. */
	avatar?: string;
	/** Optional profile / homepage URL. */
	url?: string;
}

/** A category or tag attached to a post. */
export interface PostTerm {
	/** Slugified identifier used in URLs, e.g. `product-updates`. */
	id: string;
	/** Human-readable name as written in the frontmatter, e.g. `Product Updates`. */
	name: string;
}

/** A category or tag plus how many published posts reference it. */
export interface PostTermWithCount extends PostTerm {
	count: number;
}

/** Post metadata as rendered on listing pages (no Markdown body). */
export interface PostSummary {
	slug: string;
	title: string;
	/** Short excerpt — frontmatter `description`/`excerpt`, or derived from the body. */
	description: string;
	/** ISO-8601 publication date. Empty string when the frontmatter omits one. */
	date: string;
	author?: PostAuthor;
	categories: PostTerm[];
	tags: PostTerm[];
	/** Featured / hero image URL (absolute, or root-relative to the site). */
	image?: string;
	/** Estimated reading time in whole minutes (always >= 1). */
	readingTimeMinutes: number;
	/** Locale of the file that was actually read (may differ from the requested one). */
	locale: string;
}

/** A single post including its Markdown body. */
export interface PostDetail extends PostSummary {
	/** Markdown body with the frontmatter block stripped. */
	content: string;
}

/** Paginated result returned by the posts loader. */
export interface FetchPostsResult {
	/** Number of posts matching the active filters (before pagination). */
	total: number;
	/** The requested page, clamped into `[1, totalPages]`. */
	page: number;
	/** Effective posts-per-page for this request. */
	perPage: number;
	/** Total number of pages (at least 1, even when there are no posts). */
	totalPages: number;
	/** Total number of published posts, ignoring filters. */
	totalUnfiltered: number;
	posts: PostSummary[];
}

/** Categories and tags derived from (or declared alongside) the posts. */
export interface PostTaxonomies {
	categories: PostTermWithCount[];
	tags: PostTermWithCount[];
}

/** Options accepted by the posts loader. */
export interface FetchPostsOptions {
	/** Locale to resolve post files for. Defaults to `en`. */
	lang?: string;
	/** 1-based page number. Out-of-range values are clamped. */
	page?: number;
	/** Posts per page. Falls back to the Work config, then to the built-in default. */
	perPage?: number;
	/** Filter by category (matched on slugified id or name). */
	category?: string;
	/** Filter by tag (matched on slugified id or name). */
	tag?: string;
	/** Free-text query matched against title, excerpt, body, author and terms. */
	q?: string;
}
