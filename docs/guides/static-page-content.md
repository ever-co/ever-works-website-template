---
id: static-page-content
title: Static Page Content (Terms, Privacy, About, Cookies)
sidebar_label: Static Page Content
sidebar_position: 37
---

# Static Page Content

The template's static information pages — **Terms of Service**, **Privacy
Policy**, **About** and **Cookies** — do not hold their copy in the code. Each
one renders a Markdown file that lives in the Work's **data repository** (the
Git CMS repo pointed at by `DATA_REPOSITORY`, see
[Spec 006](../spec/006-git-cms/spec.md)). Editing the legal text is therefore a
content change in that repository, not a template change, and it does not
require a redeploy of the site's code.

## File organization and naming

Files live in a top-level `pages/` directory of the data repository and are
named `<slug>.<locale>.md`:

```
your-directory-data/
├── data/                       # directory items
├── categories.yml
├── tags.yml
└── pages/
    ├── terms-of-service.en.md  # /terms-of-service
    ├── terms-of-service.fr.md  # /fr/terms-of-service
    ├── privacy-policy.en.md    # /privacy-policy
    ├── privacy-policy.fr.md    # /fr/privacy-policy
    ├── about.en.md             # /about
    ├── cookies.en.md           # /cookies
    └── faq.en.md               # /pages/faq  (generic route)
```

| Rule                | Detail                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------ |
| Directory           | `pages/` at the root of the data repository. It is cloned into `apps/web/.content/pages/` at build/run time. |
| Slug                | Lower-case, hyphen-separated, and it must match the route (`terms-of-service`, `privacy-policy`).            |
| Locale              | The ISO code of one of the site's configured locales (`en`, `fr`, `de`, …).                                  |
| Extension           | `.md`. The body is rendered by `next-mdx-remote`, so MDX syntax and GFM (tables, task lists) both work.      |
| Locale fallback     | A missing `<slug>.<locale>.md` falls back to `<slug>.en.md`, so translating pages is optional and gradual.   |
| Slugs are validated | Path traversal and unusual characters are rejected before any file is read.                                  |

Slugs that do not have a dedicated route are still published, under
`/pages/<slug>` — that is how `faq.en.md` above becomes `/pages/faq`.

## File structure: frontmatter + body

Every file starts with a YAML frontmatter block, then the Markdown body:

```markdown
---
title: Terms of Service
description: Terms and conditions for using the Awesome Chairs directory
lastUpdated: '2026-01-15'
---

## 1. Acceptance of Terms

By accessing this directory you agree to be bound by these terms…

## 2. Use of the Service

You may browse, search and submit entries subject to the rules below.
```

| Key           | Required | Rendered as                                                                                       |
| ------------- | -------- | ------------------------------------------------------------------------------------------------- |
| `title`       | no       | the page `<h1>`, the HTML `<title>`, `og:title`, and the heading of the `.md` mirror              |
| `description` | no       | `<meta name="description">`, `og:description`, `twitter:description`, and the mirror's blockquote |
| `lastUpdated` | no       | the "Last updated" chip under the page heading                                                    |

Every key is optional. When `title` or `description` is absent, blank or not a
string, the page falls back to the template's translated strings, so a Work
that ships no `pages/` directory at all still renders a complete, localized
page. See [SEO](../features/seo.md) for the full resolution order.

Do **not** start the body with a level-1 `#` heading: the page already renders
`title` as its `<h1>`, and a second one hurts the document outline.

## How the content is loaded

1. `fetchPageContent(slug, locale)` (`apps/web/lib/content.ts`) validates the
   slug, resolves `pages/<slug>.<locale>.md` with the `en` fallback, and parses
   the YAML frontmatter.
2. `getCachedPageContent()` wraps that read in `unstable_cache` with a 600 s TTL
   (`CONTENT_CACHE_TTL.PAGES`) and the cache tags `content`, `pages` and
   `page:<slug>`, so repeated requests — and the page body plus its
   `generateMetadata` — share a single filesystem read.
3. The route renders the body through `<MDX />` inside the shared prose styles.
4. `/terms-of-service.md`, `/privacy-policy.md`, `/about.md` and `/cookies.md`
   expose the same content as a plain Markdown mirror for AI agents.

## Error handling and fallbacks

The pages are designed never to fail because of missing or malformed content:

- **File missing** (no data repository, no `pages/` directory, a locale not yet
  translated and no `en` file): the route renders its built-in placeholder body
  and the translated title/description. The page still returns `200`.
- **Read failure** (permissions, a half-finished clone): the error is caught,
  logged with `console.error`, and the same placeholder path is taken.
- **Invalid frontmatter**: the YAML error is logged with `console.warn` and the
  file is rendered verbatim — including the `---` fences, which will be visible
  on the page. Fix the YAML rather than relying on this path; it is a
  last-resort "show something" fallback, not a clean body-only recovery.
- **Cold cache**: `loading.tsx` on each route shows a skeleton while the first
  request after a deploy or a revalidation hydrates the content.

A missing page is logged once per slug and locale, and only outside
production (`NODE_ENV !== 'production'`), so a Work that deliberately ships
no `pages/` directory does not flood its production logs.

## Publishing a change

1. Edit `pages/terms-of-service.en.md` in the data repository and commit.
2. The site picks the change up on its next content sync, or within the 600 s
   cache TTL of an already-running instance.
3. Nothing in the template needs to be rebuilt or redeployed.

## Related

- [SEO](../features/seo.md) — how frontmatter becomes page metadata
- [Custom Navigation](custom-navigation.md) — linking to these pages
- [Footer Customization](footer-customization.md) — the default footer links
