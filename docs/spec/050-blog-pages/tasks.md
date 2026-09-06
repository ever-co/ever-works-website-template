---
id: tasks-050-blog-pages
title: Tasks 050 — Blog pages
sidebar_label: 050 Tasks
---

# Tasks — `050-blog-pages`

> **Spec:** [`spec.md`](./spec.md)
>
> **Plan:** [`plan.md`](./plan.md)

## Phase 1 — Foundation (EW-25)

- [x] T-001: add `apps/web/types/post.ts` with the post, taxonomy and result types.
- [x] T-002: add `apps/web/lib/blog/constants.ts` (default 9, ceiling 48) and
      `apps/web/lib/blog/urls.ts` (URL builders, search-param parsing, date formatting).
- [x] T-003: add the posts loader to `apps/web/lib/content.ts` on top of
      `ensureContentAvailable` / `safeReadFile` / `sanitizeFilename` /
      `mapWithConcurrency`, covering frontmatter parsing, draft filtering,
      locale-suffixed filenames, author resolution and reading-time estimation.
- [x] T-004: register `POSTS`, `POST(slug)` and `POSTS_LOCALE(locale)` cache tags
      and expose `getCachedPosts` / `getCachedPost` / `getCachedAdjacentPosts` /
      `getCachedPostTaxonomies`.
- [x] T-005: add the `hasPosts` content signal and thread it through
      `SettingsProvider` and the new `useBlogExists()` hook.
- [x] T-006: add the Blog entry to the header navigation and the footer product
      column, gated on `hasPosts`; drop the external blog shortcut from the More
      menu when the site has its own posts.
- [x] T-007: add `common.BLOG` and the `blog` namespace to all 21 locale files.
- [x] T-008: add `apps/web/app/[locale]/blog/page.tsx` with the site Hero layout,
      `generateListingMetadata()` and `BreadcrumbJsonLd`.
- [x] T-009: add `/blog` to the static sitemap routes.

## Phase 2 — Listing and pagination (EW-26)

- [x] T-010: sort newest first with undated posts last, then alphabetically.
- [x] T-011: build `PostCard` with title, excerpt, author, date, reading time
      and a "Read more" affordance.
- [x] T-012: resolve posts-per-page from `works.yml` `blog.pagination.per_page`
      (with the `posts_per_page` alias), clamped to `MAX_POSTS_PER_PAGE`.
- [x] T-013: add link-based `BlogPagination` with `rel="prev"` / `rel="next"`,
      a page window with gaps, and clamping for out-of-range pages.
- [x] T-014: add `loading.tsx` skeleton and the empty state.

## Phase 3 — Post detail (EW-27)

- [x] T-015: add `fetchPost()` / `fetchAdjacentPosts()` and their cached wrappers.
- [x] T-016: add `apps/web/app/[locale]/blog/[slug]/page.tsx` with a `prose`
      article body rendered through the existing `MDX` component.
- [x] T-017: render the post header (title, author, date, reading time) and the
      responsive featured image via `PostImage`.
- [x] T-018: add the breadcrumb, `BreadcrumbJsonLd`, back-to-listing link and
      previous/next post navigation.
- [x] T-019: emit OpenGraph `article` metadata and `BlogPosting` JSON-LD; add
      post entries to the sitemap.

## Phase 4 — Categories and tags (EW-28)

- [x] T-020: derive taxonomies from frontmatter and merge declared
      `categories.yml` / `tags.yml` when the data repository ships them.
- [x] T-021: add `BlogFilters` chip rows that toggle `?category=` / `?tag=`.
- [x] T-022: add `/blog/category/[slug]` and `/blog/tag/[slug]` archives, with
      `notFound()` for unknown terms and their own listing metadata.
- [x] T-023: render category chips above the title and tag chips below the body
      on the post page.
- [x] T-024: add non-empty category and tag archives to the sitemap.

## Phase 5 — Search (EW-29)

- [x] T-025: extend the loader with a `q` filter over title, excerpt, body,
      author and term names.
- [x] T-026: add the debounced `BlogSearch` client island bound to `?q=`.
- [x] T-027: add `HighlightText` and apply it to card titles and excerpts.
- [x] T-028: show the result count and clear control, and mark search pages
      `noindex, follow`.
- [x] T-029: add the dedicated no-results state.

## Phase 6 — Delivery

- [x] T-030: add `/blog/rss.xml` beside the existing site feed via
      `buildPostFeedEntries()`.
- [x] T-031: add Playwright coverage for the listing and the post detail page.
- [x] T-032: seed blog posts (three published, one draft, one author) in the CI
      content fixture so the data-dependent specs run instead of skipping.
- [x] T-033: document the `.content/posts/` layout and frontmatter in `README.md`.
- [x] T-034: write this spec, index it in `docs/spec/README.md`, and log the change.
- [x] T-035: pin the post caches to the content revision and revalidate the
      `POSTS` tag from `invalidateContentCaches()`, so a data-repository sync is
      reflected even on an instance that cold-started after it.
- [x] T-036: give the blog feed its own self URL and canonical page via
      `resolveFeedConfig` overrides, publish only the formats it actually
      serves, and exclude undated posts so they are not re-announced as new.
- [x] T-037: base the `hasPosts` nav gate on at least one PUBLISHED post via a
      shared `hasPublishedPosts()` in `lib/content.ts`, so the signal, the
      listing and the More-menu fallback all agree on the same directory and
      the same definition of "has posts".
- [x] T-038: preserve the declared order of `categories.yml` / `tags.yml`
      terms, appending frontmatter-only terms after them.
- [x] T-039: encode post slugs and term ids as single URL path segments.
- [x] T-040: match `next.config.ts` `remotePatterns` on protocol, host AND
      path before asking for image optimization, and share one renderability
      predicate so an unusable image never reserves blank card space.
- [x] T-041: apply the same `noindex, follow` policy to searched and deeply
      paginated views on all three listing surfaces via `listingRobots()`.
- [x] T-042: emit EVERY post in the sitemap by walking all loader pages, keep
      post slug case intact, and advertise `/blog` only when posts exist.
- [x] T-043: add a post-shaped `loading.tsx` under `blog/[slug]` so a post
      does not flash the listing grid skeleton.
- [x] T-044: drop the legacy external blog entries from the footer resources
      column and the social icon row once the site publishes its own posts.
- [x] T-045: pass slugs and filenames to `console.*` as arguments rather than
      inside the format string (CodeQL `js/tainted-format-string`).
- [x] T-046: pluralise the result and post counts with ICU `plural` in every
      locale whose grammar inflects the counted noun.
- [x] T-047: move the listing skeleton into a `(index)` route group so the
      detail and archive routes are not streamed and return a real 404 instead
      of a 200 "Page Not Found" body.
- [x] T-048: assert the real 404 status for unknown post, category and tag
      slugs in the e2e suite, so the soft-404 regression cannot come back
      unnoticed.
- [x] T-049: add an unpaginated `fetchAllPostSummaries()` for the sitemap so
      collecting every post costs one pass instead of O(posts x pages), and
      drop the arbitrary page cap that truncated very large blogs.
- [x] T-050: scope the published-post probe to the locale the listing will
      render, so a slug that is a draft in one locale and published in another
      cannot light up the nav for the locale that sees nothing.
- [x] T-051: deduplicate declared taxonomy ids that slugify to the same value.
- [x] T-052: build sitemap and feed post URLs with the shared `buildPostHref()`
      / `buildCategoryHref()` / `buildTagHref()` helpers, so every surface
      encodes a slug identically.
- [x] T-053: identify the footer's external blog entry by its label rather than
      its URL, so a site that reuses that URL elsewhere keeps its other icons.

## Acceptance Criteria to Task Map

| AC           | Tasks               |
| ------------ | ------------------- |
| AC-1         | T-005, T-006, T-007 |
| AC-2, AC-3   | T-008               |
| AC-4         | T-008, T-009        |
| AC-5         | T-010               |
| AC-6         | T-011               |
| AC-7         | T-012               |
| AC-8         | T-013               |
| AC-9         | T-014               |
| AC-10        | T-016               |
| AC-11, AC-12 | T-017               |
| AC-13        | T-015, T-018        |
| AC-14        | T-019               |
| AC-15        | T-020               |
| AC-16        | T-021               |
| AC-17        | T-022               |
| AC-18        | T-023               |
| AC-19        | T-024               |
| AC-20        | T-026               |
| AC-21        | T-025               |
| AC-22        | T-027               |
| AC-23        | T-028               |
| AC-24        | T-029               |

## Rollback

Remove the `/blog` routes and the two navigation entries. The loader reads a
folder nothing else touches and introduces no schema change, so removal is
local to this feature.
