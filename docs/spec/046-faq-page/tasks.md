---
id: tasks-046-faq-page
title: Tasks 046 — Visitor-facing FAQ page
sidebar_label: 046 Tasks
---

# Tasks — `046-faq-page`

> **Spec:** [`spec.md`](./spec.md)
>
> **Plan:** [`plan.md`](./plan.md)

## Task list

- [x] T-001: add `generateFaqPageSchema` (plus `FaqEntry`, `FaqPageSchemaInput`) to `lib/seo/schema.ts`, returning `null` when no entry survives validation.
- [x] T-002: add the pure `lib/seo/faq-parser.ts` — frontmatter `faqs:` extraction, heading-per-question extraction, Markdown stripping, and the entry/length caps.
- [x] T-003: add `components/seo/faq-json-ld.tsx`, rendering nothing when there are no entries and escaping `<` on serialisation.
- [x] T-004: add `lib/default-page-content.ts` with `DEFAULT_FAQ_CONTENT`, authored as heading-per-question Markdown so the fallback itself produces a valid rich result.
- [x] T-005: add the `/faq` route at `app/[locale]/faq/page.tsx` mirroring `/cookies`, with the site name in `<title>` so it clears the 10-character e2e floor.
- [x] T-006: wire the `.md` mirror — `faq` in `ALLOWED_STATIC_SLUGS` / `TITLES` / `DEFAULT_BODIES` and in both `next.config.ts` `staticSlug` rewrite groups.
- [x] T-007: wire discovery — `/faq` in `sitemap.ts` `STATIC_ROUTES`, in `robots.ts` `sharedAllow`, and `/faq.md` in `llms.txt`.
- [x] T-008: wire navigation — footer `productLinks` and header `MENU_ITEMS_CONFIG`.
- [x] T-009: add `common.FAQ`, `footer.FAQ`, `pages.FAQ_BADGE`, `pages.FAQ_META_DESCRIPTION`, `pages.FAQ_INTRO` and `pages.HELP_DESCRIPTION` to all 21 `apps/web/messages/*.json` files with per-locale translations.
- [x] T-010: add `apps/web-e2e/tests/public/faq.spec.ts` (status, h1 + content length, FAQPage JSON-LD validity, canonical + markdown alternate, `/faq.md`, footer link, sitemap entry).
- [x] T-011: add `/faq` to the existing route matrices — `route-coverage-matrix`, `static-info-pages-content`, `static-info-locale-prefix`, `md-mirror-routes`, and `helpers/test-data.ts`.
- [x] T-012: correct `docs/features/seo.md` so its `FAQPage` claim points at real code, and document the content contract.
- [x] T-013: write this spec/plan/tasks trio, the `docs/spec/README.md` index row, the `docs/log.md` line and the `docs/questions.md` entry (Q-046a).
- [x] T-014: verify — `tsc --noEmit`, `lint`, `build:web`.
- [ ] T-015: commit `pages/faq.en.md` to the demo data repository (`ever-works/awesome-time-tracking-data`). Out of this repo's scope; the built-in fallback covers every site until it lands.
- [x] T-016: add `apps/web/lib/seo/__tests__/faq-parser.spec.ts` (`node:test`), covering emphasis handling, literal `snake_case` / `5*3`, HTML and comment removal, tag-reassembly resistance, heading extraction, frontmatter validation and the `faqs: []` opt-out.
- [x] T-017: address review findings — keep literal `*` / `_` out of the emphasis stripper, replace the single-pass HTML regex with a scanner run to a fixpoint (CodeQL `js/incomplete-multi-character-sanitization`), and give `renderStaticPageMarkdown` the same empty-body fallback the HTML pages use so `/faq` and `/faq.md` cannot disagree.
- [x] T-018: second review round on the same reduction — protect code spans and fenced blocks from every other rule, allow intra-word `*` emphasis (but not `_`) per CommonMark, run the emphasis rules to a fixpoint so nested spans unwrap, and accept any `##`–`######` question heading in the `/faq.md` e2e assertion.

## Acceptance criteria → task map

| AC   | Tasks                |
| ---- | -------------------- |
| AC-1 | T-005                |
| AC-2 | T-004, T-005         |
| AC-3 | T-001, T-002, T-003  |
| AC-4 | T-001, T-003         |
| AC-5 | T-008                |
| AC-6 | T-007                |
| AC-7 | T-006                |
| AC-8 | T-005                |
| AC-9 | T-009                |
| AC-10 | T-002, T-016, T-017, T-018 |
| AC-11 | T-006, T-016, T-017 |
