---
id: spec-047-md-mirror-route-reachability
title: Spec 047 — Markdown mirrors reachable (private-folder routing fix)
sidebar_label: 047 Markdown Mirror Reachability
---

# Feature spec — `047-md-mirror-route-reachability`

## 1. Summary

Make the per-page `.md` Markdown mirrors actually serve. Every public page
advertises a Markdown twin via
`<link rel="alternate" type="text/markdown" href="…">`, `docs/features/seo.md`
documents the surface, `/llms.txt` tells agents it exists — and **every one of
those URLs returned 404**. The route handlers lived in `_`-prefixed folders
(`app/[locale]/_static-md/[slug]/route.ts`,
`app/[locale]/items/[slug]/_md/route.ts`, and five siblings). The App Router
treats a leading-underscore folder as a **private folder** and drops it, and
everything beneath it, from the route table, so the destinations the
`next.config.ts` rewrites pointed at did not exist.

## 2. Motivation

Measured on `origin/develop` @ `7a164d65` against a production build
(`next build && next start`):

| URL | Status |
| --- | --- |
| `/about.md`, `/help.md`, `/pricing.md`, `/privacy-policy.md`, `/terms-of-service.md`, `/cookies.md` | `404 text/html` |
| `/en/about.md`, `/fr/about.md`, `/fr/pricing.md` | `404 text/html` |
| `/items/<real slug>.md`, `/en/items/<real slug>.md`, `/fr/items/<real slug>.md` | `404 text/html` |
| `/categories/<real id>.md`, `/tags/<real id>.md`, `/collections/<real slug>.md`, `/pages/about.md` | `404 text/html` |
| `/_static-md/about` (the rewrite destination itself) | `404 text/html` |

The build's own route table is the clearest evidence: `next build` lists
`/[locale]/items/[slug]`, `/[locale]/categories/[category]` and so on, and
contains **no** `_md` or `_static-md` entry at all.

Two things kept it invisible:

- `apps/web-e2e/tests/public/md-mirror-routes.spec.ts` asserted only
  `status < 500`, and gated its `text/markdown` check behind
  `status < 400`. A 404 satisfied both. So did
  `cms-md-mirror-deeper.spec.ts`.
- Nothing links to a `.md` URL from the UI, so no human ever clicked one.

A second, independent defect sat behind the same 404: the rewrites for the
**unprefixed** URLs pointed at destinations with no locale segment
(`/items/:slug/_md`, three segments) while the handlers live under
`app/[locale]/…` (four). `proxy.ts` is what normally inserts the locale, and
its matcher (`'/((?!api|trpc|_next|_vercel|.*\\..*).*)'`) excludes every path
containing a dot — which is every `.md` mirror. Renaming the folders alone
would have fixed only the locale-prefixed half.

## 3. Goals

- Every advertised `.md` URL returns `200` with `Content-Type: text/markdown`
  and the page's real content, in the default locale and in a prefixed
  locale.
- Public URLs are unchanged: `/about.md`, `/items/<slug>.md`, … are what
  crawlers were told about and stay exactly as they are. Only the internal
  segment moves.
- An unknown slug is a hard `404`, matching the HTML page it mirrors.
- A mirror answers like the page it mirrors — including when the whole
  category / tag surface is switched off for the site.
- The e2e guard asserts the real contract so this cannot rot silently again.

### Non-goals

- The doubled origin in the `text/markdown` alternate href on `/about`,
  `/cookies`, `/privacy-policy`, `/terms-of-service` — a separate defect
  owned by PR #1046 and `md-alternate-link-absolute-url.spec.ts`. The same
  doubling exists on `/items/<slug>` and `/pages/<slug>`; not fixed here.
- Adding mirrors for page types that never had one (paginated category /
  tag catch-alls).
- Changing the Markdown rendering itself.

## 4. Approach

**Rename the internal segment.** `_md` → `md`, `_static-md` → `static-md`,
across all seven route handlers, with the rewrite destinations updated to
match:

```
app/[locale]/static-md/[slug]/route.ts
app/[locale]/items/[slug]/md/route.ts
app/[locale]/categories/[category]/md/route.ts
app/[locale]/tags/[tag]/md/route.ts
app/[locale]/collections/[slug]/md/route.ts
app/[locale]/comparisons/[slug]/md/route.ts
app/[locale]/pages/[slug]/md/route.ts
```

Why a rename and not a route group: a private folder cannot be routed to by
construction, so the segment has to become a real one. `(md)` would not work —
a route group contributes nothing to the URL, so `app/[locale]/items/[slug]/(md)/route.ts`
would collide with the `page.tsx` already at that path. Moving the handlers
under `app/api/**` would change every rewrite, drop the `[locale]` param the
handlers read, and split the mirror away from the page it mirrors. The rename
is a one-word change per folder that leaves the data flow, the rewrites' shape
and every public URL untouched.

The internal URLs (`/en/items/<slug>/md`) become reachable as a side effect.
That is acceptable: the handlers already send `X-Robots-Tag: noindex`, so they
are not indexable, and they are not in the sitemap.

**Name the locale in the unprefixed destinations.** `/items/:slug.md` now
rewrites to `/<DEFAULT_LOCALE>/items/:slug/md`. `next.config.ts` reads
`DEFAULT_LOCALE` from a new dependency-free `lib/i18n/locales.ts`, which
`lib/constants.ts` re-exports, so the two cannot drift. (`next.config.ts`
cannot import `lib/constants.ts` itself — that module opens with `@/…`
imports, which do not resolve outside the app's module graph.)

**Restrict the locale group to `LOCALES`.** The rewrite sources matched any
`[a-z]{2}` segment. Because `proxy.ts` skips these paths, nothing downstream
rejects an unsupported locale, so `/zz/about.md` served the mirror while
`/zz/about` 404s. The group is now built from `LOCALES` (the same
dependency-free module), so unsupported locales fall through to the 404 page.

**404 on unknown slugs.** The category and tag mirrors previously rendered an
empty listing (`200`) for a slug their HTML pages `notFound()` on. They now
return the same `404`. Every mirror's not-found answer is the handler's JSON
envelope (`{"error":"Not found"}`), which is what lets the guard tell "the
handler rejected this slug" apart from "the route does not exist" — the latter
being Next.js' HTML 404 and exactly the failure mode this spec fixes.

**404 when the facet surface is switched off.** `settings.categories_enabled`
and `settings.tags_enabled` in the data repository's `.works/works.yml` let a
site withdraw its category / tag listings, and the HTML pages `notFound()`
when they do — but the mirrors did not read the switch. Measured against a
build without the gate, with `categories_enabled: false`:
`/categories/<real id>` → `404 text/html` while `/categories/<real id>.md` →
`200 text/markdown`, i.e. the mirror kept publishing a surface the site had
withdrawn, to exactly the agents the mirrors exist for. Both handlers now read
the same switch their pages read and answer with the handler's JSON 404.

## 5. Acceptance

Against `next build && next start`:

- `/about.md` `/help.md` `/pricing.md` `/privacy-policy.md`
  `/terms-of-service.md` `/cookies.md` → `200`, `text/markdown; charset=utf-8`,
  body opens with a Markdown `H1` and names its canonical page.
- `/fr/about.md` → `200`, canonical page `/fr/about`.
- `/items/<slug>.md`, `/fr/items/<slug>.md`, `/categories/<id>.md`,
  `/tags/<id>.md`, `/pages/<slug>.md`, `/collections/<slug>.md`,
  `/comparisons/<slug>.md` → `200 text/markdown` wherever the content
  repository publishes that resource.
- `/items/<unknown>.md`, `/pages/<unknown>.md`, `/collections/<unknown>.md`,
  `/comparisons/<unknown>.md`, `/categories/<unknown>.md`,
  `/tags/<unknown>.md` → `404 application/json`, from the handler.
- `/zz/about.md` (unsupported locale) → `404`, never `text/markdown`.
- With `settings.categories_enabled: false` (resp. `tags_enabled: false`),
  `/categories/<id>.md` (resp. `/tags/<id>.md`) answers with the same status
  as `/categories/<id>` (resp. `/tags/<id>`) — `404`, not a listing.
- The `text/markdown` alternate href advertised by `/help` and `/pricing`
  resolves to `200 text/markdown`.

Guard: `apps/web-e2e/tests/public/md-mirror-routes.spec.ts`, rewritten to
assert exactly the above instead of `status < 500`.

## 6. Rollout

Normal `develop → stage → main` cascade. No config, env or data migration.
Deployed Works pick the mirrors up on their next website-template
auto-update + redeploy; no URL that ever worked changes.
