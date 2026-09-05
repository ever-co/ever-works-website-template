---
id: faq-page
title: FAQ Page
sidebar_label: FAQ Page
sidebar_position: 37
---

# FAQ Page

Every generated directory ships a visitor-facing FAQ at **`/faq`**. Like the
other static info pages (`/about`, `/cookies`, `/terms-of-service`,
`/privacy-policy`), its content lives in your **data repository** rather than in
the template, so you can rewrite it without touching code or redeploying the
template.

Unlike the other info pages, it also emits Schema.org
[`FAQPage`](https://developers.google.com/search/docs/appearance/structured-data/faqpage)
structured data built from its own content, so your answers are eligible for
search rich results and are easy for AI crawlers to ingest.

## Adding your own FAQ

Create `pages/faq.en.md` in the repository pointed to by `DATA_REPOSITORY`, and
one file per additional locale (`pages/faq.fr.md`, `pages/faq.de.md`, …). A
missing locale falls back to the English file.

```md
---
title: FAQ
description: Answers to common questions about our directory
lastUpdated: 2026-09-03
---

## How do I submit a listing?

Open the Submit page from the header and fill in the form. Include the name,
the link, a short description and the category that fits best.

## How long does review take?

Every submission is reviewed by a human. Most are handled within a few
business days.
```

The frontmatter `title` overrides the page heading and `lastUpdated` renders a
timestamp badge; both are optional.

## How questions are detected

The `FAQPage` block is generated from the Markdown itself, so a normally
written FAQ needs no extra authoring:

- Every `##`–`######` heading becomes a **question**, and the prose beneath it,
  up to the next heading, becomes its **answer**.
- `#` (H1) is treated as the document title and ignored.
- A heading immediately followed by another heading is treated as a **section
  grouping**, not a question — so you can organise a long FAQ with `##`
  sections above `###` questions without polluting the structured data.
- Answers are converted to plain text (links keep their label, images and raw
  HTML are dropped). Very long answers are truncated in the structured data
  only; the visible page always shows the full text.
- The plain text says what the page says. Formatting markers are removed only
  where they actually delimit a span, so an answer that mentions `snake_case`,
  `5*3` or `a < b` is marked up with those characters intact — search engines
  treat a marked-up answer that disagrees with the visible one as a
  structured-data violation.

If your page's prose does not map cleanly onto headings, declare the pairs
explicitly in frontmatter — this takes priority over heading detection:

```yaml
---
title: FAQ
faqs:
    - question: How do I submit a listing?
      answer: Use the Submit link in the header.
    - question: Is it free?
      answer: Standard listings are free.
---
```

A `faqs` array is authoritative whenever it is present: the headings are not
consulted at all, so `faqs: []` is how a page keeps its prose but opts out of
the rich result.

No structured data is emitted when no question/answer pair can be found — an
empty `FAQPage` is invalid and would do more harm than none.

## Defaults and discovery

If your data repository has no `faq` page, `/faq` renders a **built-in,
directory-agnostic FAQ** (what the directory is, how to search, how to submit,
review times, pricing, corrections, contact) so a freshly generated site is
never blank. Replace it by committing your own file.

A `faq.<locale>.md` that carries only frontmatter counts as "no body", so `/faq`
and the `/faq.md` mirror both fall back to the built-in FAQ rather than one of
them going blank. The same rule now applies to the other static info pages.

The page is wired into discovery the same way its siblings are:

| Surface           | Entry                                                  |
| ----------------- | ------------------------------------------------------ |
| Navigation        | Footer product column and the header **More** menu      |
| `sitemap.xml`     | `/faq`, plus one entry per non-default locale           |
| `robots.txt`      | Explicitly allowed                                      |
| Markdown mirror   | `/faq.md`, advertised via `<link rel="alternate">`      |
| `llms.txt`        | Listed among the per-page Markdown mirrors              |
| Structured data   | `FAQPage` **and** `BreadcrumbList`                      |

## Related

- [SEO Configuration](seo.md) — the `FAQPage` generator and the rest of the
  structured-data module.
- [Spec 046](../spec/046-faq-page/spec.md) — the full feature specification.
