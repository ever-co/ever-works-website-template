---
id: spec-047-md-mirror-route-reachability-plan
title: Spec 047 — Plan
sidebar_label: 047 Plan
---

# Implementation plan — `047-md-mirror-route-reachability`

## Constitution check

| Article | Check |
| --- | --- |
| I — Plugin-First Architecture | No new feature surface; this repairs an existing core route surface. No plugin boundary is crossed. |
| II — TypeScript Everywhere | Only `.ts` files change. |
| III — Spec Before Code | Spec, plan and `docs/log.md` entry ship in the same PR as the code. |
| IV — Documentation as a First-Class Citizen | `docs/features/seo.md` updated; this spec is indexed in `docs/spec/README.md`. |
| V — Performance Budget | Route handlers are unchanged (`revalidate` values kept); the rewrites resolve in the router, not at render time. |
| VI — Latest Stable Frameworks | No dependency change. |
| VII — Reuse Before Build | No new utility; `lib/i18n/locales.ts` *removes* a would-be duplicate of `DEFAULT_LOCALE` by making `lib/constants.ts` re-export it. |
| VIII — No Removal Without Migration | Nothing is removed. The seven handlers are renamed in place (`git mv`), every public URL is preserved byte-for-byte, and the e2e guard is strengthened rather than deleted. |
| IX — Test Coverage Bar | `md-mirror-routes.spec.ts` is rewritten to assert the real contract and mutation-tested against the unfixed source. |
| X — Modular Packages | No new package surface; the change stays inside `apps/web` and `apps/web-e2e`. |

## Steps

1. **Confirm the diagnosis empirically.** Production build of `origin/develop`,
   `next start`, request every advertised `.md` URL plus the raw rewrite
   destinations. Record the status codes. Cross-check against the route table
   `next build` prints (no `_md` / `_static-md` entries).
2. **Rewrite the guard first.** Replace the `status < 500` assertions in
   `apps/web-e2e/tests/public/md-mirror-routes.spec.ts` with exact ones:
   `200`, `text/markdown`, `X-Robots-Tag: noindex`, a body opening with an H1
   and naming the canonical page it mirrors. Discover a real item slug,
   category and tag from `/items.json` so the spec works against both the demo
   content repo and the CI content stub. Cover a non-default locale and the
   unknown-slug 404s.
3. **Mutation-check.** Run the new spec against the *unfixed* build; it must
   fail. Record the counts.
4. **Rename the seven handler folders** with `git mv` (`_md` → `md`,
   `_static-md` → `static-md`) and update their doc comments.
5. **Update the rewrites** in `apps/web/next.config.ts` to the new segment,
   give the unprefixed sources an explicit default-locale destination, and
   build the locale group from `LOCALES` so an unsupported locale is not
   served.
6. **Extract `DEFAULT_LOCALE` / `LOCALES`** into `apps/web/lib/i18n/locales.ts`
   (no imports, so `next.config.ts` can read them) and re-export from
   `apps/web/lib/constants.ts`.
7. **404 unknown category / tag slugs** in the two mirrors that soft-404'd,
   matching their HTML pages.
8. **Verify.** Rebuild, re-probe every URL, run the spec (must pass), plus
   `typecheck` on `apps/web` and `apps/web-e2e` and the repo's Prettier check
   on the touched files.

## Risks

- **A new public segment.** `/en/items/<slug>/md` becomes reachable. Mitigated
  by the `X-Robots-Tag: noindex` the handlers already send, and by their
  absence from the sitemap. The alternative (route group) is not available —
  see the spec's Approach section.
- **A tag or category literally named `md`.** `/tags/md/md` still resolves the
  tag correctly; the static `md` segment only shadows a *sub*-path of a tag,
  and no such sub-path exists (`/tags/[tag]` has no children other than this
  handler).
- **`lib/constants.ts` is imported very widely.** The change there is a
  re-export, so its public surface (`DEFAULT_LOCALE`, `LOCALES`, `Locale`) is
  identical; `tsc --noEmit` over `apps/web` covers it.
