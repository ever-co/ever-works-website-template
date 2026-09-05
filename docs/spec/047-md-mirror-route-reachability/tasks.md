---
id: spec-047-md-mirror-route-reachability-tasks
title: Spec 047 — Tasks
sidebar_label: 047 Tasks
---

# Tasks — `047-md-mirror-route-reachability`

Each task ends in a verification step. `[x]` = done in PR #1050.

## T1 — Confirm the diagnosis empirically

- [x] Production build of `origin/develop` (`next build && next start`) and
      request every advertised `.md` URL plus the raw rewrite destinations.
- [x] Cross-check against the route table `next build` prints.
- **Verification.** All mirror URLs `404 text/html`; the route table contains
      no `_md` / `_static-md` entry.

## T2 — Rewrite the guard before touching the source

- [x] Replace the `status < 500` / `status < 400` assertions in
      `apps/web-e2e/tests/public/md-mirror-routes.spec.ts` with the real
      contract: exactly `200`, `^text/markdown`, `X-Robots-Tag: noindex`, a
      body opening with an H1 whose canonical URL pathname is the page being
      mirrored.
- [x] Discover the item / category / tag from `/items.json`, the collection and
      comparison from their listing pages, and the CMS page by probing the
      conventional slugs — no hard-coded fixtures.
- [x] Cover a non-default locale, an unsupported locale, and the unknown-slug
      404s (asserting the handler's JSON envelope, not merely the status).
- [x] Assert the `text/markdown` alternate advertised by `/help` and `/pricing`
      resolves.
- **Verification.** `tsc --noEmit` over `apps/web-e2e` is clean.

## T3 — Mutation-check the guard

- [x] Run the new spec against the **unfixed** build.
- **Verification.** 13 failed / 6 passed of 19 (first revision of the spec).

## T4 — Rename the seven handler folders

- [x] `git mv` `_md` → `md` and `_static-md` → `static-md`; update the doc
      comments in the handlers.
- **Verification.** `next build` route table lists all seven mirror routes.

## T5 — Fix the rewrites

- [x] Point the destinations at the new segment.
- [x] Give the unprefixed sources an explicit default-locale destination.
- [x] Build the locale group from `LOCALES` so an unsupported locale
      (`/zz/about.md`) is not served.
- **Verification.** Isolated by patching only the destinations in a built
      `routes-manifest.json`: unprefixed `404`, locale-prefixed `200`;
      restored, all `200`. `/zz/about.md` `404`s while `/fr/about.md` `200`s.

## T6 — Extract `DEFAULT_LOCALE` / `LOCALES`

- [x] Move them to a dependency-free `apps/web/lib/i18n/locales.ts` that
      `next.config.ts` can import; re-export from `apps/web/lib/constants.ts`.
- **Verification.** `next build`'s TypeScript pass is clean; the built
      `routes-manifest.json` shows `/en/…` destinations.

## T7 — 404 unknown category / tag slugs

- [x] Match the `notFound()` the HTML pages already do, instead of rendering an
      empty listing.
- **Verification.** `/categories/<unknown>.md` and `/tags/<unknown>.md` return
      `404 application/json`; the HTML pages are unchanged.

## T8 — Full verification

- [x] Rebuild, re-probe every URL, run the spec (must pass).
- [x] `tsc --noEmit` over `apps/web-e2e`.
- [x] Run the neighbouring e2e specs on the touched surfaces.
- **Verification.** Mirror spec green; 90 related specs green.

## T9 — Docs

- [x] `spec.md`, `plan.md`, this file, the `docs/spec/README.md` row, the
      `docs/log.md` entry, `docs/questions.md` Q-047a / Q-047b, and the
      correction to `docs/features/seo.md`.

## T10 — Renumber 046 → 047 after the merge collision

- [x] `develop` merged PR #1043 as spec **046** (`works-yml-pricing-config`)
      while this branch was open, so both the directory name and the
      `Q-046a` / `Q-046b` identifiers collided. Renamed the directory to
      `047-md-mirror-route-reachability`, renumbered the front-matter ids,
      the questions, the `docs/log.md` entry, the index row and every
      cross-reference; merged `develop` into the branch.
- **Verification.** `docs/spec/` holds one `046-…` and one `047-…` directory;
      `docs/questions.md` defines `Q-046a` / `Q-046b` once (pricing) and
      `Q-047a` / `Q-047b` once (mirrors); the T1/T8 mirror probe was re-run on
      the merged head (production build, cold `.next`) — every mirror family
      `200 text/markdown` in the default and a prefixed locale.
