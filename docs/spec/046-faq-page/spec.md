---
id: spec-046-faq-page
title: Spec 046 — Visitor-facing FAQ page (/faq) with FAQPage structured data
sidebar_label: 046 FAQ Page
---

# Feature spec — `046-faq-page`

## 1. Summary

Give every generated directory a visitor-facing **FAQ page at `/faq`**, built
the same way as the other static info pages: its content comes from the Work's
data repository (`pages/faq.<locale>.md`, read through
`fetchPageContent` / `getCachedPageContent`), and a built-in fallback FAQ
renders when the repository ships no such file, so a freshly generated site has
a working FAQ on day one.

The page carries the full static-info-page wiring the siblings have — nav entry
points, sitemap, `robots.txt`, the `.md` mirror at `/faq.md`, hreflang and
canonical alternates, breadcrumb structured data — plus the one thing that is
specific to an FAQ: a Schema.org **`FAQPage`** JSON-LD block generated from the
page's own question/answer content.

## 2. Motivation

**Jira:** [EW-47](https://evertech.atlassian.net/browse/EW-47) — "Create page
with common questions and answers to help users." The ticket's follow-up
comment (Ruslan Konviser, 2025-07-07) pins the storage decision: _"Such page
content should be stored in the Data directory as MD / MDX files, same as Terms
of Service / Privacy Policy etc."_

Three gaps motivated the work:

1. **Visitors had nowhere to ask.** A directory generates the same handful of
   questions on every site — how do I submit a listing, how long does review
   take, is it free, how do I correct an entry. Before this spec there was no
   route for them. `/help` exists, but its FAQ tab
   (`app/[locale]/help/components/support.tsx`, PR #94) is hard-coded i18n copy
   aimed at **operators building a directory with Ever Works**, not at the
   visitors of the generated directory, and it is not data-repo Markdown — so
   it does not satisfy the ticket. That tab is untouched by this spec
   (AGENTS.md §8, no removal without migration).
2. **An FAQ's SEO value is the rich result.** Without `FAQPage` structured data
   an FAQ is just prose. `docs/features/seo.md` already advertised a `FAQPage`
   generator under "Other Schema Types" — but `lib/seo/schema.ts` had no such
   function. This spec makes the documentation true.
3. **Every info page needs its wiring.** A route that is missing from the
   sitemap, `robots.txt`, the `.md` mirror list and the nav is a page nobody
   and no crawler finds.

## 3. Scope

### In scope

- `/faq` route under `app/[locale]/faq/page.tsx`, mirroring the shape of
  `app/[locale]/cookies/page.tsx` and `app/[locale]/about/page.tsx`.
- Content resolution from `pages/faq.<locale>.md` in the data repository, with
  an English fallback for a missing locale file (the existing
  `fetchPageContent` behaviour) and a built-in default FAQ when the repository
  has no `faq` page at all.
- `FAQPage` JSON-LD derived from the rendered content.
- Nav entry points: footer product column and the header "More" menu.
- Discovery wiring: `sitemap.ts`, `robots.ts`, `llms.txt`, the `/faq.md`
  mirror (`next.config.ts` rewrite + `_static-md` catch-all).
- i18n keys in **all 21** `apps/web/messages/*.json` files.
- Playwright coverage.

### Out of scope

- Committing `pages/faq.en.md` to a data repository. That is content, not
  template code; it lands in each Work's own repo (for the demo site,
  `ever-works/awesome-time-tracking-data`). The built-in fallback is what makes
  the template work without it.
- An accordion / collapsible FAQ UI. The content is Markdown rendered through
  the shared `MDX` component, exactly like the other info pages; an operator
  who wants accordions styles the prose.
- Removing or reworking the `/help` page's operator-facing FAQ tab.

## 4. Acceptance criteria

| ID   | Criterion                                                                                                                                                |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1 | `GET /faq` returns a page whose content is `pages/faq.<locale>.md` from the data repository when that file exists, resolved through `getCachedPageContent`. |
| AC-2 | With no `faq` file in the data repository, `/faq` still renders a substantive, directory-agnostic FAQ (the built-in fallback) rather than an empty page.    |
| AC-3 | The page emits exactly one `FAQPage` JSON-LD block whose `mainEntity` is a non-empty list of `Question` entries, each with a non-empty `acceptedAnswer`.    |
| AC-4 | No `FAQPage` block is emitted when the content yields no question/answer pair — an empty `FAQPage` is invalid structured data.                              |
| AC-5 | `/faq` is reachable from the footer and from the header "More" menu.                                                                                       |
| AC-6 | `/faq` appears in `sitemap.xml` (default and per-locale), is allowed in `robots.txt`, and is listed among the `.md` mirrors in `llms.txt`.                  |
| AC-7 | `/faq.md` serves the same content as Markdown with a `text/markdown` content type, and the HTML page advertises it via `<link rel="alternate">`.            |
| AC-8 | The page sets a canonical URL and hreflang alternates for `/faq`, and its `<title>` clears the 10-character SEO floor asserted by the e2e suite.            |
| AC-9 | Every one of the 21 locale message files carries the new keys; no locale falls back to a missing-key error.                                                 |

## 5. Content contract

Operators customise the page by committing `pages/faq.en.md` (plus
`faq.<locale>.md` per locale) to their data repository. Two authoring shapes
produce structured data:

**Heading-per-question** (the default; no extra authoring needed):

```md
---
title: FAQ
lastUpdated: 2026-09-03
---

## How do I submit a listing?

Use the Submit link in the header and fill in the form.
```

Every `##`–`######` heading becomes a `Question`; the prose beneath it, up to
the next heading, becomes its `acceptedAnswer`. `#` (H1) is treated as the
document title and ignored. A heading immediately followed by another heading
is a **grouping** heading — it contributes no answer, so it is skipped rather
than emitted as an empty question.

**Explicit frontmatter** (the escape hatch when the prose does not map onto
headings) is authoritative whenever a `faqs` array is present — the headings
are not consulted at all, so `faqs: []` is how a page keeps its prose but opts
out of the rich result:

```yaml
---
title: FAQ
faqs:
    - question: How do I submit a listing?
      answer: Use the Submit link in the header.
---
```

## 6. Open questions

Tracked in [`docs/questions.md`](../../questions.md): **Q-046a** (should the
FAQ render as an accordion rather than plain prose).

## 7. Documentation

End-user page: [`docs/features/faq-page.md`](../../features/faq-page.md)
(content contract, question detection, defaults and discovery). The
structured-data half is documented in
[`docs/features/seo.md`](../../features/seo.md).

## 8. Status

**in-progress** — implementation complete and under review in PR #1044; flips
to `shipped` when that PR merges to `develop`. See [`plan.md`](./plan.md) and
[`tasks.md`](./tasks.md).
