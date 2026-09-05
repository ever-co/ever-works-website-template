---
id: log
title: Documentation & Specs Change Log
sidebar_label: Change Log
sidebar_position: 99
---

# Documentation & Specs Change Log

## 2026-09-03

- `spec-046`: added the visitor-facing FAQ page at `/faq` — content from the data repository (`pages/faq.<locale>.md`) with a built-in fallback FAQ, `FAQPage` JSON-LD generated from that content, footer + More-menu entries, sitemap / robots / `llms.txt` / `/faq.md` mirror wiring, i18n keys in all 21 locales, and Playwright coverage ([spec 046](spec/046-faq-page/spec.md), EW-47, PR #1044).
- `docs/features`: added `faq-page.md` (content contract, question detection, defaults and discovery) and indexed it in the docs sidebar ([spec 046](spec/046-faq-page/spec.md), PR #1044).
- `docs/features`: `seo.md` documented a `FAQPage` generator that did not exist; `lib/seo/schema.ts` now has one, and the page describes how the content contract drives it ([spec 046](spec/046-faq-page/spec.md), PR #1044).
- `questions`: added Q-046a — should the FAQ render as an accordion rather than plain prose ([spec 046](spec/046-faq-page/spec.md), PR #1044).
- `spec-046`: review follow-ups — the Markdown-to-text reduction that feeds the schema now keeps literal `*` and `_` (a page rendering `snake_case` was published as `snakecase`), removes raw HTML with a scanner run to a fixpoint instead of one `String.replace` pass (CodeQL `js/incomplete-multi-character-sanitization`), and `renderStaticPageMarkdown` falls back on an empty body the way the HTML pages already did, so no static page and its `.md` mirror can disagree. Added `apps/web/lib/seo/__tests__/faq-parser.spec.ts` ([spec 046](spec/046-faq-page/spec.md), PR #1044).
- `spec-046`: further review follow-ups on the same reduction — code spans and fenced blocks are now lifted out before any other rule and restored last (a page rendering `` `_setup_` `` was marked up as `_setup_` losing its underscores), `*` may open and close inside a word as CommonMark specifies while `_` may not, and the emphasis rules run to a fixpoint so nested spans such as `**bold *nested* text**` no longer leave their outer delimiters in the schema ([spec 046](spec/046-faq-page/spec.md), PR #1044).

## 2026-08-25

- `spec-045`: documented and hardened the shared handler/`POST /api/stripe/platform-webhook` path, including HMAC fail-closed coverage, formatted payment amounts, and retry-safe event coordination ([spec 045](spec/045-shared-stripe-webhook-relay/spec.md), PR #1037).

A running log of meaningful changes to documentation, specs, and the
project's living-document set (constitution, agent rules, plans). One
line per change, newest at the top. Every line follows the form:

```
YYYY-MM-DD area: short summary
```

Where **area** is one of:

- `docs/<section>` — a docs page.
- `spec-NNN` — a feature spec under `docs/spec/NNN-…/`.
- `constitution` — an amendment to `.specify/memory/constitution.md`.
- `agents` — `AGENTS.md` change.
- `claude` — `CLAUDE.md` change.
- `index` — `docs/index.md` change.
- `questions` — `docs/questions.md` change.

This file lives in the docs site and acts as a hand-maintained
companion to git history. Use this when reading **what changed and
why** at a higher level than per-commit diffs.

---

## 2026-08-23 — Chore: force LF for container scripts (.gitattributes)

- infra: `docker-entrypoint.sh`, `*.sh` and the Dockerfiles are now `text eol=lf` in `.gitattributes`. A Windows checkout (`core.autocrlf=true`) produced `#!/bin/sh` and the built site image died with `exec /usr/local/bin/docker-entrypoint.sh: no such file or directory` (2026-08-23, local image build while the CI runner pool was stalled). No runtime change for CI-built images. (PR: pending)

## 2026-08-22

- spec-042: site identity metadata — `<title>` / meta description / `og:site_name` / WebSite JSON-LD / OG images now resolve from the Work's `.works/works.yml` (`company_name`, `name`, `settings.homepage.hero_*`) via `lib/seo/site-identity.ts` when `NEXT_PUBLIC_SITE_*` are unset ([spec](spec/042-site-identity-metadata/spec.md), #1019)
- spec-043: `/docs` API reference embed fixed — route-scoped `X-Frame-Options: SAMEORIGIN` + CSP (`frame-ancestors 'self'`, `cdn.jsdelivr.net`) for `/api/reference` in `next.config.ts`; e2e asserts the headers and that the iframe document mounts ([spec](spec/043-docs-api-reference-embed/spec.md))
## 2026-08-22 — Feat: public payment config served at runtime (spec 044)

- spec-044: platform-deployed k8s Works are built once by `k8s-build.yml` with
  no per-Work env, so `NEXT_PUBLIC_*` is never inlined into the browser bundle.
  Client code that read `process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` /
  `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING` / `NEXT_PUBLIC_DEMO` directly
  (`LayoutThemeContext.getConfiguredProviders`, `stripe-payment-modal`,
  `add-payment-method-modal`, `use-stripe-products`, `use-payment-availability`)
  therefore saw `undefined` even when the server had `STRIPE_SECRET_KEY` et al. —
  every platform-deployed `/pricing` rendered only the FREE card plus a "Payment
  failed: Payment system is not configured" toast on load.
  ([spec](spec/044-public-payment-config/spec.md))
- New `GET /api/payment/public-config` (`force-dynamic`, `Cache-Control: no-store`)
  returns `{ stripePublishableKey, dynamicPricing, demo, configuredProviders }`
  from the server's runtime env — public values only, never secrets. Shared pure
  reader `apps/web/lib/payment/public-config.ts`; new React Query hook
  `apps/web/hooks/use-public-payment-config.ts` (`initialData` from build-time
  `process.env`, 5-min stale, works without a `QueryClientProvider` by falling
  back to the shared browser client) layers runtime values over the inlined ones,
  so Vercel/demo builds keep first-paint behaviour and an unavailable route
  degrades to pre-044.
- Consumers switched: `LayoutThemeContext` (`configuredProviders`),
  `PaymentFormModal` (key from hook; the "not configured" error effect now only
  fires while `isOpen` and after the fetch settled — a closed modal never toasts),
  `AddPaymentMethodModal` (`loadStripe` from the runtime key instead of a
  module-level `loadStripe(process.env…!)`), `useStripeProducts` /
  `useDynamicPricingStatus` / `usePricingSection` (`useStripeDynamicPricingEnabled()`),
  `usePaymentAvailability` (`demo` from hook; SSR default kept until the first
  fetch settles). e2e: `apps/web-e2e/tests/api/payment-public-config.spec.ts`.
  Docs: `docs/payment/stripe.md` runtime-key tip, `.env.example` note.
  PR #1023.
- questions: added Q-044a — should `[locale]/layout.tsx` also seed the public
  payment config as a server prop (zero-request first paint)? Default: route +
  hook only.

## 2026-06-17 — Feat: deploy_k8s.yaml multi-host Ingress (K8S_EXTRA_HOSTS)

- spec-041: EW-741 (ever-works PR #1322) made `DeployService` push a new
  `K8S_EXTRA_HOSTS` repo secret on every k8s deploy — comma-separated,
  lowercased, deduped list of `WorkCustomDomain` rows for the Work — but
  `deploy_k8s.yaml` was still rendering a single `spec.rules` entry +
  `spec.tls` block for the primary `K8S_INGRESS_HOST`. Adding a custom
  domain in the Deploy tab therefore had no observable effect after
  redeploy; the cluster Ingress only knew the managed `*.ever.works`
  subdomain.
- "Render and apply manifests" step now builds a `HOSTS=()` array (primary
  first, then split `K8S_EXTRA_HOSTS` by `,`, lowercased + deduped by a
  `seen` set), loops the array when emitting `spec.rules`, and loops it
  again when emitting `spec.tls` so cert-manager issues a separate cert
  per host. Per-host TLS `secretName` uses the same
  `tr -c 'a-z0-9' '-' | sed …` collapse the original single-host path
  used, so the managed `*.ever.works` host's existing TLS secret keeps its
  name and cert-manager does not re-issue.
- "Deployment summary" step now also echoes one `Also serving https://…`
  line per extra host so multi-host deploys are discoverable in the
  Actions run log.
- Backwards-compatible: when `K8S_EXTRA_HOSTS` is empty / unset the
  rendered Ingress is byte-identical to pre-EW-741 output.

## 2026-06-17 — Feat: instant sparkline bump + flicker-free rollback on upvote

- spec-037: the item-detail Statistics card already tracked total votes
  optimistically via `useItemVote`'s `setQueryData(['item-votes', …])`, but
  the sparkline (today's bar) and the activity totals lagged a full network
  round-trip behind the vote button — and a failed mutation triggered a
  cache refetch instead of a snapshot rollback, producing a brief flicker.
- Exported `ITEM_ACTIVITY_QUERY_KEY` + `ItemActivityPayload` from
  `apps/web/components/item-detail/item-stats-section.tsx` so mutators can
  surgically patch the activity cache without restating the cache key.
- `apps/web/hooks/use-item-vote.ts` now `cancelQueries` for both
  `['item-votes', id]` and `[ITEM_ACTIVITY_QUERY_KEY, id]` before
  snapshotting, derives the signed delta inside `setQueryData(old)` so the
  count + userVote + activity bump stay consistent under concurrent
  refetches, applies that same delta to the activity totals + today's
  sparkline point on the same frame as the vote, and on error restores
  the snapshot via `setQueryData(key, value)` to avoid the refetch flicker.
  `onSuccess` still invalidates the activity query so the next render
  reconciles with the authoritative server count.
- Credits @joel-kalema (rebased from #945 onto fresh develop). PR #961.

## 2026-06-16 — Fix: CI-safe git-CMS writes + favorite-toggle e2e race

- spec-039: the e2e suite's authenticated write-flow specs (admin create
  collection, client submit item, favorite toggle) timed out at ~30s in CI.
  Two causes: (1) `CollectionGitService`/`ItemGitService` `pull` on init and
  `push` after each write hit the unreachable CI content remote with no HTTP
  timeout, blocking the POST past the redirect/modal wait — added
  `isContentGitRemoteDisabled()` (`apps/web/lib/services/content-git-offline.ts`,
  gated on `CI`/`CONTENT_GIT_OFFLINE`) and guarded `syncWithRemote` + `push` in
  both services; runtime (no `CI`) still pushes. Also added an in-flight
  git-service init lock to `item.repository.ts`/`collection.repository.ts`
  (parallel CI workers no longer init isomorphic-git on the same `.git` at
  once). (2) Favorites are DB-backed; an early click before `useCurrentUser`
  resolved opened the login modal whose backdrop then ate clicks — hardened
  `clickFavorite()` in `apps/web-e2e/page-objects/public/item-detail.page.ts`
  to dismiss the modal and only count a click that flips the label. No prod
  behaviour change; no tests skipped. See `docs/spec/039-e2e-git-cms-ci-safe/spec.md`.

---

## 2026-06-16 — Feat: k8s deploy provisions Work runtime env

- spec-040: k8s-deployed directory sites 500 at first render (`[auth] AUTH_SECRET must be set in production`) because the Deployment only carried NODE_ENV/PORT/HOSTNAME. Added a `deploy_k8s.yaml` step that materializes a `${WORK_SLUG}-runtime-env` Secret from the AUTH_SECRET/COOKIE_SECRET/COOKIE_SECURE/DATABASE_URL secrets the platform pushes (+ NEXT_PUBLIC_APP_URL/COOKIE_DOMAIN from the ingress host), and `deployment.yaml` mounts it via `envFrom` (optional). Platform half: ever-works DeployService.ensureRuntimeEnv + WorkRuntimeEnvService. See `docs/spec/040-k8s-deploy-runtime-env/spec.md`. (PR: pending)

---

## 2026-06-15 — Fix: k8s deploy probe timeouts (startup/readiness/liveness)

- spec-038: the k8s deploy manifest template `.deploy/k8s-platform/deployment.yaml`
  defined `readinessProbe` / `livenessProbe` on `/` with no `timeoutSeconds`, so
  both inherited Kubernetes' 1-second default. A server-rendered `/` on a small
  shared node routinely exceeds 1s, so the liveness probe failed its default 3
  attempts and kubelet killed the container in a permanent restart loop
  (observed: 460+ restarts, `Exit Code: 143`, on the first k8s-deployed Work
  `awesome-compliance-automation-website`). Added an explicit `startupProbe`
  (≈5 min budget for first response before liveness/readiness apply) and set
  `timeoutSeconds: 5` plus `failureThreshold` on readiness (3) and liveness (6).
  No app code or image change; affects only deployed Works' pod health gating.
  Propagation to existing per-repo `awesome-*` copies is tracked in the
  Vercel→k8s migration runbook. See `docs/spec/038-k8s-deploy-probes/spec.md`.
  (PR: pending)

---

## 2026-06-13 — Docs: Neon database integration in the Vercel deploy guide

- docs/deployment: documented setting up the database via the Neon Vercel
  Marketplace integration in `deployment/vercel.md`, with the recommended
  integration settings (env var prefix `DATABASE`, Production branch on,
  **Preview branch off**) and a warning that per-preview database branches
  can balloon into hundreds of branches and a large bill.

## 2026-05-27 — Perf: item-detail first paint — stream similar-items, persist + parallelize

- spec-037: fixed blank/slow first paint on `/[locale]/items/[slug]`. The page
  used to `await` the similar-items computation (a full-catalogue scan via
  `fetchItems`) before returning any HTML, blocking first paint on a
  below-the-fold carousel. Now the carousel is **streamed** behind its own
  `<Suspense>` boundary in `components/item-detail/item-detail.tsx` (React 19
  `use()` + a server-created `similarItemsPromise` passed down from the page),
  so the hero/content/sidebar paint immediately and the rail arrives a beat
  later with a skeleton. Also added `getCachedSimilarItems` in
  `apps/web/lib/content.ts` (wraps `fetchSimilarItems` in `unstable_cache`,
  keyed by slug + locale + maxResults, pinned to the content revision, tagged
  `content`/`items`/`item:<slug>`) so the scored list survives serverless cold
  starts / is shared across instances, and parallelized the page's item +
  translations loads (`Promise.all`). Final markup and item ordering unchanged.
  See `docs/spec/037-item-detail-perf/spec.md`. (PR: draft)

---

## 2026-05-27 — Fix: Edge Runtime build break in activity-feed push client

- spec-024: replaced the `import { randomUUID } from 'node:crypto'` at the top of
  `apps/web/lib/services/platform-activity-feed/push-client.ts` with
  `crypto.randomUUID()` (Web Crypto API). The module is transitively imported
  from edge-compatible bundles (`instrumentation.ts`, the NextAuth adapter in
  `lib/auth/index.ts`, and `lib/content-config-file.ts` → `/api/admin/navigation`),
  so Turbopack rejected the `node:*` import with "A Node.js module is loaded
  ('node:crypto') which is not supported in the Edge Runtime" and the resulting
  `Ecmascript file had an error` blocked the `[locale]/submit` page from
  rendering — which in turn failed the `client can submit a new item via the
submit form` Playwright test (button never appeared, hence
  `missing-required-fields="<unreadable>"`). Spec 024's plan.md:90 already
  prescribed `crypto.randomUUID()`; the original import was a deviation. Web
  Crypto's `randomUUID` is available in Node 20+ (this repo's minimum) and the
  Edge Runtime, so no behavior change beyond removing the build-time error.

---

## 2026-05-27 — Spec 036: Docker build and publish workflow

- spec-036: added `.github/workflows/docker-build-publish-dev.yml`,
  `.github/workflows/docker-build-publish-stage.yml`, and
  `.github/workflows/docker-build-publish-prod.yml`, GHCR-first Docker
  build/publish workflows for the template's root `Dockerfile`. The Dockerfile
  now mirrors the sibling `../ever-works` monorepo image shape with
  `turbo prune @ever-works/web --docker`, pruned install/build stages, and a
  standalone Next.js runtime image; `turbo.json` now allows `STANDALONE_BUILD`
  through to the Next.js build so `.next/standalone` is emitted. The workflows mirror the sibling
  `../ever-works` branch-specific registry pattern while adapting it to
  the template's single web image: `develop` publishes
  `directory-web-template-dev`, `stage` publishes
  `directory-web-template-stage`, and `main` publishes
  `directory-web-template`, each tagged `latest` and short SHA. Docker Hub and
  DigitalOcean Container Registry pushes are included only when their
  credentials are configured. Documented the workflows in
  `docs/deployment/docker.md`.

---

## 2026-05-26 — Spec 035: Admin header profile link

- spec-035: drafted `docs/spec/035-admin-header-profile-link/spec.md` and
  shipped the fix in the same PR (EWW-5). The admin branch of the shared
  `ProfileButton` dropdown (`apps/web/components/profile-button/menu-items.tsx`)
  omitted the "Your Profile" link the non-admin branch has, so an admin had no
  link to their own profile; added it, reusing the existing
  `common.YOUR_PROFILE` / `common.YOUR_PROFILE_DESC` i18n keys. The `/admin`
  panel header (`apps/web/app/[locale]/admin/layout-client.tsx`) keeps its
  `Admin Panel` label unchanged (an earlier revision added a header button, then
  reverted it per review feedback). (Spec was originally numbered 034 in the PR
  branch but renumbered to 035 on merge to avoid collision with the already-
  merged spec-034 Client Billing UI consistency.)

---

## 2026-05-26 — Spec 034: Client Billing — wire placeholder actions

- spec-034: connected previously-dead billing controls to real behaviour
  (EW-649). Export / Export Results → client-side CSV via new
  `lib/utils/billing-csv.ts`; View History → Payment History tab; status
  filter checkboxes lifted to the page and actually applied; Date Range →
  opens advanced filters; payment-card Download → `invoiceUrl`; LemonSqueezy
  Cancel Plan → `POST /api/lemonsqueezy/cancel` via existing
  `useSubscriptionActions` (confirm + toast + refresh; removed `console.log`
    - orphan modal state); Modify Plan → `/pricing`; View Details → details
      disclosure; Contact Support → `mailto:`. No new API routes.

## 2026-05-26 — Spec 034: Client Billing page UI consistency

- spec-034: drafted `docs/spec/034-client-billing-ui-consistency/spec.md` and
  shipped the implementation in the same PR (EW-649). UI-only realignment of
  `/client/settings/profile/billing` (and its `components/settings/billing/**`
  sub-components) with the **client dashboard** design system: neutral palette
  (dropped all `slate-*` and `theme-primary-*`), `bg-white dark:bg-white/3`
  card surfaces with `border-neutral-200 dark:border-white/8`, monochrome icon
  tiles, `neutral-900 / white` primary CTAs. Rewrote the KPI cards
  (`billing-stats.tsx`) to mirror the dashboard `StatsCard` (no gradients) and
  the tab bar (`tab-navigation.tsx`) to the dashboard underline tabs; matched
  the page header to `DashboardHeader`. Routed page-level hardcoded strings
  through the `billing` i18n namespace (new keys `FREE`, `UPGRADE`,
  `RENEWS_ON`, `UPGRADE_UNLOCK_FEATURES`, `DAYS_LEFT`, `DAYS_TOTAL` in
  `messages/en.json`; non-English locales fall back via the existing
  `deepmerge` config). No functional/data changes.

## 2026-05-25 — Spec 033: Client profile Security & Billing blocks

- spec-033: drafted `docs/spec/033-client-profile-security-billing/spec.md`
  and shipped the implementation in the same PR (EW-648). Adds two
  **owner-only** read-only blocks to the bottom of the right column on
  `/[locale]/client/profile/[username]`: **Security & Status**
  (`apps/web/components/profile/sections/security-status-section.tsx` —
  email verification, two-factor, account status, member-since, link to
  `/client/settings/security`) and **Billing & Plans**
  (`billing-plans-section.tsx` — plan, account type, currency, links to
  `/client/settings/profile/billing` + `/pricing`, Upgrade CTA on the free
  plan). Both are pure async server components fed from data already loaded
  by the page; the account-private fields (`status`, `plan`, `accountType`,
  `twoFactorEnabled`, `currency`) that `toPublicClientProfile` strips are
  read from the unprojected `rawProfile`, gated by `effectiveIsOwn` (so
  they are hidden from visitors and in `?preview=public`). New English keys
  added under the `profile` namespace in `messages/en.json` and translated
  into all 20 other locales (ar, bg, de, es, fr, he, hi, id, it, ja, ko, nl,
  pl, pt, ru, th, tr, uk, vi, zh); the `deepmerge(en, locale)` fallback in
  `i18n/request.ts` remains as a safety net. No new queries, hooks,
  dependencies, or schema changes. (PR: #930, draft)

## 2026-05-24 — /submit: fix step-1 progress jumping to 100%

- `apps/web/components/directory/details-form/components/step-indicator.tsx`
    - `.../validation/form-validators.ts`: step 1's progress bar/checkmark
      jumped straight to 100% once Product Name + URL were filled, because the
      connector fill short-circuited to 100% on the navigation-gate fields
      (`['name','link']`). Reworked it to be proportional to the actually-tracked
      fields and reset step 1's `progressFields` to the five visible inputs
      (`link`, `name`, `category`, `tags`, `description`). Category/Tags are
      filtered out of the count when those features are disabled in settings, so
      the bar can still reach 100%. The step is now marked complete only when all
      applicable tracked fields are filled.

## 2026-05-24 — /submit: hide pricing-only promo sections in payment step

- `apps/web/components/pricing/pricing-section.tsx`: gated the "Sponsor Ads"
  promo block, the "Enhanced Continue Section" (its own continue-to-/submit
  CTA), and the "Trust Section" behind `!isReview` so they render only on the
  standalone `/pricing` page, not when `PricingSection` is embedded as the
  submit-flow payment step (`PaymentStep` passes `isReview`). Matches the
  existing `!isReview` gating used for the section's decorative background and
  header; the submit flow has its own form navigation, so the continue CTA was
  redundant there.

## 2026-05-24 — i18n: translate remaining hard-coded strings on /submit

- `apps/web/components/submit/submit-form-client.tsx`,
  `apps/web/components/directory/details-form/steps/basic-info-step.tsx`,
  `.../components/step-indicator.tsx`, `.../details-form.tsx`,
  `.../validation/form-validators.ts`: replaced the last hard-coded English
  strings on the submit page with `next-intl` keys — the four submit toast
  messages (invalid URL / success / failed / generic error), the Video URL
  field label, the video-preview iframe title, the rich-text editor
  placeholder (reused existing `DETAILED_INTRODUCTION_PLACEHOLDER`), and the
  three step-indicator/header titles (Basic Information / Payment / Review,
  via a new `titleKey` on each `StepDefinition`). Added 9 new
  `directory.DETAILS_FORM` keys (`VIDEO_URL_LABEL`, `VIDEO_PREVIEW`,
  `STEP_TITLE_BASIC_INFO/PAYMENT/REVIEW`,
  `TOAST_INVALID_URL/SUBMIT_SUCCESS/SUBMIT_FAILED/SUBMIT_ERROR`) across all 21
  locale files. No behaviour change.

## 2026-05-24 — Fix: /submit drops location and extra categories

- `apps/web/components/submit/submit-form-client.tsx`: the submit handler built
  its API payload from the singular `category` field (first selected id only)
  and omitted `location` entirely, so a multi-category selection silently lost
  every category after the first, and any location collected by `LocationFields`
  (including when `requireLocationOnSubmit` gates the form) was discarded before
  reaching `POST /api/client/items`. The payload now sends the full
  `categories` array when present and includes `location` when set — both are
  already supported by `ClientCreateItemRequest` and persisted by
  `ClientItemRepository.createAsClient`. UI-only fix; no API/schema changes.

---

## 2026-05-21 — Spec 032: Collection icon picker — implementation

- spec-032: drafted `docs/spec/032-collection-icon-picker/spec.md` and shipped
  the implementation in the same PR. Replaces the bare **Icon (emoji or URL)**
  input on the `/admin/collections` Create / Edit modal with a co-located
  `EmojiIconInput` (`apps/web/components/admin/collections/emoji-icon-input.tsx`
    - curated `emoji-data.ts`). Typing `:` opens a GitHub-/Discord-style
      suggestion popover with keyboard nav (arrows, Enter/Tab, Esc, Home/End),
      debounced-via-`useDeferredValue` search, exact-shortname auto-replace on
      trailing space, a recent-picks chip backed by a versioned-key
      `localStorage` store (`evw_admin_collections_recent_emojis_v1`,
      16-entry cap), and a 40×40 preview tile that renders the value as an emoji
      glyph or, for `https://…` / `/relative` / `data:image/…` values, an
      `<img>`. Existing URL paste behaviour is unchanged and the underlying
      `icon_url` field still stores a single Unicode glyph or a raw URL — no
      backend changes. Zero new dependencies: the curated dataset is ~300
      entries inline. Jira: EW-646. PR: #920.

---

## 2026-05-20 — Spec 031: client Danger Zone (account deletion UI) — draft

- spec-031: drafted `docs/spec/031-client-danger-zone/spec.md` proposing
  a new red-accented **Danger Zone** section at the bottom of
  `/client/settings`, plus a dedicated `/client/settings/danger-zone`
  sub-page that exposes the existing `deleteAccount` server action
  (`apps/web/app/[locale]/auth/actions.ts`) via a password-confirmed
  modal. No backend changes — wires the already-shipped soft-delete +
  activity log flow into the UI for the first time. Tracked under
  [EW-635](https://evertech.atlassian.net/browse/EW-635). PR pending.

## 2026-05-20 — Profile visibility toggle (Upwork-style)

- New `client_profiles.profile_visibility` column (`public` | `private`,
  default `public`). Migration `0038_add_client_profile_visibility.sql`,
  additive and idempotent.
- New settings page at `/client/settings/profile/visibility` with an
  Upwork-style toggle plus side-by-side "Public / Private" radio cards
  spelling out the trade-offs (directory listing, link visibility,
  follower/portfolio exposure).
- `PATCH /api/user/profile` now accepts `profileVisibility`.
- Public profile page `/client/profile/[username]` shows a "this profile
  is private" placeholder to non-owners when visibility is `private`.
- Owner-only "Preview public view" toggle on the profile page
  (`?preview=public`) renders the page exactly as a visitor sees it.
- Privacy hardening on the public profile render:
    - Stopped leaking email local-part as username/displayName fallback.
    - `RecentActivitySection` (comments, favourites, follow ledger) is
      now owner-only — matches LinkedIn/GitHub/Upwork.
    - Free-form `location` text now respects `locationPrivacy` ('private'
      hides it from non-owners, same as lat/long).
    - New `toPublicClientProfile()` projection in `client.queries.ts`
      drops `email`, `phone`, `notes`, `tags`, `tenantId`, `twoFactorEnabled`,
      moderation flags, billing flags and raw geo from the page payload.
- Owners always see their own profile regardless of setting.
- Spec doc deferred per request — feature ships PR-only.

## 2026-05-20 — Spec 027 follow-up: page-based pagination on /client + /admin notifications (PR #852)

- spec-027: `/client/notifications` and `/admin/notifications` long lists
  now ship with `UniversalPagination` (Page X of Y, prev/next) instead of
  cursor-based infinite scroll.
- API: `GET /api/client/notifications` and `GET /api/admin/notifications`
  switched to offset/limit and return `{notifications, total, page,
totalPages, unreadCount}`. Defaults: limit 25, max 100 (client) / 200
  (admin). Unread count still uses base scope so the header pill is
  stable while filters narrow.
- Hooks: `useNotifications` swaps `useInfiniteQuery` → `useQuery` with
  `placeholderData: prev` for snappy page hops. `useAdminNotifications`
  now accepts `{page, limit}` and exposes `totalPages` / `total` / `page`.
- Cache: mark / bulk / SSE mutations rewritten to mutate the flat
  `NotificationListResponse` shape instead of `InfiniteData<ListPages>`.
  `NotificationList` dropped its `IntersectionObserver` + sentinel; the
  dropdown still asks for page 1, limit 15.
- UX: changing tab or filters resets `page` to 1 on both surfaces.

## 2026-05-19 — Spec 030: `/client/submissions` UI redesign (UI-only, develop-only)

- spec-030: drafted `docs/spec/030-client-submissions-redesign/spec.md`
  proposing a UI-only redesign of the client submissions page —
  responsive table/cards layout, KPI stats cards, status segmented
  tabs + sort UX, polished empty / error / skeleton states. No
  backend or hook contract changes. Renumbered from 029 → 030 during
  conflict resolution to avoid collision with the merged spec
  `029-client-settings-preferences-section`.
- docs/spec: indexed spec 030 in `docs/spec/README.md`.

---

## 2026-05-19 — Spec 028 round 17: leading-slash + host header + preferences gate (develop-only)

Round 17 of the rolling e2e coverage buildout. 8 new spec files added on
`develop` only (no cascade per operator instructions). Focus areas:

URL / host security:

- `public/listing-with-multiple-leading-slashes.spec.ts` — `//host` no off-site redirect.
- `public/listing-with-fake-host-header.spec.ts` — Host header spoof no echo.

HTML hygiene:

- `public/listing-href-not-empty-or-hash.spec.ts` — few `href=""/href="#"`.
- `public/listing-html-no-script-no-src.spec.ts` — no empty inline scripts.
- `public/listing-no-deprecated-link-rel.spec.ts` — advisory: deprecated rel.
- `public/listing-no-broken-anchor-content.spec.ts` — no `{{...}}`/`${...}` in anchors.

Pages:

- `public/client-settings-preferences-anonymous.spec.ts` — Spec 029 preferences gate.

API:

- `api/admin-mixed-method-flood.spec.ts` — verb flood × sponsor-ads/comments/etc.

Branch: `feat/e2e-coverage-1779217016`. Admin-merged once CI passes. No
cascade to `stage` / `main` per operator instructions.

---

## 2026-05-19 — Spec 028 round 16: stacked locale + BOM/control + manifest shape (develop-only)

Round 16 of the rolling e2e coverage buildout. 10 new spec files added on
`develop` only (no cascade per operator instructions). Focus areas:

URL / encoding edges:

- `public/listing-with-multiple-locale-prefixes.spec.ts` — `/en/fr/about` stacks.
- `public/listing-bom-and-control-chars.spec.ts` — BOM/null/DEL/control chars.

HTML hygiene:

- `public/listing-overall-page-error-state.spec.ts` — no "undefined"/"NaN"/[object Object] visible.
- `public/listing-no-deprecated-noscript-block.spec.ts` — noscript < 5KB.
- `public/listing-form-submit-without-fields.spec.ts` — empty submit no crash.

Perf + budgets:

- `public/listing-network-resource-budgets.spec.ts` — total JS bytes budget.

Pages:

- `public/admin-survey-deep-anonymous.spec.ts` — admin survey edit/preview/responses + locale + RSC.

API rejection:

- `api/admin-collections-deeper.spec.ts` — collections + items nested CRUD.

Icons / manifest:

- `public/link-favicon-and-apple-touch-icon-shape.spec.ts` — icon hrefs well-formed.
- `public/manifest-shape.spec.ts` — manifest valid JSON with name.

Branch: `feat/e2e-coverage-1779206154`. Admin-merged once CI passes. No
cascade to `stage` / `main` per operator instructions.

---

## 2026-05-19 — Spec 028 round 15: URL malforms + theme/submissions trash + webhook edges (develop-only)

Round 15 of the rolling e2e coverage buildout. 10 new spec files added on
`develop` only (no cascade per operator instructions). Focus areas:

URL malforms:

- `public/listing-with-double-question-mark.spec.ts` — `?a=b?c=d` tolerance.
- `public/listing-with-percent-encoded-slash.spec.ts` — `%2F` in segments.
- `public/listing-with-multi-percent.spec.ts` — double-encoded + emoji segments.
- `public/paging-overflow-large-pages.spec.ts` — page=10000 on listings.

Client settings deeper:

- `public/theme-colors-page-protected.spec.ts` — theme-colors anon + RSC + locale.
- `public/submissions-trash-protected.spec.ts` — trash anon + RSC + locale.

API rejection:

- `api/admin-clients-search-shapes.spec.ts` — advanced-search anonymous.
- `api/webhook-content-type-deeper.spec.ts` — webhooks wrong CT / multipart / empty.
- `api/admin-export-deeper.spec.ts` — items export format/limit variants anon.

HTML hygiene:

- `public/listing-no-trailing-comma-anchor.spec.ts` — no `<a href="/foo,">`.

Branch: `feat/e2e-coverage-1779202525`. Admin-merged once CI passes. No
cascade to `stage` / `main` per operator instructions.

---

## 2026-05-19 — Spec 028 round 14: locale × RSC + perf/CLS + admin CRUD deeper (develop-only)

Round 14 of the rolling e2e coverage buildout. 14 new spec files added on
`develop` only (no cascade per operator instructions). Focus areas:

Locale × RSC bounce:

- `public/admin-i18n-rsc-bounce.spec.ts` — locale × admin × \_rsc anonymous.
- `public/client-i18n-rsc-bounce.spec.ts` — locale × client × \_rsc anonymous.
- `public/sponsor-checkout-rsc-bounce.spec.ts` — /sponsor + \_rsc tolerance.

Perf + CLS + a11y:

- `public/listing-aspect-ratio-images.spec.ts` — img dimensions vs aspect-ratio.
- `public/listing-no-cls-from-late-fonts.spec.ts` — no font-display:block/auto.
- `public/listing-no-dialog-open-without-trigger.spec.ts` — no auto-open dialog.
- `public/listing-no-fixed-position-blocking.spec.ts` — no fullscreen z>1000 overlay.
- `public/listing-no-form-without-action.spec.ts` — forms wire submit.
- `public/auth-pages-input-attributes.spec.ts` — auth inputs email+password.

API + responses:

- `public/listing-response-status-text.spec.ts` — 200 responses declare CT.
- `api/auth-session-no-pii-leak.spec.ts` — anon session no hashes/tokens.
- `api/admin-comments-deeper.spec.ts` — comments CRUD rejection.
- `api/admin-featured-items-deeper.spec.ts` — featured-items CRUD rejection.
- `api/admin-companies-deeper.spec.ts` — companies CRUD rejection.

Branch: `feat/e2e-coverage-1779198954`. Admin-merged once CI passes. No
cascade to `stage` / `main` per operator instructions.

---

## 2026-05-19 — Spec 028 round 13: sitemap variants + HTML hygiene + admin CORS (develop-only)

Round 13 of the rolling e2e coverage buildout. 13 new spec files added on
`develop` only (no cascade per operator instructions). Focus areas:

Sitemap / SEO:

- `public/sitemap-index-shape.spec.ts` — nested sitemap URLs absolute non-5xx.
- `public/sitemap-images-and-news.spec.ts` — image/news/video sitemap variants.
- `public/sitemap-images-and-news-extras.spec.ts` — sitemap alias paths.
- `public/listing-meta-canonical-not-trailing-slash.spec.ts` — canonical host.

Error rendering:

- `public/error-status-content-types.spec.ts` — 404 returns HTML + body.
- `public/listing-redirect-status.spec.ts` — redirect chains end non-5xx.

HTML hygiene:

- `public/listing-html-validity-essentials.spec.ts` — no script src=undefined, no [object Object], few >null<.
- `public/listing-css-no-display-none-on-h1.spec.ts` — h1 attached to DOM.
- `public/listing-no-render-blocking-js.spec.ts` — head scripts async/defer.
- `public/listing-button-keyboard-activation.spec.ts` — Enter/Space no JS error.
- `public/listing-favicon-ico-content-type.spec.ts` — favicon image content-type.

Admin / API:

- `public/admin-api-non-2xx-on-options.spec.ts` — admin OPTIONS no wildcard CORS.
- `api/admin-twentycrm-deeper.spec.ts` — twenty-crm config/test-connection rejection.

Branch: `feat/e2e-coverage-1779188051`. Admin-merged once CI passes. No
cascade to `stage` / `main` per operator instructions.

---

## 2026-05-19 — Spec 028 round 12: a11y deeper + HTML sanity (develop-only)

Round 12 of the rolling e2e coverage buildout. 16 new spec files added on
`develop` only (no cascade per operator instructions). Focus areas:

a11y deeper:

- `public/listing-form-labels.spec.ts` — auth inputs have label/aria/placeholder.
- `public/listing-tabindex-non-negative.spec.ts` — no positive tabindex.
- `public/listing-aria-hidden-conflict.spec.ts` — aria-hidden no focusable.
- `public/listing-no-empty-anchors.spec.ts` — anchors have accessible name.
- `public/listing-color-contrast-advisory.spec.ts` — body color != bg.
- `public/listing-no-onclick-on-non-interactive.spec.ts` — no div onclick.
- `public/listing-buttons-have-types.spec.ts` — buttons declare type.
- `public/listing-input-autocomplete-shape.spec.ts` — pw autocomplete shape.
- `public/listing-document-language-set.spec.ts` — html.lang non-empty.

HTML sanity:

- `public/listing-skeleton-renders.spec.ts` — listing body has content <2s.
- `public/listing-no-deprecated-html.spec.ts` — no <font/center/marquee/etc.
- `public/listing-multiple-h1.spec.ts` — at most 3 h1 elements per page.
- `public/listing-no-duplicate-ids.spec.ts` — unique DOM ids.
- `public/listing-css-no-blocking-fonts.spec.ts` — no font-display:block.

API shape:

- `api/stripe-products-shape.spec.ts` — products read + HEAD/OPTIONS.
- `api/auth-callback-cookie-shape.spec.ts` — wrong-csrf no session cookie.

Branch: `feat/e2e-coverage-1779184408`. Admin-merged once CI passes. No
cascade to `stage` / `main` per operator instructions.

---

## 2026-05-19 — Spec 028 round 11: locale prefix sweep + cookie/header hygiene (develop-only)

Round 11 of the rolling e2e coverage buildout. 17 new spec files added on
`develop` only (no cascade per operator instructions). Focus areas:

Locale prefix sweep:

- `public/auth-locale-prefix-tolerance.spec.ts` — every locale × auth path.
- `public/items-locale-prefix-tolerance.spec.ts` — detail routes × locale.
- `public/pricing-locale-prefix.spec.ts` — /<loc>/pricing + sponsor.
- `public/static-info-locale-prefix.spec.ts` — /<loc>/about/help/etc.
- `public/favorites-and-newsletter-locale.spec.ts` — favorites/newsletter/map/submit.
- `api/admin-i18n-locale-prefix.spec.ts` — API endpoints with locale prefix.

SEO/cache headers:

- `public/hreflang-consistency.spec.ts` — well-formed hreflang.
- `public/stale-while-revalidate-shape.spec.ts` — directive form parses.
- `public/listing-resp-vary-header.spec.ts` — Vary tokens valid.
- `public/listing-prefetch-not-blocking.spec.ts` — prefetch hrefs non-5xx.

Cookie + storage hygiene:

- `public/listing-set-cookie-flags.spec.ts` — session cookies HttpOnly/Secure.
- `public/listing-no-localstorage-leak-on-load.spec.ts` — no token/secret keys.
- `public/service-worker-control.spec.ts` — sw.js JS content-type.
- `public/non-existent-image-route.spec.ts` — fake image paths non-5xx.

Admin API deeper:

- `api/admin-clients-and-bulk-deeper.spec.ts` — clients + bulk + dashboard.
- `api/admin-navigation-and-location-deeper.spec.ts` — navigation/location/analytics.
- `api/sponsor-ads-checkout-shapes.spec.ts` — sponsor-ads malformed payloads.

Branch: `feat/e2e-coverage-1779180779`. Admin-merged once CI passes. No
cascade to `stage` / `main` per operator instructions.

---

## 2026-05-19 — Spec 028 round 10: tracking params, scanner probes, conditional reqs, viewport (develop-only)

Round 10 of the rolling e2e coverage buildout. 23 new spec files added on
`develop` only (no cascade per operator instructions). Focus areas:

Tracking + framework:

- `public/listing-with-utm-tracking.spec.ts` — UTM/gclid/fbclid/etc.
- `public/nextjs-built-in-routes-tolerance.spec.ts` — `_next/*` probes.
- `public/opengraph-image-routes.spec.ts` — App-Router OG image conventions.
- `public/favicons-and-pwa-icons-deeper.spec.ts` — mstile/maskable.

Security / hygiene:

- `public/listing-no-iframe-without-sandbox.spec.ts` — 3p iframes sandbox.
- `public/listing-no-dangerous-protocols.spec.ts` — no javascript:/data: hrefs.
- `public/common-attack-paths.spec.ts` — wp-config/aws/cgi-bin/etc not 200.
- `public/html-no-server-stack-leak.spec.ts` — no /var/task/ etc in HTML.
- `public/nextjs-error-boundary-rendering.spec.ts` — no raw stack on errors.

Headers / shape:

- `public/listing-content-type-encoding.spec.ts` — Content-Type charset.
- `public/range-requests.spec.ts` — Range header tolerance.
- `public/if-modified-since.spec.ts` — If-Modified-Since / If-None-Match.
- `public/listing-meta-author-and-keywords.spec.ts` — meta author presence.

Routes + URL:

- `public/dynamic-route-segments-tolerance.spec.ts` — unusual URL chars.
- `public/listing-search-redirect-to-detail.spec.ts` — /search /s aliases.
- `public/listing-with-anchor-fragment.spec.ts` — #fragment tolerance.
- `public/listing-deep-state-restoration.spec.ts` — back-button history.

a11y + layout:

- `public/listing-keyboard-navigation.spec.ts` — Tab focuses interactive.
- `public/listing-favorite-button-shape.spec.ts` — buttons exist on listings.
- `public/listing-render-on-tablet-viewport.spec.ts` — iPad Mini no overflow.
- `public/listing-form-input-counts.spec.ts` — auth forms have inputs.

API content types:

- `api/admin-import-content-types.spec.ts` — content-type matrix anonymous.
- `api/admin-export-content-types.spec.ts` — Accept header matrix.

Branch: `feat/e2e-coverage-1779173518`. Admin-merged once CI passes. No
cascade to `stage` / `main` per operator instructions.

---

## 2026-05-19 — Spec 028 round 9: perf budgets, console hygiene, navigation flood (develop-only)

Round 9 of the rolling e2e coverage buildout. 26 new spec files added on
`develop` only (no cascade per operator instructions). Focus areas:

Performance budgets:

- `public/time-to-first-paint-budget.spec.ts` — DOMContentLoaded < 15s.
- `public/page-bytes-budget.spec.ts` — HTML payload < 1.5MB.
- `public/inline-styles-bandwidth.spec.ts` — no 500KB inline <style>.
- `public/listing-network-request-count.spec.ts` — < 300 requests on /.
- `public/listing-on-mobile-viewport.spec.ts` — iPhone 12 no horiz overflow.

Console / runtime hygiene:

- `public/listing-no-console-errors.spec.ts` — no uncaught JS errors.
- `public/listing-no-failed-requests.spec.ts` — no unexpected 4xx/5xx in nav.
- `public/listing-image-lazy-loading.spec.ts` — off-fold img loading=lazy.
- `public/third-party-script-domains.spec.ts` — no http:// scripts.

Sweeps + flood:

- `public/client-protected-pages-flood.spec.ts` — every /client/\* anon.
- `public/dashboard-protected-pages-flood.spec.ts` — every /dashboard/\* anon.
- `public/detail-routes-flood.spec.ts` — all detail × sample/missing slugs.
- `public/admin-non-existent-paths.spec.ts` — bogus /admin/\* paths.
- `public/api-non-existent-paths.spec.ts` — bogus /api/\* paths not 200.
- `public/sponsorship-prefix-flow.spec.ts` — /sponsor with providers.

Listing edges:

- `public/listing-grid-and-list-toggle.spec.ts` — view=grid/list/map/compact.
- `public/listing-sort-options-tolerance.spec.ts` — every common sort option.
- `public/listing-filter-clear.spec.ts` — empty filter values tolerance.
- `public/listing-search-form-shape.spec.ts` — search form is GET method.
- `public/listing-href-locale-prefix.spec.ts` — /fr/ links preserve prefix.
- `public/listing-on-detail-page.spec.ts` — detail page renders w/o broken img.

Auth flow shape:

- `public/signout-flow-shape.spec.ts` — GET/POST signout non-5xx, with csrf.

Error / shape:

- `public/error-response-json-shape.spec.ts` — 4xx JSON parses as JSON.
- `public/listing-search-via-url-not-leak-secrets.spec.ts` — no env names leaked.
- `api/oauth-providers-shape.spec.ts` — providers id/name/type contract.
- `api/verify-recaptcha-headers.spec.ts` — GET/DELETE/multipart non-5xx.

Branch: `feat/e2e-coverage-1779169892`. Admin-merged once CI passes. No
cascade to `stage` / `main` per operator instructions.

---

## 2026-05-19 — Spec 028 round 8: csrf wire, sitemap shape, RSC sweep, admin verb flood (develop-only)

Round 8 of the rolling e2e coverage buildout. 29 new spec files added on
`develop` only (no cascade per operator instructions). Focus areas:

Auth + CSRF wire:

- `public/auth-csrf-flow-shape.spec.ts` — POST credentials with csrf, non-5xx.
- `public/auth-with-bogus-cookies.spec.ts` — every common bogus auth cookie.

SEO shape + listing edges:

- `public/sitemap-listing-shape.spec.ts` — <loc> URLs, no /admin/ leak.
- `public/listing-q-injection-shapes.spec.ts` — SQLi/JNDI/log4shell probes.
- `public/listing-empty-state-page-shape.spec.ts` — empty filter still 200.
- `public/listing-stable-on-repeat.spec.ts` — 5x sequential GETs stable.
- `public/listing-form-search.spec.ts` — discover search input present.
- `public/listing-jsonld-presence.spec.ts` — ld+json count advisory.
- `public/listing-no-stray-localhost.spec.ts` — no localhost in prod HTML.
- `public/json-cache-tags-immutability.spec.ts` — public JSON Cache-Control.

Detail / RSC:

- `public/rsc-suffix-on-detail.spec.ts` — locale × \_rsc on detail routes.
- `public/admin-rsc-suffix.spec.ts` — /admin/\* anonymous bounce + \_rsc.
- `public/client-rsc-suffix.spec.ts` — /client/\* anonymous bounce + \_rsc.
- `public/admin-detail-survey-edit-rsc.spec.ts` — admin survey + \_rsc.

i18n locale prefix deeper:

- `public/client-i18n-routes-deeper.spec.ts` — locale × client/dashboard.
- `public/admin-i18n-routes-deeper.spec.ts` — locale × admin sweep.

Trailing slashes / links:

- `public/trailing-slash-canonicalization.spec.ts` — /about/ no 5xx.
- `public/links-rel-noopener-noreferrer.spec.ts` — \_blank links carry rel.

API rejection:

- `public/favorites-api-routes-deeper.spec.ts` — favorites verbs anonymous.
- `public/admin-method-flood.spec.ts` — every verb × top admin endpoints.
- `api/featured-items-deeper.spec.ts` — featured items query shapes.
- `api/reference-deeper.spec.ts` — /api/reference query shapes.
- `api/sponsor-ads-list-deeper.spec.ts` — sponsor-ads list + mutating.
- `api/admin-collections-comments-deeper.spec.ts` — collections + items.
- `api/admin-notifications-deeper.spec.ts` — mark-all-read variants.
- `api/admin-sponsor-ads-deeper.spec.ts` — approve/reject/cancel anonymous.
- `api/admin-reports-deeper.spec.ts` — reports detail anonymous.
- `api/stripe-portal-and-products-edges.spec.ts` — stripe portal variants.

Image / SEO:

- `public/image-with-srcset-shape.spec.ts` — srcset entries well-formed.

Branch: `feat/e2e-coverage-1779166258`. Admin-merged once CI passes. No
cascade to `stage` / `main` per operator instructions.

---

## 2026-05-19 — Spec 028 round 7: deeper API + SEO link shape + locale prefixes (develop-only)

Round 7 of the rolling e2e coverage buildout. 30 new spec files added on
`develop` only (no cascade per operator instructions). Focus areas:

SEO + link shape:

- `public/rel-next-prev-listing.spec.ts` — rel=next/prev hrefs sane.
- `public/canonical-link-presence.spec.ts` — canonical href non-empty.
- `public/robots-disallow-shape.spec.ts` — admin/internal protected.
- `public/sw-html-payload-shape.spec.ts` — doctype + html/head/body close.
- `public/preconnect-and-dns-prefetch.spec.ts` — preconnect hrefs well-formed.
- `public/listing-pagination-link-validity.spec.ts` — pagination links internal.

Detail routes deeper:

- `public/item-detail-deeper-tolerance.spec.ts` — /items/[slug] weird inputs.
- `public/collections-detail-deeper.spec.ts` — /collections/[slug] weird.
- `public/surveys-detail-deeper.spec.ts` — /surveys/[slug] weird.
- `public/detail-page-rsc-tolerance.spec.ts` — RSC prefetch on detail pages.

i18n / locale prefix:

- `public/multiple-locale-meta.spec.ts` — each locale title + /about + /discover.
- `public/admin-locale-prefix.spec.ts` — /<loc>/admin bounces anonymous.
- `public/client-area-locale-prefix.spec.ts` — /<loc>/client + /<loc>/dashboard.

Header tolerance:

- `public/fetch-with-priority-hints.spec.ts` — Save-Data, Priority, DPR.
- `public/dnt-tolerance.spec.ts` — DNT/Sec-GPC/Sec-Fetch-\* tolerance.
- `public/theme-class-tolerance.spec.ts` — html class no "undefined".
- `public/dom-no-react-errors.spec.ts` — no error overlay text in HTML.

Listing edges:

- `public/listing-deep-link-share.spec.ts` — bookmarked filter URLs.
- `public/ai-chat-toggle-tolerance.spec.ts` — ?chat=open/closed survives.
- `public/listing-prefetch-burst-paths.spec.ts` — parallel burst across routes.
- `public/error-route-handlers.spec.ts` — /error /not-found /loading direct.
- `public/submit-and-extract-anon.spec.ts` — /submit anonymous behavior.

JSON / discovery / health:

- `public/swagger-and-openapi-shape.spec.ts` — no secrets in openapi docs.
- `public/health-shape.spec.ts` — /api/health no DB URL leak.
- `public/agent-and-crawl-discovery.spec.ts` — agents.json/ai.txt non-5xx.
- `public/misc-feed-aliases.spec.ts` — /rss /atom /feed alias non-5xx.
- `public/public-listing-json-mirror-deeper.spec.ts` — .json mirrors parse.

Admin API sweep + deeper:

- `public/admin-prefix-api-rejection.spec.ts` — every admin GET 4xx.
- `public/client-prefix-api-rejection.spec.ts` — every client GET 4xx.
- `api/admin-settings-deeper.spec.ts` — settings PUT/PATCH/DELETE/OPTIONS.
- `api/admin-categories-deeper.spec.ts` — categories + reorder + git.
- `api/admin-users-deeper.spec.ts` — users + check-email/username.
- `api/admin-items-deeper.spec.ts` — items + bulk + import + export.
- `api/admin-tags-roles-deeper.spec.ts` — tags + roles + permissions.
- `api/version-and-tenant-edge.spec.ts` — version/sync/tenant edges.
- `api/http-overrides-tolerance.spec.ts` — method override no auth bypass.
- `api/polar-and-solidgate-deeper.spec.ts` — empty/hostile body POSTs.

Branch: `feat/e2e-coverage-1779162628`. Admin-merged once CI passes. No
cascade to `stage` / `main` per operator instructions.

---

## 2026-05-19 — Spec 028 round 6: PWA / RSC / CORS / a11y deeper (develop-only)

Round 6 of the rolling e2e coverage buildout. 35 new spec files added on
`develop` only (no cascade per operator instructions). Focus areas:

OG / SEO / feeds:

- `public/og-image-and-twitter-card.spec.ts` — og:title/desc + twitter:card.
- `public/rss-atom-feed-shape.spec.ts` — feed XML/JSON shape contracts.
- `public/listing-jsonld-itemlist.spec.ts` — listing pages json-ld parses.

Static assets / caching / image optimizer:

- `public/nextjs-image-route-tolerance.spec.ts` — `/_next/image` hostile inputs.
- `public/static-chunk-caching.spec.ts` — `/_next/static/*` immutable cache.
- `public/favicon-detail.spec.ts` — all common favicon paths non-5xx.
- `public/static-data-routes.spec.ts` — `/_next/data` and chunk probes.
- `public/service-worker-and-manifest-tolerance.spec.ts` — PWA endpoints.
- `public/image-domain-allowlist.spec.ts` — homepage `<img src>` resolve.

HTTP method matrix / headers:

- `public/webhook-method-coverage.spec.ts` — webhooks reject non-POST.
- `public/options-method-tolerance.spec.ts` — preflight OPTIONS non-5xx.
- `public/head-method-tolerance.spec.ts` — HEAD requests non-5xx.
- `public/cors-on-public-api.spec.ts` — no wildcard CORS with credentials.
- `public/hsts-and-redirect-headers.spec.ts` — HSTS max-age plausible.
- `public/custom-host-and-x-forwarded.spec.ts` — proxy header tolerance.

Auth / form shape:

- `public/login-modal-and-form-shape.spec.ts` — email/password inputs render.
- `public/form-input-types.spec.ts` — type=email / type=password correctness.
- `public/autocomplete-attributes.spec.ts` — password autocomplete not "off".
- `public/auth-error-page-shape.spec.ts` — every NextAuth error code non-5xx.
- `public/auth-callback-routes.spec.ts` — provider callback non-5xx.

a11y deeper:

- `public/heading-and-landmarks-quick.spec.ts` — main/nav/h1 presence.
- `public/skip-link-and-focus.spec.ts` — skip link or main[id], Tab works.
- `public/images-have-alt.spec.ts` — every <img> has alt attribute.
- `public/html-charset-and-viewport.spec.ts` — meta charset + viewport.

Inline / CSP / chat / extract:

- `public/inline-script-csp-shape.spec.ts` — unsafe-inline requires nonce.
- `public/chat-api-protection.spec.ts` — /api/chat anonymous, no key leak.
- `public/extract-api-protection.spec.ts` — /api/extract SSRF tolerance.

Listing / RSC / preview:

- `public/listing-rsc-stream-tolerance.spec.ts` — RSC header + \_rsc=.
- `public/nextjs-prefetch-headers.spec.ts` — purpose=prefetch tolerance.
- `public/listing-no-duplicates.spec.ts` — items.json no duplicate slugs.
- `public/listing-aria-current-and-state.spec.ts` — weird filter survival.
- `public/listing-edge-pagination-overshoot.spec.ts` — page 9999 non-5xx.
- `public/listing-items-engagement-shape.spec.ts` — engagement query shapes.
- `public/export-routes-tolerance.spec.ts` — items export with bad params.
- `public/geocode-and-location-deeper.spec.ts` — geocode hostile inputs.
- `public/public-route-rsc-prefetch-burst.spec.ts` — parallel prefetch burst.
- `public/preview-mode-and-draft.spec.ts` — /api/preview /api/draft non-200.
- `public/rate-limit-anonymous-deeper.spec.ts` — rapid auth-adjacent posts.
- `public/stripe-redirect-and-checkout-routes.spec.ts` — pricing/success vars.

Settings / admin / page protection:

- `public/settings-deep-paths-protected.spec.ts` — client/settings/\* gate.
- `public/admin-survey-routes-anonymous.spec.ts` — admin/surveys/\* gate.
- `public/admin-detail-pages-anonymous.spec.ts` — /admin/clients/[id] gate.

API deeper:

- `api/items-comments-rating-deeper.spec.ts` — nested comments/rating.
- `api/admin-companies-and-comments-deeper.spec.ts` — admin orgs/comments.

Branch: `feat/e2e-coverage-1779159025`. Admin-merged once CI passes. No
cascade to `stage` / `main` per operator instructions.

---

## 2026-05-19 — Spec 028 round 5: comparisons / CMS / dashboard surveys / extra hardening (develop-only)

Round 5 of the rolling e2e coverage buildout. 56 new spec files added on
`develop` only (no cascade per operator instructions). Focus areas:

Uncovered pages and deeper boundaries:

- `public/comparisons-detail-public.spec.ts` — /comparisons/[slug].
- `public/cms-pages-slug.spec.ts` — /pages/[slug] CMS bucket.
- `public/categories-detail-tolerance.spec.ts` — /categories/[…] + nested catch-all.
- `public/tags-detail-tolerance.spec.ts` — /tags/[…] + nested catch-all.
- `public/discover-deep-pages.spec.ts` — sort/view/q combinations and edge pages.
- `public/listing-deeper-paging-boundaries.spec.ts` — huge / negative / scientific
  page numbers.
- `public/listing-modifier-deeper.spec.ts` — duplicate sort/view params,
  utm_source noise, repeated keys.
- `public/listing-search-q-shapes.spec.ts` — control chars, unicode, oversize q.
- `public/paging-tags-and-collections.spec.ts` — /tags/paging/[N] +
  /collections/paging/[N] edges.
- `public/items-detail-survey-slug.spec.ts` — /items/[slug]/surveys/[slug].
- `public/map-route-tolerance.spec.ts` — /map with bogus zoom/bbox/lat/lng.
- `public/submit-page-tolerance.spec.ts` — /submit query variations.
- `public/sponsor-public-routes.spec.ts` — /sponsor with bogus plan/coupon.
- `public/pricing-success-deeper.spec.ts` — /pricing/success with every provider.
- `public/auth-pages-deeper-tolerance.spec.ts` — auth pages with bogus tokens,
  callbackUrls, error codes.
- `public/favorites-anonymous-tolerance.spec.ts` — /favorites anonymous gate.

Robust input + header tolerance:

- `public/content-length-and-encoding.spec.ts` — JSON content-type + bogus
  accept-encoding.
- `public/cookie-tolerance.spec.ts` — empty / malformed / oversize / bogus
  session cookies.
- `public/user-agent-and-referer.spec.ts` — empty/bot/long UA, weird Referer.
- `public/api-large-query-string.spec.ts` — 10kB qs, 200 params, unicode, NULs.
- `public/concurrent-rapid-navigation.spec.ts` — rapid navigation + reload x5.

Security / SEO / a11y headers:

- `public/error-page-status-codes.spec.ts` — bot-path 404s + wp-login, .env etc.
- `public/sitemap-and-robots-shape.spec.ts` — sitemap.xml/robots.txt/llms.txt
  shape.
- `public/static-asset-coverage.spec.ts` — favicon/manifest/etc must non-5xx.
- `public/structured-data-jsonld.spec.ts` — script[type=ld+json] valid JSON.
- `public/head-meta-essentials.spec.ts` — title + meta description per route.
- `public/html-lang-and-dir.spec.ts` — html[lang] presence + ar dir=rtl.
- `public/html-no-mixed-content.spec.ts` — no http:// asset src on HTTPS.
- `public/open-redirect-defense.spec.ts` — callbackUrl can't escape origin.
- `public/response-headers-deeper.spec.ts` — X-Powered-By, Server, frame
  protection.
- `public/internal-and-internal-routes-protected.spec.ts` —
  /api/internal/db-init + /api/**test**/\* never 200.
- `public/session-and-csrf-shape.spec.ts` — wire contracts for
  /api/auth/session / csrf / providers.
- `public/language-locale-redirects.spec.ts` — locale prefix tolerance.
- `public/cms-md-mirror-deeper.spec.ts` — pages/.md + items/.md mirrors.
- `public/webfinger-and-well-known.spec.ts` — common .well-known probes.
- `public/http-methods-on-public-api-deeper.spec.ts` — DELETE/PUT/PATCH on
  public GETs returns 4xx not 5xx.
- `public/link-from-header-and-nav.spec.ts` — navigation chain + back-button.
- `public/links-anchors-and-buttons.spec.ts` — no href="undefined", labeled
  buttons.

Client / dashboard:

- `client/dashboard-items-surveys-protected.spec.ts` — /dashboard/items/[id]/surveys.
- `client/client-users-and-sponsorships-protected.spec.ts` — anonymous gate.
- `client/public-profile-deeper.spec.ts` — /client/profile/[u]/followers/following
  with weird usernames.

API rejection deeper:

- `api/admin-detail-deeper.spec.ts` — every admin detail endpoint anonymous.
- `api/admin-bulk-and-import-rejection.spec.ts` — bulk/import/export endpoints.
- `api/user-profile-deeper.spec.ts` — /api/user/profile/follow + portfolio.
- `api/stripe-products-deeper.spec.ts` — stripe products / portal / subs.
- `api/polar-deeper.spec.ts` — polar checkout / portal / webhook.
- `api/sponsor-ads-user-deeper.spec.ts` — sponsor-ads user endpoints.
- `api/items-engagement-deeper.spec.ts` — items engagement nested routes.
- `api/client-items-and-imports-rejection.spec.ts` — client items + imports.
- `api/reports-and-surveys-deeper.spec.ts` — reports + surveys deeper.
- `api/payment-and-current-user-deeper.spec.ts` — payment/account, current-user.
- `api/auth-nextauth-discovery-deeper.spec.ts` — providers/csrf/session shape.
- `api/internal-cron-protection.spec.ts` — cron routes require secret.
- `api/verify-recaptcha-deeper.spec.ts` — synthetic tokens rejected.
- `api/reference-and-tenant-shape.spec.ts` — no secrets leaked in discovery.
- `api/body-content-types-rejection.spec.ts` — malformed body / wrong CT
  across POST endpoints.

Branch: `feat/e2e-coverage-1779156184`. Admin-merged once CI passes. No
cascade to `stage` / `main` per operator instructions.

---

## 2026-05-19 — Spec 028 round 4: payment providers + admin sub-systems (develop-only)

Round 4 of the rolling e2e coverage buildout. 22 new spec files added
on `develop` only (no cascade per operator instructions). Focus areas:

Payment providers + Stripe:

- `api/polar-endpoints-rejection.spec.ts` — Polar user endpoints +
  webhook signature gate.
- `api/lemonsqueezy-endpoints-rejection.spec.ts` — LemonSqueezy +
  webhook signature gate.
- `api/solidgate-endpoints-rejection.spec.ts` — Solidgate +
  webhook signature gate.
- `api/stripe-payment-methods-rejection.spec.ts` — Stripe payment
  method + subscription per-id endpoints reject anonymous.
- `api/payment-account-rejection.spec.ts` — /api/payment/\* +
  sponsor-ads checkout reject anonymous.

Items engagement:

- `api/items-engagement-public.spec.ts` — votes/comments/views/
  activity public reads + anonymous mutation rejection.
- `api/favorites-itemslug-rejection.spec.ts` — favorites slug-keyed
  mutations require auth.

Client API:

- `api/client-items-api-rejection.spec.ts` — /api/client/\* endpoints
  reject anonymous (GET + mutating).

Admin sub-systems:

- `api/admin-roles-and-permissions.spec.ts` — roles + permissions
  graph endpoints.
- `api/admin-users-and-validation.spec.ts` — users + check-email /
  check-username (anti-enumeration).
- `api/admin-sponsor-ads-and-twentycrm.spec.ts` — admin sponsor-ads
  CRUD + TwentyCRM config endpoints + settings/map-status.
- `api/admin-tags-and-export.spec.ts` — admin tags + items
  export/import.
- `api/admin-clients-and-search.spec.ts` — admin clients +
  advanced-search + notifications.

Public utility endpoints:

- `api/location-and-geocode-public.spec.ts` — location/cities/
  countries/coordinates/search + geocode tolerance.
- `api/public-misc-endpoints.spec.ts` — exists probes, featured-items,
  reference, health/database (no credential leak), items export
  settings, config/features, /api/internal/db-init rejection.

Public hardening:

- `public/service-worker-and-pwa.spec.ts` — manifest + sw reachability.
- `public/favicon-and-apple-touch.spec.ts` — browser icon assets
  reachable + advertised in <link>.
- `public/third-party-iframe-tolerance.spec.ts` — page renders when
  Stripe / reCAPTCHA / analytics are blocked.
- `public/http-method-on-pages.spec.ts` — HEAD/OPTIONS/PUT/DELETE on
  pages don't 5xx.
- `public/directory-traversal-defense.spec.ts` — path-traversal /
  null-byte / long-slug / homograph probes.
- `public/meta-robots-controls.spec.ts` — public pages indexable;
  robots.txt doesn't disallow everything.
- `public/hash-fragment-tolerance.spec.ts` — unknown / hostile URL
  hashes don't crash pages; signin doesn't auto-sign-in from a hash.
- `public/listing-rss-shape.spec.ts` — empty-data feed tolerance
  (channel meta present even when no items).
- `public/meta-tags-twitter-and-opengraph.spec.ts` — og:title /
  og:type / og:image / twitter:image present where expected.
- `public/rate-limit-search.spec.ts` — 20 rapid /api/items.json
  requests and parallel /discover searches don't 5xx.

Auth:

- `auth/oauth-error-page-tolerance.spec.ts` — `/auth/error?error=…`
  tolerates 16 different codes (including XSS / traversal payloads);
  /auth/signout + /auth/verify-request render.

## 2026-05-19 — Spec 028 round 3: hourly continuation batch (develop-only)

Round 3 of the rolling e2e coverage buildout. 28 new spec files added
on `develop` only (no cascade per operator instructions). Focus areas:

API security matrices:

- `api/stripe-endpoints-rejection.spec.ts` — Stripe surface + webhook
  signature rejection.
- `api/surveys-api-rejection.spec.ts` — surveys read tolerance +
  mutation rejection.
- `api/sponsor-ads-api-rejection.spec.ts` — sponsor-ads user API
  anonymous rejection.
- `api/items-public-api.spec.ts` — public items.json contract +
  garbage-query tolerance.
- `api/cron-and-webhook-security.spec.ts` — cron endpoints require
  CRON_SECRET; platform activity-feed rejects bad HMAC.
- `api/recaptcha-tenant-version.spec.ts` — boundary endpoint shapes.
- `api/comments-votes-favorites-rejection.spec.ts` — engagement
  endpoints reject anonymous mutations.
- `api/admin-detail-api-rejection.spec.ts` — admin per-resource GETs
  reject anonymous.
- `api/user-profile-mutating.spec.ts` — profile mutating endpoints
  reject anonymous.

Admin pages + deeper API:

- `admin/admin-detail-and-survey-routes.spec.ts` — admin dynamic-segment
  routes for client and survey detail/create.
- `admin/admin-mutating-api-deeper.spec.ts` — sweep of remaining admin
  POST/PATCH/DELETE endpoints.
- `admin/admin-test-mock-endpoint-disabled.spec.ts` — `/api/__test__/*`
  routes are gated.
- `admin/admin-i18n-locale.spec.ts` — admin pages in fr/es/de.

Auth coverage:

- `auth/new-password-flow-tokens.spec.ts` — token-gated auth pages
  tolerate garbage / SQL-shaped / missing tokens.
- `auth/admin-signin-page.spec.ts` — `/admin/auth/signin` form +
  callbackUrl sanitization.

Client coverage:

- `client/settings-form-elements.spec.ts` — every settings sub-page
  exposes form elements.
- `client/public-profile-view.spec.ts` — non-existent profile slugs
  404, special chars tolerated.
- `client/client-i18n-locale.spec.ts` — `/client/*` in fr/es/de.

Public coverage:

- `public/item-detail-and-survey.spec.ts` — item detail + .md mirror +
  collections/comparisons/pages slug tolerance.
- `public/paging-deep-routes.spec.ts` — tags/collections paging edge
  inputs + nested category/tag catch-alls.
- `public/response-content-types.spec.ts` — HTML pages serve text/html;
  JSON endpoints serve application/json.
- `public/listing-sort-and-view-toggle.spec.ts` — sort + view-toggle
  URL state combinations.
- `public/static-info-pages-content.spec.ts` — about/help/legal pages
  have substantive content.
- `public/xss-payloads-tolerated.spec.ts` — classic XSS payloads in
  query/slugs/hash don't execute.
- `public/webfinger-and-discovery.spec.ts` — well-known + llms.txt
  manifests.
- `public/swagger-and-openapi.spec.ts` — Swagger/OpenAPI endpoints
  (if present) respond.
- `public/focus-and-keyboard-nav.spec.ts` — keyboard tab order +
  Enter on submit button.
- `public/viewport-and-mobile.spec.ts` — mobile + tablet rendering
  without horizontal overflow.
- `public/listing-json-mirror.spec.ts` — listing JSON peer responds
  under filter combos.
- `public/link-from-detail-back-to-list.spec.ts` — forward/back nav
  preserves URL state.
- `public/hot-route-perf-budget.spec.ts` — request count + HTML doc
  size on hot routes.
- `public/fetch-cache-busting.spec.ts` — tracking params don't break
  caching.
- `public/admin-api-prefix-rejection.spec.ts` — unknown /api/admin/\*
  paths reject cleanly.
- `public/stripe-redirect-routes.spec.ts` — /pricing CTAs don't crash
  anonymously.
- `public/dashboard-billing-route.spec.ts` — /dashboard/billing access
  matrix.
- `public/ai-chat-disabled-tolerance.spec.ts` — chat plugin disabled
  state.

## 2026-05-19 — Spec 028 round 2: large coverage batch (develop-only, no cascade)

Operator asked for a 30-min batch focused on coverage breadth; do NOT
cascade to stage/main until coverage is comprehensive. Updated the
hourly CCDB task #68 prompt to skip the cascade step until further
notice.

Files added (`apps/web-e2e/tests/...`):

- `admin/admin-route-coverage-matrix.spec.ts` — all 16 admin pages,
  3 personas (admin OK, client denied, anonymous gated).
- `admin/admin-api-mutating-rejection.spec.ts` — POST/PATCH/DELETE
  on admin endpoints reject anonymous with 4xx (not 5xx, not 200).
- `api/admin-api-coverage-matrix.spec.ts` — 21 admin GET endpoints,
  anonymous rejection + admin acceptance.
- `api/user-api-coverage-matrix.spec.ts` — `/api/user/*` per-user
  GET endpoints, anonymous rejection + authenticated acceptance.
- `api/http-methods-coverage.spec.ts` — POST/DELETE on GET-only
  endpoints returns 4xx (not 5xx); OPTIONS doesn't crash.
- `api/rate-limit-shape.spec.ts` — malformed-auth-input shape +
  forgot-password no-enumeration check.
- `client/client-area-route-matrix.spec.ts` — every `/client/*`
  route loads for the authenticated client.
- `client/dashboard-route-matrix.spec.ts` — legacy `/dashboard/*`
  surface (billing + item surveys) — admin + client + anonymous.
- `client/client-api-mutating-rejection.spec.ts` — mutating
  `/api/user/*` rejects anonymous.
- `client/submission-create-flow.spec.ts` — `/submit` form renders
  for clients, blocks empty submit, gated for anonymous.
- `auth/auth-flow-comprehensive.spec.ts` — register → dashboard →
  signout → signin → dashboard round-trip; bad-password error UI;
  duplicate-email error UI.
- `auth/form-validation-comprehensive.spec.ts` — HTML5 required-field
    - email-format validation across signin/register/forgot-password.
- `auth/callback-url-sanitization.spec.ts` — hostile `?callbackUrl=`
  values don't open-redirect.
- `i18n/locale-coverage-matrix.spec.ts` — 6 locales × 6 core pages,
  assert non-5xx + heading + `<html lang>` matches URL.
- `public/route-coverage-matrix.spec.ts` (round 1, already shipped),
  plus this round:
    - `public/seo-meta-coverage.spec.ts` — title/description/canonical/
      og:title/JSON-LD on every key page.
    - `public/sitemap-feeds-shape.spec.ts` — sitemap.xml is XML+urlset,
      rss/atom/json feeds parse, opengraph-image is an image.
    - `public/hreflang-coverage.spec.ts` — alternates emitted on every
      locale-aware page.
    - `public/meta-rss-discovery.spec.ts` — feed autodiscovery links.
    - `public/md-mirror-routes.spec.ts` — `.md` mirror of static info
      pages serves Markdown.
    - `public/header-footer-completeness.spec.ts` — header + footer
      render on every sampled page.
    - `public/security-headers.spec.ts` — nosniff, XFO, HSTS, CSP on
      every page + API.
    - `public/caching-headers.spec.ts` — home is CDN-cacheable;
      auth endpoints aren't.
    - `public/redirect-canonicalization.spec.ts` — trailing slash,
      `/en/` prefix, case variants don't 5xx.
    - `public/concurrent-anonymous-sessions.spec.ts` — two anonymous
      contexts have independent sessions / CSRF tokens.
    - `public/links-no-broken-internal.spec.ts` — sampled internal
      links from every seed page resolve.
    - `public/images-and-icons.spec.ts` — favicon, logo, accessibility
      hints on logo.
    - `public/noscript-fallback.spec.ts` — public pages render with
      JavaScript disabled.
    - `public/listing-filter-combinations.spec.ts` — listing filter
      combinations (search × sort × page).
    - `public/listing-pagination-edges.spec.ts` — non-numeric / negative
      / huge page params don't 5xx.
    - `public/listing-empty-state.spec.ts` — no-result search, empty
      category, anonymous favorites.
    - `public/404-and-error-recovery.spec.ts` — 404 renders nav,
      home link works, non-existent slugs return 4xx not 5xx.
    - `public/page-stability-fresh-cookies.spec.ts` — every public
      page survives a completely empty cookie jar.
    - `public/trailing-rsc-suffix.spec.ts` — `?_rsc=…` RSC prefetch
      queries don't 5xx (the prefetch pattern Spec 027 caught in
      network logs).
    - `public/large-payload-handling.spec.ts` — 5000-char email /
      1000-char name / 2000-char search query rejected with 4xx.
    - `public/sponsor-pricing-success-redirect-loop.spec.ts` —
      `/pricing/success` with no/garbage params doesn't loop.
    - `public/theme-and-prefs-persistence.spec.ts` — theme toggle +
      locale cookie persistence across navigation.
    - `public/accessibility-quick-audit.spec.ts` — axe-core WCAG 2A/AA
      on home + signin + register; fail on critical/serious only.
    - `public/performance-budget-public.spec.ts` — total JS bytes
      transferred on first load is under a generous ceiling; home
      loads within 10s.
    - `public/json-api-shapes.spec.ts` — minimum shape contract for
      public JSON endpoints (version, items.json, csrf, providers,
      session, current-user, currency).

All changes land on `develop` only via PR; per operator instruction,
no cascade to stage/main this round. The hourly task #68 picks up
the next gap iteration.

## 2026-05-19 — Spec 028 round 1: CI workflow + initial gap-filling specs

- `.github/workflows/e2e.yml` — Postgres-backed, sharded 4-way Playwright
  workflow. Runs on push to main/develop/stage and on PR. The repo had
  311 `.spec.ts` files but no CI workflow; Spec 027 would have been caught
  before merge if any of them ran. They now do.
- `apps/web-e2e/tests/client/followers-following.spec.ts` — adds
  `/client/profile/[username]/followers` and `/following` coverage
  (previously a gap; spec-022 shipped the routes without specs).
- `apps/web-e2e/tests/client/settings-subroutes.spec.ts` — matrix of every
  `/client/settings/profile/*` and `/client/settings/security` sub-page:
  authenticated client gets non-5xx + heading + no signin-bounce;
  anonymous gets the signin redirect. Catches the entire class of
  "shipped a new settings tab and forgot a server fetch" regressions.
- `apps/web-e2e/tests/public/route-coverage-matrix.spec.ts` — anonymous
  walk of every public page in the App Router with a "never 5xx"
  assertion. Includes feed manifests + a 404 sanity check.
- `apps/web-e2e/tests/api/public-api-coverage-matrix.spec.ts` — twin
  matrix for API routes: public ones respond JSON, protected ones
  reject anonymous with 401/403 (not 5xx, not 200).
- New `docs/spec/028-e2e-coverage-buildout/spec.md` documents the
  workstream + the hourly self-scheduling agent that fills more gaps
  iteration by iteration.

## 2026-05-19 — Spec 027 round 7: revert to client-side signIn on register (final fix)

Rounds 4–6 chased a wrong hypothesis (server-side `auth()` failing on
Server Components, getSessionViaApi workarounds). The actual smoking
gun, found via a diagnostic `/api/debug-session-cookies` route: after
the round-1 server-side `signIn` in `signUp`, the response set
`__Secure-authjs.session-token` correctly, but the very next request
(the form's `refreshSession()` calling `/api/auth/session`) **received
back a Set-Cookie that cleared the session-token**. Auth.js v5
beta.30's server-action `signIn` writes the cookie along a different
encrypt-/sign-path than the standard `/api/auth/callback/credentials`
flow uses to verify; the mismatch makes the verifier think the cookie
is invalid and clear it.

The sign-in form's path (client-side `signIn('credentials', …)` from
`next-auth/react`) does NOT have this regression — it goes through
the same `/api/auth/callback/credentials` endpoint that `/api/auth/session`
verifies against, so the two stay in agreement.

This round:

- `apps/web/app/[locale]/auth/actions.ts` — `signUp` returns
  `{ autoLogin: true, … }` again, identical shape to `signInAction`.
  No more server-side `serverSignIn` call from inside the action.
  Removes the unused `signIn as serverSignIn` import and the
  `isNextRedirectError` helper.
- `apps/web/lib/auth/get-session-via-api.ts` — deleted (no longer used).
- `apps/web/app/api/debug-session-cookies/route.ts` — deleted
  (temporary diagnostic, served its purpose).
- `apps/web/app/[locale]/client/{dashboard,settings,submissions,submissions/trash,sponsorships,users,profile/[username]}/page.tsx`
  — reverted to `await auth()`. Round 2's `force-dynamic` stays
  (still the right thing). Round 3's `runtime='nodejs'` reverted —
  it didn't help and wasn't needed.

The round-1 `autoLoginFiredRef` / `successHandledRef` useRef guards
in `credentials-form.tsx` STAY — they were the actual bug-A fix and
prevent the double-fire that originally motivated all of this.

## 2026-05-19 — Spec 027 round 4: getSessionViaApi() to bypass Auth.js v5 page-context bug

- Round 3's `runtime = 'nodejs'` still failed: same fetch context,
  `/api/auth/session` returned `{user: …}` but `/client/dashboard`
  returned 307 to `/auth/signin` with the same cookie attached. The
  `auth()` export from Auth.js v5 beta.30 is silently returning null
  when called from a Server Component page under this app's specific
  combination of Next 16.2.6 + next-intl plugin + Sentry plugin
  (suspect either the next-intl `Proxy (Middleware)` strips/reshapes
  the headers, or Auth.js's `headers().get("cookie")` path doesn't
  see them; either way the upstream library is the wrong layer to
  fix in this PR).
- Workaround: new helper `apps/web/lib/auth/get-session-via-api.ts`
  that reads cookies via `cookies()` from next/headers and forwards
  them to `/api/auth/session` (which already works correctly).
  Returns null on no session; never throws. Cost: one same-region
  HTTP roundtrip per auth-gated page render — bounded because these
  pages are already `force-dynamic`.
- Swapped `await auth()` for `await getSessionViaApi()` on all
  auth-gated client pages: `dashboard`, `settings`, `submissions`,
  `submissions/trash`, `sponsorships`, `users`, `profile/[username]`.
- Spec 027 diagnosis updated; this PR ships the user-visible fix.

## 2026-05-18 — Spec 027 round 3: runtime='nodejs' on auth-gated client pages

- Round 2's `force-dynamic` patch made the pages dynamic but they STILL
  returned 307 to `/auth/signin` for valid sessions. Direct
  `context.request.get` calls confirmed the cookie was reaching the
  server and `GET /api/auth/session` from the same fetch context
  returned `{user: {...}}` happily — but `GET /client/dashboard`
  returned 307 anyway. The asymmetry was runtime:
  `app/api/auth/[...nextauth]/route.ts` pins `runtime = 'nodejs'` so
  Auth.js v5's JWT callbacks (which pull `tenantId` from Drizzle and
  use `bcryptjs` in the credentials provider — all three in
  `serverExternalPackages` and unbundlable for the Edge runtime) can
  actually execute; the Server Component pages defaulted to whatever
  Vercel chose, so `auth()` there silently returned `null`.
- `apps/web/app/[locale]/client/{dashboard,settings,submissions,submissions/trash,sponsorships,users,profile/[username]}/page.tsx`
  — added `export const runtime = 'nodejs'`.
- Spec 027 diagnosis updated; this is the round that lands the actual
  user-visible fix.

## 2026-05-18 — Spec 027 follow-up: force-dynamic on auth-gated client pages

- After PR #853 landed the server-side signIn fix, re-running the
  Playwright repro against demo.ever.works showed the session cookie
  was now being set on `POST /auth/register` — but `/client/dashboard`
  still redirected to `/auth/signin` even with a valid cookie attached,
  while `/api/auth/session` and `/api/current-user` happily returned
  the user. The asymmetry was Next.js statically pre-rendering the
  no-session `redirect('/auth/signin')` and serving it cached.
- `apps/web/app/[locale]/client/{dashboard,settings,submissions,submissions/trash}/page.tsx`
  — added `export const dynamic = 'force-dynamic'`.
  `client/sponsorships` and `client/users` already had it; these four
  were the missing ones.
- Spec 027 diagnosis updated to document both halves of the fix and
  why each is necessary on its own.

## 2026-05-18 — Spec 027: fix post-register auto-login race (template prod)

- `spec-027` filed under `docs/spec/027-fix-post-register-autologin/` and
  indexed in `docs/spec/README.md` as **shipped** (alongside this PR).
- `apps/web/app/[locale]/auth/actions.ts` — `signUp` now issues the session
  cookie itself via server-side `signIn()` from Auth.js v5, so the
  `Set-Cookie` header rides in the same response as the success body;
  returns `{ autoLoggedIn: true }` instead of asking the client to sign in.
- `apps/web/app/[locale]/auth/components/credentials-form.tsx` — added
  `successHandledRef` / `autoLoginFiredRef` `useRef` guards so neither the
  new server-side path nor the legacy client-side auto-login path can
  re-fire after `useEffect` re-runs from identity-unstable deps
  (`refreshSession`, `invalidateAllUserData`, `tCred`). This was the prod
  smoking gun: a second `signIn` fetch aborted by navigation, surfacing
  as `TypeError: Failed to fetch` in console and racing the cookie write
  against the dashboard's `auth()` call.

## 2026-05-19 — Spec 029: renumber from 027 → 029 after develop landed 027/028

- `spec-029` Renumbered this spec from `027` → `029` when rebasing on `develop`, because `develop` had concurrently landed `spec-027-fix-post-register-autologin` and `spec-028-e2e-coverage-buildout`. Folder, frontmatter (`id`, `title`, `sidebar_label`), in-body header, and the README index row were rewritten from `027` → `029`. Earlier `spec-027` references in this log that belong to the Preferences-section work were rewritten to `spec-029` / `029-…`; references that belong to the post-register auto-login fix (also numbered 027 on `develop`) were left alone. No code changes in this commit. PR #850.

## 2026-05-18 — Spec 029: e2e coverage + PR-number backfill for Preferences section

- `spec-029` Added Playwright coverage under `apps/web-e2e/tests/client/settings.spec.ts` asserting the new **Preferences** section is reachable from `/client/settings` and that the three always-on block headings (Layout / Container Width / Pagination Style) render — addresses Augment-review feedback that user-visible changes need at least one e2e assertion per `AGENTS.md` §9. PR #850.

## 2026-05-18 — Spec 029: align preference block components with `/client/settings`

- `spec-029` Visual refresh on the six block components rendered in both `SettingsModal` and the new `/client/settings` Preferences section: `SelectLayout`, `SelectContainerWidth`, `SelectPaginationType`, `SelectDatabaseMode`, `SelectCheckoutProvider`, `DatabaseStatusWarning`. Each card drops the glassmorphic surface (`bg-white/80 dark:bg-white/[0.04]`, faint `border-...[0.07]`, `group`, `transition-all`, `p-5`) for the page-card flat treatment (`bg-white dark:bg-[#111111]`, `border-gray-200 dark:border-white/6`, `shadow-sm`, `p-4`). Icon containers swap `bg-gray-100 dark:bg-white/5 p-2` with `h-5 w-5 text-gray-400` icons for the flat tinted `w-8 h-8 bg-theme-primary-50 dark:bg-theme-primary-900/30 rounded-lg` square with `w-4 h-4 text-theme-primary-600` icons — matching `SettingsCard`. Title typography goes from `text-base font-semibold leading-tight` to `text-sm font-semibold tracking-tight`; description from `text-sm text-gray-600 leading-relaxed mt-1` to `text-xs text-gray-500 mt-0.5`. `DatabaseStatusWarning` additionally has its mismatched gray-icon + blue-title normalized to the same neutral typography as the other blocks. Layout-option buttons, `SegmentedToggle`, `Select` dropdown, amber sub-warning, toast feedback, and all `useLayoutTheme` wiring untouched. Spec §6 updated. PR #850.

## 2026-05-18 — Spec 029: align `SettingsModal` with `/client/settings` visual language

- `spec-029` `SettingsModal` surface drops glassmorphism (`bg-white/95 backdrop-blur-xl`, `rounded-2xl`, border `/[0.07]`) for the page-card flat treatment (`bg-white dark:bg-[#111111]`, `border-gray-200 dark:border-white/6`, `rounded-xl`). Backdrop simplifies from a heavy gradient + `backdrop-blur-2xl backdrop-saturate-150` to `bg-black/40 dark:bg-black/60 backdrop-blur-sm`. Header drops the gradient bg + shadow, replaces the gradient/bordered icon container with the page's flat tinted square (`w-8 h-8 bg-theme-primary-50 dark:bg-theme-primary-900/30 rounded-lg` + `w-4 h-4 text-theme-primary-600`), and dials the title from `text-xl font-bold` to `text-base font-semibold tracking-tight` matching the user-card name treatment. Close button loses `hover:scale-110` and uses the page's hover bg. Focus trap, Esc-to-close, body-scroll lock, and `animate-fade-in-up` entry all preserved. Spec updated under §6 Implementation Notes. PR #850.

## 2026-05-18 — Spec 029: align header `SettingsButton` with `/client/settings` icon style

- `spec-029` Header gear button (`apps/web/components/settings-button.tsx`) now uses the same tinted theme-primary square the `SettingsCard` icons use on `/client/settings` (`w-8 h-8 bg-theme-primary-50 dark:bg-theme-primary-900/30 rounded-lg` wrapper, `w-4 h-4 text-theme-primary-600 dark:text-theme-primary-400` icon, hover bumps the wrapper tint). Replaces the previous gray-on-transparent icon + `hover:scale-105` treatment so the header entry point reads as the same control system as the page. `FloatingSettingsButton` intentionally untouched — its solid theme-primary fill is the deliberate shortcut affordance. Spec updated under §6 Implementation Notes. PR #850.

## 2026-05-17 — Spec 029: client-settings Preferences section

- `spec-029` Drafted spec at `docs/spec/029-client-settings-preferences-section/spec.md` and indexed in `docs/spec/README.md`. Embeds the `SettingsModal` block components (`SelectLayout`, `SelectContainerWidth`, `SelectPaginationType`, plus demo-only `SelectDatabaseMode`, `SelectCheckoutProvider`, `DatabaseStatusWarning`) inline as a new **Preferences** section on `/client/settings` so the visual-preference controls are reachable from the settings hub. The modal stays exactly as-is for shortcut access from the header gear and floating button. Page-local primitives only — no shared settings shell extracted in this PR. Adds one new i18n key (`settings.PREFERENCES`) to all 21 locale files. PR #850.

## 2026-05-18 — Spec 027 client notifications system (PR #852)

- `spec-027` New spec `docs/spec/027-client-notifications/` (spec + plan +
  tasks) delivering the client-facing surface of
  [`013-notifications-system`](spec/013-notifications-system/spec.md): header
  bell + dropdown, `/client/notifications` inbox, `/client/notifications/preferences`
  matrix, SSE real-time delivery, and a service-layer `dispatch()` that resolves
  per-user preferences, applies group-key deduplication, and fans out through
  in-memory pub/sub (Redis-ready).
- `spec-027` Additive Drizzle migration `0037_client_notifications.sql`: 22
  new enum values, `priority` / `category` / `actorId` / `groupKey` /
  `archivedAt` / `deliveredChannels` columns, partial unread index, and a new
  `notification_preferences` table with JSONB channel matrix + email digest
  cadence + quiet hours.
- `index` `docs/spec/README.md` indexed entry 027.

## 2026-05-17 — Spec 026 (EW-627) round 5: chart visual redesign

- `spec-026` Extended Spec 026 with §7 covering the visual redesign of the
  five focus chart cards on `/client/dashboard`: Submission Timeline,
  Submission Status, Weekly Activity, Community Engagement, and Approval
  Rate Trend. Acceptance criteria AC-18 through AC-23 added.
- `spec-026` New shared primitive module
  `apps/web/components/dashboard/_chart-primitives.tsx` exporting
  `<ChartCard>`, `<ChartCardSkeleton>`, `<ChartEmptyState>`,
  `<ChartLegend>` / `<ChartLegendItem>`, `<ChartKpi>`,
  `<ChartTooltip>`, `useChartAxisProps()`, and `formatCompactNumber()`.
  Replaces ad-hoc per-chart chrome + Recharts defaults across all five
  redesigned cards.
- `spec-026` Replaced the cramped 3-slice pie in Submission Status with
  a horizontal stacked bar over a per-status row list (icon chip + count
    - percent). Reads at a glance and scales better with future statuses.
- `spec-026` Weekly Activity now flows all three series labels
  ("Submissions", "Views", "Engagement") through `useTranslations()` —
  previously hard-coded English bypassed the i18n layer entirely.
- `spec-026` Community Engagement converted from a flat pie with
  overlapping labels to a donut with the total in the centre + side
  legend with per-slice value and percent. Stacks below `sm`.
- `spec-026` Backfilled 29 new chart-redesign i18n keys across all 20
  non-English locale files with real translations
  (`SUBMISSION_TIMELINE.*`, `ACTIVITY_CHART.*`, plus extensions to
  `STATUS_BREAKDOWN.*` and `ENGAGEMENT_CHART.*`). Backfill script used
  once and removed.

---

## 2026-05-15 — Spec 026 (EW-627) round 2: layout v2 + avatar fix + i18n backfill

- `spec-026` Extended Spec 026 with §6 covering the new dashboard layout
  (header / quick actions / alerts / mobile summary / four content tabs),
  the per-card trend deltas + zero-state CTAs in `StatsCard`, and the
  avatar fix. Acceptance criteria AC-10 through AC-17 added.
- `spec-026` Removed the prototype `7d / 30d / 90d` period selector. The
  control was decorative — `useDashboardStats()` ignored the value and
  every period rendered the same data. Documented as out-of-scope §6.2;
  re-introduce when `GET /api/client/dashboard/stats` accepts `?days=N`
  and the repository plumbs the value through to its date-range queries.
- `spec-026` Avatar regression fix: `<Avatar>` now sets
  `unoptimized={true}` for any external `http(s)://` URL so OAuth-provider
  hostnames not in `next.config.ts > images.remotePatterns` no longer
  fall through to the gradient initials. Also dropped the unconditional
  `priority` prop. Avatars are 32–48 px, so optimization buys nothing.
- `spec-026` Replaced the `t(label).split(' ').slice(-1)[0]` last-word
  hack in `<DashboardMobileSummary>` with dedicated
  `client.dashboard.STATS.*_SHORT` keys. The trick produced broken
  labels in Russian, Arabic, Chinese, and any language where the
  meaningful word isn't the last token.
- `spec-026` Backfilled 30 new dashboard root keys + 4 `STATS.*_SHORT`
  keys across all 20 non-English locale files (`ar`, `bg`, `de`, `es`,
  `fr`, `he`, `hi`, `id`, `it`, `ja`, `ko`, `nl`, `pl`, `pt`, `ru`,
  `th`, `tr`, `uk`, `vi`, `zh`) with real translations (no
  English-identical entries). Backfill script used once and removed.

---

## 2026-05-15 — Spec 026 (EW-627): /client/dashboard UI ↔ API wiring fixes

- `spec-026` New spec `docs/spec/026-ew627-client-dashboard-wiring/` covering
  the seven wiring gaps audited in EW-627: hardcoded `Shares` pie slice,
  always-true `viewsAvailable`, silent fetch errors on `ItemsMapCard` /
  `GeoStatsCard`, missing placeholder when `locationSettings.enabled` is
  false, hardcoded English on engagement-chart and top-items headings,
  loose `StatsCard.value` type, and the always-12-week
  `engagementOverview` window. Indexed in
  `docs/spec/README.md` as row 026.
- `spec-026` API contract: `engagementChartData` items now use a typed
  `{ key, value, color }` shape (`'views' | 'votesReceived' |
'commentsReceived'`) instead of `{ name, value, color }`, and the
  `Shares` slice is removed. Swagger JSDoc on `GET
/api/client/dashboard/stats` updated; re-run `pnpm generate-docs`
  before release to refresh `public/openapi.json`.
- `spec-026` Added 10 new strings under `client.dashboard.*`
  (`LOCATION_DISABLED_TITLE`, `LOCATION_DISABLED_DESC`,
  `ENGAGEMENT_CHART.{TITLE, VIEWS, VOTES_RECEIVED,
COMMENTS_RECEIVED}`, `TOP_ITEMS.{TITLE, ID, NO_DATA, NO_DATA_DESC}`)
  to all 21 locale files with real translations. Backfill script
  used once and removed.

---

## 2026-05-14 — Spec 025 (v5): backfill missing LocationSection translations

- `spec-025` Audit of `/items/[slug]` translation coverage surfaced
  that 8 `itemDetail.*` keys consumed by `LocationSection`
  (`LOCATION`, `REMOTE_SERVICE`, `REMOTE_SERVICE_DESC`,
  `GET_DIRECTIONS`, `LOCAL_SERVICE`, `REGIONAL_SERVICE`,
  `NATIONAL_SERVICE`, `GLOBAL_SERVICE`) existed only in `en.json`.
  Every non-English locale fell back to English for the entire
  Location card. This pre-dated the PR.
- `spec-025` Added the 8 keys to all 20 non-English locale files
  (`ar`, `bg`, `de`, `es`, `fr`, `he`, `hi`, `id`, `it`, `ja`, `ko`,
  `nl`, `pl`, `pt`, `ru`, `th`, `tr`, `uk`, `vi`, `zh`). Each
  locale's values are real translations (no English-identical
  entries). Keys were inserted right after `STATS_AGE` so they sit
  next to the existing Location-section neighbours in `en.json`.
- `spec-025` Wider audit gaps (hard-coded English in
  `breadcrumb.tsx` / `report-button.tsx` / `favorite-button.tsx` /
  `CompactVote`, plus untranslated `COMMENTS_*` / Promo / Survey
  values in several non-Latin locales) remain unaddressed — they
  are pre-existing and out of scope here. Recommend tracking under
  a follow-up spec (e.g. `024-items-i18n-cleanup`).

---

## 2026-05-14 — Spec 025 (v4): inline sparkline inside the compact sidebar Statistics card

- `spec-025` Per user feedback v3 lost the chart by mistake — the
  intent was "keep the chart from v2, but keep the sidebar
  placement from v3, and the smaller/cleaner typography from v3".
  v4 puts the sparkline back into the sidebar Statistics card.
- `spec-025` `<ItemStatsSection>` now renders the six existing
  `text-[11px]` rows AND a small inline SVG sparkline below them,
  separated by a faint top border. The four chartable rows (Views,
  Upvotes, Favorites, Comments) became clickable: selecting one
  tints the row with `theme-primary` (background + text) and
  re-plots the sparkline from that metric. Rating and Listed rows
  remain static. Default selection is Views. Sparkline keeps the
  `theme-primary-500` low-opacity area fill + `theme-primary-600`
  stroke from v2 but is ~14 row-heights tall so the whole card
  stays compact and sidebar-shaped.
- `spec-025` Restored from history: `getItemActivityTimeSeries` +
  `ItemActivityDay` type in `engagement.queries.ts`, and the
  `GET /api/items/[slug]/activity?days=N` route. They were removed
  in v3 and are back exactly as in commit 4780edd. The
  `ACTIVITY_OVERVIEW` / `ACTIVITY_OVERVIEW_DESCRIPTION` i18n keys
  remain removed — the sidebar card reuses the existing
  `itemDetail.STATISTICS` heading.

---

## 2026-05-14 — Spec 025 (v3): revert Activity Overview, keep compact Statistics card in sidebar

- `spec-025` Reverted v2's full-width Activity Overview panel and
  removed the new `/api/items/[slug]/activity` route + the
  `getItemActivityTimeSeries` query function it depended on. Per user
  feedback the page should reuse the existing engagement totals from
  `/api/items/engagement` rather than introducing a time-series surface.
- `spec-025` `<ItemStatsSection>` is back in the sidebar (directly
  below the Tags card), and its typography was tightened to
  `text-[11px]` for both labels and values with `w-3 h-3` icons —
  matches the compact density of the other sidebar cards.
- `spec-025` Removed the `ACTIVITY_OVERVIEW` and
  `ACTIVITY_OVERVIEW_DESCRIPTION` i18n keys from all 21 locales.
- `spec-025` Spec, index status, and this log entry rolled back to
  describe the simpler final shape: full-width carousel +
  compact sidebar stats card.

---

## 2026-05-14 — Spec 025 (v2): Activity Overview panel replaces sidebar Statistics card

- `spec-025` Revision in the same PR: the compact sidebar
  Statistics card shipped in the first iteration is replaced by a
  **full-width Activity Overview** panel under the two-column grid
  and above the Similar Products carousel. The panel has six tiles
  (Views / Upvotes / Favorites / Comments / Avg. rating / Listed) and
  a sparkline below; clicking a chartable tile (Views / Upvotes /
  Favorites / Comments) highlights it with a
  `theme-primary-500 → theme-primary-700` gradient and updates the
  sparkline. Rating and Listed are static tiles.
- `spec-025` New endpoint `GET /api/items/[slug]/activity?days=N`
  returns `{ totals, series[] }` — totals reuse
  `getEngagementMetricsPerItem`, and a new
  `getItemActivityTimeSeries(slug, days)` query in
  `engagement.queries.ts` aggregates `item_views`, `votes`,
  `favorites`, `comments` into daily buckets for the last N days
  (clamped 1–90, default 30), filling missing days with zeros.
- `spec-025` New i18n keys `ACTIVITY_OVERVIEW` and
  `ACTIVITY_OVERVIEW_DESCRIPTION` added under `itemDetail.*` across
  all 21 supported locales.
- `spec-025` `<ItemStatsSection>` is no longer wired into the page
  but kept on disk (no removal without confirmation). The sidebar
  is back to its pre-spec composition (Information / Promo / Sponsor
  / Category / Tags) and the new Activity Overview owns the
  engagement surface end-to-end.

---

## 2026-05-14 — Spec 025: Item detail Similar Products → carousel + new Statistics sidebar block

- `spec-025` On `/items/[slug]`, the old vertical "Similar Products"
  list in the right sidebar (`SimilarItemsSection`) is replaced by a
  **full-width horizontal carousel** rendered below the two-column
  grid, matching the recommended-items UX on `/favorites`
  (prev/next, dot indicators, gradient edge overlays,
  ResizeObserver-driven responsive card count). The carousel logic
  is extracted into a reusable
  `apps/web/components/shared/items-carousel.tsx`.
- `spec-025` The freed sidebar slot now hosts a new
  `<ItemStatsSection>` "Statistics" card showing views, upvotes,
  favorites, comments, average rating, and a relative "Listed N
  days ago" timestamp. Metrics are fetched on mount from the existing
  `/api/items/engagement` endpoint; rows show en-dash placeholders
  until the response resolves.
- `spec-025` Adds 9 new i18n keys under `itemDetail.*`
  (`SIMILAR_PRODUCTS`, `SIMILAR_PRODUCTS_DESCRIPTION`, `STATISTICS`,
  `STATS_VIEWS`, `STATS_VOTES`, `STATS_FAVORITES`, `STATS_COMMENTS`,
  `STATS_AVG_RATING`, `STATS_AGE`) across all 21 supported locales.
- `spec-025` `similar-items-section.tsx` is left in place (no
  imports) per the project's no-removal-without-confirmation rule;
  a follow-up PR can delete the file once the new layout has soaked.

---

## 2026-05-15 — Spec 023: AI Chat default model flipped to free OpenRouter tier

- `spec-023` Plugin schema default `AI_CHAT_MODEL` changed from
  `openai/gpt-4o-mini` (paid) to
  `meta-llama/llama-3.3-70b-instruct:free` (OpenRouter free tier,
  $0/month, rate-limited per account). Operators who paste any free
  OpenRouter key get a working chat at zero cost; paid quality
  upgrades are a one-line `AI_CHAT_MODEL=…` override.
- Cascade follow-up to [the prior 2026-05-15 entry](#2026-05-15--spec-023-ai-chat-on-by-default-operator-only-sets-ai_chat_api_key)
  where the chat was made on by default. The "no key → launcher
  silently hidden" guard in `AiChatMount` is unchanged.

## 2026-05-15 — Spec 023: AI Chat on by default (operator only sets `AI_CHAT_API_KEY`)

- `spec-023` Flipped the plugin schema default from
  `aiChat.enabled: false` to `aiChat.enabled: true` in
  `packages/plugin-ai-chat/src/config.ts`. A directory operator no
  longer needs to add an `aiChat` block to `works.yml` to get the
  chat — they only need to set `AI_CHAT_API_KEY` (and can still set
  `aiChat.enabled: false` to hide it).
- `spec-023` Added a guard in `AiChatMount`: when the schema is
  enabled but `AI_CHAT_API_KEY` is missing, the launcher silently
  no-ops and a one-time `console.warn` fires on the server. Operators
  who haven't provisioned a provider key never ship a broken launcher.
- `spec-023` Updated the disabled-state e2e specs (now
  `no API key (default e2e env)`): the public spec still asserts
  the launcher is absent; the API spec asserts **503
  `provider-not-configured`** rather than 404, matching the new
  contract when the schema is enabled but the key is unset.
- Operator guide (`docs/features/ai-chat.md`) updated: the
  `aiChat` block is now fully optional and the only required step
  to activate the chat is setting `AI_CHAT_API_KEY`.

## 2026-05-15 — Spec 023: AI Chat enabled-state e2e + markdown rendering

- `spec-023` T-005a shipped: assistant chat bubbles render
  through `apps/web/components/ai/ChatMarkdown.tsx`
  (`react-markdown` + GFM + `rehype-sanitize`). User bubbles stay
  plain. Replaces the `**bold**` / list markers leaking through to
  the user as literal text.
- `spec-023` T-013a shipped: `apps/web/lib/services/ai-chat-test-overrides.ts`
  reads an `ai-chat-test-override` cookie gated by
  `E2E_ALLOW_TEST_OVERRIDES=true` AND `NODE_ENV !== production`. Both
  `AiChatMount` and `/api/chat/route.ts` consult the helper before
  evaluating `enabled`, so the same toggle flips the launcher _and_
  the API contract for a single browser context.
- `spec-023` T-013b shipped: gated mock OpenAI-compatible endpoint
  at `apps/web/app/api/__test__/openai-mock/chat/completions/route.ts`.
  Active only with the same env gate; otherwise 404. Tests set
  `AI_CHAT_BASE_URL` at it.
- `spec-023` T-013c-g shipped:
  `apps/web-e2e/tests/public/ai-chat-enabled.spec.ts` (anon flow +
  markdown rendering + `/fr` aria-label + `Esc` returns focus +
  `@axe-core/playwright` clean),
  `apps/web-e2e/tests/client/ai-chat-enabled.spec.ts` (authed
  flow via `clientPage` fixture), and
  `apps/web-e2e/tests/api/ai-chat-enabled.spec.ts` (200 streaming
  Content-Type, 401 auth-only scenarios, 429 rate-limit). All
  `test.skip` when the override env vars are not provisioned.
- Closes AC-8 (a11y) and AC-9 (e2e). AC-10 (`/chat` route +
  non-floating positions) still tracked under T-005d.

## 2026-05-14 — Spec 024: EW-120 platform Activity Feed (pull + push)

- `spec-024` Net-new `GET /api/platform/activity-feed` route handler
  authenticates the Ever Works platform via HMAC-SHA256 over
  `${timestamp}:${queryString}:${workId}` (wire-compatible with the
  platform's `DirectoryWebsiteClient`), then returns a normalised
  page of users / items / reports drawn from `users`,
  `itemAuditLogs`, and `reports`.
- `spec-024` Push mode added in the same PR: fire-and-forget
  `emitActivityEvent(...)` POSTs to the platform's
  `/api/activity-log/ingest` endpoint from four event hook sites —
  user registration (`lib/auth/index.ts`), item creation
  (`app/api/admin/items/route.ts`), report filed (`app/api/reports/route.ts`),
  and report resolved (`app/api/admin/reports/[id]/route.ts`).
  Fresh UUID `eventId` per call (platform stores `(workId, eventId)`
  uniquely so retries are idempotent). 2 retries with 200ms → 800ms
  backoff; 4xx is permanent (no retry), 5xx / network / timeout
  retryable. 5-second per-request timeout via `AbortController`.
- New env vars: `PLATFORM_WORK_ID` (shared), `PLATFORM_SYNC_SECRET`
  (pull), `PLATFORM_ADMIN_BASE_URL` (optional, pull),
  `PLATFORM_API_URL` (push), `PLATFORM_API_SECRET_TOKEN` (push).
  Pull vars blank → 503 `not_provisioned`; push vars blank → silent
  no-op (no warning spam for OSS users not on the platform).
- Per-source over-fetch of `limit` rows from each of the three pull
  sources, then global merge by timestamp DESC, then slice — same
  fix as the platform-side Codex P1 (commit `4070ec08` on
  ever-works PR #740) so a dominant source can't starve the page.

## 2026-05-13 — Spec 023: AI Chat for Directory Visitors (proposed)

- `spec-023` Drafted `docs/spec/023-ai-chat/` (spec + plan + tasks)
  for EW-132. Proposes a self-contained AI chat plugin
  (`packages/plugin-ai-chat/`) built on the Vercel AI SDK
  (`ai@^6`, `@ai-sdk/react@^3`), opt-in via `works.yml`, with
  three layout modes (floating / hero-takeover / sidebar),
  anonymous-vs-authenticated scenario gating, six-locale i18n
  (FR required by Jira AC), and `next/dynamic`-loaded panel so
  the public bundle is preserved when the feature is off.
- `docs/spec/README.md` Indexed spec 023 (status: _proposed_).

---

## 2026-05-12 — Spec 022: data-URL avatar fix + Discover-Users relocation

- `spec-022` Avatars stored as base64 data URLs in
  `client_profiles.avatar` were never rendering anywhere that
  goes through `components/header/avatar.tsx`'s
  `isValidImageUrl()` gate — the helper only accepted relative
  paths and `http(s):` URLs, silently dropping every data URL.
  Affected surfaces: top-nav profile button + dropdown header,
  comments section (current user's avatar in the comment form
  AND each past comment author's avatar). Fixed by accepting
  `data:image/*` in `isValidImageUrl` and passing
  `unoptimized` to Next/Image for data URLs so the optimizer
  doesn't try to transform them.
- `spec-022` AC-19 reworked: the "Discover Users" entry was
  moved off the global profile-button dropdown and onto the
  profile page header card itself (visible to any authenticated
  viewer alongside the Edit-profile / Follow action). Discovery
  starts from a profile, not from the header nav. PR #816.

## 2026-05-12 — Spec 022: 2-column dashboard layout for /client/profile (EW-613)

- `spec-022` AC-22 added: rebuilt the public profile page as a
  Toptal-style 2-column dashboard. New `ProfilePanel` component
  (sticky left card with cover banner + avatar overlap, name +
  role pill, skills/interests chips, four info boxes — Location,
  Member since, Company, Website — and the action row).
  `ProfileStatsStrip` gained a `headline` variant (3 large tiles
  for followers / following / submissions) used at the top of the
  right column above the existing compact 6-tile strip. Sections
  (About, Recent Activity, Skills, Portfolio) now stack
  vertically in the right column with `Manage` shortcuts for the
  owner; the previous tab-gated `ProfileContent` is bypassed by
  the new layout (component kept in tree for future surfaces).
  Visual tokens match the rest of the template: `Container`,
  `Card`, `theme-primary-*`, `rounded-xl`, dark-mode parity.
  Tracked under [EW-613](https://evertech.atlassian.net/browse/EW-613).

## 2026-05-12 — Spec 022: stale-session fix extended to displayName

- `spec-022` Extended AC-21 to also cover `displayName`. The
  same staleness pattern that hit the avatar also hit the
  user's name in the top-nav and in the dropdown header.
  `/api/current-user` now also prefers
  `client_profiles.displayName || .name` over
  `session.user.name`; basic-info form invalidation now triggers
  on avatar OR displayName change; the profile header's inline
  displayName editor invalidates the cache via the new `onSaved`
  callback path. PR #816.

## 2026-05-12 — Spec 022: avatar propagation fix

- `spec-022` AC-21 added: top-nav profile button (and anything
  else reading `useCurrentUser()`) was showing the stale NextAuth
  `session.user.image` after the user changed their avatar via
  basic-info. Fixed by (a) making `/api/current-user` prefer
  `client_profiles.avatar` when the session has a
  `clientProfileId`, falling back to the session image otherwise;
  (b) invalidating the `auth-session` React-Query key from the
  basic-info form when the avatar value changes, so active
  subscribers refetch immediately. PR #816.

## 2026-05-12 — Spec 022: new-follower notifications

- `spec-022` AC-20: widened the `notifications.type` text enum
  with `'user_followed'` (no DB migration — column is plain TEXT,
  TS-level union only). `followUser()` now emits a best-effort
  notification on first-follow only (skipped when the row already
  existed), with the follower's display name in the message and
  their userId/username in the `data` JSON blob. Notification
  failures are logged but never break the follow. PR #816.

## 2026-05-12 — Spec 022: profile-menu nav link for /client/users

- `spec-022` AC-19: added a "Discover Users" entry to the
  profile-button dropdown (non-admin view) linking to
  `/client/users`. Without this, the directory was reachable only
  via direct URL or the followers/following stat tiles on a
  profile page. New `common.DISCOVER_USERS` /
  `common.DISCOVER_USERS_DESC` i18n keys (English; other locales
  fall back). PR #816.

## 2026-05-12 — Spec 022: users directory at /client/users

- `spec-022` AC-18 added: new public users directory at
  `/client/users`. URL-driven server-side search (filters
  displayName, username, name, jobTitle, bio, location, all
  case-insensitive) + pagination, 30 rows per page, admins
  excluded. Uses the existing `ProfileRow` + `getFollowingSubset`
  helpers, so each row carries a follow button initialized from
  the viewer's follow state. New `searchPublicProfiles` query in
  `client.queries.ts`. PR #816.

## 2026-05-12 — Spec 022: followers / following drill-down pages

- `spec-022` AC-17 added: new pages
  `/client/profile/<username>/followers` and `.../following` render
  paginated lists (30/page) of who follows / is followed, each row
  with a working Follow button initialized from the viewer's
  follow state via the new `getFollowingSubset()` helper. The two
  stats-strip tiles ("Followers", "Following") link to these
  pages. PR #816.

## 2026-05-12 — Spec 022: polish — recent activity feed + skills empty state

- `spec-022` Added AC-15 (Recent Activity card on the About tab
  listing the last five comments authored by the profile owner via
  the new `getRecentCommentsByClientProfile` query — links each
  entry to its item slug) and AC-16 (Skills tab renders a clean
  empty-state card instead of showing a 0%-proficiency summary
  when the profile has no skills). PR #816.

## 2026-05-12 — Spec 022: follow-up — public profiles, follows, inline edit

- `spec-022` Extended Spec 022 with: public profile viewing (drop
  username-mismatch redirect; 404 on missing); new `user_follows`
  table (migration `0034`) with cascade scoping + self-follow check
  constraint; `GET/POST/DELETE /api/user/profile/follow/[username]`
  for follow toggle + count; new `ProfileStatsStrip` showing
  followers / following / submissions / comments / favorites /
  portfolio; inline-edit on every editable field in the header and
  About section, hitting the existing `PATCH /api/user/profile`
  route with optimistic UI. PR #816.

## 2026-05-12 — Spec 022: profile UX polish (in-progress)

- `spec-022` New spec under `docs/spec/022-profile-ux-polish/`
  describing end-to-end persistence for the client profile:
  avatar (as data URL in the existing `client_profiles.avatar`
  column), new `interests text` and `skills jsonb` columns, new
  `portfolio_projects` table with full CRUD, and the public profile
  view rendered from saved data. Wires the basic-info form
  (currently a no-op) and the portfolio editor (currently local
  state only) through `GET`/`PATCH /api/user/profile` and
  `/api/user/profile/portfolio*` routes. Fixes a long-standing bug
  where the public profile page hardcoded `avatar: ''`. See PR
  (forthcoming).
- `index` `docs/spec/README.md` index updated with row 022.

## 2026-05-11 — `AGENTS.md` + `CLAUDE.md`: explicit Definition of Done

- `agents` `AGENTS.md` §2 now leads with a ⚠️ "Definition of Done"
  callout listing the five spec/log checks (spec file, plan if
  architectural, README index row, log entry, questions with
  defaults). Adds explicit trivial-fix exception. References the
  May 2026 incident (PRs #777 → #803 shipped without docs; catch-up
  cost #804 → #806) as the precedent that motivated the louder
  language.
- `claude` `CLAUDE.md` Mirrors a short ⚠️ Definition-of-Done
  callout right under the "Read first" block so it's visible to
  every Claude Code session opening this repo.
- `docs/log.md` (this file) gets the entry. Eating the dogfood.

## 2026-05-11 — Spec 020 follow-ups: sort URL sync + redirect-loop guard

- `spec-020` Sort URL sync (`?sort=<key>`) shipped to production
  (PRs #798 → #799 → #800). Was a bare `useState` setter — never
  wrote URL, never triggered re-render. On the home page (server-
  sliced post Spec 020), client-side sorting is disabled, so the
  user clicking "Name (A-Z)" did literally nothing visually.
- `apps/web/components/filters/hooks/use-filter-state.ts`,
  `…/use-filter-url-sync.ts`, `…/filter-url-parser.tsx` Wired
  `setSortBy` through `syncFilterURL`; `FilterState` carries
  optional `sort?: string`; URL writes `?sort=<key>` (omitting
  `popularity` for clean bookmarks); parser reads + validates +
  pushes back into context.
- `apps/web/components/tags-cards.tsx`,
  `apps/web/components/categories-grid.tsx` Switched
  `useRouter` / `usePathname` imports from `next/navigation`
  (locale-unaware) to `@/i18n/navigation`. Was producing
  locale-less URLs on non-default locales, tripping the inline
  `LocaleCookieRedirect` script and causing the `/` ⇄
  `/?categories=…` ping-pong reported by the user.
- `apps/web/components/i18n/locale-cookie-redirect.tsx` Added
  `sessionStorage` loop guard (`lcr_g`): redirects fire at most
  once per session. Cleared if URL settles into a state matching
  the cookie.
- `spec-021` New e2e specs: `sort-url-sync.spec.ts` (6 tests),
  `locale-redirect-loop-guard.spec.ts` (5 tests). Comparisons
  spec deepened from 2 → 6 tests (PRs #801 → #802 → #803).
- `spec-020` Drafted `docs/spec/020-server-side-listings/spec.md`
  capturing the original server-side-slice work + all post-facto
  follow-ups (PRs #777, #780, #783, #786, #792, #798).
- `spec-021` Drafted `docs/spec/021-public-e2e-coverage/spec.md`
  capturing the testing investment that catches regressions like
  the paging + sort + redirect-loop bugs at PR time.

## 2026-05-11 — Spec 020 follow-up: slugify-aware category state

- `spec-020` Category-selection state mismatch (PRs #792 →
  #793 → #794). Clicking "Practices" applied the URL filter
  (`?categories=Practices`) but the button's `aria-pressed`
  stayed `false`. Cause: `FilterURLParser` slugifies on read
  (`"Practices" → "practices"`) while the click handler stored
  `category.id="Practices"` verbatim; strict equality in
  `CategoryItem.isActive` failed. Same bug in
  `ActiveFilters.selectedCategoryData` chip lookup.
- `apps/web/components/filters/components/categories/categories-list.tsx`,
  `…/categories-section.tsx`,
  `apps/web/components/filters/components/active-filters/active-filters.tsx`
  Normalised every category-id comparison through `slugify` so
  the URL round-trip is lossless regardless of YAML id casing.
- `spec-021` Added `categories-modifier-select.spec.ts` and
  augmented `categories.spec.ts` / `tags.spec.ts` to catch the
  next iteration of this class of bug.

## 2026-05-11 — Spec 021: deepen public e2e coverage

- `spec-021` Four new flow specs + 6 augmented thin specs +
  2 page-object hardening commits, shipped via PRs #789 → #790 →
  #791 (initial) and #795 → #796 → #797 (localStorage isolation
  follow-up).
- New specs: `listing-flow-comprehensive.spec.ts`,
  `listing-api-filters.spec.ts`, `listing-url-state.spec.ts`,
  `public-feeds.spec.ts`, `listing-infinite-scroll.spec.ts`,
  `tag-and-category-detail-pages.spec.ts`,
  `active-filters-and-clear.spec.ts`, `settings-modal.spec.ts`,
  `header-and-hero.spec.ts`.
- Page-object hardening: `view-toggle.page.ts` multi-marker
  active-state detection; `sort-menu.page.ts` filter by visible
  sort label to disambiguate from header "More" dropdown.

## 2026-05-10 — Spec 020: server-side listing slice + URL-driven filter / sort / pagination

- `spec-020` Inversion of the listing model (PR #777, plus
  follow-ups #780, #783, #786). Was shipping the entire ~992-item
  catalogue as a 3.7 MB RSC payload to every browser; now slices
  to a 12-item page server-side, ~50 KB body. URL becomes source
  of truth for `?tags=`, `?categories=`, `?q=`, `?sort=`, `?page=`.
- `apps/web/app/[locale]/(listing)/discover/[page]/page.tsx` SSR
  filter + sort + slice.
- `apps/web/app/api/items/listing/route.ts` New JSON peer for
  server-paginated infinite scroll.
- `apps/web/lib/listing-server.ts` Shared `sortItems` +
  `parseCsv` so SSR + API agree.
- `apps/web/components/shared-card/hooks/use-pagination-logic.ts`,
  `…/use-server-infinite-loading.ts` URL-driven numbered pagination
    - JSON-API-backed infinite scroll.
- `apps/web/components/filters/components/tags/tags-section.tsx`
  Hard-cap tag-strip DOM at `TAG_STRIP_HARD_CAP = 30` (#780). The
  pre-cap version rendered 855 HeroUI buttons × 2 layouts × ~1 KB
  classes each on every page.
- `apps/web/components/shared-card/index.tsx` Server-paginated
  mode detection (`total > items.length`); header counter fix
  (#786); modifier-key category select wiring.

## 2026-05-10 (cont — Spec 019 Pattern C wired up)

- `apps/web/proxy.ts` Implements Pattern C in middleware: when
  `LOCALE_DETECTION_MODE=server-redirect` env var is set, the
  middleware parses `Accept-Language`, picks the closest supported
  locale, and 307s on first visit (no `NEXT_LOCALE` cookie). The
  redirect sets the cookie so subsequent requests flow through the
  inline `<head>` cookie-redirect script in `app/layout.tsx`.
- This finishes Spec 019 — the previous commit shipped the YAML knob
    - Pattern A banner + Pattern B URL-style env, but left Pattern C
      as docs-only. Now all three patterns described in
      `docs/performance/locale-detection.md` are runnable.

## 2026-05-10 — Spec 019: CDN-cacheable public surface + pluggable locale detection

- `spec-019` Drafted spec/plan/tasks for `019-cdn-cacheable-i18n` —
  fixes `demo.ever.works` shipping `Cache-Control: no-store` on
  every request despite ISR being configured. Root cause:
  `next-intl` `localeDetection: true` mutates the response so
  Vercel's edge cache bypasses it.
- `i18n/routing.ts` Default flips to `localeDetection: false`. New
  build-time env var `LOCALE_URL_STYLE` (`as-needed` | `always`)
  controls URL prefix style.
- `apps/web/lib/utils/settings.ts` New `getLocaleDetection()` reads
  `settings.i18n.locale_detection` from the site YAML;
  `client-banner` (default) | `none`.
- `apps/web/components/i18n/locale-suggestion-banner.tsx`,
  `locale-cookie-redirect.tsx` New userland Pattern A
  implementation: a dismissible banner suggests the visitor's
  browser locale after hydration, and a tiny inline `<head>`
  script redirects returning visitors before paint based on
  `NEXT_LOCALE` cookie. Keeps `/` fully edge-cacheable.
- `apps/web/lib/content.ts` `fetchItems` now throws when an item
  read fails with an IO error instead of silently dropping it from
  the listing. Closes the "few items rendered" silent-symptom bug.
- `apps/web/proxy.ts` Removed `[Client Guard Debug]` `console.log`
  that ran on every `/client/*` request.
- `apps/web/next.config.ts` `output: 'standalone'` is now gated on
  `STANDALONE_BUILD=true` env var (Dockerfile sets it; Vercel
  doesn't). Lets Vercel use its native serverless packaging.
- `docs/performance/cdn-cacheability.md`,
  `docs/performance/locale-detection.md`,
  `docs/performance/content-loading.md` New operator-facing pages.
- `apps/web-e2e/tests/public/home-perf.spec.ts`,
  `apps/web-e2e/tests/i18n/locale-detection-banner.spec.ts` New
  Playwright coverage.
- `questions` Added Q-019a (server-redirect in YAML?) and Q-019b
  (localized banner copy?), both with chosen defaults.

## 2026-05-09 (cont 2 — swap to `feed` library)

- `lib/seo/feeds.ts` `apps/web/package.json`
  Replaced ~250 LOC of hand-rolled RSS/Atom/JSON Feed XML/JSON string
  templating with delegation to the npm
  [`feed`](https://www.npmjs.com/package/feed) library (~5M weekly DLs,
  emits all three formats from one populated `Feed` instance). Public
  signatures (`generateRss`, `generateAtom`, `generateJsonFeed`,
  `buildFeedEntries`, `resolveFeedConfig`, `FeedEntry`, `FeedConfig`)
  unchanged so the route handlers in `app/rss.xml/`, `app/atom.xml/`,
  `app/feed.json/` keep working without edits. `generateJsonFeed`
  post-processes the library's JSON Feed 1.0 output to bump the
  `version` URL to `https://jsonfeed.org/version/1.1` and add the
  1.1-only `language` field. Same swap applied symmetrically to the
  Astro minimal template's `@ever-works/plugin-rss` package.

## 2026-05-09 (cont)

- `app/rss.xml` `app/atom.xml` `app/feed.json` `lib/seo/feeds.ts`
  `app/[locale]/layout.tsx` `lib/seo/ai-crawlers.ts`
  Feeds + AI-crawler list update (follow-up to the discoverability pass earlier the same day):
    - Added `lib/seo/feeds.ts` — pure helpers `buildFeedEntries`,
      `generateRss`, `generateAtom`, `generateJsonFeed` sharing a single
      `FeedConfig`. Items sorted by `updated_at` desc, capped at 50.
    - New routes at `app/rss.xml/route.ts`, `app/atom.xml/route.ts`,
      `app/feed.json/route.ts` (RSS 2.0, Atom 1.0, JSON Feed 1.1
      respectively). Replaces the previously-advertised-but-unimplemented
      `/atom.xml` reference in `llms.txt`.
    - Locale layout `generateMetadata` now emits
      `<link rel="alternate" type="application/rss+xml" …>` plus the
      Atom and JSON-Feed equivalents for autodiscovery on every page.
    - `lib/seo/ai-crawlers.ts` trimmed and randomized: list is now
      exactly 18 bots (GPTBot, ChatGPT-User, OAI-SearchBot, ClaudeBot,
      Claude-User, Claude-SearchBot, anthropic-ai, PerplexityBot,
      Perplexity-User, Google-Extended, Applebot, Applebot-Extended,
      Bingbot, CCBot, Meta-ExternalAgent, Amazonbot, Bytespider,
      cohere-ai), rendered in randomized order so no single operator
      appears clustered or "first" in robots.txt. Removed speculative
      extras (Diffbot, MistralAI-User, YouBot, Timpibot,
      Meta-ExternalFetcher, DuckAssistBot, Claude-Web,
      cohere-training-data-crawler).
    - `app/robots.ts` allow-list extended with `/rss.xml`, `/atom.xml`,
      `/feed.json`.
    - `app/llms.txt/route.ts` advertises `/feed.json` and `/rss.xml`
      alongside the previously listed `/atom.xml` and `/sitemap.xml`.

## 2026-05-09

- `docs/log`
  Noted category sidebar and overflow tag dropdown virtualization for
  large taxonomy catalogs.

- `docs/log`
  Noted production log-noise cleanup for missing optional CMS pages,
  stale item directories, oversized listing cache payloads, and
  anonymous engagement metric tenant resolution.

- `docs/features/seo` `app/robots.ts` `app/llms.txt` `app/llms-full.txt`
  AI agent / LLM discoverability pass:
    - Added `lib/seo/ai-crawlers.ts` — explicit allow-list for major AI bots
      (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, etc.) wired into
      `app/robots.ts`. Default policy is `allow`; override via `AI_CRAWLERS`
      env var (`allow` | `disallow` | `none` | comma-list).
    - Added `app/llms-full.txt/route.ts` — long-form companion to
      `/llms.txt` that concatenates every category, tag, item body, and
      comparison into a single Markdown document.
    - Added per-page Markdown mirrors at `<path>.md` for items, categories,
      tags, collections, comparisons, `/pages/<slug>`, and the static info
      pages (`about`, `help`, `pricing`, `privacy-policy`,
      `terms-of-service`, `cookies`). HTML pages advertise the mirror via
      `<link rel="alternate" type="text/markdown">`. Renderers live in
      `lib/seo/markdown-mirror.ts`; URLs are wired via `next.config.ts`
      rewrites onto internal `_md/route.ts` and `_static-md/[slug]/route.ts`
      handlers.
    - Added `<BreadcrumbJsonLd>` server component at
      `components/seo/breadcrumb-json-ld.tsx` and emitted Schema.org
      `BreadcrumbList` JSON-LD on every public listing/detail/static page
      that previously lacked it.
    - `lib/seo/listing-metadata.ts` now takes a `hasMarkdownMirror` flag
      that, when true, adds `alternates.types['text/markdown']` to the
      page's `<head>`.
    - `app/llms.txt/route.ts` updated to advertise `/llms-full.txt` and
      the per-page `.md` mirror URL convention.

## 2026-05-05

- `docs/plugins` `docs/index`
  Added the dedicated per-source-file landing page
  `docs/plugins/featured-items-query-spec.md`
  for the existing pre-landed e2e spec
  [`apps/web-e2e/tests/api/featured-items-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/featured-items-query.spec.ts)
  paired with the `GET` export of
  `apps/web/app/api/featured-items/route.ts` --
  the **first per-source-file GET smoke pinning a
  public (no-auth-gate) tenant-resolving listing
  endpoint** combining a
  **`Number.parseInt(searchParams.get('limit') ??
'6', 10)` default-`6` parse path** with explicit
  radix-`10` (load-bearing for any caller submitting
  a leading-`0` value that some `parseInt`
  implementations would treat as octal), a
  **`Math.min(Math.max(rawLimit, 1), 50)` two-sided
  silent clamp** (the FIRST per-source-file GET
  smoke pinning a clamp that covers BOTH endpoints
  of a `[1, 50]` range -- distinct from
  `items-popularity-scores`'s one-sided
  `Math.min(parseInt(limit), 100)` upper-clamp-only,
  AND `sponsor-ads-public`'s
  `Math.min(Math.max(1, Math.floor(rawLimit)), 50)`
  clamp that uses `Math.floor` instead of
  `Number.parseInt`-based truncation), a
  **`Number.isFinite(rawLimit)` non-finite
  fallback** (NaN / empty / `abc` collapse to the
  default `6`), a **strict-string
  `searchParams.get('includeExpired') === 'true'`
  boolean-from-string parse** (the FIRST per-
  source-file GET smoke pinning a strict-string
  boolean parser on a query parameter -- only the
  literal lowercase `'true'` flips the default;
  `?includeExpired=TRUE`, `?includeExpired=1`,
  `?includeExpired=false`, `?includeExpired=` all
  keep `false`), an **`await getTenantId()` tenant-
  resolution null-short-circuit** (the FIRST per-
  source-file GET smoke pinning a route whose null-
  tenant branch returns the SAME `{ success: true,
data: [], count: 0 }` envelope as the success
  branch and the `checkDatabaseAvailability()`
  short-circuit -- the route does NOT 401 or 403
  on a null tenant), an **`isActive: true` +
  `tenantId` two-condition WHERE clause** (the
  FIRST per-source-file GET smoke pinning a public
  listing route that combines an `isActive` flag
  check with a tenant-scoping check inside the
  same `and(...)` clause; the `includeExpired`
  parameter only affects whether the optional
  `or(isNull(featuredItems.featuredUntil),
gte(featuredItems.featuredUntil, currentDate))`
  expiration filter is appended), a **multi-key
  composite ORDER BY** (the FIRST per-source-file
  GET smoke pinning a Drizzle two-key composite
  ordering `desc(featuredItems.featuredOrder),
desc(featuredItems.featuredAt)`), a **`{ success,
data, count }` three-key envelope** (the FIRST
  per-source-file GET smoke pinning a public-
  route success envelope that adds a `count:
number` cardinality key alongside `success` /
  `data`), and a **try / catch empty-list
  fallback (NOT 500)** (the FIRST per-source-file
  GET smoke pinning a route that catches every
  internal error and returns the same empty-list
  envelope as the null-tenant branch and the
  `checkDatabaseAvailability()` short-circuit --
  three distinct branches all collapse onto the
  same observable success envelope). UNIQUE: every
  prior per-source-file public-route GET smoke
  (`sponsor-ads-public`, `items-popularity-scores`,
  `agent-discovery`) pins a route whose error /
  null-state branch returns either a distinct
  envelope or NO envelope (a 4xx); this is the
  FIRST per-source-file GET smoke that pins a
  route whose null-tenant branch, DB-unavailable
  branch, AND outer-catch branch ALL collapse onto
  the SAME `{ success: true, data: [], count: 0 }`
  empty-list envelope. The new page documents the
  `Number.parseInt(value ?? '6', 10)` default-`6`
  parse path with explicit radix-`10`, the
  `Math.min(Math.max(rawLimit, 1), 50)` two-sided
  silent clamp, the `Number.isFinite(rawLimit)`
  non-finite fallback, the strict-string `=== 'true'`
  boolean-from-string parse, the `getTenantId()`
  tenant-resolution null-short-circuit, the
  `isActive: true` + `tenantId` two-condition
  WHERE clause, the
  `desc(featuredItems.featuredOrder),
desc(featuredItems.featuredAt)` multi-key
  composite ORDER BY, the `{ success, data, count }`
  three-key envelope, the try / catch empty-list
  fallback, the at-a-glance scenario tree (one
  query-string bulk-loop walk covering ~30
  permutations -- no-arg baseline, valid `limit`
  1/6/10/50, out-of-range upper `limit` 51/999/10000
  admit-clamped to 50, out-of-range lower `limit`
  0/-5 admit-clamped to 1, empty / `abc` / `NaN`
  `limit` `Number.parseInt`-default fallback to
  `'6'` and `Number.isFinite(NaN) === false`
  non-finite branch, float `limit` 6.5/49.9
  `Number.parseInt` integer-truncation, whitespace /
  `+` `limit` `%2010` / `%2B10` `Number.parseInt`
  tolerance, strict-string `includeExpired`
  true/false/1/0/empty/TRUE pinning the
  `=== 'true'` strict-equality check, combined
  `limit + includeExpired`, unknown query keys
  silently ignored, all asserting `< 500`), the
  cross-references to the cross-cutting
  [`items.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/items.spec.ts)
  (also probes `GET /api/featured-items` BUT only
  the no-arg baseline; this per-source-file spec
  adds the **query-param surface**), the
  neighbouring auth-gated admin sibling
  [`admin-featured-items-id-method-spec.md`](admin-featured-items-id-method-spec.md),
  the neighbouring admin listing sibling
  [`admin-featured-items-create-body-spec.md`](admin-featured-items-create-body-spec.md),
  the neighbouring popularity-scores sibling
  [`items-popularity-scores-query-spec.md`](items-popularity-scores-query-spec.md),
  the neighbouring sponsor-ads sibling
  [`sponsor-ads-checkout-body-spec.md`](sponsor-ads-checkout-body-spec.md),
  and the change protocol (update this page in the
  same PR that touches the source spec, update
  `docs/log.md`, run `pnpm tsc --noEmit` in
  `apps/web-e2e`). With this entry the **per-
  spec-file docs rollout extends to 117-of-N** and
  the **`tests/api/` per-spec-file sub-rollout
  extends to 114-of-many**, and the **first per-
  source-file GET smoke pinning a public (no-auth-
  gate) tenant-resolving featured-items listing
  handler** lands -- pinning a tenant-resolution
  null-short-circuit envelope shape, a two-sided
  silent clamp, an explicit-radix `Number.parseInt`
  parse path, a strict-string boolean parser, a
  multi-key composite ORDER BY, a three-key
  `{ success, data, count }` envelope, and a try /
  catch empty-list fallback that no prior per-
  source-file public-route GET smoke covers.
  `docs/plugins/collections-exists-query-spec.md`
  for the existing pre-landed e2e spec
  [`apps/web-e2e/tests/api/collections-exists-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/collections-exists-query.spec.ts)
  paired with the `GET` export of
  `apps/web/app/api/collections/exists/route.ts` --
  the **second member of the public-existence-probe
  trio** to receive a per-source-file landing page
  (after the previously-landed
  `categories-exists-query-spec.md` Git-CMS
  catch-and-200 sibling and the previously-landed
  `surveys-exists-query-spec.md` DB-service
  catch-and-200 sibling -- both still in flight on
  open PRs). With this entry the **three-member
  existence-probe trio is now fully documented
  per-source-file**. UNIQUE within the trio: this is
  the **catch-and-500** member -- every thrown error
  inside `collectionRepository.findAll` is caught and
  the route returns a `500` status with the extra
  `error: 'Failed to check collections existence'`
  field (distinct from both siblings whose catch
  branches return `200 OK`). Also UNIQUE within the
  trio in three other dimensions: (1) the route reads
  **zero** query parameters today (the `_request`
  parameter is underscored to mark it deliberately
  unused -- vs `?locale=` on categories and `?type=`
  on surveys); (2) the route runs above the
  **DB-repository** backing store via
  `collectionRepository.findAll` directly (NOT a
  Git-CMS reader like categories and NOT a service-
  layer wrapper like surveys); (3) the catch branch
  fires `console.error` **unconditionally** on every
  environment (NOT only in development mode like
  categories and NOT silently like surveys). The
  hard-coded `{ includeInactive: false }` repository
  flag is also load-bearing: a future contributor who
  wires `?includeInactive=true` into the call would
  also need to flip the response envelope shape or
  add a separate `inactiveCount` field; the new spec
  pins this with a per-flag invariance walk that no
  other existence-probe spec has. The new page
  documents the cross-route exists-probe matrix (this
  route vs `/api/categories/exists` vs
  `/api/surveys/exists` -- now with backing store +
  query-param + catch-status + catch-envelope +
  catch-logging columns), the at-a-glance scenario
  tree (~50-path bulk-loop walk + five hand-written
  invariants including the UNIQUE zero-query-input
  contract walk and the UNIQUE `?includeInactive=`
  invariance walk), the cross-references to the
  catch-and-200 Git-CMS-backed sibling, the
  catch-and-200 DB-service-backed sibling, the
  cross-cutting `feature-existence.spec.ts` no-arg-
  baseline sibling, the DB-backed admin sibling at
  `/api/admin/collections`, the collection-detail
  GET / PUT / DELETE sibling, the collection-create
  POST sibling, and the Spec 010 governance anchor.
  Matching `docs/index.md` entry added at the surveys
  cluster (just above the
  `surveys-id-responses-method-spec` entry) of the
  per-source-file rollout list. The corresponding
  e2e spec file is unchanged -- this run lands the
  docs landing page that was missing.
  `docs/plugins/health-database-query-spec.md`
  for the existing pre-landed e2e spec
  [`apps/web-e2e/tests/api/health-database-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/health-database-query.spec.ts)
  paired with the `GET` export of
  `apps/web/app/api/health/database/route.ts` --
  the **first per-source-file GET smoke pinning a
  public (no-auth-gate) zero-argument health-probe
  endpoint** combining a **hard-coded
  `db.execute(sql\`SELECT 1 as test\`)` round-trip**
  (no parameter binding, no URL-driven SQL), a
  **two-branch (200-healthy / 500-unhealthy) status
  envelope** determined by the database's
  reachability NOT the URL, a **shared
  `{ status, database, timestamp }` envelope
  shape** across both branches with a branch-
  specific fourth key (`result` on success, `error`
  on failure), and a **bare zero-argument
  `GET()` Next 16 handler signature** that NEVER
  reads the request URL. UNIQUE: every prior per-
  source-file public-route GET smoke
  (`featured-items-query`, `items-popularity-scores`,
  `sponsor-ads-public`, `agent-discovery`) asserts
  a generic `< 500` contract because their `500` is
  a regression signal; this is the FIRST per-
  source-file GET smoke that asserts the tighter
  `[200, 500]` two-valid-status contract because
  the route's `500` is an EXPECTED outcome (catch
  branch when the configured database is
  unreachable, which the e2e environment does not
  guarantee). The new page documents the hard-
  coded `SELECT 1` round-trip, the two-branch
  shared `{ status, database, timestamp }`
  envelope shape, the bare zero-argument `GET()`
  handler signature, the `[200, 500]` two-valid-
  status contract, the status-invariance under URL
  changes contract (parameterised URL's status MUST
  equal baseline's AND parameterised body's
  `status` field MUST equal baseline's), the SQL-
  injection invariance contract (SQL-injection-
  shaped `?schema=` / `?table=` values do NOT reach
  the SQL layer because `sql\`SELECT 1\`` is hard-
coded with no parameter binding), the canonical
health-envelope shape contract (`status`is a
string from`['healthy', 'unhealthy']`, `database`is a string from`['connected', 'disconnected']`,
`timestamp`is a`Date.parse`-able ISO-8601
string), the non-JSON `format`invariance (the
route always responds`application/json`regardless of any`Accept`header or`?format=text`/`?format=prometheus`parameter), the at-a-glance scenario tree (one
query-string bulk-loop walk covering ~50
permutations PLUS three hand-written tests --
canonical-envelope shape assertion, status-
invariance test, SQL-injection invariance test --
all asserting the`[200, 500]` two-valid-status
contract), the cross-references to the cross-
cutting
[`health.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/health.spec.ts)
(also probes `GET /api/health/database` BUT
only the no-arg baseline; this per-source-file
spec adds the **query-param surface** + the
**SQL-injection invariance contract** + the
**canonical-envelope shape assertion**), the
neighbouring
[`internal-db-init-query-spec.md`](internal-db-init-query-spec.md)
(documents the related `/api/internal/db-init`
surface that complements the database-health
endpoint -- init-time vs probe-time database
surfaces), the neighbouring
[`cron-sync-query-spec.md`](cron-sync-query-spec.md)
(another zero-argument GET handler that mirrors
this spec's bare `GET()`signature posture), and
the change protocol (update this page in the
same PR that touches the source spec, update`docs/log.md`, run `pnpm tsc --noEmit`in`apps/web-e2e`). With this entry the **per-spec-
file docs rollout extends to 118-of-N** and the
**`tests/api/`per-spec-file sub-rollout extends
to 115-of-many**, and the **first per-source-
file GET smoke pinning a public (no-auth-gate)
zero-argument health-probe endpoint** lands --
pinning a tighter`[200, 500]` two-valid-status
  contract, a status-invariance under URL changes
  contract, a SQL-injection invariance contract, a
  canonical Kubernetes-style health-envelope shape
  contract, and a non-JSON content-negotiation
  invariance contract that no prior per-source-
  file public-route GET smoke covers.

                        `docs/plugins/admin-clients-query-spec.md`
                        for the existing pre-landed e2e spec
                        [`apps/web-e2e/tests/api/admin-clients-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-clients-query.spec.ts)
                        paired with the `GET` export of
                        `apps/web/app/api/admin/clients/route.ts` --
                        the **first per-source-file admin-tree GET smoke
                        pinning the bare-message single-step-collapse
                        `{ error: 'Unauthorized' }` 401 envelope** posture
                        (matches the sibling `admin/comments` /
                        `admin/companies` / `admin/users` routes; distinct
                        from the canonical-longer-message family of
                        `admin/categories` / `admin/items` /
                        `admin/items/import` / `admin/items/import/validate`
                        AND from the two-step-split-401-vs-403 family of
                        `admin/notifications/[id]/read` /
                        `admin/notifications/mark-all-read` /
                        `admin/users/check-email` /
                        `admin/users/check-username` /
                        `admin/clients/bulk` AND from the auth-gate-
                        divergence-finding posture of the un-gated
                        `admin/roles` / `admin/roles/active` family).
                        UNIQUE: every prior admin-tree query smoke pins
                        one of three different gate postures; this is
                        the FIRST per-source-file admin-tree GET smoke
                        pinning the bare-message single-step-collapse
                        envelope. The new page documents the
                        **single-step `session?.user?.isAdmin` gate
                        ahead of the shared
                        `validatePaginationParams(searchParams)`
                        helper** (the helper short-circuits with its
                        `{ error, status }` 400 envelope on
                        `?page=invalid` / `?limit=invalid` /
                        `?page=-1` / `?limit=0` / `?limit=200`, but
                        only on the AUTH branch -- the unauth branch
                        hits 401 BEFORE the helper runs), the **six
                        optional query-param reads, all AFTER the
                        gate** (`?search=`, `?status=`, `?plan=`,
                        `?accountType=`, `?provider=` -- parsed via
                        raw `searchParams.get('…') || undefined`
                        calls, NO inline enum coercion or Zod schema
                        validation, distinct from the `admin/roles`
                        route's narrow inline ternary enum coercion),
                        the **legacy `getClientProfiles({…})` query
                        helper** (distinct from the `admin/categories`
                        route's `categoryRepository.findAllPaginated(...)`
                        repository-pattern posture; the spec stays green
                        if a future contributor refactors the route to
                        a `clientRepository` abstraction), the
                        **three-key `{ success, data: { clients }, meta }`
                        success envelope** (the `data` key carries a
                        single `clients: []` sub-key, distinct from the
                        `admin/users` route's bare `{ success, data: [...],

                    pagination: {…} }` shape), the **`POST`branch
                    with environment-flag-gated CRM sync** (out of
                    scope for this GET-only spec but documented so
                    future contributors who add a`POST`smoke must
                    defend against the synchronous

                `createTwentyCrmSyncServiceFromEnv()`upsert via
                `TWENTY_CRM_ENABLED=false`environment override),
                the at-a-glance scenario tree (one bulk-loop
                walk over ~60 paths + eleven hand-written
                scenarios pinning: the strict 401-on-no-arg-
                baseline + bare`{ error: 'Unauthorized' }` envelope; status invariance across stacked-key
                permutations; per-key isolation walks for
                `?asAdmin=`/`?as=`/`?asUser=`/
                `?impersonate=`admin-impersonation,`?token=`/
                `?secret=`/`?api_key=`/`?authorization=`/
                `?session=`/`?adminToken=`magic-token,
                `?bypass=`/`?admin=`/`?override=`/
                `?force=`admin-override,`?status=`and
                `?provider=`filter-bypass;`Accept`header
                isolation; repeated-key walk; the bare-message
                envelope assertion pinning`body.error ===
                'Unauthorized'`AND`body.error !==
                'Unauthorized. Admin access required.'`AND
                `body.error !== 'Forbidden'`), the cross-
                references to the neighbouring per-id sibling
                [`admin-clients-clientid-method-spec.md`](admin-clients-clientid-method-spec.md),
                the neighbouring bulk sibling
                [`admin-clients-bulk-method-spec.md`](admin-clients-bulk-method-spec.md),
                the neighbouring create sibling
                [`admin-clients-create-body-spec.md`](admin-clients-create-body-spec.md)
                (the two per-source-file specs together pin
                both the `POST`body surface and the`GET`
                query surface on the SAME route file), the
                shared admin-clients page-object driver
                [`admin-clients-page-object.md`](admin-clients-page-object.md),
                the prior per-source-file admin-tree GET
                smokes
                [`admin-roles-query-spec.md`](admin-roles-query-spec.md),
                [`admin-roles-active-query-spec.md`](admin-roles-active-query-spec.md),
                [`admin-sponsor-ads-query-spec.md`](admin-sponsor-ads-query-spec.md),
                [`admin-twenty-crm-config-query-spec.md`](admin-twenty-crm-config-query-spec.md),
                [`admin-settings-map-status-query-spec.md`](admin-settings-map-status-query-spec.md),
                [`admin-tags-all-query-spec.md`](admin-tags-all-query-spec.md),
                the admin-protected coverage spec
                [`admin-protected-extra.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-protected-extra.spec.ts)
                (covers this route at the broad `< 500`level;
                this per-source-file spec adds the deep query-
                surface walk on top), and the change protocol
                (update this page in the same PR that touches
                the source spec, update`docs/log.md`, run
                `pnpm tsc --noEmit`in`apps/web-e2e`). With
                this entry the **per-spec-file docs rollout
                extends to 118-of-N** and the **`tests/api/` per-spec-file sub-rollout extends to
                115-of-many**, and the **first per-source-file
                admin-tree GET smoke pinning the bare-message
                single-step-collapse`{ error: 'Unauthorized' }` 401 envelope** lands -- pinning a single-step
                `session?.user?.isAdmin`gate ahead of the
                `validatePaginationParams(...)`helper, six
                gate-protected optional query-param reads with
                no inline enum coercion or Zod validation, the
                legacy`getClientProfiles({…})` query helper
                posture, and the bare 401 envelope shape
                distinct from both the canonical-longer-message
                family and the two-step-split family.

- `apps/docs` `apps/web`
  Added Vercel build-cost controls to both Vercel-deployed
  apps in this monorepo (`directory-web-template-docs` rooted
  at `apps/docs/`, `directory-web-template-demo` rooted at
  `apps/web/`). Each app's `vercel.json` now carries:
    - **An `ignoreCommand` allowlist** that tells Vercel to
      skip the build for any branch other than `main`,
      `master`, `develop`, or `stage`. Vercel's
      [Ignored Build Step](https://vercel.com/docs/project-configuration/vercel-json#ignorecommand)
      semantics are inverted from intuition: exit `1`
      _continues_ the build, exit `0` _skips_ it. The script
      matches `$VERCEL_GIT_COMMIT_REF` against the four
      allowed branches and exits `1` only on a hit, otherwise
      `0`. Result: feature-branch / dependabot / EW-_ /
      chore/_ pushes no longer burn build minutes on either
      Vercel project.
    - **An explicit `github.autoJobCancelation: true`** that
      locks in Vercel's default cancel-older-build-on-newer-
      push behavior so it can't drift from a dashboard
      toggle.
      Pairs with a separate one-time API flip (out of repo
      scope, applied via `PATCH /v9/projects/{projectId}` on
      Vercel's REST API) that sets each project's
      `resourceConfig.buildQueue.configuration` to
      `WAIT_FOR_NAMESPACE_QUEUE` -- one active build per
      branch -- so a flurry of `develop` pushes collapses to
      "build only the latest commit". The combined effect on a
      rapid-fire `develop` push: at most one build is running
      at a time AND any in-progress build is canceled the
      instant a newer commit lands. The Web app's existing
      `crons[]` schedule (`/api/cron/sync` daily 03:00 UTC,
      `/api/cron/subscription-reminders` daily 09:00 UTC,
      `/api/cron/subscription-expiration` daily 00:00 UTC) is
      preserved verbatim. NOTE: the four allowlisted branches
      `main` / `master` / `develop` / `stage` are exhaustive
      for the docs and demo Vercel projects today; introducing
      a new long-lived branch (e.g. `release/*`) means
      extending the `if [ … ] || [ … ]` chain in BOTH
      `apps/docs/vercel.json` and `apps/web/vercel.json`. The
      `WAIT_FOR_NAMESPACE_QUEUE` flip is a project-level Vercel
      setting that lives in Vercel's config store (NOT in
      `vercel.json`), so it is documented here for traceability
      and re-applicability after a project re-create.

- `docs/plugins` `docs/index`
  Added the dedicated per-source-file landing page
  `docs/plugins/client-items-coordinates-query-spec.md`
  for the existing pre-landed e2e spec
  [`apps/web-e2e/tests/api/client-items-coordinates-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/client-items-coordinates-query.spec.ts)
  paired with the `GET` export of
  `apps/web/app/api/client/items/coordinates/route.ts` --
  the **third per-source-file
  `requireClientAuth()`-gated zero-argument GET
  handler** (after the sibling
  `client-dashboard-stats-query` and
  `client-geo-stats-query` specs) combining a
  **`getClientItemRepository().
getCoordinatesByUser(userId)` repository-
  delegation pattern**, a
  **nested-`coordinates`-keyed success envelope
  `{ success: true, coordinates: Array<{ slug, name,
latitude, longitude }> }`** (the FIRST per-source-
  file GET smoke pinning a `coordinates`-keyed
  nested-array success envelope -- distinct from
  BOTH the spread-into-envelope shape pinned by
  `client-dashboard-stats-query` and
  `client-geo-stats-query`, AND the `stats`-keyed
  nested-object shape pinned by
  `client-items-stats-query`), a
  **`serverErrorResponse(error, 'Failed to fetch
item coordinates')` outer catch**, and a
  **nine-bypass-prevention assertion battery**
  extending the six-test battery of the sibling
  `client-geo-stats-query` spec with three
  additional contracts: a single-item-lookup
  bypass-prevention contract (`?slug=…` /
  `?itemId=…` / `?itemSlug=…` invariance), a
  content-negotiation bypass-prevention contract
  (`?format=geojson` / `?format=kml` / `?format=xml`
  / `?format=csv` invariance), and an
  Accept-header invariance contract (`Accept:
application/geo+json` / `application/xml` /
  `text/html` / `*/*` round-trip to the same 401
  as `Accept: application/json`). UNIQUE: this is
  the THIRD `requireClientAuth()`-gated GET smoke
  and the THIRD zero-argument handler in the
  `requireClientAuth()` family. The new page
  documents the discriminated-union auth-gate
  contract, the nested-`coordinates`-keyed
  success envelope, the
  `getClientItemRepository().
getCoordinatesByUser(userId)` singleton-factory
  repository-delegation, the `serverErrorResponse
('Failed to fetch item coordinates')` outer-
  catch, the nine-bypass-prevention assertion
  battery (extending the six-test battery of
  `client-geo-stats-query` with single-item-
  lookup, content-negotiation, and Accept-header
  invariance contracts that no prior per-source-
  file GET smoke covers; ALSO covering the
  defensive `?lat=NaN` / `?lat=Infinity` spatial-
  filter values that no prior per-source-file
  GET smoke pins, AND the `?zoom=…` /
  `?center=lat,lng` map-control bypass-prevention
  keys that no prior per-source-file GET smoke
  pins), the at-a-glance scenario tree (a single
  query-string bulk-loop walk covering ~110
  permutations -- no-arg baseline, admin-
  impersonation keys, client-terminology variants,
  single-item-lookup keys, magic-auth keys,
  geographic-filter keys, spatial / map-control
  filter keys including defensive `NaN` /
  `Infinity` values, item-status filter keys,
  pagination keys, projection keys, cache-
  busting keys, content-negotiation keys
  including geographic formats, i18n keys, sort-
  override keys, multi-tenancy keys, admin-
  override keys, empty values, repeated keys,
  special-character values, 500-character long
  values, bogus / typo'd query keys, all
  asserting `< 500`, plus NINE hand-written
  tests), the cross-references to the
  neighbouring `requireClientAuth()`-gated GET
  siblings (`client-geo-stats-query-spec.md`
  shares the `getClientItemRepository()`
  singleton-factory with this route but diverges
  on which repository method it invokes
  `getGeoStatsByUser` vs `getCoordinatesByUser`;
  `client-items-stats-query-spec.md` ALSO shares
  the `getClientItemRepository()` singleton-
  factory but invokes `getStatsByUser`;
  `client-dashboard-stats-query-spec.md` uses a
  different repository singleton entirely
  -- `getClientDashboardRepository()`), the
  cross-references to the broader
  `requireClientAuth()`-gated client family, the
  cross-cutting `client-protected.spec.ts`, and
  `docs/plugins/client-geo-stats-query-spec.md`
  for the existing pre-landed e2e spec
  [`apps/web-e2e/tests/api/client-geo-stats-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/client-geo-stats-query.spec.ts)
  paired with the `GET` export of
  `apps/web/app/api/client/geo-stats/route.ts` --
  the **second per-source-file GET smoke** the
  docs tree publishes that pins a
  **`requireClientAuth()`-gated zero-argument
  handler** (the FIRST being the sibling
  `client-dashboard-stats-query` spec) combining
  a **`getClientItemRepository().
getGeoStatsByUser(userId)` repository-delegation
  pattern** (NOT `getClientDashboardRepository().
getStats(userId)` like the sibling
  `client-dashboard-stats-query` spec, NOT
  `getClientItemRepository().getStatsByUser(userId)`
  like the sibling `client-items-stats-query`
  spec), a **spread-geo-stats success envelope
  `{ success: true, ...geoStats }`** (matches the
  spread-into-envelope shape pinned by
  `client-dashboard-stats-query`), a
  **`serverErrorResponse(error, 'Failed to fetch
geographic statistics')` outer catch**, and a
  **six-bypass-prevention assertion battery**
  (`?userId=…` admin-impersonation, `?token=…`
  magic-token bypass, `?admin=…` query-admin-
  override, `?country=…` / `?city=…` / `?lat=…`
  geographic-filter bypass, multi-permutation
  shape stability) on top of the standard query-
  string bulk-loop walk. UNIQUE: this is the
  THIRD `requireClientAuth()`-gated GET smoke
  after `client-items-stats-query` and
  `client-dashboard-stats-query`, and the SECOND
  zero-argument handler in the
  `requireClientAuth()` family. The new page
  documents the discriminated-union auth-gate
  contract, the spread-geo-stats success envelope,
  the `getClientItemRepository().
getGeoStatsByUser(userId)` singleton-factory
  repository-delegation, the `serverErrorResponse
('Failed to fetch geographic statistics')`
  outer-catch, the six-bypass-prevention
  assertion battery (extending the five-test
  battery of `client-dashboard-stats-query` with
  a geographic-filter bypass-prevention contract
  that no prior per-source-file GET smoke covers
  -- `?country=` / `?city=` / `?lat=` / `?lng=` /
  `?bbox=` / `?radius=` invariance), the at-a-
  glance scenario tree (a single query-string
  bulk-loop walk covering ~95 permutations -- no-
  arg baseline, admin-impersonation keys, client-
  terminology variants, magic-auth keys,
  geographic-filter keys (`?country=` / `?city=` /
  `?region=` / `?area=` / `?countryCode=`),
  service-area filter keys (`?serviceArea=` /
  `?service_area=` / `?coverage=`), spatial-
  filter keys (`?lat=` / `?lng=` / `?bbox=` /
  `?radius=`), time-window keys, pagination keys
  (including `?topN=` per-bucket pagination),
  projection keys (including `?fields=top_cities`
  / `?fields=top_countries,service_area_breakdown`
  per-bucket projection), cache-busting keys,
  content-negotiation (including `?format=geojson`
  / `?format=kml` geographic format keys), i18n
  keys, filter keys, sort-override keys, multi-
  tenancy keys, admin-override keys, empty
  values, repeated keys, special-character
  values, 500-character long values, bogus /
  typo'd query keys, all asserting `< 500`, plus
  EIGHT hand-written tests pinning the canonical
  401 envelope shape, the bogus-parameter status
  invariance, the `?userId=…` session-gate-bypass-
  prevention, the `?token=…` query-token-auth-
  bypass-prevention, the `?admin=…` query-admin-
  override-prevention, the `?country=…` /
  `?city=…` / `?lat=…` geographic-filter-bypass-
  prevention, and the multi-permutation shape
  stability across three different parameter
  sets), the cross-references to the neighbouring
  `requireClientAuth()`-gated GET sibling
  `client-dashboard-stats-query-spec.md` (pairs
  with `client-dashboard-stats-query.spec.ts` and
  pins the spread-stats `{ success: true,
...stats }` shape this spec mirrors -- both
  specs share the same `requireClientAuth()`
  discriminated-union auth-helper return
  contract, the same `'Unauthorized. Please sign
in to continue.'` longer-message TWO-key 401
  envelope, the same zero-argument handler
  signature, and the same spread-into-envelope
  success-payload shape -- but diverge on which
  repository they delegate to and on which
  bypass-prevention assertions they pin) and the
  neighbouring `requireClientAuth()`-gated GET
  sibling `client-items-stats-query-spec.md`
  (shares the `getClientItemRepository()`
  singleton-factory with this route, but diverges
  on which repository method it invokes
  `getStatsByUser` vs `getGeoStatsByUser`), and
  the change protocol (update this page in the
  same PR that touches the source spec, update
  `docs/log.md`, run `pnpm tsc --noEmit` in
  `apps/web-e2e`). With this entry the **per-
  spec-file docs rollout extends to 119-of-N**
  and the **`tests/api/` per-spec-file sub-
  rollout extends to 116-of-many**, and the
  **third per-source-file `requireClientAuth()`-
  gated zero-argument GET smoke** lands --
  pinning a nested-`coordinates`-keyed success
  envelope shape that no prior per-source-file
  GET smoke covers. NOTE: cross-references to
  `client-geo-stats-query-spec.md` and
  `client-dashboard-stats-query-spec.md` may
  resolve as broken links until parallel PRs
  #723 and #724 land that add those per-source-
  file landing pages on develop.

                        spec-file docs rollout extends to 118-of-N**
                        and the **`tests/api/` per-spec-file sub-
                        rollout extends to 115-of-many**, and the
                        **first per-source-file GET smoke pinning a
                        `requireClientAuth()`-gated zero-argument
                        geo-stats handler\*\* lands -- pinning a
                        discriminated-union auth-gate contract, a
                        spread-geo-stats success envelope, a
                        `getClientItemRepository().getGeoStatsByUser

                    (userId)`singleton-factory repository-
                    delegation, a`serverErrorResponse('Failed to
                    fetch geographic statistics')`outer-catch,
                    and a six-bypass-prevention assertion battery
                    that no prior per-source-file GET smoke
                    covers. NOTE: cross-references to

                `client-dashboard-stats-query-spec.md` may
                resolve as broken links until the parallel PR
                #723 lands that adds the dashboard-stats
                per-source-file landing page on develop.

                        `docs/plugins/client-dashboard-stats-query-spec.md`
                        for the existing pre-landed e2e spec
                        [`apps/web-e2e/tests/api/client-dashboard-stats-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/client-dashboard-stats-query.spec.ts)
                        paired with the `GET` export of
                        `apps/web/app/api/client/dashboard/stats/route.ts` --
                        the **first per-source-file GET smoke** the docs
                        tree publishes that pins a **`requireClientAuth()`-
                        gated zero-argument handler** combining a
                        **`getClientDashboardRepository().getStats(userId)`
                        repository-delegation pattern**, a **spread-stats
                        success envelope `{ success: true, ...stats }`**
                        (NOT the `{ success: true, stats: <statsObject> }`
                        nested shape used by the sibling
                        `client-items-stats-query` spec), a
                        **`serverErrorResponse(error, 'Failed to fetch

                    dashboard statistics')` outer catch**, and a
                    **five-bypass-prevention assertion battery**
                    (`?userId=…`admin-impersonation,`?token=…`    magic-token bypass,`?admin=…`query-admin-
                    override,`?from=…`date-range bypass, multi-
                    permutation shape stability) on top of the
                    standard query-string bulk-loop walk. UNIQUE:
                    every prior`requireClientAuth()`-gated GET smoke
                    (`client-items-stats-query`, `client-items-method`,
                    `client-items-id-method`, `client-items-import-
                    sample-query`) takes a `request: NextRequest`    argument; this is the SECOND`requireClientAuth()`    gate after`client-items-stats-query`and the
                    SECOND zero-argument handler in the

                `requireClientAuth()`family, AND the FIRST per-
                source-file GET smoke pinning the spread-stats
                success envelope shape. The new page documents
                the discriminated-union auth-gate contract, the
                spread-stats success envelope, the`getClient
                DashboardRepository()`singleton-factory
                repository-delegation, the`serverErrorResponse
                ('Failed to fetch dashboard statistics')`outer-
                catch, the five-bypass-prevention assertion
                battery, the at-a-glance scenario tree (a single
                query-string bulk-loop walk covering ~60
                permutations -- no-arg baseline, admin-
                impersonation keys, client-terminology variants,
                magic-auth keys, date-range filter keys, time-
                window keys, pagination keys, projection keys,
                cache-busting keys, content-negotiation, i18n
                keys, filter keys, sort-override keys, multi-
                tenancy keys, admin-override keys, empty values,
                repeated keys, special-character values, 500-
                character long values, bogus / typo'd query keys,
                all asserting`< 500`, plus EIGHT hand-written
                tests pinning the canonical 401 envelope shape,
                the bogus-parameter status invariance, the
                `?userId=…`session-gate-bypass-prevention, the
                `?token=…`query-token-auth-bypass-prevention,
                the`?admin=…`query-admin-override-prevention,
                the`?from=…`date-range-bypass-prevention, and
                the multi-permutation shape stability across
                three different parameter sets), the cross-
                references to the neighbouring
                `requireClientAuth()`-gated GET sibling
                `client-items-stats-query-spec.md`(pairs with
                `client-items-stats-query.spec.ts`and pins the
                `{ success: true, stats: ... }`nested-stats
                success envelope on the auth branch vs the
                spread-stats`{ success: true, ...stats }`shape
                this spec pins), the neighbouring
                `requireClientAuth()`-gated client family specs
                (`client-items-method-spec.md`, `client-items-id-
                method-spec.md`, `client-items-import-method-
                spec.md`, `client-items-import-validate-method-
                spec.md`, `client-items-import-sample-query-
                spec.md`), the cross-cutting `client-protected.
                spec.ts`(covers the broader auth-protected
                client surface that this dashboard-stats endpoint
                sits within), the neighbouring sibling`client-
                geo-stats-query.spec.ts`(covers the`/api/
                client/geo-stats`companion endpoint that
                returns geographic-distribution stats with a
                parallel`requireClientAuth()`gate -- no per-
                source-file landing page yet for the geo-stats
                sibling), and the Spec 010 (E2E Test Coverage)
                governance anchor. Matching`docs/index.md` entry added at the agent-discovery cluster
                (just above the`agent-discovery-spec`entry)
                of the per-source-file rollout list. The
                corresponding e2e spec file is unchanged --
                this run lands the docs landing page that was
                missing.
                `docs/plugins/auth-change-password-spec.md`
                for the existing pre-landed e2e spec
                [`apps/web-e2e/tests/api/auth-change-password.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/auth-change-password.spec.ts)
                paired with the `POST`export of
                `apps/web/app/api/auth/change-password/route.ts` --
                the **bare-baseline companion** to the already-
                documented
                [`auth-change-password-body-spec.md`](plugins/auth-change-password-body-spec.md)
                landing page (paired with the rich-permutation
                `auth-change-password-body.spec.ts`). The body
                sibling pins the rate-limit-FIRST gate posture, the
                canonical 401 / 400 / 429 envelopes, the bulk-loop
                header / body walks, and the gate-before-Zod /
                gate-before-tenant / gate-before-user-DB /
                gate-before-OAuth-guard / gate-before-bcrypt-
                current / gate-before-bcrypt-duplicate / gate-
                before-DB-update invariants; this sibling pins
                ONLY the bare two-test `< 500`no-server-error
                contract on the bare two-test smoke companion --
                the`POST /api/auth/change-password without a
                session does not 5xx`test on a fully-shaped
                body and the`POST /api/auth/change-password with
                empty body does not 5xx`test on`{}`-- both
                asserting`expect(response.status()).toBeLessThan(500)`.
                UNIQUE within the auth-change-password spec pair:
                this is the **bare-baseline** member of the pair.
                Every prior per-source-file landing page in the
                docs tree pairs to a SINGLE source spec; this is
                the **first per-source-file landing page that
                documents one HALF of a two-spec pair covering
                the same route**. The new page documents the
                body-sibling-vs-bare-baseline matrix (this spec
                vs the body sibling at `auth-change-password-body
                -spec.md`-- now with bulk-loop column +
                envelope-shape column + gate-ordering column +
                cross-method column + side-channel column),
                the at-a-glance scenario tree (two hand-written
                tests covering the well-shaped-body and empty-
                body shapes -- both asserting`< 500` and both
                expected to land on the unauth 401 branch under
                the rate-limit-not-tripped-yet posture), the
                cross-references to the rich-permutation body
                sibling, the page-level forgot / reset password
                smokes (`auth/forgot-password.spec.ts`+
                `auth/new-password.spec.ts`), the Spec 003 (Auth
                Providers) governance anchor, and the Spec 010
                (E2E Test Coverage) governance anchor. Matching
                `docs/index.md`entry added at the agent-
                discovery cluster (just above the`agent-
                discovery-spec`entry) of the per-source-file
                rollout list. The corresponding e2e spec file
                is unchanged -- this run lands the docs landing
                page that was missing.
                `docs/plugins/surveys-exists-query-spec.md`
                for the existing pre-landed e2e spec
                [`apps/web-e2e/tests/api/surveys-exists-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/surveys-exists-query.spec.ts)
                paired with the `GET`export of
                `apps/web/app/api/surveys/exists/route.ts`-- the
                **third member of the public-existence-probe trio**
                alongside the previously-documented
                `categories-exists-query-spec.md`(catch-and-200
                Git-CMS sibling) and the still-undocumented DB-backed
                `collections-exists-query.spec.ts`(catch-and-500
                sibling). UNIQUE within the trio: this is the
                **catch-and-no-count** member -- same catch-and-200
                posture as the categories-exists sibling but the
                response envelope is the leaner`{ exists }`shape
                with NO`count`field (since the route's`limit: 1` short-circuit makes the count uninformative anyway).
                Distinct from every other public-existence probe the
                docs tree publishes: the route lives above a
                **DB-backed`surveyService.getMany`** call that
                selects published surveys from the configured
                database (vs the categories-exists sibling's Git-CMS
                `fetchItems`reader and the collections-exists
                sibling's`collectionRepository.findAll` DB-repository
                reader), reads a **`?type=`query param** rather than
                `?locale=`(and uses a strict byte-for-byte
                `typeParam === SurveyTypeEnum.ITEM` ternary that
                maps every non-`'item'`value --`null`for the
                absent key,`''`for the empty value,`'global'`for
                the explicit value, every typo / unknown /
                case-variant -- to the same GLOBAL branch), and is
                silent in the catch branch on every environment
                (distinct from the categories-exists sibling which
                logs to`console.error`in development mode and from
                the collections-exists sibling which logs
                unconditionally). The new page documents the
                cross-route exists-probe matrix (this route vs
                `/api/categories/exists`vs`/api/collections/exists`),
                the at-a-glance scenario tree (~50-path bulk-loop
                walk + five hand-written invariants including the
                UNIQUE `typeParam === SurveyTypeEnum.ITEM` fallback-semantics walk pinning that the no-arg, the
                explicit`?type=global`, the unknown `?type=unknown`,
                the case-variant `?type=ITEM`, and the empty
                `?type=`paths all land in the same GLOBAL branch and
                return the same status, plus the branch-split
                shape-invariance walk pinning that the ITEM branch
                and the GLOBAL branch return the same envelope
                shape), the cross-references to the catch-and-200
                Git-CMS-backed sibling, the catch-and-500 DB-backed
                sibling, the cross-cutting`feature-existence.spec.ts` no-arg-baseline sibling, the survey-detail GET / PUT
                / DELETE sibling, the per-survey-responses GET / POST
                sibling, the per-response-detail GET sibling, and the
                Spec 010 / Spec 005 governance anchors. Matching
                `docs/index.md`entry added at the surveys cluster
                (just above the`surveys-id-responses-method-spec` entry) of the per-source-file rollout list. The
                corresponding e2e spec file is unchanged -- this run
                lands the docs landing page that was missing.
                `docs/plugins/categories-exists-query-spec.md`
                for the existing pre-landed e2e spec
                [`apps/web-e2e/tests/api/categories-exists-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/categories-exists-query.spec.ts)
                paired with the `GET`export of
                `apps/web/app/api/categories/exists/route.ts`--
                the **first per-source-file GET smoke** the docs tree
                publishes that pins a **fully public Git-CMS-backed
                existence probe whose catch branch ALSO returns
                `200 OK`** (NOT `500`). Distinct from every other
                public-route per-source-file GET smoke: the
                companion `collections-exists-query.spec.ts`(sibling
                existence probe served from
                `apps/web/app/api/collections/exists/route.ts`) has a
                **catch-and-500** posture; the
                `items-popularity-scores-query-spec.md`sibling is
                also no-auth-gate but does NOT surface a navigation-
                shell-degradation contract. The categories-exists
                route is the **catch-and-200 sibling** of the
                collections-exists route — same`{ exists, count }` envelope, but the catch branch maps every thrown
                error to a`200`with`{ exists: false, count: 0 }` rather than a`500`. The distinction is load-
                bearing: the navigation shell hits both probes on
                every render and must degrade quietly when the
                content layer is unavailable rather than blocking
                the whole page. The new page documents the cross-
                route exists-probe matrix (this route vs
                `/api/collections/exists`vs`/api/surveys/exists`),
                the at-a-glance scenario tree (~50-path bulk-loop
                walk + four hand-written invariants including the
                UNIQUE `searchParams.get('locale') || 'en'`fallback-
                semantics walk pinning that the no-arg, the empty-
                string`?locale=`, and the explicit-`?locale=en` paths all land in the same branch and return the
                same status), the cross-references to the catch-and-
                500 DB-backed sibling, the surveys existence probe,
                the Git-CMS-backed admin sibling, the DB-backed
                admin sibling, the public-route per-source-file
                popularity-scores spec, and the Spec 010 / Spec 005
                governance anchors. Matching`docs/index.md`entry
                added at the top of the per-source-file rollout list
                (above the`admin-categories-all-query-spec` entry
                from the previous run). The corresponding e2e spec
                file is unchanged -- this run lands the docs landing
                page that was missing.

- `docs/plugins` `docs/index`
  Added the dedicated per-source-file landing page
  `docs/plugins/admin-categories-all-query-spec.md`
  for the existing pre-landed e2e spec
  [`apps/web-e2e/tests/api/admin-categories-all-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-categories-all-query.spec.ts)
  paired with the `GET` export of
  `apps/web/app/api/admin/categories/all/route.ts` --
  the **first Git-CMS-backed admin-tree query smoke**
  the docs tree ever published, previously covered
  indirectly via the `client-trash-page-object.md`
  co-tenant cross-link and called out repeatedly from
  the sibling `admin-tags-all-query-spec.md` without
  a dedicated landing page of its own. The
  categories-all route is the **no-defensive-narrowing
  Git-CMS sibling** of the tags-all route: same
  `auth()` + `!isAdmin` admin gate, same
  `getCachedItems({ lang })` Git-CMS reader, same bare
  `{ success: false, error: 'Unauthorized' }` 401
  envelope, but **NO defensive
  `typeof locale !== 'string'` narrowing** (the only
  Git-CMS-backed admin-tree route that omits the
  dead-branch validator). New page documents the
  cross-route Git-CMS-vs-DB matrix (this route vs
  `/api/admin/tags/all` vs `/api/admin/categories/git`
  vs `/api/admin/categories` vs `/api/admin/tags`),
  the at-a-glance scenario tree (~50-path bulk-loop
  walk + 11 hand-written invariants including
  path-traversal-resistance and cache-bust-resistance
  invariants distinct from the tags-all sibling), the
  cross-references to the two Git-CMS siblings + two
  DB-backed siblings + GitHub-API-backed sibling +
  page-object driver + co-tenant page-object driver,
  and the Spec 010 / Spec 009 governance anchors.
  Matching `docs/index.md` entry added at the top of
  the per-source-file rollout list (above the
  `client-items-id-restore-method-spec` entry from
  the previous run). The corresponding e2e spec file
  is unchanged -- this run lands the docs landing
  page that was missing.
- `apps/web-e2e` `docs/plugins` `docs/index`
  Added a per-source-file e2e spec
  [`apps/web-e2e/tests/api/client-items-id-restore-method.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/client-items-id-restore-method.spec.ts)
  for the `POST` export of
  `apps/web/app/api/client/items/[id]/restore/route.ts`
  -- the **first per-source-file POST smoke** the docs
  tree publishes that pins a **`requireClientAuth()`-
  gated soft-delete restore action** delegating to
  `clientItemRepository.restoreForUser(id, userId)`
  with a THREE-branch nested catch dispatcher
  (`'Item not found'` exact -> 404, `'permission'`
  substring -> 403, `'not deleted'` substring -> 400)
  and a `'Failed to restore item'` outer-catch
  default. Companion `docs/plugins/client-items-id-restore-method-spec.md`
  reference plus the matching `docs/index.md` entry
  added. The pre-existing minimal smoke
  [`client-item-restore.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/client-item-restore.spec.ts)
  is preserved unchanged as the single-test canary.
- `apps/web` `apps/web-e2e` `docs/plugins`
  Fixed Web CI build failure where the new `/items.json`
  and `/llms.txt` agent-discovery routes treated the
  `getCachedItems()` return value as a bare array
  instead of the actual `FetchItemsResult` envelope
  (`{ items, categories, tags, total, collections }`).
  Both routes now read `.items` off the result and
  fall back to an empty array on failure. Added the
  paired e2e smoke
  [`apps/web-e2e/tests/public/agent-discovery.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/public/agent-discovery.spec.ts)
  and per-source-file plugin reference
  `agent-discovery-spec.md` — the **first
  per-source-file public-route smoke** the docs tree
  publishes that pins the **agent-targeted**
  discovery surface (`/llms.txt` per the
  [llms.txt convention](https://llmstxt.org) +
  paired canonical-data `/items.json` JSON dump).
  Distinct from the neighbouring `seo-manifests.spec.ts`
  (crawler-targeted SEO surface).
- `docs/plugins` Added
  `items-popularity-scores-query-spec.md` — the
  **one-hundred-and-fifteenth** per-source-file
  reference the docs tree publishes for any file
  under `apps/web-e2e/tests/` and the **one-
  hundred-and-thirteenth** under
  `apps/web-e2e/tests/api/`. Pairs with the existing
  `apps/web-e2e/tests/api/items-popularity-scores.spec.ts`
  smoke covering the `GET` export of
  `apps/web/app/api/items/popularity-scores/route.ts`
  — the **first per-source-file GET smoke** the docs
  tree publishes that pins a **public (no-auth-gate)
  debug endpoint** combining a `Math.min(parseInt(
limit), 100)` admit-clamp invariant, a `locale`
  default-`'en'` fallback, a `getCachedItems({ lang })`
  cache-aware fetch path, an empty-items short-
  circuit envelope `{ items: [], message: 'No items
found' }`, a logarithmic-scaling score formula
  `Math.log10(value + 1) * weight`, a featured-boost
  score cap (`+10000`), a three-tier recency-decay
  schedule (`<30d` → `1000`, `<90d` → `500`, `<180d`
  → `250`), and a stable rank-after-sort mutation
  (sort by `score` desc + `name.localeCompare` asc,
  then mutate `rank` to the 1-based sort index).
  UNIQUE: every prior per-source-file `items*` GET
  smoke (`items-engagement-query`,
  `items-export-query`, `items-export-settings-query`)
  gates either with `auth()` or a feature-flag
  check; this is the FIRST per-source-file GET
  smoke that pins a route that is **intentionally
  public** — exposing a debug-only sort breakdown
  for any caller that hits the URL. Distinct
  contracts: public (no-auth-gate) route (UNIQUE
  FIRST — every prior `items*` GET smoke gates the
  handler); `Math.min(parseInt(limit), 100)` admit-
  clamp (UNIQUE FIRST — silent integer-clamp on a
  query parameter; the route NEVER 4xxs on a
  malformed `limit`); logarithmic-scaling score
  formula (UNIQUE FIRST — `Math.log10(value + 1) *
weight` engagement-scoring formula); featured
  boost (+10000) (UNIQUE FIRST — featured-item flat
  score boost as the load-bearing tie-breaker
  between featured and non-featured items); three-
  tier recency-decay schedule (UNIQUE FIRST —
  piecewise-linear recency-decay schedule); empty-
  items short-circuit envelope (UNIQUE FIRST — non-
  error early-return envelope on a `getCachedItems(
{ lang })` cache miss); stable rank-after-sort
  mutation (UNIQUE FIRST — sort-then-mutate-`rank`
  pattern); score-breakdown surface (UNIQUE FIRST —
  `scoreBreakdown` sub-object with seven labeled
  components: `featured`, `views`, `votes`, `rating`,
  `favorites`, `comments`, `recency`); locale-
  fallback semantics — `locale` defaults to `'en'`;
  unknown locales return an empty items list (NOT
  an error). The smoke spec pins a single query-
  string bulk-loop walk (15 permutations: no-arg
  baseline, valid `limit` 5/20, out-of-range `limit`
  999/10000 admit-clamped, empty / `abc` / negative
  / zero `limit` `parseInt`-default fallback, known
  `locale` en/fr/zh, unknown `locale` empty-items
  short-circuit, combined `limit + locale`, combined
  out-of-range + locale clamp-then-locale order)
  asserting `< 500`. Cross-references the cross-
  cutting `discovery.spec.ts` (also probes the no-
  arg baseline), the neighbouring engagement
  endpoint sibling `items-engagement-query-spec.md`
  (when published), the neighbouring item-detail
  public spec `item-public.spec.ts`, and to
  `docs/spec/010-e2e-test-coverage/` for the
  governing spec.
- `docs/plugins` Added
  `client-items-import-sample-query-spec.md` — the
  **one-hundred-and-fourteenth** per-source-file
  reference the docs tree publishes for any file
  under `apps/web-e2e/tests/` and the **one-
  hundred-and-twelfth** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/client-items-import-sample-query.spec.ts`
  spec covering the `GET` export of
  `apps/web/app/api/client/items/import/sample/route.ts`
  — the **first per-source-file GET smoke** the
  docs tree publishes that pins a
  **`requireClientAuth()`-gated binary-stream
  sample-template handler** that delegates to
  `ItemExportService.generateSampleCSV()` /
  `generateSampleXLSX()`. UNIQUE: every prior per-
  source-file `client-items*` GET smoke
  (`client-items-method`, `client-items-id-method`,
  `client-items-stats-query`) returns a JSON
  envelope; this is the FIRST
  `requireClientAuth()`-gated GET smoke that returns
  a **binary stream** with a `Content-Disposition:
attachment; filename="..."` header on the happy
  path. Distinct contracts:
  `requireClientAuth()` + `exportQuerySchema` pair
  (UNIQUE FIRST — Zod-enum `format` parse gated by
  `requireClientAuth()`, distinct from prior
  `client-items*` siblings which parse no query
  schema and from the admin sibling
  `admin-items-export-sample-query` which uses bare
  `auth()` + `isAdmin`); binary-stream success
  contract (UNIQUE FIRST — `Content-Type` /
  `Content-Disposition: attachment; filename="..."`
  pair, distinct from JSON envelopes of every prior
  `client-items*` GET smoke);
  `safeErrorResponse(error, 'Failed to generate
sample template')` outer-catch helper that BYTE-
  IDENTICALLY matches the admin sibling 500-message
  (UNIQUE FIRST `requireClientAuth()`-gated GET
  smoke pinning `safeErrorResponse` cross-utility
  helper, NOT `serverErrorResponse` like the
  `client-items-stats-query` sibling);
  `ItemExportService` direct service-class
  instantiation (UNIQUE FIRST — distinct from
  repository-factory pattern of
  `client-items-stats-query` sibling and from
  `ItemImportService` of `client-items-import-method`
  / `client-items-import-validate-method`
  siblings); longer-message TWO-key 401 envelope
  `{ success: false, error: 'Unauthorized.
Please sign in to continue.' }`; `format=` Zod-
  enum case-sensitivity (Zod enums match exactly,
  uppercase variants rejected on auth branch);
  `format=` enum default (`.default('csv')`,
  invariant on unauth branch). The smoke spec pins
  two bulk-loop walks (~50 query permutations + ~11
  headers all asserting `< 500`), a longer-message
  TWO-key 401-envelope assertion, a strict TWO-key
  envelope-shape assertion (no `data` / `format` /
  `filename` leak), a gate-before-catch invariance
  walk, a gate-before-binary-stream-header
  invariance walk (CRITICAL — `Content-
Disposition: attachment; …` NEVER appears on the
  unauth branch), a gate-before-binary-stream-
  content-type invariance walk (CRITICAL — unauth
  branch emits `application/json`, NOT `text/csv` or
  XLSX spreadsheetml), a gate-before-Zod-parse
  invariance walk pinning every `format=` value
  collapses to the no-arg baseline status, an
  impersonation / token / bypass /
  filename-traversal invariance walk, an Accept-
  header invariance walk, a side-channel walk
  (Cookie / Authorization / X-User-Id /
  X-Forwarded-For / X-Real-IP), a repeated-key
  invariance walk pinning
  `searchParams.get(name)`'s first-value semantics,
  a cross-method probe (POST / PUT / PATCH /
  DELETE), and a cross-permutation status
  invariance walk pinning byte-identical 401
  envelopes across every parameter combination.
  Cross-references the companion
  `client-items-import-method-spec` (commit-mode
  JSON sibling), the
  `client-items-import-validate-method-spec`
  (validate-mode multipart sibling), the
  `client-items-method-spec` /
  `client-items-id-method-spec` /
  `client-items-stats-query-spec` siblings, the
  `client-protected` sibling, and the admin-tree
  counterpart at `admin/items/export/sample`
  (covered separately by
  `admin-items-export-sample-query.spec.ts`).
- `docs/index` Added an entry for
  `client-items-import-sample-query-spec.md`.
- `docs/log` This entry.

## 2026-05-04

- `docs/plugins` Added
  `surveys-responses-id-query-spec.md` — the
  **one-hundred-and-thirteenth** per-source-file
  reference the docs tree publishes for any file
  under `apps/web-e2e/tests/` and the **one-
  hundred-and-eleventh** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/surveys-responses-id-query.spec.ts`
  spec covering the `GET` export of
  `apps/web/app/api/surveys/responses/[responseId]/route.ts`
  — the **first per-source-file GET smoke** the
  docs tree publishes that pins an **admin-gated
  survey-response-by-id lookup** delegating to
  `surveyService.getResponseById(responseId)` with a
  `404 'Response not found'` non-existence guard
  AFTER the auth gate. UNIQUE: pins a `'Failed to
fetch response'` (singular) 500-catch helper that
  is distinct from the plural-collection sibling's
  `'Failed to fetch responses'`. Pairs with a new
  per-source-file docs reference at
  [`docs/plugins/surveys-responses-id-query-spec.md`](plugins/surveys-responses-id-query-spec.md).
- `docs/plugins` Added
  `surveys-id-responses-method-spec.md` — the
  **one-hundred-and-twelfth** per-source-file
  reference the docs tree publishes for any file
  under `apps/web-e2e/tests/` and the **one-
  hundred-and-tenth** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/surveys-id-responses-method.spec.ts`
  spec covering the `GET` AND `POST` exports of
  `apps/web/app/api/surveys/[surveyId]/responses/route.ts`
  — the **first per-source-file dual-method
  smoke** the docs tree publishes that pins a
  **SPLIT-auth gate contract** on a single per-
  source-file route (admin-gated `GET` + PUBLIC
  `POST` with a 404-survey-existence guard,
  distinct from the sibling
  `surveys/[surveyId]` MIXED-auth gate). UNIQUE:
  pins a `body.data` JSON-object guard (manual
  `typeof === 'object' && != null`, NOT Zod), an
  IP / user-agent header capture (`x-forwarded-for`
  → `x-real-ip` → `'unknown'`), a survey-derived
  `itemId` contract (handler IGNORES caller-supplied
  `itemId`), and a `201 Created` success status.
  Pairs with a new per-source-file docs reference at
  [`docs/plugins/surveys-id-responses-method-spec.md`](plugins/surveys-id-responses-method-spec.md).
- `docs/plugins` Added
  `client-items-import-validate-method-spec.md` —
  the **one-hundred-and-eleventh** per-source-file
  reference the docs tree publishes for any file
  under `apps/web-e2e/tests/` and the **one-
  hundred-and-ninth** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/client-items-import-validate-method.spec.ts`
  spec covering the `POST` export of
  `apps/web/app/api/client/items/import/validate/route.ts`
  — the **first per-source-file POST smoke** the
  docs tree publishes that pins a
  **`requireClientAuth()`-gated multipart/form-data
  validate-only handler** that delegates to
  `ItemImportService.validateRows` (a dry-run
  service entry point — distinct from the sibling
  `client/items/import` route which calls
  `executeImport`). UNIQUE: every prior per-source-
  file `client-items*` smoke parses JSON via
  `await request.json()`; this is the FIRST that
  pins a `requireClientAuth()`-gated handler that
  parses `multipart/form-data` via
  `await request.formData()`. Distinct contracts:
  `requireClientAuth()` + multipart/form-data pair
  (UNIQUE FIRST — JSON priors only); 5-step file /
  mapping validation chain after the gate (matches
  admin sibling chain); `validateRows`-not-
  `executeImport` service call (UNIQUE FIRST —
  dry-run vs commit-mode); FOUR-key
  `{ success, headers, suggestedMapping,
validationResults, summary }` success payload
  (UNIQUE FIRST vs prior `result`-keyed two-key
  payload); `safeErrorResponse(error, 'Failed to
validate import file')` outer-catch helper that
  BYTE-IDENTICALLY matches the admin sibling 500-
  message; hard-coded `duplicateStrategy: 'skip'` - `defaultStatus: 'pending'` validation options
  (UNIQUE FIRST — client requests CANNOT override
  either via form data, distinct from admin
  sibling which DOES accept these as form fields);
  longer-message TWO-key 401 envelope
  `{ success: false, error: 'Unauthorized.
Please sign in to continue.' }`. The smoke spec
  pins two bulk-loop walks (~9 headers + ~12
  multipart bodies all asserting `< 500`), a
  longer-message TWO-key 401-envelope assertion,
  a strict TWO-key envelope-shape assertion
  (no `headers` / `suggestedMapping` /
  `validationResults` / `summary` leak), a gate-
  before-validation-chain invariant pinning the
  five 400-branch messages must NEVER appear, a
  gate-before-catch invariant, a validateRows-
  not-entered CRITICAL invariance walk (XSS
  markers in the multipart body are NEVER echoed
  AND the load-bearing service call NEVER
  executes), a success-branch-key non-disclosure
  walk, a malformed-multipart invariance walk, a
  file-extension invariance walk, a cross-method
  probe (GET / PUT / PATCH / DELETE), a side-
  channel walk on POST (Cookie / Authorization /
  X-User-Id), and a cross-permutation status
  invariance walk pinning byte-identical 401
  envelopes across every multipart permutation.
  Cross-references the companion
  `client-items-import-method-spec` (commit-mode
  JSON sibling), the `client-items-method-spec` /
  `client-items-id-method-spec` /
  `client-items-stats-query-spec` siblings, the
  admin-tree validate counterpart at
  `admin/items/import/validate`, and the companion
  client-items-import-sample sibling.
- `docs/index` Added an entry for
  `client-items-import-validate-method-spec.md`.
- `docs/log` This entry.
- `docs/plugins` Added `client-items-import-method-spec.md` —
  the **one-hundred-and-tenth** per-source-file
  reference the docs tree publishes for any file
  under `apps/web-e2e/tests/` and the **one-
  hundred-and-eighth** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/client-items-import-method.spec.ts`
  spec covering the `POST` export of
  `apps/web/app/api/client/items/import/route.ts`
  — the **first per-source-file POST smoke** the
  docs tree publishes that pins a
  **`requireClientAuth()`-gated batch-import
  handler** that delegates to an
  `ItemImportService.executeImport` service
  entry point. UNIQUE: every prior per-source-
  file `client-items*` smoke pins a CRUD-style
  handler (collection GET + POST list, per-id
  GET + PUT + DELETE, stats GET); this is the
  FIRST that pins a batch-import handler that
  fans out to a service layer. Distinct
  contracts: `requireClientAuth()` + service-
  layer delegation pair (UNIQUE FIRST); nested
  `body.rows` `Array.isArray` guard (UNIQUE
  FIRST — manual guard, NOT Zod `safeParse`);
  `'Missing or invalid rows array.'` Zod-free
  400 message (UNIQUE FIRST);
  `safeErrorResponse(error, 'Failed to execute
import')` outer-catch helper (UNIQUE FIRST —
  sourced from `@/lib/utils/api-error`, NOT
  `client-auth.serverErrorResponse`);
  `{ success, result }` success payload with
  the service-derived `{ total, created,
updated, skipped, errors }` result aggregate
  (UNIQUE FIRST — `result`-keyed vs `item` /
  `subscription` / `data` / `stats` priors);
  longer-message TWO-key 401 envelope; hard-
  coded `{ duplicateStrategy: 'skip',
defaultStatus: 'pending', submittedBy:
userId }` import options that client requests
  CANNOT override. The smoke spec pins two
  bulk-loop walks (~6 headers + ~10 POST
  bodies all asserting `< 500`), a longer-
  message TWO-key 401-envelope assertion, a
  strict TWO-key envelope-shape assertion (no
  `result` / `total` / `created` / `updated` /
  `skipped` / `errors` leak), a gate-before-
  post-auth invariance walk, an executeImport-
  not-entered invariance walk (CRITICAL — XSS
  markers in the rows array body are NEVER
  echoed AND the load-bearing service call
  NEVER executes), a gate-before-Array.isArray-
  guard invariance walk (every non-array
  `rows` shape collapses to 401 NOT 400), a
  cross-method probe (GET / PUT / PATCH /
  DELETE), a side-channel walk on POST, and
  a cross-permutation status invariance walk
  pinning byte-identical 401 envelopes across
  every body permutation. Cross-references the
  companion client-items collection +
  per-id + stats siblings, the
  client-protected sibling, the admin-tree
  import counterpart, the companion
  client-items-import-validate sibling
  (validates rows pre-execute — covered
  separately), and the companion
  client-items-import-sample sibling (emits a
  sample CSV — covered separately).
- `docs/plugins` Added `client-items-id-method-spec.md` —
  the **one-hundred-and-ninth** per-source-file
  reference the docs tree publishes for any file
  under `apps/web-e2e/tests/` and the **one-
  hundred-and-seventh** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/client-items-id-method.spec.ts`
  spec covering the `GET`, `PUT`, AND `DELETE`
  exports of `apps/web/app/api/client/items/[id]/route.ts`
  — the **first per-source-file triple-method
  smoke** the docs tree publishes that pins **FIVE
  distinct helper imports** from the
  `@/lib/utils/client-auth` utility module
  (`requireClientAuth` + `serverErrorResponse` +
  `notFoundResponse` + `forbiddenResponse` +
  `badRequestResponse`) on a single source file.
  UNIQUE: every prior per-source-file smoke imports
  between 1 and 3 helpers from this utility; this
  is the FIRST to pin a 5-helper-import contract
  from a single utility module. Extends the
  `client-items-method-spec.md` sibling (which pins
  the `requireClientAuth` helper on the
  COLLECTION-level GET + POST surface) into the
  PER-ID GET + PUT + DELETE dynamic-segment
  surface. Distinct contracts: 5-helper-import
  contract (UNIQUE); `itemIdParamSchema.safeParse`
  Zod validation on a path param (UNIQUE — FIRST
  per-source-file triple-method smoke pinning Zod
  validation on a dynamic-segment parameter); GET
  success payload with `engagement: { views, likes
}` nested sub-object (UNIQUE — FIRST per-source-
  file GET smoke pinning a nested engagement-
  metrics sub-object); PUT empty-update guard
  (`Object.keys(updateData).length === 0` → 400
  `'No fields to update'` — UNIQUE FIRST); PUT
  `statusChanged` dynamic success message (UNIQUE
  FIRST); PUT FOUR-branch nested catch dispatcher
  (UNIQUE FIRST — `'Item not found'` → 404,
  `'permission'` → 403, `'deleted'` → 400, default
  → outer); DELETE THREE-branch nested catch
  dispatcher (UNIQUE FIRST); longer-message TWO-
  key 401 envelope; dedicated `notFoundResponse(message)`
  404-helper + `forbiddenResponse(message)` 403-
  helper (UNIQUE FIRST — vs raw `NextResponse.json`).
  The smoke spec pins four bulk-loop walks (~6
  headers × 3 methods + ~7 PUT bodies all
  asserting `< 500`), longer-message TWO-key 401-
  envelope assertions on GET / PUT / DELETE, a
  cross-method 401-envelope-equality assertion
  across all three methods, a strict TWO-key
  envelope-shape assertion (no `item` /
  `engagement` leak), a gate-before-post-auth
  invariant pinning EIGHT post-auth messages must
  not leak, an updateAsClient-not-entered
  invariance walk on PUT (CRITICAL — XSS markers
  never echoed), a softDeleteForUser-not-entered
  invariance walk on DELETE (CRITICAL — URL
  itemId marker never echoed), a gate-before-
  FOUR-branch-catch invariance walk on PUT, a
  gate-before-Zod-body-validation invariance walk
  on PUT, a cross-method probe (POST / PATCH), a
  side-channel walk on PUT, and a cross-id
  invariance walk pinning that the auth gate
  fires BEFORE any per-id branch (the
  `notFoundResponse` / `forbiddenResponse` paths
  are unreachable on unauth). With this addition
  the per-spec-file docs rollout extends to
  109-of-N and the `tests/api/` per-spec-file
  sub-rollout extends to 107-of-many.

- `docs/plugins` Added `client-items-method-spec.md` —
  the **one-hundred-and-eighth** per-source-file
  reference the docs tree publishes for any file
  under `apps/web-e2e/tests/` and the **one-
  hundred-and-sixth** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/client-items-method.spec.ts`
  spec covering the `GET` AND `POST` exports of
  `apps/web/app/api/client/items/route.ts` — the
  **first per-source-file dual-method smoke** the
  docs tree publishes that pins the
  **`requireClientAuth()` helper-based auth gate**
  on BOTH GET AND POST (the
  `client-items-stats-query-spec.md` sibling pins
  the helper on a single GET surface; this spec
  extends to the dual-method usage). Also pins
  the **`badRequestResponse(message)` 400-helper**
  and the **issues-joined Zod error message**
  contract. Distinct contracts: `requireClientAuth`
  helper on BOTH methods (FIRST per-source-file
  dual-method smoke pinning the discriminated-
  union auth-helper return contract on both GET
  AND POST exports); `badRequestResponse(message)`
  400-helper (UNIQUE — FIRST per-source-file
  smoke pinning a dedicated 400-builder helper);
  issues-joined Zod error message (UNIQUE);
  GET success payload with FLAT keys at top
  level (UNIQUE — FIRST per-source-file GET
  smoke pinning a flat-pagination success
  payload); POST returns 201 with review-
  workflow success message; `?deleted=true`
  query branches to a different repo method
  (UNIQUE — FIRST per-source-file GET smoke
  pinning a query-driven repo-method dispatch
  contract); longer-message TWO-key 401
  envelope. The smoke spec pins three bulk-loop
  walks (~6 headers × 2 methods + ~9 POST
  bodies all asserting `< 500`), longer-message
  TWO-key 401-envelope assertions on GET AND
  POST, a cross-method 401-envelope-equality
  assertion, a strict TWO-key envelope-shape
  assertion, a gate-before-post-auth invariant,
  a createAsClient-not-entered invariance walk
  on POST (CRITICAL), a gate-before-Zod-query-
  validation invariance walk on GET, a gate-
  before-Zod-body-validation invariance walk on
  POST, a cross-method probe (PUT / PATCH /
  DELETE), and a side-channel walk on POST.
  With this addition the per-spec-file docs
  rollout extends to 108-of-N and the
  `tests/api/` per-spec-file sub-rollout
  extends to 106-of-many.

- `docs/plugins` Added `sponsor-ads-user-id-query-spec.md` —
  the **one-hundred-and-seventh** per-source-file
  reference the docs tree publishes for any file
  under `apps/web-e2e/tests/` and the **one-
  hundred-and-fifth** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/sponsor-ads-user-id-query.spec.ts`
  spec covering the `GET` export of
  `apps/web/app/api/sponsor-ads/user/[id]/route.ts`
  — the **first per-source-file dynamic-segment
  GET smoke** the docs tree publishes that pins a
  **404-mask user-scoped IDOR** -- when
  `sponsorAd.userId !== session.user.id`, the
  handler returns 404 `'Sponsor ad not found'`
  (NOT 403 'Forbidden') with the SAME envelope as
  the genuine not-found branch. UNIQUE: the FIRST
  per-source-file dynamic-segment GET smoke
  pinning a 404-mask security pattern on a USER-
  OWNED resource (the surveys-id sibling pins a
  404-mask on STATUS-gated admin resources; this
  sponsor-ads-user-id sibling pins the pattern on
  a per-user-ownership resource). Distinct
  contracts: 404-mask user-scoped IDOR (UNIQUE);
  TWO-key 401 envelope; TWO-key 404 envelope used
  for BOTH not-found AND IDOR violations; TWO-key
  success payload; TWO-key 500 envelope. The
  smoke spec pins a ~6-header bulk-loop walk
  asserting `< 500`, a canonical TWO-key 401-
  envelope assertion, a strict TWO-key envelope-
  shape assertion, a gate-before-post-auth
  invariant, a side-channel walk, a cross-method
  probe (POST / PUT / PATCH / DELETE), a
  getSponsorAdById-not-entered invariance walk
  (CRITICAL — pinning that no sponsor-ad fields
  are leaked), a cross-id invariance walk
  pinning that the auth gate fires BEFORE any
  per-id branch (the 404-mask is unreachable on
  unauth), and a catch-branch-not-entered
  invariance walk. With this addition the per-
  spec-file docs rollout extends to 107-of-N and
  the `tests/api/` per-spec-file sub-rollout
  extends to 105-of-many.

- `docs/plugins` Added `sponsor-ads-user-stats-query-spec.md` —
  the **one-hundred-and-sixth** per-source-file
  reference the docs tree publishes for any file
  under `apps/web-e2e/tests/` and the **one-
  hundred-and-fourth** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/sponsor-ads-user-stats-query.spec.ts`
  spec covering the `GET` export of
  `apps/web/app/api/sponsor-ads/user/stats/route.ts`
  — the **first per-source-file GET smoke** the
  docs tree publishes that pins a **THREE-bucket
  nested-stats success payload** (`{ success: true,
stats: { overview, byInterval, revenue } }` where
  each bucket has its own required-keys contract).
  UNIQUE: every prior per-source-file GET stats
  smoke pins a flat shallow stats key set; this is
  the FIRST that pins a THREE-bucket nested-stats
  invariant where the `stats` object is a triple-
  nested aggregate. Distinct from EVERY prior
  session-gated GET smoke: THREE-bucket nested-
  stats success payload (UNIQUE — `overview` has
  SEVEN status counts `total`/`pendingPayment`/
  `pending`/`active`/`rejected`/`expired`/
  `cancelled`; `byInterval` has TWO interval
  counts `weekly`/`monthly`; `revenue` has THREE
  rollups `totalRevenue`/`weeklyRevenue`/
  `monthlyRevenue`); bare `auth()` session lookup
  (distinct from `requireClientAuth()`
  discriminated-union helper); TWO-key 401
  envelope (same shape as parent `/sponsor-ads/
user` route, distinct from bare ONE-key
  envelope); TWO-key success payload using `stats`
  key (NOT `data`); service-call delegation
  (`sponsorAdService.getSponsorAdStatsByUser` is
  the ONLY post-auth load-bearing call); TWO-key
  500 catch envelope `'Failed to fetch sponsor ad
stats'` (distinct from parent route's `'Failed
to fetch sponsor ads'` and `'Failed to create
sponsor ad'` — NO 's' on `stat`); zero-arg GET
  signature. The smoke spec pins one bulk-loop
  walk (~6 headers all asserting `< 500`), a
  canonical TWO-key 401-envelope assertion, a
  strict TWO-key envelope-shape assertion, a
  gate-before-post-auth invariant, a
  sponsorAdService-not-entered CRITICAL invariance
  walk (NEITHER bucket names NOR inner keys leak),
  a side-channel walk, a cross-method probe (POST
  / PUT / PATCH / DELETE), a catch-branch
  isolation walk, and a cross-permutation status
  invariance walk. With this addition the per-
  spec-file docs rollout extends to 106-of-N and
  the `tests/api/` per-spec-file sub-rollout
  extends to 104-of-many.

- `docs/plugins` Added `sponsor-ads-user-method-spec.md` —
  the **one-hundred-and-fifth** per-source-file
  reference the docs tree publishes for any file
  under `apps/web-e2e/tests/` and the **one-
  hundred-and-third** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/sponsor-ads-user-method.spec.ts`
  spec covering the `GET` AND `POST` exports of
  `apps/web/app/api/sponsor-ads/user/route.ts` —
  the **first per-source-file dual-method smoke**
  the docs tree publishes that pins **Zod-
  `safeParse` validation on BOTH a query-parameter
  surface AND a body surface** (GET validates
  query via `querySponsorAdsSchema.safeParse`;
  POST validates body via
  `createSponsorAdSchema.safeParse`). UNIQUE: the
  FIRST per-source-file dual-method smoke pinning
  Zod schema validation across both query and
  body. Distinct from EVERY prior dual-method
  smoke: Zod-safeParse on BOTH query AND body
  (UNIQUE); dynamic environment-based payment
  provider (UNIQUE — module-level constant);
  POST returns 201 status (UNIQUE among sponsor-
  ads POST smokes); POST 400 for invalid JSON
  with distinct message (FIRST per-source-file
  POST smoke pinning a try/catch around `await
request.json()` with distinct message);
  conditional already-exists 400 catch branch
  via `'already have'` message substring (UNIQUE
  — FIRST per-source-file POST smoke pinning a
  message-substring catch dispatcher with status
  override); pagination success payload on GET
  with `hasNext`/`hasPrev` computed booleans
  (UNIQUE — FIRST per-source-file GET smoke
  pinning a hasNext/hasPrev computed-pagination
  contract); approval-workflow success message
  on POST (UNIQUE); TWO-key 401 envelope on
  both methods. The smoke spec pins three
  bulk-loop walks (~6 headers × 2 methods +
  ~8 POST bodies all asserting `< 500`),
  canonical TWO-key 401-envelope assertions on
  GET AND POST, a cross-method 401-envelope-
  equality assertion, a strict TWO-key
  envelope-shape assertion, a gate-before-post-
  auth invariant, a createSponsorAd-not-
  entered invariance walk on POST (CRITICAL),
  a gate-before-Zod-query-validation
  invariance walk on GET, a gate-before-body-
  parse-and-Zod-body-validation invariance
  walk on POST, a cross-method probe (PUT /
  PATCH / DELETE), and a side-channel walk on
  POST. With this addition the per-spec-file
  docs rollout extends to 105-of-N and the
  `tests/api/` per-spec-file sub-rollout
  extends to 103-of-many.

- `docs/plugins` Added `stripe-subscriptions-method-spec.md` —
  the **one-hundred-and-fourth** per-source-file
  reference the docs tree publishes for any file
  under `apps/web-e2e/tests/` and the **one-
  hundred-and-second** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/stripe-subscriptions-method.spec.ts`
  spec covering the `GET`, `POST`, `PUT`, AND
  `DELETE` exports of
  `apps/web/app/api/stripe/subscriptions/route.ts`
  — the **first per-source-file QUAD-method
  smoke** the docs tree publishes (every prior
  smoke covers 1, 2, or 3 methods). Distinct from
  the _singular_ sibling at
  `/api/stripe/subscription`: PROPER USER-SCOPED
  IDOR on PUT AND DELETE (CONTRAST with the
  singular sibling which has NO IDOR — Q-010
  finding — this plural sibling does it
  correctly). Distinct from EVERY prior method-
  method smoke: FOUR-method export (UNIQUE);
  GET conditional response shape based on
  `?active=` query (UNIQUE); POST returns 201
  status (UNIQUE among Stripe POST smokes);
  POST 409 Conflict for existing active
  subscription (UNIQUE — FIRST per-source-file
  POST smoke pinning a 409 Conflict status code);
  query-string DELETE — DELETE uses query
  parameters NOT body (UNIQUE — FIRST per-
  source-file DELETE smoke pinning a query-
  driven mutating DELETE); dynamic success
  message on DELETE; bare ONE-key 401 envelope
  consistent across ALL FOUR methods; three-
  field required-check on POST with comma-
  joined-field-list 400 message (UNIQUE — FIRST
  per-source-file POST smoke pinning a comma-
  joined-field-list 400 message). The smoke
  spec pins four header bulk-loop walks (~6
  headers × 4 methods asserting `< 500`),
  canonical bare ONE-key 401-envelope
  assertions, a cross-method 401-envelope-
  equality assertion across all four methods,
  a strict ONE-key envelope-shape assertion, a
  gate-before-post-auth invariant, an
  updateSubscription-not-entered invariance
  walk on PUT (CRITICAL), a
  cancelSubscription-not-entered invariance
  walk on DELETE with query-string ID
  (CRITICAL), a cross-query invariance walk on
  GET, a cross-method probe (PATCH), a side-
  channel walk on POST, and a required-field-
  check-not-entered invariance walk on POST.
  With this addition the per-spec-file docs
  rollout extends to 104-of-N and the
  `tests/api/` per-spec-file sub-rollout
  extends to 102-of-many.

- `docs/plugins` Added `stripe-subscription-method-spec.md` —
  the **one-hundred-and-third** per-source-file
  reference the docs tree publishes for any file
  under `apps/web-e2e/tests/` and the **one-
  hundred-and-first** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/stripe-subscription-method.spec.ts`
  spec covering the `POST`, `PUT`, AND `DELETE`
  exports of `apps/web/app/api/stripe/subscription/route.ts`
  — the **first per-source-file triple-method
  smoke** the docs tree publishes for a Stripe
  subscription-management endpoint that documents
  a **Q-010-style NO-IDOR finding on PUT AND
  DELETE**. The handlers authenticate the session
  but DO NOT verify that the `subscriptionId` from
  the body actually belongs to the calling user;
  ANY authenticated user can update or cancel ANY
  Stripe subscription by ID, bypassing the IDOR
  checks of the per-id siblings
  (`[subscriptionId]/update`,
  `[subscriptionId]/cancel`). Distinct from EVERY
  prior triple-method smoke: NO IDOR check on PUT
  or DELETE (UNIQUE — FIRST per-source-file
  triple-method smoke pinning a Q-010-style
  NO-IDOR finding on mutating subscriptionId-
  keyed methods); different body-required field
  on POST vs PUT/DELETE (UNIQUE — FIRST per-
  source-file triple-method smoke pinning three
  DIFFERENT required-field shapes); POST 400
  `'Failed to create customer'` branch (UNIQUE —
  only POST has the `!customerId` check); returns
  RAW Stripe subscription object verbatim on ALL
  THREE methods (UNIQUE — no wrapper envelope);
  `metadata: { userId: session.user.id }`
  OVERWRITE on PUT (UNIQUE — compounds the Q-010
  finding by enabling ownership-record
  laundering); bare ONE-key 401 envelope
  consistent across all three methods. The smoke
  spec pins three header bulk-loop walks (~6
  headers × 3 methods asserting `< 500`),
  canonical bare ONE-key 401-envelope assertions
  on POST/PUT/DELETE, a cross-method 401-
  envelope-equality assertion, a strict ONE-key
  envelope-shape assertion, a gate-before-post-
  auth invariant, an updateSubscription-not-
  entered invariance walk on PUT (CRITICAL —
  even though PUT has NO IDOR check post-auth,
  the auth gate itself must fire BEFORE
  updateSubscription), a cancelSubscription-not-
  entered invariance walk on DELETE (CRITICAL —
  same gate-before invariant), a cross-method
  probe (GET / PATCH), and a side-channel walk
  on POST. With this addition the per-spec-file
  docs rollout extends to 103-of-N and the
  `tests/api/` per-spec-file sub-rollout
  extends to 101-of-many; spawned a security
  task to add IDOR check to the PUT/DELETE
  handlers (the per-id sibling has the right
  pattern -- copy it).

- `docs/plugins` Added `client-items-stats-query-spec.md` —
  the **one-hundred-and-second** per-source-file
  reference the docs tree publishes for any file
  under `apps/web-e2e/tests/` and the **one-
  hundredth** under `apps/web-e2e/tests/api/`
  (a centennial milestone for the `tests/api/`
  sub-rollout). Pairs with a new
  `apps/web-e2e/tests/api/client-items-stats-query.spec.ts`
  spec covering the `GET` export of
  `apps/web/app/api/client/items/stats/route.ts`
  — the **first per-source-file GET smoke** the
  docs tree publishes that pins the
  **`requireClientAuth()` helper-based auth
  gate** with the **`'Unauthorized. Please sign
in to continue.'`** longer-message TWO-key
  envelope. UNIQUE: a different auth-helper
  abstraction than the bare `auth()` session
  lookup used in every other per-source-file
  smoke; uses the explicit `client-auth` utility
  helpers (`requireClientAuth`,
  `serverErrorResponse`). Distinct from EVERY
  prior GET smoke: `requireClientAuth()` helper-
  based auth gate (UNIQUE — returns a
  discriminated union on failure/success,
  FIRST per-source-file GET smoke pinning a
  discriminated-union auth-helper return
  contract); longer-message 401 envelope
  `'Unauthorized. Please sign in to continue.'`
  (UNIQUE); TWO-key success payload `{ success:
true, stats: <statsObject> }` (UNIQUE — uses
  `stats` key NOT `data`); `serverErrorResponse`
  outer-catch helper (UNIQUE distinct from
  `safeErrorResponse`); zero-arg GET signature.
  The smoke spec pins a ~6-header bulk-loop
  walk asserting `< 500`, a longer-message
  TWO-key 401-envelope assertion, a strict
  envelope-shape assertion, a gate-before-post-
  auth invariant, a side-channel walk, a cross-
  method probe (POST / PUT / PATCH / DELETE), a
  clientItemRepository-getStatsByUser-not-
  entered invariance walk (CRITICAL — pinning
  that the load-bearing DB read NEVER runs on
  unauth), and a cross-permutation status
  invariance walk. With this addition the per-
  spec-file docs rollout extends to 102-of-N
  and the `tests/api/` per-spec-file sub-rollout
  extends to 100-of-many — a centennial
  milestone for the `tests/api/` sub-rollout.

- `docs/plugins` Added `payment-account-id-query-spec.md` —
  the **one-hundred-and-first** per-source-file
  reference the docs tree publishes for any file
  under `apps/web-e2e/tests/` and the **ninety-
  ninth** under `apps/web-e2e/tests/api/`. Pairs
  with a new
  `apps/web-e2e/tests/api/payment-account-id-query.spec.ts`
  spec covering the `GET` export of
  `apps/web/app/api/payment/account/[userId]/route.ts`
  — the **first per-source-file dynamic-segment
  GET smoke** the docs tree publishes that pins a
  **strict user-id-IDOR check** (`session.user.id
!== params.userId` → 403 bare `{ error:
'Forbidden' }` with NO message specifying
  ownership) on a per-user resource lookup
  endpoint. CRITICAL: provides the auth-gated
  counterpart to the
  `payment-account-method-spec.md` sibling which
  has NO auth gate (Q-010 finding) — documenting a
  security-asymmetry where the GET on `[userId]`
  IS auth-gated while the POST/PUT on the parent
  route are NOT. Distinct from EVERY prior
  dynamic-segment GET smoke: strict user-id-IDOR
  check with bare `'Forbidden'` message (UNIQUE);
  userId-then-IDOR-then-provider validation order
  (UNIQUE — the IDOR check is INTERLEAVED between
  two validation checks, the FIRST per-source-
  file GET smoke pinning an IDOR check placed
  mid-validation-cascade); `?provider=` query
  parameter required (consistent with the POST/
  PUT siblings' body-required check); 404 with
  bare envelope `{ error: 'Payment account not
found' }` (UNIQUE); returns raw paymentAccount
  fields in success (matches POST/PUT siblings);
  DOES have `auth()` gate (CONTRAST with the no-
  auth-gate POST/PUT siblings — security-
  asymmetry finding). The smoke spec pins a ~6-
  header bulk-loop walk + a ~8-query bulk-loop
  walk all asserting `< 500`, a canonical bare
  ONE-key 401-envelope assertion, a strict ONE-
  key envelope-shape assertion, a gate-before-
  post-auth invariant, a side-channel walk, a
  cross-method probe (POST / PUT / PATCH /
  DELETE), a getUserPaymentAccountByProvider-not-
  entered invariance walk (CRITICAL — pinning
  that no `providerId` / `customerId` /
  `createdAt` is leaked), a cross-userId
  invariance walk pinning that different user
  IDs produce IDENTICAL unauth envelopes (the
  auth gate fires BEFORE the IDOR check), and a
  cross-provider invariance walk. With this
  addition the per-spec-file docs rollout
  extends to 101-of-N and the `tests/api/` per-
  spec-file sub-rollout extends to 99-of-many;
  the `payment/account` triplet (POST + PUT no-
  auth + GET-by-userId auth-gated) is now
  complete on per-source-file coverage.

- `docs/plugins` Added `payment-account-method-spec.md` —
  the **one-hundredth** per-source-file reference
  the docs tree publishes for any file under
  `apps/web-e2e/tests/` and the **ninety-eighth**
  under `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/payment-account-method.spec.ts`
  spec covering the `POST` AND `PUT` exports of
  `apps/web/app/api/payment/account/route.ts` —
  the **first per-source-file dual-method smoke**
  the docs tree publishes that documents a **Q-010-
  style NO-AUTH-GATE finding for a non-admin
  mutating route on BOTH POST AND PUT exports**.
  The handler has NO `auth()` call, NO ownership
  check; ANY caller can create a payment account
  for ANY `userId` + `customerId` (POST) OR
  update any payment account by `id` (PUT). The
  smoke spec pins this finding as the CURRENT
  contract -- a future PR that adds auth would
  explicitly break this spec, prompting an
  update. Distinct from EVERY prior dual-method
  smoke: NO `auth()` gate on EITHER method;
  NO ownership check; `setupUserPaymentAccount`
  runs UNCONDITIONALLY on both POST and PUT (PUT
  does NOT check that `id` matches an existing
  record -- it just calls
  `setupUserPaymentAccount` with the body
  fields, effectively the same logic as POST
  plus an `id` gate); THREE-required-field
  cascade on POST and FOUR-required-field
  cascade on PUT (each emitting a distinct 400
  message via individual `if (!field)` checks —
  UNIQUE: FIRST per-source-file dual-method
  smoke pinning a per-field individual-required-
  check chain); bare ONE-key 400 envelope; bare
  ONE-key 500 envelope; returns raw
  paymentAccount fields in success payload
  (UNIQUE: most success responses use `{
success: true, data: {...} }`). The smoke
  spec pins four bulk-loop walks (~6 headers ×
  2 methods + ~7 POST bodies + ~6 PUT bodies),
  a NO-401 contract assertion on BOTH POST and
  PUT, an auth-signal-ignored contract walk, a
  required-field cascade canonical-messages
  assertion (POST emits three distinct 400
  messages, PUT emits a fourth `'Account ID is
required'`), a strict ONE-key 400 envelope-
  shape assertion, a cross-method probe (GET /
  PATCH / DELETE), and a no-catch-on-valid-body
  contract. With this addition the per-spec-
  file docs rollout extends to 100-of-N (a
  centennial milestone) and the `tests/api/`
  per-spec-file sub-rollout extends to 98-of-
  many.

- `docs/plugins` Added `payment-id-method-spec.md` —
  the **ninety-ninth** per-source-file reference
  the docs tree publishes for any file under
  `apps/web-e2e/tests/` and the **ninety-seventh**
  under `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/payment-id-method.spec.ts`
  spec covering the `GET` AND `PATCH` exports of
  `apps/web/app/api/payment/[subscriptionId]/route.ts`
  — the **first per-source-file dual-method smoke**
  the docs tree publishes that pins a **provider-
  agnostic** auto-renewal toggle (the handler
  accepts `provider` / `paymentProvider` values
  from the `PaymentProvider` enum and routes the
  sync via `getOrCreateProvider(provider)` --
  works with Stripe, LemonSqueezy, Polar,
  Solidgate). Distinct from EVERY prior dual-
  method smoke: provider-agnostic dual-method;
  provider-source split (GET reads `provider`
  from QUERY STRING, PATCH reads `paymentProvider`
  from BODY — UNIQUE: FIRST per-source-file dual-
  method smoke pinning a SAME-NAMED-FIELD-from-
  DIFFERENT-SOURCES contract); dynamic enum-
  validation 400 message that lists the valid
  enum values; TWO distinct body-validation 400
  messages on PATCH (FIRST per-source-file PATCH
  smoke pinning a two-tier body-validation
  chain); explicit `typeof enabled !== 'boolean'`
  type-check (UNIQUE pre-Zod boolean type-
  validation); user-scoped IDOR with explicit
  `'Forbidden: You do not own this subscription'`
  message; best-effort provider sync (UNIQUE —
  FIRST per-source-file PATCH smoke pinning a
  best-effort provider sync after a successful
  local DB write); dynamic success message based
  on the `enabled` toggle. The smoke spec pins
  three bulk-loop walks (~6 headers × 2 methods
    - ~13 PATCH bodies), canonical bare ONE-key
      401-envelope assertions on GET AND PATCH, a
      cross-method 401-envelope-equality assertion,
      a strict envelope-shape assertion, a gate-
      before-post-auth invariant, a setAutoRenewal-
      not-entered invariance walk (CRITICAL —
      pinning that XSS markers in the body are
      NEVER echoed back), a gate-before-enum-
      validation invariance walk on GET, a cross-
      method probe (POST / PUT / DELETE), a side-
      channel walk, a gate-before-body-validation
      invariance walk pinning that malformed JSON /
      array body / non-bool enabled all produce 401
      NOT 400, and a cross-subscription-ID
      invariance walk. With this addition the per-
      spec-file docs rollout extends to 99-of-N and
      the `tests/api/` per-spec-file sub-rollout
      extends to 97-of-many.

- `docs/plugins` Added `verify-recaptcha-body-spec.md` —
  the **ninety-eighth** per-source-file reference
  the docs tree publishes for any file under
  `apps/web-e2e/tests/` and the **ninety-sixth**
  under `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/verify-recaptcha-body.spec.ts`
  spec covering the `POST` export of
  `apps/web/app/api/verify-recaptcha/route.ts` — the
  **first per-source-file smoke** the docs tree
  publishes that pins a **dev-mode bypass envelope**
  with status 200 `{ success: true, score: 1.0,
action: 'bypass' }` (when `RECAPTCHA_SECRET_KEY`
  is missing AND `NODE_ENV === 'development'`). It
  is also the **first** smoke the docs tree
  publishes that pins a route built on top of the
  `externalClient.postForm<T>(url, body)` helper
  (form-encoded outbound POST to Google's
  `https://www.google.com/recaptcha/api/siteverify`
  endpoint) AND the **first** smoke that pins the
  **`error_codes` underscore-rename invariant**
  (Google returns `error-codes` with a hyphen; the
  handler renames it to `error_codes` with an
  underscore in the response envelope). The cross-
  cutting `method-guards.spec.ts` ALSO probes
  `POST /api/verify-recaptcha` BUT only checks that
  an empty-object body produces a non-5xx response;
  this per-source-file spec drills into the four-
  branch dispatcher (token-required-400 / dev-
  bypass-200 / not-configured-500 / Google-proxy-
  pass-through). Distinct from EVERY prior POST
  smoke: form-encoded outbound POST via
  `externalClient.postForm` (UNIQUE — every other
  proxy POST in the docs tree uses `fetch` /
  `externalClient.post` JSON body); `error_codes`
  underscore-rename invariant (UNIQUE — no other
  proxy in the docs tree performs this hyphen-to-
  underscore rename); score / action surface
  (UNIQUE — no other smoke exercises ReCAPTCHA
  scoring fields); dev-mode bypass branch (UNIQUE
  — NO other smoke pins a 200 dev-bypass envelope
  with `action: 'bypass'`); not-configured 500
  branch (status 500 with NO stack trace /
  sensitive content). The smoke spec pins a
  ~12-header bulk-loop walk, a ~16-body bulk-loop
  walk, the load-bearing 400 token-required
  envelope assertion, a strict envelope-shape
  assertion (NO `featureDisabled` key — DIFFERENT
  from extract-body sibling), a falsy-token
  uniformity assertion (empty-string / null /
  numeric-zero / boolean-false ALL hit the same
  envelope), a no-token-echo invariant, a side-
  channel walk, a cross-method probe, a bypass-
  attempt-body-keys invariance assertion (user-
  supplied `RECAPTCHA_SECRET_KEY` / `secret` /
  `NODE_ENV` body fields are IGNORED), an env-
  driven dispatch invariant assertion (dev-bypass
  / not-configured / Google-proxy), the HYPHEN →
  UNDERSCORE rename invariant assertion, a 500-
  envelope no-leak assertion (CRITICAL — NEVER
  leaks `stack` / `cause` / `RECAPTCHA_SECRET_KEY`
  / `secretKey` / `siteverify` / `google.com`
  fragments), an outer-catch malformed-JSON
  fallback assertion, a truthy non-string token
  gate-semantics assertion, and a gate-before-
  post-validation order assertion. With this
  addition the per-spec-file docs rollout extends
  to 98-of-N and the `tests/api/` per-spec-file
  sub-rollout extends to 96-of-many.

- `docs/plugins` Added `cron-subscription-reminders-method-spec.md` —
  the **ninety-seventh** per-source-file reference
  the docs tree publishes for any file under
  `apps/web-e2e/tests/` and the **ninety-fifth**
  under `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/cron-subscription-reminders-method.spec.ts`
  spec covering the `GET` AND `POST` exports of
  `apps/web/app/api/cron/subscription-reminders/route.ts`
  — the **first per-source-file smoke** the docs
  tree publishes that pins a **207 Multi-Status
  partial-success response** (the handler returns
  207 when `result.success === false`). The
  existing multi-cron sibling `cron-jobs.spec.ts`
  covers OTHER cron routes; this spec drills into
  the subscription-reminders handler specifically.
  Distinct from EVERY prior cron smoke: timing-
  safe comparison on the FULL `Authorization`
  header (UNIQUE — every other cron handler
  compares ONLY the secret portion after stripping
  `Bearer `); BARE ONE-key 401 envelope `{ error:
'Unauthorized' }` (NO `success` key, NO
  `message` field — DIFFERENT from the cron-
  subscription-expiration sibling's TWO-key
  envelope); 207 Multi-Status response (UNIQUE —
  FIRST per-source-file smoke pinning a 207
  partial-success status code); spread-result
  success / error pattern (both branches spread
  the entire result object into the response —
  UNIQUE, distinct from subscription-expiration
  which constructs an explicit `data` envelope);
  GET + POST dual-method-delegate exports (POST
  simply does `return GET(request)`); outer catch
  via `safeErrorResponse(error, 'Cron job failed')`
  (distinct message vs subscription-expiration's
  `'Failed to process expired subscriptions'`).
  The smoke spec pins two header bulk-loop walks
  (~9 headers × 2 methods asserting `< 500`), a
  BARE ONE-key 401 envelope assertion, a strict
  envelope-shape assertion, a no-Bearer-secret-
  echo invariant, a timing-safe length-mismatch
  handling assertion on the FULL header, a POST-
  delegates-to-GET assertion, a cross-method
  probe (PUT / PATCH / DELETE), a side-channel
  walk, a subscriptionRenewalReminderJob-not-
  entered invariance walk (CRITICAL — the load-
  bearing reminder-job call NEVER runs on unauth
  and no spread-result key is leaked), a gate-
  before-post-auth invariant, and a no-207-on-
  unauth invariant. With this addition the per-
  spec-file docs rollout extends to 97-of-N and
  the `tests/api/` per-spec-file sub-rollout
  extends to 95-of-many; the cron triplet (sync +
  expiration + reminders) is now complete on
  per-source-file coverage.

- `docs/plugins` Added `cron-subscription-expiration-method-spec.md` —
  the **ninety-sixth** per-source-file reference
  the docs tree publishes for any file under
  `apps/web-e2e/tests/` and the **ninety-fourth**
  under `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/cron-subscription-expiration-method.spec.ts`
  spec covering the `GET` AND `POST` exports of
  `apps/web/app/api/cron/subscription-expiration/route.ts`
  — the **first per-source-file smoke** the docs
  tree publishes that pins a **timing-safe Bearer-
  token comparison** via `crypto.timingSafeEqual`.
  The existing multi-cron sibling
  `cron-jobs.spec.ts` covers the OTHER cron routes;
  this spec drills into the subscription-
  expiration handler specifically AND its **GET +
  POST dual-method-delegate** export pattern.
  Distinct from EVERY prior cron smoke: timing-
  safe Bearer-token comparison via
  `crypto.timingSafeEqual` (FIRST per-source-file
  smoke pinning a constant-time comparison
  contract); length-equality short-circuit
  (avoids the `timingSafeEqual` length-mismatch
  throw); `authHeader.replace('Bearer ', '')`
  parsing (vs exact-match comparison like cron/
  sync); TWO-key 401 envelope `{ success: false,
message: 'Unauthorized - Invalid or missing
cron secret' }` (UNIQUE — longer specific
  message naming the failure mode, vs cron/sync's
  `'Unauthorized'` — uses `message` not `error`);
  GET + POST dual-method-delegate exports (POST
  simply does `return GET(request)` — UNIQUE,
  FIRST per-source-file smoke pinning a method-
  delegate POST that re-routes to GET verbatim);
  email-service best-effort side-effect (does NOT
  fail the cron if email service unavailable);
  PII-stripped `affectedUsers` (no `email` field
  — intentional PII protection). The smoke spec
  pins two header bulk-loop walks (~9 headers ×
  2 methods including various Authorization
  probes plus side-channels asserting `< 500`),
  a TWO-key 401 envelope assertion, a strict
  envelope-shape assertion, a no-Bearer-secret-
  echo invariant, a timing-safe length-mismatch
  handling assertion pinning that BOTH too-short
  AND too-long tokens produce `< 500`, a POST-
  delegates-to-GET assertion pinning byte-
  identical envelopes on POST and GET unauth
  branches, a cross-method probe (PUT / PATCH /
  DELETE), a side-channel walk, a
  processExpiredSubscriptions-not-entered
  invariance walk (CRITICAL — the DB-write call
  NEVER runs on unauth and no `affectedUsers` /
  `processed` / `subscriptionId` is leaked), and
  a gate-before-post-auth invariant. With this
  addition the per-spec-file docs rollout extends
  to 96-of-N and the `tests/api/` per-spec-file
  sub-rollout extends to 94-of-many.

- `docs/plugins` Added `subscription-query-spec.md` —
  the **ninety-fifth** per-source-file reference
  the docs tree publishes for any file under
  `apps/web-e2e/tests/` and the **ninety-third**
  under `apps/web-e2e/tests/api/`. Pairs with the
  existing `apps/web-e2e/tests/api/subscription-query.spec.ts`
  spec covering the `GET` export of
  `apps/web/app/api/user/subscription/route.ts` —
  the **first per-source-file GET smoke** the docs
  tree publishes that pins an **OBJECT-wrapped
  success response** for a Stripe-customer-session
  endpoint where the no-customer-found branch ALSO
  returns an OBJECT (with `hasActiveSubscription:
false` + a `message` field). UNIQUE — the direct
  sibling `user-payments-query.spec.ts` returns a
  top-level **ARRAY** for the same Stripe-customer-
  session pattern; together the two specs pin the
  divergence between the two response shapes that
  share an identical auth-gate + customer-
  resolution prologue. Distinct from EVERY prior
  session-gated GET smoke: OBJECT-wrapped success
  response (UNIQUE); no-customer-found 200 OBJECT
  `{ hasActiveSubscription: false, message: 'No
Stripe customer found' }` (distinct from the
  user-payments sibling's `[]` empty-array
  fallback); bare ONE-key `{ error: 'Unauthorized' }`
  401 envelope; two-tier 500 catch dispatcher with
  TWO different 500 messages on the SAME ONE-key
  envelope shape (`'Failed to fetch subscription
data from Stripe'` vs `'Failed to fetch
subscription data'`); zero-arg GET signature;
  Stripe Subscriptions list with `expand:
['data.default_payment_method']` (UNIQUE — the
  FIRST per-source-file GET smoke pinning a Stripe
  expansion-list invariant); active-subscription
  discriminator (`sub.status === 'active' ||
sub.status === 'trialing'`); cents-to-major-
  units transform; currency uppercase invariant;
  caller-supplied-Stripe-key bypass attempt walked
  via `?stripeKey=` / `?stripe_key=` query
  parameters. The smoke spec pins a query-string
  bulk-loop walk over many parameter permutations,
  a canonical ONE-key 401-envelope assertion, a
  cross-query envelope-byte-equality assertion, a
  `?userId=` / `?customerId=` walk (CRITICAL),
  a `?stripeKey=` walk (CRITICAL), a `?token=`
  walk (CRITICAL), and a cross-permutation
  status-and-shape invariance assertion. With this
  addition the per-spec-file docs rollout extends
  to 95-of-N and the `tests/api/` per-spec-file
  sub-rollout extends to 93-of-many. (Docs-only
  commit — the spec test file
  `apps/web-e2e/tests/api/subscription-query.spec.ts`
  was already present in the repo; this commit
  publishes its per-source-file reference doc.)

- `docs/plugins` Added `favorites-id-method-spec.md` —
  the **ninety-fourth** per-source-file reference
  the docs tree publishes for any file under
  `apps/web-e2e/tests/` and the **ninety-second**
  under `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/favorites-id-method.spec.ts`
  spec covering the `DELETE` export of
  `apps/web/app/api/favorites/[itemSlug]/route.ts`
  — the **first per-source-file DELETE smoke** the
  docs tree publishes that pins a **THREE-field
  tenant-scoped IDOR check + SELECT-then-DELETE
  pattern** on a non-admin per-item DELETE route.
  Distinct from EVERY prior DELETE smoke:
  `checkDatabaseAvailability()` as the FIRST gate
  (auth check fires AFTER DB-availability); TWO-
  key 401 envelope + TWO-key 403 envelope (UNIQUE
  — FIRST per-source-file DELETE smoke pinning a
  401 → 403 → 404 cascade with three distinct
  messages on the same TWO-key envelope shape);
  THREE-field tenant-scoped IDOR check (UNIQUE —
  FIRST per-source-file DELETE smoke pinning a
  three-field IDOR via `userId === session.user.id`
  AND `itemSlug === path.itemSlug` AND `tenantId
=== currentTenantId`); SELECT-then-DELETE
  pattern (the handler runs an inline SELECT
  pre-check BEFORE the DELETE to surface 404 if
  not found, distinct from single-step DELETE
  WHERE); TWO-key success payload `{ success:
true, message: 'Favorite removed successfully' }`
  with NO `data` field (UNIQUE — most DELETE
  handlers return `data: { ... }` with deletion
  details). The smoke spec pins a ~7-header bulk-
  loop walk including `X-Tenant-Id` and `X-User-Id`
  side-channel probes, a canonical TWO-key 401-
  envelope assertion accepting either 401 OR 503
  (both pre-IDOR), a strict envelope-shape
  assertion, a gate-before-post-auth invariant
  pinning that NONE of four candidate messages
  must appear, a side-channel walk including
  X-Tenant-Id, a cross-method probe (GET / POST /
  PUT / PATCH), a SELECT-pre-check-and-DELETE-
  WHERE-not-entered invariance walk (CRITICAL —
  pinning that an XSS marker in the itemSlug URL
  is NEVER echoed back), a catch-branch-
  dispatcher-not-entered invariance walk, a cross-
  permutation status invariance walk, and a cross-
  itemSlug invariance walk pinning that the auth
  gate fires BEFORE any per-item-slug branch.
  With this addition the per-spec-file docs
  rollout extends to 94-of-N and the `tests/api/`
  per-spec-file sub-rollout extends to 92-of-many.

- `docs/plugins` Added `surveys-id-method-spec.md` —
  the **ninety-third** per-source-file reference
  the docs tree publishes for any file under
  `apps/web-e2e/tests/` and the **ninety-first**
  under `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/surveys-id-method.spec.ts`
  spec covering the `GET`, `PUT`, AND `DELETE`
  exports of `apps/web/app/api/surveys/[surveyId]/route.ts`
  — the **first per-source-file triple-method
  smoke** the docs tree publishes that pins a
  **MIXED-auth gate contract**: GET is publicly
  accessible for **published** surveys but admin-
  gated for unpublished surveys (with a UNIQUE
  **404-mask**: non-admin callers see `404 'Survey
not found'` INSTEAD of `403 'Forbidden'`); PUT
  and DELETE are admin-only. Distinct from EVERY
  prior triple-method smoke: MIXED-auth gate (FIRST
  per-source-file triple-method smoke pinning a
  public-GET + admin-PUT + admin-DELETE pattern,
  vs admin-collections-[id] which is admin-gated
  on ALL three methods); 404-mask on GET for non-
  published surveys (UNIQUE — FIRST per-source-
  file GET smoke pinning a 404-mask security
  pattern); ID-or-slug fallback lookup (UNIQUE —
  FIRST per-source-file dynamic-segment GET smoke
  pinning a dual-lookup-by-id-or-slug contract);
  `error.message === 'Survey not found'` catch-
  branch dispatch on PUT and DELETE (UNIQUE —
  FIRST per-source-file PUT/DELETE smoke pinning
  an `Error.message` equality-match catch-
  dispatcher); TWO-key `{ success: false, error:
'Unauthorized' }` 401 envelope on PUT and DELETE;
  `data: null` in DELETE success payload (UNUSUAL).
  The smoke spec pins four bulk-loop walks (~6
  headers × 3 methods + ~9 PUT bodies all
  asserting `< 500`), a canonical 404 envelope
  assertion for non-existent surveys on GET,
  canonical 401-envelope assertions on PUT and
  DELETE, a cross-method 401-envelope-equality
  assertion, a strict envelope-shape assertion, a
  gate-before-post-auth invariant pinning that
  NONE of five candidate messages must appear on
  PUT unauth, a surveyService-update-not-entered
  invariance walk on PUT (CRITICAL — pinning that
  XSS markers are NEVER echoed back), a
  surveyService-delete-not-entered invariance walk
  on DELETE (CRITICAL), a cross-method probe (POST
  / PATCH), side-channel walks on PUT and DELETE,
  and a catch-branch-dispatcher-not-entered
  invariance walk. With this addition the per-
  spec-file docs rollout extends to 93-of-N and
  the `tests/api/` per-spec-file sub-rollout
  extends to 91-of-many.

- `docs/plugins` Added `user-payments-query-spec.md` —
  the **ninety-second** per-source-file reference
  the docs tree publishes for any file under
  `apps/web-e2e/tests/` and the **ninetieth** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/user-payments-query.spec.ts`
  spec covering the `GET` export of
  `apps/web/app/api/user/payments/route.ts` — the
  **first per-source-file GET smoke** the docs tree
  publishes that pins a **top-level-ARRAY success
  response** (NOT an object wrapper). The handler
  returns either `[]` (when the caller has no
  Stripe customer) OR a top-level payment-history
  array (transformed Stripe invoice data). UNIQUE —
  every prior per-source-file GET smoke pins an
  object-shaped response; this is the FIRST that
  pins a bare-array shape. Sibling
  `subscription-query.spec.ts` covers
  `apps/web/app/api/user/subscription/route.ts`
  with the SAME `auth()` gate + Stripe customer
  lookup + two-tier catch dispatcher pattern but
  returns an OBJECT-wrapped response. Distinct from
  EVERY prior session-gated GET smoke: top-level-
  ARRAY success response (UNIQUE); no-customer-
  found 200 EMPTY ARRAY `[]` (distinct from
  `subscription` sibling); bare ONE-key
  `{ error: 'Unauthorized' }` 401 envelope; two-
  tier 500 catch dispatcher with TWO different 500
  messages on the SAME ONE-key envelope shape
  (UNIQUE — `'Failed to fetch payment data from
Stripe'` vs `'Failed to fetch payment data'`);
  zero-arg GET signature; Stripe Invoices +
  Subscriptions DUAL-list load-bearing chain (FIRST
  per-source-file GET smoke pinning a dual-Stripe-
  list invariant); filtered status whitelist
  (`paid || open` only). The smoke spec pins a
  ~7-header bulk-loop walk, a canonical ONE-key
  401-envelope assertion, a strict ONE-key envelope-
  shape assertion, a no-array-leak CRITICAL
  invariant, a gate-before-post-auth invariant
  pinning that NEITHER 500 message appears on
  unauth, a side-channel walk, a cross-method probe
  (POST / PUT / PATCH / DELETE), a Stripe-SDK-
  calls-not-entered invariance walk (CRITICAL: no
  `hosted_invoice_url` / `invoice_pdf` /
  `amount_paid` / `paymentProvider` /
  `subscriptionId` / `billingInterval` leak), a
  two-tier-catch-dispatcher-not-entered invariance
  walk, a no-stripe-error-message-leak invariant,
  and a cross-permutation status invariance walk.
  With this addition the per-spec-file docs rollout
  extends to 92-of-N and the `tests/api/` per-spec-
  file sub-rollout extends to 90-of-many.

- `docs/plugins` Added `cron-sync-query-spec.md` —
  the **ninety-first** per-source-file reference
  the docs tree publishes for any file under
  `apps/web-e2e/tests/` and the **eighty-ninth**
  under `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/cron-sync-query.spec.ts`
  spec covering the `GET` export of
  `apps/web/app/api/cron/sync/route.ts` — the
  **first per-source-file GET smoke** the docs tree
  publishes for a **Bearer-token-secret-gated cron
  endpoint**. The existing multi-cron sibling
  `cron-jobs.spec.ts` covers the OTHER cron routes
  (subscription-expiration, subscription-reminders);
  this spec drills into the cron/sync handler
  specifically. Distinct from EVERY prior GET
  smoke: Bearer-token-secret auth (the FIRST
  per-source-file GET smoke pinning a Bearer-token-
  only auth contract — the handler accepts ONLY
  `Authorization: Bearer ${CRON_SECRET}` and NOT
  session-based auth); dev-mode short-circuit (if
  `CRON_SECRET` is NOT configured AND env is
  `development`, the handler allows access without
  auth — same pattern as lemonsqueezy/update's
  dev-mode short-circuit); FOUR-key 401 envelope
  `{ success: false, timestamp: <ISO>, duration:
<ms>, message: 'Unauthorized' }` (UNIQUE — NO
  `error` field; uses `message` not `error` for the
  auth failure — the FIRST per-source-file smoke
  pinning a 401 envelope WITHOUT an `error` field);
  performance tracking via `startTime = Date.now()`
  and `duration: Date.now() - startTime` in BOTH
  the unauth response AND the success/catch
  responses (matches lemonsqueezy/update's richest-
  envelope spec but with a `message`-only
  envelope); custom `Cache-Control: no-cache,
no-store, must-revalidate` header on success;
  conditional success status (`{ status: result.
success ? 200 : 500 }` based on the sync result).
  The smoke spec pins a ~9-header bulk-loop walk
  (including various Authorization probes — wrong
  Bearer, empty Bearer, non-Bearer scheme, Basic
  auth — plus side-channels), a 4-key 401 envelope
  shape assertion via `Object.keys(body).sort()`,
  ISO timestamp + numeric duration assertions, a
  no-Bearer-secret-echo invariant pinning that the
  caller-supplied secret marker is NEVER echoed
  back, a cross-method probe (POST / PUT / PATCH /
  DELETE), a side-channel walk pinning that
  fabricated session cookies / X-User-Id /
  X-Forwarded-For do NOT bypass the Bearer-token
  auth, and a triggerManualSync-not-entered
  invariance walk pinning that the load-bearing
  sync call NEVER runs on unauth and no `details`
  from a sync result is leaked. With this addition
  the per-spec-file docs rollout extends to
  91-of-N and the `tests/api/` per-spec-file
  sub-rollout extends to 89-of-many.

- `docs/plugins` Added `stripe-subscription-portal-body-spec.md` —
  the **ninetieth** per-source-file reference
  the docs tree publishes for any file under
  `apps/web-e2e/tests/` and the **eighty-eighth**
  under `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/stripe-subscription-portal-body.spec.ts`
  spec covering the `POST` export of
  `apps/web/app/api/stripe/subscription/portal/route.ts`
  — the **first per-source-file POST smoke** the
  docs tree publishes for a Stripe billing-portal
  session-creation endpoint. Distinct from EVERY
  prior Stripe per-source-file POST smoke AND the
  polar-subscription-portal-body sibling: zero-arg
  POST signature (UNIQUE — the FIRST per-source-
  file POST smoke pinning a zero-arg POST contract
  with NO `request` / `context` arguments); ONE-key
  `{ error: 'Unauthorized' }` envelope (NO
  `success` key, NO `message` key — distinct from
  stripe-checkout's TWO-key shape and stripe-setup-
  intent-id's `{ success: false, error }` shape);
  `getCustomerId(...)` returns null → 404 ONE-key
  `{ error: 'Stripe customer ID not found' }`;
  `buildUrl('/settings/billing')` + `new URL(...)`
  URL-validation contract (UNIQUE — the FIRST per-
  source-file smoke pinning a `new URL()`
  validation contract on a constructed return URL,
  with TWO-key 500 envelope `{ error: 'Invalid
return URL configuration', message: 'The
application URL is not properly configured' }`);
  FOUR-key Stripe-error catch envelope (UNIQUE —
  the FIRST per-source-file POST smoke pinning a
  FOUR-key envelope with both `code` AND `type`
  fields surfaced from the Stripe error object,
  vs payment-methods-create's THREE-key shape and
  other handlers' TWO-key shapes); structured
  `Logger.create('StripePortal')` call in the
  inner catch (FIRST per-source-file POST smoke
  pinning a structured-logger contract on the
  inner Stripe-error branch); `safeErrorMessage`
  helper in BOTH the inner-stripe-error catch AND
  the outer catch; TWO-key outer-catch 500
  envelope `{ error: 'Failed to create billing
portal session', message }`. The POST handler
  combines `auth()` session lookup
  (`!session?.user` → 401 ONE-key),
  `initializeStripeProvider()` +
  `getStripeInstance()` AFTER auth gate,
  `stripe.getCustomerId(session.user as any)`
  load-bearing customer-id lookup (null → 404),
  `buildUrl('/settings/billing')` + `new URL(...)`
  URL-validation (invalid → 500 TWO-key),
  `stripeInstance.billingPortal.sessions.create(...)`
  load-bearing Stripe SDK call wrapped in INNER
  try/catch, inner-stripe-error catch (400 FOUR-
  key), success payload 200
  `{ success: true, data, message: 'Billing
portal session created' }`, outer catch 500
  TWO-key. Documents the at-a-glance scenario
  tree (a ~9-header bulk-loop walk + a ~9-body
  bulk-loop walk all asserting `< 500`; a
  canonical 401-envelope assertion; a strict
  ONE-key envelope-shape assertion; a no-portal-
  url-leak CRITICAL security invariant; a gate-
  before-post-auth invariant pinning that NONE
  of six candidate messages must appear; a
  side-channel walk; a cross-method probe
  (GET / PUT / PATCH / DELETE); an
  initializeStripeProvider-and-getCustomerId-and-
  billingPortal-sessions-create-not-entered
  invariance walk — CRITICAL; a URL-validation-
  catch-not-entered invariance walk; an inner-
  stripe-error-catch-FOUR-key-envelope-not-
  entered invariance walk — CRITICAL; an outer-
  catch-not-entered invariance walk; a no-stripe-
  error-message-leak invariant; a body-shape
  invariance walk; a cross-permutation status-
  invariance assertion; a no-XSS / open-redirect
  leak invariant). Cross-references the polar-
  subscription-portal-body sibling (different
  provider's portal pattern), the stripe-checkout
  POST root sibling (TWO-key Unauthorized
  envelope vs ONE-key here), the stripe-setup-
  intent-id GET sibling (different
  `{ success: false, error }` TWO-key shape),
  the stripe-payment-methods-create POST sibling
  (different envelope shape on Stripe-error
  catch), and to Spec 010.

- `docs/plugins` Added `item-comments-rating-id-update-method-spec.md` —
  the **eighty-ninth** per-source-file reference
  the docs tree publishes for any file under
  `apps/web-e2e/tests/` and the **eighty-seventh**
  under `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/item-comments-rating-id-update-method.spec.ts`
  spec covering the `PATCH` export of
  `apps/web/app/api/items/[slug]/comments/rating/[commentId]/route.ts`
  — the **first per-source-file PATCH smoke**
  documenting a **Q-010-style NO-AUTH-GATE
  finding for a non-admin mutating route** (NO
  `auth()` call, NO ownership check, NO rating
  validation; ANY caller can update ANY comment's
  rating to ANY value). Pins this finding as the
  CURRENT contract -- a future PR that adds auth
  would explicitly break the spec. Distinct from
  EVERY prior mutating smoke: NO auth gate; NO
  ownership check; NO rating validation;
  production-leftover console.log debug arrow
  (`'============rating=============>'`); returns
  raw comment row verbatim (no wrapper envelope);
  `checkDatabaseAvailability()` as the SOLE gate.
  The smoke spec pins a NO-401 contract assertion,
  an auth-signal-ignored contract walk pinning
  that fabricated auth headers produce SAME status
  as bare requests, a no-validation contract walk
  pinning that invalid rating values produce SAME
  status as valid values, a cross-method probe, a
  no-catch-on-valid-body assertion, and a no-
  wrapper-envelope assertion pinning the UNUSUAL
  raw-comment-row response shape. Also spawned a
  separate task to audit the Q-010 finding and
  add auth + ownership + Zod validation, and
  remove the production-leftover console.log.

- `docs/plugins` Added `stripe-payment-methods-id-method-spec.md` —
  the **eighty-eighth** per-source-file reference
  the docs tree publishes for any file under
  `apps/web-e2e/tests/` and the **eighty-sixth**
  under `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/stripe-payment-methods-id-method.spec.ts`
  spec covering the `GET` AND `DELETE` exports of
  `apps/web/app/api/stripe/payment-methods/[id]/route.ts`
  — the **first per-source-file GET + DELETE
  dual-method smoke** for any Stripe per-id
  primitive route. Distinct from EVERY prior per-id
  Stripe smoke: TWO methods exported on the same
  dynamic-segment path (GET retrieves filtered
  fields AND DELETE detaches with default-
  reassignment cascade — FIRST per-source-file
  GET + DELETE dual-method smoke pinning both
  methods on the same `[id]` route); customer-
  metadata-driven IDOR check on BOTH methods via
  `customer.metadata?.userId !== session.user.id`
  → 403; `!paymentMethod.customer` check distinct
  for each method (GET → 400 `'Payment method not
associated with any customer'` with `any`;
  DELETE → 400 `'Payment method not associated
with a customer'` with `a` — UNIQUE: only known
  per-source-file smoke pinning a one-word
  article-shift `any` vs `a` between two methods
  on the same handler); DELETE default-
  reassignment cascade — FIRST per-source-file
  DELETE smoke pinning a default-reassignment
  cascade (if deleted method was the customer's
  default and there are other methods, re-assign
  default to first remaining; if none, set
  default to undefined); THREE-branch StripeError
  catch on BOTH methods with distinct 500 messages
  per method (`'Failed to retrieve payment
method'` for GET, `'Failed to delete payment
method'` for DELETE). The smoke spec pins TWO
  header bulk-loops (~7 headers × 2 methods);
  canonical 401-envelope assertions on GET AND
  DELETE; cross-method envelope-equality
  assertion pinning byte-identical 401 envelopes;
  strict envelope-shape assertions on both methods;
  gate-before-post-auth invariant across nine
  candidate messages; gate-before-success-build
  invariant on GET (CRITICAL — no leak of `card`
  / `billing_details` / `is_default` /
  `customer_id`); gate-before-success-build
  invariant on DELETE (CRITICAL — no leak of
  `was_default`); side-channel walk; cross-
  method probe (POST / PUT / PATCH); a
  paymentMethods-retrieve-and-customers-retrieve-
  and-IDOR-and-detach-and-default-reassignment-
  not-entered invariance walk (CRITICAL); catch-
  branch-dispatcher-not-entered invariance walk;
  no-stripe-error-message-leak invariant; cross-
  id invariance walk on BOTH methods; no-XSS-id-
  substring leak invariant; and a default-
  reassignment-cascade-not-entered invariance
  walk on DELETE (CRITICAL — pins that the
  customer-default mutation cascade NEVER runs on
  unauth).

- `docs/plugins` Added `stripe-setup-intent-id-query-spec.md` —
  the **eighty-seventh** per-source-file reference
  the docs tree publishes for any file under
  `apps/web-e2e/tests/` and the **eighty-fifth**
  under `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/stripe-setup-intent-id-query.spec.ts`
  spec covering the `GET` export of
  `apps/web/app/api/stripe/setup-intent/[id]/route.ts`
  — the **first per-source-file GET smoke** for a
  Stripe per-id primitive route AND the **first
  per-source-file GET smoke** pinning a
  `error.code === 'resource_missing'` substring
  detection in the catch (UNIQUE Stripe enum-typed
  code-based dispatcher). Distinct from setup-
  intent POST root: GET method; `success: false` - `error: 'Unauthorized'` 2-key envelope (vs
  root's bare 1-key); customer-metadata IDOR
  check; filtered SetupIntent fields in success
  (vs root's raw provider object); Stripe-`error.
code` substring detection. The smoke spec pins
  a canonical 401-envelope assertion, a strict
  envelope-shape assertion, a no-`client_secret`-
  leak CRITICAL security invariant, a gate-before-
  post-auth invariant, a side-channel walk, a
  cross-method probe, a setupIntents-retrieve-
  and-customers-retrieve-and-IDOR-check-not-
  entered invariance walk (CRITICAL), a catch-
  branch-dispatcher-not-entered invariance walk, a
  no-stripe-error-message-leak invariant, and a
  cross-id-invariance walk pinning identical 401
  envelopes across different setup-intent IDs.

- `docs/plugins` Added `stripe-payment-methods-update-method-spec.md` —
  the **eighty-sixth** per-source-file reference
  the docs tree publishes for any file under
  `apps/web-e2e/tests/` and the **eighty-fourth**
  under `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/stripe-payment-methods-update-method.spec.ts`
  spec covering the `PUT` + `PATCH` exports of
  `apps/web/app/api/stripe/payment-methods/update/route.ts`
  — the **first per-source-file PUT + PATCH
  smoke** for a non-admin payment-method route.
  Sibling to the delete DELETE route. Distinct:
  TWO mutation methods exported on same path (PUT
  full update + PATCH set-default-only; FIRST per-
  source-file mutating smoke pinning PUT + PATCH
  dual-method export); shared helper-function-
  extraction design with delete sibling; PUT
  preserves existing metadata via spread (FIRST
  PUT smoke pinning metadata-merge contract);
  `userId` always present in metadata (caller
  cannot override). The smoke spec pins canonical
  401-envelope assertions on PUT AND PATCH, cross-
  method envelope-equality assertion pinning byte-
  identical 401 envelopes, gate-before-post-auth
  invariant, no-`metadata.userId`-leak invariant,
  cross-method probe, ownership-check-helper-and-
  paymentMethods-update-and-customers-update-not-
  entered invariance walk (CRITICAL), and no-
  `payment_method_id`-leak invariant — completing
  the Stripe payment-methods CRUD trio (create
  POST + update PUT/PATCH + delete DELETE).

- `docs/plugins` Added `stripe-payment-methods-delete-body-spec.md` —
  the **eighty-fifth** per-source-file reference
  the docs tree publishes for any file under
  `apps/web-e2e/tests/` and the **eighty-third**
  under `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/stripe-payment-methods-delete-body.spec.ts`
  spec covering the `DELETE` export of
  `apps/web/app/api/stripe/payment-methods/delete/route.ts`
  — the **first per-source-file DELETE smoke**
  for a non-admin payment-method route (mutation
  method is DELETE, NOT POST) AND the **first per-
  source-file mutating smoke** pinning a **multi-
  helper-function-extraction handler design** (5
  helpers: validateSession,
  validatePaymentMethodOwnership,
  handleDefaultPaymentMethodReassignment,
  checkAffectedSubscriptions, handleApiError) AND
  the **first per-source-file mutating smoke**
  pinning a **customer-metadata-driven IDOR
  check** (`customer.metadata?.userId === userId`
  → 403 if mismatch). Distinct from create sibling:
  DELETE method; ONE-key 401 envelope `'Authentication
required'`; helper-function-extraction; customer-
  metadata IDOR; Stripe-error-echo with `'Stripe
error: '` prefix; default-payment-method
  reassignment side-effect; affected-subscriptions
  count. The smoke spec pins canonical 401-envelope,
  strict envelope-shape, success-branch non-
  disclosure, gate-before-post-auth, no-Stripe-
  error-prefix invariant, status stability, side-
  channel walk, cross-method probe, Zod-throw-catch-
  not-entered invariance walk, ownership-check-
  helper-and-detach-and-reassignment-and-sub-count-
  not-entered invariance walk (CRITICAL --
  paymentMethods.detach must NEVER run on unauth),
  and no-paymentMethodId-leak invariant pinning
  XSS-shaped paymentMethodId NEVER echoed —
  pinning three FIRST contracts no prior mutating
  smoke covers.

- `docs/plugins` Added `stripe-subscription-id-update-body-spec.md` —
  the **eighty-fourth** per-source-file reference
  the docs tree publishes for any file under
  `apps/web-e2e/tests/` and the **eighty-second**
  under `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/stripe-subscription-id-update-body.spec.ts`
  spec covering the `POST` export of
  `apps/web/app/api/stripe/subscription/[subscriptionId]/update/route.ts`
  — the **third sibling** in the Stripe
  subscription-management trio (cancel +
  reactivate + update), completing the Stripe POST
  trio that mirrors the LemonSqueezy
  subscription-management trio (cancel +
  reactivate + update-plan) and the Polar pair
  (cancel + reactivate). Distinct from EVERY prior
  POST smoke: USER-scoped IDOR check
  (`userSubscription.userId !== session.user.id` →
  merged 404 `'Subscription not found or access
denied'`; FIRST per-source-file POST smoke
  pinning a USER-scoped IDOR on a Stripe
  subscription endpoint, sitting at the user-
  scoped end of the IDOR spectrum that began with
  stripe/cancel (no IDOR) and stripe/reactivate
  (tenant-only)); THREE-state allow-list pre-check
  400 (`subscription.status !== 'active' &&
subscription.status !== 'pending' &&
subscription.status !== 'paused'` → 400
  `'Subscription is not active'`; FIRST per-
  source-file POST smoke pinning a THREE-state
  allow-list pre-check 400, distinct from the
  reactivate sibling's SINGLE-flag pre-check on
  `cancelAtPeriodEnd`); PaymentPlan-enum-from-
  `@/lib/constants` includes-validation
  (`Object.values(PaymentPlan).includes(newPlanId)`
  → 400 `'Invalid plan ID'`; FIRST per-source-file
  POST smoke pinning an enum-from-constants
  membership-check validation, distinct from the
  LemonSqueezy update-plan sibling which uses Zod
  `safeParse`); conditional tenant-filter on a
  Drizzle UPDATE WHERE clause (`...(tenantId ?
[eq(subscriptions.tenantId, tenantId)] : [])`;
  FIRST per-source-file POST smoke pinning a
  conditional tenant filter spread into a DB UPDATE);
  plan-changed email payload with BOTH old + new
  plan names (`oldPlanName: subscription.planId,
newPlanName: newPlanId`; FIRST per-source-file
  POST smoke pinning an email with both old + new
  plan names); dynamic success message (`Plan
updated to ${newPlanId} successfully`; template
  literal with `newPlanId` interpolation, distinct
  from reactivate sibling's static message). The
  smoke spec pins a bare 401-envelope assertion, a
  strict envelope-shape assertion, a success-
  branch-key non-disclosure assertion, a gate-
  before-post-auth invariant, a no-dynamic-success-
  message-leak invariant via regex, a no-input-
  echo invariant (caller-supplied `newPlanId` /
  `newPriceId` markers must NEVER appear in the
  unauth response body), a parameterised-vs-
  baseline status-stability comparison, a side-
  channel walk including `X-User-Id` AND
  `X-Tenant-Id` probes, a cross-method probe, a
  malformed-JSON-body invariance walk, a no-500-
  from-body-parse-error invariant, a PaymentPlan-
  enum-includes-validation-not-entered invariance
  walk (4 shapes), a user-scoped-IDOR-check-not-
  entered invariance walk, a THREE-state-pre-check-
  400-not-entered invariance walk (3 shapes), an
  updateSubscription-DB-update-email-send-chain-
  not-entered invariance walk, a no-`'Failed to
update subscription'`-leak invariant, a body-
  completely-ignored invariance walk, and a cross-
  subscription-ID invariance walk pinning that
  the tenant-scoped DB read AND the user-id
  equality check are NOT entered upstream of the
  auth gate — completing the Stripe subscription-
  management POST trio and pinning FOUR FIRST
  contracts no prior POST smoke covers.

- `docs/plugins` Added `lemonsqueezy-update-body-spec.md` —
  the **eighty-third** per-source-file reference
  the docs tree publishes for any file under
  `apps/web-e2e/tests/` and the **eighty-first**
  under `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/lemonsqueezy-update-body.spec.ts`
  spec covering the `POST` export of
  `apps/web/app/api/lemonsqueezy/update/route.ts`
  — the **richest per-source-file POST smoke**
  the docs tree publishes, pinning SIX FIRST
  contracts: (1) `success: false`-AND-`code`-typed
  FIVE-key 401 envelope with `requestId` +
  `timestamp`; (2) per-request UUID via
  `crypto.randomUUID?.()` with browser-fallback;
  (3) performance tracking via `Date.now() -
startTime`; (4) development-mode short-circuit;
  (5) custom response headers (`Cache-Control` /
  `X-Request-ID` / `X-Response-Time`); (6) five-
  tier catch dispatcher (`VALIDATION_ERROR` → 400,
  `UNAUTHORIZED` → 401, `SUBSCRIPTION_NOT_FOUND`
  → 404, `PROVIDER_UNAVAILABLE` → 503, default →
  500). Distinct from cancel + reactivate +
  update-plan siblings: `!session?.user` gate
  (NOT email-gated); `code: 'UNAUTHORIZED'` (NOT
  `'AUTH_REQUIRED'`); 5-key 401 envelope; dev-mode
  short-circuit. The smoke spec pins a FIVE-key
  401-envelope assertion, a strict envelope-shape
  assertion, a per-request-UUID-uniqueness
  assertion, a request-id-forgery-prevention
  assertion (caller-supplied `X-Request-ID` is
  NEVER echoed), a success-branch-key non-
  disclosure assertion, a gate-before-post-auth
  invariant, a parameterised-vs-baseline status-
  stability comparison, a side-channel walk, a
  cross-method probe, a validation-chain-not-
  entered invariance walk, a dev-mode-short-
  circuit-and-provider-call-and-5-tier-catch-not-
  entered invariance walk, and a no-custom-header
  invariant on the unauth branch — pinning the
  richest envelope contract no prior smoke covers.

- `docs/plugins` Added `lemonsqueezy-update-plan-body-spec.md` —
  the **eighty-first** per-source-file reference
  the docs tree publishes for any file under
  `apps/web-e2e/tests/` and the **seventy-ninth**
  under `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/lemonsqueezy-update-plan-body.spec.ts`
  spec covering the `POST` export of
  `apps/web/app/api/lemonsqueezy/update-plan/route.ts`
  — the **third sibling** in the LemonSqueezy
  subscription-management trio (cancel +
  reactivate + update-plan). Distinct from
  siblings: multi-field Zod schema with defaults
  (FIRST per-source-file POST smoke pinning a
  multi-field-with-defaults Zod schema);
  `z.coerce.number().positive()` (FIRST Zod
  coerce-number contract); `z.enum` with default
  (FIRST Zod enum-with-default contract);
  `z.number().min(1).max(31)` for billingAnchor
  range constraint; plan-update-specific metadata
  (7 fields including session.user.email as
  updatedBy). The smoke spec pins THREE-key 401
  envelope, strict envelope-shape, success-branch
  non-disclosure, gate-before-post-auth, no-
  validation-codes invariant, no-updatedBy-leak,
  status stability, side-channel walk, cross-
  method probe, malformed-JSON invariance, multi-
  field-validation-chain-not-entered invariance
  (5 shapes), and updateSubscription-call-not-
  entered invariance — completing the LemonSqueezy
  subscription-management trio and pinning four
  FIRST Zod-schema-pattern contracts.

- `docs/plugins` Added `stripe-subscription-id-reactivate-body-spec.md` —
  the **eighty-second** per-source-file reference
  the docs tree publishes for any file under
  `apps/web-e2e/tests/` and the **eightieth** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/stripe-subscription-id-reactivate-body.spec.ts`
  spec covering the `POST` export of
  `apps/web/app/api/stripe/subscription/[subscriptionId]/reactivate/route.ts`
  — the **first per-source-file POST smoke**
  pinning a **TENANT-SCOPED-but-NOT-USER-SCOPED
  partial-IDOR finding** (the handler authenticates
  the user via `auth()` and then looks up the
  subscription via
  `getSubscriptionByProviderSubscriptionId('stripe',
subscriptionId)`, which scopes the query by
  `tenantId` but NOT by `userId`; sits between the
  stripe/cancel sibling which has NO IDOR check at
  all and the polar/cancel sibling which enforces
  full user-scoped IDOR; FIRST per-source-file POST
  smoke pinning a tenant-scoped-but-NOT-user-scoped
  IDOR contract) AND the **first per-source-file
  POST smoke** pinning a **STATE-MACHINE PRE-CHECK
  400 contract** (the handler reads
  `subscription.cancelAtPeriodEnd` from the DB row
  and returns 400 `'Subscription is not scheduled
for cancellation'` BEFORE calling the provider;
  distinct from the polar/subscription/[id]/
  reactivate sibling which surfaces the same 400
  via a catch-substring detection on the upstream
  Polar error message; this Stripe variant has the
  400 baked into the handler's own state-machine
  pre-check from a DB-row column read). Distinct
  from EVERY prior POST smoke: tenant-scoped DB-
  IDOR check (partial-IDOR finding); state-machine
  pre-check 400 minted from a DB-row column read;
  no body parsing (matches polar/reactivate
  sibling); multi-step write (`updateSubscription` - `updateSubscriptionBySubscriptionId` DB sync +
  async email side-effect with try/catch fault
  tolerance); generic 500 catch (single static
  string, NO substring detection); static success
  message; raw `reactivatedSubscription` provider
  object in `data` field. The smoke spec pins a
  bare 401-envelope assertion, a strict envelope-
  shape assertion, a success-branch-key non-
  disclosure assertion, a gate-before-post-auth
  invariant across four candidate messages, a
  parameterised-vs-baseline status-stability
  comparison (six permutations + tenant-scope
  probe), a side-channel walk including
  `X-Tenant-Id`, a cross-method probe, a no-body-
  parse contract walk on malformed JSON, a tenant-
  scoped-DB-IDOR-check-not-entered invariance
  walk, a state-machine-400-pre-check-not-entered
  invariance walk, a multi-step-write-chain-not-
  entered invariance walk, a catch-branch-generic-
  500-not-echoed invariance walk, a body-completely-
  ignored invariance walk, and a cross-subscription-
  ID invariance walk pinning that distinct sub IDs
  produce IDENTICAL unauth responses (proving the
  tenant-scoped DB read is NOT entered upstream of
  the auth gate) — pinning two FIRST contracts no
  prior smoke covers and completing the
  stripe/subscription/[id]/\* POST pair (cancel +
  reactivate).

- `docs/plugins` Added `stripe-subscription-id-cancel-body-spec.md` —
  the **eightieth** per-source-file reference the
  docs tree publishes for any file under
  `apps/web-e2e/tests/` and the **seventy-eighth**
  under `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/stripe-subscription-id-cancel-body.spec.ts`
  spec covering the `POST` export of
  `apps/web/app/api/stripe/subscription/[subscriptionId]/cancel/route.ts`
  — the **first per-source-file POST smoke**
  documenting a **Q-010-style IDOR finding for a
  Stripe subscription endpoint** (the handler
  authenticates via `auth()` but does NOT verify
  ownership of `subscriptionId`; compare to the
  polar/subscription/[id]/cancel sibling which DOES
  enforce ownership) AND the **first per-source-
  file POST smoke** pinning a **DB-sync-after-
  provider-call contract** (after `stripeProvider.
cancelSubscription(...)` succeeds, the handler
  ALSO calls `updateSubscriptionBySubscriptionId
({...})` to sync the cancellation state back to
  the local DB). Distinct from polar/subscription/
  [id]/cancel sibling: NO IDOR-protection; NO
  Content-Length 413 pre-check; DB sync side-
  effect; email-send with fault-tolerance; NO
  try/catch around `request.json()`. The smoke
  spec pins a bare 401-envelope assertion, a
  strict envelope-shape assertion, a success-
  branch-key non-disclosure assertion, a gate-
  before-post-auth invariant, a parameterised-vs-
  baseline status-stability comparison, a side-
  channel walk, a cross-method probe, a malformed-
  JSON-body invariance walk, a cancelSubscription-
  DB-sync-email-send-not-entered invariance walk,
  a catch-branch-generic-500-not-echoed invariance
  walk, and a **NO-IDOR-protection contract walk
  pinning that the unauth 401 envelope is IDENTICAL
  across different subscription IDs** -- pinning
  the CURRENT contract until a future PR adds
  ownership verification (which would explicitly
  break this spec, prompting an update). Also
  spawned a separate task to audit the Stripe
  IDOR finding and fix by mirroring the Polar
  pattern (`getCustomerId` → ownership verify →
  cancel).

- `docs/plugins` Added `lemonsqueezy-reactivate-body-spec.md` —
  the **seventy-ninth** per-source-file reference
  the docs tree publishes for any file under
  `apps/web-e2e/tests/` and the **seventy-seventh**
  under `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/lemonsqueezy-reactivate-body.spec.ts`
  spec covering the `POST` export of
  `apps/web/app/api/lemonsqueezy/reactivate/route.ts`
  — the **complement** to the lemonsqueezy-cancel-
  body-spec sibling: both routes share the same
  email-gated auth contract, THREE-key 401
  envelope with `code: 'AUTH_REQUIRED'`, Zod
  `safeParse` validation, and `timestamp` field
  in success envelope. The reactivate route
  differs in: (a) **Reactivation-specific
  metadata** -- the handler writes
  `session.user.email` to provider-side metadata
  as `reactivatedBy`; FIRST per-source-file POST
  smoke pinning a session.user.email-in-metadata
  contract; (b) `safeErrorResponse(...)` direct in
  catch (single line); (c) static success message
  (no conditional branch). The smoke spec pins a
  THREE-key 401-envelope assertion, a strict
  envelope-shape assertion, a success-branch-key
  non-disclosure assertion, a gate-before-post-
  auth invariant, a no-`VALIDATION_ERROR`-code
  invariant, a no-`reactivatedBy`-leak invariant,
  a parameterised-vs-baseline status-stability
  comparison, a side-channel walk, a cross-method
  probe, a malformed-JSON-body invariance walk, a
  validation-chain-not-entered invariance walk,
  and an updateSubscription-call-with-metadata-
  write-not-entered invariance walk — pinning the
  user's email being written to provider-side
  metadata as a contract.

- `docs/plugins` Added `polar-subscription-id-reactivate-body-spec.md` —
  the **seventy-eighth** per-source-file reference
  the docs tree publishes for any file under
  `apps/web-e2e/tests/` and the **seventy-sixth**
  under `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/polar-subscription-id-reactivate-body.spec.ts`
  spec covering the `POST` export of
  `apps/web/app/api/polar/subscription/[subscriptionId]/reactivate/route.ts`
  — the **first per-source-file POST smoke**
  pinning a **NO-BODY POST handler** (the handler
  does NOT call `request.json()` at all; the body
  is COMPLETELY ignored upstream of the auth gate;
  EVERY prior POST smoke either parses the body
  (lemonsqueezy, polar/cancel, stripe/checkout) OR
  explicitly extracts a header (sponsor-ads); FIRST
  per-source-file POST smoke pinning a body-less
  POST contract) AND the **first per-source-file
  POST smoke** pinning a **THREE-string error-
  message-detection catch** with a **400 minted
  from the catch dispatcher** (not from a schema
  validation step; EVERY prior POST smoke that
  pins a 400 does so via Zod `safeParse`; this is
  the FIRST 400 minted from the catch's
  substring-detection on a business-rule
  violation: `'not scheduled for cancellation'` →
  400 `'Subscription is not scheduled for
cancellation'`). Distinct from EVERY prior POST
  smoke: no body parsing; no Content-Length 413
  pre-check (distinct from polar/cancel sibling);
  THREE-string catch dispatcher (404 / 401 / 400);
  400-from-catch contract; static success message
  (NOT conditional based on a body flag); same
  IDOR-protection chain as polar/cancel sibling
  (`getCustomerId` → 403, private property
  extraction → 500, `getPolarSubscription`
  ownership check → merged 404). The smoke spec
  pins a bare 401-envelope assertion, a strict
  envelope-shape assertion, a success-branch-key
  non-disclosure assertion, a gate-before-post-
  auth invariant across seven candidate messages,
  a parameterised-vs-baseline status-stability
  comparison, a side-channel walk, a cross-method
  probe, a no-body-parse contract walk on
  malformed JSON, an IDOR-protection-chain-not-
  entered invariance walk, a reactivateSubscription-
  call-not-entered invariance walk, a catch-branch-
  THREE-string-dispatcher-not-entered invariance
  walk, a 400-catch-dispatcher-contract-not-entered
  invariance walk, and a body-completely-ignored
  invariance walk (the strongest no-body-parse
  contract in the rollout) — pinning two FIRST
  contracts no prior smoke covers.

- `docs/plugins` Added `polar-subscription-id-cancel-body-spec.md` —
  the **seventy-seventh** per-source-file reference
  the docs tree publishes for any file under
  `apps/web-e2e/tests/` and the **seventy-fifth**
  under `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/polar-subscription-id-cancel-body.spec.ts`
  spec covering the `POST` export of
  `apps/web/app/api/polar/subscription/[subscriptionId]/cancel/route.ts`
  — the **first per-source-file POST smoke**
  pinning a **Content-Length 413 pre-check** (the
  handler reads `request.headers.get('content-
length')` BEFORE the body parse and returns 413
  if declared length > 1KB; FIRST 413 contract in
  the rollout) AND the **first per-source-file
  POST smoke** pinning an **IDOR-protection
  chain** (after `getCustomerId` → 403, retrieves
  subscription and explicitly checks ownership;
  merged 404 message `'Subscription not found or
access denied'` for both not-found AND ownership-
  mismatch). Distinct from EVERY prior POST smoke:
  Content-Length 413 pre-check; IDOR-protection
  chain; private property access via
  `(polarProvider as any).polar`; helper-function
  injection (`getPolarSubscription` takes
  `formatErrorMessage` AND `logger`); TWO-string
  error-message-detection catch dispatching to 404
  / 401 / 500; conditional success message; body-
  parse fault tolerance with size-error detection.
  The smoke spec pins a bare 401-envelope
  assertion, a strict envelope-shape assertion, a
  success-branch-key non-disclosure assertion, a
  gate-before-post-auth invariant, a 413-pre-
  check-not-triggered-on-unauth invariance walk, a
  parameterised-vs-baseline status-stability
  comparison, a side-channel walk, a cross-method
  probe, a malformed-JSON-body invariance walk, an
  IDOR-protection-chain-not-entered invariance
  walk, a cancelSubscription-call-not-entered
  invariance walk, and a catch-branch-error-
  message-detection-not-entered invariance walk —
  pinning two FIRST contracts no prior smoke
  covers.

- `docs/plugins` Added `lemonsqueezy-cancel-body-spec.md` —
  the **seventy-sixth** per-source-file reference
  the docs tree publishes for any file under
  `apps/web-e2e/tests/` and the **seventy-fourth**
  under `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/lemonsqueezy-cancel-body.spec.ts`
  spec covering the `POST` export of
  `apps/web/app/api/lemonsqueezy/cancel/route.ts`
  — the **first per-source-file POST smoke**
  pinning an **email-gated auth contract**
  (`!session?.user?.email` -- FIRST per-source-file
  POST smoke gating on session email) AND the
  **first per-source-file POST smoke** pinning a
  **`code` field in the 401 envelope** (THREE-key
  envelope `{ error, message, code:
'AUTH_REQUIRED' }`; FIRST per-source-file POST
  smoke pinning enum-typed code in 401) AND the
  **first per-source-file POST smoke** pinning a
  **`timestamp` field in success AND catch
  envelopes**. Distinct from EVERY prior POST
  smoke: email-gated auth; THREE-key 401 envelope
  with `code: 'AUTH_REQUIRED'`; `code` field in
  400 validation envelope (`code: 'VALIDATION_
ERROR'`); FOUR-key catch envelope with `code:
'CANCEL_FAILED'` AND `timestamp` (FIRST per-
  source-file POST smoke pinning a 4-key catch
  envelope); conditional success message based on
  `cancelAtPeriodEnd` flag; `timestamp` field in
  success AND catch envelopes; `safeErrorMessage`
  extracted into catch envelope's `message` field
  (NOT into `error` field). The smoke spec pins a
  THREE-key 401-envelope assertion, a strict
  envelope-shape assertion, a success-branch-key
  non-disclosure assertion, a gate-before-post-
  auth invariant, a no-`VALIDATION_ERROR`-or-
  `CANCEL_FAILED`-codes invariant, a no-
  `timestamp`-leak invariant, a parameterised-vs-
  baseline status-stability comparison, a side-
  channel walk, a cross-method probe, a malformed-
  JSON-body invariance walk, a validation-chain-
  not-entered invariance walk, a cancelSubscription-
  call-not-entered invariance walk, and a catch-
  branch-four-key-envelope-not-echoed invariance
  walk — pinning three FIRST contracts no prior
  smoke covers.

- `docs/plugins` Added `stripe-payment-methods-create-body-spec.md` —
  the **seventy-fifth** per-source-file reference
  the docs tree publishes for any file under
  `apps/web-e2e/tests/` and the **seventy-third**
  under `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/stripe-payment-methods-create-body.spec.ts`
  spec covering the `POST` export of
  `apps/web/app/api/stripe/payment-methods/create/route.ts`
  — the **first per-source-file POST smoke**
  pinning a **Zod `parse` (NOT `safeParse`)
  contract** (`createPaymentMethodSchema.parse(body)`
  THROWS on validation failure and the outer catch
  detects `error instanceof z.ZodError`; EVERY prior
  POST smoke uses `safeParse`; FIRST throw-on-
  invalid Zod contract) AND the **first per-
  source-file POST smoke** pinning a **Stripe-
  error-echo contract** (`error instanceof Stripe.
errors.StripeError` → 400 with raw stripe error
  message echoed; EVERY prior catch uses static-
  string messages). Distinct from every prior POST
  smoke: Zod `.parse(body)` throwing; stripe-error-
  echo catch; multi-step Stripe SDK orchestration
  (six SDK calls -- the most complex orchestration
  in any per-source-file POST smoke); formatted
  response payload (extracts subset of fields with
  card sub-object, NOT raw provider object). The
  smoke spec pins a canonical 401-envelope
  assertion, a strict envelope-shape assertion, a
  success-branch-key non-disclosure assertion, a
  gate-before-post-auth invariant, a Zod-throw-
  catch-not-entered invariance walk, a stripe-
  error-echo-catch-not-entered invariance walk, a
  no-card-details-leak CRITICAL security invariant
  pinning that `card.last4` / `card.brand` / etc.
  are NEVER exposed, a no-metadata-userId-spread-
  leak invariant, a parameterised-vs-baseline
  status-stability comparison, a side-channel walk,
  a cross-method probe, a multi-step-Stripe-
  orchestration-not-entered invariance walk, and a
  catch-branch-generic-500-not-echoed invariance
  walk — pinning two FIRST contracts no prior
  smoke covers and the most complex Stripe SDK
  orchestration in the rollout.

- `docs/plugins` Added `stripe-payment-intent-body-spec.md` —
  the **seventy-fourth** per-source-file reference
  the docs tree publishes for any file under
  `apps/web-e2e/tests/` and the **seventy-second**
  under `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/stripe-payment-intent-body.spec.ts`
  spec covering the `POST` export of
  `apps/web/app/api/stripe/payment-intent/route.ts`
  — the **first per-source-file POST smoke**
  pinning a **NO-body-validation contract** (the
  handler destructures `{ amount, currency = 'usd',
metadata, planId }` and passes them straight to
  `stripeProvider.createPaymentIntent(...)` with NO
  validation; EVERY prior POST smoke has at least
  one body-validation gate -- FIRST trust-the-body
  POST contract in the rollout) AND the **second
  per-source-file POST smoke** pinning a **raw
  payment-provider object as the success payload**
  (after stripe-setup-intent-body-spec). Distinct
  from setup-intent: body destructure with
  `currency = 'usd'` default; caller-controlled
  `metadata: { userId, planId, ...metadata }`
  spread (caller's `metadata.userId` OVERRIDES
  session userId because spread is AFTER); GET
  sibling with `?payment_intent_id=` query-param-
  required check. Distinct from every prior POST
  smoke: NO-body-validation; bare 401 envelope;
  raw PaymentIntent object payload; caller-
  controlled metadata spread. The smoke spec pins
  a bare 401-envelope assertion, a strict envelope-
  shape assertion, a success-branch-key non-
  disclosure assertion, a gate-before-post-auth
  invariant, a no-PaymentIntent-`client_secret`-
  leak CRITICAL security invariant, a no-
  PaymentIntent-fields-leak invariant pinning the
  full set, a no-metadata-userId-spread-leak
  invariant pinning that caller-supplied
  `metadata.userId` (`'attacker_user_id'`) is
  NEVER echoed, a parameterised-vs-baseline
  status-stability comparison, a side-channel
  walk, a cross-method probe, a malformed-JSON-
  body invariance walk, a createPaymentIntent-and-
  getCustomerId-not-entered invariance walk, and a
  catch-branch-not-entered invariance walk —
  pinning the trust-the-body contract no prior
  smoke covers and the CRITICAL `client_secret`-
  leak security invariant as applied to
  PaymentIntent.

- `docs/plugins` Added `sponsor-ads-user-id-renew-body-spec.md` —
  the **seventy-third** per-source-file reference
  the docs tree publishes for any file under
  `apps/web-e2e/tests/` and the **seventy-first**
  under `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/sponsor-ads-user-id-renew-body.spec.ts`
  spec covering the `POST` export of
  `apps/web/app/api/sponsor-ads/user/[id]/renew/route.ts`
  — the **first per-source-file POST smoke**
  pinning a **swallow-and-continue body-parse
  contract** (`try { const body = await request.json();
successUrl = body.successUrl; cancelUrl =
body.cancelUrl; } catch { /* Body is optional */ }`
  — malformed JSON OR missing body silently leaves
  `successUrl` / `cancelUrl` as `undefined`; FIRST
  swallow-and-continue contract in the rollout, distinct
  from the sibling cancel route's silent-coalesce-to-{}
  pattern). Also the **first per-source-file POST
  smoke** pinning **TWO open-redirect-validated URLs
  in the SAME body** (`successUrl` AND `cancelUrl`,
  each through `validateRedirectUrl` comparing
  `protocol`, `hostname`, AND `port` against
  `appUrl`) AND a **multi-provider `switch` dispatch
  with default-case 400** (Stripe / LemonSqueezy /
  Polar / default → 400 `'Payment configuration is
incomplete. Please contact support.'`) AND a
  **state-machine 400 branch with status
  interpolation** (`Cannot renew sponsor ad with
status: ${sponsorAd.status}. Only active or expired
ads can be renewed.`; whitelist gate
  `renewableStatuses = [ACTIVE, EXPIRED]`). The smoke
  spec pins a canonical 401 `{ success: false, error:
'Unauthorized' }` two-key envelope, a strict
  envelope-shape assertion, gate-before-post-auth /
  -ownership / -state-machine / -provider-switch /
  -outer-catch invariants, swallow-and-continue
  body-parse fault-tolerance, a CRITICAL no-attacker-
  URL-leak invariant pinning that caller-supplied
  `successUrl` / `cancelUrl` open-redirect attacker
  URLs are NEVER echoed in the unauth response or in
  any redirect-style header, a no-dangerous-URL-
  pseudo-protocol-leak invariant pinning that
  `javascript:` / `data:` / `file:` / protocol-relative
  `//host` URLs are NEVER echoed, a status-
  interpolation walk pinning that XSS-shaped
  caller-supplied `status` values are NEVER reflected,
  a side-channel walk, and a cross-method probe —
  pinning the swallow-and-continue + TWO-URL open-
  redirect-prevention sponsor-ad renew contract and
  CRITICAL no-attacker-URL-leak security invariant.
  Completes the user-owned sponsor-ad action POST
  pair with the sibling cancel route covered by
  `sponsor-ads-user-id-cancel-body-spec.md`.

- `docs/plugins` Added `stripe-setup-intent-body-spec.md` —
  the **seventy-second** per-source-file reference
  the docs tree publishes for any file under
  `apps/web-e2e/tests/` and the **seventieth** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/stripe-setup-intent-body.spec.ts`
  spec covering the `POST` export of
  `apps/web/app/api/stripe/setup-intent/route.ts`
  — the **first per-source-file POST smoke**
  pinning a **zero-argument `POST()` handler
  signature** (no `request` parameter at all; FIRST
  zero-arg POST contract in the rollout) AND the
  **first per-source-file POST smoke** pinning a
  **raw payment-provider object as the success
  payload** (returns the Stripe SetupIntent object
  verbatim, NO wrapper envelope -- making the
  no-`client_secret`-leak assertion a CRITICAL
  security invariant). Distinct from EVERY prior
  POST smoke: zero-argument `POST()` signature;
  bare 401 envelope `{ error: 'Unauthorized' }`
  (UNIQUE); `!session?.user` gate (matches stripe-
  checkout); raw provider-object success payload
  (no wrapper envelope); single-line catch (the
  simplest catch in any per-source-file POST
  smoke); only one load-bearing call. The smoke
  spec pins a bare 401-envelope assertion, a
  strict envelope-shape assertion (exactly `error`
  key, no other keys), a gate-before-post-auth
  invariant, a no-SetupIntent-`client_secret`-leak
  CRITICAL security invariant, a no-SetupIntent-
  fields-leak invariant pinning the full set of
  fields (`id`, `client_secret`, `status`, `usage`,
  `customer`, `created`), a body-IGNORED invariance
  walk pinning that the zero-arg handler ignores
  body content, a side-channel walk, a cross-
  method probe, a createSetupIntent-and-provider-
  not-entered invariance walk, and a catch-
  branch-not-entered invariance walk — pinning the
  simplest auth-gated POST contract in the rollout
  and a CRITICAL no-`client_secret`-leak security
  invariant.

- `docs/plugins` Added `sponsor-ads-user-id-cancel-body-spec.md` —
  the **seventy-first** per-source-file reference
  the docs tree publishes for any file under
  `apps/web-e2e/tests/` and the **sixty-ninth**
  under `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/sponsor-ads-user-id-cancel-body.spec.ts`
  spec covering the `POST` export of
  `apps/web/app/api/sponsor-ads/user/[id]/cancel/route.ts`
  — the **first per-source-file POST smoke**
  pinning a **body-parse-fault-tolerant contract**
  (`await request.json().catch(() => ({})) ?? {}`
  -- malformed JSON OR `null` OR empty body
  silently coalesces to `{}`; FIRST silent-coalesce
  contract in the rollout) AND a **conditional Zod
  validation contract** (`.omit({ id: true })
.safeParse(body)` with `if (!parsed.success &&
body.cancelReason !== undefined)` gate). Distinct
  from EVERY prior POST smoke: silent-coalesce
  body-parse contract; conditional Zod validation
  with `.omit`; default-fallback string for
  `cancelReason` (`'Cancelled by user'`); three-
  branch outer catch with mixed exact-string +
  substring detection (`error.message === 'Sponsor
ad not found'` → 404, `error.message.includes
('Cannot cancel')` → 400, default → 500). The
  smoke spec pins a canonical one-key 401-envelope
  assertion, a strict envelope-shape assertion, a
  success-branch-key non-disclosure assertion, a
  gate-before-post-auth invariant, a silent-
  coalesce-body-parse-without-400 invariance walk,
  a parameterised-vs-baseline status-stability
  comparison, a side-channel walk, a cross-method
  probe, a conditional-Zod-validation-not-entered
  invariance walk, an ownership-and-cancelSponsorAd-
  not-entered invariance walk, a three-branch-outer-
  catch-not-entered invariance walk, and a no-
  cancelReason-leak assertion — pinning four FIRST
  contracts no prior smoke covers.

- `docs/plugins` Added `auth-change-password-body-spec.md` —
  the **seventieth** per-source-file reference the
  docs tree publishes for any file under
  `apps/web-e2e/tests/` and the **sixty-eighth**
  under `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/auth-change-password-body.spec.ts`
  spec covering the `POST` export of
  `apps/web/app/api/auth/change-password/route.ts`
  — the **first per-source-file POST smoke** that
  pins a **rate-limit-FIRST gate posture** -- the
  rate-limit check fires BEFORE the auth gate.
  EVERY prior per-source-file POST smoke pins auth
  as the first gate; this is the FIRST rate-limit-
  before-auth contract in the rollout. Distinct
  from EVERY prior POST smoke: rate-limit-FIRST
  gate posture (returns 429 with `retryAfter`
  field; FIRST per-source-file POST smoke pinning
  a `retryAfter` field); `'Unauthorized. Please
sign in.'` 401 message (UNIQUE imperative-
  phrased); OAuth-account check (FIRST per-
  source-file POST smoke pinning OAuth-account-
  restriction); dual bcrypt.compare gates (current-
  password verification AND duplicate-password
  prevention; FIRST per-source-file POST smoke
  pinning a dual bcrypt.compare contract); cross-
  field Zod `.refine` validation (FIRST per-
  source-file POST smoke pinning a cross-field
  validation contract); email-send fault tolerance
  (sendPasswordChangeConfirmationEmail wrapped in
  try/catch, does NOT fail the password change).
  The companion minimal spec
  `auth-change-password.spec.ts` pins only the
  `< 500` no-server-error contract; this spec
  drills into the body / header surface with
  detailed invariants. The smoke spec pins an
  imperative-phrased 401-envelope assertion, a
  strict envelope-shape assertion, a success-
  branch-key non-disclosure assertion, a gate-
  before-post-auth invariant (8-message non-
  disclosure set), a 429-envelope-includes-
  retryAfter assertion, a parameterised-vs-
  baseline status-stability comparison, a side-
  channel walk, a cross-method probe, a malformed-
  JSON-body invariance walk, a Zod-validation-
  chain-not-entered invariance walk, a bcrypt-
  compare-gates-not-entered invariance walk, and
  an OAuth-account-check-and-db-update-and-email-
  send-not-entered invariance walk — the **first
  rate-limit-FIRST POST smoke** the docs tree
  publishes.

- `docs/plugins` Added `item-comments-id-method-spec.md` —
  the **sixty-ninth** per-source-file reference the
  docs tree publishes for any file under
  `apps/web-e2e/tests/` and the **sixty-seventh**
  under `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/item-comments-id-method.spec.ts`
  spec covering the `PUT` and `DELETE` exports of
  `apps/web/app/api/items/[slug]/comments/[commentId]/route.ts`
  — the **first per-source-file PUT + DELETE
  smoke** the docs tree publishes for a public
  per-comment edit / delete route, and the **first
  per-source-file PUT or DELETE smoke** that pins a
  **plain-text 401 envelope** instead of a JSON one
  (the unauth branches return `new NextResponse
('Unauthorized', { status: 401 })` -- plain-text
  body, NOT JSON; FIRST plain-text 401 contract in
  the rollout). Distinct from the comment-create POST
  sibling: plain-text 401 envelope (NOT JSON);
  plain-text 404 / 403 envelopes for client-profile
  / tenant errors; MIXED-envelope contract (auth /
  profile / tenant errors return plain-text, body-
  validation errors PUT-only return JSON; FIRST
  per-source-file smoke pinning a mixed plain-text - JSON envelope contract on the same handler);
  three-step ownership chain via Drizzle query with
  embedded `userId` + `tenantId` + `deletedAt IS
NULL` filters; DELETE returns 204 No Content; PUT
  body validation pins a partial-update validation
  contract (FIRST per-source-file PUT smoke). The
  smoke spec pins a doubled header walk (~10 ×
  PUT/DELETE) + PUT body walk (~12 bodies); a
  canonical plain-text 401 envelope assertion on
  both methods; a no-JSON-prefix invariant for
  unauth bodies; a gate-before-post-auth invariant
  with mixed plain + JSON message-set non-
  disclosure; a parameterised-vs-baseline status-
  stability comparison; a cross-method probe (POST
  / PATCH); a malformed-JSON-body invariance walk
  for PUT; a body-validation-chain-not-entered
  invariance walk for PUT; a Drizzle-ownership-
  query-not-entered invariance walk for both
  methods; and an updateComment-and-deleteComment-
  not-entered invariance walk pinning that DELETE
  must NEVER return 204 and PUT must NEVER return a
  comment payload — the **first per-source-file
  PUT + DELETE smoke pinning a plain-text 401
  envelope**, expanding the rollout's mutating-
  method coverage beyond the JSON-envelope family
  for the first time.

- `docs/plugins` Added `sponsor-ads-checkout-body-spec.md`
  — the **sixty-eighth** per-source-file reference the
  docs tree publishes for any file under
  `apps/web-e2e/tests/` and the **sixty-sixth** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/sponsor-ads-checkout-body.spec.ts`
  spec covering the `POST` export of
  `apps/web/app/api/sponsor-ads/checkout/route.ts` —
  the **first per-source-file POST smoke for an auth-
  gated MULTI-PROVIDER dispatching checkout
  endpoint**, extending the auth-gated checkout
  quartet (Solidgate + Polar + LemonSqueezy + Stripe)
  into a quintet by adding a checkout endpoint that is
  NOT tied to a single provider but instead `switch`-
  dispatches to all three providers based on
  `process.env.NEXT_PUBLIC_PAYMENT_PROVIDER`. Distinct
  from ALL FOUR siblings: multi-provider switch
  dispatch (FIRST per-source-file POST smoke pinning a
  three-way provider dispatch via env var); `success:
false` envelope on every error branch (distinct from
  the quartet's two-key `{ error, message }`
  envelopes); open-redirect validation via
  `validateRedirectUrl(successUrl)` + `validateRedirect
Url(cancelUrl)` (FIRST per-source-file POST smoke
  pinning an open-redirect-prevention contract);
  three-stage post-auth gate stack 404 → 403 → 400
  (UNIQUE forbidden branch -- no other checkout has
  one); 2×3 `getPriceId(interval, provider)` matrix
  lookup (FIRST per-source-file POST smoke pinning a
  price-matrix lookup); `!session?.user?.id` gate
  (matches lemonsqueezy; distinct from polar +
  solidgate + stripe's `!session?.user`); generic 500
  on outer catch with no detail leak (distinct from
  stripe's three-key envelope and solidgate's
  `safeErrorMessage` extraction); POST-only export
  (distinct from the quartet which all export `GET` +
  `POST`). The smoke spec pins a canonical success-
  false 401-envelope assertion `{ success: false,
error: 'Unauthorized' }`, a strict envelope-shape
  assertion (exactly `success` + `error` keys), a
  success-branch-key non-disclosure assertion, a gate-
  before-post-auth invariant across SEVEN candidate
  static messages, a parameterised-vs-baseline status-
  stability comparison, a side-channel walk, a cross-
  method probe (`GET` joins `PUT`/`PATCH`/`DELETE`
  because the route is POST-only), a malformed-JSON-
  body invariance walk, a sponsorAdId-required-
  validation-not-entered invariance walk, an
  ownership/status/not-found-checks-not-entered
  invariance walk, a provider-switch-dispatch-not-
  entered invariance walk (no `data.checkoutUrl` on
  the unauth branch), a catch-branch-not-entered
  invariance walk, a no-redirect-leak assertion
  pinning XSS-shaped `successUrl` / `cancelUrl` values
  must NEVER be echoed (open-redirect prevention
  contract), and a provider-name non-disclosure
  assertion pinning that `data.provider` and the
  literal strings `'stripe'`/`'lemonsqueezy'`/`'polar'`
  must NEVER appear in the unauth response.

- `docs/plugins` Added `stripe-checkout-body-spec.md` —
  the **sixty-seventh** per-source-file reference the
  docs tree publishes for any file under
  `apps/web-e2e/tests/` and the **sixty-fifth**
  under `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/stripe-checkout-body.spec.ts`
  spec covering the `POST` export of
  `apps/web/app/api/stripe/checkout/route.ts` —
  the **fourth and final per-source-file POST smoke
  for an auth-gated payment-provider checkout
  endpoint**, completing the auth-gated checkout
  quartet (Solidgate + Polar + LemonSqueezy +
  Stripe). Distinct from ALL three siblings:
  three-way mode ternary mapping (`'one_time' →
'payment'`, `'subscription' → 'subscription'`,
  unknown → `'setup'` -- UNIQUE setup fallback);
  trial-amount validation (FIRST per-source-file
  POST smoke pinning trial-config validation);
  helper-function pipeline (`buildCheckoutLineItems` - `createBaseCheckoutParams` +
  `applySubscriptionConfig` from co-located
  `./helpers` -- FIRST per-source-file POST smoke
  pinning a multi-helper assembly pipeline);
  `safeErrorMessage` (NOT `safeErrorResponse`) in
  catch, returns THREE keys (`error`, `message`,
  `details: <dev-only-stack>`); Stripe SDK direct
  call via public `getStripeInstance()` method
  (FIRST per-source-file POST smoke pinning a
  direct-SDK-instance contract via a public method,
  NOT private property `as any` like polar's
  one_time branch); `!session?.user` gate (matches
  polar + solidgate; distinct from lemonsqueezy's
  `!session?.user?.id`). The smoke spec pins a
  canonical two-key 401-envelope assertion, a
  strict envelope-shape assertion, a success-
  branch-key non-disclosure assertion, a gate-
  before-post-auth invariant, a parameterised-vs-
  baseline status-stability comparison, a side-
  channel walk, a cross-method probe, a malformed-
  JSON-body invariance walk, a trial-config-
  validation-not-entered invariance walk, a mode-
  ternary-not-entered invariance walk, a helper-
  pipeline-and-stripe-SDK-not-entered invariance
  walk, a catch-branch-not-entered invariance walk
  pinning that `details` (dev-only stack) must
  NEVER appear on the unauth branch, and a no-
  redirect-leak assertion pinning that XSS-shaped
  `successUrl` / `cancelUrl` values must NEVER be
  echoed — completing the auth-gated checkout
  quartet (Solidgate + Polar + LemonSqueezy +
  Stripe).

- `docs/plugins` Added `lemonsqueezy-checkout-body-spec.md` —
  the **sixty-sixth** per-source-file reference the
  docs tree publishes for any file under
  `apps/web-e2e/tests/` and the **sixty-fourth**
  under `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/lemonsqueezy-checkout-body.spec.ts`
  spec covering the `POST` export of
  `apps/web/app/api/lemonsqueezy/checkout/route.ts`
  — the **third per-source-file POST smoke for an
  auth-gated payment-provider checkout endpoint**
  (after solidgate-checkout-body and polar-checkout-
  body). Distinct from BOTH siblings:
  `!session?.user?.id` gate (NOT `!session?.user`);
  custom validator returning `{ isValid, errors[] }`
  via `validateCheckoutRequestBody(body)` (NOT Zod
  like solidgate; NOT simple `if (!field)` like
  polar); per-call try/catch around
  `request.json()` like solidgate; dev-only PII-
  sanitized `console.log` (FIRST per-source-file
  POST smoke pinning this contract); FOUR-string-
  scan catch with THREE different status codes (400
  / 500 / 503); `ERROR_TYPES` enum-typed error field
  (`VALIDATION_ERROR`, `CONFIGURATION_ERROR`,
  `PAYMENT_SERVICE_ERROR`, `INTERNAL_ERROR`); GET
  export with NO auth gate (Q-010-style finding;
  cross-method probe pins this divergence from
  POST); `success: true` discriminant in success
  payload (distinct from polar + solidgate's literal
  `status: 200`). The smoke spec pins a canonical
  two-key 401-envelope assertion, a strict
  envelope-shape assertion, a success-branch-key
  non-disclosure assertion, a gate-before-post-auth
  invariant, an allowed-pre-delivery-error static-
  string allow-list assertion (5-code set), a
  parameterised-vs-baseline status-stability
  comparison, a side-channel walk, a cross-method
  probe, a JSON-parse-failure-AFTER-auth-gate
  invariance walk, a validation-chain-not-entered
  invariance walk, a createCustomCheckout-not-
  entered invariance walk, and a four-string-scan-
  catch-not-entered invariance walk pinning that
  NONE of the three enum-typed error codes from the
  catch may appear on the unauth branch — the
  **third per-source-file POST smoke for an auth-
  gated payment-provider checkout endpoint**,
  expanding payment-provider checkout coverage from
  two providers to three (Solidgate + Polar +
  LemonSqueezy).

- `docs/plugins` Added `polar-checkout-body-spec.md` —
  the **sixty-fifth** per-source-file reference the
  docs tree publishes for any file under
  `apps/web-e2e/tests/` and the **sixty-third** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/polar-checkout-body.spec.ts`
  spec covering the `POST` export of
  `apps/web/app/api/polar/checkout/route.ts` —
  the **second per-source-file POST smoke for an
  auth-gated payment-provider checkout endpoint**
  (after solidgate-checkout-body). Distinct from
  solidgate-checkout: branching mode dispatch
  (subscription / one_time -- FIRST per-source-file
  POST smoke pinning a mode-dispatched two-branch
  POST contract); NO Zod validation (uses simple
  `if (!productId)` check); NO try/catch around
  `request.json()` (malformed JSON cascades to
  outer catch); 503 error-message detection (outer
  catch scans `error.message` for three payment-
  setup-incomplete strings, downgrades 500 → 503
  with custom message -- FIRST per-source-file POST
  smoke pinning a 503-via-error-message-scan
  contract); private property access via `as any`
  (`one_time` branch reaches into
  `(polarProvider as any).polar` -- FIRST per-
  source-file POST smoke pinning a private-property-
  bypass contract); GET export companion (with
  ONE-key 401 envelope, distinct from POST's TWO-
  key). The smoke spec pins a canonical two-key
  401-envelope assertion, a strict envelope-shape
  assertion, a success-branch-key non-disclosure
  assertion, a gate-before-post-auth invariant, an
  allowed-pre-delivery-error static-string allow-
  list assertion, a parameterised-vs-baseline
  status-stability comparison, a side-channel walk,
  a cross-method probe, a malformed-JSON-body
  invariance walk, a productId-required-check-not-
  entered invariance walk, a mode-dispatch-not-
  entered invariance walk pinning that the unauth
  response must NEVER echo `data.url` or `data.id`,
  a 503-payment-setup-incomplete-not-triggered-on-
  unauth invariance walk, and a no-redirect-leak
  assertion pinning that XSS-shaped
  `successUrl` / `cancelUrl` values must NEVER be
  echoed — the **second per-source-file POST smoke
  for an auth-gated payment-provider checkout
  endpoint**, expanding payment-provider checkout
  coverage from one provider to two (Solidgate +
  Polar).

- `docs/plugins` Added `stripe-webhook-body-spec.md` —
  the **sixty-fourth** per-source-file reference the
  docs tree publishes for any file under
  `apps/web-e2e/tests/` and the **sixty-second**
  under `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/stripe-webhook-body.spec.ts`
  spec covering the `POST` export of
  `apps/web/app/api/stripe/webhook/route.ts` —
  the **fourth and final per-source-file webhook
  POST smoke** the docs tree publishes, completing
  the four-provider webhook quartet (Polar +
  LemonSqueezy + Solidgate + Stripe). The simplest
  of the four handlers: single-header signature
  check via `stripe-signature` (unique header
  name); NO JSON parse (matches lemonsqueezy);
  NO `validateWebhookPayload` check (distinct from
  polar); NO idempotency check (distinct from
  solidgate); NO event-type-string-fallback in the
  switch dispatcher (matches ONLY the
  `WebhookEventType` enum values, including the
  UNIQUE `BILLING_PORTAL_SESSION_UPDATED` Stripe-
  specific case); POST-only export; same 400-default
  catch. The smoke spec pins a first-gate
  signature-header-presence-rejection assertion, a
  strict envelope-shape assertion, a success-
  branch-received-key non-disclosure assertion, a
  catch-branch-defaults-to-400 invariant, an
  allowed-pre-delivery-error static-string allow-
  list assertion (3-message set), a sibling-
  provider-headers-ignored assertion pinning that
  polar / lemonsqueezy / solidgate signature
  headers do NOT satisfy the Stripe gate, a side-
  channel walk, a cross-method probe, a signature-
  verification-call-gated-by-header-check
  invariant, and a switch-statement-dispatcher-
  gated-by-signature-verification invariant pinning
  that invalid signatures must NEVER trigger any of
  the 9 event handlers including the Stripe-unique
  `BILLING_PORTAL_SESSION_UPDATED` case — the
  **fourth and final per-source-file webhook POST
  smoke** the docs tree publishes, completing the
  four-provider webhook quartet.

- `docs/plugins` Added `solidgate-checkout-body-spec.md` —
  the **sixty-third** per-source-file reference the
  docs tree publishes for any file under
  `apps/web-e2e/tests/` and the **sixty-first** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/solidgate-checkout-body.spec.ts`
  spec covering the `POST` export of
  `apps/web/app/api/solidgate/checkout/route.ts` —
  the **first per-source-file POST smoke for an
  auth-gated payment-provider checkout endpoint**
  the docs tree publishes. The existing multi-
  provider `payment-checkouts.spec.ts` covers
  Stripe / LemonSqueezy / Polar / Solidgate
  checkout endpoints with a single `< 500`
  assertion each; this spec drills into the
  Solidgate handler specifically. Distinct from the
  closest analogue (`polar-subscription-portal-body
-spec.md`) in five ways: (a) **TWO-key 401
  envelope** -- Solidgate returns `{ error:
'Unauthorized', message: 'Authentication
required' }` (TWO keys); polar-portal returns
  `{ error: 'Unauthorized' }` (ONE key) -- UNIQUE;
  (b) **Zod `safeParse` AFTER the auth gate** --
  the `checkoutSchema.safeParse(json)` and the
  surrounding `try/catch` around `request.json()`
  fire only AFTER `auth()`; (c) **FIVE-key success
  envelope** -- success returns `{ data: { id, url
}, status, message }` with a literal `status: 200`
  field embedded in the body, separate from the HTTP
  status -- UNIQUE; (d) **500 catch (NOT 400)** --
  outer catch returns 500 with `{ error, message,
details }` (dev-only stack); polar-webhook uses
  `safeErrorResponse(..., 400)` -- UNIQUE; (e) **POST
  -only export** -- GET / PUT / PATCH / DELETE are
  NOT exported; method-resolution returns 405. The
  spec pins a canonical two-key 401-envelope
  assertion, a strict envelope-shape invariance walk
  pinning `Object.keys(body).sort() === ['error',
'message']`, a no-Zod-issue-leak invariance walk
  pinning that schema details (`amount`,
  `successUrl`, `cancelUrl`, `mode`, `'Invalid
request body'`, `'Invalid JSON'`) must NEVER
  appear in the unauth response, a no-success-key-
  leak invariance walk pinning that `data` / `id` /
  `url` / literal `status: 200` must NEVER appear, a
  no-redirect-leak assertion pinning that caller-
  supplied `successUrl` / `cancelUrl` values must
  NEVER be echoed, a malformed-JSON-pre-gate-non-
  downgrade assertion, a catch-branch-non-entry walk
  pinning that the unauth branch must NEVER reach
  the 500 outer catch, a 1-message static-string
  allow-list assertion (only `'Unauthorized'` is
  reachable), a side-channel walk, a cross-method
  probe (GET / PUT / PATCH / DELETE), and a 401-
  status-invariance walk pinning that every
  documented bypass-key shape rounds-trips to the
  same 401 as the empty-body baseline — the **first
  per-source-file POST smoke for an auth-gated
  payment-provider checkout endpoint** the docs
  tree publishes, expanding the rollout's payment-
  provider checkout coverage from a single `< 500`
  smoke to a deep body-surface walk on the
  Solidgate handler.

- `docs/plugins` Added `solidgate-webhook-body-spec.md` —
  the **sixty-second** per-source-file reference the
  docs tree publishes for any file under
  `apps/web-e2e/tests/` and the **sixtieth** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/solidgate-webhook-body.spec.ts`
  spec covering the `POST` export of
  `apps/web/app/api/solidgate/webhook/route.ts` —
  the **third per-source-file webhook POST smoke**
  (after polar + lemonsqueezy). Distinct from BOTH:
  two-header signature fallback (`x-signature ||
solidgate-signature` -- UNIQUE to Solidgate);
  manual JSON parse like polar but NO
  `validateWebhookPayload` check; in-memory
  idempotency Set with 24-hour TTL (FIRST webhook
  smoke pinning an idempotency contract; duplicates
  return 200 `{ received: true }` -- FIRST webhook
  smoke with TWO 200-success branches); switch
  dispatcher accepting BOTH enum AND string values
  for 9 event types; GET export with informative
  message (UNIQUE: polar and lemonsqueezy export
  only POST); same 400-default catch. The smoke
  spec pins a first-gate two-header-fallback
  rejection assertion, a fallback-header-acceptance
  assertion, a strict envelope-shape assertion, a
  success-branch-received-key non-disclosure
  assertion, a catch-branch-defaults-to-400
  invariant, an allowed-pre-delivery-error static-
  string allow-list assertion, a polar-shape-
  headers-ignored assertion, a side-channel walk, a
  GET-200-with-informative-message assertion, a
  cross-method probe, a signature-verification-
  call-gated-by-header-check invariant, and a
  switch-statement-dispatcher-gated-by-signature-
  verification invariant — the **third per-
  source-file webhook POST smoke** the docs tree
  publishes, expanding payment-provider webhook
  coverage from two providers to three (Polar +
  LemonSqueezy + Solidgate).

- `docs/plugins` Added `item-comments-rating-query-spec.md`
  — the **sixty-first** per-source-file reference
  the docs tree publishes for any file under
  `apps/web-e2e/tests/` and the **fifty-ninth**
  under `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/item-comments-rating-query.spec.ts`
  spec covering the `GET` export of
  `apps/web/app/api/items/[slug]/comments/rating/route.ts`
  — the **first per-source-file query smoke** for a
  public item-detail endpoint that uses
  **`checkDatabaseAvailability()` as a _graceful-
  fallback_ gate** (NOT as a 503-returning gate like
  the sibling `item-comments-create-body` POST). When
  `process.env.DATABASE_URL` is missing OR the tenant
  resolution returns null OR the Drizzle aggregate
  query throws, the handler returns the SAME success-
  shaped envelope `{ averageRating: 0,
totalRatings: 0 }` with status 200 — NEVER a 4xx or
  5xx. It is also the **first per-source-file query
  smoke** that pins a **two-key envelope shape**
  (`{ averageRating, totalRatings }`) with NO
  `success` discriminant key — distinct from every
  prior per-source-file query spec which uses either
  the canonical `{ success: true, data: ... }`
  envelope OR the bare `{ error }` envelope. The GET
  handler is a zero-`request`-read signature: it only
  awaits `params`, calls `checkDatabaseAvailability()`,
  `getItemIdFromSlug(slug)`, `getTenantId()`, and a
  single Drizzle `select({ avg, count })` aggregate.
  The spec emits a ~57-path bulk-loop walk asserting
  `< 500` plus eleven hand-written scenarios: a
  canonical-envelope 200 zero-rating assertion, a
  strict envelope-shape assertion (no `success` /
  `data` / `error` keys), a Number-cast invariant
  pinning that `averageRating` and `totalRatings` are
  both `number` (NOT raw Drizzle `avg(...)` strings),
  a graceful-degrade non-disclosure walk pinning that
  the response must NEVER echo `error` or `success`
  keys, a parameterised-vs-baseline status-stability
  comparison across five paths, an envelope-shape
  invariance walk pinning that all five parameterised
  paths return the same `{ averageRating: 0,
totalRatings: 0 }` envelope, an `Accept` header
  isolation walk, a side-channel walk, a cross-method
  probe (POST / PUT / PATCH / DELETE), and a
  graceful-degrade catch-branch invariance walk
  pinning that no error path surfaces a 5xx.

- `docs/plugins` Added `lemonsqueezy-webhook-body-spec.md` —
  the **sixtieth** per-source-file reference the
  docs tree publishes for any file under
  `apps/web-e2e/tests/` and the **fifty-eighth**
  under `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/lemonsqueezy-webhook-body.spec.ts`
  spec covering the `POST` export of
  `apps/web/app/api/lemonsqueezy/webhook/route.ts`
  — the **second per-source-file webhook POST
  smoke** the docs tree publishes (after
  `polar-webhook-body-spec.md`). Distinct from the
  polar sibling: different signature header
  (`x-signature` -- lowercase, single field, vs
  polar's `webhook-signature` + `webhook-timestamp` - `webhook-id`); NO manual JSON parse (the
  handler reads the raw body via `await
request.text()` and passes it as a STRING to
  `lemonSqueezyProvider.handleWebhook(body,
signature)`); simpler 2-tier rejection chain
  (only `'No signature provided'` and `'Webhook
not processed'` -- vs polar's 4-tier chain);
  switch-statement event dispatcher (8 mapped
  handlers + default `console.log`); same
  400-default catch as polar but via raw
  `NextResponse.json` call (NOT
  `safeErrorResponse(...)`). The smoke spec pins
  a first-gate signature-header-presence-
  rejection assertion `{ error: 'No signature
provided' }`, a strict envelope-shape assertion
  across all rejection branches, a success-
  branch-received-key non-disclosure assertion,
  a catch-branch-defaults-to-400 invariant
  pinning that NO unhandled error escapes as 5xx,
  an allowed-pre-delivery-error static-string
  allow-list assertion (3-message set), a
  polar-shape-headers-ignored assertion pinning
  that polar's `webhook-signature` does NOT
  satisfy LemonSqueezy's `x-signature` gate, a
  side-channel walk, a cross-method probe, a
  signature-verification-call-gated-by-header-
  check invariant, and a switch-statement-
  dispatcher-gated-by-signature-verification
  invariant pinning that invalid signatures must
  NEVER trigger any of the 8 event handlers —
  the **second per-source-file webhook POST
  smoke** the docs tree publishes, expanding
  payment-provider webhook coverage from one
  provider (Polar) to two (LemonSqueezy +
  Polar).

- `docs/plugins` Added `item-votes-status-query-spec.md` —
  the **fifty-ninth** per-source-file reference the
  docs tree publishes for any file under
  `apps/web-e2e/tests/` and the **fifty-seventh**
  under `apps/web-e2e/tests/api/`, and the **tenth**
  per-source-file query-spec the docs tree publishes
  (the **first nine** are all admin-tree). Pairs with
  a new
  `apps/web-e2e/tests/api/item-votes-status-query.spec.ts`
  spec covering the `GET` export of
  `apps/web/app/api/items/[slug]/votes/status/route.ts`
  — the **first non-admin per-source-file query smoke**
  for an **auth-gated** GET that returns the current
  user's vote record (or `null`) for a specific item
  (distinct from the public `/api/items/[slug]/votes`
  GET that `item-votes-query.spec.ts` covers and from
  the public count-only sibling
  `item-vote-count-query.spec.ts`). It is also the
  **first per-source-file query smoke** that pairs the
  **`'Authentication required'`** 401 message
  (matching the sibling `item-comments-create-body`
  POST) with the **bare `{ error }` envelope** (no
  `success: false` wrapper) — distinct from the
  canonical `{ success: false, error: 'Unauthorized' }`
  envelope used by the sibling `item-votes-cast-body`
  POST. The GET handler is a zero-`request`-read
  signature: it awaits `auth()` first, then
  `context.params`, then calls
  `getClientProfileByUserId(...)` and
  `getVoteByUserIdAndItemId(...)`. There is NO
  `request.url`, `request.headers`, or
  `searchParams.get(...)` access anywhere — the
  route is invariant to **any** query-string the
  caller appends. The spec emits a ~57-path bulk-loop
  walk asserting `< 500` plus eleven hand-written
  scenarios: a canonical-envelope 401 assertion
  pinning `{ error: 'Authentication required' }`, a
  strict envelope-shape assertion (`Object.keys(body)
=== ['error']`, no `success` key), a gate-before-
  post-auth invariance walk pinning none of the three
  candidate post-auth static messages may surface, a
  vote-record non-disclosure walk pinning that none
  of the six record keys (`id`, `userId`, `itemId`,
  `voteType`, `createdAt`, `updatedAt`) may surface,
  a null-payload non-disclosure pinning that the
  unauth response is NOT the literal `null` payload,
  a parameterised-vs-baseline status-stability
  comparison across five paths, an `Accept` header
  isolation walk, a side-channel walk (fabricated
  session-token cookies + `X-Forwarded-For` /
  `X-Real-IP` / `Authorization` / `X-User-Id`
  headers), a cross-method probe (POST / PUT / PATCH
  / DELETE), a client-profile-lookup-not-entered
  invariance walk, and a vote-record-read-not-entered
  invariance walk — the **first auth-gated non-admin
  per-source-file query smoke** the docs tree
  publishes that pins a `null`-or-record success
  payload contract.

- `docs/plugins` Added `item-comments-create-body-spec.md` —
  the **fifty-eighth** per-source-file reference the
  docs tree publishes for any file under
  `apps/web-e2e/tests/` and the **fifty-sixth** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/item-comments-create-body.spec.ts`
  spec covering the `POST` export of
  `apps/web/app/api/items/[slug]/comments/route.ts` —
  the **first non-admin per-source-file POST smoke**
  that uses **`checkDatabaseAvailability()`** from
  `apps/web/lib/utils/database-check.ts` as the
  **load-bearing FIRST gate** (BEFORE `auth()`) --
  when `DATABASE_URL` is missing, the helper returns
  a **503** `{ error: 'Database not configured',
code: 'DATABASE_UNAVAILABLE', message: '...' }`
  envelope (first POST smoke pinning this helper-
  emitted shape with a 503 status), the **first**
  non-admin POST smoke that uses the
  **`'Authentication required'`** 401 message
  (distinct from `'Unauthorized'` used by the
  sibling votes-cast POST), and the **second**
  non-admin POST smoke that pins the
  **`isUserBlocked(clientProfile.status)`
  moderation-status gate**. In the e2e test
  environment `DATABASE_URL` IS configured so the
  db-availability gate passes through and the auth
  gate fires for unauthenticated requests. The POST
  handler combines a `checkDatabaseAvailability()`
  gate (load-bearing FIRST gate), `auth()` lookup, a
  `!session?.user` gate (→ 401 `'Authentication
required'`), JSON body parse, content validation
  (`!content?.trim()` → 400 `'Content is required'`),
  rating range validation (`typeof rating !==
'number' || rating < 1 || rating > 5` → 400
  `'Rating must be between 1 and 5'`),
  `getClientProfileByUserId(...)` lookup (not found
  → 404 `'Client profile not found'`), the
  `isUserBlocked(...)` moderation-status gate (if
  true → 403 with dynamic block-reason message), the
  load-bearing `createComment(...)` write, a
  `getCommentWithUserById(comment.id)` post-write
  lookup (if null → 500 `'Failed to retrieve
comment'` -- the first POST smoke pinning a post-
  write null-check 500 envelope), success payload
  `{ success: true, comment }` with status 200, and
  outer catch 500 `'Failed to create comment'`. The
  smoke spec pins a canonical-envelope
  authentication-required 401 assertion, a strict
  envelope-shape assertion, a success-branch-key
  non-disclosure assertion, a gate-before-post-auth
  invariant, an allowed-pre-delivery-error static-
  string allow-list assertion that includes
  `'Database not configured'` for the 503 branch, a
  parameterised-vs-baseline status-stability
  comparison, a side-channel walk, a cross-method
  probe, a malformed-JSON-body invariance walk, a
  content-and-rating-validation-chain-not-entered
  invariance walk, a client-profile-lookup-and-
  moderation-gate-not-entered invariance walk
  pinning that the unauth response is 401 (NOT 403),
  and a createComment-and-post-write-lookup-not-
  entered invariance walk — the **first
  checkDatabaseAvailability-helper-gated POST
  smoke** the docs tree publishes.

- `docs/plugins` Added `item-votes-cast-body-spec.md` —
  the **fifty-seventh** per-source-file reference the
  docs tree publishes for any file under
  `apps/web-e2e/tests/` and the **fifty-fifth** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/item-votes-cast-body.spec.ts`
  spec covering the `POST` export of
  `apps/web/app/api/items/[slug]/votes/route.ts` —
  the **first non-admin per-source-file POST smoke**
  that pins a **moderation-status gate**: after the
  auth + body-validation + client-profile gates, the
  handler runs `isUserBlocked(clientProfile.status)`
  from `apps/web/lib/db/queries/moderation.queries.ts`
  and returns 403 with a **dynamic message** from
  `getBlockReasonMessage(clientProfile.status)` if
  the client is suspended or banned -- no prior POST
  smoke covers a moderation-status gate of this
  shape. The companion public GET smoke is
  `item-votes-public.spec.ts` (zero-vote fallback for
  unknown slugs); the mutating POST and DELETE
  surfaces have only generic `< 500` coverage in
  `items-engagement-and-favorites.spec.ts`, so this
  spec drills into the POST surface specifically.
  The POST handler combines `auth()` + slug param
  resolution, a `!session?.user?.id` gate (→ 401
  `{ success: false, error: 'Unauthorized' }`), JSON
  body parse, vote-type enum validation, `getClient
ProfileByUserId(...)` lookup (not found → 404
  `'Client profile not found'`), the
  `isUserBlocked(...)` moderation-status gate (if
  true → 403 with the dynamic `getBlockReasonMessage`
  message), existing-votes lookup + replace logic,
  the load-bearing `createVote({ userId, itemId,
voteType })` write, `getVoteCountForItem(slug)`,
  success payload `{ success: true, count, userVote:
type }` with status 200, and outer catch
  `console.error` + 500 `'Internal server error'`.
  The smoke spec pins a canonical-envelope bare-
  message 401 assertion, a strict envelope-shape
  assertion, a success-branch-key non-disclosure
  assertion, a gate-before-post-auth invariant, an
  allowed-pre-delivery-error static-string allow-
  list assertion, a parameterised-vs-baseline status-
  stability comparison, a side-channel walk, a
  cross-method probe walking only PUT and PATCH, a
  malformed-JSON-body invariance walk, a vote-type-
  validation-not-entered invariance walk, a client-
  profile-lookup-and-moderation-gate-not-entered
  invariance walk pinning that the unauth response is
  401 (NOT 403), and a createVote-and-
  getVoteCountForItem-not-entered invariance walk —
  the **first moderation-status-gated POST smoke**
  the docs tree publishes that pins the load-bearing
  moderation invariant on a public, auth-gated vote-
  casting endpoint.

- `docs/plugins` Added `polar-webhook-body-spec.md` —
  the **fifty-sixth** per-source-file reference the
  docs tree publishes for any file under
  `apps/web-e2e/tests/` and the **fifty-fourth**
  under `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/polar-webhook-body.spec.ts`
  spec covering the `POST` export of
  `apps/web/app/api/polar/webhook/route.ts` —
  the **first per-source-file webhook POST smoke**
  the docs tree publishes (the existing multi-
  provider `webhooks.spec.ts` covers Stripe /
  LemonSqueezy / Polar / Solidgate with two
  assertions each -- GET-not-5xx and POST-
  unauthenticated-rejected; this spec drills into
  the Polar webhook handler specifically), the
  **first POST smoke** that uses **`await
request.text()` (raw body)** instead of `await
request.json()` (because Polar calculates
  signatures on the raw body, not the parsed JSON;
  the handler manually parses the raw text via
  `JSON.parse(bodyText)` inside a try/catch), and
  the **first POST smoke** that uses
  **`safeErrorResponse(..., 400)`** in the outer
  catch (defaulting to **400 NOT 500** for unhandled
  webhook errors -- preventing a 5xx crash on
  signature/parsing errors that would otherwise
  trip Polar's webhook-retry logic). The POST
  handler combines a raw-body read, a manual JSON
  parse (failure → 400 `'Invalid JSON payload'`),
  a `validateWebhookPayload(body)` structure check
  (failure → 400 `'Invalid webhook payload'`), a
  `webhook-signature` header presence check
  (missing → 400 `'No signature provided'`), the
  load-bearing `polarProvider.handleWebhook(...)`
  signature-verification call, a `!webhookResult.
received` check (400 `'Webhook not processed'`),
  the load-bearing `routeWebhookEvent(...)` event-
  routing call on the success branch, success
  payload `{ received: true }` with status 200,
  and outer catch `safeErrorResponse(error,
'Webhook processing failed', 400)`. The smoke
  spec pins a first-gate JSON-parse-rejection
  assertion, a second-gate validate-payload-
  rejection assertion, a third-gate signature-
  header-presence-rejection assertion, a strict
  envelope-shape assertion across all three pre-
  delivery branches, a success-branch-received-
  key non-disclosure assertion, a catch-branch-
  defaults-to-400 invariant pinning that NO
  unhandled error escapes as 5xx, an allowed-pre-
  delivery-error static-string allow-list assertion,
  a side-channel walk, a cross-method probe, and a
  signature-verification-call-gated-by-header-
  check invariant pinning that a valid payload
  without the `webhook-signature` header must
  produce `'No signature provided'`, not a 200
  `{ received: true }` — the **first per-source-
  file webhook POST smoke** the docs tree
  publishes, expanding the rollout into the
  payment-provider webhook layer for the first
  time.

- `docs/plugins` Added `item-views-record-body-spec.md` —
  the **fifty-fifth** per-source-file reference the
  docs tree publishes for any file under
  `apps/web-e2e/tests/` and the **fifty-third** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/item-views-record-body.spec.ts`
  spec covering the `POST` export of
  `apps/web/app/api/items/[slug]/views/route.ts` —
  the **first non-admin POST smoke** the docs tree
  publishes that pins a **bot-detection
  graceful-degradation branch** AS the load-bearing
  test invariant: the route imports `isBot()` from
  `apps/web/lib/utils/bot-detection.ts` whose
  `BOT_PATTERNS` regex array contains `/bot/i`,
  `/crawl/i`, `/spider/i`, `/playwright/i`,
  `/puppeteer/i`, `/headless/i`, `/curl/i`,
  `/python-requests/i`, `/axios/i`, `/node-fetch/i`
  AND treats an empty UA as a bot. The smoke spec
  EXPLICITLY sets a known-bot User-Agent
  (`Googlebot/2.1`) on the deterministic-assertion
  tests so the bot gate fires regardless of the
  Playwright runtime's default UA, BEFORE the route
  ever calls `itemRepository.findBySlug(...)`, the
  `auth()` owner check, the `cookies()` viewer-id
  read, OR the `recordItemView(...)` write — making
  the canonical envelope `{ success: true, counted:
false, reason: 'bot' }` (status 200) the
  load-bearing invariant for the spec. It is also
  the **first POST smoke** the docs tree publishes
  that pins a **synthetic-User-Agent override
  branch** — the same endpoint, called with a
  non-bot Chrome UA against an intentionally
  non-existent slug, progresses past the bot gate,
  reaches `itemRepository.findBySlug(slug)`, and
  lands on the `if (!item) return 404 { success:
false, error: 'Item not found' }` branch. The two
  branches together pin the gate-before-find order
  as a load-bearing invariant: a regression that
  re-orders the `findBySlug(...)` call before the
  bot gate would surface here as a `data`-key
  disclosure on the bot branch OR as a status-code
  change. The smoke spec pins a canonical bot
  envelope assertion `{ success: true, counted:
false, reason: 'bot' }`, a strict envelope-shape
  assertion (`Object.keys(body).sort() ===
['counted', 'reason', 'success']`), a
  post-bot-gate-key non-disclosure assertion that
  NONE of `error`, `data`, `code` keys must appear
  in any bot response, a gate-before-post-bot
  invariant pinning that NONE of the three candidate
  static messages (`'Item not found'`, `'Failed to
record view'`, `'Database not configured'`) must
  appear in any bot response, a parameterised-vs-
  baseline status-stability comparison, a
  side-channel walk, a cross-method probe, a
  malformed-JSON-body invariance walk pinning the
  gate-before-body-read order, an
  item-not-found-not-entered invariance walk pinning
  the gate-before-find order, a database-unavailable-
  not-entered invariance walk pinning the post-
  DATABASE_URL-configuration invariant, a
  non-bot-UA-override-progresses-to-404 assertion
  pinning the gate-before-find order from the
  non-bot side, a bot-branch-non-disclosure-on-the-
  non-bot-branch assertion, and an owner-exclusion-
  not-entered invariance walk pinning that
  anonymous requests can NEVER receive `reason:
'owner'` regardless of UA OR `submitted_by`
  body-field bypass attempts — the **first
  bot-detection-graceful-degradation POST smoke**
  the docs tree publishes that pins the bot gate as
  the load-bearing invariant on a public,
  non-auth-gated endpoint.

- `docs/plugins` Added `extract-body-spec.md` —
  the **fifty-fourth** per-source-file reference the
  docs tree publishes for any file under
  `apps/web-e2e/tests/` and the **fifty-second**
  under `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/extract-body.spec.ts`
  spec covering the `POST` export of
  `apps/web/app/api/extract/route.ts` — the
  **first non-admin-tree per-source-file
  reference** the docs tree publishes (every prior
  per-source-file e2e reference covers an
  `apps/web/app/api/admin/**` route; this spec
  covers the extraction-proxy at
  `apps/web/app/api/extract/route.ts` -- a non-
  admin proxy that forwards to the Ever Works
  Platform API), the **first non-admin-gated POST
  smoke** that pins a **"feature disabled"
  graceful-degradation branch** (when
  `process.env.PLATFORM_API_URL` is missing, the
  handler returns a 200 -- NOT 401, NOT 503 --
  with the envelope `{ success: false,
featureDisabled: true, message: 'URL extraction
feature is not available. This feature requires
PLATFORM_API_URL to be configured.' }` -- no
  prior smoke spec covers a `featureDisabled:
true` envelope shape), and the **first POST
  smoke** that uses **Zod `safeParse` + `result.
error.issues[0].message`** (NOT `flatten()`
  like admin/items/import) to surface the FIRST
  validation issue as the 400 envelope's `error`
  field. In the e2e test environment
  `PLATFORM_API_URL` is NOT configured, so EVERY
  POST request lands on the feature-disabled
  branch -- making the spec a pinning of the
  feature-disabled envelope as the load-bearing
  invariant. The smoke spec pins a 200-with-
  feature-disabled-envelope assertion, a strict
  envelope-shape assertion, a no-`error`-key
  assertion on the feature-disabled branch, a
  feature-disabled-before-post-feature-disabled
  invariant, a parameterised-vs-baseline status-
  stability comparison, a side-channel walk, a
  cross-method probe (POST is the only exported
  method, so all four other HTTP verbs are
  probed), a malformed-JSON-body invariance walk,
  a Zod-validation-chain-not-entered invariance
  walk pinning that the response must NEVER echo
  `'Invalid URL format'`, and an external-fetch-
  proxy-not-entered invariance walk pinning that
  the response must always include
  `featureDisabled: true` in the test environment
  — the **first non-admin-tree per-source-file
  reference** the docs tree publishes,
  expanding the rollout beyond the `admin/**`
  route family for the first time.

- `docs/plugins` Added `admin-location-index-manage-body-spec.md` —
  the **fifty-third** per-source-file reference the
  docs tree publishes for any file under
  `apps/web-e2e/tests/` and the **fifty-first** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/admin-location-index-manage-body.spec.ts`
  spec covering the `POST` export of
  `apps/web/app/api/admin/location-index/route.ts` —
  the **first POST smoke** the docs tree publishes
  that uses the **`checkAdminAuth()` helper** from
  `@/lib/auth/admin-guard.ts` (the GET-sibling
  `admin-location-index-query.spec.ts` already covers
  the helper for the query endpoint; this is the
  first POST smoke that does the same), and the
  **first action-enum-dispatched POST smoke** that
  branches on a `body.action === 'rebuild' | 'clear'`
  enum into TWO distinct destructive operations:
  `'rebuild'` calls `itemRepository.findAll()` +
  `service.rebuildIndex(items)` -- the heaviest
  service call across the entire admin tree
  (re-indexes EVERY item with location data);
  `'clear'` calls `clearLocationIndex()` -- a
  destructive table-wipe that drops every row from
  the location_index table. For an unauthenticated
  request the FIRST branch of the helper fires
  returning 401 `{ success: false, error:
'Unauthorized' }` (canonical envelope with
  `success: false` AND short `'Unauthorized'`
  message). The smoke spec pins a canonical-envelope
  bare-message 401 assertion, a strict envelope-
  shape assertion, a success-branch-key non-
  disclosure assertion that NONE of `data` or
  `cleared` keys must appear in any unauth response
  and `success` must be `false`, a gate-before-post-
  auth invariant pinning that NONE of the four
  candidate static messages must appear in any
  unauth response, a parameterised-vs-baseline
  status-stability comparison, a side-channel walk,
  a cross-method probe, a malformed-JSON-body
  invariance walk, an action-enum-dispatch-not-
  entered invariance walk, and a rebuild-and-clear-
  destructive-paths-not-entered invariance walk
  pinning that the unauth response must NEVER echo
  a `data` key from the rebuild result or the
  `cleared` count from the destructive table-wipe —
  the **first destructive-action-enum-dispatch POST
  admin-tree smoke** the docs tree publishes.

- `docs/plugins` Added `admin-navigation-update-method-spec.md` —
  the **fifty-second** per-source-file reference the
  docs tree publishes for any file under
  `apps/web-e2e/tests/` and the **fiftieth** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/admin-navigation-update-method.spec.ts`
  spec covering the `PATCH` export of
  `apps/web/app/api/admin/navigation/route.ts` —
  the **second admin-tree smoke** the docs tree
  publishes that uses `getCachedApiSession(req)`
  instead of `auth()` (after `admin/settings`
  PATCH), and the **first PATCH-only admin-tree
  smoke** that pins a **per-item path-format XSS-
  prevention validation loop** via
  `isValidNavigationPath(item.path)`. The PATCH
  handler combines a single-step
  `!session?.user?.isAdmin` gate that returns 401
  `{ error: 'Unauthorized' }` (bare envelope, no
  `success` key, short message), a JSON body
  parse, a `type` enum check (`'header' |
'footer'`), an `items` array check, a per-item
  structure validation loop (label / path
  required), a per-item path-format XSS-prevention
  validation, then `configManager.updateNestedKey
('custom_header'|'custom_footer', items)` for
  the load-bearing works.yml write. Returns
  `{ success: true, type, items }` on success
  (echoing both `type` and `items` from the
  input). The smoke spec pins a bare 401-envelope
  assertion, a strict envelope-shape assertion, a
  success-branch-key non-disclosure assertion, a
  gate-before-post-auth invariant pinning that
  NONE of the five candidate static messages must
  appear in any unauth response, a parameterised-
  vs-baseline status-stability comparison, a side-
  channel walk, a cross-method probe (POST / PUT
  / DELETE), a malformed-JSON-body invariance
  walk, a type-enum-and-items-array-validation-
  not-entered invariance walk, a per-item-XSS-
  prevention-loop-not-entered invariance walk
  pinning that the unauth response must NEVER
  echo `'Invalid path format.'`, and a
  configManager-update-not-entered invariance
  walk pinning that the unauth response must
  NEVER echo a `type` or `items` key from the
  input — the **first per-item-XSS-prevention
  navigation-update PATCH admin-tree smoke** the
  docs tree publishes.

- `docs/plugins` Added `admin-twenty-crm-config-save-body-spec.md` —
  the **fifty-first** per-source-file reference the docs
  tree publishes for any file under
  `apps/web-e2e/tests/` and the **forty-ninth** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/admin-twenty-crm-config-save-body.spec.ts`
  spec covering the `POST` export of
  `apps/web/app/api/admin/twenty-crm/config/route.ts`
  — the **first admin-tree POST smoke** the docs
  tree publishes that combines the compound single-
  `if` gate (`!session?.user?.isAdmin ||
!session.user.id`), a Zod-`safeParse`-like
  validation via `validateTwentyCrmConfig(body)` that
  returns a custom `{ success, data | error }` shape
  and is translated to a `details: [{field, message}]`
  400 envelope, AND a `logActivity(...)` side-effect
  that captures `request.headers.get('x-forwarded-
for')` for the audit log — the first POST smoke
  that reads a request header for an audit side-
  effect. Returns `{ success: true, message:
'Configuration saved successfully', data:
<savedConfig> }` on success. The companion
  `admin-twenty-crm-config-query.spec.ts` covers the
  GET surface of the same route. The smoke spec pins
  a canonical-longer 401-envelope assertion, a
  strict envelope-shape assertion, a success-branch-
  key non-disclosure assertion, a gate-before-post-
  auth invariant, a parameterised-vs-baseline status-
  stability comparison, a side-channel walk, a
  cross-method probe, a malformed-JSON-body
  invariance walk, a validation-chain-not-entered
  invariance walk, and a configRepository-saveConfig-
  and-logActivity-not-entered invariance walk
  pinning that the unauth response must NEVER echo
  `'Configuration saved successfully'` or a `data`
  key from the saved config — the **first audit-
  logged CRM-config-save POST admin-tree smoke** the
  docs tree publishes.

- `docs/plugins` Added `admin-categories-git-query-spec.md` —
  the **fiftieth** per-source-file reference the docs
  tree publishes for any file under
  `apps/web-e2e/tests/` and the **forty-eighth** under
  `apps/web-e2e/tests/api/`. Pairs with the existing
  `apps/web-e2e/tests/api/admin-categories-git-query.spec.ts`
  spec covering the `GET` export of
  `apps/web/app/api/admin/categories/git/route.ts` —
  the **GET-companion** of the recently-landed
  `admin-categories-git-create-body-spec.md` (POST).
  Where the POST handler commits a new category file
  to the configured `DATA_REPOSITORY` GitHub
  repository, the GET handler reads Git repository
  status and categories via the GitHub API. The route
  combines a unique combination of FOUR distinct
  contracts: (1) a **zero-argument `GET()` handler
  signature** that does not take a `NextRequest`
  argument and reads no `searchParams` at all (same
  posture as the notifications route), (2) a **bare
  `{ error: 'Unauthorized. Admin access required.' }`
  envelope** without the `success` discriminant key —
  the ONLY admin-tree GET route that combines the
  bare-envelope shape with the canonical longer
  role-context-specific message, (3) a
  **GitHub-API-backed service** via
  `createCategoryGitService(gitConfig)` that makes
  live HTTPS calls to the GitHub API using the
  configured `GITHUB_TOKEN` / `DATA_REPOSITORY`
  environment variables — distinct from every other
  admin-tree route's drizzle / DB posture and from
  the file-system Git-CMS reader of the
  `categories/all` and `tags/all` routes, and (4)
  three distinct configuration-error 500 envelopes
  after the gate (canonical envelope, NOT bare —
  a deliberate inconsistency between the unauth and
  post-auth configuration-error branches). The
  spec walks one bulk loop (~50 query permutations)
  and eleven hand-written scenarios pinning the bare
  401 envelope, status invariance across query
  permutations, per-key isolation walks for
  `?userId=` / `?token=` / `?bypass=` /
  `?repo=&branch=&owner=` / `?path=` key families,
  side-channel isolation for `Accept` / cookie / IP
  headers, and gate-before-config-validation /
  gate-before-Git-service invariants — the **first
  GitHub-API-backed admin-tree GET smoke** the docs
  tree publishes.

- `docs/plugins` Added `admin-tags-all-query-spec.md` —
  the **forty-ninth** per-source-file reference the docs
  tree publishes for any file under
  `apps/web-e2e/tests/` and the **forty-seventh** under
  `apps/web-e2e/tests/api/`. Pairs with the existing
  `apps/web-e2e/tests/api/admin-tags-all-query.spec.ts`
  spec covering the `GET` export of
  `apps/web/app/api/admin/tags/all/route.ts` — the
  **second Git-CMS-backed admin-tree query smoke** the
  docs tree references (the first was the sibling
  `admin-categories-all-query.spec.ts` covered
  indirectly via the `client-trash-page-object.md`
  co-tenant cross-link). The route reads from the
  per-locale tag list stored in the Git-based content
  repository (cloned from `DATA_REPOSITORY` into
  `.content/`) via `getCachedItems({ lang })` —
  distinct from every other admin-tree route's drizzle
  / Postgres posture EXCEPT the sibling categories-all
  route. The handler combines `auth()` session lookup,
  a single-step `!session?.user?.isAdmin` gate
  returning 401 `{ success: false, error: 'Unauthorized' }`
  (canonical envelope, bare message), a `?locale=` query
  param read AFTER the gate with `searchParams.get('locale') || 'en'`
  default coercion, a **dead-branch `typeof locale !== 'string'`
  defensive narrowing** that emits 400
  `{ success: false, error: 'Invalid locale parameter' }`
  but can never fire today (because
  `searchParams.get(name)` always returns
  `string | null` and the `|| 'en'` default coerces
  null to a string before the typeof check), then
  `getCachedItems({ lang: locale })`, success payload
  `{ success: true, data: tags }` with status 200, and
  outer catch `console.error` + 500
  `'Failed to fetch tags'`. The spec walks one bulk
  loop (~50 query permutations) and eight hand-written
  scenarios pinning the bare 401 envelope, status
  invariance across query permutations, per-key
  isolation walks for `?locale=` / `?userId=` /
  `?token=` / `?bypass=` / `?repo=&branch=&commit=`
  key families, and gate-before-locale-narrowing /
  gate-before-Git-CMS-read invariants — the **first
  dead-branch type-narrowing Git-CMS query smoke** the
  docs tree publishes.

- `docs/plugins` Added `admin-settings-update-method-spec.md` —
  the **forty-eighth** per-source-file reference the docs
  tree publishes for any file under
  `apps/web-e2e/tests/` and the **forty-sixth** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/admin-settings-update-method.spec.ts`
  spec covering the `PATCH` export of
  `apps/web/app/api/admin/settings/route.ts` — the
  **first PATCH-only collection-level config-write
  admin-tree smoke** the docs tree publishes. It is
  also the **first** admin-tree smoke that uses
  `getCachedApiSession(req)` instead of `auth()` — a
  cached-session-lookup variant. The PATCH handler
  combines a single-step `!session?.user?.isAdmin`
  gate returning 401 `{ error: 'Unauthorized' }`
  (BARE envelope, NO `success` key, SHORT message),
  a single-field required check (`if (!key)` → 400
  `'Key is required'`),
  `configManager.updateNestedKey('settings.${key}',
value)` for the load-bearing works.yml write,
  an update-failed branch (500 `'Failed to update
setting'` if falsy), success payload
  `{ success: true, key, value }` with status 200
  (UNIQUE: echoes the input key and value), and
  outer catch `console.error` + 500 `'Failed to
update settings'`. The companion
  `admin-settings-query.spec.ts` covers the GET
  surface of the same route. The smoke spec pins a
  bare 401-envelope assertion, a strict envelope-
  shape assertion, a success-branch-key non-
  disclosure assertion, a gate-before-post-auth
  invariant, a parameterised-vs-baseline status-
  stability comparison, a side-channel walk, a
  cross-method probe, a malformed-JSON-body
  invariance walk, a required-key-check-not-entered
  invariance walk, and a configManager-update-not-
  entered invariance walk pinning that the unauth
  response must NEVER echo a `key` or `value` from
  the input — the **first cached-session-lookup
  config-write PATCH admin-tree smoke** the docs
  tree publishes.

- `docs/plugins` Added `admin-categories-git-create-body-spec.md` —
  the **forty-seventh** per-source-file reference the docs
  tree publishes for any file under
  `apps/web-e2e/tests/` and the **forty-fifth** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/admin-categories-git-create-body.spec.ts`
  spec covering the `POST` export of
  `apps/web/app/api/admin/categories/git/route.ts` —
  the **first POST-only Git-CMS-write admin-tree
  smoke** the docs tree publishes (distinct from the
  regular `admin/categories` POST which writes to the
  DB; this Git POST commits a new category file to
  the configured `DATA_REPOSITORY` GitHub repository
  via `createCategoryGitService`). The POST handler
  combines a single-step inline `!session?.user?.
isAdmin` gate that returns 401 `{ error:
'Unauthorized. Admin access required.' }` — NOTE:
  canonical longer message but WITHOUT `success:
false` envelope key, a UNIQUE envelope shape that
  mixes the canonical longer message of
  `admin/items/[id]` etc. WITH the bare envelope of
  `admin/clients/[clientId]`/`admin/companies/[id]`
  etc. (no other admin-tree route combines these
  two). Two-field required check, DATA_REPOSITORY
  env-var validation chain (missing / malformed),
  GH_TOKEN env-var validation, then the Git-service
  call. Returns `{ success: true, category:
<newCategory>, message: 'Category created and
committed to Git repository' }` with status 200
  (NOT 201). Outer catch is two-branch
  (`'already exists'` → 409 echoing raw error.message,
  else `safeErrorResponse(error, 'Failed to create
category via Git')`). The smoke spec pins a
  canonical-longer-bare-envelope 401 assertion, a
  strict envelope-shape assertion (no `success` key),
  a success-branch-key non-disclosure assertion, a
  gate-before-post-auth invariant, a parameterised-
  vs-baseline status-stability comparison, a side-
  channel walk, a cross-method probe, a malformed-
  JSON-body invariance walk, a required-field-check-
  not-entered invariance walk, an env-var-validation-
  chain-not-entered invariance walk, and a Git-
  service-call-not-entered invariance walk — the
  **first Git-CMS-write POST admin-tree smoke** the
  docs tree publishes.

- `docs/plugins` Added `admin-featured-items-create-body-spec.md` —
  the **forty-sixth** per-source-file reference the docs
  tree publishes for any file under
  `apps/web-e2e/tests/` and the **forty-fourth**
  under `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/admin-featured-items-create-body.spec.ts`
  spec covering the `POST` export of
  `apps/web/app/api/admin/featured-items/route.ts` —
  documenting the **seventh Q-010b-style auth-gate-
  divergence finding** in the admin-tree smoke layer.
  The route's POST handler does NOT call `!isAdmin`
  at any point; it requires an authenticated user
  with a tenant. Two-step gate with **tenant-first
  ordering** (BEFORE body parse — distinct from
  `admin/notifications` POST which runs
  `getTenantId()` AFTER body parse). The POST handler
  runs a two-field required check, an already-
  featured check via inline Drizzle `select` (with
  tenant scoping) returning **400 (NOT 409)**
  `'Item is already featured'` if a row exists (the
  first POST smoke that uses a 400, not 409, for an
  already-exists check), then an inline Drizzle
  insert. Returns `{ success: true, data:
<featuredItem>, message: 'Item featured
successfully' }` with status 200. Outer catch is
  `console.error` + 500 `'Failed to create featured
item'`. The smoke spec pins a hybrid 401-envelope
  assertion, a strict envelope-shape assertion, an
  unauth-lands-on-401-not-403 invariant, a success-
  branch-key non-disclosure assertion, a gate-before-
  post-auth invariant, a parameterised-vs-baseline
  status-stability comparison, a side-channel walk,
  a cross-method probe, a malformed-JSON-body
  invariance walk, a required-fields-check-not-
  entered invariance walk, an already-featured-
  check-not-entered invariance walk pinning that the
  unauth response must NEVER echo `'Item is already
featured'`, and a Drizzle-insert-not-entered
  invariance walk — the **seventh Q-010b auth-gate-
  divergence finding** the docs tree publishes.

- `docs/plugins` Added `admin-notifications-create-body-spec.md` —
  the **forty-fifth** per-source-file reference the docs
  tree publishes for any file under
  `apps/web-e2e/tests/` and the **forty-third** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/admin-notifications-create-body.spec.ts`
  spec covering the `POST` export of
  `apps/web/app/api/admin/notifications/route.ts` —
  documenting the **sixth Q-010b-style auth-gate-
  divergence finding** in the admin-tree smoke layer:
  the route's `POST` handler **does NOT call
  `!isAdmin` at any point**. It DOES require an
  authenticated user (`!session?.user?.id` → 401),
  so the route is tenant-scoped to authenticated
  users but is effectively non-admin-restricted. The
  POST handler combines a two-step gate
  (`!session?.user?.id` → 401, then `!tenantId` after
  `getTenantId()` AFTER body parse + required-fields
  check → 403 `'Tenant not found'`) — distinct from
  prior two-step gates which run `getTenantId()`
  BEFORE body parse — this route's tenant resolution
  is INTERLEAVED with body validation. Hybrid bare-
  `Unauthorized` + `success: false` envelope. Four-
  field required check (`type`, `title`, `message`,
  `userId`). Inline Drizzle insert with JSON-
  stringified `data` field. Success payload with
  `notification` success-key (NOT `data`) and status
  200 (NOT 201). The companion
  `admin-notifications-query.spec.ts` covers the GET
  surface of the same route. The smoke spec pins a
  hybrid 401-envelope assertion, a strict envelope-
  shape assertion, an unauth-lands-on-401-not-403
  invariant, a success-branch-key non-disclosure
  assertion, a gate-before-post-auth invariant, a
  parameterised-vs-baseline status-stability
  comparison, a side-channel walk, a cross-method
  probe, a malformed-JSON-body invariance walk, a
  required-fields-check-not-entered invariance walk,
  a tenant-resolution-check-not-entered invariance
  walk, and a Drizzle-insert-not-entered invariance
  walk — the **sixth Q-010b auth-gate-divergence
  finding** the docs tree publishes (joining
  `admin-roles-query-spec.md`,
  `admin-roles-active-query-spec.md`,
  `admin-roles-create-body-spec.md`,
  `admin-featured-items-id-method-spec.md`, and the
  broader `admin-by-id.spec.ts` coverage).

- `docs/plugins` Added `admin-roles-create-body-spec.md` —
  the **forty-fourth** per-source-file reference the docs
  tree publishes for any file under
  `apps/web-e2e/tests/` and the **forty-second**
  under `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/admin-roles-create-body.spec.ts`
  spec covering the `POST` export of
  `apps/web/app/api/admin/roles/route.ts` —
  documenting the **fifth Q-010b-style auth-gate-
  divergence finding** in the admin-tree smoke layer:
  the route's `POST` handler **does NOT call
  `auth()` at all**, so any unauthenticated client can
  create roles (including admin-flagged roles by
  sending `{ name: 'X', description: 'Y',
isAdmin: true }`). The companion
  `admin-roles-query.spec.ts` already documents the
  same Q-010b finding for the GET surface. With no
  gate, the unauth client receives the same response
  an authenticated client would: 400 on no body /
  empty name / out-of-range lengths, 409 on duplicate
  ID, or 201 on valid bodies. The POST handler
  additionally has a stable-ID-derivation step
  (`name` normalized via `.normalize('NFKD')`,
  diacritic stripping, lowercasing, slug-style hyphen
  collapsing — the first POST smoke that walks a
  slug-derivation step), a soft-delete-aware
  uniqueness check (`roleRepository.exists(id,
{ includeDeleted: true })`), and an outer-catch
  translation that maps
  `'already exists' | 'unique constraint' | 'duplicate
key'` to a single fixed 409 message. The smoke spec
  pins a NEVER-401-or-403 invariant pinning the auth-
  gate-divergence finding, a `success`-key envelope-
  shape assertion, a per-header-permutation status-
  stability comparison for the same body, a side-
  channel walk pinning that fabricated session cookies
  and `X-*` headers do NOT escalate privilege, a cross-
  method probe, a malformed-JSON-body invariance walk,
  a required-field-check-first-validation-fires
  invariant pinning the route's only "protection",
  and a length-validation deterministic-fire invariant
  — the **fifth Q-010b auth-gate-divergence finding**
  the docs tree publishes (joining `admin-roles-query-
spec.md`, `admin-roles-active-query-spec.md`,
  `admin-featured-items-id-method-spec.md`, and the
  broader `admin-by-id.spec.ts` coverage).

- `docs/plugins` Added `admin-collections-create-body-spec.md` —
  the **forty-third** per-source-file reference the docs
  tree publishes for any file under
  `apps/web-e2e/tests/` and the **forty-first** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/admin-collections-create-body.spec.ts`
  spec covering the `POST` export of
  `apps/web/app/api/admin/collections/route.ts` (the
  collection-level collection-create endpoint) — the
  **first POST-only collection-level admin-tree smoke**
  the docs tree publishes that combines a **per-call
  inline `try { body = await request.json() } catch
(jsonError) { ... }`** wrapper emitting an
  `'Invalid JSON in request body'` 400 envelope (the
  FIRST collection-level admin POST route the smoke
  layer covers that wraps the `request.json()` call in
  its own try/catch — every prior collection-level POST
  smoke uses the bare `await request.json()` form) with
  a **manual TWO-field required check**
  (`!createData.id || !createData.name` → 400
  `'Collection ID and name are required'`) plus a
  **two-`revalidatePath` cache-invalidation chain** on
  the success branch (`revalidatePath('/collections')`
  PLUS `revalidatePath(\`/collections/\${slug}\`)`slug-aware, in addition to`await invalidateContentCaches()`). Sibling of
`admin-categories-create-body-spec.md` — they share the
SAME canonical-longer 401 envelope, the SAME three-
branch outer catch chain (`'already exists'`/`'must'`/`safeErrorResponse(...)` fallback), and the
SAME non-`data` success-payload key (`collection`here,`category`there). Returns`{ success: true, collection: <collection>, message:
  'Collection created successfully' }`with status 201.
The companion`admin-collections-query.spec.ts` covers
the GET (paginated list) surface of the same route.
The smoke spec pins a canonical-longer 401-envelope
assertion (vs the bare-envelope sibling routes), a
strict envelope-shape assertion, a success-branch-key
non-disclosure assertion, a gate-before-post-auth
invariant pinning that the four static post-auth
messages must NEVER appear in any unauth response, a
parameterised-vs-baseline status-stability comparison,
a side-channel walk, a cross-method probe, a
per-call-`request.json`-try/catch-not-entered
invariance walk pinning that the `'Invalid JSON in
  request body'`400 envelope must NEVER appear on the
unauth branch (distinct from prior POST smokes which
use the bare`await request.json()`form), a required-
  field-check-not-entered invariance walk, a create-call-
    - cache-invalidation-not-entered invariance walk
      pinning that the unauth response status must NOT be
      201, must NOT contain a`collection`key, and the
     `revalidatePath` side-effects must NEVER fire, and a
  three-branch-outer-catch-not-entered invariance walk
  pinning that the unauth response must echo the
  canonical 401 envelope, not any branch of the outer
  catch chain.
- `docs/plugins` Added `admin-companies-create-body-spec.md` —
  the **forty-second** per-source-file reference the docs
  tree publishes for any file under
  `apps/web-e2e/tests/` and the **fortieth** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/admin-companies-create-body.spec.ts`
  spec covering the `POST` export of
  `apps/web/app/api/admin/companies/route.ts` (the
  collection-level company-create endpoint) — the
  **first POST-only collection-level admin-tree
  smoke** the docs tree publishes that combines the
  **bare `{ error: 'Unauthorized' }` envelope** (NO
  `success` key) with a **Zod `parse()` (NOT
  `safeParse()`) body validation emitting a
  `details: [{field, message}]` 400 envelope** AND
  **two dynamically-interpolated 409 pre-create
  uniqueness checks** (`getCompanyByDomain` /
  `getCompanyBySlug`) AND an **outer-catch unique-
  constraint translation chain** that maps DB errors
  to one of three 409 envelope variants. Sibling of
  `admin-companies-id-method-spec.md` PUT — they
  share the SAME bare envelope, the SAME Zod-
  `parse()`-with-`details`-envelope validation chain,
  the SAME TWO 409 pre-create/-update uniqueness
  checks (with dynamically-interpolated messages),
  and the SAME outer-catch unique-constraint
  translation chain. The POST diverges on: NO
  existence check, `createCompany(validatedData)`
  call, and status-201 success branch with
  `{ success: true, data: <company> }`. The companion
  `admin-companies-query.spec.ts` covers the GET
  surface of the same route. The smoke spec pins a
  bare 401-envelope assertion, a strict envelope-
  shape assertion, a success-branch-key non-
  disclosure assertion, a gate-before-post-auth
  invariant pinning that the five static post-auth
  messages plus the dynamic
  `'Company with (domain|slug) '<...>' already
exists'` 409 messages (matched via regex prefix)
  must NEVER appear in any unauth response, a
  parameterised-vs-baseline status-stability
  comparison, a side-channel walk, a cross-method
  probe, a malformed-JSON-body invariance walk, a
  Zod-validation-not-entered invariance walk, a
  uniqueness-check-409-not-entered invariance walk,
  a createCompany-call-not-entered invariance walk,
  and a unique-constraint-outer-catch-not-entered
  invariance walk — the **first bare-envelope-Zod-
  `parse()`-with-`details`-envelope collection-level
  POST admin-tree smoke** the docs tree publishes.

- `docs/plugins` Added `admin-clients-create-body-spec.md` —
  the **forty-first** per-source-file reference the docs
  tree publishes for any file under
  `apps/web-e2e/tests/` and the **thirty-ninth**
  under `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/admin-clients-create-body.spec.ts`
  spec covering the `POST` export of
  `apps/web/app/api/admin/clients/route.ts` (the
  collection-level client-create endpoint) — the
  **first POST-only collection-level admin-tree
  smoke** the docs tree publishes that combines the
  **bare `{ error: 'Unauthorized' }` envelope** (NO
  `success` key — matching the
  `admin/clients/[clientId]` smoke and
  `admin/companies/[id]`) with a **get-or-create user
  side-effect chain** that uses `crypto.randomBytes(6)`
  to generate a temporary password for newly-created
  users (`Temp<hex>!`) AND a **status-200 success
  branch** (NOT 201, distinct from every prior
  collection-level POST smoke). The POST handler runs
  an email-or-userId fallback (`raw.email ?? raw.userId`,
  distinct from prior POST smokes), a single-field
  required check, `getUserByEmail(email)` lookup, an
  inner-try/catch user-create branch that returns 400
  with dynamically-interpolated `'Failed to create
user: <err.message>'` message on failure, a get-or-
  create fallback validation, then
  `createClientProfile(clientData)` with defaults, an
  optional CRM sync side-effect, and returns
  `{ success: true, data: <client>, message: 'Client
created successfully' }` with status 200 (NOT 201).
  The outer catch returns 500 `{ error: 'Failed to
create client' }` (BARE envelope). The companion
  `admin-clients-query.spec.ts` covers the GET surface
  of the same route. The smoke spec pins a bare 401-
  envelope assertion, a strict envelope-shape
  assertion (no `success` key), a success-branch-key
  non-disclosure assertion that NONE of `data`,
  `success`, `message` keys must appear in any unauth
  response and the unauth response status must NOT be
  200, a gate-before-post-auth invariant pinning that
  the four static post-auth messages plus the dynamic
  `'Failed to create user: ...'` regex prefix must NOT
  appear in any unauth response, a parameterised-vs-
  baseline status-stability comparison, a side-channel
  walk, a cross-method probe, a malformed-JSON-body
  invariance walk, a required-email-check-not-entered
  invariance walk, a get-or-create-user-side-effect-
  not-entered invariance walk, and a
  createClientProfile-call-not-entered invariance walk
  — the **first bare-envelope-with-get-or-create-user-
  side-effect collection-level POST admin-tree smoke**
  the docs tree publishes.

- `docs/plugins` Added `admin-tags-create-body-spec.md` —
  the **fortieth** per-source-file reference the docs
  tree publishes for any file under
  `apps/web-e2e/tests/` and the **thirty-eighth**
  under `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/admin-tags-create-body.spec.ts`
  spec covering the `POST` export of
  `apps/web/app/api/admin/tags/route.ts` (the
  collection-level tag-create endpoint) — the **first
  POST-only collection-level admin-tree smoke** the
  docs tree publishes that combines the **hybrid
  bare-`Unauthorized` + `success: false` 401
  envelope** with a **`tag` success-payload key** (NOT
  `data`) — distinct from the canonical-longer-
  envelope `admin/categories` and `admin/collections`
  POST smokes. The POST handler runs a two-field
  required check, calls `tagRepository.create({ id,
name, isActive: isActive ?? true })` (defaults
  `isActive` to `true` if not provided), runs
  `await invalidateContentCaches()`, and returns
  `{ success: true, tag: <tag> }` with status 201 (NO
  `message` key — distinct from `admin/categories`
  POST and `admin/collections` POST). The outer catch
  uses a three-branch chain (`'already exists'` → 409,
  `'required' | 'must be'` → 400, else fixed-message
  500 `'Failed to create tag'` fallback — NOT
  `safeErrorResponse(...)`). The companion
  `admin-tags-query.spec.ts` covers the GET surface
  of the same route. The smoke spec pins a hybrid
  401-envelope assertion, a strict envelope-shape
  assertion, a success-branch-key non-disclosure
  assertion, a gate-before-post-auth invariant, a
  parameterised-vs-baseline status-stability
  comparison, a side-channel walk, a cross-method
  probe, a malformed-JSON-body invariance walk, a
  required-field-check-not-entered invariance walk, a
  create-call-not-entered invariance walk, and a
  three-branch-outer-catch-not-entered invariance
  walk — the **first hybrid-envelope `tag`-key
  collection-level POST admin-tree smoke** the docs
  tree publishes.

- `docs/plugins` Added `admin-categories-create-body-spec.md` —
  the **thirty-ninth** per-source-file reference the docs
  tree publishes for any file under
  `apps/web-e2e/tests/` and the **thirty-seventh** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/admin-categories-create-body.spec.ts`
  spec covering the `POST` export of
  `apps/web/app/api/admin/categories/route.ts` (the
  collection-level category-create endpoint) — the
  **first POST-only collection-level admin-tree
  smoke** the docs tree publishes that combines a
  **single-step inline `!session?.user?.isAdmin` gate**
  with a **single required-field validation**
  (`if (!createData.name)` → 400 `'Category name is
required'`) AND a **three-branch outer-catch chain**
  (`error.message.includes('already exists')` → 409
  echoing raw message, `error.message.includes('must
be')` → 400 echoing raw message, `safeErrorResponse(
error, 'Failed to create category')` fallback) AND a
  **`category` success-payload key (NOT `data`)** —
  `{ success: true, category: <category>, message:
'Category created successfully' }` with status 201.
  Distinct from `admin/items` POST which uses a five-
  field guard with TWO 409 pre-create duplicate checks
  AND a `data` success-key; distinct from `admin/users`
  POST which uses an eight-step body validation chain
  AND a `data` success-key AND an `error.message`-pass-
  through outer catch; distinct from `admin/collections`
  POST which uses a two-field guard AND a `collection`
  success-key. The companion `admin-categories-query.
spec.ts` covers the GET (paginated list) surface of
  the same route. The smoke spec pins a canonical-
  longer 401-envelope assertion, a strict envelope-
  shape assertion, a success-branch-key non-disclosure
  assertion that NONE of `data`, `category`, `message`,
  `success: true` keys plus the 201 status must
  appear in any unauth response, a gate-before-post-
  auth invariant pinning that NONE of the three static
  post-auth messages (`'Category name is required'`,
  `'Failed to create category'`, `'Category created
successfully'`) must appear in any unauth response, a
  parameterised-vs-baseline status-stability comparison,
  a side-channel cookie / `X-*` header walk, a cross-
  method probe asserting PUT / PATCH / DELETE round-
  trip to `< 500`, a malformed-JSON-body invariance
  walk, a required-field-validation-not-entered
  invariance walk pinning that EVERY missing-name probe
  round-trips to the same 401 status, a create-call-+-
  cache-invalidation-not-entered invariance walk
  pinning that the unauth response status must NOT be
  201 and must NEVER echo `'Category created
successfully'`, and a two-branch-catch-not-entered
  invariance walk pinning that the unauth response
  must equal the canonical 401 envelope rather than any
  catch-branch shape — the **first `category`-success-
  key collection-level admin-tree smoke** the docs
  tree publishes.

- `docs/plugins` Added `admin-users-create-body-spec.md` —
  the **thirty-eighth** per-source-file reference the docs
  tree publishes for any file under
  `apps/web-e2e/tests/` and the **thirty-sixth** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/admin-users-create-body.spec.ts`
  spec covering the `POST` export of
  `apps/web/app/api/admin/users/route.ts` (the
  collection-level user-create endpoint) — the
  **first POST-only collection-level admin-tree
  smoke** the docs tree publishes that combines the
  **two-step `!session?.user` →
  `!session.user.isAdmin` gate** with an **eight-step
  body validation chain** (object-shape / 5-required-
  fields / email-format / username-regex / name-
  length / password-Zod-`safeParse` / title-length /
  avatar-length / role-DB-lookup) AND **Zod
  `passwordSchema.safeParse(body.password)` for
  password-only validation** (returning a dynamically-
  interpolated message on failure — distinct from
  prior smokes that use Zod for the body-as-a-whole)
  AND a **username regex validation**
  (`/^[a-zA-Z0-9_-]{3,30}$/` — the first regex-based
  username validation in admin smoke) AND the
  **`error.message`-pass-through outer catch**. The
  companion `admin-users-query.spec.ts` covers the
  GET (paginated list) surface of the same route.
  The smoke spec pins a hybrid 401-envelope
  assertion, an unauth-lands-on-401-not-403
  invariant, a success-branch-key non-disclosure
  assertion that NONE of `data`, `user`, `id`,
  `success: true` keys plus the 201 status must
  appear in any unauth response, a gate-before-post-
  auth invariant pinning that NONE of the thirteen
  post-auth messages must appear in any unauth
  response, a parameterised-vs-baseline status-
  stability comparison, a side-channel walk, a cross-
  method probe asserting PUT / PATCH / DELETE round-
  trip to `< 500`, a malformed-JSON-body invariance
  walk, an eight-step-validation invariance walk
  pinning that EVERY step-(a)-(i) probe round-trips
  to the same 401 status, a role-DB-lookup-not-
  entered invariance walk pinning that the unauth
  response must NEVER echo `'Invalid role'`, and a
  create-call-not-entered invariance walk pinning
  that the unauth response status must NOT be 201 —
  the **first eight-step-validation collection-level
  POST admin-tree smoke** the docs tree publishes
  (complementing the existing query-surface coverage
  of the same users-collection route).

- `docs/plugins` Added `admin-items-create-body-spec.md` —
  the **thirty-seventh** per-source-file reference the docs
  tree publishes for any file under
  `apps/web-e2e/tests/` and the **thirty-fifth** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/admin-items-create-body.spec.ts`
  spec covering the `POST` export of
  `apps/web/app/api/admin/items/route.ts` (the
  collection-level item-create endpoint) — the
  **first POST-only collection-level admin-tree
  smoke** the docs tree publishes that combines a
  **five-field required-validation chain** with **TWO
  409 Conflict pre-create duplicate checks** using
  dynamically-interpolated messages AND an **audit-
  user-threading + CRM-company-link + Location-Index
  side-effect chain** on the success branch. The
  companion `admin-items-query.spec.ts` covers the
  GET (paginated list) surface of the same route.
  The POST handler shares the same single-step
  `!isAdmin` gate / canonical longer 401 envelope as
  its GET sibling. CRM sync is gated by
  `process.env.TWENTY_CRM_ENABLED === 'true'` (NOTE:
  strict-equals comparison, distinct from
  `admin/items/[id]/route.ts` PUT which uses
  `!== 'false'`). The smoke spec pins a canonical-
  longer 401-envelope assertion, a strict envelope-
  shape assertion, a success-branch-key non-
  disclosure assertion that NONE of `data`, `item`,
  `id`, `slug`, `success: true` keys plus the 201
  status must appear in any unauth response, a gate-
  before-post-auth invariant pinning that the two
  static post-auth messages plus the dynamic `'Item
with (ID|slug) '<...>' already exists'` 409
  messages (matched via regex prefix) must NEVER
  appear in any unauth response, a parameterised-vs-
  baseline status-stability comparison, a side-channel
  walk, a cross-method probe asserting PUT / PATCH /
  DELETE round-trip to `< 500`, a malformed-JSON-body
  invariance walk, a required-field-validation-not-
  entered invariance walk, a duplicate-id-/-
  duplicate-slug-409-not-entered invariance walk
  pinning that the unauth response must NEVER match
  the dynamic `/^Item with (ID|slug) '/` regex
  prefixes, a create-call-not-entered invariance walk
  pinning that the unauth response status must NOT be
  201, a CRM-sync-side-effect-not-entered invariance
  walk pinning that a body with `brand` does NOT
  change the unauth status, and a Location-Index-
  side-effect-not-entered invariance walk pinning
  that a body with `location` does NOT change the
  unauth status — the **first POST-only collection-
  level admin-tree smoke** the docs tree publishes
  (complementing the existing query-surface coverage
  of the same items-collection route).

- `docs/plugins` Added `admin-roles-id-method-spec.md` —
  the **thirty-sixth** per-source-file reference the docs
  tree publishes for any file under
  `apps/web-e2e/tests/` and the **thirty-fourth** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/admin-roles-id-method.spec.ts`
  spec covering the admin single-role CRUD endpoint at
  `apps/web/app/api/admin/roles/[id]/route.ts` — the
  **first triple-method admin-tree smoke** the docs
  tree publishes that combines the **two-step
  `!session?.user` → `!session.user.isAdmin` gate**
  with a **DELETE `?hard=true` query-parameter
  branch** AND a **three-step manual PUT body
  validation chain** with FIXED error messages.
  Distinct from `admin/categories/[id]` which has the
  DELETE-`?hard=true` branch but a single-step gate;
  distinct from `admin/users/[id]` which has the two-
  step gate but NO DELETE-`?hard=true` branch and
  uses an eight-step PUT validation chain. All three
  handlers share the SAME hybrid 401 envelope
  (`{ success: false, error: 'Unauthorized' }` —
  matching `admin/users/[id]` and `admin/featured-
items/[id]`) and the SAME `console.error` + 500
  catch posture. Each handler diverges on its post-
  gate surface: GET calls `roleRepository.findById`
  returning 404 / 200; PUT parses body AFTER both
  gate steps, runs an existence check AFTER body
  parse (NOT before, distinct from
  `admin/reports/[id]` and `admin/companies/[id]`),
  runs the three-step validation chain ((a) name-
  empty / (b) name-length / (c) description-length),
  calls `roleRepository.update(id, ...)`, returns
  `{ success: true, data: <role>, message: 'Role
updated successfully' }`; DELETE parses
  `searchParams.get('hard') === 'true'`, runs an
  existence check, branches on `hardDelete` boolean
  (`hardDelete === true` →
  `roleRepository.hardDelete(id)`; else
  `roleRepository.delete(id)`), returns the soft-
  delete `'Role deleted (marked as inactive)'` or
  hard-delete `'Role permanently deleted'` message.
  The smoke spec pins per-method hybrid 401-envelope
  assertions, a NEVER-403 invariant, gate-before-
  post-auth across eleven candidate messages
  (including the three PUT validation messages and
  both DELETE success messages), a per-id-shape
  status-stability comparison, a PUT body-permutation
  status-stability comparison, a DELETE `?hard=...`
  query-shape invariance walk, a cross-method side-
  channel walk, a service-not-entered invariance walk
  across all four repository calls, a three-step-
  validation invariance walk pinning that EVERY
  step-(a)/(b)/(c) probe round-trips to the same 401
  status, and a hard-delete-branch-not-entered
  invariance walk pinning that the unauth response
  must NEVER echo `'Role deleted (marked as
inactive)'` or `'Role permanently deleted'` — the
  **first two-step-gate-with-DELETE-?hard-query
  admin-tree smoke** the docs tree publishes.

- `docs/plugins` Added `admin-tags-id-method-spec.md` —
  the **thirty-fifth** per-source-file reference the docs
  tree publishes for any file under
  `apps/web-e2e/tests/` and the **thirty-third** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/admin-tags-id-method.spec.ts`
  spec covering the admin single-tag CRUD endpoint at
  `apps/web/app/api/admin/tags/[id]/route.ts` — the
  **first triple-method admin-tree smoke** the docs
  tree publishes that combines the **hybrid bare-
  `Unauthorized` + `success: false` 401 envelope** with
  a **single-step inline `!session?.user?.isAdmin`
  gate** AND a **PUT outer-catch three-branch
  `error.message.includes(...)` chain** that maps
  `'not found'` → 404, `'already exists'` → 409,
  `'required' | 'must be'` → 400 (each echoing the
  raw `error.message`). All three handlers share the
  hybrid envelope shape and a `console.error` + 500
  catch posture. Each handler diverges on its post-
  gate surface: GET calls `tagRepository.findById`
  returning 404 or 200; PUT runs name validation →
  400 `'Tag name is required'`, calls
  `tagRepository.update(id, ...)`, runs
  `await invalidateContentCaches()`, returns
  `{ success: true, data, message: 'Tag updated
successfully' }`, with three catch branches plus
  500 fallback; DELETE calls `tagRepository.delete`,
  runs cache invalidation, returns `{ success: true,
message: 'Tag deleted successfully' }`, with one
  catch branch plus 500 fallback. The smoke spec
  pins per-method hybrid 401-envelope assertions,
  gate-before-post-auth across seven candidate
  messages, a per-id-shape status-stability
  comparison, a PUT body-permutation status-stability
  comparison, a cross-method side-channel walk, a
  malformed-JSON-body invariance walk for PUT, a
  service-not-entered invariance walk, a cache-
  invalidation-side-effect-not-entered invariance
  walk, and a three-branch-catch-chain-not-entered
  invariance walk — the **first
  hybrid-envelope-with-3-branch-error.message.
  includes-catch admin-tree smoke** the docs tree
  publishes.

- `docs/plugins` Added `admin-collections-id-method-spec.md` —
  the **thirty-fourth** per-source-file reference the docs
  tree publishes for any file under
  `apps/web-e2e/tests/` and the **thirty-second** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/admin-collections-id-method.spec.ts`
  spec covering the admin single-collection CRUD endpoint
  at `apps/web/app/api/admin/collections/[id]/route.ts`
  — the **first triple-method admin-tree smoke** the
  docs tree publishes that combines a canonical longer
  `'Unauthorized. Admin access required.'` 401 envelope
  with a **Zod `safeParse(...).error.flatten()` 400
  envelope** posture (distinct from every prior triple-
  method admin smoke which use either an inline-untyped
  destructure with no Zod, an inline-untyped destructure
  with a DELETE-only `?hard=true` query branch, a Zod
  `parse()` (THROWS) with `details: ZodError.errors`-
  style catch envelope, or a validation-less PUT with
  seven body fields shoved straight into
  `db.update(...)`). All three handlers share the SAME
  inline `!session?.user?.isAdmin` gate (NOT delegated
  to a `checkAdminAuth(...)` helper), the SAME canonical
  longer 401 envelope, the SAME `safeErrorResponse(...)`
  outer-catch fallback (with handler-specific messages
  `'Failed to fetch|update|delete collection'`), the
  SAME `findById` pre-action 404 check on PUT + DELETE
  (distinct from `admin/categories/[id]` PUT which lets
  the service throw, and distinct from
  `admin/featured-items/[id]` PUT which uses the
  `.returning()` length-zero check), and the SAME
  `revalidatePath(...)` cache invalidation pattern AFTER
  the repository call (with `invalidateContentCaches()`
  called in addition). Each handler diverges on its
  post-gate surface: (a) **GET** calls
  `collectionRepository.findById(id)` returning 404
  `'Collection not found'` if missing or `{ success:
true, data: <collection> }`; (b) **PUT** parses JSON
  body AFTER the gate, runs **Zod
  `safeParse(updateCollectionSchema)`** → 400 `{
success: false, error: 'Invalid collection payload',
details: parsed.error.flatten() }` (UNIQUE
  `flatten()`-shaped `details: { formErrors:
string[], fieldErrors: Record<string, string[]> }`
  envelope — DIFFERENT from the `error.errors` array a
  `parse()`-then-catch route would emit), then runs the
  pre-update `findById`, then
  `collectionRepository.update(updateData)`, has THREE
  distinct catch branches (`already exists` → 409 with
  bare-message echo, `must` → 400 with bare-message
  echo, `safeErrorResponse(...)` fallback), then runs
  the conditional slug-revalidation branch plus the
  always-emitted new-slug + index revalidation,
  returning `{ success: true, data: <updated>, message:
'Collection updated successfully' }`; (c) **DELETE**
  runs the pre-delete `findById`, calls
  `collectionRepository.delete(id)`, has TWO distinct
  catch branches (`not found` → 404 with bare-message
  echo, `safeErrorResponse(...)` fallback), then runs
  `invalidateContentCaches()` + two `revalidatePath(...)`
  calls, returning `{ success: true, message:
'Collection deleted successfully' }` (NO `data` key).
  The smoke spec pins per-method canonical-401-envelope
  assertions, a strict envelope-shape assertion, a
  cross-method envelope-equality assertion, a success-
  branch-key non-disclosure assertion, a gate-before-
  post-auth invariant pinning that NONE of the seven
  post-auth messages must appear in any unauth response
  (including the Zod safeParse 400 envelope's fixed
  `'Invalid collection payload'` error string), a gate-
  before-Zod-`safeParse` invariant pinning that the
  unauth response NEVER carries the `details` /
  `formErrors` / `fieldErrors` keys even when the body
  would have failed Zod validation, a per-id-shape
  status-stability comparison, a PUT body-permutation
  status-stability comparison, a cross-method side-
  channel walk, a cross-method probe asserting POST /
  PATCH round-trip to `< 500`, a malformed-JSON-body
  invariance walk for PUT, a repository-call-not-
  entered invariance walk across all three handlers, a
  cache-invalidation-side-effect-not-entered invariance
  walk across PUT + DELETE, a per-handler-catch-
  message-non-disclosure walk, and a gate-before-
  409-/-`'must'`-400-catch invariance walk pinning that
  the unauth status MUST be 401 (NOT 400 / 409) — the
  **first Zod-`safeParse(...)`-with-`flatten()`-envelope
  admin-tree smoke** the docs tree publishes (joining
  the prior Zod-`parse()` `admin-companies-id-method-
spec.md`, the validation-less `admin-featured-items-
id-method-spec.md`, and the inline-untyped `admin-
items-id-method-spec.md` and `admin-categories-id-
method-spec.md` triple-method smokes the sub-rollout
  previously published).

- `docs/plugins` Added `admin-featured-items-id-method-spec.md` —
  the **thirty-third** per-source-file reference the docs
  tree publishes for any file under
  `apps/web-e2e/tests/` and the **thirty-first** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/admin-featured-items-id-method.spec.ts`
  spec covering the admin single-featured-item CRUD
  endpoint at
  `apps/web/app/api/admin/featured-items/[id]/route.ts`
  — the **first triple-method admin-tree smoke** the
  docs tree publishes that combines a **non-admin
  gate** (the route gates on `!session?.user?.id`
  rather than `!session?.user?.isAdmin`, so any
  authenticated user with a tenant can hit it — a
  Q-010b-style auth-gate-divergence finding, the
  fourth admin route the smoke layer documents as
  effectively non-admin-restricted today) with a
  **soft-delete DELETE** (sets `isActive: false`
  rather than removing the row), a **validation-less
  PUT** (seven body fields shoved straight into
  `db.update(...)`), and a **two-step
  `!session?.user?.id` → `!tenantId` gate** envelope.
  All three handlers share a hybrid bare-message +
  `success: false` 401 envelope
  (`{ success: false, error: 'Unauthorized' }` —
  matching `admin/users/[id]` and
  `admin/roles/[id]/permissions`), inline Drizzle
  queries with tenant scoping, and a `console.error` +
  500 catch with handler-specific messages
  (`'Failed to fetch|update|remove featured item'`).
  Each handler diverges on its post-gate surface:
  (a) **GET** runs an inline Drizzle `select()` with
  tenant scoping returning 404 `'Featured item not
found'` if `result.length === 0` or
  `{ success: true, data: <featured-item> }`;
  (b) **PUT** parses JSON body AFTER tenant resolution
  and runs **NO body validation** (seven fields
  destructured: `itemName`, `itemIconUrl`,
  `itemCategory`, `itemDescription`, `featuredOrder`,
  `featuredUntil`, `isActive` — shoved straight into
  `db.update(...).set({...}).returning()`), returns
  404 if `updatedItem.length === 0` or
  `{ success: true, data: <updatedItem>, message:
'Featured item updated successfully' }`;
  (c) **DELETE** runs **soft delete** via
  `db.update(...).set({ isActive: false, updatedAt:
new Date() }).returning()` — distinct from every
  prior admin DELETE smoke that actually removes the
  row — returns 404 if `updatedItem.length === 0` or
  `{ success: true, message: 'Featured item removed
successfully' }` (NO `data` key). The smoke spec
  pins per-method hybrid 401-envelope assertions, a
  strict envelope-shape assertion, a cross-method
  envelope-equality assertion, a success-branch-key
  non-disclosure assertion, a gate-before-post-auth
  invariant pinning that NONE of the seven post-auth
  messages must appear in any unauth response, an
  unauth-lands-on-401-not-403 invariant pinning that
  the FIRST gate step fires for unauth clients (the
  response is 401 not 403, and must NEVER echo
  `'Tenant not found'`), a per-id-shape status-
  stability comparison, a PUT body-permutation
  status-stability comparison, a cross-method side-
  channel walk, a cross-method probe asserting POST /
  PATCH round-trip to `< 500`, a malformed-JSON-body
  invariance walk for PUT, a Drizzle-query-not-
  entered invariance walk across all three handlers,
  and a soft-delete-update-not-entered invariance
  walk pinning that the unauth response must NEVER
  echo `'Featured item removed successfully'` — the
  **first non-admin-gated triple-method admin-tree
  smoke** the docs tree publishes (joining
  `admin-roles-query-spec.md`,
  `admin-roles-active-query-spec.md`, and the broader
  `admin-by-id.spec.ts` coverage of similar tenant-
  only-gated routes as the **fourth** admin route
  flagged by Q-010b).

- `docs/plugins` Added `admin-companies-id-method-spec.md` —
  the **thirty-second** per-source-file reference the docs
  tree publishes for any file under
  `apps/web-e2e/tests/` and the **thirtieth** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/admin-companies-id-method.spec.ts`
  spec covering the admin single-company CRUD endpoint
  at `apps/web/app/api/admin/companies/[id]/route.ts` —
  the **first triple-method admin-tree smoke** the
  docs tree publishes that combines the bare
  `{ error: 'Unauthorized' }` 401 envelope (NO
  `success` key — matching `admin/clients/[clientId]`)
  with a **Zod `parse()` (NOT `safeParse()`) body-
  validation step** that emits a `details: [{field,
message}]` 400 envelope (a UNIQUE envelope key no
  prior admin-tree smoke pins) AND **two 409 Conflict
  pre-update uniqueness checks**
  (`getCompanyByDomain(...)` and
  `getCompanyBySlug(...)`) with dynamically-
  interpolated messages AND an **outer-catch unique-
  constraint translation chain** that maps
  `error.message.includes('unique constraint' |
'duplicate key')` to one of three 409 envelope
  variants based on `domain` / `slug` substring
  detection. All three handlers share the SAME
  single-step inline `!session?.user?.isAdmin` gate
  that returns 401 `{ error: 'Unauthorized' }`, the
  SAME bare envelope shape, and the SAME
  `console.error` + bare `{ error: '<msg>' }` 500
  catch posture. PUT is the **first PUT smoke** that
  pairs the existence-check-FIRST ordering with Zod
  `parse()` instead of `safeParse()`, the
  `details: [...]` 400-validation-envelope key, two
  pre-update uniqueness checks, and an outer-catch
  unique-constraint translation chain. The smoke
  spec pins per-method bare 401-envelope assertions,
  a strict envelope-shape assertion with no `success`
  key, a cross-method envelope-equality assertion, a
  success-branch-key non-disclosure assertion that
  NONE of the route-specific `data`, `details`,
  `message` keys plus `success: true` must appear in
  any unauth response, a gate-before-post-auth
  invariant pinning that NONE of the nine static
  post-auth messages plus none of the dynamic
  `'Company with domain|slug '<...>' already exists'`
  409 messages (matched via regex prefix) must appear
  in any unauth response, a per-id-shape status-
  stability comparison, a PUT body-permutation
  status-stability comparison, a cross-method side-
  channel walk, a cross-method probe asserting POST /
  PATCH round-trip to `< 500`, a malformed-JSON-body
  invariance walk for PUT, a service-not-entered
  invariance walk across all five DB-query calls
  (`getCompanyById` / `getCompanyByDomain` /
  `getCompanyBySlug` / `updateCompany` /
  `deleteCompany`), a Zod-validation-not-entered
  invariance walk pinning that every Zod-invalid
  body shape round-trips to the same 401 status with
  NO `details` key in the response, a uniqueness-
  check-409-not-entered invariance walk pinning that
  the unauth response must NEVER match the dynamic
  `/^Company with (domain|slug) '/` regex prefixes,
  a unique-constraint-outer-catch-not-entered
  invariance walk pinning that the unauth response
  must NEVER echo any of the three static unique-
  constraint translation messages, and a per-handler
  catch-message-divergence walk — the **first
  Zod-`parse()`-with-`details`-envelope admin-tree
  smoke** the docs tree publishes.

- `docs/plugins` Added `admin-comments-id-method-spec.md` —
  the **thirty-first** per-source-file reference the docs
  tree publishes for any file under
  `apps/web-e2e/tests/` and the **twenty-ninth** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/admin-comments-id-method.spec.ts`
  spec covering the admin single-comment CRUD endpoint
  at `apps/web/app/api/admin/comments/[id]/route.ts` —
  the **first 403-on-unauth triple-method admin-tree
  smoke** the docs tree publishes (every prior triple-
  method admin smoke returns 401 on the unauth branch;
  the sibling `admin-reports-id-method-spec.md` 403-on-
  unauth route is dual-method `GET` + `PUT`; this is
  the first triple-method 403 admin smoke). All three
  handlers share the SAME single-step inline
  `!session?.user?.isAdmin` gate that returns **403
  `{ success: false, error: 'Forbidden' }`**, the SAME
  envelope shape, and the SAME `console.error` + 500
  `'Internal Server Error'` catch posture. Each
  handler diverges on its post-gate surface:
  (a) **GET** runs `getTenantId()` AFTER
  `await params` → 403 `'Tenant not found'` if
  missing, then issues an inline Drizzle query with
  `leftJoin` to `clientProfiles` and tenant scoping,
  returning 404 `'Comment not found'` or
  `{ success: true, data: <comment-with-user> }`;
  (b) **PUT** runs `getTenantId()` BEFORE
  `await params` (NOTE: ordering distinct from GET)
  → 403 `'Tenant not found'`, parses JSON body,
  validates `content?.trim()` → 400 `'Content is
required'` if falsy, runs a soft-delete-aware
  `getCommentById(id)` existence check
  (`existingComment.deletedAt` → 404 `'Comment not
found'`), then issues an **inline Drizzle re-query**
  (NOTE: the actual `updateComment` call is
  **commented out** in the source — the route
  currently re-fetches the comment without updating
  it; a regression-sensitive note), returning
  `{ success: true, data: <comment-with-user>,
message: 'Comment updated successfully' }`;
  (c) **DELETE** has **NO `getTenantId()` call**
  (distinct from GET / PUT), runs a soft-delete-aware
  `getCommentById(id)` existence check, calls
  `deleteComment(id)` (soft delete via setting
  `deletedAt`), and returns
  `{ success: true, message: 'Comment deleted
successfully' }` (NO `data` key). The smoke spec
  pins per-method 403-envelope assertions across
  GET / PUT / DELETE, a NEVER-401 invariant across
  all three methods, a strict envelope-shape
  assertion, a cross-method envelope-equality
  assertion, a success-branch-key non-disclosure
  assertion, a gate-before-post-auth invariant
  pinning that NONE of the six post-auth messages
  must appear in any unauth response, a per-id-shape
  status-stability comparison across all three
  methods, a PUT body-permutation status-stability
  comparison, a cross-method side-channel walk, a
  cross-method probe asserting POST / PATCH round-
  trip to `< 500`, a malformed-JSON-body invariance
  walk for PUT, a service-not-entered invariance walk
  across the inline Drizzle queries plus
  `getCommentById(...)` / `deleteComment(...)` /
  `getTenantId()` calls, and a tenant-resolution-not-
  entered invariance walk pinning that the unauth
  response must NEVER echo `'Tenant not found'` for
  GET / PUT — the **first 403-on-unauth triple-
  method admin-tree smoke** the docs tree publishes.

- `docs/plugins` Added `admin-sponsor-ads-id-method-spec.md` —
  the **thirtieth** per-source-file reference the docs
  tree publishes for any file under
  `apps/web-e2e/tests/` and the **twenty-eighth** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/admin-sponsor-ads-id-method.spec.ts`
  spec covering the admin single-sponsor-ad endpoint
  at `apps/web/app/api/admin/sponsor-ads/[id]/route.ts`
  — the **first GET + DELETE-only dual-method admin-
  tree smoke** the docs tree publishes (the sponsor-ad
  write path is split across the three sibling
  `[id]/approve` / `[id]/reject` / `[id]/cancel`
  POST-only action routes which the smoke layer
  already covers separately; with this entry the
  sponsor-ad area smoke coverage is complete at four
  routes). Both handlers share the SAME single-step
  inline `!session?.user?.isAdmin` gate, the SAME
  canonical longer 401 envelope, and the SAME
  `{ success: false, error: ... }` envelope shape,
  but each diverges on its catch posture — the load-
  bearing divergence: GET uses a `console.error` + 500
  `'Failed to fetch sponsor ad'` catch, while DELETE
  uses a **narrow-match `error.message === 'Sponsor
ad not found'`** → 404 catch followed by a
  `safeErrorResponse(error, 'Failed to delete sponsor
ad')` fallback. The DELETE handler is the **first
  admin DELETE smoke** where the catch chain begins
  with a narrow-match equality check on a service-
  thrown sentinel string (rather than a
  `.includes(...)` substring match or a fixed
  fallback). The smoke spec pins per-method canonical-
  longer 401-envelope assertions, a strict envelope-
  shape assertion, a cross-method envelope-equality
  assertion, a success-branch-key non-disclosure
  assertion, a gate-before-post-auth invariant
  pinning that NONE of the four post-auth messages
  must appear in any unauth response, a per-id-shape
  status-stability comparison, a side-channel cookie
  / `X-*` header walk, a cross-method probe asserting
  POST / PUT / PATCH round-trip to `< 500`, a service-
  not-entered invariance walk, a DELETE narrow-match-
  catch-not-entered invariance walk pinning that the
  unauth response must NEVER echo the service-thrown
  sentinel `'Sponsor ad not found'`, and a per-
  handler catch-message-divergence walk — the
  **first GET + DELETE-only dual-method admin-tree
  smoke** the docs tree publishes.

- `docs/plugins` Added `admin-reports-id-method-spec.md` —
  the **twenty-ninth** per-source-file reference the docs
  tree publishes for any file under
  `apps/web-e2e/tests/` and the **twenty-seventh** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/admin-reports-id-method.spec.ts`
  spec covering the admin single-report CRUD endpoint
  at `apps/web/app/api/admin/reports/[id]/route.ts` —
  the **first 403-on-unauth admin-tree smoke** the
  docs tree publishes (every prior admin-tree route
  returns 401 on the unauth branch with one of three
  envelope shapes; this route returns **403
  `'Forbidden'`** on the unauth branch instead). Both
  handlers share a `checkDatabaseAvailability()` pre-
  gate that runs BEFORE the auth gate, a single-step
  `!session?.user?.isAdmin` gate that returns 403
  `{ success: false, error: 'Forbidden' }`, a strict
  envelope shape, a dynamic `[id]` segment, and a
  dev-gated `console.error` catch. PUT is the **first
  PUT smoke** where the existence check runs BEFORE
  the body parse, then validates `status` /
  `resolution` against the `ReportStatus` /
  `ReportResolution` enums (with dynamically-
  interpolated 400 messages), then runs a conditional
  moderation-action chain (`removeContent` /
  `warnUser` / `suspendUser` / `banUser`) based on
  `resolution`, then a final `getReportById(id)`,
  returning a four-key
  `{ success: true, message, data, moderationResult }`
  payload. The smoke spec pins per-method 403-
  envelope assertions, a NEVER-401 invariant, the
  cross-method envelope-equality assertion, gate-
  before-post-auth across five static plus regex-
  prefix dynamic 400 messages, gate-before-service
  across the entire moderation chain, gate-before-
  enum-validation, and gate-before-moderation-chain —
  the **first 403-on-unauth admin-tree smoke** the
  docs tree publishes.

- `docs/plugins` Added `admin-categories-id-method-spec.md` —
  the **twenty-eighth** per-source-file reference the docs
  tree publishes for any file under
  `apps/web-e2e/tests/` and the **twenty-sixth** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/admin-categories-id-method.spec.ts`
  spec covering the admin single-category CRUD endpoint at
  `apps/web/app/api/admin/categories/[id]/route.ts`
  — the **second triple-method admin-tree smoke**
  the docs tree publishes (after the first triple-
  method `admin/items/[id]` smoke), and the **first
  triple-method admin smoke with a DELETE-only
  `?hard=true` query-parameter branch** that flips
  the service call from `categoryRepository.delete(id)`
  (soft delete / deactivation) to
  `categoryRepository.hardDelete(id)` (permanent
  removal), AND the **first DELETE smoke with a
  query-flag-driven success-message dichotomy**
  (`'Category deactivated successfully'` vs
  `'Category permanently deleted'`). All three
  handlers share the SAME single-step inline
  `!session?.user?.isAdmin` gate and the SAME
  canonical longer 401 envelope, but each has its
  own divergent post-gate surface:
  (a) **GET** — no body parse, no query parse,
  calls `categoryRepository.findById(id)` with a
  404 `'Category not found'` branch, returns
  `{ success: true, data: <category> }`, catches
  with `safeErrorResponse(error, 'Failed to fetch
category')`;
  (b) **PUT** — JSON body parse via
  `await request.json()` AFTER the gate (NOT
  wrapped in a per-call try/catch — a malformed
  body would 500 via the outer catch on the auth
  branch), spreads `body.name` into an
  `UpdateCategoryRequest` with `id` from params,
  calls `categoryRepository.update(updateData)`,
  runs `await invalidateContentCaches()` on the
  success branch, returns `{ success: true,
data: <category>, message: 'Category updated
successfully' }`, has THREE message-pattern
  catch branches BEFORE the outer
  `safeErrorResponse(error, 'Failed to update
category')` catch (`'not found'` → 404,
  `'already exists'` → 409, `'must be'` → 400,
  each echoing the raw `error.message`);
  (c) **DELETE** — no body parse, parses
  `searchParams.get('hard') === 'true'` AFTER
  the gate, calls `categoryRepository.hardDelete(id)`
  if `hard === true` else
  `categoryRepository.delete(id)`, runs
  `await invalidateContentCaches()` on the
  success branch, returns `{ success: true,
message: 'Category permanently deleted' }`
  for `hard === true` or `{ success: true,
message: 'Category deactivated successfully' }`
  otherwise (NO `data` key — distinct from
  GET / PUT), has ONE message-pattern catch
  branch (`'not found'` → 404 echoing
  `error.message`) BEFORE the outer
  `safeErrorResponse(error, 'Failed to delete
category')` catch. The smoke spec pins per-
  method canonical-longer 401-envelope assertions,
  a cross-method envelope-equality assertion, a
  DELETE-query envelope-invariance assertion
  pinning that all `?hard=…` permutations round-
  trip to the SAME 401 envelope as the no-query
  baseline, a success-branch-key non-disclosure
  assertion across all three methods (and across
  both DELETE query branches), a gate-before-post-
  auth invariant pinning that NONE of the seven
  post-auth messages — including BOTH DELETE
  success messages — must appear in any unauth
  response, a per-id-shape status-stability
  comparison across all three methods, a PUT
  body-permutation status-stability comparison,
  a cross-method side-channel cookie / `X-*`
  header walk, a cross-method probe asserting
  POST / PATCH round-trip to `< 500`, a malformed-
  JSON-body invariance walk for PUT, a service-
  not-entered invariance walk pinning that NONE
  of the four repository calls (`findById` /
  `update` / `delete` / `hardDelete`) is entered
  on the unauth branch, a side-effects-not-
  entered invariance walk pinning that the
  `invalidateContentCaches()` call is unreachable
  on the unauth branch for both PUT and DELETE,
  and a per-handler catch-message-divergence walk
  pinning that NONE of the three distinct catch
  messages must appear in any unauth response —
  the **first triple-method admin smoke with a
  DELETE-only query-parameter branch and a
  query-flag-driven success-message dichotomy**
  the docs tree publishes.

- `docs/plugins` Added `admin-collections-id-items-method-spec.md` —
  the **twenty-seventh** per-source-file reference the docs
  tree publishes for any file under
  `apps/web-e2e/tests/` and the **twenty-fifth** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/admin-collections-id-items-method.spec.ts`
  spec covering the admin collection-items endpoint at
  `apps/web/app/api/admin/collections/[id]/items/route.ts`
  — the **first nested-`[id]/<sub-resource>` dual-
  method admin smoke** the docs tree publishes (every
  prior dynamic-segment admin smoke covers a
  `[id]/<sub-resource>` route as a SINGLE-method
  export; this is the first that combines `GET` +
  `POST` on a nested path). Both handlers share the
  SAME single-step inline `!session?.user?.isAdmin`
  gate and the SAME canonical longer 401 envelope,
  but each has its own divergent post-gate surface:
  (a) **GET** — no body parse, calls
  `collectionRepository.getAssignedItems(id)`, returns
  `{ success: true, items: [...] }` (success key is
  `items`, NOT `data` — distinct from every prior
  admin GET smoke), catches with
  `safeErrorResponse(error, 'Failed to fetch
collection items')`;
  (b) **POST** — parses JSON via
  `await request.json()`, validates
  `Array.isArray(body.itemIds)` → 400
  `'itemIds array is required'`, calls
  `collectionRepository.assignItems(id, body.itemIds)`,
  then runs `invalidateContentCaches()` + two
  `revalidatePath(...)` calls (`/collections` and
  `/collections/<slug>`), returns
  `{ success: true, collection, updatedItems,
message: 'Collection items updated successfully' }`
  (FOUR success-branch keys distinct from every prior
  admin POST smoke which uses at most three), catches
  with `safeErrorResponse(error, 'Failed to assign
collection items')`. The smoke spec pins per-method
  canonical-longer 401-envelope assertions, a cross-
  method envelope-equality assertion, a success-
  branch-key non-disclosure assertion that NONE of
  the route-specific `items`, `collection`,
  `updatedItems` keys plus `message` and
  `success: true` must appear in any unauth response,
  a gate-before-post-auth invariant pinning that
  NONE of the four post-auth messages must appear in
  any unauth response, a per-nested-id-shape status-
  stability comparison, a POST body-permutation
  status-stability comparison, a cross-method side-
  channel cookie / `X-*` header walk, a cross-method
  probe asserting PUT / PATCH / DELETE round-trip to
  `< 500`, a malformed-JSON-body invariance walk for
  POST, a service-not-entered invariance walk, and a
  side-effects-not-entered invariance walk pinning
  that the `invalidateContentCaches()` +
  `revalidatePath(...)` chain is unreachable on the
  unauth branch — the **first nested-
  `[id]/<sub-resource>` dual-method admin smoke** the
  docs tree publishes.

- `docs/plugins` Added `admin-users-id-method-spec.md` —
  the **twenty-sixth** per-source-file reference the docs
  tree publishes for any file under
  `apps/web-e2e/tests/` and the **twenty-fourth** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/admin-users-id-method.spec.ts`
  spec covering the admin single-user CRUD endpoint at
  `apps/web/app/api/admin/users/[id]/route.ts` — the
  **third triple-method admin-tree smoke** the docs
  tree publishes (after `admin-items-id-method-spec.md`
  and `admin-clients-clientid-method-spec.md`) but the
  **first** that combines a **two-step gate**
  (`!session?.user` → 401 `'Unauthorized'`, then
  `!session.user.isAdmin` → 403 `'Forbidden'`), a
  **hybrid 401 envelope**
  `{ success: false, error: 'Unauthorized' }` (bare
  message PLUS `success: false` key — distinct from
  both the canonical-longer envelope of
  `admin/items/[id]` AND the no-`success`-key bare
  envelope of `admin/clients/[clientId]`), an
  **eight-step PUT body-validation chain** with
  handler-specific error messages for each branch
  (a-h: object-shape / email / username / name /
  title / avatar / role-DB-lookup / status-enum), a
  **DELETE self-deletion guard**
  (`session.user.id === id` → 400 `'Cannot delete your
own account'` — a unique safety check no other
  admin-tree route enforces), and an
  **`error.message`-pass-through catch posture** on
  PUT and DELETE that returns 400 with the raw error
  message instead of a fixed 500 string when the
  error is an `Error` instance. Documents the unique
  combination of (1) **`[id]` dynamic-segment param
  name with two-step gate**;
  (2) **two-step gate** with bare-message +
  `success: false` envelope key;
  (3) **hybrid 401 envelope**
  `{ success: false, error: 'Unauthorized' }` matching
  the `admin/roles/[id]/permissions` envelope;
  (4) **eight-step PUT body-validation chain** AFTER
  the gate AND AFTER params resolution AND AFTER the
  body parse, with the role-validation step issuing
  a `roleRepository.findById(body.role)` DB lookup
  that returns 400 `'Invalid role'` if not found —
  the **first DB-lookup body-validation step admin-
  tree smoke** the docs tree publishes;
  (5) **DELETE self-deletion guard** — a unique
  safety check no other admin-tree route enforces;
  (6) **`error.message`-pass-through catch** on PUT
  and DELETE — distinct from every prior smoke's
  fixed-message catch;
  (7) **GET success payload**
  `{ success: true, data: <user> }`;
  (8) **PUT success payload**
  `{ success: true, data: <updatedUser> }` (NO
  `message` key);
  (9) **DELETE success payload**
  `{ success: true, message: 'User deleted
successfully' }` (NO `data` key);
  (10) **method-resolution surface** with `GET` /
  `PUT` / `DELETE`-only export. The smoke spec pins
  per-method hybrid 401-envelope assertions across
  GET / PUT / DELETE, a strict envelope-shape
  assertion, a cross-method envelope-equality
  assertion, an unauth-lands-on-401-not-403
  invariant pinning that the response must NEVER be
  403 and must NEVER echo `'Forbidden'`, a success-
  branch-key non-disclosure assertion across all
  three methods, a gate-before-post-auth invariant
  pinning that NONE of the twelve post-auth messages
  must appear in any unauth response, a per-id-shape
  status-stability comparison, a PUT body-
  permutation status-stability comparison, a cross-
  method side-channel cookie / `X-*` header walk, a
  cross-method probe asserting POST / PATCH round-
  trip to `< 500`, a malformed-JSON-body invariance
  walk for PUT, a service-not-entered invariance walk
  across all three repository calls, a gate-before-
  eight-step-validation invariance walk pinning that
  EVERY step-(a)–(h) probe round-trips to the same
  401 status, and a DELETE self-deletion-guard
  invariance walk pinning that every id shape —
  including session-shaped ids that would trigger
  the guard on the auth branch — round-trips to the
  same 401 status — the **first hybrid-envelope two-
  step-gated triple-method admin-tree smoke** the
  docs tree publishes.

- `docs/plugins` Added `admin-clients-clientid-method-spec.md` —
  the **twenty-fifth** per-source-file reference the docs
  tree publishes for any file under
  `apps/web-e2e/tests/` and the **twenty-third** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/admin-clients-clientid-method.spec.ts`
  spec covering the admin single-client profile CRUD
  endpoint at
  `apps/web/app/api/admin/clients/[clientId]/route.ts`
  — the **second triple-method admin-tree smoke** the
  docs tree publishes (after
  `admin-items-id-method-spec.md`) but the **first**
  that exposes the bare `{ error: 'Unauthorized' }`
  envelope (NO `success: false` key) AND uses a non-
  canonical `[clientId]` dynamic-segment param name
  (every prior dynamic-segment admin smoke uses
  `[id]`). All three handlers share the SAME single-
  step inline `!session?.user?.isAdmin` gate but the
  401 envelope is the **bare**
  `{ error: 'Unauthorized' }` (NO `success: false`
  key) — distinct from every prior dynamic-segment-
  `[id]` admin smoke. Documents the unique combination
  of (1) **`[clientId]` dynamic-segment param name**;
  (2) **bare `{ error: 'Unauthorized' }` envelope**
  with NO `success` key on the 401 branch — distinct
  from the canonical-longer envelope of the sibling
  triple-method `admin/items/[id]` route;
  (3) **direct query-function calls**
  (`getClientProfileById` / `updateClientProfile` /
  `deleteClientProfile` from `@/lib/db/queries`)
  instead of a repository class;
  (4) **`console.error` + bare `{ error: '<msg>' }`
  500 catch** with handler-specific messages
  (`'Failed to fetch client'` /
  `'Failed to update client'` /
  `'Failed to delete client'`) — distinct from the
  `safeErrorResponse(...)` catch of the sibling
  route;
  (5) **GET success payload**
  `{ success: true, data: <client> }`;
  (6) **PUT success payload**
  `{ success: true, data: <client> }` (NO `message`
  key — distinct from the sibling `admin/items/[id]`
  PUT which includes `'Item updated successfully'`);
  (7) **DELETE success payload**
  `{ success: true, message: 'Client deleted
successfully' }` (NO `data` key);
  (8) **PUT CRM-sync side effect** — two-step
  (company → person) chain wrapped in its own try/
  catch, gated by `process.env.TWENTY_CRM_ENABLED
!== 'false'`, distinct from the sibling route's
  single-step (company-only) sync;
  (9) **method-resolution surface** with `GET` /
  `PUT` / `DELETE`-only export. The smoke spec pins
  per-method bare 401-envelope assertions across
  GET / PUT / DELETE pinning the divergence vs the
  canonical longer envelope, a strict envelope-shape
  assertion `Object.keys(body) === ['error']` with
  `body.success` undefined, a cross-method envelope-
  equality assertion pinning that all three handlers
  emit byte-identical 401 envelopes, a success-
  branch-key non-disclosure assertion across all
  three methods, a gate-before-post-auth invariant
  pinning that NONE of the five post-auth messages
  must appear in any unauth response, a per-
  clientId-shape status-stability comparison across
  all three methods, a PUT body-permutation status-
  stability comparison, a cross-method side-channel
  cookie / `X-*` header walk, a cross-method probe
  asserting POST / PATCH round-trip to `< 500`, a
  malformed-JSON-body invariance walk for PUT, a
  service-not-entered invariance walk across all
  three query-function calls, and a per-handler
  catch-message-divergence walk — the **first bare-
  envelope-no-success-key triple-method admin-tree
  smoke** the docs tree publishes.

- `docs/plugins` Added `admin-items-id-method-spec.md` —
  the **twenty-fourth** per-source-file reference the docs
  tree publishes for any file under
  `apps/web-e2e/tests/` and the **twenty-second** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/admin-items-id-method.spec.ts`
  spec covering the admin single-item CRUD endpoint at
  `apps/web/app/api/admin/items/[id]/route.ts` — the
  **first triple-method admin-tree smoke** the docs
  tree publishes (every prior dynamic-segment admin-id
  smoke pins a single-method export; the
  `admin-roles-id-permissions-method-spec.md` smoke
  pins a dual-method `GET` + `PUT` export; this route
  ships THREE distinct HTTP-verb handlers `GET` +
  `PUT` + `DELETE` from a single file). All three
  handlers share the SAME inline
  `!session?.user?.isAdmin` gate, the SAME canonical
  longer 401 envelope, and the SAME
  `{ success: false, error: ... }` envelope shape, but
  each has its own divergent post-gate surface:
  (a) **GET** — no body parse, calls
  `itemRepository.findById(id)` with a 404 `'Item not
found'` branch, returns `{ success: true, data:
<item> }`, catches with `safeErrorResponse(error,
'Failed to fetch item')`;
  (b) **PUT** — parses JSON via `await request.json()`
  (NOT wrapped in a per-call try/catch — a malformed
  body would 500 via the outer catch on the auth
  branch), spreads body into an `UpdateItemRequest`,
  builds an audit-user from
  `session.user.id` / `name` / `email`, calls
  `itemRepository.update(id, updateData, auditUser)`,
  optionally syncs to Twenty CRM (gated by
  `process.env.TWENTY_CRM_ENABLED !== 'false'` and a
  body `brand` field) and to the Location Index
  (gated by `getLocationEnabled()`), returns
  `{ success: true, data: <item>, message: 'Item
updated successfully' }`, catches with
  `safeErrorResponse(error, 'Failed to update
item')`;
  (c) **DELETE** — no body parse, builds the same
  audit-user, calls `itemRepository.delete(id,
auditUser)`, optionally removes from the Location
  Index, returns `{ success: true, message: 'Item
deleted successfully' }` (NOTE: NO `data` key —
  distinct from GET / PUT success payloads), catches
  with `safeErrorResponse(error, 'Failed to delete
item')`. The smoke spec pins per-method canonical-
  longer 401-envelope assertions across GET / PUT /
  DELETE, a cross-method envelope-equality assertion
  pinning that all three handlers emit byte-identical
  401 envelopes, a strict envelope-shape assertion
  `Object.keys(body).sort() === ['error', 'success']`,
  a success-branch-key non-disclosure assertion
  across all three methods, a gate-before-post-auth
  invariant pinning that NONE of the six post-auth
  messages (`'Item not found'`, `'Failed to fetch
item'`, `'Failed to update item'`, `'Failed to
delete item'`, `'Item updated successfully'`,
  `'Item deleted successfully'`) must appear in any
  unauth response, a per-id-shape status-stability
  comparison across all three methods, a PUT body-
  permutation status-stability comparison, a cross-
  method side-channel cookie / `X-*` header walk, a
  cross-method probe asserting POST / PATCH round-
  trip to `< 500`, a malformed-JSON-body invariance
  walk for PUT, a service-not-entered invariance walk
  across all three repository calls, and a per-
  handler catch-message-divergence walk pinning that
  NONE of the three distinct catch messages must
  appear in any unauth response — the **first
  triple-method admin-tree smoke** the docs tree
  publishes.

- `docs/plugins` Added `admin-roles-id-permissions-method-spec.md` —
  the **twenty-third** per-source-file reference the docs
  tree publishes for any file under
  `apps/web-e2e/tests/` and the **twenty-first** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/admin-roles-id-permissions-method.spec.ts`
  spec covering the admin role-permissions endpoint at
  `apps/web/app/api/admin/roles/[id]/permissions/route.ts`
  — the **first** admin-tree route the smoke layer
  covers that combines (1) a dynamic-segment `[id]`
  handler exporting BOTH a `GET` and a `PUT` (a true
  **dual-method** surface, distinct from every prior
  single-method admin-id smoke), AND (2) an auth gate
  that delegates to the **`checkAdminAuth()` helper**
  at `apps/web/lib/auth/admin-guard.ts` (NOT inline
  `!session?.user?.isAdmin`), AND (3) a **shorter
  `'Unauthorized'` 401 envelope** (NOT the canonical
  longer `'Unauthorized. Admin access required.'`
  envelope that every prior admin-id smoke pins),
  AND (4) an **imperative permissions-array
  validation** against `isValidPermission(permission)`
  from `apps/web/lib/permissions/definitions.ts` (NOT
  a Zod `safeParse(...)` schema, NOT a manual
  `['approved', 'rejected'].includes(...)` allowlist).
  Documents the unique combination of
  (1) **dual-method GET + PUT exports**;
  (2) **`checkAdminAuth()` helper-driven envelope**
  with three distinct branches: 401 `'Unauthorized'`
  (no session), 401 `'User ID not found'` (session but
  no id), 403 `'Insufficient permissions'` (session +
  id but `!isAdmin`) — distinct from every prior admin-
  tree route which returns 401 for both unauth AND
  non-admin-auth;
  (3) **shorter `'Unauthorized'` 401 envelope** —
  distinct from the canonical longer
  `'Unauthorized. Admin access required.'` envelope
  every prior admin-id smoke pins;
  (4) **`success: false` envelope key**;
  (5) **imperative `isValidPermission(permission)`
  validation** AFTER the gate, with **side-channel
  `invalidPermissions` array** echoed in the 400
  envelope — a UNIQUE envelope key no prior admin-tree
  smoke pins;
  (6) **service-call surface** with
  `roleService.findById(id)` (GET) and
  `roleService.updateRole(id, ...)` (PUT) both
  delegating to `RoleDbService`;
  (7) **method-resolution surface** with `GET + PUT`
  exports (POST / PATCH / DELETE NOT exported). The
  smoke spec pins the gate-before-post-auth invariant
  that NONE of the eight post-gate messages must
  appear in the unauth response body, the gate-before-
  params-resolution invariant pinning that every id
  shape round-trips to the same 401 status across
  BOTH methods, the gate-before-body-parse invariant
  pinning that malformed JSON bodies do NOT surface a
  400 on PUT, the gate-before-service invariant
  pinning that the unauth response does NOT echo a
  `data` key from the service payload, the gate-
  before-validation invariant pinning that every
  `permissions` shape (missing + valid + empty +
  single-invalid + non-array string / null / numeric
  / object / numeric-array) round-trips to the same
  401 status on PUT, the cross-method envelope-
  equality invariant pinning that GET / PUT return
  observably the same body on the unauth branch
  (shared `checkAdminAuth()` helper), the side-channel
  `invalidPermissions` non-disclosure invariant
  pinning that the auth-branch validation echo NEVER
  appears on the unauth branch, and the first-branch
  landing invariant pinning that every probe from the
  cookie-less smoke harness lands on the FIRST
  `checkAdminAuth()` branch (the 401 `'Unauthorized'`
  no-session envelope) — NOT the SECOND (`'User ID
not found'`) and NOT the THIRD (`'Insufficient
permissions'` 403) — the **first dual-method
  `checkAdminAuth()`-helper admin-tree smoke** the
  docs tree publishes.
- `docs/plugins` Added `admin-sponsor-ads-id-cancel-method-spec.md` —
  the **twenty-second** per-source-file reference the docs
  tree publishes for any file under
  `apps/web-e2e/tests/` and the **twentieth** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/admin-sponsor-ads-id-cancel-method.spec.ts`
  spec covering the admin sponsor-ad cancellation
  endpoint at
  `apps/web/app/api/admin/sponsor-ads/[id]/cancel/route.ts`
  — the **first** admin-tree route the smoke layer
  covers that combines a dynamic-segment `[id]` `POST`
  handler with a **pure single-step
  `!session?.user?.isAdmin` gate** (NOT the compound
  `!isAdmin || !id` gate of the sibling `approve` /
  `reject` routes), AND a Zod-`safeParse(...)` body
  validation against an **optional-only** schema
  (`cancelReason` has only `maxLength: 500` and is NOT
  required), AND a **reverse-ordered two-branch catch
  chain** that puts the not-found 404 branch BEFORE
  the `'Cannot cancel'` 400 branch — distinct from the
  sibling `reject` route which puts `'Cannot reject'`
  400 BEFORE `'Sponsor ad not found'` 404.
  Documents the unique combination of
  (1) **dynamic-segment `[id]` `POST` handler**;
  (2) **pure single-step `!session?.user?.isAdmin`
  gate**;
  (3) **canonical longer 401 message** and
  **`success: false` envelope key**;
  (4) **body parse via `.catch(() => ({}))`**;
  (5) **Zod-`safeParse(...)` body validation** AFTER
  the gate;
  (6) **optional-only `cancelReason`** with
  `maxLength: 500` constraint — a missing / undefined
  / null `cancelReason` would pass validation on the
  auth branch — the **first optional-Zod-field admin-
  tree smoke** the docs tree publishes;
  (7) **service-call surface** with
  `sponsorAdService.cancelSponsorAd(id,
validationResult.data.cancelReason)` (NOTE: no
  `session.user.id` audit-user threaded through,
  distinct from the sibling `approve` / `reject`
  routes);
  (8) **reverse-ordered two-branch catch chain**
  mapping `'Sponsor ad not found'` → 404 FIRST, then
  `error.message.includes('Cannot cancel')` → 400,
  with `safeErrorResponse(error, 'Failed to cancel
sponsor ad')` fallback — distinct from the sibling
  `reject` route's order;
  (9) **service-zero-rows fallback** returning 500;
  (10) **method-resolution surface** with `POST`-only
  export. The smoke spec pins the gate-before-post-
  auth invariant that NONE of the four post-gate
  messages must appear in the unauth response body,
  the gate-before-params-resolution invariant pinning
  that every id shape round-trips to the same 401
  status, the gate-before-body-parse invariant pinning
  that malformed JSON bodies do NOT surface a 400, the
  gate-before-service invariant pinning that the
  unauth response does NOT echo a `data` key from the
  service payload, and the gate-before-Zod-validation
  invariant pinning that every `cancelReason` shape
  (missing + empty + null + valid + 500-char-boundary - 501-char-too-long + numeric) round-trips to the
  same 401 status — the **first optional-Zod-field
  admin-tree smoke** the docs tree publishes.

- `docs/plugins` Added `admin-sponsor-ads-id-reject-method-spec.md` —
  the **twenty-first** per-source-file reference the docs
  tree publishes for any file under
  `apps/web-e2e/tests/` and the **nineteenth** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/admin-sponsor-ads-id-reject-method.spec.ts`
  spec covering the admin sponsor-ad rejection endpoint
  at
  `apps/web/app/api/admin/sponsor-ads/[id]/reject/route.ts`
  — the **first** admin-tree route the smoke layer
  covers that combines a dynamic-segment `[id]` `POST`
  handler with a **Zod-`safeParse(...)` body
  validation** AFTER the gate AND AFTER params
  resolution AND AFTER the body parse, AND a
  **two-branch catch chain** that maps two distinct
  service-thrown `Error.message` values to two distinct
  HTTP envelopes. Sibling of
  `admin-sponsor-ads-id-approve-method-spec.md` sharing
  the SAME compound single-`if` gate, the SAME
  canonical longer 401 envelope, and the SAME
  `{ success: false, error: ... }` envelope shape.
  Documents the unique combination of
  (1) **dynamic-segment `[id]` `POST` handler**;
  (2) **compound single-`if` gate**
  `!session?.user?.isAdmin || !session.user.id`;
  (3) **canonical longer 401 message**
  `'Unauthorized. Admin access required.'` and
  **`success: false` envelope key** with strict
  envelope-shape assertion;
  (4) **body parse via `.catch(() => ({}))`** Promise-
  chain catch — a single-expression catch that returns
  an empty object on parse failure, distinct from the
  inner try/catch block of the `approve` route;
  (5) **Zod-`safeParse(...)` body validation** AFTER
  the gate and AFTER params resolution and AFTER the
  body parse, with a 400 response that echoes
  `validationResult.error.issues[0]?.message ||
'Invalid request body'` — a **dynamic** error
  message drawn from the Zod schema, distinct from the
  hand-rolled string literals of every prior admin-
  tree smoke — the **first Zod-`safeParse(...)`
  admin-tree smoke** the docs tree publishes;
  (6) **schema constraints** — `rejectionReason` is
  required with `minLength: 10` and `maxLength: 500`,
  with `id` from `params` co-validated through the
  schema;
  (7) **service-call surface** AFTER both the gate AND
  the Zod validation with
  `sponsorAdService.rejectSponsorAd(id,
session.user.id, validationResult.data.rejectionReason)`,
  success-branch payload
  `{ success: true, data: <ad>, message: 'Sponsor ad
rejected successfully' }`;
  (8) **two-branch catch chain** mapping
  `error.message.includes('Cannot reject')` → 400,
  `'Sponsor ad not found'` → 404, with
  `safeErrorResponse(error, 'Failed to reject sponsor
ad')` fallback — a complementary surface to the
  three-branch catch chain of the sibling `approve`
  route;
  (9) **service-zero-rows fallback** returning 500;
  (10) **method-resolution surface** with `POST`-only
  export. The smoke spec pins the gate-before-post-
  auth invariant that NONE of the four post-gate
  messages must appear in the unauth response body,
  the gate-before-params-resolution invariant pinning
  that every id shape round-trips to the same 401
  status, the gate-before-body-parse invariant pinning
  that malformed JSON bodies do NOT surface a 400, the
  gate-before-service invariant pinning that the
  unauth response does NOT echo a `data` key from the
  service payload, and the gate-before-Zod-validation
  invariant pinning that every `rejectionReason`
  shape (valid 70-char + 10-char-min boundary + 5-
  char-too-short + empty + null + numeric + 501-char-
  too-long + missing) round-trips to the same 401
  status — the **first Zod-`safeParse(...)` admin-
  tree smoke** the docs tree publishes.

- `docs/plugins` Added `admin-sponsor-ads-id-approve-method-spec.md` —
  the **twentieth** per-source-file reference the docs
  tree publishes for any file under
  `apps/web-e2e/tests/` and the **eighteenth** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/admin-sponsor-ads-id-approve-method.spec.ts`
  spec covering the admin sponsor-ad approval endpoint
  at
  `apps/web/app/api/admin/sponsor-ads/[id]/approve/route.ts`
  — the **first** admin-tree route the smoke layer
  covers that combines a dynamic-segment `[id]` `POST`
  handler with a **forgiving body parse inside its own
  try/catch** AFTER the gate AND AFTER params
  resolution, AND a **multi-error-code catch chain**
  that maps three distinct service-thrown
  `Error.message` values to three distinct HTTP
  envelopes. Documents the unique combination of
  (1) **dynamic-segment `[id]` `POST` handler**
  (sibling of `admin/items/[id]/review`);
  (2) **compound single-`if` gate**
  `!session?.user?.isAdmin || !session.user.id`,
  observably equivalent to the single-step gate from
  the unauth client's perspective;
  (3) **canonical longer 401 message**
  `'Unauthorized. Admin access required.'`;
  (4) **`success: false` envelope key** on the 401
  branch with strict envelope-shape assertion
  `Object.keys(body).sort() === ['error', 'success']`;
  (5) **params resolution AFTER the gate**;
  (6) **body parse inside its own try/catch** AFTER
  params AND AFTER the gate — `forceApprove` defaults
  to `false` if the body is missing, malformed, or
  omits the key;
  (7) **service-call surface** AFTER both the gate AND
  the body parse with
  `sponsorAdService.approveSponsorAd(id,
session.user.id, forceApprove)`, success-branch
  payload
  `{ success: true, data: <ad>, message: 'Sponsor ad
approved and activated successfully' }`;
  (8) **multi-error-code catch chain** mapping
  `'Sponsor ad not found'` → 404,
  `'PAYMENT_NOT_RECEIVED'` → 400,
  `error.message.includes('Cannot approve')` → 400,
  with `safeErrorResponse(error, 'Failed to approve
sponsor ad')` fallback — the **first multi-error-
  code catch chain admin-tree smoke** the docs tree
  publishes;
  (9) **service-zero-rows fallback** returning 500
  `{ success: false, error: 'Failed to approve
sponsor ad' }`;
  (10) **method-resolution surface** with `POST`-only
  export. The smoke spec pins the gate-before-post-
  auth invariant that NONE of the four post-gate
  messages must appear in the unauth response body,
  the gate-before-params-resolution invariant pinning
  that every id shape round-trips to the same 401
  status, the gate-before-body-parse invariant pinning
  that malformed JSON bodies do NOT surface a 400, the
  gate-before-service invariant pinning that the
  unauth response does NOT echo a `data` key from the
  service payload, and the gate-before-flag-evaluation
  invariant pinning that every `forceApprove` shape
  (true/false/string/numeric/null/missing) round-trips
  to the same 401 status — the **first multi-error-
  code catch chain admin-tree smoke** the docs tree
  publishes.

- `docs/plugins` Added `admin-notifications-id-read-method-spec.md` —
  the **nineteenth** per-source-file reference the docs
  tree publishes for any file under
  `apps/web-e2e/tests/` and the **seventeenth** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/admin-notifications-id-read-method.spec.ts`
  spec covering the admin single-notification mark-as-
  read endpoint at
  `apps/web/app/api/admin/notifications/[id]/read/route.ts`
  — the **first** admin-tree route the smoke layer
  covers that combines a **dynamic-segment `[id]`
  `PATCH` handler** with the **two-step
  `!session?.user?.id` → `!tenantId` gate** envelope.
  Documents the unique combination of:
  (1) **dynamic-segment `[id]` `PATCH` handler** — the
  **first** dynamic-segment `PATCH` handler the admin-
  tree smoke layer pins, distinct from the static-path
  PATCH of `admin/notifications/mark-all-read`, the
  dynamic-segment `POST` of `admin/items/[id]/review`,
  and the dynamic-segment `GET` of
  `admin/items/[id]/history`;
  (2) **two-step gate** (`!session?.user?.id` → 401
  `'Unauthorized'`, then AFTER params and AFTER 400
  missing-id branch: `!tenantId` → 403
  `'Tenant not found'`) — SAME envelope as the sibling
  `admin/notifications/mark-all-read`;
  (3) **bare `'Unauthorized'` 401 message** — matching
  the sibling `admin/notifications/mark-all-read`,
  distinct from the canonical longer
  `'Unauthorized. Admin access required.'` of the
  single-step-gated routes;
  (4) **bare `{ error: ... }` envelope** with NO
  `success` key — matching the sibling
  `admin/notifications/mark-all-read`;
  (5) **path-id surface** — the handler reads `id`
  from `await params` AFTER the auth gate;
  (6) **tenant-resolution surface** AFTER params and
  AFTER the 400 missing-id branch;
  (7) **DB-update surface** AFTER both gates — the
  handler issues a Drizzle `db.update(notifications)`
  with `set({ isRead: true, readAt: ..., updatedAt: ... })`
  and a three-clause `where` (id + userId + tenantId),
  then `.returning()`, with success-branch payload
  `{ success: true, notification: <row> }`;
  (8) **`console.error` + bare `'Internal server error'`
  catch** — matching the
  `admin/users/check-email` /
  `admin/users/check-username` catch family;
  (9) **method-resolution surface** with `PATCH`-only
  export. The smoke spec pins the gate-before-post-
  auth invariant that NONE of the four post-auth
  messages (`'Notification ID is required'`,
  `'Tenant not found'`, `'Notification not found'`,
  `'Internal server error'`) must appear in the unauth
  response body, the gate-before-params-resolution
  invariant pinning that every id shape (short slug,
  dashed slug, uuid, encoded slug, long padded slug)
  round-trips to the same 401 status, the gate-before-
  body-parse invariant pinning that malformed JSON
  bodies do NOT 400 with a JSON-parse error before the
  gate fires, and the gate-before-DB-update invariant
  pinning that the `db.update(notifications)
...returning()` call is NOT entered on the unauth
  branch — the **first dynamic-segment `[id]` `PATCH`
  admin-tree smoke** the docs tree publishes.

- `docs/plugins` Added `admin-items-import-validate-body-spec.md` —
  the **eighteenth** per-source-file reference the docs
  tree publishes for any file under
  `apps/web-e2e/tests/` and the **sixteenth** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/admin-items-import-validate-body.spec.ts`
  spec covering the admin items-import-validate (dry-run)
  endpoint at
  `apps/web/app/api/admin/items/import/validate/route.ts`
  — the **first** admin-tree route the smoke layer
  covers that combines a static-path `POST` handler with
  a **multipart/form-data body** parsed via
  `await request.formData()` AFTER the gate, distinct
  from every prior admin-tree smoke (which all parse
  JSON via `await request.json()`). Documents the
  unique combination of (1) **static-path `POST`
  handler** (sibling of the JSON-body
  `admin/items/import` route);
  (2) **single-step `auth()` chain** matching the
  canonical longer message family;
  (3) **canonical longer 401 message**
  `'Unauthorized. Admin access required.'`;
  (4) **`success: false` envelope key** on the 401
  branch with a strict envelope-shape assertion
  `Object.keys(body).sort() === ['error', 'success']`;
  (5) **body parse via `await request.formData()`
  AFTER the gate** — the **first** admin-tree smoke
  spec that documents a `formData()`-based body parse;
  (6) **five-step file / mapping validation chain**
  with five distinct 400 messages (`'No file
provided.'`, `'Invalid file type. Only CSV and XLSX
files are supported.'`, `'File too large. Maximum
size is 10 MB.'`, `'Invalid column mapping JSON.'`,
  `'File contains no data rows.'`) — the **first
  five-step file/mapping-validation admin-tree smoke**
  the docs tree publishes;
  (7) **service-call surface** AFTER the gate AND
  AFTER every validation step — the handler
  instantiates `new ItemImportService()` and calls
  `parseCSV(...)` / `parseXLSX(...)` followed by
  `validateRows(...)`, with success-branch payload
  `{ success: true, headers, suggestedMapping,
validationResults, summary }` (four success-branch
  keys plus the `success: true` flag);
  (8) **`safeErrorResponse(error, 'Failed to validate
import file')` catch** matching the
  `admin/items/import`, `admin/items/bulk`, and
  `admin/items/[id]/history` catch family;
  (9) **method-resolution surface** with `POST`-only
  export. The smoke spec pins the gate-before-formData-
  parse invariant that malformed multipart bodies do
  NOT 400 with a parse error before the gate fires,
  the gate-before-validation invariant pinning that
  ALL FIVE 400 messages must NEVER appear in the
  unauth response body, the gate-before-service
  invariant pinning that none of the four success-
  branch keys (`headers`, `suggestedMapping`,
  `validationResults`, `summary`) must appear in the
  unauth response body, the gate-before-extension-
  whitelist invariant pinning that every extension
  shape (whitelisted `.csv` / `.xlsx` / `.xls` plus
  non-whitelisted `.txt` / `.json` / `.pdf` /
  extensionless) round-trips to the same 401 status,
  the gate-before-mapping-parse invariant pinning that
  every `mapping` shape (valid + invalid + broken +
  empty + missing) round-trips to the same 401 status,
  and the gate-before-default-fallback invariant
  pinning that every `duplicateStrategy` /
  `defaultStatus` shape (valid + invalid + falsy)
  round-trips to the same 401 status — the **first
  multipart/form-data admin-tree smoke** the docs
  tree publishes.

- `docs/plugins` Added `admin-items-import-body-spec.md` —
  the **seventeenth** per-source-file reference the docs
  tree publishes for any file under
  `apps/web-e2e/tests/` and the **fifteenth** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/admin-items-import-body.spec.ts`
  spec covering the admin items-import-execute endpoint
  at `apps/web/app/api/admin/items/import/route.ts`
  — the **first** admin-tree route the smoke layer
  covers that combines a static-path `POST` handler with
  a **two-step body validation chain** AFTER the gate
  AND AFTER the body parse, distinct from the
  **single-step** body validation of
  `admin/items/[id]/review`, the **three-step** body
  validation of `admin/categories/reorder`, and the
  **six-step** body validation of `admin/items/bulk`.
  Documents the unique combination of
  (1) **static-path `POST` handler** distinct from the
  dynamic-segment `[id]` routes covered by
  `admin-items-id-review-body-spec.md` and
  `admin-items-id-history-query-spec.md`;
  (2) **single-step `auth()` chain** matching the
  canonical longer message family;
  (3) **canonical longer 401 message**
  `'Unauthorized. Admin access required.'`;
  (4) **`success: false` envelope key** on the 401
  branch with a strict envelope-shape assertion
  `Object.keys(body).sort() === ['error', 'success']`;
  (5) **body parse via `await request.json()` AFTER
  the gate**;
  (6) **two-step body validation chain** with two
  distinct 400 messages (`'Missing or invalid rows
array.'` on `!body.rows || !Array.isArray(body.rows)`,
  `'Missing import options.'` on `!body.options`) —
  the **first two-step body-validation admin-tree
  smoke** the docs tree publishes;
  (7) **service-call surface** AFTER the gate AND
  AFTER both validation steps — the handler
  instantiates `new ItemImportService()` and calls
  `executeImport(rows, options)` with the body's
  `rows` and the body's `options` merged with three
  defaults (`duplicateStrategy ||= 'skip'`,
  `defaultStatus ||= 'draft'`,
  `submittedBy = session.user.email || 'admin'`),
  with success-branch payload
  `{ success: true, result }` where `result` is the
  `ImportExecutionResult`;
  (8) **`safeErrorResponse(error, 'Failed to execute import')`
  catch** matching the `admin/items/bulk` and
  `admin/items/[id]/history` catch family;
  (9) **method-resolution surface** with `POST`-only
  export. The smoke spec pins the gate-before-body-
  validation invariant that BOTH 400 messages must
  NEVER appear in the unauth response body, the gate-
  before-service invariant that the `result` key
  must NEVER appear in the unauth response body, the
  gate-before-default-fallback invariant pinning that
  every `duplicateStrategy` / `defaultStatus` shape
  (valid + invalid + falsy) round-trips to the same
  401 status, and the gate-before-streaming invariant
  pinning that 10-row and 100-row bodies round-trip
  to the same status as the empty-rows baseline —
  the **first two-step-body-validation admin-tree
  smoke** the docs tree publishes.

## 2026-05-03

- `docs/plugins` Added `admin-items-id-history-query-spec.md` —
  the **sixteenth** per-source-file reference the docs
  tree publishes for any file under
  `apps/web-e2e/tests/` and the **fourteenth** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/admin-items-id-history-query.spec.ts`
  spec covering the admin item-audit-history endpoint
  at `apps/web/app/api/admin/items/[id]/history/route.ts`
  — the **first** admin-tree route the smoke layer
  covers that combines a **dynamic-segment `[id]` `GET`
  handler** with **all four** of (a) an `auth()` gate,
  (b) a 404 item-existence branch, (c) a query-param
  surface, and (d) a per-key enum-validation 400
  branch. Documents the unique combination of
  (1) **dynamic-segment `GET` handler** distinct from
  the dynamic-segment `POST` route covered by
  `admin-items-id-review-body-spec.md`;
  (2) **single-step `auth()` chain** with the canonical
  longer envelope; (3) **canonical longer 401 message**
  matching the canonical-envelope family; (4) **`success: false`
  envelope key** on the 401 branch; (5) **item-existence
  check via `itemRepository.findById(itemId, true)`
  AFTER the gate AND AFTER `await params`** -- the
  **first** admin-tree route the smoke layer covers
  that has a 404 item-existence branch between the
  gate and the query-param parse, with the boolean
  second argument `true` to `findById` opting the
  lookup into including soft-deleted items;
  (6) **query params parsed AFTER the existence check** —
  `searchParams.get('page')` / `searchParams.get('limit')` /
  `searchParams.get('action')` are all read AFTER
  the 404 branch; (7) **`page` clamping** via
  `Number.isNaN(rawPage) ? 1 : Math.max(1, rawPage)`
  (NaN-safe, defaults to 1, clamps to >= 1);
  (8) **`limit` clamping** via
  `Math.min(100, Math.max(1, Number.isNaN(rawLimit) ? 20 : rawLimit))`
  (NaN-safe, defaults to 20, clamps to 1..100);
  (9) **`action` enum-validation 400 branch** with a
  **dynamically-interpolated** message
  `Invalid action filter(s): <bad>. Valid actions are: <list>` —
  the **first** admin-tree route the smoke layer
  covers that emits a dynamic 400 message constructed
  from user-supplied bad-action strings;
  (10) **`itemAuditService.getHistory(...)` call** AFTER
  all four gates with success-branch payload
  `{ success: true, data: { logs, total, page, limit, totalPages } }`;
  (11) **`safeErrorResponse(error, 'Failed to fetch item history')`
  catch** matching the `admin/items/[id]/review` catch
  family; (12) **method-resolution surface** with
  `GET`-only export. The smoke spec asserts the
  gate-before-existence-check invariant pinning that
  the `'Item not found'` 404 message must NEVER appear
  in the unauth response body, the gate-before-query-parse
  invariant pinning that the dynamic 400 message must
  NEVER appear in the unauth response body, and the
  action-enum non-disclosure assertion that the six
  valid action names (`created`, `updated`,
  `status_changed`, `reviewed`, `deleted`, `restored`)
  must NEVER appear in the unauth response body via
  word-boundary regexes — the **first dynamic-segment-GET-with-404
  admin smoke** the docs tree publishes.

- `docs/plugins` Added `admin-clients-bulk-method-spec.md` —
  the **fifteenth** per-source-file reference the docs
  tree publishes for any file under
  `apps/web-e2e/tests/` and the **thirteenth** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/admin-clients-bulk-method.spec.ts`
  spec covering the admin clients-bulk-action endpoint
  at `apps/web/app/api/admin/clients/bulk/route.ts`
  — the **first** admin-tree route the smoke layer
  covers that exports **two HTTP methods on the same
  path** (`PUT` for bulk update **and** `DELETE` for
  bulk deletion), distinct from every prior admin-tree
  smoke spec which covers a single-method route.
  Documents the unique combination of (1) **dual-method
  export (`PUT` + `DELETE`)** with the cross-method
  probe walking exactly three remaining methods (`GET`
  / `POST` / `PATCH`); (2) **bare `'Unauthorized'` 401
  message** with bare `{ error: 'Unauthorized' }`
  envelope (no `success: false` key) — distinct from
  the canonical longer family of `admin/items/bulk`,
  `admin/categories/reorder`, and
  `admin/items/[id]/review`, and the same bare-message
  family as `admin/users/check-email`,
  `admin/users/check-username`, and
  `admin/notifications/mark-all-read`; (3) **single-step
  `auth()` chain with bare-message envelope** filling
  the previously-empty "single-step gate × bare
  envelope" quadrant in the admin-tree smoke matrix;
  (4) **body parse via `await request.json()` AFTER
  the gate AND inside the per-method `try` block** —
  the gate-then-parse-then-validate-then-loop order is
  the load-bearing invariant of both methods;
  (5) **single-step body validation** with one 400
  message `'Invalid request: clients array is required'`
  on `!Array.isArray(body.clients) || body.clients.length === 0`;
  (6) **per-client try/catch loop** collecting
  successes into a
  `results: { index, success: true, data | clientId }[]`
  array and failures into a
  `errors: { index, error, clientData }[]` array,
  distinct from the single-array `results: BulkActionResult[]`
  shape of `admin/items/bulk`; (7) **direct DB-helper
  call without a repository abstraction** —
  `updateClientProfile` / `deleteClientProfile`
  imported directly from `@/lib/db/queries`;
  (8) **per-method success-branch payload divergence**
  on the `message` template (`'Bulk update completed: ...'`
  vs `'Bulk deletion completed: ...'`) and the
  per-result inner key (`data: <clientProfile>` for
  `PUT` vs `clientId: <id>` for `DELETE`);
  (9) **per-method catch-branch envelope divergence**
  with each method's `try/catch` returning its own
  `safeErrorResponse(error, '<msg>')` envelope
  (`'Failed to process bulk update'` for `PUT`,
  `'Failed to process bulk deletion'` for `DELETE`)
  — the **first** admin-tree route the smoke layer
  covers with two distinct catch envelopes on the same
  path; (10) **`safeErrorMessage` + `safeErrorResponse`
  twin-import surface** matching the `admin/items/bulk`
  twin-import posture (the **second** admin-tree route
  the smoke layer covers that imports BOTH helpers);
  (11) **method-resolution surface** with `PUT` AND
  `DELETE` exports. The smoke spec asserts the
  cross-method response-parity invariant (the `PUT`
  and `DELETE` 401 envelopes must be byte-identical),
  the load-bearing invariant of the dual-method smoke
  layer.

- `docs/plugins` Added `admin-items-bulk-body-spec.md` —
  the **fourteenth** per-source-file reference the docs
  tree publishes for any file under
  `apps/web-e2e/tests/` and the **twelfth** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/admin-items-bulk-body.spec.ts`
  spec covering the admin items-bulk-action endpoint
  at `apps/web/app/api/admin/items/bulk/route.ts`
  — the **first** admin-tree route the smoke layer
  covers that pairs the static-path single-step-gate
  posture of the `admin/categories/reorder` and
  `admin/twenty-crm/test-connection` family with the
  **most-validation-step** body validation chain in
  the admin tree (six distinct 400 messages),
  distinct from the **immediately-preceding** dynamic-
  segment `admin-items-id-review-body-spec.md`.
  Documents the unique combination of (1) **`POST`
  handler with a static path** distinct from the
  dynamic `[id]` of `admin/items/[id]/review`;
  (2) **single-step `auth()` chain** matching the
  canonical longer message family
  (`if (!session?.user?.isAdmin)`); (3) **canonical
  longer `'Unauthorized. Admin access required.'`
  401 message** matching the
  `admin/categories/reorder`,
  `admin/items/[id]/review`, and `admin/twenty-crm/*`
  family; (4) **`success: false` envelope key**
  matching the same family, distinct from the bare
  `{ error: 'Unauthorized' }` envelope of the
  two-step-gated routes; (5) **body parse via
  `await request.json()` AFTER the gate** — the
  gate-then-parse-then-validate-then-loop order is
  the load-bearing invariant; (6) **six-step body
  validation chain** with six distinct 400 messages
  (`"Action must be 'approve', 'reject', or 'delete'"`,
  `'At least one item ID is required'`,
  `'Maximum 100 items per bulk action'`,
  `'All item IDs must be non-empty strings'`,
  `'Duplicate item IDs are not allowed'`,
  `'Rejection reason is required (minimum 10 characters)'`)
  — the **most validation messages** of any admin-
  tree route the smoke layer covers; (7) **per-id
  try/catch loop** — the **first** admin-tree route
  the smoke layer covers where individual id failures
  are collected into a `results: BulkActionResult[]`
  array rather than failing the whole request, with
  the per-id catch using
  `safeErrorMessage(error, 'Unknown error')` to
  extract the per-id error string; (8) **conditional
  repository routing on `action`** routing each id to
  one of `itemRepository.review(id, { status: 'approved' }, auditUser)`
  (with fire-and-forget
  `sendReviewNotification(item, 'approved')`),
  `itemRepository.review(id, { status: 'rejected', review_notes: trimmedReason }, auditUser)`
  (with fire-and-forget
  `sendReviewNotification(item, 'rejected', trimmedReason)`),
  or `itemRepository.delete(id, auditUser)` (no
  email side-effect), with success-branch payload
  `{ success: true, message: 'Bulk <action> completed: <successful> <past-tense>, <failed> failed', results, summary }`;
  (9) **`safeErrorResponse(error, 'Failed to process bulk action')`
  catch**; (10) **`safeErrorMessage` +
  `safeErrorResponse` twin-import surface** — the
  **only** admin route the smoke layer covers that
  imports BOTH helpers; (11) **method-resolution
  surface** with `POST`-only export. Pins the
  at-a-glance scenario tree (header / body bulk-loop
  walks asserting `< 500`; canonical-longer 401-
  envelope assertion; negative-property assertion on
  the success-branch `results` / `summary` keys;
  gate-before-body-validation invariant covering ALL
  six 400 messages; gate-before-catch, gate-before-
  body-parse, gate-before-bound-check, and gate-
  before-loop invariants; parameterised-vs-baseline
  status-stability; side-channel cookie / `X-*`
  header walk; cross-method probe; strict envelope-
  shape assertion). Cross-references the prior
  per-spec-file siblings and Spec 010 / Spec 009.

- `docs/plugins` Added `admin-items-id-review-body-spec.md` —
  the **thirteenth** per-source-file reference the docs
  tree publishes for any file under
  `apps/web-e2e/tests/` and the **eleventh** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/admin-items-id-review-body.spec.ts`
  spec covering the admin item-review endpoint at
  `apps/web/app/api/admin/items/[id]/review/route.ts`
  — the **first dynamic-segment** admin-tree route the
  smoke layer covers, distinct from the prior static-
  path specs. Documents the unique combination of (1)
  **`POST` handler with a dynamic `[id]` path
  parameter** with `{ params: Promise<{ id: string }> }`
  resolved AFTER the gate AND AFTER the body validation;
  (2) **single-step `auth()` chain** matching the
  `admin/categories/reorder` gate shape; (3) **canonical
  longer `'Unauthorized. Admin access required.'` 401
  message**; (4) **`success: false` envelope key**;
  (5) **body parse via `await request.json()` AFTER
  the gate**; (6) **single-step body validation** with
  the 400 message
  `"Review status must be either 'approved' or 'rejected'"`;
  (7) **`itemRepository.review(id, { status, review_notes }, auditUser)`
  call** followed by a fire-and-forget
  `EmailNotificationService.sendSubmissionDecisionEmail`
  side-effect with success-branch payload
  `{ success: true, data: <item>, message: 'Item <status> successfully' }`;
  (8) **`safeErrorResponse(error, 'Failed to review item')`
  catch**; (9) **method-resolution surface** with
  `POST`-only export. Pins the at-a-glance scenario
  tree (header / body bulk-loop walks asserting
  `< 500`; canonical-longer 401-envelope assertion;
  negative-property assertion on the success-branch
  keys; gate-before-body-validation, gate-before-
  catch, gate-before-body-parse, and gate-before-
  params-resolve invariants; parameterised-vs-baseline
  status-stability; side-channel cookie / `X-*`
  header walk; cross-method probe; strict envelope-
  shape assertion). Cross-references the prior
  per-spec-file siblings and Spec 010 / Spec 009.

- `docs/plugins` Added `admin-categories-reorder-method-spec.md` —
  the **twelfth** per-source-file reference the docs
  tree publishes for any file under
  `apps/web-e2e/tests/` and the **tenth** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/admin-categories-reorder-method.spec.ts`
  spec covering the admin categories-reorder endpoint
  at `apps/web/app/api/admin/categories/reorder/route.ts`
  — the **first** `PUT`-method admin-tree route the
  smoke layer covers, distinct from the prior `PATCH`-
  method spec for `admin/notifications/mark-all-read`.
  Documents the unique combination of (1) **`PUT`
  handler with `request: NextRequest` body-reading
  signature** distinct from the bare `PATCH()` of
  `admin/notifications/mark-all-read`; (2) **single-
  step `auth()` chain** that collapses unauthenticated
  and authenticated-non-admin into the same 401
  envelope, distinct from the two-step gates of
  `admin/notifications/mark-all-read`,
  `admin/users/check-email`, and
  `admin/users/check-username`; (3) **canonical
  longer `'Unauthorized. Admin access required.'`
  message** matching the `admin/twenty-crm/*` family,
  distinct from the bare `'Unauthorized'` message of
  the two-step-gated routes; (4) **`success: false`
  envelope key** matching the `admin/twenty-crm/test-connection`
  envelope, distinct from the bare
  `{ error: 'Unauthorized' }` envelope of
  `admin/notifications/mark-all-read` (no `success`
  key); (5) **body parse via `await request.json()`
  AFTER the gate** distinct from the bare
  `PATCH()` / `POST()` of the bare-handler routes
  which never read the body; (6) **three-step body
  validation** AFTER the gate AND AFTER the body
  parse with three distinct 400 messages
  (`'categoryIds must be an array'`,
  `'categoryIds array cannot be empty'`,
  `'All category IDs must be strings'`); (7)
  **`categoryRepository.reorder(categoryIds)` call**
  followed by `invalidateContentCaches()`, with
  success-branch payload
  `{ success: true, message: 'Categories reordered successfully' }`;
  (8) **`safeErrorResponse(error, 'Failed to reorder categories')`
  catch** distinct from the
  `console.error` + `'Internal server error'` catch
  of the sibling check-email / check-username routes;
  (9) **method-resolution surface** with `PUT`-only
  export, so every other method (`GET` / `POST` /
  `PATCH` / `DELETE`) must round-trip to 405. Documents
  the at-a-glance scenario tree (a ~18-header bulk-
  loop walk + a ~15-body bulk-loop walk both asserting
  `< 500`; a canonical-longer 401-envelope assertion;
  a negative-property assertion that the unauth
  response does NOT echo the success-branch
  `'Categories reordered successfully'` message; a
  gate-before-body-validation invariant pinning that
  the three 400 messages must NEVER appear in the
  unauth response body; a gate-before-catch invariant
  pinning that the `'Failed to reorder categories'`
  message must NEVER appear in the unauth response
  body; a parameterised-vs-baseline status-stability
  comparison; a side-channel cookie / `X-*` header
  walk; a cross-method probe asserting GET / POST /
  PATCH / DELETE round-trip to `< 500`; a strict
  envelope-shape assertion `Object.keys(body).sort() === ['error', 'success']`;
  a malformed-JSON-body invariance walk pinning the
  gate-before-body-parse order). Cross-references to
  the sibling per-spec-file references and to
  [Spec 010 — E2E Test Coverage](spec/010-e2e-test-coverage/spec.md)
  and [Spec 009 — Admin Dashboard](spec/009-admin-dashboard/spec.md)
  for the governing specs. With this entry the
  **per-spec-file docs rollout extends to
  12-of-N** and the **`tests/api/` per-spec-file
  sub-rollout extends to 10-of-many**, and the
  **first PUT-method admin-tree smoke** lands as
  the fourth HTTP-method-distinct posture the docs
  tree publishes (after the GET-tree query smokes,
  the POST-tree body smokes, and the PATCH-tree
  method smoke).

- `docs/plugins` Added `admin-notifications-mark-all-read-method-spec.md` —
  the **eleventh** per-source-file reference the docs
  tree publishes for any file under
  `apps/web-e2e/tests/` and the **ninth** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/admin-notifications-mark-all-read-method.spec.ts`
  spec covering the admin mark-all-notifications-read
  endpoint at
  `apps/web/app/api/admin/notifications/mark-all-read/route.ts`
  — the **first** admin-tree route the smoke layer
  covers that documents the unique combination of
  (1) **`PATCH` handler** (the first `PATCH`-only
  route the e2e suite exercises, distinct from
  every other admin-tree smoke spec which targets
  `GET` / `POST`); (2) **bare `PATCH()` handler
  signature** (no `request` parameter) narrowing
  the request surface to zero; (3) **two-step
  `auth()` chain that splits 401 vs 403 on the
  `tenantId` boundary** distinct from the sibling
  `admin/users/check-email` and `admin/users/check-username`
  routes' two-step gates that split on `isAdmin`;
  (4) **`'Tenant not found'` 403 envelope** distinct
  from the sibling routes' bare `'Forbidden'`
  message; (5) **direct Drizzle DB call without a
  repository abstraction** distinct from the
  sibling routes' repository abstractions; (6)
  **per-tenant scope on the success branch**; (7)
  **method-resolution surface** with `PATCH`-only
  export. Documents the at-a-glance scenario tree
  (a ~18-header bulk-loop walk + a ~8-body bulk-
  loop walk both asserting `< 500`; a bare 401-
  envelope assertion; a negative-property
  assertion that the unauth response does NOT
  echo the success-branch `success: true` /
  `updatedCount` keys; a gate-step-ordering
  invariant pinning that the 403 `'Tenant not
found'` envelope must NEVER appear in the unauth
  response body; a parameterised-vs-baseline
  status-stability comparison; a side-channel
  cookie / `X-*` header walk including fabricated
  `X-Tenant-Id` / `X-User-Id` / `Authorization:
Bearer` / `X-Api-Key` / `X-Admin-Token` headers;
  a cross-method probe asserting GET / POST / PUT
  / DELETE round-trip to `< 500`; a strict
  envelope-shape assertion). Cross-references to
  the sibling per-spec-file references and to
  [Spec 010 — E2E Test Coverage](spec/010-e2e-test-coverage/spec.md)
  and [Spec 009 — Admin Dashboard](spec/009-admin-dashboard/spec.md)
  for the governing specs. With this entry the
  **per-spec-file docs rollout extends to
  11-of-N** and the **`tests/api/` per-spec-file
  sub-rollout extends to 9-of-many**, and the
  **first PATCH-method admin-tree smoke** lands
  as the third HTTP-method-distinct posture the
  docs tree publishes (after the GET-tree query
  smokes and the POST-tree body smokes).

- `docs/plugins` Added `admin-users-check-username-body-spec.md` —
  the **tenth** per-source-file reference the docs
  tree publishes for any file under
  `apps/web-e2e/tests/` and the **eighth** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/admin-users-check-username-body.spec.ts`
  spec covering the admin check-username endpoint
  at `apps/web/app/api/admin/users/check-username/route.ts`
  — the **sibling** of `apps/web/app/api/admin/users/check-email/route.ts`
  (already covered by `admin-users-check-email-body-spec.md`).
  The two routes share an **identical authorization
  shell** (same two-step `auth()` chain 401 + 403,
  same bare `'Unauthorized'` / `'Forbidden'`
  envelopes, same `await request.json()`-after-gate
  body parse, same `if (!field)`-after-body-parse
  400 validation, same `console.error` +
  `'Internal server error'` catch, same
  `{ available, exists }` success-branch payload
  shape), differing in **exactly four** respects:
  documented field (`username` vs `email`), body-
  validation message (`'Username is required'` vs
  `'Email is required'`), repository call
  (`userRepository.usernameExists` vs
  `userRepository.emailExists`), and catch-log
  prefix (the route path). The unauth branch is
  INVARIANT to all four divergences — both routes
  return the same bare 401 envelope on the first
  gate step. The per-spec separation surfaces
  three regression classes a shared spec would
  mask (cross-route field-validation regression,
  one-route-only auth-gate-removal regression,
  username-shape boundary fuzzing on the unauth
  branch). Documents the at-a-glance scenario tree
  including the **first cross-route response-
  parity assertion** the docs tree publishes (the
  bare-401 envelope of `admin/users/check-username`
  must be byte-identical to the bare-401 envelope
  of `admin/users/check-email`). Includes
  username-shape boundary fuzzing (Unicode / RTL-
  override / null-byte / SQL injection / XSS /
  Cyrillic-homoglyph / zero-width-character /
  collation-sensitivity / leading-trailing-space).
  Cross-references to the sibling per-spec-file
  references and to
  [Spec 010 — E2E Test Coverage](spec/010-e2e-test-coverage/spec.md)
  and [Spec 009 — Admin Dashboard](spec/009-admin-dashboard/spec.md)
  for the governing specs. With this entry the
  **per-spec-file docs rollout extends to
  10-of-N** and the **`tests/api/` per-spec-file
  sub-rollout extends to 8-of-many**, and the
  **first cross-route response-parity assertion**
  the docs tree publishes lands as the load-
  bearing invariant of the cross-route smoke layer.

- `docs/plugins` Added `admin-users-check-email-body-spec.md` —
  the **ninth** per-source-file reference the docs
  tree publishes for any file under
  `apps/web-e2e/tests/` and the **seventh** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/admin-users-check-email-body.spec.ts`
  spec covering the admin check-email endpoint at
  `apps/web/app/api/admin/users/check-email/route.ts`
  — the **first** admin-tree route the docs tree
  publishes a per-source-file body-surface reference
  for that documents the full **two-step `auth()`
  chain** posture splitting 401 (no session) from 403
  (session without `isAdmin`). Where the sibling
  `admin-twenty-crm-test-connection-body.spec.ts`
  walks the body surface of a `POST` route with a
  single-step gate that collapses both branches into
  401 with the canonical longer message
  (`'Unauthorized. Admin access required.'`), this
  spec is its complement — documenting the unique
  combination of (a) **two-step gate** that splits
  401 vs 403 with the **bare shorter messages**
  (`'Unauthorized'` / `'Forbidden'`) and lacks the
  `success: false` envelope key; (b) **body parse via
  `await request.json()`** AFTER the gate (distinct
  from the bare `POST()` of the test-connection route
  which never reads the body); (c) **body-validation
  step `if (!email)`** AFTER the gate AND AFTER the
  body parse (the gate-then-parse-then-validate-then-
  call order is the load-bearing invariant); (d)
  **internal-error catch with `console.error`** (a
  side-channel observable via the server log) before
  returning the bare `'Internal server error'`
  envelope (out of scope for the unauth branch); (e)
  **per-user PII non-disclosure on the unauth branch**
  (the success-branch `{ available, exists }` keys
  must NEVER appear in the unauth response, which
  would indicate the gate was bypassed and
  `userRepository.emailExists(email, excludeId)` was
  reached). Documents the at-a-glance scenario tree
  (a ~45-body bulk-loop walk asserting `< 500`; a
  bare 401-envelope assertion pinning
  `{ error: 'Unauthorized' }` exactly; a negative-
  property assertion that the unauth response does
  NOT echo the success-branch `available` / `exists`
  keys; a parameterised-vs-baseline status-stability
  comparison; a malformed-JSON-body invariance walk
  pinning the body-parse-after-gate order; a side-
  channel cookie / `X-*` header walk; a cross-method
  probe asserting GET / PUT / DELETE / PATCH round-
  trip to `< 500`; a strict envelope-shape assertion
  `Object.keys(body).sort() === ['error']`). Includes
  email-shape boundary fuzzing on the unauth branch
  (null-byte injection, CRLF email-header injection,
  XSS-shape email, SQL-shape email) — a regression
  that runs the email validation before the gate
  would surface here. Cross-references to the
  sibling per-spec-file references and to
  [Spec 010 — E2E Test Coverage](spec/010-e2e-test-coverage/spec.md)
  and [Spec 009 — Admin Dashboard](spec/009-admin-dashboard/spec.md)
  for the governing specs. With this entry the
  **per-spec-file docs rollout extends to 9-of-N**
  and the **`tests/api/` per-spec-file sub-rollout
  extends to 7-of-many**, and the **first two-step
  `auth()` chain `POST` route** in the admin tree
  picks up its per-source-file body-surface
  reference (the second body-surface reference
  overall, after the single-step
  `admin-twenty-crm-test-connection-body.spec.ts`).

- `docs/plugins` Added `admin-items-export-query-spec.md` —
  the **eighth** per-source-file reference the docs
  tree publishes for any file under
  `apps/web-e2e/tests/` and the **sixth** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/admin-items-export-query.spec.ts`
  spec covering the admin items-export endpoint at
  `apps/web/app/api/admin/items/export/route.ts` —
  the **per-tenant items dump** counterpart to the
  sample-template route already covered by
  `apps/web-e2e/tests/api/admin-items-export-sample-query.spec.ts`.
  The two routes share an identical authorization
  shell (same admin gate `session?.user?.isAdmin`,
  same canonical 401 message
  `'Unauthorized. Admin access required.'`, same
  `exportQuerySchema` Zod parse with the
  `'csv' | 'xlsx'` enum and `'csv'` default, same
  `safeErrorResponse(...)` catch envelope, same
  `Content-Disposition: attachment; filename="…"`
  binary-stream return shape on the happy path),
  differing **only** in the post-gate service call:
  the sample route calls
  `exportService.generateSampleCSV / XLSX()` (a
  static schema-documentation template), whereas
  the route under test here calls
  `exportService.exportToCSV / XLSX()` (the
  per-tenant items dump, i.e. every item in the
  directory's CMS / DB) — and in the catch
  message (`'Failed to export items'` vs
  `'Failed to generate sample template'`). The
  unauth branch is INVARIANT to that distinction
  (both routes return the same canonical 401
  envelope), so the smoke walk pins the same
  load-bearing "401-before-any-service-call"
  contract; the per-spec separation surfaces three
  regression classes a shared spec would mask:
  (1) sample-route-only catch-message regression,
  (2) items-export-route-only service-call
  regression that swaps `exportToCSV()` for
  `generateSampleCSV()` (or vice versa), and (3)
  one-route-only auth-gate-removal regression that
  removes the admin gate from one route but not the
  other. Documents the at-a-glance scenario tree
  (a ~85-path bulk-loop walk asserting `< 500`; a
  canonical 401-envelope assertion; a parameterised-
  vs-baseline status-stability comparison; per-key
  isolation walks for `?format=` covering the
  case-sensitive `CSV` / `XLSX` rejections,
  `?userId=` / `?token=` / `?bypass=` covering
  impersonation / magic-token / admin-override
  keys, `?filename=` covering the path-traversal
  `../../etc/passwd` / null-byte `%00malicious`
  attack-vector pins, `?metadata=` covering the
  `#include-metadata` checkbox in the
  `AdminDataExportPage` driver; an `Accept` header
  walk including the
  `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  XLSX MIME type; a side-channel cookie / `X-*`
  header walk; a repeated-key walk). Cross-
  references to `smoke-health-spec.md`,
  `smoke-navigation-spec.md`,
  `admin-settings-map-status-query-spec.md`,
  `admin-twenty-crm-config-query-spec.md`,
  `admin-sponsor-ads-query-spec.md`,
  `admin-roles-query-spec.md`,
  `admin-roles-active-query-spec.md`,
  `admin-data-export-page-object.md`,
  `admin-item-form-page-object.md`,
  `admin-items-page-object.md`, and to
  [Spec 010 — E2E Test Coverage](spec/010-e2e-test-coverage/spec.md)
  and [Spec 009 — Admin Dashboard](spec/009-admin-dashboard/spec.md)
  for the governing specs. With this entry the
  **per-spec-file docs rollout extends to 8-of-N**
  and the **`tests/api/` per-spec-file sub-rollout
  extends to 6-of-many**, and the sample-template /
  items-dump pair of admin-export routes both pick
  up per-source-file references documenting their
  identical authorization shell and divergent
  post-gate service calls.

- `docs/plugins` Added `admin-roles-active-query-spec.md` —
  the **seventh** per-source-file reference the docs
  tree publishes for any file under
  `apps/web-e2e/tests/` and the **fifth** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/admin-roles-active-query.spec.ts`
  spec covering the admin active-roles endpoint at
  `apps/web/app/api/admin/roles/active/route.ts` —
  the **second** admin-tree route the smoke layer
  covers that documents the **auth-gate-divergence
  finding** opened by the immediately-preceding sibling
  `admin-roles-query-spec.md`: the handler does NOT
  call `auth()` and does NOT check
  `session?.user?.isAdmin` before delegating to
  `roleRepository.findActive()`, so the route is
  effectively **public** today (the e2e harness hits
  it without an authenticated session and receives the
  same 200-with-roles payload an authenticated admin
  would). The same Q-010b migration-path note in
  `docs/questions.md` applies (recommended default
  "yes, add the same two-step gate as the sibling
  `/api/admin/roles/stats` route"). Documents three
  postures distinct from the sibling listing route:
  (a) the **bare zero-argument `GET()` Next 16
  handler signature** (the handler does NOT take a
  `request` parameter at all, so every `?…=…`
  permutation is silently discarded by the Next.js
  routing layer before the handler body runs — the
  route is INVARIANT to its query string and every
  permutation rounds-trips to the same status as the
  no-arg baseline; a regression that switches the
  signature to `GET(request)` and starts reading
  `searchParams.get(...)` would change the observable
  behavior on at least one of the permutations the
  spec walks); (b) the **zero-argument
  `roleRepository.findActive()` repository call** (the
  repository is invoked with NO `options` bag at all
  — distinct from the sibling
  `roleRepository.findAllPaginated(options)` call; a
  regression that threads any of the query keys into
  a new options bag would change the auth-branch
  payload); (c) the **active-roles-specific
  `?includeInactive=…` per-key isolation walk** (the
  route's whole purpose is to return only active
  roles; a regression that wires
  `?includeInactive=true` into a new options bag
  would defeat that purpose — the per-key isolation
  walk pins the baseline-equality envelope so any
  such regression surfaces via the auth-branch
  behavioral test out of scope for this spec). The
  spec emits one bulk-loop walk over ~85 paths
  asserting `< 500` plus 13 hand-written scenarios
  (status-stability comparison; per-key isolation
  walks for `?status=` / `?isAdmin=` / `?sortBy=` /
  `?sortOrder=` / `?page=` / `?userId=` / `?token=` /
  `?bypass=` / `?includeInactive=`; an `Accept`
  header walk; a side-channel cookie / `X-*` header
  walk; a repeated-key walk). Cross-references to
  `smoke-health-spec.md`, `smoke-navigation-spec.md`,
  `admin-settings-map-status-query-spec.md`,
  `admin-twenty-crm-config-query-spec.md`,
  `admin-sponsor-ads-query-spec.md`,
  `admin-roles-query-spec.md`,
  `admin-roles-page-object.md`, and to
  [Spec 010 — E2E Test Coverage](spec/010-e2e-test-coverage/spec.md)
  and [Spec 009 — Admin Dashboard](spec/009-admin-dashboard/spec.md).
  With this entry the per-spec-file docs rollout
  extends to 7-of-N and the `tests/api/` per-spec-
  file sub-rollout extends to 5-of-many, and the
  second admin-tree route flagged by Q-010b picks up
  its own per-source-file reference (the first being
  `admin-roles-query-spec.md`).
- `docs/plugins` Added `admin-roles-query-spec.md` —
  the **sixth** per-source-file reference the docs
  tree publishes for any file under
  `apps/web-e2e/tests/` and the **fourth** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/admin-roles-query.spec.ts`
  spec covering the admin-only roles listing endpoint
  at `apps/web/app/api/admin/roles/route.ts` — the
  **first** admin-tree route the smoke layer covers
  that documents an **auth-gate-divergence finding**:
  unlike every other admin-tree GET route smoke-
  covered by the sibling `admin/sponsor-ads`,
  `admin/twenty-crm/config`, `admin/settings/map-status`,
  `admin/categories`, `admin/clients`,
  `admin/comments`, `admin/companies`,
  `admin/dashboard/stats`, `admin/featured-items`,
  `admin/geo-analytics`, `admin/items`,
  `admin/items/stats`, `admin/location-index`,
  `admin/navigation`, `admin/notifications`,
  `admin/reports`, `admin/reports/stats`,
  `admin/roles/stats`, `admin/settings`,
  `admin/tags`, `admin/tags/all`,
  `admin/twenty-crm/test-connection`,
  `admin/users`, and `admin/users/stats` smoke specs,
  the `apps/web/app/api/admin/roles/route.ts` GET
  handler does NOT call `auth()` and does NOT check
  `session?.user?.isAdmin` before delegating to
  `roleRepository.findAllPaginated(...)`; the same
  absence holds for the sibling
  `apps/web/app/api/admin/roles/active/route.ts` GET
  handler. The spec is INVARIANT to the resolution
  of the matching auth-gate question — every
  assertion uses either the `< 500` envelope or the
  baseline-equality envelope so the spec stays green
  whether the route remains unauthenticated OR a
  future contributor adds an `auth()` gate. With
  this entry the per-spec-file docs rollout extends
  to 6-of-N, the `tests/api/` per-spec-file sub-
  rollout extends to 4-of-many, and the docs tree
  surfaces its **first auth-gate-divergence finding**
  via the question register.
- `docs/questions` Added Q-010b
  (`Should /api/admin/roles and /api/admin/roles/active
carry an explicit auth() gate?`) — surfaces the
  auth-gate-divergence finding for human review with
  the recommended default of "yes, add the same two-
  step gate as the sibling /api/admin/roles/stats
  route" and four migration-path options.
- `docs/plugins` Added `admin-sponsor-ads-query-spec.md` —
  the **fifth** per-source-file reference the docs
  tree publishes for any file under
  `apps/web-e2e/tests/` and the **third** under
  `apps/web-e2e/tests/api/`. Pairs with the existing
  `apps/web-e2e/tests/api/admin-sponsor-ads-query.spec.ts`
  spec covering the admin-only sponsor-ads listing
  endpoint at
  `apps/web/app/api/admin/sponsor-ads/route.ts`
  — the **first** admin-tree route the smoke layer
  covers that documents the route-specific
  `'Unauthorized. Admin access required.'` error
  string paired with a request-bearing
  `GET(request: NextRequest)` handler signature and
  the widest documented query-param surface in the
  admin tree (pagination + enum filters + free-text
  search + order-targeting keys, all read AFTER the
  auth gate). The spec also pins the **auth-gate-
  before-Zod-validation** order via a deliberate
  `'Unauthorized. Admin access required.' !=
'Invalid query parameters'` assertion that
  surfaces any future re-ordering as a 400 instead
  of a 401 on the unauth branch, plus a
  side-channel walk asserting that fabricated
  `next-auth.session-token` / `authjs.session-token`
  cookies and `X-Forwarded-For` / `X-Real-IP`
  headers do NOT bypass `auth()`. With this entry
  the per-spec-file docs rollout extends to 5-of-N
  and the `tests/api/` per-spec-file sub-rollout
  extends to 3-of-many.
- `docs/plugins` Added `admin-twenty-crm-config-query-spec.md` —
  the **fourth** per-source-file reference the docs
  tree publishes for any file under
  `apps/web-e2e/tests/` and the **second** under
  `apps/web-e2e/tests/api/`. Pairs with a new
  `apps/web-e2e/tests/api/admin-twenty-crm-config-query.spec.ts`
  spec that covers the admin-only Twenty CRM
  configuration endpoint at
  `apps/web/app/api/admin/twenty-crm/config/route.ts`
  — the **first** admin-tree route the smoke layer
  covers that documents the route-specific
  `'Unauthorized. Admin access required.'` error
  string combined with a bare `GET()` handler
  signature and the canonical
  `{ success: false, error }` envelope, plus a per-
  tenant CRM-credential non-disclosure contract
  pinned via a deliberate negative-string assertion
  that the unauth response body does NOT contain the
  masked-API-key regex (`/\*{4}[A-Za-z0-9]{4}/`),
  the `TWENTY_CRM_API_KEY` / `TWENTY_CRM_BASE_URL`
  env-var names, or any of the config sub-field
  names. With this entry the per-spec-file docs
  rollout extends to 4-of-N and the `tests/api/`
  per-spec-file sub-rollout extends to 2-of-many.
- `docs/plugins` Added `admin-settings-map-status-query-spec.md` —
  the **third** per-source-file reference the docs
  tree publishes for any file under
  `apps/web-e2e/tests/` (and the **first** under
  `apps/web-e2e/tests/api/`), continuing the per-
  spec-file docs rollout after the now-closed
  (2-of-2) `tests/smoke/` rollout. Pairs with a new
  `apps/web-e2e/tests/api/admin-settings-map-status-query.spec.ts`
  spec that covers the admin-only map-provider
  configuration-status endpoint at
  `apps/web/app/api/admin/settings/map-status/route.ts`
  — the **first** admin-tree route the smoke layer
  covers that uses the `getCachedApiSession(req)`
  wrapper (rather than the bare `auth()` call), the
  bare `{ error }` envelope (rather than the
  canonical `{ success: false, error }` envelope),
  and a per-env publishable-key non-disclosure
  contract pinned via a deliberate negative-string
  assertion that the unauth response body does NOT
  contain a Mapbox public access token (`pk.*`),
  Google Maps API key (`AIza*`), or either env-var
  name (`NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` /
  `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`). With this
  entry the per-spec-file docs rollout extends to
  3-of-N and opens the `tests/api/` per-spec-file
  sub-rollout at 1-of-many.
- `docs/plugins` Added `smoke-navigation-spec.md` —
  the **second** per-source-file reference the docs
  tree publishes for any file under
  `apps/web-e2e/tests/`, **continuing the per-spec-
  file docs rollout** opened by
  [`smoke-health-spec.md`](plugins/smoke-health-spec.md)
  and **closing the smoke tree at 2-of-2** (the
  `tests/smoke/` directory has exactly two `*.spec.ts`
  files; both now have docs anchors). Where the
  sibling [`smoke-health-spec.md`](plugins/smoke-health-spec.md)
  documents a **data-driven, breadth-first** smoke
  posture (one `test()` per route in a shared
  `PUBLIC_ROUTES` constant from
  [`e2e-test-data.md`](plugins/e2e-test-data.md),
  body-visibility-only assertions), this page
  documents the **hand-crafted, depth-first**
  smoke posture — four hand-written `test()`
  blocks that exercise specific user-flow
  primitives (home → item-detail click-through,
  home → sign-in click-through, an item-grid
  count assertion, a categories-page heading
  pin) the per-route health spec cannot
  exercise. Paired with
  [`apps/web-e2e/tests/smoke/navigation.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/smoke/navigation.spec.ts)
  and the **second** consumer-layer reference in
  the rollout that documents (a) the **four
  hand-written `test()` blocks** that pin
  distinct user-flow primitives, with the
  per-scenario assertion divergence rationale
  (each scenario pins a structurally different
  invariant: count > 0 / `h1` visibility / URL
  match / link-click); (b) the **why
  `a[href*="/items/"]` substring-CSS selector**
  rationale (resilience to the page-object
  refactor surface, cross-route coverage matching
  every list / grid / card variant, selector
  simplicity); (c) the **why
  `getByRole('link', { name: /sign in/i })`**
  accessibility-first locator rationale (tests
  the user-visible primitive via the
  accessibility tree, resilience to URL refactor,
  cross-locale coverage with the `locale: 'en-US'`
  use-flag from
  [`playwright-config.md`](plugins/playwright-config.md));
  (d) the **why 30-second `expect.toBeVisible({
timeout: 30_000 })` override** rationale
  (deliberate self-documenting pin against future
  contributors who lower the global default,
  cold-cache resilience for the home-page render,
  distinct from the navigation timeout); and (e)
  a "What it does not contain" six-bullet
  enumeration of the deliberate omissions.
  Pinned to the co-tenant smoke spec at
  [`apps/web-e2e/tests/api/admin-reports-stats-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-reports-stats-query.spec.ts)
  which covers the admin-only report-statistics
  endpoint at
  `apps/web/app/api/admin/reports/stats/route.ts`
  — the **first** admin-tree route the smoke
  layer covers that documents the **single-step
  403 'Forbidden' gate combined with the bare
  `GET()` handler signature**, an intersection no
  other admin-tree route documents (the sibling
  [`admin-reports-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-reports-query.spec.ts)
  documents the 403 gate with a
  `GET(request: Request)` signature; the
  [`admin-roles-stats-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-roles-stats-query.spec.ts)
  documents the bare `GET()` signature with a
  two-step 401/403 gate; this spec documents the
  intersection — the single-step 403 gate with
  no request parameter at all).
- `docs/plugins` Added `smoke-health-spec.md` —
  the **first per-source-file reference** the docs
  tree publishes for any file under
  `apps/web-e2e/tests/`, **opening the per-spec-
  file docs rollout** that complements the now-
  closed page-object docs rollout (the admin-tree
  at 17-of-17, the public-tree at 14-of-14, the
  client-tree at 6-of-6, plus the `auth/signin`
  and `base.page.ts` roots — see
  [`base-page-object.md`](plugins/base-page-object.md)
  and [`signin-page-object.md`](plugins/signin-page-object.md)).
  Where the page-object docs rollout documented
  the **driver layer** (the `*.page.ts` files that
  encapsulate per-page Locator and helper APIs),
  the per-spec-file docs rollout documents the
  **consumer layer** — the `*.spec.ts` files that
  import drivers / fixtures / helpers and turn
  them into assertion-bearing scenarios. Paired
  with
  [`apps/web-e2e/tests/smoke/health.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/smoke/health.spec.ts)
  and the **first** consumer-layer reference in
  the rollout that documents (a) a **session-
  agnostic posture** — the spec imports the
  runtime test directly from `@playwright/test`
  rather than the project's auth-aware fixture
  from [`fixtures-index.md`](plugins/fixtures-index.md),
  with three load-bearing reasons (session
  agnosticism, independence from
  [`global-setup.md`](plugins/global-setup.md),
  and a smaller import graph); (b) a **data-
  driven test generation posture** — a single
  `for (const route of PUBLIC_ROUTES)` loop
  generates one Playwright `test()` per route in
  the shared `PUBLIC_ROUTES` constant from
  [`e2e-test-data.md`](plugins/e2e-test-data.md);
  (c) a **`waitUntil: 'domcontentloaded'` trade-
  off** — the second-earliest of Playwright's
  four wait conditions, trading full-page-load
  wait time for smoke-suite speed while still
  letting the body-visibility assertion succeed;
  (d) a **`< 400` HTTP status threshold** that
  deliberately includes the 3xx redirect class to
  accept locale-prefix injection 307s (the
  [`apps/web/middleware.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/middleware.ts)
  middleware), trailing-slash normalisation 308s,
  auth-redirect 302s, and `Cache-Control: max-age`
  304s; and (e) a **most-universal `body` Locator
  pin** for the rendered-DOM assertion, distinct
  from a `main` / `[role="main"]` / `header` /
  `page.title()` alternative. Pinned to the co-
  tenant smoke spec at
  [`apps/web-e2e/tests/api/admin-clients-advanced-search-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-clients-advanced-search-query.spec.ts)
  which covers the admin-only advanced-client-
  search endpoint at
  `apps/web/app/api/admin/clients/advanced-search/route.ts` —
  the **first** admin-tree route the smoke layer
  covers that documents the unique combination of
  FOUR distinct contracts (the **bare**
  `{ error: 'Unauthorized' }` envelope on the
  unauth 401 branch with NO `success` key, the
  largest documented query-param surface in the
  admin tree at 13+ keys plus pagination, the
  inline pagination clamp distinct from the
  shared `validatePaginationParams()` helper, and
  four distinct date-range filters via the shared
  `parseDate(v)` helper that silently ignores
  NaN-valued Date objects).
- `apps/web-e2e/tests/api` Added
  `admin-clients-advanced-search-query.spec.ts` —
  a query-param surface smoke for the admin-only
  advanced-client-search endpoint at
  [`apps/web/app/api/admin/clients/advanced-search/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/clients/advanced-search/route.ts).
  The route is the **first** admin-tree route
  the smoke layer covers that documents a unique
  combination of FOUR distinct contracts: (1)
  the **bare** `{ error: 'Unauthorized' }`
  envelope on the unauthenticated 401 branch
  (NOT the canonical
  `{ success: false, error: 'Unauthorized' }`
  shape every other admin-tree route's gate
  emits, and NOT the role-context-specific
  `'Unauthorized. Admin access required.'`
  message the categories-git / items-import /
  items-import-validate routes emit) — the bare-
  envelope posture mirrors the categories-git
  route but with a bare `'Unauthorized'` message
  rather than the role-context suffix; (2) a
  **richer-than-most query-param surface** of
  13+ documented keys (`?page=` / `?limit=` /
  `?search=` / `?status=` / `?plan=` /
  `?accountType=` / `?provider=` / `?sortBy=` /
  `?sortOrder=` / `?createdAfter=` /
  `?createdBefore=` / `?updatedAfter=` /
  `?updatedBefore=`) — every key parsed AFTER
  the gate so the unauth branch is invariant to
  the entire combinatorial surface; (3) the
  **inline pagination clamp posture** (`Number()`
  → `Number.isFinite()` → `Math.floor()` →
  `Math.min(Math.max(…, 1), 100)`), distinct
  from the admin-roles route's
  `validatePaginationParams(searchParams)`
  helper and the admin-categories route's Zod-
  schema-validated pagination posture, accepting
  every parseable integer (including negative /
  zero / non-integer values via the floor +
  clamp pipeline) and defaulting silently rather
  than emitting a 400; and (4) a **`parseDate(v)`
  helper** that normalises four distinct date-
  range filters (`createdAfter` / `createdBefore`
  / `updatedAfter` / `updatedBefore`) via
  `new Date(v)` + `Number.isNaN(d.getTime())`
  pinning, silently returning `undefined` for
  NaN-valued `Date` objects rather than emitting
  a 400. The spec walks the unauthenticated
  branch and pins (a) the canonical 401 + bare
  envelope contract, (b) the negative-shape
  assertion that the body must NOT include a
  `success` key (`expect(body).not.toHaveProperty('success')`),
  (c) the negative-shape assertion that the
  body's only key is `error`
  (`expect(Object.keys(body)).toEqual(['error'])`),
  (d) the message-divergence assertion that the
  error must be the bare `'Unauthorized'` (NOT
  `'Forbidden'`, NOT `'Unauthorized. Admin access required.'`),
  and (e) the status-invariance assertion that
  every documented and undocumented query-param
  permutation hits the same baseline status.
  Sweeps every documented query-param value
  permutation including pagination clamp targets
  (`-1` / `0` / `999` / `999999` / `abc` / `1.5`),
  status / plan / sortBy enum values plus
  invalid sentinels, OAuth provider values
  (google / github / facebook / twitter /
  microsoft), date-range filters with valid /
  invalid / empty values, SQL-injection-shaped
  search payloads, long search payloads, and
  the standard impersonation / token / bypass /
  cookie / IP / Accept-header / repeated-key
  side-channel sweeps that every admin-tree
  smoke spec runs.
- `docs/plugins` Added `client-trash-page-object.md`
  — the **sixth and final per-source-file reference**
  the docs tree publishes for any file under
  `apps/web-e2e/page-objects/client/`, **closing the
  client-tree page-object docs rollout at 6-of-6**,
  paired with
  [`apps/web-e2e/page-objects/client/trash.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/client/trash.page.ts)
  and the **first** client-tree driver in the rollout
  that documents (a) a **soft-deleted-row recovery
  surface** at `/client/submissions/trash` — the only
  client-tree page object the docs rollout covers
  that targets a **derived sub-route** of an existing
  client-tree page (the `/client/submissions/trash`
  route is a child of the `/client/submissions` route
  the [`client-submissions-page-object.md`](./plugins/client-submissions-page-object.md)
  driver covers); (b) a **breadcrumb back-navigation
  Locator** (`backLink`) pinned via the
  `a[href*="/client/submissions"]` substring-attribute
  selector — the **first** client-tree driver to
  document an `href*=` substring-attribute selector
  for back-link navigation, where the `*=` substring
  posture defends against future production-source
  `href` drift between `/client/submissions` (the
  bare-ancestor route) and
  `/client/submissions?status=…` (a query-param-
  augmented variant) and a future locale-prefixed
  `/en/client/submissions` shape that Next.js's
  middleware-based i18n posture sometimes emits
  server-side; (c) a **filter-by-text-content row
  collection Locator** (`trashItems`) pinned via
  `page.locator('button').filter({ hasText: /restore/i })`
  — the **first** client-tree driver to document a
  text-content filter on a bare HTML element-type
  Locator that resolves to **every restore button**
  on the trash page (one per soft-deleted row); (d)
  an **empty-state-affordance Locator** (`emptyState`)
  pinned via
  `page.getByText(/trash.*empty|no.*deleted/i).first()`
  — the **first** client-tree driver to document an
  **OR-of-two-substring regex** on a `getByText`
  Locator with `.*` between the two substrings to
  allow arbitrary intermediate words; and (e) a
  **bare imperative `restoreFirst()` mutator** — the
  **first** client-tree driver to document a named-
  action helper that does NOT take a row-key
  parameter (in contrast to the submissions driver's
  `viewSubmission(title)` / `editSubmission(title)` /
  `deleteSubmission(title)` trio) acting on the first
  matching restore button in DOM order, reflecting
  the trash bin's intentionally minimal surface where
  the consuming spec only needs to prove that **at
  least one** soft-deleted item can be restored, not
  that a specific named item can be restored. Pinned
  to the co-tenant smoke spec at
  [`apps/web-e2e/tests/api/admin-categories-all-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-categories-all-query.spec.ts)
  which covers the admin-only Git-CMS categories-
  listing endpoint at
  `apps/web/app/api/admin/categories/all/route.ts` —
  the **first** admin-tree route the smoke layer
  covers that documents the unique combination of
  THREE distinct contracts
  (`getCachedItems({ lang })` Git-based CMS reader
  for categories, a `?locale=` query param read AFTER
  the gate WITHOUT any defensive
  `typeof locale !== 'string'` narrowing distinct
  from the sibling tags-all route's dead-branch
  narrow, and the paired categories-data-route
  posture as the read-only Git-CMS variant of the
  database-backed `/api/admin/categories` listing
  route distinct from both the database-backed
  listing posture and the `/api/admin/categories/git`
  GitHub-API-backed sibling route). With this entry
  the **client-tree page-object docs rollout reaches
  6-of-6 — closing the rollout**; subsequent rollouts
  will turn to the public-tree page objects (e.g.
  `home.page.ts`, `browse.page.ts`) or to per-spec
  docs covering the client / admin / api / public /
  smoke / i18n / auth test trees.

- `docs/plugins` Added `client-submit-page-object.md`
  — the **fifth per-source-file reference** the docs
  tree publishes for any file under
  `apps/web-e2e/page-objects/client/` (continuing the
  client-tree page-object docs rollout, **5-of-6**),
  paired with
  [`apps/web-e2e/page-objects/client/submit.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/client/submit.page.ts)
  and the **first** client-tree driver in the rollout
  that documents (a) a **multi-step wizard surface**
  with three documented steps (Basic Info → Payment /
  Plan Selection → Review & Submit) driven by the
  `nextStepButton` / `previousButton` / `submitButton`
  triplet — distinct from every prior client-tree
  driver (all single-page surfaces) and distinct from
  the admin item-form driver's modal-bound four-step
  wizard (which lives inside a `[role="dialog"]`
  overlay rather than a per-route page); (b) a
  **`/submit` public-tree route boundary** — the only
  client-tree page object the docs rollout covers
  that targets a route OUTSIDE `/client/**`; (c) a
  **mixed selector-anchor posture** combining id-
  selectors (`#name`, `#description`, `#categories`)
  for production-source-stable form fields, bare HTML
  element type-selectors (`input[type="url"]`) for
  the LinkInput component which has no stable id
  today, and accessible-name regex-anchored buttons
  for wizard navigation triggers — the **first**
  client-tree driver to combine all three anchor
  styles in a single class; (d) a **per-step
  `fillBasicInfo({ name, url, description })`
  composite helper** with a load-bearing fill order
  (URL first, then name, then description — to let
  the LinkInput's OG-metadata fetch fire before the
  explicit name / description fills override the
  pre-filled values); (e) a **per-step
  `selectCategory(categoryName)` /
  `selectTag(tagName)` autocomplete commit helper
  pair** — the **first** client-tree driver to
  document combobox / tag-selection autocomplete
  helpers; and (f) a **`selectFreePlan()` plan-
  selection helper with an OR-of-two-substring
  regex** matching either `Get Started Free` or
  `Select Free` button labels — the **first**
  client-tree driver to document a plan-selection
  mutator and the **first** to use a multi-substring
  alternation regex for label-drift tolerance.
  Documents the full surface for the
  `ClientSubmitPage` driver — the seven `readonly`
  Locator fields, the navigation method, and the
  four composite helpers. Pinned to
  [`apps/web-e2e/tests/client/submit-and-manage.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/client/submit-and-manage.spec.ts)
  (the full three-step submit flow runs in `serial`
  mode because the subsequent flows depend on the
  just-submitted item being visible in the
  submissions list). Includes the "Why
  `ClientSubmitPage` extends `BasePage`" three-reason
  analysis; the "Why `fillBasicInfo` fills URL first
  (and not name / description first)" three-reason
  analysis (the LinkInput component fetches metadata
  on blur, subsequent fills override the OG-prefilled
  values, the terminal Step 3 form-state validation
  expects all three fields filled); the "Why
  `linkUrlInput` uses a bare `input[type="url"]`
  element-selector" three-reason analysis (LinkInput
  does not bind to a stable id, the `[type="url"]`
  attribute is the production-source-stable hook,
  `.first()` defends against multi-URL forms); the
  "Why `selectTag(tagName)` uses `exact: true`"
  three-reason analysis (tag names are short and may
  collide, exact preserves case-insensitivity by
  default, future tag rename surfaces as a clear
  test failure); the "Why `selectFreePlan()` uses
  the OR-of-two-substring regex" three-reason
  analysis; cross-references to all four prior
  client-tree page-object docs and to the admin
  item-form driver as the modal-bound counterpart;
  and a "What it does not contain" five-bullet
  enumeration of the deliberate omissions (no
  `getByTestId` selectors, no `submitFullFlow(data)`
  composite, no paid-plan selection helpers, no
  `assertStep(step)` invariant, no
  `getCurrentStep(): Promise<number>` accessor).
- `apps/web-e2e/tests/api` Added
  `admin-categories-git-query.spec.ts` — a query-
  param surface smoke for the admin-only Git-
  repository-status / categories endpoint at
  [`apps/web/app/api/admin/categories/git/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/categories/git/route.ts).
  The route is the **first** admin-tree route the
  smoke layer covers that documents a unique
  combination of FOUR distinct contracts: (1) a
  zero-argument `GET()` handler signature (same
  posture as the notifications route, distinct from
  every other admin-tree route's
  `GET(request: NextRequest)` posture); (2) the
  **bare `{ error: '...' }` envelope** (NOT the
  `{ success: false, error: '...' }` shape every
  other admin-gated route emits) — the ONLY admin-
  tree GET route that combines the bare-envelope
  shape with a role-context-specific
  `'Unauthorized. Admin access required.'` message
  (the settings route uses the bare envelope with
  a bare `'Unauthorized'` message; the admin-
  categories route uses the canonical envelope with
  the role-context-specific message); (3) a
  **GitHub-API-backed service** via
  `createCategoryGitService(gitConfig)` that makes
  live HTTPS calls to the GitHub API using the
  configured `GITHUB_TOKEN` / `DATA_REPOSITORY`
  environment variables — distinct from every other
  admin-tree route's drizzle / DB posture and from
  the tags/all / categories/all routes' Git-CMS
  file-system reader posture; and (4) THREE distinct
  configuration-error 500 envelopes after the gate
  (one per configuration prerequisite —
  `DATA_REPOSITORY` not set / invalid format /
  `GITHUB_TOKEN` not set), each emitting the
  canonical `{ success: false, error: '...' }`
  envelope (NOT the bare envelope) — a deliberate
  inconsistency between the unauth-branch and the
  post-auth configuration-error branches that the
  route's handler structure makes invariant. The
  spec walks the unauthenticated branch and pins
  the canonical 401 + bare envelope contract plus
  negative-shape assertions that the body must NOT
  include a `success` key, must NOT use the bare
  `'Unauthorized'` message, and must NOT use the
  `'Forbidden'` message. Sweeps Git-service-
  configuration override / impersonation / token /
  bypass / Git-ref-targeting / path-traversal /
  cache-bust / Accept-header / cookie-header (with
  `X-GitHub-Token` variant) / repeated-key
  permutations.
- `docs/plugins` Added
  [`client-submissions-page-object.md`](plugins/client-submissions-page-object.md)
  — the **fourth per-source-file reference** the docs
  tree publishes for any file under
  `apps/web-e2e/page-objects/client/`, paired with
  [`apps/web-e2e/page-objects/client/submissions.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/client/submissions.page.ts).
  Continues the **client-tree page-object docs
  rollout (4-of-6)**. Documents the **first** client-
  tree driver in the rollout that exposes (a) a
  named-row-resolved CRUD helper trio
  (`viewSubmission(title)` / `editSubmission(title)` /
  `deleteSubmission(title)`) mirroring the admin-tree
  tags / collections drivers' postures; (b) a named-
  row resolver via two-parent-walk
  (`getSubmissionByTitle(title)` walks
  `page.locator('h3').filter({ hasText: title }).first().locator('..').locator('..')`)
  — the **deepest** parent-walk in the page-object
  suite, encoding the production source's card-with-
  header-and-actions layout pattern; (c) a
  `button[title*="…"]` substring-attribute-selector
  triplet (`button[title*="iew"]` /
  `button[title*="dit"]` / `button[title*="elete"]`)
  intentionally dropping the leading capital so that
  "View" / "view" / "VIEW" all match — the **first**
  client-tree driver to document an HTML-attribute-
  substring selector posture distinct from the admin-
  tree drivers' `aria-label` / `getByRole` postures;
  (d) a status-filter tab navigator
  (`selectStatusFilter(status: 'all' | 'pending' | 'approved' | 'rejected')`)
  with a literal-union TypeScript parameter and
  start-anchor regex pattern; (e) a three-modal
  getter triplet (`detailModal` bare-`.first()`,
  `editModal` `.filter({ has: this.page.locator('#name') })`
  form-field-presence-scoped, `deleteDialog`
  `.filter({ hasText: /delete/i })` body-text-scoped)
  — the **first** client-tree driver to document
  multiple `[role="dialog"]` re-evaluating Locator
  getters with distinct scoping strategies; (f) a
  navigation-shelf header pair (`heading`,
  `newSubmissionLink`, `trashLink`); and (g) a search-
  input field (`searchInput`) pinned via
  `input[type="text"][placeholder*="earch"]` —
  substring-on-`placeholder` selector dropping the
  leading capital. Pinned to the consuming specs at
  [`apps/web-e2e/tests/client/submissions.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/client/submissions.spec.ts)
  (three flows) AND
  [`apps/web-e2e/tests/client/submit-and-manage.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/client/submit-and-manage.spec.ts)
  (the **only** client-tree driver consumed by a P0
  critical-business-flow spec from PR #621). Pinned
  to the co-tenant API smoke spec at
  [`apps/web-e2e/tests/api/admin-clients-stats-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-clients-stats-query.spec.ts).
  Linked from [`docs/index.md`](index.md) under the
  E2E references section. Subsequent rollouts in this
  client/ subtree will turn to `submit.page.ts` and
  `trash.page.ts`.
- `apps/web-e2e/tests/api` Added
  `admin-clients-stats-query.spec.ts` — query-param
  surface smoke for the admin-only enhanced-client-
  statistics endpoint at
  [`apps/web/app/api/admin/clients/stats/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/clients/stats/route.ts).
  Pins the route's **inline two-step `auth()` chain**
  with the **uniquely shaped `if (!session)` first-
  step gate** (checking the **whole session object**
  rather than the more common `if (!session?.user)`
  pattern the sibling `admin/roles/stats` route uses)
  — distinct from the `checkAdminAuth()` three-step
  gate the `admin/dashboard/stats`, `admin/users/stats`,
  `admin/clients/dashboard`, `admin/geo-analytics`,
  `admin/location-index`, and
  `admin/roles/[id]/permissions` siblings use, the
  two-step `if (!session?.user)` gate the
  `admin/roles/stats` sibling uses, and the single-
  step `if (!session?.user?.isAdmin)` 401-collapsed
  gate the `admin/items/stats` sibling uses. The
  unauthenticated branch returns 401 with the bare
  `'Unauthorized'` envelope; the catch returns
  `'Failed to fetch client stats'` (a route-specific
  message distinct from every other admin-tree stats
  route's catch). The handler signature is the bare
  `GET()` (no `request` parameter) — symmetric with
  `admin/roles/stats` and `admin/users/stats`.
  Walks 80+ defensive query-key permutations covering
  pagination keys, `?status=…` per-status drill-down
  (the success response includes per-status counts —
  `activeClients` / `inactiveClients` /
  `suspendedClients` / `trialClients`), per-client
  drill-down (`?clientId=…`, `?client_id=…`), time-
  window filters for the `growth` section's
  `newClientsToday` / `newClientsThisWeek` /
  `newClientsThisMonth` fields (`?from=…`, `?to=…`,
  `?since=…`, `?until=…`, `?days=…`), content-
  projection keys for the `overview` / `growth` /
  `distribution` sub-objects (`?include=…`,
  `?fields=…`, `?select=…`, `?exclude=…`),
  `?isAdmin=…` boolean filter, `?sortBy=…` /
  `?sortOrder=…` order-targeting keys, `?search=…`
  free-text filter with XSS-shaped / SQL-shaped
  values, admin-impersonation keys, magic-token
  bypass keys, admin-override keys, cache-busting
  keys, `?locale=…` / `?lang=…` i18n keys, repeated
  keys, and bogus / typo'd keys. Asserts every
  permutation round-trips to a status `< 500` (the
  route's two-step gate fires before any
  `getEnhancedClientStats()` call), the canonical
  401 / `{ success: false, error: 'Unauthorized' }`
  envelope on the no-arg unauth branch, status
  invariance across query permutations, status
  invariance under cookie / `X-*` header injection,
  and the route's unique combination of the bare
  `'Unauthorized'` first-step-gate message AND the
  catch's `'Failed to fetch client stats'` route-
  specific message (distinct from every other admin-
  tree stats route's envelope). Sits alongside the
  twenty prior admin-tree query-smoke specs (now 24
  total).
- `docs/plugins` Added `client-settings-page-object.md`
  — the **third per-source-file reference** the docs
  tree publishes for any file under
  `apps/web-e2e/page-objects/client/`, paired with
  [`apps/web-e2e/page-objects/client/settings.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/client/settings.page.ts)
  and the **first** client-tree driver in the rollout
  that documents (a) a **three-link navigation-shelf
  cluster** (`basicInfoLink`, `securityLink`,
  `billingLink`) — the **first** client-tree driver
  to expose pre-bound Locators for in-page
  navigation links, anchored to
  `getByRole('link', { name: /…/i })` substring
  resolvers, distinct from the profile driver's
  multi-route navigation **method** posture which
  routes via `goto()`; (b) a
  **`.grid.grid-cols-1.md\\:grid-cols-2`
  Tailwind-class-chain settings-grid getter**
  (`settingsGrid`) — pinned to the responsive
  1-column-mobile / 2-column-tablet+ Tailwind class
  chain (distinct from the profile driver's bare
  `.grid` posture and the client-dashboard driver's
  wider four-column-desktop chain); (c) a **single
  `navigate()` method** (`goto('/client/settings')`)
  symmetric with every prior page-object driver in
  the suite that exposes a single navigation
  shortcut, distinct from the profile driver's
  multi-route navigation pair because the settings
  index is a single route whose only purpose is to
  render the navigation shelf of cards; (d) a
  **`level: 1` heading getter**
  (`getByRole('heading', { level: 1 }).first()`) —
  the **first** client-tree driver that pins the
  heading Locator to the per-page H1 specifically
  (distinct from the dashboard driver's
  `name: /dashboard/i` substring pin and from the
  profile driver's bare
  `getByRole('heading').first()` pin); and (e) a
  **navigation-shelf-only posture** — the driver
  exposes Locators for the shelf of navigation
  cards (heading + grid + three links) but no form-
  field Locators because the `/client/settings`
  index is the per-tenant navigation shelf for the
  per-tab forms. Documents the full surface for the
  `ClientSettingsPage` driver — the five `readonly`
  Locator fields and the single `navigate()` method.
  Pinned to
  [`apps/web-e2e/tests/client/settings.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/client/settings.spec.ts)
  (three flows — authenticated client can access
  settings page, settings page displays settings
  cards via a `getByRole('link')` count assertion,
  unauthenticated user is redirected from settings
  via the `[locale]/client/**` middleware redirect
  to `/auth/signin`). Includes the "Why
  `ClientSettingsPage` extends `BasePage`" three-
  reason analysis; the "Why a single `navigate()`
  (and not multiple)" three-reason analysis; the
  "Why three pre-bound link Locators" three-reason
  analysis; the "Why the heading is pinned to
  `level: 1`" three-reason analysis; cross-
  references to the `client-dashboard-page-object.md`
  and `client-profile-page-object.md` rollout
  precedents and to the related auth-tree
  `signin-page-object.md` / `auth-fixture.md`
  references; and a "What it does not contain"
  six-bullet enumeration of the deliberate
  omissions. With this entry the **client-tree page-
  object docs rollout reaches 3-of-6**; subsequent
  rollouts in this subtree will turn to
  `submissions.page.ts`, `submit.page.ts`, and
  `trash.page.ts`.
- `apps/web-e2e/tests/api` Added
  `admin-location-index-query.spec.ts` — a query-
  param + method surface smoke for the admin-only
  location-index endpoint at
  [`apps/web/app/api/admin/location-index/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/location-index/route.ts).
  The route is the **second** admin-tree route the
  smoke layer covers that documents the
  `checkAdminAuth()` three-step guard from
  `@/lib/auth/admin-guard.ts` AND the **first**
  admin-tree route covered by the smoke layer that
  exposes BOTH a `GET` AND a `POST` handler. The
  GET handler reads NO documented post-gate query
  params (the smallest documented post-gate query
  surface of any admin-tree route the smoke layer
  covers, contrasting `/api/admin/clients/dashboard`'s
  eleven). The POST handler reads exactly one body
  field (`action`) with two valid destructive
  values (`'rebuild'` re-indexes every item,
  `'clear'` truncates the index table); both action
  paths fire AFTER the gate. The spec walks the
  unauthenticated branches of BOTH handlers and
  pins the canonical 401 envelope plus a negative-
  shape assertion that the body must NOT echo the
  second-step `'User ID not found'` / third-step
  `'Insufficient permissions'` / post-gate
  `'Invalid action.'` messages. Sweeps GET
  permutations (impersonation / token / bypass /
  override / `?action=`-leak / Accept-header /
  cookie-header), POST permutations (every action
  value, missing action, body keys for impersonation
  / token / bypass), Content-Type fallback
  (text/plain, urlencoded), and the GET-vs-POST
  envelope-equivalence invariant.
- `docs/plugins` Added `client-profile-page-object.md`
  — the **second per-source-file reference** the docs
  tree publishes for any file under
  `apps/web-e2e/page-objects/client/`, paired with
  [`apps/web-e2e/page-objects/client/profile.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/client/profile.page.ts)
  and the **first** client-tree driver in the rollout
  that documents (a) a **multi-route navigation pair**
  (`navigateToSettings()` / `navigateToBasicInfo()`)
  — the **first** client-tree driver to expose more
  than one navigation shortcut, distinct from every
  prior page-object driver in the suite which exposes
  a single `navigate()` method; (b) an **eight-input
  form-field cluster** (`displayNameInput`,
  `usernameInput`, `bioInput`, `locationInput`,
  `companyInput`, `jobTitleInput`, `websiteInput`,
  `saveButton`) — the largest per-page form-field
  inventory of any non-modal page-object driver in
  the suite; (c) a **camelCase id-selector input
  field cluster** (`#displayName`, `#bio`,
  `#jobTitle`) matching the HeroUI `<Input>`
  component's default `id` emission for camelCase
  `name` props (distinct from the tags driver's
  hyphenated kebab-case `#tag-id` posture and from
  the item-form driver's snake_case `#icon_url`
  posture); (d) a **`.grid` Tailwind-utility-anchored
  settings-cards getter** (`settingsCards`); and (e)
  a **page-level form posture** — distinct from every
  admin-tree driver's modal-bound form posture (the
  basic-info form is rendered page-level on a
  dedicated route at
  `/client/settings/profile/basic-info`, not inside a
  modal overlay). Documents the full surface for the
  `ClientProfilePage` driver — the nine `readonly`
  Locator fields and the two navigation methods.
  Pinned to
  [`apps/web-e2e/tests/client/profile.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/client/profile.spec.ts)
  (five flows over the client profile / settings
  surface — client can access settings page, settings
  page shows settings cards grid, client can access
  basic info form, basic info form has save button,
  display name field accepts input). Includes the
  "Why `ClientProfilePage` extends `BasePage`" three-
  reason analysis; the "Why two navigation methods
  (and not one with a parameter)" three-reason
  analysis; the "Why all input fields use camelCase
  id selectors" three-reason analysis; the "Why the
  form is page-level (and not modal-scoped)" three-
  reason analysis; cross-references to the
  `client-dashboard-page-object.md` rollout-template
  precedent and to the related admin-tree id-
  selector-posture variants; and a "What it does not
  contain" six-bullet enumeration of the deliberate
  omissions.
- `apps/web-e2e/tests/api` Added
  `admin-clients-dashboard-query.spec.ts` — a query-
  param surface smoke for the admin-only clients-
  dashboard endpoint at
  [`apps/web/app/api/admin/clients/dashboard/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/clients/dashboard/route.ts).
  The route is the **first** admin-tree route the
  smoke layer covers that documents the
  **`checkAdminAuth()` three-step guard** (from
  `@/lib/auth/admin-guard.ts`) — distinct from every
  other admin-tree route's inline gate posture. The
  helper folds three branches into one helper call:
  no session → 401 `'Unauthorized'`, missing user.id
  → 401 `'User ID not found'`, not admin → 403
  `'Insufficient permissions'`. The route reads
  ELEVEN documented post-gate query params (`page`,
  `limit`, `search`, `status`, `plan`,
  `accountType`, `provider`, `createdAfter`,
  `createdBefore`, `updatedAfter`, `updatedBefore`)
  — the largest documented post-gate query surface
  of any admin-tree route the smoke layer covers,
  exceeding the reports route's six query params and
  the items / featured-items routes' three. The four
  date-bound parameters use a per-bound
  `parseDateBound(value, bound)` helper that
  supports both YYYY-MM-DD and ISO 8601 formats. The
  spec walks the unauthenticated branch and pins the
  canonical 401 envelope plus a negative-shape
  assertion that the body must NOT echo the second-
  step `'User ID not found'` or third-step
  `'Insufficient permissions'` messages, then sweeps
  pagination / status / plan / accountType /
  provider / date-bound / impersonation / token /
  bypass / per-row-targeting / SQL-injection-themed
  search payload / Accept-header / cookie-header
  permutations. The sweep mirrors the shape of the
  sibling admin-gated query-smoke specs.
- `docs/plugins` Added
  [`client-dashboard-page-object.md`](plugins/client-dashboard-page-object.md) —
  per-source-file reference for the Playwright e2e
  suite's authenticated-client dashboard driver paired
  with
  [`apps/web-e2e/page-objects/client/dashboard.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/client/dashboard.page.ts).
  Opens the **client-tree page-object docs rollout
  (1-of-6)** mirroring the seventeen-file admin-tree
  rollout that completed at
  [`admin-tags-page-object.md`](plugins/admin-tags-page-object.md).
  Documents the smallest-possible-surface posture
  (only a `navigate()` method plus three pre-bound
  `Locator` fields — `heading` / `statsGrid` /
  `welcomeText`), the
  `getByRole('heading', { name: /dashboard/i })`
  locale-tolerant case-insensitive substring resolver
  for the dashboard heading, the
  `.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-4`
  Tailwind responsive class chain anchor for the
  stats grid, the `getByText(/welcome back/i)`
  greeting-string-tolerant resolver, the `.first()`
  strict-mode-correctness append on every Locator
  field, and the cross-references to
  [`base-page-object.md`](plugins/base-page-object.md),
  [`auth-fixture.md`](plugins/auth-fixture.md) (the
  `clientPage` authenticated-page fixture consuming
  specs use), [`signin-page-object.md`](plugins/signin-page-object.md)
  (the auth-tree driver consuming specs depend on for
  the authenticated `clientPage` fixture's setup
  precondition), [`admin-dashboard-page-object.md`](plugins/admin-dashboard-page-object.md)
  (the admin-area dashboard sibling concept),
  [`discover-page-object.md`](plugins/discover-page-object.md)
  (another smallest-possible-surface page-object
  posture this driver mirrors),
  [`e2e-tsconfig.md`](plugins/e2e-tsconfig.md) (the
  `include` glob), [`playwright-config.md`](plugins/playwright-config.md)
  (the `baseURL` posture), and
  [`fixtures-index.md`](plugins/fixtures-index.md).
  Pinned to the consuming spec at
  [`apps/web-e2e/tests/client/dashboard.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/client/dashboard.spec.ts)
  (three flows: authenticated client can access
  dashboard, unauthenticated user is redirected to
  `/auth/signin`, dashboard heading visible) and the
  co-tenant API smoke spec at
  [`apps/web-e2e/tests/api/client-dashboard-stats-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/client-dashboard-stats-query.spec.ts).
  Linked from [`docs/index.md`](index.md) under the
  E2E references section. Subsequent rollouts in this
  client/ subtree will turn to `profile.page.ts`,
  `settings.page.ts`, `submissions.page.ts`,
  `submit.page.ts`, and `trash.page.ts`.
- `apps/web-e2e/tests/api` Added
  `admin-users-stats-query.spec.ts` — query-param
  surface smoke for the admin-only user-statistics
  endpoint at
  [`apps/web/app/api/admin/users/stats/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/users/stats/route.ts).
  Pins the route's **`checkAdminAuth()` shared
  three-step gate** (the same gate the
  `admin/dashboard/stats`, `admin/geo-analytics`,
  `admin/clients/dashboard`, `admin/location-index`,
  and `admin/roles/[id]/permissions` siblings use)
  with the unauthenticated branch returning 401 and
  the bare `'Unauthorized'` message — distinct from
  the second-step gate's `'User ID not found'`
  message (reachable only by an authenticated session
  without `user.id`), the third-step gate's
  `'Insufficient permissions'` message (reachable
  only by an authenticated non-admin), the
  `'Forbidden'` message the `admin/roles/stats`
  route's two-step `auth()` chain emits on its third
  step, and the
  `'Unauthorized. Admin access required.'` message
  the sponsor-ads route's purpose-built guard emits.
  The handler signature is the bare `GET()` (no
  `request` parameter) — symmetric with the
  `admin/dashboard/stats`, `admin/geo-analytics`,
  `admin/clients/dashboard`, `admin/location-index`,
  and `admin/roles/[id]/permissions` siblings that
  route through `checkAdminAuth()` — narrowing the
  request surface to zero. Walks 90+ defensive query-
  key permutations covering pagination keys
  (`?page=…`, `?limit=…`), per-role drill-down keys
  (`?role=…`, `?roleId=…` — the success response
  includes `roleDistribution` so a future contributor
  might add a per-role drill-down), `?status=…`
  active/inactive enum filter (the sibling
  `admin/users` route accepts this), GDPR-consent
  filter (`?gdprConsentGiven=…` — also sibling
  `admin/users`), per-plan filter
  (`?subscriptionPlanId=…` — also sibling
  `admin/users`), `?isAdmin=…` boolean filter,
  `?sortBy=…` / `?sortOrder=…` order-targeting keys,
  `?search=…` free-text filter with XSS-shaped /
  SQL-shaped values, time-window filters (`?from=…`,
  `?to=…`, `?since=…`, `?until=…`, `?days=…` — the
  success response includes `recentRegistrations`
  hard-coded to "last 30 days" today),
  `?topActiveUsersLimit=…` tuning override (the
  `topActiveUsers` array length is `maxItems: 10`
  today), admin-impersonation keys (`?userId=…`,
  `?asUser=…`, `?impersonate=…`), magic-token bypass
  keys (`?token=…`, `?secret=…`, `?api_key=…`,
  `?authorization=…`, `?session=…`, `?adminToken=…`),
  admin-override keys (`?bypass=…`, `?admin=…`,
  `?override=…`, `?force=…`), cache-busting keys
  (`?refresh=…`, `?cache=…`, `?nocache=…`),
  `?locale=…` / `?lang=…` i18n keys, content-
  projection keys (`?fields=…`, `?select=…`,
  `?include=…`, `?exclude=…`), repeated keys, and
  bogus / typo'd keys. Asserts every permutation
  round-trips to a status `< 500` (the route's
  three-step gate fires before any
  `userRepository.getStats()` call), the canonical
  401 / `{ success: false, error: 'Unauthorized' }`
  envelope on the no-arg unauth branch, status
  invariance across query permutations, status
  invariance under cookie / `X-*` header injection,
  and the route's unique combination of the bare
  `'Unauthorized'` first-step-gate message AND the
  bare-`GET()` handler signature (distinct from
  every other admin-tree route's envelope-and-
  signature combination). Sits alongside the
  nineteen prior admin-tree query-smoke specs
  (`admin-categories-query.spec.ts`,
  `admin-clients-query.spec.ts`,
  `admin-collections-query.spec.ts`,
  `admin-comments-query.spec.ts`,
  `admin-companies-query.spec.ts`,
  `admin-dashboard-stats-query.spec.ts`,
  `admin-featured-items-query.spec.ts`,
  `admin-geo-analytics-query.spec.ts`,
  `admin-items-export-sample-query.spec.ts`,
  `admin-items-query.spec.ts`,
  `admin-items-stats-query.spec.ts`,
  `admin-navigation-query.spec.ts`,
  `admin-notifications-query.spec.ts`,
  `admin-reports-query.spec.ts`,
  `admin-roles-stats-query.spec.ts`,
  `admin-settings-query.spec.ts`,
  `admin-sponsor-ads-query.spec.ts`,
  `admin-tags-all-query.spec.ts`,
  `admin-tags-query.spec.ts`,
  `admin-users-query.spec.ts`).
- `apps/web-e2e/tests/api` Added
  `admin-navigation-query.spec.ts` — query-param
  surface smoke for the admin-only navigation-config
  endpoint at
  [`apps/web/app/api/admin/navigation/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/navigation/route.ts).
  Pins the route's single-step
  `!session?.user?.isAdmin` → 401
  `{ error: 'Unauthorized' }` gate (the **bare-key**
  envelope variant — without the `success: false`
  discriminator key, distinct from the bare-message-
  with-success-key envelope
  `{ success: false, error: 'Unauthorized' }` the
  `admin/tags` route emits) and the route's use of
  `getCachedApiSession(req)` (the cached-session
  helper that caches the session lookup per-request,
  symmetric with the `admin/settings` route — distinct
  from the `auth()` chain every other admin-tree
  route uses). Walks 60+ defensive query-key
  permutations covering `?type=…` / `?placement=…`
  filter keys (the route does NOT read them today
  but a future contributor might add them as filters
  to scope the response to only `custom_header` or
  only `custom_footer`), admin-impersonation keys
  (`?asAdmin=…`, `?as=…`, `?asUser=…`,
  `?impersonate=…`), magic-token bypass keys
  (`?token=…`, `?secret=…`, `?api_key=…`,
  `?authorization=…`, `?session=…`, `?adminToken=…`),
  admin-override keys (`?bypass=…`, `?admin=…`,
  `?override=…`, `?force=…`), `?locale=…` /
  `?lang=…` i18n keys (a future contributor might
  add localized navigation responses), cache-busting
  keys (especially relevant given the route reads
  `configManager.getConfig()` which may be cached —
  `?refresh=…`, `?cache=…`, `?nocache=…`, `?ttl=0`),
  `?path=…` XSS-shaped values (the PATCH handler
  validates each item's path via
  `isValidNavigationPath(path)` to defend against
  `javascript:` / `data:` / `vbscript:` /
  protocol-relative `//evil.com` schemes — the
  unauth-branch contract must stay invariant under
  XSS-shaped query values when applied to the GET
  branch), content-projection keys (`?fields=…`,
  `?select=…`, `?include=…`), pagination keys
  (`?page=…`, `?limit=…` — the route returns the
  full config arrays today, but a future contributor
  might add pagination for very long navigation
  lists), repeated keys, and bogus / typo'd keys.
  Asserts every permutation round-trips to a status
  `< 500` (the route's single-step gate fires before
  any `configManager.getConfig()` call), the
  canonical 401 / `{ error: 'Unauthorized' }`
  envelope on the no-arg unauth branch, status
  invariance across query permutations, status
  invariance under cookie / `X-*` header injection,
  and the route's unique combination of the bare
  `'Unauthorized'` message AND the absence of a
  `success` discriminator key (distinct from every
  other admin-tree route's envelope). Sits alongside
  the eighteen prior admin-tree query-smoke specs
  (`admin-categories-query.spec.ts`,
  `admin-clients-query.spec.ts`,
  `admin-collections-query.spec.ts`,
  `admin-comments-query.spec.ts`,
  `admin-companies-query.spec.ts`,
  `admin-dashboard-stats-query.spec.ts`,
  `admin-featured-items-query.spec.ts`,
  `admin-geo-analytics-query.spec.ts`,
  `admin-items-export-sample-query.spec.ts`,
  `admin-items-query.spec.ts`,
  `admin-items-stats-query.spec.ts`,
  `admin-notifications-query.spec.ts`,
  `admin-reports-query.spec.ts`,
  `admin-roles-stats-query.spec.ts`,
  `admin-settings-query.spec.ts`,
  `admin-sponsor-ads-query.spec.ts`,
  `admin-tags-all-query.spec.ts`,
  `admin-tags-query.spec.ts`,
  `admin-users-query.spec.ts`).

- `docs/plugins` Added `admin-tags-page-object.md`
  — the **seventeenth and final per-source-file
  reference** the docs tree publishes for any file
  under `apps/web-e2e/page-objects/admin/`,
  **completing the admin-tree page-object docs
  rollout (17-of-17)**. With this page landed, every
  concrete page-object source file under
  `apps/web-e2e/page-objects/admin/` has a paired
  per-source-file docs anchor that explains the
  load-bearing reasons each Locator pins to its
  current selector and the cross-references that any
  new helper must respect. Paired with
  [`apps/web-e2e/page-objects/admin/tags.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/admin/tags.page.ts)
  and the **first** admin-tree driver in the rollout
  that documents (a) a **named-row-resolved CRUD
  helper trio** (`getTagByName(name)`, `editTag(name)`,
  `deleteTag(name)`) — the most direct named-row-
  driven CRUD posture in the admin tree (distinct
  from the items driver's `getItemByName(name)`
  resolver-only posture and from the collections
  driver's `editCollection(name)` /
  `deleteCollection(name)` which uses a single-
  parent walk); (b) a **`<div>`-anchored named-row
  resolver with a `^${name}` start-anchor regex** —
  the broadest possible row-anchor in the admin tree
  (compared to the items driver's `<h4>` heading-
  anchor and the collections driver's named-cell
  heading-anchor) plus the **first** admin-tree
  driver posture to document a regex-based hasText
  filter that pins to the row's text content
  STARTING with the tag name; (c) a **`#tag-id` and
  `#tag-name` hyphenated-kebab-case id-selector
  input field pair** — production-source-stable
  hooks following the production source's HTML form
  convention rather than HeroUI's camelCase default;
  (d) a **modal-scoped `[role="switch"]` status
  toggle getter** scoped through the
  `tagFormModal` (distinct from the settings
  driver's page-level `switches` multi-resolution
  Locator); (e) a **`.fixed.inset-0.z-50` Tailwind-
  overlay form modal** (matching the companies and
  roles drivers); (f) a **per-mode submit-button-
  pair posture** (`createTagButton` /
  `updateTagButton`) mirroring the companies driver;
  and (g) a **two-key
  `data: { id?: string; name: string }` optional-id
  form-fill helper** — the **first** admin-tree
  driver helper to document a conditional-fill
  posture driven by an optional TypeScript object
  key (reflecting the production source's contract
  where the tag's stable id is auto-derived from the
  name in create mode but can be explicitly
  overridden). Documents the full surface for the
  `AdminTagsPage` driver — the two `readonly`
  Locator fields (`heading`, `addTagButton`), the
  four methods (`navigate()`, `getTagByName(name)`,
  `editTag(name)`, `deleteTag(name)`), the one
  composite helper (`fillTagForm(data)`), and the
  seven getters (`tagFormModal`, `tagIdInput`,
  `tagNameInput`, `statusToggle`, `cancelButton`,
  `createTagButton`, `updateTagButton`). Pinned to
  [`apps/web-e2e/tests/admin/tags.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/tags.spec.ts)
  (five flows over the admin tags management
  surface — admin can access tags management page,
  admin can create a new tag, admin can edit an
  existing tag, admin can delete a tag using native
  confirm dialog, tags page shows tag count in
  stats). Includes the "Why `AdminTagsPage` extends
  `BasePage`" three-reason analysis; the "Why
  `getTagByName(name)` uses a `^${name}` start-
  anchor regex" three-reason analysis (the tags
  page renders rows where the tag name is the first
  text content, the bare `<div>` element-selector
  is the broadest row-anchor, the runtime-built
  RegExp does NOT include the `i` flag because tag
  names are case-sensitive in storage); the "Why
  `tagFormModal` uses a `.fixed.inset-0.z-50`
  Tailwind-overlay selector" three-reason analysis;
  the "Why `tagIdInput` / `tagNameInput` use
  kebab-case id selectors" three-reason analysis;
  the "Why `statusToggle` is modal-scoped" three-
  reason analysis; the "Why `fillTagForm(data)`
  uses an optional `id` parameter" three-reason
  analysis; and a "What it does not contain" five-
  bullet enumeration of the deliberate omissions.
  This entry completes the admin-tree page-object
  docs rollout; subsequent rollouts should turn to
  the `apps/web-e2e/page-objects/auth/` and
  remaining `apps/web-e2e/page-objects/client/`
  subtrees.
- `apps/web-e2e/tests/api` Added
  `admin-tags-all-query.spec.ts` — a query-param
  surface smoke for the admin-only Git-CMS
  tags-listing endpoint at
  [`apps/web/app/api/admin/tags/all/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/tags/all/route.ts).
  The route is the **first** admin-tree route the
  smoke layer covers that documents (1) the
  **`getCachedItems({ lang })` Git-based CMS
  reader** — distinct from every other admin-tree
  route's database-backed posture (the helper reads
  from the per-locale tag list stored in the
  Git-based content repository cloned from
  `DATA_REPOSITORY` into `.content/`); (2) a
  **`?locale=` query param with type-coercion
  validation** — the only documented query key, with
  a defensive `typeof locale !== 'string'` narrowing
  that can never fire today (since
  `searchParams.get(...)` always returns `string |
null` and the `|| 'en'` default coerces null to a
  string before the typeof check); and (3) the
  **paired tags-data-route posture** — this route is
  the read-only Git-CMS variant of the database-
  backed `/api/admin/tags` listing route. The spec
  walks the unauthenticated branch and pins the
  canonical `{ success: false, error: 'Unauthorized' }`
  401 envelope (the bare `'Unauthorized'` message,
  NOT `'Unauthorized. Admin access required.'` /
  `'Forbidden'`), then sweeps `?locale=` (with
  English / French / Spanish / German / Arabic /
  Chinese variants) / `?lang=` / `?language=` /
  `?l=` / `?page=` / `?limit=` / `?status=` /
  `?active=` / `?fields=` / `?refresh=` / `?userId=` /
  `?token=` / `?bypass=` / `?repo=` / `?branch=` /
  `?commit=` (a Git-CMS-source bypass vector
  category) / Accept-header / repeated-key /
  cookie-header permutations against the no-arg
  baseline. The sweep mirrors the shape of the
  sibling admin-gated query-smoke specs.
- `docs/plugins` Added `admin-surveys-page-object.md`
  — the **sixteenth per-source-file reference** the
  docs tree publishes for any file under
  `apps/web-e2e/page-objects/admin/`, paired with
  [`apps/web-e2e/page-objects/admin/surveys.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/admin/surveys.page.ts)
  and the **first** admin-tree driver in the rollout
  that documents (a) a **bare `page.locator('h1').first()`
  heading resolver** — distinct from every other
  admin-tree driver's `page.getByRole('heading').first()`
  posture (the surveys page emits its top-level
  heading as a literal `<h1>` element today, so the
  bare-tag-name selector is the production-source-
  stable hook); (b) a **literal-union-typed
  `selectFilter(filter)` flow helper** that takes a
  `'all' | 'global' | 'item'` literal-union argument
  and dispatches on a `Record<string, RegExp>`
  filterMap to a
  `getByRole('button', { name: filterMap[filter] }).first().click()`
  call — with three case-insensitive regexes
  (`/all surveys/i`, `/global/i`, `/items/i`) — the
  literal-union typing is load-bearing because it
  enforces the filterMap domain at compile-time (a
  regression that drops the union type would let
  consumers pass an arbitrary filter name resolving
  to `undefined` via the `filterMap` index, surfacing
  as a runtime
  `Cannot read properties of undefined (reading '…')`
  failure rather than a compile-time type error);
  (c) a **dual index-based per-row Locator-factory
  posture** (`getEditButton(index)` /
  `getDeleteButton(index)`) that returns
  `this.page.locator('button[title*="Edit"]').nth(index)`
  and `this.page.locator('button[title*="Delete"]').nth(index)`
  — the **first** title-attribute substring posture
  in the admin-tree page-object subtree (the per-row
  buttons are icon-only buttons with no visible text
  label, so the `title` attribute substring-match is
  the next-best production-source-stable hook); and
  (d) a **`getByRole('button', { name: /create survey/i }).first()`
  CTA-button resolver** that pins to the case-
  insensitive accessible-name regex match for the
  page's primary CTA with `.first()` defence against
  the empty-state illustration's duplicate CTA.

- `apps/web-e2e/tests/api` Added
  `admin-tags-query.spec.ts` — query-param surface
  smoke for the admin-only tag-listing endpoint at
  [`apps/web/app/api/admin/tags/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/tags/route.ts).
  Pins the route's single-step
  `!session?.user?.isAdmin` → 401
  `{ success: false, error: 'Unauthorized' }` gate
  (the **bare-message-with-success-key** envelope
  variant — the only admin-tree route that combines
  both the bare `'Unauthorized'` message AND the
  `success: false` discriminator key, distinct from
  the longer-message variant
  `'Unauthorized. Admin access required.'` that the
  `admin/categories` / `admin/sponsor-ads` routes
  emit and distinct from the bare-key envelope
  `{ error: 'Unauthorized' }` (no `success: false`
  discriminator) that the `admin/clients` /
  `admin/comments` / `admin/companies` /
  `admin/users` routes emit). Pins the AFTER-the-
  auth-gate ordering of
  `validatePaginationParams(searchParams)` (a
  regression that swaps the order would surface as a
  400 `'Invalid page parameter. …'` instead of a 401
  on the unauth branch when the query is malformed).
  Walks 60+ query permutations covering pagination
  (`?page=…`, `?limit=…`), admin-impersonation keys
  (`?asAdmin=…`, `?as=…`, `?asUser=…`,
  `?impersonate=…`), magic-token bypass keys
  (`?token=…`, `?secret=…`, `?api_key=…`,
  `?authorization=…`, `?session=…`, `?adminToken=…`),
  admin-override keys (`?bypass=…`, `?admin=…`,
  `?override=…`, `?force=…`), status-filter keys
  (`?isActive=…`, `?includeInactive=…`), free-text
  filter keys (`?search=…`, `?q=…`), order-targeting
  keys (`?orderBy=…`, `?sortBy=…`, `?sortOrder=…`),
  per-row-targeting keys (`?tagId=…`, `?id=…`),
  content-projection keys (`?fields=…`, `?select=…`,
  `?include=…`), cache-busting keys (`?refresh=…`,
  `?cache=…`, `?nocache=…`), i18n keys
  (`?locale=…`, `?lang=…`), repeated keys, and
  bogus / typo'd keys. Asserts every permutation
  round-trips to a status `< 500` (the route's
  single-step gate fires before any service-layer
  call), the canonical 401 /
  `{ success: false, error: 'Unauthorized' }`
  envelope on the no-arg unauth branch, status
  invariance across query permutations, status
  invariance under cookie / `X-*` header injection,
  and the route's unique combination of the bare
  `'Unauthorized'` message AND the `success: false`
  discriminator key (distinct from every other
  admin-tree route's envelope). Pinned to the co-
  tenant page-object reference at
  [`docs/plugins/admin-surveys-page-object.md`](./plugins/admin-surveys-page-object.md)
  via the `index.md` cross-reference. Sits alongside
  the seventeen prior admin-tree query-smoke specs
  (`admin-categories-query.spec.ts`,
  `admin-clients-query.spec.ts`,
  `admin-collections-query.spec.ts`,
  `admin-comments-query.spec.ts`,
  `admin-companies-query.spec.ts`,
  `admin-dashboard-stats-query.spec.ts`,
  `admin-featured-items-query.spec.ts`,
  `admin-geo-analytics-query.spec.ts`,
  `admin-items-export-sample-query.spec.ts`,
  `admin-items-query.spec.ts`,
  `admin-items-stats-query.spec.ts`,
  `admin-notifications-query.spec.ts`,
  `admin-reports-query.spec.ts`,
  `admin-roles-stats-query.spec.ts`,
  `admin-settings-query.spec.ts`,
  `admin-sponsor-ads-query.spec.ts`,
  `admin-users-query.spec.ts`).

- `docs/plugins` Added `admin-sponsorships-page-object.md`
  — the **fifteenth per-source-file reference** the
  docs tree publishes for any file under
  `apps/web-e2e/page-objects/admin/`, paired with
  [`apps/web-e2e/page-objects/admin/sponsorships.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/admin/sponsorships.page.ts)
  and the **first** admin-tree driver in the rollout
  that documents (a) a **dual-modal-getter posture**
  that uses **two different selector strategies** for
  two semantically distinct modals on the same page —
  `rejectModal` pinned to the WAI-ARIA-canonical
  `[role="dialog"][aria-modal="true"]` selector with
  `.first()` (cheapest resolver because the rejection
  modal is positionally first), `forceApproveModal`
  pinned to the less-strict `[role="dialog"]` selector
  chained with
  `Locator.filter({ hasText: /force approve/i })`
  (no positional guarantee because confirmation,
  error, or info modals may mount between them);
  (b) a **fire-and-forget `searchSponsorships(term)`
  flow helper** that does NOT trigger search
  submission — symmetric with the roles driver's
  `searchRoles(term)` posture (consumer must wait
  the debounce window explicitly via
  `page.waitForTimeout(…)`); (c) a **`<input>`-id-
  bound modal-scoped input getter**
  (`rejectionReasonInput`) that resolves at the
  **page-scope** via
  `this.page.locator('#rejectionReason')` rather
  than the modal-scope
  (`this.rejectModal.locator('#rejectionReason')`)
  — defensive against future portal-render
  refactors that mount the textarea outside the
  modal subtree; (d) a **`getByRole('searchbox').first()`
  search input resolver** symmetric with the items /
  clients / comments / companies / collections drivers'
  search posture (the sponsorships page emits the
  search input as a native `<input type="search">`
  resolvable via `getByRole('searchbox')` — distinct
  from the roles driver's bare `<input type="text">`
  first-element posture); and (e) a bare
  `getByRole('heading').first()` heading resolver.

- `apps/web-e2e/tests/api` Added
  `admin-sponsor-ads-query.spec.ts` — query-param
  surface smoke for the admin-only sponsor-ads
  listing endpoint at
  [`apps/web/app/api/admin/sponsor-ads/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/sponsor-ads/route.ts).
  Pins the route's single-step
  `!session?.user?.isAdmin` → 401
  `'Unauthorized. Admin access required.'` gate (the
  **longer-message** variant — distinct from the bare
  `'Unauthorized'` message every other admin-tree
  route emits and distinct from the bare `'Forbidden'`
  message the reports route's single-step gate
  emits). Pins the AFTER-the-auth-gate ordering of
  `validatePaginationParams(searchParams)` (a
  regression that swaps the order would surface as
  400 instead of 401 on the unauth branch for invalid
  pagination) AND
  `querySponsorAdsSchema.safeParse(queryParams)` (a
  regression that swaps the order would surface as
  400 'Invalid query parameters' instead of 401 on
  the unauth branch when the query is malformed).
  Pins the `?status=` enum filter (valid values:
  pending_payment, pending, rejected, active,
  expired, cancelled), the `?interval=` enum filter
  (valid values: weekly, monthly), the `?sortBy=`
  enum (valid values: createdAt, updatedAt,
  startDate, endDate, status), the `?sortOrder=`
  enum (valid values: asc, desc), and the
  `?search=` free-text filter — all of which are
  read AFTER the auth gate.

- `docs/plugins` Added `admin-settings-page-object.md`
  — the **fourteenth per-source-file reference** the
  docs tree publishes for any file under
  `apps/web-e2e/page-objects/admin/`, paired with
  [`apps/web-e2e/page-objects/admin/settings.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/admin/settings.page.ts)
  and the **first** admin-tree driver in the rollout
  that documents (a) a **minimal-fields, accordion-
  section-driven driver posture** — the smallest admin-
  tree page object surface to date with only ONE
  `readonly` Locator field (`heading`), one method
  (`navigate()`), one helper (`openSection(sectionName)`),
  and two getters (`switches`, `selects`); (b) a
  **`getByRole('button', { name: ... }).first()`
  accordion trigger resolver** that uses a runtime-
  built `RegExp` (`new RegExp(sectionName, 'i')`)
  rather than a static regex literal — letting the
  consuming spec drive any accordion section by name
  via a string parameter; (c) a **broad multi-
  resolution `switches` Locator**
  (`page.locator('[role="switch"]')`) that exposes
  every toggle switch on the page (the **first**
  admin-tree driver to do so); (d) a **broad multi-
  resolution `selects` Locator**
  (`page.locator('select')`) using the bare HTML
  element-selector to pin to native `<select>`
  elements (distinct from the WAI-ARIA
  `[role="listbox"]` posture HeroUI's React `Select`
  component emits); and (e) a **per-section accordion
  lifecycle posture** with seven canonical sections
  (General, Homepage, Header, Footer, Monetization,
  Location, Navigation) — distinct from every prior
  admin-tree driver where the page is a flat surface
  or a single-modal composite. Documents the full
  surface for the `AdminSettingsPage` driver. Pinned
  to
  [`apps/web-e2e/tests/admin/settings.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/settings.spec.ts)
  (six flows over the admin settings management
  surface — admin can access settings page, settings
  page has accordion sections, admin can expand
  General Settings section, admin can expand Homepage
  Settings section, admin can expand Header Settings
  section, admin can expand Monetization Settings
  section). Includes the "Why `AdminSettingsPage`
  extends `BasePage`" three-reason analysis; the "Why
  `openSection(sectionName)` uses a runtime-built
  `RegExp`" three-reason analysis (the helper accepts
  any section name as a string parameter, the `i` flag
  is preserved, no per-section TypeScript union
  because the section list is more fluid than items /
  reports status lists); the "Why `switches` uses the
  `[role="switch"]` ARIA-role selector" three-reason
  analysis (HeroUI's `Switch` emits `role="switch"`,
  the WAI-ARIA `switch` role is screen-reader-
  canonical, future migration to native checkbox
  would be a production-source change); the "Why
  `selects` uses the bare `select` element selector"
  three-reason analysis (native `<select>` elements
  in Header / Footer sections, HeroUI `Select` opens
  to `[role="listbox"]` popup that's not the
  trigger, two-Locator pair documents the canonical
  settings-form contract); the "Why no
  `closeSection(sectionName)` helper" three-reason
  analysis (no consuming spec closes a section,
  HeroUI accordion uses the same trigger button for
  open/close, future state-aware helpers can compose
  on top); cross-references to all thirteen prior
  admin-tree page-object docs; and a "What it does
  not contain" six-bullet enumeration of the
  deliberate omissions.
- `apps/web-e2e/tests/api` Added
  `admin-settings-query.spec.ts` — a query-param
  surface smoke for the admin-only settings-fetching
  endpoint at
  [`apps/web/app/api/admin/settings/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/settings/route.ts).
  The route is the **first** admin-tree route the
  smoke layer covers that documents (1) the
  **`getCachedApiSession(req)` cached-session helper**
  — a custom variant of `auth()` that caches the
  session lookup per-request (distinct from every
  other admin-tree route's bare `auth()` posture); and
  (2) a **bare `{ error: '...' }` envelope** (NOT the
  `{ success: false, error: '...' }` shape every
  other admin-tree route emits) — a single-key
  envelope without the `success` discriminant. The
  spec walks the unauthenticated branch and pins the
  canonical `{ error: 'Unauthorized' }` 401 envelope
  PLUS a negative-shape assertion that the body must
  NOT include a `success` key, then sweeps `?section=`
  / `?key=` / `?expand=` / `?refresh=` / `?userId=` /
  `?token=` / `?bypass=` / Accept-header / repeated-
  key / cookie-header / `X-Forwarded-User`-header
  permutations against the no-arg baseline. The route
  reads from `configManager.getConfig()` (a YAML-
  config-file-backed singleton) rather than from a
  database — distinct from every other admin-tree
  route's async DB query posture. The spec is unique
  in that it pins **both** the 401 status AND the
  bare-envelope shape (rejecting both
  `'Unauthorized. Admin access required.'` and
  `'Forbidden'` alternatives, plus the
  `{ success: false, error }` envelope shape every
  sibling admin-tree route emits). The sweep mirrors
  the shape of the sibling
  `admin-categories-query.spec.ts`,
  `admin-collections-query.spec.ts`,
  `admin-comments-query.spec.ts`,
  `admin-companies-query.spec.ts`,
  `admin-dashboard-stats-query.spec.ts`,
  `admin-featured-items-query.spec.ts`,
  `admin-geo-analytics-query.spec.ts`,
  `admin-items-export-sample-query.spec.ts`,
  `admin-items-query.spec.ts`,
  `admin-items-stats-query.spec.ts`,
  `admin-notifications-query.spec.ts`,
  `admin-reports-query.spec.ts`,
  `admin-roles-stats-query.spec.ts`,
  `admin-users-query.spec.ts` smoke specs.
- `docs/plugins` Added `admin-roles-page-object.md`
  — the **thirteenth per-source-file reference** the
  docs tree publishes for any file under
  `apps/web-e2e/page-objects/admin/`, paired with
  [`apps/web-e2e/page-objects/admin/roles.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/admin/roles.page.ts)
  and the **first** admin-tree driver in the rollout
  that documents (a) a **`<select>`-anchored dual-
  filter surface** for status and role-type — distinct
  from every prior admin-tree driver in the rollout
  which pin status filters via either
  `getByRole('tab')` (items, clients, comments,
  companies, collections) or `getByRole('button')`
  (reports). The roles page emits each filter as a
  native HTML `<select>` element, and the driver
  locates them positionally via
  `page.locator('select').first()` and
  `page.locator('select').nth(1)`; (b) a **modal-
  overlay-getter triplet** (`roleFormModal`,
  `deleteRoleDialog`, `permissionsModal`) pinned to
  the **`.fixed.inset-0.z-50` Tailwind-utility-stack
  selector** rather than the `[role="dialog"]` /
  `[aria-modal="true"]` accessibility-tree-canonical
  selectors every prior admin-tree driver uses
  (the roles page renders modals as bare Tailwind-
  utility-stacked `<div>` elements, NOT
  `[role="dialog"]` / `[aria-modal="true"]` ARIA-
  tree-canonical surfaces); (c) a
  **`Locator.filter({ hasText })` chained Locator
  posture** for the two specialised modal getters —
  the **first** admin-tree driver in the rollout to
  use `Locator.filter({ hasText })` for modal
  disambiguation; (d) a **`searchRoles(term)` flow
  helper that does NOT trigger search submission**
  (consumer must wait the debounce window
  explicitly); (e) a bare `getByRole('heading').first()`
  heading resolver and a bare
  `getByRole('button', { name: /add role/i }).first()`
  add-button resolver; and (f) a
  `<input type="text">` first-element search
  resolver (the roles page emits the search input
  as a bare `<input type="text">`, NOT a
  `<input type="search">` resolvable via
  `getByRole('searchbox')`). Pinned to
  [`apps/web-e2e/tests/admin/roles.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/roles.spec.ts)
  (four flows over the admin roles management
  surface — admin can access roles management page,
  roles page displays stats cards, admin can search
  roles, admin can open add role form modal).
  Cross-references to all twelve prior admin-tree
  page-object docs and to the consuming spec.
- `apps/web-e2e/tests/api` Added
  `admin-roles-stats-query.spec.ts` — a query-param
  surface smoke for the admin-only role-statistics
  endpoint at
  [`apps/web/app/api/admin/roles/stats/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/roles/stats/route.ts).
  The route is **admin-gated** via `auth()` + a
  **two-step** check that resolves the
  unauthenticated and authenticated-non-admin
  branches into **distinct** status codes (401 vs 403) — distinct from the sibling `admin/clients` /
  `admin/comments` / `admin/companies` /
  `admin/users` routes' single-step
  `!session?.user?.isAdmin` → 401 'Unauthorized'
  gate AND from the `admin/reports` route's
  single-step `!session?.user?.isAdmin` → 403
  'Forbidden' gate. The handler signature is the
  **bare `GET()` (no `request` parameter)** —
  distinct from every other admin-tree route's
  signed handler signature; this is the strongest
  possible protection against query-param-driven
  bypass regressions because a contributor who
  wants to add a query-param-driven bypass must
  first widen the handler signature. The 401
  envelope carries the bare `'Unauthorized'`
  message (NOT
  `'Unauthorized. Admin access required.'` like
  the sponsor-ads route, NOT the bare `'Forbidden'`
  like the reports route). The spec walks the
  unauthenticated branch with 60+ query
  permutations covering pagination keys, status /
  isAdmin / role-targeting filters, impersonation
  keys (`?as=`, `?asUser=`, `?impersonate=`),
  magic-token bypass keys (`?token=`, `?secret=`,
  `?api_key=`, `?authorization=`),
  admin-override keys (`?bypass=`, `?admin=`,
  `?override=`, `?force=`), per-role-targeting keys
  (`?roleId=`, `?roleName=`), time-range filters,
  cache-busting keys (`?refresh=`, `?fresh=`,
  `?cache=`), i18n keys (`?locale=`, `?lang=`),
  repeated-key permutations, and bogus / typo'd
  keys, then pins the canonical
  `{ success: false, error: 'Unauthorized' }` 401
  envelope and verifies that the message does NOT
  echo any other admin-tree route signature.
- `docs/plugins` Added `admin-reports-page-object.md`
  — the **twelfth per-source-file reference** the
  docs tree publishes for any file under
  `apps/web-e2e/page-objects/admin/`, paired with
  [`apps/web-e2e/page-objects/admin/reports.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/admin/reports.page.ts)
  and the **first** admin-tree driver in the rollout
  that documents (a) a **`<button>`-anchored status-tab
  navigation surface** rather than the
  `getByRole('tab')`-anchored navigation surface every
  prior status-tab driver uses (the reports page emits
  the status filter as `<button>` elements, not
  `[role="tab"]` / `[role="tablist"]`); (b) a five-
  element status-tab TypeScript union
  (`'All' | 'Pending' | 'Reviewed' | 'Resolved' | 'Dismissed'`)
  reflecting the report lifecycle's distinct state
  machine (Pending → Reviewed → Resolved / Dismissed)
  rather than the items lifecycle (Draft → Pending →
  Approved / Rejected); (c) a **`.border-l-4`
  Tailwind-utility-anchored card-list selector**
  (`reportCards`) — the **first** admin-tree driver to
  pin per-row resolution to a Tailwind border-utility
  class rather than a semantic role; (d) a **broad
  `/review/i` substring `reviewButtons` Locator** that
  intentionally resolves to a multi-element match
  (symmetric with the data-export driver's
  `exportButtons` posture); and (e) a **bare
  `[role="dialog"]` review-dialog getter** without the
  `[aria-modal="true"]` composite attribute the items
  driver's `rejectModal` getter uses (the bare role
  posture tolerates HeroUI's per-version `aria-modal`
  drift). Documents the full surface for the
  `AdminReportsPage` driver — the two `readonly`
  Locator fields (`heading`, `searchInput`), the three
  methods (`navigate()`, `selectStatusTab(status)`,
  `searchReports(term)`), and the three getters
  (`reviewDialog`, `reviewButtons`, `reportCards`).
  Pinned to
  [`apps/web-e2e/tests/admin/reports.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/reports.spec.ts)
  (five flows over the admin reports management
  surface — admin can access reports management page,
  reports page displays stats cards, status tabs filter
  reports, admin can open review dialog for a report,
  reports page shows empty state for non-matching
  search). Includes the "Why `AdminReportsPage`
  extends `BasePage`" three-reason analysis; the "Why
  `selectStatusTab(status)` uses `getByRole('button')`"
  three-reason analysis (the reports page emits the
  status filter as `<button>` elements, symmetric with
  the bulk-action toolbar's button posture, a future
  migration to `[role="tab"]` would be a production-
  source change); the "Why `selectStatusTab(status)`
  uses a prefix-match `^${status}` regex" three-reason
  analysis (the status-tab labels include per-tab
  counts like `Pending (12)`, disambiguation against
  future per-action buttons, symmetric with the items
  driver's posture); the "Why `reviewDialog` uses a
  bare `[role="dialog"]` selector" three-reason
  analysis (HeroUI's per-version `aria-modal` drift,
  `.first()` is the strict-mode-correctness defence,
  no production-source change required); the "Why
  `reviewButtons` is a multi-resolution Locator" three-
  reason analysis; the "Why `reportCards` uses a
  `.border-l-4` Tailwind-utility selector" three-
  reason analysis (production source does not emit
  ARIA roles on report cards, the `border-l-4` utility
  is the per-card visual anchor, future migration to
  `[role="article"]` is a production-source change);
  cross-references to all eleven prior admin-tree
  page-object docs; and a "What it does not contain"
  five-bullet enumeration of the deliberate omissions
  (no `getByTestId` selectors, no per-card Locator-
  factory beyond the `reviewButtons` multi-resolution
  Locator, no `clickReview(reportId)` /
  `dismissReport(reportId)` /
  `resolveReport(reportId, notes)` flow helpers, no
  `assertCardCount(n)` / `assertEmptyState()`
  invariant helpers, no `clearSearch()` reset helper).
- `apps/web-e2e/tests/api` Added
  `admin-reports-query.spec.ts` — a query-param
  surface smoke for the admin-only reports-listing
  endpoint at
  [`apps/web/app/api/admin/reports/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/reports/route.ts).
  The route is **admin-gated** via `auth()` +
  `session.user.isAdmin` but with a unique
  **403-on-missing-session contract** — distinct from
  every other admin-gated route in the smoke layer.
  The single-step gate `!session?.user?.isAdmin`
  folds the missing-session and missing-admin-bit
  branches into a single 403 response with the bare
  `'Forbidden'` message — distinct from the
  notifications route's two-step gate (which emits
  401 'Unauthorized' for missing session and 403
  'Forbidden' for missing admin bit). The handler
  signature is `GET(request: Request)` (the bare
  `Request` type, not the Next-specific `NextRequest`
  type) and reads SIX documented query params after
  the gate (`page`, `limit`, `search`, `status`,
  `contentType`, `reason`) — the largest documented
  post-gate query surface of any admin-tree route the
  smoke layer covers. The route uses inline `Number()`
  parsing + `Math.max()` / `Math.min()` clamps for
  the `page` / `limit` params (distinct from the
  `validatePaginationParams(...)` utility the sibling
  routes use) and inline `VALID_*.includes(...)`
  checks against the schema's enum constants for
  the `status` / `contentType` / `reason` params
  (distinct from the Zod-schema posture). The route
  runs `checkDatabaseAvailability()` BEFORE the auth
  gate and emits an explicit `runtime = 'nodejs'`
  Next.js export. The spec walks the unauthenticated
  branch and pins the canonical
  `{ success: false, error: 'Forbidden' }` 403
  envelope (NOT 401, NOT
  `'Unauthorized. Admin access required.'`), then
  sweeps `?page=` / `?limit=` / `?search=` (with
  SQL-injection-themed payloads) / `?status=` /
  `?contentType=` / `?reason=` / `?userId=` /
  `?token=` / `?bypass=` / Accept-header /
  repeated-key / cookie-header permutations against
  the no-arg baseline. The spec is unique in that it
  pins **403 (NOT 401)** plus the bare `'Forbidden'`
  (NOT `'Unauthorized'` / NOT
  `'Unauthorized. Admin access required.'`) error
  message — a regression that switches the gate to
  the two-step `session?.user?.id` then
  `session.user.isAdmin` pair would surface here as
  a status divergence between the expected 403 and
  the unexpected 401. The sweep mirrors the shape of
  the sibling `admin-categories-query.spec.ts`,
  `admin-collections-query.spec.ts`,
  `admin-comments-query.spec.ts`,
  `admin-companies-query.spec.ts`,
  `admin-dashboard-stats-query.spec.ts`,
  `admin-featured-items-query.spec.ts`,
  `admin-geo-analytics-query.spec.ts`,
  `admin-items-export-sample-query.spec.ts`,
  `admin-items-query.spec.ts`,
  `admin-items-stats-query.spec.ts`,
  `admin-notifications-query.spec.ts`,
  `admin-users-query.spec.ts` smoke specs.
- `docs/plugins` Added `admin-notifications-page-object.md`
  — the **eleventh per-source-file reference** the
  docs tree publishes for any file under
  `apps/web-e2e/page-objects/admin/`, paired with
  [`apps/web-e2e/page-objects/admin/notifications.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/admin/notifications.page.ts).
  The notifications driver is the **first** admin-tree
  driver that does NOT extend
  [`BasePage`](plugins/base-page-object.md) — by design,
  because header-chrome dropdowns do not need the
  page-navigation helpers `BasePage` provides. Documents
  the four-`readonly`-Locator-field core surface
  (`bellButton`, `dropdown`, `refreshButton`,
  `closeButton`), the two-action surface (`open()` /
  `close()`), and the five-getter dropdown-content
  surface (`markAllReadButton`, `unreadBadge`,
  `notificationItems`, `viewAllButton`, `emptyState`).
  Pinned to the consuming spec at
  [`apps/web-e2e/tests/admin/notifications.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/notifications.spec.ts)
  and the co-tenant smoke at
  [`apps/web-e2e/tests/api/admin-notifications-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-notifications-query.spec.ts).
- `apps/web-e2e` Added
  `apps/web-e2e/tests/api/admin-clients-query.spec.ts`
  — query-param surface smoke spec for the admin-only
  client-profiles-listing endpoint at
  [`apps/web/app/api/admin/clients/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/clients/route.ts).
  Pins the single-step `session?.user?.isAdmin` gate's
  401 + bare `{ error: 'Unauthorized' }` envelope on the
  unauth branch across pagination, search, status,
  plan, accountType, and provider param permutations,
  plus the per-bypass-key invariants (`?asAdmin=…`,
  `?token=…`, `?bypass=…`, `?override=…`) for future
  contributors.
- `docs/plugins` Added `admin-items-page-object.md`
  — the **tenth per-source-file reference** the docs
  tree publishes for any file under
  `apps/web-e2e/page-objects/admin/`, paired with
  [`apps/web-e2e/page-objects/admin/items.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/admin/items.page.ts)
  and the **first** admin-tree driver in the rollout
  that documents (a) an **eleven-`readonly`-Locator-
  field surface** — the largest per-page Locator
  inventory of any admin-tree driver to date, covering
  the page chrome, per-row selection, and the bulk-
  action toolbar; (b) a **nine-method helper API** —
  the largest per-driver method count of any admin-tree
  driver to date, covering navigation, per-status-tab
  filtering with a five-element TypeScript union
  parameter, search-flow mutators, per-row resolution,
  per-row action-menu interactions, and per-row
  selection; (c) a **two-modal-getter posture** —
  `rejectModal` and `bulkConfirmDialog`, both pinned to
  the `[role="dialog"][aria-modal="true"]` composite-
  attribute selector with `hasText` text filters; (d) a
  **`<input>`-id-bound modal-scoped input getter** —
  `rejectionReasonInput` resolves via
  `this.rejectModal.locator('#rejectionReason')`, the
  **first** admin-tree driver to scope an `id`-selector
  through a parent modal-Locator getter; (e) a
  **`<h4>`-tag-anchored named-row resolver
  (`getItemByName(name)`)** that uses a double-`..`
  parent walk to lift the resolution from the per-
  item heading up to the row container — the **first**
  admin-tree driver posture to document a multi-level
  DOM-traversal resolution; (f) a **multi-attribute
  composite OR-selector for the pagination Locator**
  (`nav[aria-label*="pagination"], nav[aria-label*="Pagination"]`)
  defending against the production-source's
  inconsistent capitalisation between the lowercase
  HeroUI default and the capitalised English
  translation; (g) a **partial-`aria-label`-substring-
  anchored toolbar selector** (`[role="toolbar"][aria-label*="ulk"]`)
  using a case-sensitive sub-word substring `ulk` that
  survives both `Bulk` and `bulk` capitalisation drift
  while remaining strict enough to disambiguate
  against any other toolbar; and (h) **exact-match
  `^approve$` / `^reject$` / `^delete$` regexes** for
  the per-action bulk triggers (distinct from the
  `bulkDeselectButton`'s substring `/deselect/i`
  posture which tolerates the current `Deselect all`
  label and a future `Deselect` label). Documents the
  full surface for the `AdminItemsPage` driver —
  the eleven `readonly` Locator fields (`heading`,
  `addItemButton`, `searchBar`, `itemsList`,
  `pagination`, `selectAllCheckbox`, `bulkActionBar`,
  `bulkApproveButton`, `bulkRejectButton`,
  `bulkDeleteButton`, `bulkDeselectButton`), the nine
  methods (`navigate()`, `selectStatusTab(status)`,
  `searchItems(term)`, `clearSearch()`,
  `getItemByName(name)`, `openActionsMenu(itemName)`,
  `clickAction(actionName)`, `selectItem(itemName)`,
  plus the inherited `goto()` / `gotoLocalized()` /
  `waitForPageReady()` / `getTitle()`), and the three
  getters (`rejectModal`, `rejectionReasonInput`,
  `bulkConfirmDialog`). Pinned to the four consuming
  spec files — the largest spec-fan-out of any admin-
  tree driver to date:
  [`apps/web-e2e/tests/admin/items.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/items.spec.ts),
  [`apps/web-e2e/tests/admin/items-crud.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/items-crud.spec.ts),
  [`apps/web-e2e/tests/admin/items-filter.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/items-filter.spec.ts),
  and
  [`apps/web-e2e/tests/admin/items-review.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/items-review.spec.ts).
  Includes the "Why `AdminItemsPage` extends
  `BasePage`" three-reason analysis; the "Why
  `searchBar` uses `getByRole('searchbox')`" three-
  reason analysis (the items page emits
  `<input type="search">`, the featured-items driver
  emits `<input type="text">`, the `searchbox` role
  surfaces a screen-reader-accessible "search"
  announcement); the "Why `getItemByName(name)` uses
  a double-`..` parent walk" three-reason analysis
  (the items list is not `<table>`-rendered, the
  per-row container is two parents up from the per-
  item `<h4>` heading, the double-`..` walk is robust
  against future production-source changes); the "Why
  `selectStatusTab(status)` uses a five-element
  TypeScript union" three-reason analysis (the five
  status-tab labels are the only canonical values,
  type-narrowing surfaces typos at compile time,
  future status additions are explicit); the "Why
  `pagination` uses a multi-attribute OR-selector"
  three-reason analysis (HeroUI emits lowercase
  `aria-label="pagination"`, localised translation
  may capitalise, OR-selector tolerates both); the
  "Why `bulkActionBar` uses a `[aria-label*="ulk"]`
  partial substring" three-reason analysis
  (capitalisation drift tolerance, disambiguation
  against other toolbars, no production-source
  change required); the "Why `bulkApprove` /
  `bulkReject` / `bulkDelete` use exact-match `^…$`
  regexes" three-reason analysis; the "Why
  `bulkDeselectButton` uses a substring (not exact-
  match) regex" three-reason analysis (production-
  source label is `Deselect all`, future shortened
  label is plausible, toolbar-scope is the second-
  line defence); the "Why `rejectModal` and
  `bulkConfirmDialog` are getters" three-reason
  analysis; cross-references to all nine prior
  admin-tree page-object docs and to the public-tree
  drivers; and a "What it does not contain" five-
  bullet enumeration of the deliberate omissions
  (no `getByTestId` selectors, no per-row Locator-
  factory beyond `getItemByName(name)`, no
  `clickReject(itemName, reason)` composite flow
  helper, no `assertItemPresent(name)` /
  `assertItemAbsent(name)` invariant helpers, no
  `clickPaginationPage(page)` / `nextPage()` /
  `prevPage()` pagination helpers).
- `apps/web-e2e/tests/api` Added
  `admin-notifications-query.spec.ts` — a query-param
  surface smoke for the admin-only notifications-
  listing endpoint at
  [`apps/web/app/api/admin/notifications/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/notifications/route.ts).
  The route is the **first** admin-tree route the
  smoke layer covers that documents a **two-step
  session gate** — distinct from every other admin-
  tree route's single-step gate. The handler signature
  is the **zero-argument** Next 16 form (the route
  does not take a `NextRequest` argument and reads no
  `searchParams` at all today). The route applies
  two distinct checks in order — first
  `session?.user?.id` (401 with the bare
  `'Unauthorized'` message if missing), then
  `session.user.isAdmin` (403 with the bare
  `'Forbidden'` message if missing) — distinct from
  every other admin-tree route's single-step gate.
  The spec walks the unauthenticated branch and pins
  the canonical `{ success: false, error: 'Unauthorized' }`
  401 envelope (NOT 403), then sweeps `?page=` /
  `?limit=` / `?unreadOnly=` / `?status=` / `?type=`
  / `?since=`/`?until=` / `?userId=` / `?token=` /
  `?bypass=` / Accept-header / repeated-key /
  cookie-header permutations against the no-arg
  baseline. The spec is unique among the admin-tree
  query-smoke specs in that it pins **both** the 401
  status AND the `'Unauthorized'` (not `'Forbidden'`,
  not `'Unauthorized. Admin access required.'`)
  error message — the two-step gate emits distinct
  messages depending on which gate fired. A
  regression that switches the gate order (e.g.
  checks `isAdmin` before `id`, which would silently
  bypass the 401 status because `session?.user?.isAdmin`
  on a `null` session resolves to `undefined` and
  the negation catches it as "not admin", returning
  403 instead of 401) would surface here as a status
  divergence between the expected 401 and the
  unexpected 403. The sweep mirrors the shape of the
  sibling `admin-categories-query.spec.ts`,
  `admin-collections-query.spec.ts`,
  `admin-comments-query.spec.ts`,
  `admin-companies-query.spec.ts`,
  `admin-dashboard-stats-query.spec.ts`,
  `admin-featured-items-query.spec.ts`,
  `admin-geo-analytics-query.spec.ts`,
  `admin-items-export-sample-query.spec.ts`,
  `admin-items-query.spec.ts`,
  `admin-items-stats-query.spec.ts`,
  `admin-users-query.spec.ts` smoke specs.
- `docs/plugins` Added `admin-item-form-page-object.md`
  — the **ninth per-source-file reference** the docs
  tree publishes for any file under
  `apps/web-e2e/page-objects/admin/`, paired with
  [`apps/web-e2e/page-objects/admin/item-form.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/admin/item-form.page.ts)
  and the **first** admin-tree driver in the rollout
  that documents (a) a **standalone (no `BasePage`
  extension) modal driver** posture (the
  `AdminItemFormPage` class is the **first** admin-tree
  driver that does **not** extend `BasePage` because the
  modal owns no route — it is composed into whichever
  admin route opens it, conventionally `/admin/items`),
  (b) a **multi-step wizard surface** with four
  documented steps (Basic Info, Media & Links,
  Classification, Review & Submit) driven by
  `goToNextStep()` / `goToPreviousStep()` mutator
  helpers and three submit buttons (`createButton`,
  `updateButton`, `cancelButton`), (c) a
  **`[role="dialog"][aria-modal="true"]` accessibility-
  tree-canonical modal selector** scoped via
  `this.modal.locator(...)` for every per-step input
  field — the **first** admin-tree driver to document
  the explicit `aria-modal="true"` focus-trapping
  selector pair (distinct from the comments driver's
  bare `[role="dialog"]` posture and the companies
  driver's positional `.fixed.inset-0.z-50` Tailwind-
  overlay posture), (d) a **per-step id-selector input
  field** posture (`#id`, `#name`, `#slug`,
  `#description`, `#icon_url`, `#source_url`) for every
  step that emits HeroUI form inputs with a stable `id`,
  (e) a **placeholder-regex input field** posture
  (`getByPlaceholder(/enter categories/i)` /
  `getByPlaceholder(/enter tags/i)`) for the
  Classification step's autocomplete inputs that the
  production source does not bind to a stable `id`,
  (f) a **bare `select` HTML-element selector** for the
  status field plus a **`[role="switch"]` accessibility-
  tree-canonical selector** for the featured toggle
  (distinct from the `[role="checkbox"]` posture the
  data-export / featured-items drivers' toggles use
  because HeroUI's `Switch` is a binary on/off toggle
  without an indeterminate state), (g) a **stratified
  helper API** across three categories (per-step fill
  helpers `fillBasicInfo({...})` /
  `fillMediaLinks({...})` / `addCategory(name)` /
  `addTag(name)`, per-step navigation helpers
  `goToNextStep()` / `goToPreviousStep()`, per-submit
  helpers `submitCreate()` / `submitUpdate()` /
  `cancel()`), and (h) a **per-modal lifecycle helper**
  API (`waitForOpen()` / `waitForClosed()`) that wraps
  the `this.modal.waitFor(...)` Playwright primitives
  in named, intent-revealing methods. Documents the
  full surface for the `AdminItemFormPage` driver —
  the nineteen per-modal `readonly` Locator fields and
  the nine `async` helper methods. Pinned to
  [`apps/web-e2e/tests/admin/items-crud.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/items-crud.spec.ts)
  (a full create-then-edit-then-delete flow over the
  admin items management surface).
- `apps/web-e2e/tests/api` Added
  `admin-items-query.spec.ts` — query-param surface
  smoke for the admin-gated items list endpoint at
  `apps/web/app/api/admin/items/route.ts`. The route
  reads seven documented query params (`page`, `limit`,
  `status`, `search`, `categories`, `tags`, `sortBy`,
  `sortOrder`) **after** the
  `session?.user?.isAdmin` admin gate fires, so every
  call from the spec's unauthenticated context
  round-trips to a 401 with the canonical
  `{ success: false, error: 'Unauthorized. Admin access required.' }`
  envelope regardless of the query string. The spec
  pins (1) a 401 baseline assertion, (2) a "stable
  status across query permutations" assertion, (3)
  per-param "does NOT bypass the admin gate"
  assertions for each of the seven documented params
  plus the impersonation / token / bypass / format /
  Accept-header / repeated-key / NextRequest cookie
  side channels, and (4) a `< 500` no-server-error
  sweep across the full path table. Mirrors the shape
  of the sibling admin-gated query smokes
  (`admin-categories-query.spec.ts`,
  `admin-collections-query.spec.ts`,
  `admin-comments-query.spec.ts`,
  `admin-companies-query.spec.ts`,
  `admin-dashboard-stats-query.spec.ts`,
  `admin-featured-items-query.spec.ts`,
  `admin-geo-analytics-query.spec.ts`,
  `admin-items-export-sample-query.spec.ts`,
  `admin-items-stats-query.spec.ts`,
  `admin-users-query.spec.ts`).

- `docs/plugins` Added `admin-data-export-page-object.md`
  — the **eighth per-source-file reference** the docs tree
  publishes for any file under
  `apps/web-e2e/page-objects/admin/`, paired with
  [`apps/web-e2e/page-objects/admin/data-export.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/admin/data-export.page.ts)
  and the **first** admin-tree driver in the rollout
  that documents (a) a **`/admin` co-tenant widget**
  posture (the data-export widget is composed into the
  admin dashboard landing page rather than mounted at a
  dedicated route — distinct from every prior admin-tree
  driver's per-feature route posture), (b) a
  **format-button pair** (`csvButton` / `jsonButton`)
  pinned to case-insensitive `^CSV$` / `^JSON$` exact-
  match accessible-name regexes (the `^…$` anchors are
  required because the format-button accessible names
  are short three- to four-character tokens and a
  substring regex would match accidentally on other
  buttons), (c) a **`#include-metadata` id-selector
  checkbox** symmetric with the featured-items driver's
  `#active-only` posture, (d) a **broad-name
  `exportButtons` Locator** that intentionally resolves
  to a multi-element match via the case-insensitive
  `/export|download/i` alternation regex (distinct from
  every other admin-tree driver's `.first()`-pinned
  Locator postures because the data-export widget
  intentionally renders multiple export trigger
  buttons), and (e) a **`progressBar` Locator with
  composite-or selectors**
  (`[role="progressbar"], .bg-blue-600.rounded-full`)
  — the **first** admin-tree driver to document a
  fallback chain between an accessibility-tree-canonical
  posture and a positional Tailwind-utility posture, so
  Playwright resolves the first matching half and a
  future production-source change that adds the
  `role="progressbar"` ARIA attribute lights up the
  accessibility-tree-canonical posture without breaking
  the existing positional fallback. Documents the full
  surface for the `AdminDataExportPage` driver — the
  six `readonly` Locator fields (`heading`,
  `csvButton`, `jsonButton`,
  `includeMetadataCheckbox`, `exportButtons`,
  `progressBar`) and the `navigate()` shortcut that
  closes over the inherited `goto('/admin')`. Pinned
  to
  [`apps/web-e2e/tests/admin/data-export.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/data-export.spec.ts)
  (three flows over the admin data-export widget
  surface — admin dashboard has export format buttons,
  include metadata checkbox is available, export/
  download buttons are available — each guarded by a
  `test.skip(true, …)` defensive posture so the test
  remains green when the widget is hidden behind a
  feature-flag); the "Why `AdminDataExportPage` extends
  `BasePage`" three-reason analysis (page-route
  navigation via the inherited `goto`, global header /
  footer / nav-link chrome surfaced for free, post-
  navigation `waitForPageReady` stabiliser); the "Why
  `csvButton` / `jsonButton` use `^CSV$` / `^JSON$`
  exact-match regexes" three-reason analysis (the
  format-trigger accessible names are short three- to
  four-character tokens, the `/i` case-insensitivity
  flag is preserved, symmetric with the public-tree
  view-toggle driver's exact-match posture); the "Why
  `includeMetadataCheckbox` uses the `#include-metadata`
  id-selector" three-reason analysis (production-
  source-stable id-binding,
  `getByRole('checkbox')` would resolve too broadly,
  `getByLabel('Include metadata')` would lock to the
  English locale); the "Why `exportButtons` is a multi-
  resolution Locator" three-reason analysis (multiple
  export triggers, count-and-iterate in the consuming
  spec, composable filtering); the "Why `progressBar`
  uses a composite-or selector chain" three-reason
  analysis (current production source not ARIA-tagged,
  future-state production source should be ARIA-
  tagged, Playwright resolves the first matching half);
  cross-references to all seven prior admin-tree
  page-object docs and to the public-tree drivers; and
  a "What it does not contain" five-bullet enumeration
  of the deliberate omissions (no `getByTestId`
  selectors, no per-format download flow helper, no
  `enableMetadata()` / `disableMetadata()` setter
  helpers, no `assertProgress(percent)` invariant
  helper, no format-equivalence helper that switches
  between CSV and JSON).
- `apps/web-e2e/tests/api` Added
  `admin-items-export-sample-query.spec.ts` — a
  query-param surface smoke for the admin-only
  sample-template-export endpoint at
  [`apps/web/app/api/admin/items/export/sample/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/items/export/sample/route.ts).
  The route is **admin-gated** via `auth()` +
  `session.user.isAdmin` (NOT the session-only gate
  the sibling `admin/featured-items` route uses) and
  reads a single Zod-validated query param after the
  gate (`format`, an enum of `'csv' | 'xlsx'` with a
  `'csv'` default). The spec walks the unauthenticated
  branch and pins the canonical
  `{ success: false, error: 'Unauthorized. Admin access required.' }`
  401 envelope, then sweeps `?format=` /
  `?userId=` / `?token=` / `?bypass=` /
  `?filename=` (with path-traversal +
  null-byte-injection variants) / `?metadata=` /
  Accept-header / repeated-key / cookie-header
  permutations against the no-arg baseline so any
  future contributor who introduces query-string-based
  admin bypass — `?asUser=true`, `?token=…`,
  `?as=admin`, `?bypass=1`, or any other dangerous-
  passthrough — surfaces immediately as a status
  divergence between the no-arg 401 and a
  parameter-laden non-401. The sweep mirrors the
  shape of the sibling
  `admin-categories-query.spec.ts`,
  `admin-collections-query.spec.ts`,
  `admin-comments-query.spec.ts`,
  `admin-companies-query.spec.ts`,
  `admin-dashboard-stats-query.spec.ts`,
  `admin-featured-items-query.spec.ts`,
  `admin-geo-analytics-query.spec.ts`,
  `admin-items-stats-query.spec.ts`,
  `admin-users-query.spec.ts`,
  `items-export-query.spec.ts`,
  `items-export-settings-query.spec.ts` smoke specs.
- `docs/plugins` Added `admin-featured-items-page-object.md`
  — the **seventh per-source-file reference** the docs tree
  publishes for any file under
  `apps/web-e2e/page-objects/admin/`, paired with
  [`apps/web-e2e/page-objects/admin/featured-items.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/admin/featured-items.page.ts)
  and the **first** admin-tree driver in the rollout that
  documents an **`#active-only` id-selector toggle** (a
  positional `<input id="active-only">` checkbox surface,
  distinct from every other admin-tree driver's
  `getByRole('button')` or `getByRole('heading')` posture)
  **plus** a pair of **search-input helpers**
  (`search(term)` / `clearSearch()` — composable mutators
  on the same underlying `getByRole('textbox').first()`
  Locator, distinct from the form-modal-bound input
  mutators every other admin-tree driver documents)
  **plus** a **`statsCards` Locator getter** that pins to
  the positional `.grid` selector (a CSS-utility-class
  anchor, distinct from the `[role="dialog"]` /
  `.fixed.inset-0.z-50` overlay primitives every other
  admin-tree driver's modal-Locator getters use).
  Documents the full surface for the
  `AdminFeaturedItemsPage` driver — the four `readonly`
  Locator fields (`heading`, `addButton`, `searchInput`,
  `activeOnlyToggle`), the `navigate()` shortcut that
  closes over the inherited `goto('/admin/featured-items')`,
  the `search(term)` / `clearSearch()` async mutator
  helpers, and the `featuredItemModal` / `statsCards`
  late-binding getters. Pinned to
  [`apps/web-e2e/tests/admin/featured-items.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/featured-items.spec.ts)
  (five flows over the admin featured-items management
  surface — admin can access featured items page, featured
  items page displays stats cards, admin can open add
  featured item modal, search input filters featured
  items, active-only toggle filters items); the "Why
  `AdminFeaturedItemsPage` extends `BasePage`" three-
  reason analysis (page-route navigation via the inherited
  `goto`, global header / footer / nav-link chrome
  surfaced for free, post-navigation `waitForPageReady`
  stabiliser); the "Why `searchInput` uses
  `getByRole('textbox').first()`" three-reason analysis
  (the page renders a single `<textbox>` today, `.first()`
  defends against future per-section textboxes, the
  `data-testid` posture would force a production-source
  change); the "Why `activeOnlyToggle` uses the
  `#active-only` id-selector" three-reason analysis
  (production-source-stable id-binding, `getByRole(
'checkbox')` would resolve too broadly, `getByLabel(
'Active only')` would lock to the English locale); the
  "Why `featuredItemModal` and `statsCards` are getters"
  three-reason analysis (late-binding against modal
  mount/unmount lifecycle, symmetric with the modal-
  getter posture across the admin-tree page-object
  directory, the stats-grid Locator participates in the
  same late-binding contract); the "Why `search(term)`
  and `clearSearch()` are async methods" three-reason
  analysis (consuming specs always type into / clear the
  input, the pair of helpers documents the canonical
  search-flow contract, the underlying `Locator.clear()`
  posture is the platform-canonical reset);
  cross-references to all six prior admin-tree page-
  object docs and to the public-tree drivers; and a
  "What it does not contain" five-bullet enumeration of
  the deliberate omissions (no `getByTestId` selectors,
  no per-row Locator getters, no `addFeaturedItem(...)`
  / `editFeaturedItem(...)` / `deleteFeaturedItem(...)`
  flow helpers, no `assertActiveOnly` / `assertActiveAll`
  invariant helper, no `getStatsValue(label)` helper)
  that future contributors must respect when they add
  new helpers to keep the driver minimal. Continues the
  rollout of the per-source-file admin page-object
  references — ten admin-tree page objects remain
  (data-export, item-form, items, notifications, reports,
  roles, settings, sponsorships, surveys, tags). Updates
  [`docs/index.md`](./index.md) with the standard one-
  paragraph entry that lists all prior admin-tree page-
  object docs as cross-references and pins the consuming
  spec, the five-flow envelope, the change protocol
  (update the doc in the same PR, update this log,
  cross-check `e2e-tsconfig.md`, `playwright-config.md`,
  `fixtures-index.md`, run `pnpm tsc --noEmit`, run a
  smoke-subset Playwright run targeting the featured-
  items spec subset, a Spec 010 cross-link if the change
  introduces a new shared concept, and a reviewer pass),
  and follows the same posture as the six prior admin-
  tree page-object index entries.
- `apps/web-e2e/tests/api` Added
  `admin-featured-items-query.spec.ts` — the **ninth per-
  route admin-API query-surface smoke spec** (after
  `admin-by-id`, `admin-categories-query`,
  `admin-collections-query`, `admin-comments-query`,
  `admin-companies-query`, `admin-dashboard-stats-query`,
  `admin-geo-analytics-query`, `admin-items-stats-query`,
  and `admin-users-query`), pinned to the
  [`apps/web/app/api/admin/featured-items/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/featured-items/route.ts)
  handler. The first per-route admin-API smoke spec the
  suite publishes that targets a **session-gated**
  admin-tree route (gated by `session?.user?.id` rather
  than `session?.user?.isAdmin` — distinct from every
  prior admin-tree query-surface spec the suite
  publishes, which all target admin-isAdmin-gated
  routes). Pins the unauth-branch contract (always 401
  with the canonical
  `{ success: false, error: 'Unauthorized' }`
  envelope, distinct from the
  `{ success: false, error: 'Unauthorized. Admin access required.' }`
  envelope the `admin/categories` route emits and from
  the `{ success: false, error: 'Forbidden' }` envelope
  the `admin/comments` route emits) across a sweep of
  the three documented query keys (`page`, `limit`,
  `active`) and a speculative-bypass sweep (`?userId=`,
  `?token=`, `?bypass=`, `?fields=`, `?itemSlug=`, `?q=`,
  `?from=…`, `?to=…`, `?deleted=…`, `?orderBy=`,
  `?category=`) that catches any future regression that
  reads a query param before the session gate. Includes
  the standard 18 invariant assertions (`< 500` per
  parametrised path, exact-401-envelope for the no-arg
  baseline, status-stable across permutations,
  pagination-validators-do-not-fire-on-unauth,
  `?active=` does not bypass, `?userId=` does not
  bypass, `?token=` does not bypass, `?bypass=` does not
  bypass, `?fields=` does not bypass, `?itemSlug=` does
  not bypass, `?q=` does not bypass, `?from=…&to=…` does
  not bypass, `?deleted=…` does not bypass, `?orderBy=`
  does not bypass, `?category=` does not bypass, status
  stable across three permutations, Accept header does
  not branch, repeated query keys do not bypass,
  NextRequest-typed signature stable across cookie / IP
  side channels) that mirror the sibling admin-API
  query-surface specs.
- `docs/plugins` Added `admin-dashboard-page-object.md` —
  the **sixth per-source-file reference** the docs tree
  publishes for any file under
  `apps/web-e2e/page-objects/admin/`, paired with
  [`apps/web-e2e/page-objects/admin/dashboard.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/admin/dashboard.page.ts)
  and the **first** admin-tree driver in the rollout that
  documents a **`getByRole('tablist')`-anchored multi-tab
  navigation surface** with a per-tab `selectTab(tabName)`
  helper that closes over a case-insensitive substring-
  match accessible-name regex (distinct from the form-
  modal / row-action postures the five prior admin-tree
  drivers — bulk-actions, clients, collections, comments,
  companies — document, and distinct from every public-
  tree driver in the suite which has no tab-based
  navigation surface today). Documents the full surface
  for the `AdminDashboardPage` driver — the three
  `readonly` Locator fields (`mainContent`, `tabList`,
  `refreshButton`), the `navigate()` shortcut that closes
  over the inherited `goto('/admin')`, and the
  `selectTab(tabName)` async method that closes over a
  `tabList`-scoped `getByRole('tab', { name: tabName,
exact: false }).click()` chain. Pinned to
  [`apps/web-e2e/tests/admin/dashboard.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/dashboard.spec.ts)
  (four flows over the admin-shell dashboard-landing
  surface — authenticated admin can access admin panel,
  admin dashboard displays tab navigation, non-admin
  client is redirected from admin, unauthenticated user
  cannot access admin); the "Why `AdminDashboardPage`
  extends `BasePage`" three-reason analysis (page-route
  navigation via the inherited `goto`, global header /
  footer / nav-link chrome surfaced for free, post-
  navigation `waitForPageReady` stabiliser); the "Why
  `mainContent` uses `#main-content`" three-reason
  analysis (production-source-stable id-binding for the
  skip-link target, `getByRole('main')` would resolve too
  broadly, the `data-testid` posture would force a
  production-source change); the "Why `tabList` uses
  `getByRole('tablist')`" three-reason analysis
  (accessibility-tree-canonical posture, production-
  source consistency with the per-tab `getByRole('tab')`
  posture, the `data-testid` posture would force a
  production-source change); the "Why `refreshButton`
  uses `getByRole('button', { name: /refresh/i }).first()`"
  three-reason analysis (case-insensitive substring-match
  tolerates production-source rephrasing, `.first()`
  defends against multi-button pages, the `data-testid`
  posture would force a production-source change); the
  "Why `selectTab` is an async method" three-reason
  analysis (consuming specs always click the resolved
  tab, the `tabList`-scoped selector is the load-bearing
  invariant, the `exact: false` posture is the canonical
  Playwright shortcut for case-insensitive substring-
  match); cross-references to all five prior admin-tree
  page-object docs and to the public-tree drivers; and
  a "What it does not contain" five-bullet enumeration
  of the deliberate omissions (no `getByTestId` selectors,
  no per-tab Locator getters, no per-stat Locators, no
  `clickRefresh()` helper, no `assertTabSelected(tabName)`
  helper) that future contributors must respect when they
  add new helpers to keep the driver minimal. Continues
  the rollout of the per-source-file admin page-object
  references — eleven admin-tree page objects remain
  (data-export, featured-items, item-form, items,
  notifications, reports, roles, settings, sponsorships,
  surveys, tags). Updates [`docs/index.md`](./index.md)
  with the standard one-paragraph entry that lists all
  prior admin-tree page-object docs as cross-references
  and pins the consuming spec, the four-flow envelope,
  the change protocol (update the doc in the same PR,
  update this log, cross-check `e2e-tsconfig.md`,
  `playwright-config.md`, `fixtures-index.md`, run
  `pnpm tsc --noEmit`, run a smoke-subset Playwright run
  targeting the dashboard spec subset, a Spec 010 cross-
  link if the change introduces a new shared concept,
  and a reviewer pass), and follows the same posture as
  the five prior admin-tree page-object index entries.
- `apps/web-e2e/tests/api` Added
  `admin-categories-query.spec.ts` — the **eighth per-
  route admin-API query-surface smoke spec** (after
  `admin-by-id`, `admin-collections-query`,
  `admin-comments-query`, `admin-companies-query`,
  `admin-dashboard-stats-query`,
  `admin-geo-analytics-query`,
  `admin-items-stats-query`, and `admin-users-query`),
  pinned to the
  [`apps/web/app/api/admin/categories/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/categories/route.ts)
  handler. Pins the unauth-branch contract (always 401
  with the canonical
  `{ success: false, error: 'Unauthorized. Admin access required.' }`
  envelope, distinct from the bare
  `{ error: 'Unauthorized' }` envelope the
  `admin/companies` route emits and from the
  `{ success: false, error: 'Forbidden' }` envelope the
  `admin/comments` route emits) across a sweep of the
  five documented query keys (`page`, `limit`,
  `includeInactive`, `sortBy`, `sortOrder`) and a
  speculative-bypass sweep (`?userId=`, `?token=`,
  `?bypass=`, `?fields=`, `?categoryId=`, `?q=`,
  `?from=…`, `?to=…`, `?deleted=…`) that catches any
  future regression that reads a query param before the
  admin gate. Includes the standard 18 invariant
  assertions (`< 500` per parametrised path, exact-401-
  envelope for the no-arg baseline, status-stable across
  permutations, pagination-validators-do-not-fire-on-
  unauth, `?includeInactive=` does not bypass,
  `?sortBy=` does not bypass, `?sortOrder=` does not
  bypass, `?userId=` does not bypass, `?token=` does not
  bypass, `?bypass=` does not bypass, `?fields=` does
  not bypass, `?categoryId=` does not bypass, `?q=` does
  not bypass, `?from=…&to=…` does not bypass,
  `?deleted=…` does not bypass, status stable across
  three permutations, Accept header does not branch,
  repeated query keys do not bypass, NextRequest-typed
  signature stable across cookie / IP side channels)
  that mirror the sibling admin-API query-surface specs.

## 2026-05-02

- `docs/plugins` Added `admin-companies-page-object.md` —
  the **fifth per-source-file reference** the docs tree
  publishes for any file under
  `apps/web-e2e/page-objects/admin/`, paired with
  [`apps/web-e2e/page-objects/admin/companies.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/admin/companies.page.ts)
  and the **first** admin-tree driver in the rollout that
  documents both a **bare `.fixed.inset-0.z-50` Tailwind-
  overlay form modal** (matching the clients driver's
  posture for the create / edit form) **and** a separate
  **text-filtered Tailwind-overlay delete-confirmation
  modal** (`.fixed.inset-0.z-50` overlay primitive scoped
  by a `hasText: /delete company/i` filter — distinct from
  the clients driver's named-class `deleteConfirmModal`
  selector and from the comments driver's
  `[role="dialog"]` selector). Documents the full surface
  for the `AdminCompaniesPage` driver — the two `readonly`
  Locator fields (`heading`, `addCompanyButton`), the
  seven per-element getters (`companyFormModal`,
  `companyNameInput`, `cancelButton`,
  `createCompanyButton`, `updateCompanyButton`,
  `deleteConfirmModal`, `confirmDeleteButton`), and the
  single `navigate()` shortcut that closes over the
  inherited `goto('/admin/companies')`. Pinned to
  [`apps/web-e2e/tests/admin/companies.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/companies.spec.ts)
  (four flows over the admin companies-management
  surface — admin can access companies management page,
  admin can open create company modal, admin can create
  a new company, admin can open delete company
  confirmation); the "Why `AdminCompaniesPage` extends
  `BasePage`" three-reason analysis (page-route
  navigation via the inherited `goto`, global header /
  footer / nav-link chrome surfaced for free, post-
  navigation `waitForPageReady` stabiliser); the "Why
  `.fixed.inset-0.z-50` for the form modal" three-reason
  analysis (production-source consistency with the
  clients / collections form-modal posture, no
  `[role="dialog"]` on the production source today, the
  `data-testid` posture would force a production-source
  change); the "Why `.first()` on `companyFormModal` (and
  not on `deleteConfirmModal`)" three-reason analysis
  (multi-instance selector, text-filter disambiguation,
  modal-mount lifecycle differences); the "Why
  `companyNameInput` uses `locator('input').first()`"
  three-reason analysis (no production-source-stable
  placeholder, no accessible-name binding, single-input
  form contract); the "Why `confirmDeleteButton` uses an
  exact-match `/^delete$/i` regex" three-reason analysis
  (HeroUI Modal title is the modal's accessible name,
  case-insensitive flag tolerates capitalisation drift,
  modal-scope second-line defence); the "Why two distinct
  submit-button getters" three-reason analysis (per-mode
  accessible names, per-mode test assertions, future-
  proof against per-mode loading states); the "Why
  `companyFormModal` is a getter" three-reason analysis;
  the failure matrix; the per-line walkthrough; and the
  read / write surface table mapping every caller to the
  fields they touch.
- `apps/web-e2e/tests/api` Added `admin-companies-query.spec.ts`
  — the **deep query-param surface smoke** for the
  admin-gated companies-listing endpoint at
  [`apps/web/app/api/admin/companies/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/companies/route.ts).
  Mirrors the `admin-collections-query.spec.ts` /
  `admin-comments-query.spec.ts` /
  `admin-dashboard-stats-query.spec.ts` /
  `admin-geo-analytics-query.spec.ts` /
  `admin-items-stats-query.spec.ts` /
  `admin-users-query.spec.ts` /
  `client-dashboard-stats-query.spec.ts` shape; pins the
  "admin gate fires before any `searchParams.get(...)` /
  repository call" invariant by walking the route's four
  documented query params (`page`, `limit`, `q`, `status`)
  plus standard admin-impersonation / magic-token /
  admin-override / field-projection / cache-busting /
  format-negotiation / locale / multi-tenancy / time-
  range / sort / soft-delete-filter / company-targeting
  (by id / slug / domain) / repeated / bogus-key /
  Cookie-header probe sets (~95 deep paths). Adds 16
  deep tests on top of the per-path 4xx baseline: the
  deterministic 401 with the bare-error envelope
  `{ error: 'Unauthorized' }` assertion (the route uses
  the legacy bare-error envelope rather than the
  unified `{ success: false, error }` envelope the
  `admin/comments` route uses; the 401 status is the
  same posture as the `admin/collections` and
  `admin/users` routes for the unauth case); a stable-
  status-across-permutations assertion; eight "does NOT
  bypass the admin gate" assertions for `?q=…`,
  `?page=…&limit=…`, `?status=…`, `?userId=…`,
  `?token=…`, `?bypass=…`, `?fields=…`, `?companyId=…`;
  three "introduces no specific bypass" assertions for
  `?from=…&to=…`, `?sortBy=…`, `?deleted=…`; a stable-
  status-across-param-permutations assertion; an Accept-
  header invariance assertion; a repeated-keys
  invariance assertion; a NextRequest-typed handler
  signature stability assertion sweeping known-bogus
  Cookie / X-Forwarded-For / X-Real-IP headers. Closes
  the "deep query-surface walk" gap on the admin
  companies-listing route under
  [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
  and adds the **first** deep-query-surface smoke for
  the `q`-keyed search-input convention (where every
  other admin-route smoke pinned to date uses the
  `search`-keyed convention) — locking the
  production-source naming divergence into the test
  suite as a regression guard.

- `docs/plugins` Added `admin-comments-page-object.md` —
  the **fourth per-source-file reference** the docs tree
  publishes for any file under
  `apps/web-e2e/page-objects/admin/`, paired with
  [`apps/web-e2e/page-objects/admin/comments.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/admin/comments.page.ts)
  and the **first** admin-tree driver in the rollout that
  documents a **HeroUI-Modal-based delete confirmation
  surface** (a `[role="dialog"]` overlay rather than the
  browser-native `confirm()` dialog the collections driver
  documents, and rather than the custom-React
  `deleteConfirmModal` overlay the clients driver
  documents). Documents the full surface for the
  `AdminCommentsPage` driver — the two `readonly` Locator
  fields (`heading`, `searchInput`), the two per-action
  methods (`searchComments(term)`, `clearSearch()`), the
  two per-element getters (`deleteCommentDialog`,
  `deleteButtons`), and the single `navigate()` shortcut
  that closes over the inherited `goto('/admin/comments')`.
  Pinned to
  [`apps/web-e2e/tests/admin/comments.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/comments.spec.ts)
  (four flows over the admin comments-management
  surface); the "Why `AdminCommentsPage` extends `BasePage`"
  three-reason analysis (page-route navigation via the
  inherited `goto`, global header / footer / nav-link
  chrome surfaced for free, post-navigation
  `waitForPageReady` stabiliser); the "Why
  `getByRole('searchbox')` for the search input" three-
  reason analysis (HeroUI's `<Input type="search">` lights
  up the canonical role automatically, independent of
  placeholder text, the `data-testid` posture would force
  a production-source change); the "Why `searchComments` /
  `clearSearch` and not direct Locator drives" three-
  reason analysis (documentation-by-default, forward-
  compatible with debouncing / IME composition / multi-
  step interactions, symmetric with future per-input
  drivers); the "Why `deleteCommentDialog` and
  `deleteButtons` are getters and not `readonly` fields"
  three-reason analysis; the "Why a HeroUI Modal (and not
  `confirm()` or a custom-React overlay) for the delete
  confirmation" three-reason analysis (production-source
  consistency with HeroUI Modal use elsewhere in the
  admin shell, per-page contract divergence from
  collections / clients postures, `[role="dialog"]` lights
  up the screen-reader path); the "Why `deleteButtons`
  uses a dual-selector" three-reason analysis (HeroUI
  `color="danger"` prop + Tailwind utility-class fallback,
  future-proof against HeroUI prop reshuffling, the
  consuming spec uses an inline svg-children selector);
  the failure matrix; the per-line walkthrough; and the
  read / write surface table mapping every caller to the
  fields they touch.
- `apps/web-e2e/tests/api` Added `admin-comments-query.spec.ts`
  — the **deep query-param surface smoke** for the
  admin-gated comments-listing endpoint at
  [`apps/web/app/api/admin/comments/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/comments/route.ts).
  Mirrors the `admin-collections-query.spec.ts` /
  `admin-dashboard-stats-query.spec.ts` /
  `admin-geo-analytics-query.spec.ts` /
  `admin-items-stats-query.spec.ts` /
  `admin-users-query.spec.ts` /
  `client-dashboard-stats-query.spec.ts` shape; pins the
  "admin gate fires before any `searchParams.get(...)` /
  drizzle query" invariant by walking the route's three
  documented query params (`page`, `limit`, `search`)
  plus standard admin-impersonation / magic-token /
  admin-override / field-projection / cache-busting /
  format-negotiation / locale / multi-tenancy / time-
  range / rating-filter / soft-delete-filter / sort /
  comment-targeting / item-targeting / repeated / bogus-
  key / Cookie-header probe sets (~85 deep paths). Adds
  16 deep tests on top of the per-path 4xx baseline: the
  deterministic 403 with the canonical `{ success:
false, error: 'Forbidden' }` envelope assertion (the
  single-step gate collapses unauthenticated and
  authenticated-non-admin into the same 403, distinct
  from the `admin/users` route's two-step 401-then-403
  split AND distinct from the `admin/collections`
  route's single-step 401 gate); a stable-status-across-
  permutations assertion; eight "does NOT bypass the
  admin gate" assertions for `?search=…`, `?page=…
&limit=…`, `?userId=…`, `?token=…`, `?bypass=…`,
  `?format=…`, `?fields=…`, `?commentId=…`; two
  "introduces no specific bypass" assertions for
  `?rating=…` and `?status=…`; a stable-status-across-
  param-permutations assertion; an Accept-header
  invariance assertion; a repeated-keys invariance
  assertion; a bare-Request-typed handler signature
  stability assertion (this route uses bare `Request`,
  distinct from the `admin/collections` route's
  `NextRequest`-typed handler) sweeping known-bogus
  Cookie / X-Forwarded-For / X-Real-IP headers. Closes
  the "deep query-surface walk" gap on the admin
  comments-listing route under
  [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
  and adds the **first** deep-query-surface smoke for any
  bare-`Request`-typed handler in the suite — every other
  query-surface smoke pinned to date is for either a
  `NextRequest`-typed admin handler or a session-gated
  client / payment / public route.

- `docs/plugins` Added `admin-collections-page-object.md` —
  the **third per-source-file reference** the docs tree
  publishes for any file under
  `apps/web-e2e/page-objects/admin/`, paired with
  [`apps/web-e2e/page-objects/admin/collections.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/admin/collections.page.ts)
  and the **first** admin-tree driver in the rollout that
  documents a **named-row helper API**
  (`getCollectionByName(name)`, `editCollection(name)`,
  `deleteCollection(name)`) on top of the per-page Locator
  fields, plus a **per-form fill helper**
  (`fillCollectionForm({ id?, name, description? })`) that
  encodes the multi-input form-fill convention every future
  admin-form driver in the suite mirrors. Documents the
  full surface for the `AdminCollectionsPage` driver — the
  two `readonly` Locator fields (`heading`,
  `addCollectionButton`), the nine per-form modal getters
  (`collectionFormModal`, `collectionIdInput`,
  `collectionNameInput`, `collectionIconInput`,
  `collectionDescriptionInput`, `activeToggle`,
  `cancelButton`, `createButton`, `saveButton`), the three
  named-row helpers (`getCollectionByName`,
  `editCollection`, `deleteCollection`), the per-form fill
  helper (`fillCollectionForm`), and the single
  `navigate()` shortcut that closes over the inherited
  `goto('/admin/collections')`. Pinned to
  [`apps/web-e2e/tests/admin/collections.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/collections.spec.ts)
  (five flows over the admin collections-management
  surface); the "Why `AdminCollectionsPage` extends
  `BasePage`" three-reason analysis (page-route navigation
  via the inherited `goto`, global header / footer /
  nav-link chrome surfaced for free, post-navigation
  `waitForPageReady` stabiliser); the "Why
  `getByPlaceholder(...)` for every form-input field"
  three-reason analysis (HeroUI's `<Input>` does not pair
  with a visible `<label>`, `getByRole('textbox', { name:
… })` would resolve via the same accessible-name
  computation but with an extra hop, the `data-testid`
  posture would force a production-source change purely
  for the e2e suite); the "Why `collectionFormModal` is a
  getter and not a `readonly` field" three-reason analysis
  (late-binding against modal mount/unmount lifecycle,
  symmetric with `clientFormModal` /
  `deleteConfirmModal` on the clients driver, used as the
  scope-anchor for nine downstream per-form-element
  getters); the "Why three named-row helpers" three-
  reason analysis (the collections page is the first
  admin-tree surface with per-row edit/delete buttons in
  the rollout, the helpers compose with the underlying
  Locator API rather than replacing it, the helpers are
  documentation-by-default for new contributors); the
  "Why `fillCollectionForm` accepts an object and not
  positional args" three-reason analysis; the "Why
  placeholder-only inputs (no per-input `aria-label` or
  `data-testid`)" three-reason analysis; the failure
  matrix; the per-line walkthrough; and the read / write
  surface table mapping every caller to the fields they
  touch.
- `apps/web-e2e/tests/api` Added `admin-collections-query.spec.ts`
  — the **deep query-param surface smoke** for the
  admin-gated collections-listing endpoint at
  [`apps/web/app/api/admin/collections/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/collections/route.ts).
  Mirrors the `admin-dashboard-stats-query.spec.ts` /
  `admin-geo-analytics-query.spec.ts` /
  `admin-items-stats-query.spec.ts` /
  `admin-users-query.spec.ts` /
  `client-dashboard-stats-query.spec.ts` shape; pins the
  "admin gate fires before any `searchParams.get(...)` /
  `collectionRepository.findAllPaginated(...)` call"
  invariant by walking the route's six documented query
  params (`page`, `limit`, `includeInactive`, `search`,
  `sortBy`, `sortOrder`) plus standard
  admin-impersonation / magic-token / admin-override /
  field-projection / cache-busting / format-negotiation /
  locale / multi-tenancy / time-range / aggregation /
  repeated / bogus-key / NextRequest-cookie probe sets
  (~80 deep paths). Adds 17 deep tests on top of the
  per-path 4xx baseline: the deterministic 401 with the
  canonical `{ success: false, error: "Unauthorized.
Admin access required." }` envelope assertion (the
  single-step gate collapses unauthenticated and
  authenticated-non-admin into the same 401, distinct
  from the `admin/users` route's two-step 401-then-403
  split); a stable-status-across-permutations assertion;
  six "does NOT bypass the admin gate" assertions for
  `?search=…`, `?sortBy=…`, `?sortOrder=…`,
  `?includeInactive=…`, `?page=…&limit=…`, `?userId=…`;
  a "does NOT bypass the admin gate" assertion for
  the higher-than-usual `?limit=` 1000 ceiling sweep
  (this route is unique in allowing per-page limit up
  to 1000 because collections are loaded from Git); two
  "does NOT introduce a magic-token / admin-override
  bypass" assertions; two "does NOT introduce a
  content-negotiation / field-projection bypass"
  assertions; one "does NOT introduce a single-collection-
  targeting bypass" assertion (the route's listing
  surface vs the `[id]` per-collection endpoint); a
  "stable status across param permutations" assertion
  sweeping three orthogonal parameter sets; a "does NOT
  branch on Accept header" assertion; a "repeated query
  keys do NOT bypass the gate" assertion; and a
  "NextRequest-typed handler signature stable" assertion
  that sweeps fabricated session-cookie / forwarded-IP
  headers to defend against any future cookie-or-IP-
  driven auth bypass.
- `docs/plugins` Added `admin-clients-page-object.md` —
  the **second per-source-file reference** the docs tree
  publishes for any file under
  `apps/web-e2e/page-objects/admin/`, paired with
  [`apps/web-e2e/page-objects/admin/clients.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/admin/clients.page.ts)
  and continuing the rollout the
  [`admin-bulk-actions-page-object.md`](plugins/admin-bulk-actions-page-object.md)
  template established. Documents the full surface for the
  `AdminClientsPage` driver — the two `readonly` Locator
  fields (`heading`, `addClientButton`), the four per-page
  modal getters (`clientFormModal`, `deleteConfirmModal`,
  `confirmDeleteButton`, `cancelDeleteButton`), and the
  single `navigate()` shortcut that closes over the
  inherited `goto('/admin/clients')`. Pinned to
  [`apps/web-e2e/tests/admin/clients.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/clients.spec.ts)
  (four flows over the admin clients-management surface);
  the "Why `AdminClientsPage` extends `BasePage`" three-
  reason analysis (page-route navigation via the inherited
  `goto`, global header / footer / nav-link chrome surfaced
  for free, post-navigation `waitForPageReady` stabiliser);
  the "Why `getByRole('button', { name: /add client/i })` for
  `addClientButton`" three-reason analysis (accessibility-
  tree-canonical posture, locale-tolerant via the
  case-insensitive regex, strict-mode safety via `.first()`
  against multi-button surfaces); the "Why `clientFormModal`
  and `deleteConfirmModal` are getters and not `readonly`
  fields" three-reason analysis (late-binding against the
  modal mount/unmount lifecycle, symmetry with the
  bulk-actions driver, per-call `filter()` invocation on
  `deleteConfirmModal`); the "Why `.fixed.inset-0.z-50` for
  both modal surfaces" three-reason analysis (production-source
  posture without `role="dialog"`, substring filter for
  disambiguation, host-app's CSS-utility convention); the
  "Why `^delete$` anchored regex for `confirmDeleteButton`"
  three-reason analysis (defends against the modal heading
  collision, defends against future "Cannot delete" warning
  button, symmetric with bulk-actions driver but
  smaller-blast-radius for the more crowded modal scope);
  the "Why nested `deleteConfirmModal.getByRole(...)` and
  not `page.getByRole(...)`" three-reason analysis
  (defends against per-row Delete/Cancel button collision
  on the underlying clients table, re-uses the late-binding
  lifecycle of the modal getter, symmetric with public-tree
  modal drivers); the failure matrix; the per-line
  walkthrough; and the read / write surface table mapping
  every caller to the fields they touch.
- `apps/web-e2e/tests/api` Added `admin-users-query.spec.ts`
  — the **deep query-param surface smoke** for the
  admin-gated user-listing endpoint at
  [`apps/web/app/api/admin/users/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/users/route.ts).
  Mirrors the `admin-dashboard-stats-query.spec.ts` /
  `admin-geo-analytics-query.spec.ts` /
  `admin-items-stats-query.spec.ts` /
  `client-dashboard-stats-query.spec.ts` shape; pins the
  "session+admin gate fires before any `searchParams.get(...)`,
  validator, or `userRepository.findAll(...)` call"
  invariant by walking the route's eight documented query
  params (`page`, `limit`, `search`, `role`, `status`,
  `sortBy`, `sortOrder`, `includeInactive`) plus standard
  admin-impersonation / magic-token / admin-override /
  field-projection / cache-busting / format-negotiation /
  locale / multi-tenancy / time-range / aggregation /
  repeated / bogus-key / NextRequest-cookie probe sets
  (~80 deep paths). Adds 19 deep tests on top of the
  per-path 4xx baseline: the deterministic 401 with the
  canonical `{ success: false, error: "Unauthorized" }`
  envelope assertion (note: this route is
  **two-step gated** — session 401 then admin 403, unlike
  `admin/items/stats`'s single 401 envelope); a
  stable-status-across-permutations assertion; eight "does
  NOT bypass the admin gate" assertions for `?search=…`,
  `?role=…`, `?status=…`, `?sortBy=…`, `?sortOrder=…`,
  `?includeInactive=…`, `?page=…&limit=…`, `?userId=…`;
  two "does NOT bypass the gate, and the length validator
  does NOT fire on the unauth branch" assertions for
  oversize `?search=…` (>100 chars trips a 400 on auth)
  and oversize `?role=…` (>50 chars trips a 400 on auth);
  three "does NOT introduce a query-token / admin-override
  / content-negotiation / field-projection bypass"
  assertions; a "stable status across param permutations"
  assertion sweeping three orthogonal parameter sets; a
  "does NOT branch on Accept header" assertion; a
  "repeated query keys do NOT bypass the gate" assertion;
  and a "NextRequest-typed handler signature stable"
  assertion that sweeps fabricated session-cookie /
  forwarded-IP headers to defend against any future
  cookie-or-IP-driven auth bypass.
- `docs/plugins` Added `admin-bulk-actions-page-object.md` —
  the **first per-source-file reference** the docs tree
  publishes for any file under
  `apps/web-e2e/page-objects/admin/`, paired with
  [`apps/web-e2e/page-objects/admin/bulk-actions.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/admin/bulk-actions.page.ts)
  and establishing the template the remaining sixteen
  admin-tree page-object docs (one per source file) will
  mirror. Documents the full surface for the
  `AdminBulkActionsPage` driver — the eight `readonly`
  Locators (`heading`, `selectAllCheckbox`,
  `bulkActionBar`, `approveButton`, `rejectButton`,
  `deleteButton`, `clearSelectionButton`, `confirmDialog`),
  the `itemCheckboxes` getter, and the single
  `navigate()` shortcut that closes over the inherited
  `goto('/admin/items')`. Pinned to
  [`apps/web-e2e/tests/admin/bulk-actions.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/admin/bulk-actions.spec.ts)
  (five flows over the items-listing bulk surface); the
  "Why `AdminBulkActionsPage` extends `BasePage`" three-
  reason analysis (page-route navigation via the inherited
  `goto`, global header / footer / nav-link chrome
  surfaced for free, post-navigation `waitForPageReady`
  stabiliser); the "Why the bilingual `aria-label`
  OR-of-two-paths on `selectAllCheckbox`" three-reason
  analysis (production source bilingualism between the
  canonical `"Select all"` English-locale phrase and the
  i18n-key fallback `"SELECT_ALL"` for catalogue-incomplete
  tenants, substring tolerance via the `i` flag, `.first()`
  pin against per-row select-all duplicates); the "Why
  `[role="toolbar"]` for `bulkActionBar`" three-reason
  analysis; the "Why `getByRole('button', { name: /…/i })`
  for the four action buttons" three-reason analysis; the
  "Why `[role="dialog"][aria-modal="true"]` for
  `confirmDialog`" three-reason analysis (modal vs
  non-modal disambiguation, strict-mode safety against
  tooltip / toast libraries, `.first()` pin against
  parallel modals); the "Why `itemCheckboxes` is a getter
  and not a `readonly` field" three-reason analysis;
  the "Why `aria-label*=\"Select\" i` and not
  `getByRole('checkbox', { name: /select/i })` for
  `itemCheckboxes`" three-reason analysis; the failure
  matrix; the per-line walkthrough; and the read / write
  surface table mapping every caller to the fields they
  touch.
- `apps/web-e2e/tests/api` Added `admin-items-stats-query.spec.ts`
  — the **deep query-param surface smoke** for the
  admin-gated item-stats endpoint at
  [`apps/web/app/api/admin/items/stats/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/items/stats/route.ts).
  Mirrors the `admin-dashboard-stats-query.spec.ts` /
  `admin-geo-analytics-query.spec.ts` /
  `client-dashboard-stats-query.spec.ts` shape; pins the
  "admin gate fires before any `searchParams.get(...)` /
  `itemRepository.getStats(...)` call" invariant by
  walking the route's three documented query params
  (`search`, `categories`, `tags`) plus standard
  admin-impersonation / magic-token / admin-override /
  status-filter / time-range / fields-projection /
  cache-busting / format-negotiation / locale /
  multi-tenancy / aggregation / repeated / long /
  bogus-key probe sets. Adds 13 deep tests on top of the
  per-path 4xx baseline: a deterministic 401 with the
  canonical `{ success: false, error: "Unauthorized. Admin access required." }`
  envelope assertion; a stable-status-across-permutations
  assertion; six "does NOT bypass the admin gate"
  assertions for `?search=…`, `?categories=…`, `?tags=…`,
  `?userId=…`, `?token=…`, `?bypass=…`; four "does NOT
  change the unauth branch" assertions for `?status=…`,
  `?from=…&to=…`, `?format=…`, `?categories=,,,`
  empty-only comma payloads; and two "does NOT branch on
  Accept header" / "keeps the response status stable
  across param permutations" assertions. Stays under the
  `<500` ceiling on every probe so the spec is green
  whether the route returns the canonical 401 or a future
  hardened 403.
- `docs/plugins` Added `public-pages-page-object.md` —
  the **per-source-file reference** for the Playwright e2e
  suite's generic public content-page + error-page drivers
  paired with
  [`apps/web-e2e/page-objects/public/public-pages.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/public/public-pages.page.ts),
  sitting inside the `public/` page-object subtree alongside
  the thirteen other public-surface page objects and
  closing the gap that left the `public-pages.page.ts`
  source as the only public-tree page-object source file
  without a per-source-file doc reference. Documents the
  full surface across both `PublicPagesPage` (the route-
  driver class with the `heading` / `mainContent` /
  `breadcrumb` Locators and the six route shortcuts to
  `/collections`, `/categories`, `/tags`, `/cookies`,
  `/pricing`, `/sponsor`) and `ErrorPage` (the error-
  surface class with the `heading` / `errorCode` /
  `goHomeButton` / `goBackButton` Locators); the
  spec-context cross-links to
  [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
  and the consuming specs at
  [`apps/web-e2e/tests/public/collections.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/public/collections.spec.ts),
  [`apps/web-e2e/tests/public/sponsor.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/public/sponsor.spec.ts),
  and
  [`apps/web-e2e/tests/public/error-pages.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/public/error-pages.spec.ts);
  the "Why `PublicPagesPage` extends `BasePage`" three-
  reason analysis (page-route navigation via the inherited
  `goto` method, global `header` / `footer` / `navLinks`
  chrome surfaced for free, `waitForPageReady` post-
  navigation stabiliser); the "Why `PublicPagesPage` and
  `ErrorPage` co-habit a single file" three-reason analysis
  (an error page is structurally a content page that
  happens to be a 404 / 403, the two classes share the
  same `BasePage` import and `Page, Locator` type-only
  import, the two classes are consumed together by every
  spec that drives a feature-flag-gated route like
  `/sponsor`); the "Why `heading` uses
  `getByRole('heading').first()`" three-reason analysis
  (accessibility-tree-canonical posture, strict-mode-
  correctness against `<h2>` / `<h3>` siblings, locale-
  stable selector); the "Why `breadcrumb` uses an
  OR-of-two-paths" three-reason analysis (canonical
  `aria-label="breadcrumb"` with case-insensitive flag,
  structural fallback `<nav><ol>`, `.first()` strict-mode-
  correctness); the "Why `errorCode` uses
  `getByText(/404\|403/)`" three-reason analysis (error
  code as primary user-facing discriminator, regex form
  vs. string form, no `.first()` required); the "Why
  `goHomeButton` uses `role="link"`" three-reason analysis
  (`<a href="/">` canonical, `.first()` strict-mode-
  correctness, case-insensitive substring); the "Why
  `goBackButton` uses `role="button"`" three-reason
  analysis (`<button onClick={() => history.back()}>`
  canonical, two-word safety lock, `.first()` strict-mode-
  correctness); the failure matrix of 27 mistakes; the
  per-line walkthrough table; the read / write surface
  tables; and the 13-step `public-pages.page.ts`-change
  checklist tying any change to a spec audit, a
  `base-page-object.md` cross-check, a production-source
  cross-check on each of the six routes and the error
  template, a `e2e-tsconfig.md` / `playwright-config.md` /
  `fixtures-index.md` cross-check, dual `pnpm tsc --noEmit`
  runs, a smoke-subset Playwright run targeting
  `--grep "Collections\|Categories\|Tags\|Cookies\|Pricing\|Sponsor\|Error"`,
  a `docs/log.md` entry, a [Spec 010](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
  cross-link, and a reviewer pass.
- `apps/web-e2e/tests/api` Added
  `admin-geo-analytics-query.spec.ts` — the **deep
  query-param surface smoke** for the admin-gated
  geo-analytics endpoint at
  [`apps/web/app/api/admin/geo-analytics/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/geo-analytics/route.ts).
  Walks ~80 query-string permutations across the
  admin-impersonation key family
  (`?userId=` / `?user_id=` / `?adminId=` / `?as=admin` /
  `?asAdmin=true` / `?impersonate=admin`), the magic-token
  bypass family (`?token=` / `?secret=` / `?api_key=` /
  `?authorization=` / `?session=` / `?adminToken=`), the
  admin-override key family (`?bypass=` / `?admin=` /
  `?override=` / `?force=`), the geo-filter family
  (`?country=` / `?city=` / `?serviceArea=`), the
  distribution-tuning override family
  (`?topCitiesLimit=` / `?topCountriesLimit=`), the
  heatmap-density family (`?heatmapResolution=` /
  `?heatmapBuckets=` / `?gridSize=`), the remote-filter
  family (`?includeRemote=` / `?excludeRemote=` /
  `?onlyRemote=`), the time-range family (`?from=` /
  `?to=` / `?since=` / `?until=`), the content-projection
  family (`?fields=` / `?select=` / `?include=` /
  `?exclude=`), the cache-busting family (`?refresh=` /
  `?force=` / `?fresh=` / `?cache=` / `?nocache=`), the
  content-negotiation family (`?format=json` / `geojson` /
  `csv` / `xml`), the i18n family (`?locale=` / `?lang=`),
  the multi-tenancy family (`?tenant=` / `?tenantId=` /
  `?org=`), the bounding-box family (`?bbox=` / `?bounds=`
  / `?viewport=`), and the empty-value / repeated-key /
  injection-style / long-value / bogus-key permutations.
  Pins the **zero-argument-handler / always-401-on-the-
  unauth-branch** invariant via the same shape as the
  sibling
  [`admin-dashboard-stats-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/admin-dashboard-stats-query.spec.ts),
  [`client-dashboard-stats-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/client-dashboard-stats-query.spec.ts),
  [`client-geo-stats-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/client-geo-stats-query.spec.ts),
  [`client-items-coordinates-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/client-items-coordinates-query.spec.ts),
  and other query-surface smoke specs. Adds 14 dedicated
  invariant tests on top of the loop: status-stable
  across permutations, 4xx with stable success-
  discriminator on the unauth branch, no
  query-userId-bypass / no query-token-bypass / no
  query-admin-override, geo-filter / distribution-tuning /
  heatmap-density / remote-filter / time-range / viewport-
  filter / format-negotiation params do NOT change the
  unauth branch, status stability across param
  permutations, and Accept-header invariance. The deeper
  `admin-protected-extra.spec.ts` smoke also covers this
  route at the broad `< 500` level; this spec adds the
  deep query-surface walk on top of that.
- `docs/plugins` Added `profile-dropdown-page-object.md` —
  the **per-source-file reference** for the Playwright e2e
  suite's header profile-dropdown menu driver paired with
  [`apps/web-e2e/page-objects/public/profile-dropdown.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/public/profile-dropdown.page.ts),
  sitting inside the `public/` page-object subtree alongside
  the thirteen other public-surface page objects. Documents
  the at-a-glance summary table of every load-bearing
  element (the type-only Playwright import with **no
  `BasePage` value import** — the standalone-class widget
  posture; the `export class ProfileDropdown` single named
  export with **no `extends` clause** — the standalone-class
  widget convention; the five `readonly` fields covering
  `page` / `triggerButton` / `menu` / `menuItems` /
  `logoutButton`; the synchronous constructor that pre-binds
  every per-page Locator in a single pass via the HTML-
  `id`-based `#user-menu-button` / `#profile-menu` selectors
  and the `this.menu`-scoped `[role="menuitem"]` collection
  plus `.last()` for the bottom-most logout item; the
  `open()` single-step click primitive; the
  `isOpen(): Promise<boolean>` strict-equality
  `aria-expanded === 'true'` accessor; the `clickMenuItem(name: RegExp)`
  arbitrary-menu-item composite with `hasText` filter +
  `.first()`; the `logout()` shortcut bound to the last
  menu item); the full file annotated chunk-by-chunk; the
  spec context cross-links to
  [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
  and
  [Spec 003 — Auth Providers](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/003-auth-providers);
  the "Why the class does not extend `BasePage`" three-
  reason analysis; the "Why the trigger button uses
  `#user-menu-button`" three-reason analysis; the "Why the
  logout button uses `.last()`" three-reason analysis; the
  "Why `isOpen()` checks the exact `'true'` string" three-
  reason analysis; the "Why `clickMenuItem` takes a `RegExp`
  not a `string`" three-reason analysis; the failure matrix
  of 22 mistakes; the per-line walkthrough table; the read /
  write surface summary; the read / write surface failure
  modes table; and the 12-step `profile-dropdown.page.ts`-
  change checklist.
- `apps/web-e2e` Added
  `apps/web-e2e/tests/api/admin-dashboard-stats-query.spec.ts`
  smoke spec for the **unauth GET branch** of the admin-
  gated `/api/admin/dashboard/stats` endpoint served by
  [`apps/web/app/api/admin/dashboard/stats/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/admin/dashboard/stats/route.ts).
  Pins the deterministic 4xx (typically 401) status across
  **60+ query-param permutations** (admin-impersonation
  keys `?userId=` / `?adminId=` / `?as=` / `?asAdmin=` /
  `?impersonate=`, magic-token bypass keys `?token=` /
  `?secret=` / `?api_key=` / `?authorization=` /
  `?adminToken=`, admin-override keys `?bypass=` /
  `?admin=` / `?override=` / `?force=`, analytics-tuning
  override keys `?userGrowthMonths=` / `?activityTrendDays=`
  / `?topItemsLimit=` / `?recentActivityLimit=` for
  edge-cases like `0` / `-1` / `999999` / `NaN` /
  `Infinity`, time-range filter keys `?from=` / `?to=` /
  `?since=` / `?until=`, content-projection keys `?fields=`
  / `?select=` / `?include=`, cache-busting keys, format-
  negotiation keys, locale / tenant keys, empty values,
  repeated keys, special-character / injection-style values,
  long values, bogus keys, combined permutations), plus six
  bypass-resistance invariants (the unauth branch is
  invariant to bogus query parameters, `?userId=…` does not
  bypass the admin gate, `?token=…` does not introduce a
  query-token auth bypass, `?bypass=…` does not introduce a
  query-admin-override, analytics-tuning params do not
  change the unauth branch, time-range params do not change
  the unauth branch, `?format=csv` does not introduce a
  content-negotiation bypass) and Accept-header invariance.
  Closes a gap in [Spec 009](spec/009-admin-dashboard/spec.md)
  and [Spec 010](spec/010-e2e-test-coverage/spec.md), and
  complements
  [`protected.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/protected.spec.ts)'s
  broad-coverage `< 500` smoke against the same route.
- `docs/plugins` Added `newsletter-page-object.md` — the
  **per-source-file reference** for the Playwright e2e
  suite's footer newsletter signup form driver paired with
  [`apps/web-e2e/page-objects/public/newsletter.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/public/newsletter.page.ts),
  sitting inside the `public/` page-object subtree alongside
  the thirteen other public-surface page objects. Documents
  the at-a-glance summary table of every load-bearing
  element (the type-only Playwright import with **no
  `BasePage` value import** — the standalone-class widget
  posture; the `export class Newsletter` single named export
  with **no `extends` clause** — the load-bearing standalone-
  class widget convention; the four `readonly` fields
  covering `page` / `emailInput` / `submitButton` /
  `errorMessage`; the synchronous constructor that pre-binds
  every per-page Locator in a single pass via the compound
  `input[type="email"][name="email"]` + `.first()` selector
  for the email input, the `..` parent-traversal step +
  `button[type="submit"]` selector for the submit button,
  and the comma-separated `p.text-red-600, p.text-red-400`
  selector + `.first()` for the inline error paragraph; the
  `subscribe(email)` two-step composite that fills the email
  then clicks the submit button via two sequential
  `await`s; the `hasSuccessToast(): Promise<boolean>`
  graceful-degradation accessor with the
  `[data-sonner-toast]` Sonner-canonical data-attribute
  selector + `.first()` + `.catch(() => false)` error
  collapse); the full file annotated chunk-by-chunk; the
  spec context cross-link to
  [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
  and
  [Spec 012 — Newsletter Providers](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/012-newsletter-providers);
  the "Why the class does not extend `BasePage`" three-
  reason analysis; the "Why the email input uses
  `.first()`" three-reason analysis; the "Why the submit
  button uses `..` traversal" three-reason analysis; the
  "Why the error message uses `text-red-600,
text-red-400`" three-reason analysis; the "Why
  `hasSuccessToast()` collapses errors to `false`" three-
  reason analysis; the failure matrix of 21 mistakes; the
  per-line walkthrough table; the read / write surface
  summary; the read / write surface failure modes table;
  and the 12-step `newsletter.page.ts`-change checklist.
- `apps/web-e2e` Added
  `apps/web-e2e/tests/api/polar-subscription-portal-body.spec.ts`
  smoke spec for the **unauth POST branch** of the
  session-gated `/api/polar/subscription/portal` endpoint
  served by
  [`apps/web/app/api/polar/subscription/portal/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/polar/subscription/portal/route.ts).
  Pins the deterministic 401 status and the
  `{ error: 'Unauthorized' }` envelope across **40+ body
  permutations** (`{ userId }`, `{ user_id }`, `{ uid }`,
  `{ id }`, `{ customerId }`, `{ customer_id }`,
  `{ polarCustomerId }`, `{ customer }`,
  `{ subscriptionId }`, `{ planId }`, `{ priceId }`,
  `{ token }`, `{ secret }`, `{ api_key }`,
  `{ authorization }`, `{ session }`, `{ sessionToken }`,
  `{ admin }`, `{ asAdmin }`, `{ bypass }`,
  `{ impersonate }`, `{ returnUrl }`, `{ return_url }`,
  `{ successUrl }`, `{ cancelUrl }`, `{ email }`,
  `{ tenant }`, `{ tenantId }`, `{ org }`, XSS / path-
  traversal / null-byte / SQL-injection-style values, empty
  values, falsy values, long values, combined-keys
  permutation), plus seven bypass-resistance invariants
  (POST without explicit body responds without server
  error, POST returns 401 with stable `{ error: string }`
  envelope, POST is invariant to bogus body keys, `{ userId }`
  does not bypass the session gate, `{ customerId }` does
  not bypass the per-session customer resolution, `{ token }`
  does not introduce a body-token auth bypass, `{ admin }`
  does not introduce a body-admin-override) and an open-
  redirect-leak guard (`{ returnUrl: '<attacker.example>' }`
  must NOT echo the attacker URL in the unauth response
  body) and Accept-header invariance. Closes a gap in
  [Spec 010](spec/010-e2e-test-coverage/spec.md) and
  complements
  [`payment-checkouts.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/payment-checkouts.spec.ts)'s
  broad-coverage `< 500` smoke against the same route.
- `docs/plugins` Added `map-page-object.md` — the
  **per-source-file reference** for the Playwright e2e
  suite's Map View page driver paired with
  [`apps/web-e2e/page-objects/public/map.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/public/map.page.ts),
  sitting inside the `public/` page-object subtree
  alongside the thirteen other public-surface page objects.
  Documents the at-a-glance summary table of every
  load-bearing element (the type-only Playwright import,
  the `export class MapPage extends BasePage` single named
  export with **the `extends BasePage` clause** — the
  page-route driver posture; the eight `readonly Locator`
  fields covering `mapView` / `mapEmptyState` /
  `mapSidebar` / `sidebarCards` / `mapHeaderLink` /
  `viewToggleMapButton` / `showMapButton` /
  `showListButton`; the synchronous constructor that calls
  `super(page)` first then pre-binds every per-page
  Locator in a single pass via four `getByTestId`
  selectors / one inherited-`header`-scoped
  `getByRole('link', …)` exact-match / one
  `aria-label*="map" i` substring-with-case-insensitive-
  flag plus `.first()` / two case-insensitive accessible-
  name-matched buttons; the `navigate()` dedicated `/map`
  route navigation primitive via inherited `goto()`; the
  `isPageRendered(): Promise<boolean>` graceful-degradation
  accessor with the OR-of-two-paths over `mapView` and
  `mapEmptyState` and the `.catch(() => false)` error
  shields on both `isVisible()` calls); the full file
  annotated chunk-by-chunk; the spec context cross-link to
  [Spec 017 — Map View for Listings](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/017-map-view-for-listings)
  and the consuming spec at
  `apps/web-e2e/tests/public/map.spec.ts`; the "Why the
  class extends `BasePage`" walkthrough; the "Why the
  view-toggle uses `aria-label*="map" i`" walkthrough; the
  "Why `isPageRendered()` accepts the empty-state path"
  walkthrough; the failure matrix; the per-line walkthrough
  table; the read / write surface summary; the read /
  write surface failure modes table; and the
  `map.page.ts`-change checklist.
- `apps/web-e2e` Added
  `apps/web-e2e/tests/api/client-items-coordinates-query.spec.ts`
  smoke spec for the **unauth GET branch** of the
  session-gated `/api/client/items/coordinates` endpoint
  served by
  [`apps/web/app/api/client/items/coordinates/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/client/items/coordinates/route.ts).
  Pins the deterministic 401 status and the
  `{ success: false, error }` envelope across **70+ query-
  param permutations** (`?userId=`, `?clientId=`,
  `?token=`, `?country=`, `?lat=`, `?lng=`, `?bbox=`,
  `?radius=`, `?slug=`, `?itemId=`, `?format=`,
  `?fields=`, cache-busting, per-tenant, admin-override,
  special-character payloads, repeated keys, long values,
  bogus keys), plus six bypass-resistance invariants (the
  unauth branch is invariant to bogus query parameters,
  `?userId=…` does not bypass the session gate, `?token=…`
  does not introduce a query-token auth bypass, `?admin=…`
  does not introduce a query-admin-override, spatial-
  filter params do not change the unauth branch, single-
  item-lookup `?slug=…` / `?itemId=…` keys do not change
  the unauth branch, `?format=geojson` does not introduce
  a content-negotiation bypass) and Accept-header
  invariance. Closes a gap in [Spec 010](spec/010-e2e-test-coverage/spec.md).
- `docs/plugins` Added `item-detail-page-object.md` — the
  **per-source-file reference** for the Playwright e2e
  suite's item-detail-page driver paired with
  [`apps/web-e2e/page-objects/public/item-detail.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/public/item-detail.page.ts),
  sitting inside the `public/` page-object subtree
  alongside the thirteen other public-surface page objects.
  Documents the at-a-glance summary table of every
  load-bearing element (the type-only Playwright import,
  the `export class ItemDetailPage extends BasePage` single
  named export with **the `extends BasePage` clause** —
  the page-route driver posture; the eight `readonly Locator`
  fields covering `heading` / `voteButton` / `voteCount` /
  `favoriteButton` / `commentsSection` / `commentTextarea` /
  `postCommentButton` / `signInToCommentButton`; the
  synchronous constructor that calls `super(page)` first
  then pre-binds every per-page Locator in a single pass;
  the `navigateToItem(slug)` slug-driven primitive; the
  `navigateToFirstItem()` slug-agnostic discovery primitive
  with the **30 s seed-data tolerance**; the `clickVote()`
  bare upvote primitive; the `getVoteCount(): Promise<string>`
  polite-aria-live region read with the `?? '0'` fallback;
  the `isVoted(): Promise<boolean>` strict-equality state
  pin on `'Remove upvote'`; the `clickFavorite()` bare
  favorite-toggle primitive; the `postComment(text)`
  composite fill-then-click primitive; the
  `getComment(text): Locator` per-comment factory; the
  `editComment(text)` / `deleteComment(text)` hover-then-
  click primitives; the `get deleteCommentDialog()` re-
  evaluating Locator getter); the full file annotated
  chunk-by-chunk; the spec context cross-link to
  [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
  and the consuming specs at
  `apps/web-e2e/tests/public/item-detail.spec.ts` and
  `apps/web-e2e/tests/public/votes-and-comments.spec.ts`;
  the "Why the class extends `BasePage`" walkthrough; the
  "Why the vote button uses an OR-of-two-aria-labels
  selector" walkthrough; the "Why the favorite button
  uses an `aria-label*="favorites"` substring selector"
  walkthrough; the "Why `getVoteCount()` returns
  `Promise<string>`" walkthrough; the "Why `isVoted()`
  checks the exact `'Remove upvote'` label" walkthrough;
  the failure matrix; the per-line walkthrough table; the
  read / write surface summary; the read / write surface
  failure modes table; and the `item-detail.page.ts`-change
  checklist.
- `apps/web-e2e` Added
  `apps/web-e2e/tests/api/version-sync-query.spec.ts`
  smoke spec for the **GET branch** of the public
  `/api/version/sync` endpoint served by
  [`apps/web/app/api/version/sync/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/version/sync/route.ts).
  Pins the canonical six-key envelope
  (`syncInProgress`, `lastSyncTime`, `timeSinceLastSync`,
  `timeSinceLastSyncHuman`, `uptime`, `timestamp`) and
  the `Cache-Control: no-cache, no-store, must-revalidate`
  / `Content-Type: application/json` header contracts
  across **40+ query-param permutations** (cache-busting,
  per-tenant, per-user-impersonation, locale, format /
  fields / select / include filters, special-character
  payloads, repeated keys, long values, bogus keys), plus
  three correlation invariants
  (`syncInProgress`/`lastSyncTime`/`timeSinceLastSync` /
  `timeSinceLastSyncHuman`) and Accept-header invariance.
  Closes a gap in [Spec 010](spec/010-e2e-test-coverage/spec.md).
- `docs/plugins` Added `language-switcher-page-object.md` — the
  **per-source-file reference** for the Playwright e2e
  suite's header locale-switcher driver paired with
  [`apps/web-e2e/page-objects/public/language-switcher.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/public/language-switcher.page.ts),
  sitting inside the `public/` page-object subtree
  alongside the thirteen other public-surface page objects.
  Documents the at-a-glance summary table of every
  load-bearing element (the type-only Playwright import,
  the `export class LanguageSwitcher` standalone class
  with no `extends` clause, the `readonly page: Page`
  field that the standalone class restates and is also
  consumed inside `selectLanguage` to construct the
  per-locale option Locator at call-time against
  page-level scope because the dropdown may be portal-
  rendered, the `readonly button: Locator` pinned to the
  exact English `aria-label="Select language"` literal
  with `.first()` for strict-mode safety AND the
  deliberate non-localization that lets a user landing on
  a page in a language they cannot read still find the
  switcher, the constructor that pre-binds the trigger
  Locator in a single pass without a `super(page)` call,
  the `open()` minimal "open the dropdown" primitive, the
  `selectLanguage(fullName: string)` composite primitive
  with the load-bearing **full localized native display
  name** parameter (`"Français"` not `"French"` and not
  `"fr"`) reflecting the canonical "language picker shows
  each language in its own language" UX convention so a
  non-English speaker can find their language, the
  `getCurrentLocaleCode(): Promise<string>` accessor
  with the `textContent()?.trim().toUpperCase() ?? ''`
  chain whose `.toUpperCase()` casing-fold tolerates
  future production-source casing drift and whose `?? ''`
  pins the public return type to `Promise<string>`, the
  `isOpen(): Promise<boolean>` accessor that reads
  `aria-expanded` and returns the strict-equality
  comparison `expanded === 'true'`); the full file
  annotated chunk-by-chunk; the spec context cross-link
  to
  [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
  and the consuming spec at
  `apps/web-e2e/tests/public/language-switcher.spec.ts`
  (trigger visibility on `/`, dropdown opens via
  `aria-expanded === 'true'`, French selection navigates
  to `/fr`, Spanish selection navigates to `/es`); the
  "Why the class does not extend `BasePage`" walkthrough;
  the "Why the trigger pins the English `aria-label="Select language"`"
  walkthrough that pins the three reasons (the host app
  deliberately does not translate this label, strict-
  equality survives a future `aria-label="Choose region"`
  related-control regression, no production-source change
  required); the "Why per-locale options pin
  `aria-label="Switch to ${fullName}"`" walkthrough that
  pins the localized-display-name UX convention,
  consuming-spec mental model, and no-production-source-
  change rationale; the "Why the option Locator does
  **not** carry `.first()`" walkthrough that pins the
  intentional asymmetry against the trigger's `.first()`
  pin; the "Why `.first()` on the trigger button"
  walkthrough that pins the three failure modes of
  dropping it; the "Why the constructor uses
  `this.page.locator(…)` and not the inherited `header`
  scope" walkthrough; the "Why `getCurrentLocaleCode()`
  upper-cases the result" walkthrough; the "Why `isOpen()`
  checks `aria-expanded === 'true'`" walkthrough; the
  failure matrix covering every language-switcher-page-
  level mistake; the per-line walkthrough table; the
  read / write surface summary; the read / write surface
  failure modes table; and the `language-switcher.page.ts`-
  change checklist with the spec audit + `BasePage`
  cross-check + production-source cross-check +
  `next-intl` configuration cross-check + `e2e-tsconfig.md`
  cross-check + `playwright-config.md` cross-check +
  `fixtures-index.md` cross-check + dual
  `pnpm tsc --noEmit` + smoke-subset Playwright run +
  `docs/log.md` + Spec 010 cross-link + reviewer pass.
- `apps/web-e2e/tests/api` Added
  `items-export-settings-query.spec.ts` query-parameter
  smoke spec for the public items-export-settings
  endpoint served by
  [`apps/web/app/api/items/export/settings/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/items/export/settings/route.ts).
  Pins the route's "public, zero-argument, single-key
  envelope, byte-identical body across query
  permutations" invariant by walking the public GET
  surface across every plausible query-key shape: the
  no-arg baseline, the obvious `?format=` / `?type=`
  keys that the **adjacent** `/api/items/export` route
  reads (a regression that confused the two routes is
  the obvious bypass shape), the `?userId=` / `?asUser=`
  / `?impersonate=` per-user-override keys, the
  `?tenant=` / `?tenantId=` / `?org=` per-tenant-
  override keys, the `?token=` / `?secret=` / `?api_key=`
  magic-token keys, the `?refresh=` / `?force=` /
  `?fresh=` / `?cache=` / `?nocache=` cache-busting
  keys, the `?locale=` / `?lang=` i18n keys, the
  `?fields=` / `?select=` / `?include=` selection
  keys, the `?env=` / `?stage=` environment-override
  keys, empty values, repeated keys, special-character
  values, long values (500-character repeats), and bogus
  / typo'd keys. Adds seven explicit assertion tests on
  top of the parameterised loop: the canonical
  `{ export_enabled: boolean }` single-key envelope shape
  with `Object.keys(body)` exact-equality check that
  catches body-shape drift (rename to `enabled`, wrap in
  `{ success: true, data: {...} }`, sibling
  `export_format` key), the byte-identical-body
  invariant across query permutations using
  `await response.text()` exact-string equality (a
  stronger contract than status-only assertions because
  it catches a regression that branches on a query
  param to gate the boolean), the no-`?token=`-override
  assertion (no per-user feature-flag override exists
  today), the no-`?tenant=`-override assertion (the
  flag is host-wide today, sourced from `works.yml`
  via `getExportEnabled()`), the response-shape
  stability assertion across permuted parameter sets,
  and the no-`Accept`-header-branching assertion that
  pins the route's content-type to `application/json`
  regardless of the request's Accept header (a
  regression that adds content negotiation mirroring
  the adjacent `/api/items/export` route's actual
  `?format=` key would change the body type on the
  per-Accept branch). Mirrors the sibling
  `client-dashboard-stats-query.spec.ts`,
  `client-geo-stats-query.spec.ts`,
  `stripe-payment-methods-list-query.spec.ts`,
  `lemonsqueezy-list-query.spec.ts`,
  `subscription-query.spec.ts`,
  `payments-query.spec.ts`,
  `plan-status-query.spec.ts`, and other zero-argument
  query smoke specs — but the items-export-settings
  route is the **only** one whose response payload is a
  single-key boolean feature-flag envelope today,
  making the invariant-shape assertion doubly load-
  bearing because the frontend's conditional-render
  logic reads the boolean directly without a deeper
  schema validation step.

- `docs/plugins` Added `star-rating-page-object.md` — the
  **per-source-file reference** for the Playwright e2e
  suite's five-star rating-picker driver paired with
  [`apps/web-e2e/page-objects/public/star-rating.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/public/star-rating.page.ts),
  sitting inside the `public/` page-object subtree
  alongside the thirteen other public-surface page objects.
  Documents the at-a-glance summary table of every
  load-bearing element (the type-only Playwright import,
  the `export class StarRating` standalone class with no
  `extends` clause, the `readonly page: Page` field that
  the standalone class restates because it does not inherit
  from `BasePage`, the `readonly container: Locator` pinned
  to the dual `[role="radiogroup"][aria-label="Rating"]`
  exact-match selector with `.first()` for strict-mode
  safety against future sibling radio groups, the
  constructor that pre-binds the single container Locator
  in a single pass without a `super(page)` call, the
  `star(n: number): Locator` locator-factory that
  interpolates the numeric `n` into the
  `aria-label*="${n} star"` substring match scoped through
  `this.container.locator(…)` rather than
  `this.page.locator(…)` to survive a future "1 star = bad,
  5 stars = great" legend in the page footer with the
  substring match accommodating both singular `"1 star"`
  and plural `"2 stars"`/.../`"5 stars"` shapes and the
  Locator-return shape preserving composability with
  `expect(...).toBeVisible()` chains, the
  `rate(n: number)` composite "click the nth star"
  primitive, the `getValue(): Promise<number>` accessor
  with the load-bearing reverse iteration `i = 5..1` that
  returns the **highest** checked star to handle the host
  app's HeroUI fill-up-to-N pattern correctly and the
  `return 0` no-rating sentinel that pins the public return
  type to `Promise<number>`); the full file annotated
  chunk-by-chunk; the spec context cross-link to
  [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
  and the consuming spec at
  `apps/web-e2e/tests/public/star-rating.spec.ts` (picker
  visibility on the item-detail page reachable from the
  first `a[href*="/items/"]` link on `/discover/1`,
  fourth-star click via `rate(4)` with a 500 ms settle
  delay before reading `getValue()` returns 4, all five
  star buttons present via per-star visibility loop — all
  three tests soft-skip when ratings are disabled or the
  comment form does not surface); the "Why the class does
  not extend `BasePage`" walkthrough; the "Why
  `[role="radiogroup"][aria-label="Rating"]` exact match"
  walkthrough; the "Why `.first()` on the container
  Locator" walkthrough; the "Why `star(n)` returns a
  `Locator` instead of clicking" walkthrough; the "Why
  `aria-label*="N star"` substring match (and not exact)"
  walkthrough that pins plural-form variance, future locale
  variance, and future a11y-label expansion as the three
  reasons; the "Why reverse iteration in `getValue()`"
  walkthrough that pins the highest-checked-wins semantics
  for the fill-up-to-N pattern, short-circuit on the
  most-likely-rating common case, and symmetric-to-visual
  rendering; the "Why `return 0` as the no-rating
  sentinel" rationale; the failure matrix covering every
  star-rating-page-level mistake; the per-line walkthrough
  table; the read / write surface summary; the read /
  write surface failure modes table; and the
  `star-rating.page.ts`-change checklist with the spec
  audit + `BasePage` cross-check + production-source
  cross-check + `discover-page-object.md` cross-check +
  `fixtures-index.md` cross-check + `e2e-tsconfig.md`
  cross-check + `playwright-config.md` cross-check + dual
  `pnpm tsc --noEmit` + smoke-subset Playwright run +
  `docs/log.md` + Spec 010 cross-link + reviewer pass.
- `apps/web-e2e/tests/api` Added
  `client-geo-stats-query.spec.ts` query-parameter smoke
  spec for the authenticated client geo-stats endpoint
  served by
  [`apps/web/app/api/client/geo-stats/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/client/geo-stats/route.ts).
  Pins the route's "session-gated, 401 before any
  service-layer call" invariant by walking the
  unauthenticated GET surface across every plausible
  query-key shape: the no-arg baseline, the obvious
  `?userId=` / `?user_id=` / `?uid=` / `?id=` /
  `?clientId=` admin-impersonation key shapes that a
  future "admin-views-other-user's-geo-stats" feature
  might add, the `?token=` / `?secret=` / `?api_key=` /
  `?authorization=` magic-token bypass keys, the
  `?country=` / `?city=` / `?region=` / `?area=` /
  `?serviceArea=` / `?coverage=` geographic-filter keys
  that a future per-region scoping feature might add, the
  `?lat=` / `?lng=` / `?bbox=` / `?radius=` spatial-filter
  keys that a future "items near a point" feature might
  add, the `?period=` / `?range=` / `?window=` time-window
  keys, the `?limit=` / `?offset=` / `?page=` / `?topN=`
  pagination keys for the `top_cities` / `top_countries`
  arrays, the `?fields=` / `?select=` / `?include=`
  selection keys, the `?refresh=` / `?force=` / `?fresh=`
  / `?cache=` / `?nocache=` cache-busting keys, the
  `?format=` content-negotiation keys (`json` / `xml` /
  `csv` / `geojson` / `kml`), the `?locale=` / `?lang=`
  / `?currency=` i18n keys, the `?status=` / `?type=` /
  `?sort=` / `?order=` / `?direction=` filter and sort
  keys, the `?tenant=` / `?tenantId=` / `?org=`
  multi-tenancy keys, the `?admin=` / `?asAdmin=` /
  `?bypass=` / `?impersonate=` admin-override keys, empty
  values, repeated keys, special-character values, long
  values (500-character repeats), and bogus / typo'd
  keys. Adds three explicit assertion tests on top of the
  parameterised loop: the canonical 401 envelope shape
  (`{ success: false, error: '<string>' }`), the
  parameter-invariance assertion (no query-string
  permutation produces a non-401 status), the
  no-`?userId=`-bypass assertion (anonymous callers
  cannot impersonate other users), the
  no-`?token=`-bypass assertion (no magic-token auth
  exists today), the no-`?admin=`-override assertion
  (admin status is read from the session, never from the
  query string), the geographic-filter no-effect
  assertion (the route returns the full per-user payload
  today), and the response-shape stability assertion
  across permuted parameter sets. Mirrors the sibling
  `client-dashboard-stats-query.spec.ts`,
  `stripe-payment-methods-list-query.spec.ts`,
  `lemonsqueezy-list-query.spec.ts`,
  `subscription-query.spec.ts`,
  `payments-query.spec.ts`, and
  `plan-status-query.spec.ts` smoke specs — all seven
  routes share the same "session-gated, 401 before any
  service-layer call" posture, but the client geo-stats
  route shares with the client dashboard-stats route the
  property that the handler signature is **zero-argument**
  AND uses the `requireClientAuth()` helper, making the
  unauth-branch 401 invariant doubly load-bearing because
  a regression that adds a `request: NextRequest`
  argument and reads any `searchParams` value before the
  gate is the obvious shape of a future bypass —
  particularly tempting on a geo-stats endpoint where
  future contributors might add `?country=…` or `?city=…`
  filter keys to scope the payload to a sub-region.

- `docs/plugins` Added `sort-menu-page-object.md` — the
  **per-source-file reference** for the Playwright e2e
  suite's listing-sort dropdown driver paired with
  [`apps/web-e2e/page-objects/public/sort-menu.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/public/sort-menu.page.ts),
  sitting inside the `public/` page-object subtree
  alongside the thirteen other public-surface page objects.
  Documents the at-a-glance summary table of every
  load-bearing element (the type-only Playwright import,
  the `export class SortMenu` standalone class with no
  `extends` clause, the `readonly page: Page` field that
  is also used inside `selectOption` to construct the
  option Locator at call-time rather than constructor-time
  because the option set materialises only after `open()`
  has been called, the `readonly trigger: Locator` pinned
  to the canonical ARIA-spec value `aria-haspopup="menu"`
  via exact match for strict-mode-correctness against
  `[role="menu"]` popups, the `readonly menuContent:
Locator` deliberately-exposed dropdown Locator pinned to
  `[role="menu"]`, the constructor that pre-binds the two
  Locators in a single pass without a `super(page)` call,
  the `open()` minimal "open the dropdown" primitive, the
  `selectOption(text: RegExp)` composite primitive with
  the load-bearing `RegExp` parameter type and the
  dual-role `[role="menuitemradio"], [role="menuitem"]`
  selector that accommodates both single-select and
  free-action option shapes, the `getCurrentLabel():
Promise<string>` accessor with the
  `textContent()?.trim() ?? ''` chain that pins the public
  return type to `Promise<string>`); the full file
  annotated chunk-by-chunk; the spec context cross-link to
  [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
  and the consuming spec at
  `apps/web-e2e/tests/public/sort-menu.spec.ts`; the "Why
  the class does not extend `BasePage`" walkthrough; the
  "Why `aria-haspopup="menu"` exact match and not a
  substring" walkthrough; the "Why `[role="menu"]` exact
  match for `menuContent`" walkthrough; the "Why
  `.first()` on every Locator" walkthrough; the "Why the
  dual-role selector in `selectOption`" walkthrough that
  pins the three reasons for the comma-separated
  `[role="menuitemradio"], [role="menuitem"]` selector;
  the "Why `text: RegExp` and not `text: string`"
  walkthrough that pins the locale-invariance posture; the
  "Why `?.trim() ?? ''` on `getCurrentLabel`" rationale;
  the failure matrix covering every sort-menu-page-level
  mistake; the per-line walkthrough table; the read /
  write surface summary; the read / write surface failure
  modes table; and the change checklist that ties any
  change to a spec audit, a base-page-object cross-check,
  a production-source cross-check, a discover-page-object
  cross-check, an e2e-tsconfig cross-check, a
  playwright-config cross-check, a fixtures-index
  cross-check, dual `pnpm tsc --noEmit` runs, a
  smoke-subset Playwright run, a docs/log.md entry, a
  [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
  cross-link, and a reviewer pass.

- `docs/index` Added a new entry for
  `sort-menu-page-object.md` to the docs index.

- `apps/web-e2e/tests/api` Added
  `client-dashboard-stats-query.spec.ts` — the
  **query-param surface smoke** for the authenticated
  client dashboard-stats endpoint served by
  `apps/web/app/api/client/dashboard/stats/route.ts`,
  pinning the `requireClientAuth()` session-gate response
  invariant: the unauth GET surface returns 401 with the
  canonical `{ success: false, error: 'Unauthorized.
Please sign in to continue.' }` envelope
  deterministically, regardless of which query keys the
  caller appends to the URL. The spec walks the unauth
  branch with 80+ parametrised query-string permutations
  covering the obvious bypass shapes — the `?userId=` /
  `?user_id=` / `?uid=` / `?id=` / `?clientId=` user-
  identity-override keys that a regression might wire as
  fallbacks for `requireClientAuth()`'s `session.user.id`
  resolution, the `?token=` / `?secret=` / `?api_key=` /
  `?authorization=` magic-token keys that a regression
  might wire as auth-bypass paths, the `?from=` / `?to=`
  / `?startDate=` / `?endDate=` / `?period=` / `?range=`
  / `?window=` date-range filter keys that the route
  ignores today, the `?limit=` / `?offset=` / `?page=`
  pagination keys for the `topItems` array, the
  `?fields=` / `?select=` / `?include=` shape keys, the
  `?refresh=` / `?force=` / `?fresh=` / `?cache=`
  cache-busting keys, the `?format=` content-negotiation
  keys, the `?locale=` / `?lang=` / `?currency=` i18n
  keys, the `?status=` / `?type=` filter keys for the
  `statusBreakdown` array, the `?sort=` / `?order=` /
  `?direction=` sort-override keys, the `?tenant=` /
  `?tenantId=` / `?org=` multi-tenancy keys, the
  `?admin=` / `?asAdmin=` / `?bypass=` / `?impersonate=`
  admin-override keys that would be the obvious shape of
  a future "view another user's dashboard as admin"
  feature, and the empty / repeated / special-character
  / long / typo'd combinations. Each parametrised path
  is asserted to return a status `< 500` so the unauth
  branch's 401 is the only reachable response. Six
  dedicated no-bypass assertions then pin specific bypass
  shapes: the `?userId=…` no-impersonation invariant, the
  `?token=…` no-magic-auth invariant, the `?admin=…`
  no-query-admin-override invariant (especially load-
  bearing because `requireClientAuth()`'s comment notes
  admins are allowed to use client endpoints), the date-
  range-params no-shape-change invariant, the response-
  shape stability across three different parameter sets.
  Mirrors the sibling `stripe-payment-methods-list-query.spec.ts`,
  `stripe-products-query.spec.ts`,
  `lemonsqueezy-list-query.spec.ts`,
  `subscription-query.spec.ts`,
  `payments-query.spec.ts`, and
  `plan-status-query.spec.ts` posture — the client
  dashboard-stats route is the only one whose handler
  signature is **zero-argument** AND which uses the
  `requireClientAuth()` helper rather than the bare
  `auth()` call, so the unauth-branch 401 invariant is
  doubly load-bearing.

- `docs/plugins` Added `share-button-page-object.md` — the
  **per-source-file reference** for the Playwright e2e
  suite's share-button dropdown driver paired with
  [`apps/web-e2e/page-objects/public/share-button.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/public/share-button.page.ts),
  sitting inside the `public/` page-object subtree
  alongside the thirteen other public-surface page objects.
  Documents the at-a-glance summary table of every
  load-bearing element (the type-only Playwright import,
  the `export class ShareButton` standalone class with no
  `extends` clause, the `readonly page: Page` field that
  the standalone class restates because it does not
  inherit from `BasePage`, the `readonly trigger: Locator`
  pinned via `page.locator('button').filter({ hasText:
/share/i }).first()` because the host app's button has
  no `aria-label` today, the four `readonly` menu-item
  Locators pinned via `[role="menuitem"]` with per-item
  case-insensitive regex filters — `/copy link/i`,
  `/twitter|x \(/i` with the dual-substring posture that
  survives the X rebrand by matching either legacy
  `"Twitter"` or post-rebrand `"X (formerly Twitter)"`
  via the `x \(` disambiguator, `/facebook/i`,
  `/linkedin/i` — the constructor that pre-binds the five
  Locators in a single pass without a `super(page)` call,
  the `open()` minimal "open the dropdown" primitive,
  the `copyLink()` composite "open then click Copy Link"
  primitive that is the only deterministic per-platform
  action method today because the per-platform entries
  open external `window.open(...)` URLs that require a
  popup-verification harness); the full file annotated
  chunk-by-chunk; the spec context cross-link to
  [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
  and the consuming spec at
  `apps/web-e2e/tests/public/share-button.spec.ts` (both
  tests soft-skip with `test.skip(true, …)` when the
  trigger is not visible so the spec degrades gracefully
  on environments / CMS-content combinations where the
  item-detail page does not surface a share button); the
  "Why the class does not extend `BasePage`" walkthrough
  that pins the three load-bearing reasons (composition
  over inheritance, reusability on non-item-detail
  surfaces like a future profile / collection / per-tag
  share button, constructor parity with non-page widget
  drivers); the "Why `filter({ hasText: /share/i })` and
  not an `aria-label`" walkthrough; the "Why
  `[role="menuitem"]` and not a `data-testid`"
  walkthrough; the "Why the Twitter regex uses
  `/twitter|x \(/i`" walkthrough; the "Why `.first()` on
  every Locator" walkthrough; the "Why the `i` flag on
  every regex" walkthrough; the "Why only `open()` and
  `copyLink()` action methods" walkthrough; the failure
  matrix covering every share-button-page-level mistake;
  the per-line walkthrough table; the read / write
  surface summary; the read / write surface failure
  modes table; and the change checklist that ties any
  change to a spec audit, a base-page-object cross-check,
  a production-source cross-check, a discover-page-object
  cross-check, an e2e-tsconfig cross-check, a
  playwright-config cross-check, a fixtures-index
  cross-check, a per-platform popup-verification harness
  cross-check if a future per-platform action method is
  added, dual `pnpm tsc --noEmit` runs, a smoke-subset
  Playwright run, a docs/log.md entry, a
  [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
  cross-link, and a reviewer pass.

- `docs/index` Added a new entry for
  `share-button-page-object.md` to the docs index.

- `apps/web-e2e/tests/api` Added
  `stripe-products-query.spec.ts` — the **query-param
  surface smoke** for the public Stripe-products endpoint
  served by `apps/web/app/api/stripe/products/route.ts`,
  pinning the `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING`
  flag-gate response invariant: the disabled-flag GET
  surface returns 400 with the canonical
  `{ error: 'Dynamic pricing is not enabled', message: …}`
  envelope deterministically, regardless of which query
  keys the caller appends to the URL. The spec walks the
  disabled-flag branch with 80+ parametrised query-string
  permutations covering the obvious bypass shapes — the
  `?dynamic=` / `?dynamicPricing=` / `?force=` /
  `?override=` flag-flip keys that a regression might
  wire as fallbacks for `isStripeDynamicPricingEnabled()`,
  the `?productId=` / `?priceId=` / `?id=` filter keys
  that a regression might wire as before-the-gate
  filters, the `?stripeKey=` / `?sk=` / `?apiKey=`
  dangerous-passthrough keys that a regression might
  forward to the Stripe SDK, the `?token=` / `?secret=`
  / `?api_key=` / `?authorization=` magic-token keys
  that a regression might wire as auth-bypass paths, the
  `?provider=` switch that the wider repo's
  LemonSqueezy / Polar / Solidgate providers might tempt
  a future contributor to wire here, the `?account=` /
  `?stripeAccount=` / `?connect=` Stripe-Connect
  account-override keys that a regression might forward
  to the SDK as the `stripeAccount` option, the
  `?currency=` / `?locale=` / `?lang=` i18n keys, the
  `?refresh=` / `?cache=` / `?fresh=` cache-busting
  keys, the `?expand=` / `?include=` Stripe SDK
  expansion keys, the `?format=` content-negotiation
  keys, the `?sort=` / `?order=` / `?direction=`
  sort-override keys, the `?fields=` / `?select=` shape
  keys, the `?tenant=` / `?tenantId=` / `?org=`
  multi-tenancy keys, the `?active=` / `?archived=`
  product-state filter keys, the `?sponsorAds=`
  response-shape gate, and the empty / repeated /
  special-character / long / typo'd combinations. Each
  parametrised path is asserted to return a status in
  the canonical 200/400/500 set so the spec coexists on
  every CI runner regardless of which gate fires first
  (disabled-flag 400 vs enabled-without-key 500 vs
  enabled-and-configured 200). Six dedicated
  no-bypass assertions then pin specific bypass shapes:
  the `?dynamic=…` flag-bypass invariant, the
  `?stripeKey=…` no-passthrough invariant, the
  `?token=…` no-magic-auth invariant, the `?provider=…`
  no-provider-switch invariant, the `?account=…`
  no-Connect-override invariant, the `?productId=…`
  no-shape-change invariant. A response-shape stability
  check across three different parameter sets confirms
  the route's gate fires before any branching on
  potential future query schemas. Mirrors the sibling
  `stripe-payment-methods-list-query.spec.ts`,
  `lemonsqueezy-list-query.spec.ts`,
  `subscription-query.spec.ts`,
  `payments-query.spec.ts`, and
  `plan-status-query.spec.ts` posture — the Stripe
  products route is the only one of the six whose gate
  is **flag-driven** (not session-driven) and whose
  handler signature is **zero-argument** today.

- `docs/plugins` Added `scroll-to-top-page-object.md` — the
  **per-source-file reference** for the Playwright e2e
  suite's scroll-to-top floating-button driver paired with
  [`apps/web-e2e/page-objects/public/scroll-to-top.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/public/scroll-to-top.page.ts),
  sitting inside the `public/` page-object subtree
  alongside the thirteen other public-surface page objects.
  Documents the at-a-glance summary table of every
  load-bearing element (the type-only Playwright import,
  the `export class ScrollToTop` standalone class with no
  `extends` clause, the `readonly page: Page` field that
  the standalone class restates because it does not
  inherit from `BasePage`, the single `readonly button:
Locator` pinned via the `page.locator('button[aria-label="Scroll to top"]')`
  exact-match selector with no `.first()` because the
  floating button is a single-instance fixed-position
  widget on every page, the constructor that pre-binds
  the single button Locator without a `super(page)` call,
  the `scrollDown(pixels = 500)` primitive that runs
  `window.scrollBy(0, pixels)` inside the page context
  with a default that comfortably clears the production
  source's ~300-pixel threshold, the `click()` primitive
  that clicks the floating button, and the `getScrollY():
Promise<number>` accessor that returns `window.scrollY`
  for both precondition and postcondition assertions);
  the full file annotated chunk-by-chunk; the spec
  context cross-link to [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
  and the consuming spec at
  `apps/web-e2e/tests/public/scroll-to-top.spec.ts`
  (button hidden at the top of `/`, button appears after
  `scrollDown(500)`, page returns to the top after
  `click()`); the seven "Why X" walkthroughs (the class
  does not extend `BasePage` because the scroll-to-top
  button is a global floating widget rendered on every
  page in every role tree and a future admin-shell or
  client-shell consumer would reuse it, exact `aria-label`
  selector over substring because the label is the
  canonical accessibility primitive a screen reader
  announces and there is no plausible label variant
  requiring substring-tolerance, no `.first()` on the
  Locator because the single-instance invariant means
  future regressions should surface as strict-mode
  violations, `page.evaluate(() => window.scrollBy(0, px), pixels)`
  over `page.mouse.wheel` or `page.keyboard.press('PageDown')`
  for deterministic scroll distance and threshold-test
  ergonomics, `pixels = 500` default for comfortable
  threshold clearance and documentation-by-default,
  `getScrollY` reads `window.scrollY` instead of React
  state for production-source-first signal and no reach-in
  to React internals); the failure matrix covering every
  scroll-to-top-page-level mistake (type-only import drop,
  accidental `extends BasePage` add, `readonly` drop,
  substring `aria-label*=` swap, `data-testid` swap,
  accidental `.first()` add, `page.mouse.wheel` swap with
  wheel-acceleration flake, `page.keyboard.press('PageDown')`
  swap with viewport-dependence, `pixels = 500` default
  drop, React-state read on `getScrollY`, `Promise<number>`
  annotation drop, file move, rename, `.tsx` extension,
  CRLF line endings); the per-line walkthrough table;
  the read / write surface summary that maps every
  caller (the consuming spec, future smoke / a11y specs
  that count `button.count() === 1` and audit `aria-label`,
  the listing-page / item-detail-page production-source
  components for the DOM contract,
  [`e2e-tsconfig.md`](plugins/e2e-tsconfig.md) for the
  `include` glob, [`playwright-config.md`](plugins/playwright-config.md)
  for the `baseURL`) to the fields they touch; the read /
  write surface failure modes table that maps
  production-source / middleware / config drift onto
  `Locator not found`, threshold-clearance failure, and
  JavaScript-disabled-route failures; and the
  `scroll-to-top.page.ts`-change checklist that ties any
  change to a spec audit (every spec under
  `apps/web-e2e/tests/public/scroll-to-top.spec.ts`), a
  [`base-page-object.md`](plugins/base-page-object.md)
  cross-check, a production-source cross-check (the exact
  `aria-label="Scroll to top"` attribute, the
  fixed-position floating shape, the ~300-pixel scroll
  threshold, the React-state-driven visibility flip), an
  [`e2e-tsconfig.md`](plugins/e2e-tsconfig.md) cross-check
  (the `include: ["./**/*.ts"]` glob), a
  [`playwright-config.md`](plugins/playwright-config.md)
  cross-check (the `baseURL` posture), a
  [`fixtures-index.md`](plugins/fixtures-index.md)
  cross-check (a future fixture-bound scroll-to-top
  would surface there), dual `pnpm tsc --noEmit` runs
  (e2e + workspace root), a smoke-subset Playwright
  run targeting the scroll-to-top spec subset
  (`pnpm --filter @ever-works/web-e2e test:e2e:chromium --grep "scroll-to-top"`),
  a [`docs/log.md`](log.md) entry, a [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
  cross-link if the change introduces a new shared
  concept that affects test authoring, and a reviewer
  pass. Cross-linked from
  [`docs/index.md`](index.md) and adjacent to the existing
  `view-toggle-page-object.md` /
  `theme-toggle-page-object.md` /
  `signin-page-object.md` /
  `search-bar-page-object.md` /
  `discover-page-object.md` /
  `base-page-object.md` per-source-file references.

- `apps/web-e2e/tests/api` Added
  `stripe-payment-methods-list-query.spec.ts` — the
  **query-param surface smoke** for the
  authenticated Stripe-payment-methods-list endpoint
  served by [`apps/web/app/api/stripe/payment-methods/list/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/stripe/payment-methods/list/route.ts),
  the **fifth** query-smoke spec in the
  `subscription-query.spec.ts` /
  `payments-query.spec.ts` /
  `plan-status-query.spec.ts` /
  `lemonsqueezy-list-query.spec.ts` family. The route
  is unique among the five because its handler signature
  is **zero-argument** today (`export async function GET()`,
  reading no `searchParams` at all). The spec exhaustively
  exercises every plausible query key a regression might
  introduce — `?type=` (filter by payment-method type),
  `?limit=` (pagination limit), `?starting_after=` /
  `?ending_before=` (Stripe's canonical cursor keys),
  `?customer=` / `?customerId=` / `?stripeCustomerId=`
  (admin-impersonation candidates), `?userId=` / `?user_id=`
  / `?uid=` / `?id=` (per-user override candidates),
  `?token=` / `?secret=` / `?api_key=` / `?authorization=`
  / `?session=` (magic-token bypass candidates), `?stripeKey=`
  / `?stripe_key=` / `?sk=` / `?apiKey=` / `?secretKey=`
  (dangerous Stripe-key passthrough candidates),
  `?provider=` (cross-provider bypass candidates),
  `?refresh=` / `?force=` / `?fresh=` / `?cache=` /
  `?nocache=` (cache-busting), `?expand=` / `?include=`
  (Stripe SDK expansion forwarding candidates), `?format=`
  (content-negotiation), `?currency=` / `?locale=` /
  `?lang=` (response-transformation candidates), `?sort=`
  / `?order=` / `?direction=` (sort-override candidates),
  `?fields=` / `?select=` (column-projection candidates),
  `?tenant=` / `?tenantId=` / `?org=` (multi-tenancy
  candidates), `?account=` / `?stripeAccount=` /
  `?connect=` (Stripe Connect account-override
  candidates), empty-value variants for each of the
  load-bearing keys, repeated keys, special-character
  values (URL-encoded `<script>`, `' OR 1=1`, path
  traversal, `%00`), 500-character long values, and
  bogus typo'd keys — pinning that every parameter
  permutation round-trips to the same canonical 401
  envelope `{ success: false, error: 'Unauthorized' }`
  on the unauthenticated GET branch because the auth
  gate fires before any potential `searchParams` parsing
  or Stripe SDK call. Includes nine targeted assertions
  (the no-arg 401-with-canonical-envelope shape, the
  identity assertion across with/without bogus params,
  the `customer=` no-bypass assertion that pins the
  "the customer id is gated by the session" invariant
  that prevents arbitrary-customer payment-method
  enumeration, the `stripeKey=` no-forwarding assertion
  that pins the "the Stripe key is server-side only"
  invariant, the `token=` no-bypass assertion, the
  `provider=` no-switching assertion, the `account=`
  no-Connect-override assertion that pins the
  "platform Stripe account exclusively" invariant, the
  `type=` no-filter-change assertion, and the response
  shape stability assertion across permutations).

- `docs/plugins` Added `view-toggle-page-object.md` — the
  **per-source-file reference** for the Playwright e2e
  suite's public-listing view-toggle driver paired with
  [`apps/web-e2e/page-objects/public/view-toggle.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/public/view-toggle.page.ts),
  sitting inside the `public/` page-object subtree
  alongside the thirteen other public-surface page objects.
  Documents the at-a-glance summary table of every
  load-bearing element (the type-only Playwright import,
  the `export class ViewToggle` standalone class with no
  `extends` clause, the `readonly page: Page` field that
  the standalone class restates because it does not
  inherit from `BasePage`, the four button Locators
  `readonly listButton` / `gridButton` / `masonryButton`
  / `mapButton` each pinned via the
  `page.locator('button[aria-label*="…" i]').first()`
  case-insensitive substring selector, the constructor
  that pre-binds the four button Locators in a single
  pass without a `super(page)` call, the three
  symmetric-shape `selectList()` / `selectGrid()` /
  `selectMasonry()` click primitives, the `isActive(button:
Locator)` predicate that reads the supplied button's
  `class` attribute and returns whether the `scale-105`
  Tailwind utility-class substring is present with a `??
false` nullish-coalesce that pins the public return
  type to `Promise<boolean>` and mirrors the sibling
  `theme-toggle-page-object.md`'s `isDarkMode()` posture);
  the full file annotated chunk-by-chunk; the spec
  context cross-link to [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
  and the consuming spec at
  `apps/web-e2e/tests/public/view-toggle.spec.ts`
  (visibility on `/discover/1`, grid-active flip after
  `selectGrid()`, list-active flip after `selectList()`);
  the seven "Why X" walkthroughs (the class does not
  extend `BasePage` because the view toggle is a
  listing-mounted control row not a page-shaped surface
  and a future admin-shell list/grid switch would reuse
  it, `aria-label*="…" i` over `data-testid` because it
  tolerates view-label phrasing variants like `"View as
list"` / `"List view"` / `"Show as a list"` and the
  `i` flag tolerates casing drift, `.first()` on every
  button Locator for strict-mode safety against future
  stacked toggles, the `i` flag on every substring
  selector for locale-style / production-source / per-
  tenant casing drift survival, no `selectMap()` method
  today because the map-view is feature-gated behind
  [`features/map-view.md`](features/map-view.md) and
  symmetric posture preserves a future addition the day
  the map mode becomes always-on while the exposed
  `mapButton` field permits direct-Locator interaction,
  `isActive()` reads the `scale-105` substring because
  it is the production-source-first visual signal that
  tolerates future class-list expansion and future-proofs
  against additive `aria-pressed` adoption, `?? false`
  on the class-list scan to type-narrow to
  `Promise<boolean>` and mirror the sibling
  `theme-toggle-page-object.md`'s `isDarkMode()`); the
  failure matrix that maps each view-toggle mistake
  (drop `import type`, add an `extends BasePage`
  clause, drop `readonly` from any of the five fields,
  switch any button to an `aria-label="…"` exact match,
  drop the `i` flag from any substring selector, drop
  `.first()` on any button, swap any `aria-label*=` for
  a `data-testid`, add a `selectMap()` method that
  unconditionally clicks, drop the `mapButton` field,
  read the active-state from React state or
  `aria-pressed`, replace `scale-105` substring with a
  `bg-primary` substring that false-positives on hover,
  drop the `?? false` from `isActive()`, file move,
  rename, `.tsx` extension, CRLF line endings) onto the
  layer that surfaces each one; the per-line walkthrough
  table; the read / write surface summary that maps
  every caller (the consuming spec at
  `apps/web-e2e/tests/public/view-toggle.spec.ts`,
  future smoke / a11y specs that need the `mapButton`
  field for a feature-gated map-view spec, the
  listing-page production-source component for the DOM
  contract, [`e2e-tsconfig.md`](plugins/e2e-tsconfig.md)
  for the `include` glob,
  [`playwright-config.md`](plugins/playwright-config.md)
  for the `baseURL`, [`features/map-view.md`](features/map-view.md)
  for the map-view feature gate) to the fields they
  touch; the read / write surface failure modes table
  that maps production-source / middleware / config
  drift onto `Locator not found`,
  `isActive()`-returns-`false`-on-active-button, and
  `mapButton` half-rendered failures; and the
  `view-toggle.page.ts`-change checklist that ties any
  change to a spec audit, a
  [`base-page-object.md`](plugins/base-page-object.md)
  cross-check (if the new shape inherits, document why),
  a production-source cross-check (the `aria-label`
  shape on every button, the `scale-105` Tailwind
  utility-class hook on the active button, the four
  button positions in the toggle row), a
  [`discover-page-object.md`](plugins/discover-page-object.md)
  cross-check (the `/discover/[N]` listing-route
  contract the consuming spec relies on), an
  [`e2e-tsconfig.md`](plugins/e2e-tsconfig.md)
  cross-check, a
  [`playwright-config.md`](plugins/playwright-config.md)
  cross-check, a [`fixtures-index.md`](plugins/fixtures-index.md)
  cross-check (a future fixture-bound view-toggle would
  surface there), a [`features/map-view.md`](features/map-view.md)
  cross-check (if a future `selectMap()` method is
  added), dual `pnpm tsc --noEmit` runs (e2e + workspace
  root), a smoke-subset Playwright run targeting the
  view-toggle spec subset
  (`pnpm --filter @ever-works/web-e2e test:e2e:chromium --grep "view-toggle"`),
  a [`docs/log.md`](log.md) entry, a Spec 010 cross-link
  if a new shared concept is introduced, and a reviewer
  pass.

- `apps/web-e2e/tests/api` Added
  `lemonsqueezy-list-query.spec.ts` — the **first**
  smoke spec for the authenticated
  `/api/lemonsqueezy/list` endpoint's query-param
  surface served by
  `apps/web/app/api/lemonsqueezy/list/route.ts`. The
  route is a **session-gated** GET handler — it returns
  the caller's paginated LemonSqueezy checkouts (with
  admin-impersonation via `?customerEmail=…` permitted
  once the caller is authenticated). The auth gate
  fires **before** any `searchParams` parsing or
  LemonSqueezy provider call; on the unauth branch the
  route returns 401 + `{ error: 'Unauthorized', message:
'Authentication required', code: 'AUTH_REQUIRED' }`
  deterministically. The spec pins this contract via a
  ~110-entry parametrised matrix spanning every "the
  route reads this only after the gate" category
  (`?status=` allowlist + invalid + empty,
  `?limit=` in-range + above-cap + below-floor +
  non-finite, `?page=` valid + invalid, `?customerEmail=`
  admin-impersonation attempts + invalid emails,
  `?dateFrom=` / `?dateTo=` ISO 8601 + invalid +
  reversed range, `?storeId=` arbitrary-store-id
  attempts, every `?userId=` / `?user_id=` / `?uid=`
  identity-override attempt, every `?token=` /
  `?secret=` / `?api_key=` / `?authorization=` magic-
  token attempt, every `?lemonsqueezyKey=` /
  `?lemon_squeezy_key=` / `?lsk=` / `?apiKey=`
  caller-supplied-key attempt, every `?provider=stripe`
  / `?provider=polar` / `?provider=solidgate` provider-
  switch attempt, every cache-busting key, every
  expansion key, every pagination cursor key, every
  format / currency / locale / sort / fields key, every
  multi-tenancy key, every empty value, every repeated-
  key permutation, every special-character payload
  (`<script>`, SQL injection, path traversal, null
  bytes), every long-input string (500-character
  `customerEmail` / `storeId` / `token`), and every
  bogus / typo'd combination), each asserting `< 500`;
  one canonical-envelope test that asserts the unauth
  GET surface returns exactly 401 with a `string`
  `error` field and a `string` `code` field; one
  no-bypass invariance test that pins
  `?customerEmail=…` against the baseline 401; one
  no-bypass invariance test that pins `?storeId=…`
  against the baseline 401; one no-bypass invariance
  test that pins `?lemonsqueezyKey=…` /
  `?lemon_squeezy_key=…` / `?lsk=…` / `?apiKey=…`
  against the baseline 401 to catch any future
  caller-supplied-key forwarding; one no-bypass
  invariance test that pins `?token=…` / `?secret=…`
  / `?api_key=…` / `?authorization=…` against the
  baseline 401; one provider-switch invariance test
  that pins `?provider=stripe` / `?provider=polar` /
  `?provider=solidgate` against the baseline 401; one
  validator-order test that asserts the auth gate
  fires before the Zod validator (so an
  out-of-allowlist `?status=…` value still produces
  401 instead of 400 on the unauth branch); and one
  param-permutation envelope-shape test that asserts
  every parametrised path returns the `{ error: string }`
  envelope. Mirrors the shape of
  `subscription-query.spec.ts`,
  `payments-query.spec.ts`, and `plan-status-query.spec.ts`
  (the three sibling session-gated route smokes) but is
  the first smoke spec to pin the "auth gate fires
  before the Zod validator" invariant on a route whose
  query schema is `safeParse`-validated.

- `docs/plugins` Added `search-bar-page-object.md` — the
  **per-source-file reference** for the Playwright e2e
  suite's public-listing search-input driver paired with
  [`apps/web-e2e/page-objects/public/search-bar.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/public/search-bar.page.ts),
  sitting inside the `public/` page-object subtree
  alongside the fourteen other public-surface page objects.
  Documents the at-a-glance summary table of every
  load-bearing element (the type-only Playwright import,
  the `export class SearchBar` standalone class with no
  `extends` clause, the `readonly page: Page` field that
  the standalone class restates, the
  `readonly input: Locator`
  `page.locator('input[placeholder*="Search" i]').first()`
  case-insensitive substring selector, the
  `readonly clearButton: Locator`
  `page.locator('button', { hasText: '×' }).first()`
  multiplication-sign-glyph selector, the constructor
  that pre-binds both Locators without a `super(page)`
  call, the `search(term)` method that calls Playwright's
  `fill()` for debounce-deterministic single-round-trip
  semantics, the `clear()` method that calls Playwright's
  `clear()` to handle empty-input safety regardless of
  the clear button's visibility, the `getValue()` accessor
  with the `?? ''` nullish coalesce that future-proofs
  against a Playwright API change to `string | null`); the
  full file annotated chunk-by-chunk; the spec context
  cross-link to [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
  and the consuming spec at
  `apps/web-e2e/tests/public/search.spec.ts` (three
  flows: visibility on `/`, fill+read after debounce,
  clear+read after debounce); the seven "Why X"
  walkthroughs (the class does not extend `BasePage`
  because the search input is page-mounted not
  page-shaped and a future admin-search would reuse it,
  `placeholder*="Search" i` over `data-testid` because
  it tolerates placeholder evolution and case drift,
  `hasText: '×'` over a CSS class because the
  multiplication-sign glyph U+00D7 survives every
  translation pass while the lower-case Latin x `x`
  U+0078 would silently miss, `.first()` on both Locators
  for strict-mode safety against future stacked inputs /
  clear buttons, `fill()` over `pressSequentially()`
  because the production-source debounces on the React
  value not per-keystroke events, `clear()` over a
  `clearButton.click()` because the clear button is
  hidden when the input is empty so clicking it would
  flake, `?? ''` on `getValue()` to keep the public
  return type pinned to `string` against any future
  Playwright API change); the failure matrix that maps
  each search-bar mistake (drop `import type`, add an
  `extends BasePage` clause, drop `readonly` from any
  field, switch `input` to a `placeholder="Search"` exact
  match, drop the `i` flag from the `placeholder`
  substring, drop `.first()` on `input`, swap the
  placeholder substring for a `data-testid`, switch
  `clearButton` to `hasText: 'x'` Latin lower-case x,
  switch `clearButton` to a CSS class selector, drop
  `.first()` on `clearButton`, switch `search()` from
  `fill()` to `pressSequentially()`, switch `clear()` to
  a `clearButton.click()`, drop the `?? ''` on
  `getValue()`, file move, rename, `.tsx` extension,
  CRLF line endings) onto the layer that surfaces each
  one; the per-line walkthrough table; the read / write
  surface summary that maps every caller (the consuming
  spec at `apps/web-e2e/tests/public/search.spec.ts`,
  future smoke / a11y specs that read `getValue()`, the
  production source for the listing's search input,
  [`e2e-tsconfig.md`](plugins/e2e-tsconfig.md) for the
  `include` glob,
  [`playwright-config.md`](plugins/playwright-config.md)
  for the `baseURL`) to the fields they touch; the
  read / write surface failure modes table that maps
  production-source / middleware / config drift onto
  `Locator not found`, `inputValue()`-returns-empty,
  and `clear-button-glyph-misses` failures; and the
  `search-bar.page.ts`-change checklist that ties any
  change to a spec audit, a
  [`base-page-object.md`](plugins/base-page-object.md)
  cross-check (if the new shape inherits, document why),
  a production-source cross-check (placeholder substring,
  `×` glyph, React-controlled value), an
  [`e2e-tsconfig.md`](plugins/e2e-tsconfig.md)
  cross-check, a
  [`playwright-config.md`](plugins/playwright-config.md)
  cross-check, a [`fixtures-index.md`](plugins/fixtures-index.md)
  cross-check (a future fixture-bound search bar would
  surface there), dual `pnpm tsc --noEmit` runs (e2e +
  workspace root), a smoke-subset Playwright run
  targeting the search-bar spec subset
  (`pnpm --filter @ever-works/web-e2e test:e2e:chromium --grep search`),
  a [`docs/log.md`](log.md) entry, a Spec 010 cross-link
  if a new shared concept is introduced, and a reviewer
  pass.

- `apps/web-e2e/tests/api` Added
  `location-cities-query.spec.ts` — the **first** smoke
  spec for the public `/api/location/cities` endpoint's
  query-param surface served by
  `apps/web/app/api/location/cities/route.ts`. The route
  is a **zero-query-param** GET handler — it reads zero
  `searchParams` and exposes exactly two well-formed
  branches: `404` + `{ success: false, error: 'Location
features are disabled' }` when `getLocationEnabled()`
  returns `false` (the most-likely branch on a clean
  local-dev baseline), and `200` + `{ success: true,
data: string[] }` when the feature is on. The spec
  pins this contract via a 75-entry parametrised matrix
  spanning every "the route does not read this" category
  (`?city=` / `?country=` / `?countryCode=` / `?region=`
  / `?state=` / `?province=` / `?q=` / `?search=` /
  `?term=` / `?prefix=` / `?limit=` / `?offset=` /
  `?page=` / `?perPage=` / `?cursor=` / `?sort=` /
  `?order=` / `?direction=` / `?locale=` / `?lang=` /
  `?format=` / `?fields=` / `?include=` / `?expand=` /
  `?tenant=` / `?tenantId=` / `?org=` / `?refresh=` /
  `?cache=` / `?force=` / `?fresh=` / `?nocache=` /
  `?token=` / `?secret=` / `?api_key=` /
  `?authorization=` / special-character values for
  XSS / SQL-injection / path-traversal / null bytes /
  500-character long values / typo'd keys / repeated
  keys), each asserting `< 500`; one per-call envelope
  test that asserts the status is exactly `200` or `404`
  and the body shape matches the success envelope
  (`success: true, data: string[]` with every entry a
  `string`) or the feature-disabled envelope
  (`success: false, error: string`); one invariance test
  that compares 14 representative parametrised responses
  to the no-arg baseline so a regression that begins
  reading `?city=…` / `?q=…` / `?limit=…` surfaces
  immediately; one filter-override test that asserts a
  nonsensical `?city=__definitely-not-a-real-city__`
  filter does not change the response so a future
  filtering wire-up that grants caller-controlled
  override of `getDistinctCities()` is caught; and one
  parallel sweep test that confirms every parametrised
  query in the matrix is below 500. Mirrors the shape
  of `location-countries-query.spec.ts` (its sibling in
  the `apps/web/app/api/location/` subtree) and rounds
  out the location-API smoke matrix.

- `docs/plugins` Added `discover-page-object.md` — the
  **per-source-file reference** for the Playwright e2e
  suite's public directory-listing driver paired with
  [`apps/web-e2e/page-objects/public/discover.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/public/discover.page.ts),
  sitting inside the `public/` page-object subtree
  alongside the fourteen other public-surface page objects.
  Where [`base-page-object.md`](plugins/base-page-object.md)
  documents the **page-object inheritance root** and
  [`theme-toggle-page-object.md`](plugins/theme-toggle-page-object.md)
  documents the **suite's theme-switch driver boundary**
  under `apps/web-e2e/page-objects/public/`, this page
  documents the **suite's directory-listing driver
  boundary** — the smallest possible page object that
  lets a spec drive `/discover/[N]` end-to-end (navigate
  to a page in the directory, count the items rendered,
  click into the first item, observe the pagination
  control). Documents the at-a-glance summary table of
  every load-bearing element (the `import type` Playwright
  type-only import that mirrors the base-class discipline;
  the `import { BasePage } from '../base.page'` runtime
  import — the only runtime import in the file; the
  `export class DiscoverPage extends BasePage` single
  named export with the inherited `(page: Page)`
  constructor signature; the `readonly itemLinks: Locator`
  `page.locator('a[href*="/items/"]')` substring-selector
  matching every directory-card link; the `readonly
pagination: Locator` dual-substring selector tolerating
  production-source case drift; the `readonly heading:
Locator` `page.getByRole('heading', { level: 1 })`
  role+level resolution that survives translation churn;
  the `constructor(page: Page)` that calls `super(page)`
  and pre-binds the three Locators above; the
  `navigate(pageNum = 1)` method that wraps the inherited
  `goto` with the canonical `/discover/[N]` route; the
  `getItemCount()` method; the `clickFirstItem()` method
  with `.first()` for strict-mode safety); the full file
  annotated chunk-by-chunk; the spec context cross-link
  to [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
  and the consuming specs at
  `apps/web-e2e/tests/public/discover.spec.ts` (three
  flows) and `apps/web-e2e/tests/public/map.spec.ts`
  (precondition seeding); the six "Why X" walkthroughs
  (the class extends `BasePage` because `/discover/[N]`
  is a navigable page in the URL sense so `goto` /
  `waitForPageReady` are useful for free, shared
  page-shell Locators are useful, constructor parity
  with sibling page-shaped page objects;
  `a[href*="/items/"]` and not a `data-testid` because
  no production-source change required, locale
  invariance against the six locale prefixes, slug
  invariance; dual-substring `aria-label*` for
  pagination because production-source case drift
  tolerance, strict-mode safety from the unique
  landmark, zero-false-positive substring narrowness;
  `getByRole('heading', { level: 1 })` for heading
  because locale invariance, single accessible-name
  source of truth, production-source-first discipline;
  `pageNum = 1` default because most-common call site
  shortest, explicit-page-number documentation for
  pagination tests, type-narrowed `Promise<void>`
  posture; `.first()` on `clickFirstItem` because
  strict-mode collision avoidance, render-order
  independence with URL-substring assertions, future
  highlighted-item-at-position-0 support); the failure
  matrix covering every discover-page-level mistake
  (type-only import drop, `extends BasePage` drop,
  `readonly` drop, `a[href^="/items/"]` prefix-only
  swap, `data-testid` swap, dual-substring drop on
  pagination, `data-testid` swap on pagination, `h1`
  tag-selector swap on heading, `pageNum = 1` default
  drop, template-literal-to-concat swap, `.first()`
  drop on `clickFirstItem`, hard-coded slug, file
  move, rename, `.tsx` extension, CRLF line endings);
  the per-line walkthrough table that pins each line
  of the file to its purpose; the read / write surface
  summary that maps every caller to the fields they
  touch; the read / write surface failure modes table
  that maps production-source / middleware / config
  drift onto `getItemCount() returns 0`, `Locator not
found`, and `navigate timeout` failures; and the
  `discover.page.ts`-change checklist that ties any
  change to a spec audit, a
  [`base-page-object.md`](plugins/base-page-object.md)
  cross-check, a production-source cross-check, an
  [`e2e-tsconfig.md`](plugins/e2e-tsconfig.md)
  cross-check, a [`playwright-config.md`](plugins/playwright-config.md)
  cross-check, a [`fixtures-index.md`](plugins/fixtures-index.md)
  cross-check, dual `pnpm tsc --noEmit` runs, a
  smoke-subset Playwright run, a [`docs/log.md`](log.md)
  entry, a Spec 010 cross-link, and a reviewer pass.
- `e2e` Added
  `apps/web-e2e/tests/api/location-countries-query.spec.ts`
  — the **query-param surface smoke** for the public
  unauthenticated `/api/location/countries` endpoint
  served by
  [`apps/web/app/api/location/countries/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/location/countries/route.ts).
  Pins the route's **zero-query-param contract**: the
  handler reads zero `searchParams` keys today and
  returns one of two well-formed envelopes — `200` +
  `{ success: true, data: string[] }` when the
  location feature is enabled and
  `getDistinctCountries()` resolves the distinct-country
  list; `404` + `{ success: false, error: 'Location
features are disabled' }` when `getLocationEnabled()`
  is false. The catch-and-500 fallback (`'Failed to
fetch countries'`) must never fire on a clean
  baseline. The spec parametrises across 50+ query
  strings (`?country=…` filter overrides, `?countryCode=`
  / `?code=` / `?iso=` ISO-code keys, `?city=` /
  `?q=` / `?search=` / `?term=` / `?prefix=` search
  keys, `?limit=` / `?offset=` / `?page=` / `?perPage=`
  / `?cursor=` pagination keys, `?sort=` / `?order=`
  / `?direction=` sort keys, `?locale=` / `?lang=`
  i18n keys, `?format=` content-negotiation keys,
  `?fields=` / `?include=` / `?expand=` sparse-fieldset
  keys, `?tenant=` / `?tenantId=` / `?org=`
  multi-tenancy keys, `?refresh=` / `?cache=` /
  `?force=` cache-busting keys, `?token=` / `?secret=`
  / `?api_key=` auth-bypass keys, `<script>` /
  `' OR 1=1` / `/etc/passwd` / NUL-byte
  special-character values, 500-character long values,
  bogus-key combinations, repeated keys) plus four
  targeted invariant tests (canonical 200/404 envelope
  shape with the success-branch `data` array of
  strings; the response is invariant across every
  parametrised query string compared to the baseline;
  caller-supplied filter overrides do NOT bypass the
  data-layer call; final 5xx-free sweep across the
  matrix). A regression that begins reading `?country=…`
  / `?q=…` / `?limit=…` would produce a divergent
  response and surface immediately as a status / body
  divergence. The route's siblings `apps/web/app/api/location/cities/route.ts`,
  `apps/web/app/api/location/coordinates/route.ts`
  (already smoked by `location-coordinates-query.spec.ts`),
  and `apps/web/app/api/location/search/route.ts`
  (already smoked by `location-search-query.spec.ts`)
  share the same `apps/web/app/api/location/` subtree;
  this spec is the **first** smoke for the
  `/api/location/countries` surface.
- `docs/index.md` Insert the new
  `discover-page-object` entry above the
  `theme-toggle-page-object` entry in the plugins
  section. Maintains alphabetical-then-recency
  ordering inside the plugins block.

- `docs/plugins` Added `theme-toggle-page-object.md` — the
  **per-source-file reference** for the Playwright e2e
  suite's header theme-switch driver paired with
  [`apps/web-e2e/page-objects/public/theme-toggle.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/public/theme-toggle.page.ts),
  sitting inside the `public/` page-object subtree
  alongside the fourteen other public-surface page objects.
  Where [`base-page-object.md`](plugins/base-page-object.md)
  documents the **page-object inheritance root** and
  [`signin-page-object.md`](plugins/signin-page-object.md)
  documents the **suite's sign-in surface boundary** under
  `apps/web-e2e/page-objects/auth/`, this page documents
  the **suite's theme-switch driver boundary** — the
  smallest possible page object that lets a spec drive the
  header theme-switch dropdown end-to-end (open the
  dropdown, select the **light** or **dark** option,
  observe the canonical `aria-label` shape, observe the
  `dark` class flip on the `<html>` element). Documents
  the at-a-glance summary table of every load-bearing
  element (the `import type` Playwright type-only import
  that mirrors the base-class discipline; the
  `export class ThemeToggle` single named export with **no
  `extends` clause** — the public-tree widget-driver
  posture; the `readonly page: Page` field that the
  standalone class restates because it does not inherit
  from `BasePage`; the `readonly toggleButton: Locator`
  `page.locator('button[aria-label*="Current theme"]').first()`
  substring-selector pinning to the first match; the
  `constructor(page: Page)` that stores the `page` and
  pre-binds `toggleButton` without a `super(page)` call;
  the `getCurrentTheme()` method that reads the toggle
  button's `aria-label` and returns `'light'` / `'dark'`
  / `'unknown'`; the `open()` minimal "open the dropdown"
  primitive every other method composes against; the
  `selectLight()` and `selectDark()` methods that compose
  `open()` + role+regex-name resolution + click; the
  `isDarkMode()` method that reads the `<html>` class
  list and returns whether the `dark` substring is
  present); the full file annotated chunk-by-chunk; the
  spec context cross-link to [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
  and the consuming spec at
  `apps/web-e2e/tests/public/theme-toggle.spec.ts`; the
  six "Why X" walkthroughs (the class does not extend
  `BasePage` because composition over inheritance against
  the header surface, reusability on non-page surfaces,
  and constructor parity with non-page widgets;
  `aria-label*="Current theme"` and not a `data-testid`
  because no production-source change required, theme-label
  invariance, and strict-mode resilience against a future
  second theme switch with `.first()`; `.first()` on the
  toggle button against future admin-shell / per-option /
  portal-rendered duplicates; parsing the `aria-label`
  substring instead of querying state because of black-box
  discipline, storage drift survival, and theme-set
  extensibility; role+regex name for the option buttons
  for locale invariance and strict-mode resilience;
  `isDarkMode()` reads `<html>`'s class because of
  Tailwind `darkMode: 'class'`, server-render parity, and
  the no-flicker guarantee); the failure matrix covering
  every theme-toggle-page-level mistake (type-only import
  drop, accidental `extends BasePage` add, `readonly`
  drop, exact `aria-label` match instead of substring,
  `.first()` drop on the toggle button, `aria-label*=` →
  `data-testid` swap, CSS attribute selector swap on the
  option-button locator, text-only locator swap on the
  option button, `.first()` drop on the option button,
  React state / `localStorage` reach-in for
  `getCurrentTheme()`, `<body>` / `<main>` swap on
  `isDarkMode()`, `'unknown'` branch drop on
  `getCurrentTheme()`, file move, rename, `.tsx`
  extension, CRLF line endings); the per-line walkthrough
  table that pins each line of the file to its purpose;
  the read / write surface summary that maps every caller
  to the fields they touch; the read / write surface
  failure modes table that maps production-source /
  middleware / config drift onto `Locator not found` and
  `isDarkMode()`-returns-false-in-dark-mode failures; and
  the `theme-toggle.page.ts`-change checklist that ties
  any change to a spec audit, a [`base-page-object.md`](plugins/base-page-object.md)
  cross-check, a production-source cross-check, an
  [`e2e-tsconfig.md`](plugins/e2e-tsconfig.md) cross-check,
  a [`playwright-config.md`](plugins/playwright-config.md)
  cross-check, a [`fixtures-index.md`](plugins/fixtures-index.md)
  cross-check, dual `pnpm tsc --noEmit` runs, a smoke-subset
  Playwright run, a [`docs/log.md`](log.md) entry, a Spec
  010 cross-link, and a reviewer pass.
- `e2e` Added `apps/web-e2e/tests/api/user-currency-query.spec.ts`
  — the **query-param surface smoke** for the unauthenticated
  user-currency detection endpoint served by
  [`apps/web/app/api/user/currency/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/user/currency/route.ts).
  Pins the route's **always-200 graceful-degradation**
  contract: the handler reads exactly one query parameter
  (`provider`), runs it through `validateProvider()` which
  lowercases / trims / falls back to `'smart'` for any value
  not in the canonical seven-element allowlist
  (`'cloudflare' | 'vercel' | 'cloudfront' | 'fastly' |
'generic' | 'auto' | 'smart'`), and otherwise reads CDN
  country headers (`Cf-IPCountry`, `X-Vercel-IP-Country`,
  …) to derive the currency. Without those headers — the
  default e2e-runner shape — the response is always
  `{ currency: 'USD', country: null, detected: false }` with
  status 200. The spec parametrises across 60+ query strings
  (the seven canonical providers; case-insensitive variants;
  whitespace-padded variants; out-of-allowlist providers;
  empty / null providers; repeated providers; `country=`,
  `countryCode=`, `currency=` overrides that the route reads
  zero of today; user-id and auth-token bypass keys; cache
  busting / format / locale / tenant keys; special-character
  / long-value / bogus combinations) plus seven targeted
  invariant tests (canonical 200 fallback envelope shape;
  invariance across all seven canonical providers;
  invariance across invalid providers; the
  `?country=…`-does-NOT-bypass-detection invariant; the
  `?currency=…`-does-NOT-bypass-derivation invariant; the
  ISO 4217 supported-currency-set invariant; param-permutation
  shape stability). Mirrors the sibling `current-user-query`
  / `payments-query` / `subscription-query` smoke shape but
  inverted to the always-200 contract because the currency
  route is the only GET handler in the user tree that is
  not session-gated.
- `index` Inserted the `theme-toggle-page-object.md` entry at
  the head of the plugins section (above `signin-page-object`)
  with the same exhaustive single-line summary shape every
  recent index entry uses.

- `docs/plugins` Added `signin-page-object.md` — the
  **per-source-file reference** for the Playwright e2e
  suite's sole `auth/`-tree page object paired with
  [`apps/web-e2e/page-objects/auth/signin.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/auth/signin.page.ts),
  sitting at the root of the `auth/` page-object subtree
  the same way [`base-page-object.md`](plugins/base-page-object.md)
  sits at the root of the page-objects tree as a whole,
  [`fixtures-index.md`](plugins/fixtures-index.md) sits at
  the root of the fixtures tree, and
  [`e2e-test-data.md`](plugins/e2e-test-data.md) sits at the
  root of the helpers tree. Where `base-page-object.md`
  documents the **page-object inheritance root** and
  [`auth-fixture.md`](plugins/auth-fixture.md) documents
  the **suite's authenticated-fixture boundary** that turns
  the persisted storage states minted at pre-flight into
  per-test isolated contexts, this page documents the
  **suite's sign-in surface boundary** — the smallest
  possible page object that lets a spec drive `/auth/signin`
  end-to-end (fill the email, fill the password, submit,
  optionally wait for the post-sign-in redirect, observe
  the success / error alerts). Documents the at-a-glance
  summary table of every load-bearing element (the
  `import type` Playwright type-only import that mirrors
  the base-class discipline; the `import { BasePage }` runtime
  import — the only runtime import in the file; the
  `export class SignInPage extends BasePage` named export;
  the seven pre-bound Locator fields with the form-scoping
  posture for `emailInput` / `passwordInput` /
  `forgotPasswordLink`, the unscoped role+regex-name
  `submitButton`, and the `.first()`-pinned
  `errorAlert` / `successAlert`; the constructor that uses
  a local `authForm = page.locator('form').filter({ has: page.locator('#email') })`
  to scope every form-relative Locator to the sign-in form;
  the `navigate()` method that wraps `goto('/auth/signin')`;
  the `signIn(email, password)` form-fill kernel that
  submits via `passwordInput.press('Enter')` instead of
  clicking the button; the `signInAndWaitForRedirect(...)`
  happy-path wrapper that delegates to `signIn()` and
  awaits `page.waitForURL(expectedUrl, { timeout: 60_000 })`);
  the full file annotated chunk-by-chunk; the spec context
  cross-link to [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
  and the auth-flow spec set under
  `apps/web-e2e/tests/auth/`; the four "Why X" walkthroughs
  (form-scoping every form Locator vs unscoped against
  newsletter / sign-up form `#email` collisions, role+regex
  name `submitButton` vs CSS attribute / form-scoped role /
  text selector alternatives that fail on locale-coverage
  or button-floats-outside-form refactors, Enter-key
  submission vs button click against real-user semantics
  and button-state flakes, `.bg-red-50.first()` /
  `.bg-green-50.first()` vs unscoped against stacked-banner
  strict-mode collisions); the kernel-vs-wrapper rationale
  for `signIn` / `signInAndWaitForRedirect` (failure-path
  specs need the kernel without an awaited redirect; happy-path
  specs need the wrapper with a 60-second cold-start-tolerant
  timeout); the failure matrix covering every
  signin-page-level mistake (type-only import drop,
  inheritance drop, `readonly` drop, form-scoping drop,
  CSS / text submitButton swap, `href*=` → `href=`
  forgotPasswordLink swap, `.first()` drop, Enter → click
  swap, timeout tightening below 30s or raising above 60s,
  global-state field, file move, rename, `.tsx` extension,
  CRLF line endings); the per-line walkthrough table that
  pins each line of the 37-line file to its purpose; the
  read / write surface summary that maps every caller to
  the fields they touch; and the `signin.page.ts`-change
  checklist with cross-checks against
  [`base-page-object.md`](plugins/base-page-object.md), the
  production sign-in form components under
  `apps/web/components/auth/**` and the route under
  `apps/web/app/[locale]/auth/signin/`,
  [`auth-fixture.md`](plugins/auth-fixture.md),
  [`e2e-tsconfig.md`](plugins/e2e-tsconfig.md),
  [`e2e-package-manifest.md`](plugins/e2e-package-manifest.md),
  [`playwright-config.md`](plugins/playwright-config.md),
  and [`global-setup.md`](plugins/global-setup.md). Linked
  from `docs/index.md`. Spec 010 cross-link.
- `apps/web-e2e` Added `tests/api/payments-query.spec.ts` —
  a smoke spec covering the **query-param surface** of the
  authenticated user-payments endpoint at
  [`apps/web/app/api/user/payments/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/user/payments/route.ts).
  The handler is session-gated (`auth()` early-returns 401
  for unauthenticated callers, then resolves a Stripe
  customer id from the session-bound user record before
  listing invoices and subscriptions) and declares **no
  parameters at all** — not `_request`, not `request: NextRequest`,
  not a `context` object — so the route reads zero query
  params. Mirrors the sibling
  [`subscription-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/subscription-query.spec.ts)
  shape because both routes share the same `auth() →
getCustomerId() → stripe.list()` chain and the same
  zero-query-param contract. The spec walks 70+
  query-string permutations (impersonation keys `?userId=` /
  `?user_id=` / `?uid=` / `?id=`, customer-bypass keys
  `?customerId=` / `?customer=` / `?stripeCustomerId=`,
  invoice-id / subscription-id filters, status filters
  `?status=paid|pending|draft|open|void|uncollectible`,
  magic-token keys `?token=` / `?secret=` / `?api_key=` /
  `?authorization=` / `?session=`, dangerous Stripe-key
  passthrough keys `?stripeKey=` / `?stripe_key=` / `?sk=`
  that must NEVER be honoured, cache-bust, expand /
  pagination keys mirroring Stripe's own shape,
  content-negotiation keys, currency / locale keys,
  multi-provider switch keys
  `?provider=stripe|polar|lemonsqueezy|solidgate`,
  date-range filters, multi-tenancy, empty / repeated /
  special-character / long values) and asserts status
  invariance plus the five load-bearing "no bypass"
  contracts (`?userId=` does not impersonate, `?customerId=`
  does not bypass the session-bound customer-resolution
  step, `?stripeKey=` does not forward a caller-supplied
  Stripe key, `?token=` does not introduce a query-token
  auth bypass, parameterised vs no-arg calls produce
  identical 401 envelopes). Spec 010 cross-link.
- `docs/plugins` Added `gitignore.md` — the
  **per-source-file reference** for the monorepo's
  workspace-root git-ignore manifest paired with
  [`.gitignore`](https://github.com/ever-works/directory-web-template/tree/develop/.gitignore),
  the **single git-ignore boundary** that gates every file
  the workspace-root `git status`, every `pnpm install`,
  every `pnpm tsc --noEmit`, every `pnpm build`, every
  `pnpm test:e2e` run, and every CI `actions/checkout`
  step decide whether to track. Sits at the workspace root
  the same way [`pnpm-workspace.md`](plugins/pnpm-workspace.md)
  sits at the root for workspace membership and
  [`turbo-config.md`](plugins/turbo-config.md) sits at the
  root for task orchestration. Where `pnpm-workspace.md`
  documents the **workspace-membership boundary** and
  `turbo-config.md` documents the **task-graph boundary**,
  this page documents the **tracked-file boundary** —
  which artefacts the workspace deliberately keeps out of
  source control, why each pattern is in the file, what
  the consumers expect, and what the failure modes look
  like when an entry drifts. Documents the at-a-glance
  summary table of every section (`# dependencies`,
  `# turbo`, `# testing` (covering the security-critical
  `**/auth-states/` pattern protecting the persisted
  NextAuth session cookies documented in
  [`auth-fixture.md`](plugins/auth-fixture.md) and
  [`global-setup.md`](plugins/global-setup.md)),
  `# next.js`, `# docusaurus`, `# production`, `# misc`,
  `# debug`, `# env files` (covering the security-critical
  `.env*` glob plus `!.env.example` re-include — the
  single most important block for the workspace's secret
  posture), `# vercel`, `# typescript`, `# content` (the
  `.content` Git-CMS directory cloned at runtime from
  `DATA_REPOSITORY` plus the `analyze/` bundle-analyzer
  output), `# vscode AI rules`, `# cache`, `# OpenAPI
backups` (three patterns exhaustively covering the
  generate-openapi script's backup output), and
  `# claude` (the per-checkout Claude Code state
  directory)); the full file annotated section-by-section;
  the five "Why X" walkthroughs (single workspace-root
  file vs per-package files, `**/auth-states/` security
  posture vs bare `auth-states/`, `.env*` plus
  `!.env.example` defence-in-depth vs positive include
  list, `.content` per-deployment customisation chokepoint,
  `.claude` per-developer state); the OpenAPI backup
  multi-pattern rationale; the failure matrix that maps
  every gitignore-level mistake to the workflow that
  surfaces it (`pnpm install`, `pnpm dev`, `pnpm build`,
  `pnpm test:e2e`, contributor sign-up, security
  regression on the `.env*` and `**/auth-states/` blocks);
  the per-section walkthrough table; and the
  `.gitignore`-change checklist with cross-checks against
  [`auth-fixture.md`](plugins/auth-fixture.md),
  [`global-setup.md`](plugins/global-setup.md),
  [`e2e-test-data.md`](plugins/e2e-test-data.md),
  [`playwright-config.md`](plugins/playwright-config.md),
  [`workspace-root-manifest.md`](plugins/workspace-root-manifest.md),
  and [`turbo-config.md`](plugins/turbo-config.md). Linked
  from `docs/index.md`. Spec 010 cross-link.
- `apps/web-e2e` Added `tests/api/subscription-query.spec.ts` —
  a smoke spec covering the **query-param surface** of the
  authenticated user-subscription endpoint at
  [`apps/web/app/api/user/subscription/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/user/subscription/route.ts).
  The handler is session-gated (`auth()` early-returns 401
  for unauthenticated callers, then resolves a Stripe
  customer id from the session-bound user record before
  listing subscriptions) and declares **no parameters at
  all** — not `_request`, not `request: NextRequest`, not
  a `context` object — so the route reads zero query
  params. The spec walks 70+ query-string permutations
  (impersonation keys `?userId=` / `?user_id=` / `?uid=`
  / `?id=`, customer-bypass keys `?customerId=` /
  `?customer=` / `?stripeCustomerId=`, dangerous Stripe-key
  passthrough keys `?stripeKey=` / `?stripe_key=` /
  `?sk=` that must NEVER be honoured, magic-token keys,
  status filters, expand / pagination keys mirroring
  Stripe's own shape, cache-bust, content-negotiation,
  currency / locale, multi-provider switch keys
  `?provider=stripe|polar|lemonsqueezy|solidgate`,
  multi-tenancy, empty / repeated / special-character /
  long values) and asserts status invariance plus the
  five load-bearing "no bypass" contracts (`?userId=`
  does not impersonate, `?customerId=` does not bypass
  the session-bound customer-resolution step, `?stripeKey=`
  does not forward a caller-supplied Stripe key,
  `?token=` does not introduce a query-token auth bypass,
  parameterised vs no-arg calls produce identical 401
  envelopes). Spec 010 cross-link.
- `docs/plugins` Added `base-page-object.md` — the
  **per-source-file reference** for the Playwright e2e
  suite's foundational page-object class paired with
  [`apps/web-e2e/page-objects/base.page.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/page-objects/base.page.ts),
  the page-object inheritance root sitting at
  `apps/web-e2e/page-objects/base.page.ts` the same way
  [`fixtures-index.md`](plugins/fixtures-index.md) sits at
  the root of the fixtures tree and
  [`e2e-test-data.md`](plugins/e2e-test-data.md) sits at the
  root of the helpers tree. Where `fixtures-index.md`
  documents the **directory-level fixture-export boundary**
  and `e2e-test-data.md` documents the **suite's
  shared-data boundary**, this page documents the
  **page-object inheritance root** — the smallest possible
  class every concrete page object under the four role trees
  (`apps/web-e2e/page-objects/admin/`,
  `apps/web-e2e/page-objects/auth/`,
  `apps/web-e2e/page-objects/client/`, and
  `apps/web-e2e/page-objects/public/`) extends. Documents the
  at-a-glance summary table of every load-bearing element
  (the `import type` Playwright type-only import that stays
  out of the runtime bundle, the `BasePage` single named
  export inherited by 30+ subclasses today, the four
  pre-bound Locators `page` / `header` / `footer` /
  `navLinks` with the `first()` posture on `header` and
  `footer` against Next 16 stacked-layout headers, the
  `goto()` suite-wide navigation primitive with the
  `waitUntil: 'domcontentloaded'` override, the
  `gotoLocalized()` locale-aware variant that special-cases
  `'en'` to bare paths, the `waitForPageReady()` re-await
  primitive, the `getTitle()` shortcut); the full file
  annotated chunk-by-chunk; the four "Why X" walkthroughs
  for the load-bearing choices (type-only import vs runtime
  import, `first()` vs unscoped header / footer selection,
  header-scoped vs page-scoped link enumeration,
  `domcontentloaded` vs `load` / `networkidle`); the
  `'en'`-special-case rationale for `gotoLocalized()`; the
  failure matrix covering every base-class-level mistake;
  the per-line walkthrough table; and the `base.page.ts`-change
  checklist with cross-checks against
  [`fixtures-index.md`](plugins/fixtures-index.md),
  [`e2e-tsconfig.md`](plugins/e2e-tsconfig.md),
  [`e2e-package-manifest.md`](plugins/e2e-package-manifest.md),
  [`playwright-config.md`](plugins/playwright-config.md),
  and [`auth-fixture.md`](plugins/auth-fixture.md). Linked
  from `docs/index.md`. Spec 010 cross-link.
- `apps/web-e2e` Added `tests/api/plan-status-query.spec.ts` —
  a smoke spec covering the **query-param surface** of the
  authenticated user-plan-status endpoint at
  [`apps/web/app/api/user/plan-status/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/user/plan-status/route.ts).
  The handler is session-gated (`auth()` early-returns 401
  for unauthenticated callers) and declares its parameter as
  `_request: NextRequest` — underscored to mark it
  deliberately unused. The spec walks 60+ query-string
  permutations (impersonation keys `?userId=` / `?user_id=`
  / `?uid=` / `?id=`, plan-spoof keys `?planId=` /
  `?effectivePlan=` / `?plan=`, magic-token keys `?token=`
  / `?secret=` / `?api_key=` / `?authorization=` /
  `?session=`, cache-bust keys, content-negotiation keys,
  field-selection keys, point-in-time-query keys,
  warning-window keys, multi-tenancy keys, localisation keys,
  empty / repeated / special-character / long values) and
  asserts status invariance plus the three load-bearing "no
  bypass" contracts (`?userId=` does not impersonate,
  `?token=` does not introduce a query-token auth bypass,
  `?plan=` does not spoof the effective plan). Spec 010
  cross-link.
- `docs/plugins` Added `fixtures-index.md` — the
  **per-source-file reference** for the Playwright e2e
  suite's fixtures-directory barrel module paired with
  [`apps/web-e2e/fixtures/index.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/fixtures/index.ts),
  the directory-level public-surface companion to
  [`auth-fixture.md`](plugins/auth-fixture.md) (which the
  barrel re-exports from). Documents the single
  `export { test, expect } from './auth.fixture'`
  re-export statement that turns the `fixtures/` directory
  into a single addressable import target so a future spec
  can write `import { test, expect } from '../../fixtures'`
  instead of `'../../fixtures/auth.fixture'`; the three
  load-bearing properties of the re-export (forwarding both
  `test` AND `expect` to prevent the soft-failure
  aggregation anti-pattern, the relative `./auth.fixture`
  source path that resolves through `moduleResolution: "bundler"`
  without going through any `paths` mapping, the bare names
  without renaming because Playwright's runner contract
  requires the test function be named `test`); the "Why a
  barrel module instead of importing the file directly"
  walkthrough that pins the three failure modes of
  file-direct imports (composition with future fixture
  modules, internal-restructuring absorption, JavaScript
  ecosystem lingua franca) against the lowest-cost
  composable barrel shape; the "Why a single re-export and
  not `export *`" walkthrough that pins the three failure
  modes of `export *` (type-only exports drop, intent
  becomes opaque, accidental additions surface) against the
  lowest-coupling named-re-export shape; the failure matrix
  covering every barrel-level mistake; the per-line
  walkthrough table; and the `index.ts`-change checklist
  with cross-checks against [`auth-fixture.md`](plugins/auth-fixture.md),
  [`e2e-tsconfig.md`](plugins/e2e-tsconfig.md), and
  [`e2e-package-manifest.md`](plugins/e2e-package-manifest.md).
  Linked from `docs/index.md`. Spec 010 cross-link.
- `apps/web-e2e` Added `tests/api/geocode-query.spec.ts` —
  a smoke spec covering the **query-param surface** and the
  **POST body-resilience surface** of the admin-only
  geocoding endpoint at
  [`apps/web/app/api/geocode/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/geocode/route.ts).
  The handler is admin-gated (`auth()` early-returns 401
  for unauthenticated callers, then 403 for non-admin), so
  every assertion in the spec pins the unauthenticated
  branch's 401 contract: the GET handler declares no
  parameters at all and reads zero query keys, so the
  matrix walks 30+ query-string permutations (cache-bust
  keys, content-negotiation keys, localisation keys,
  provider-pinning keys, geocode-as-query attempts,
  empty/repeated/special-character/long values) and asserts
  status invariance; the POST suite pins the
  gate-then-parse order — a regression that flipped to
  parse-then-gate would surface as a 400 instead of a 401
  on malformed bodies. Spec 010 cross-link.
- `docs/plugins` Added `e2e-package-manifest.md` — the
  **per-source-file reference** for the Playwright e2e
  suite's package manifest paired with
  [`apps/web-e2e/package.json`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/package.json),
  the test-only manifest companion to the four runtime-manifest
  references ([`workspace-root-manifest.md`](plugins/workspace-root-manifest.md),
  [`runtime-package-manifest.md`](plugins/runtime-package-manifest.md),
  [`sdk-package-manifest.md`](plugins/sdk-package-manifest.md),
  [`plugin-demo-package-manifest.md`](plugins/plugin-demo-package-manifest.md)).
  Where those four document the manifest of a host-app or
  library workspace member, this one documents the manifest of
  a **test-only** workspace member that ships no runtime
  exports, no `main` / `types` / `exports` map, declares
  everything in `devDependencies` because the package is
  consumed only by the workspace itself, and deliberately omits
  a `dependencies` block. Documents the at-a-glance summary
  table of every load-bearing field (the `name:
'@ever-works/web-e2e'` workspace identifier the
  `pnpm --filter` glob and Turborepo's `test:e2e` task resolve
  through; the `version: '0.0.0'` symbolic-only pin justified
  by `private: true`; the `private: true` hard-block on
  `pnpm publish`; the `license: 'AGPL-3.0'` workspace-wide
  inheritance; the five Playwright `scripts.*` entries
  `test:e2e` / `test:e2e:ui` / `test:e2e:chromium` /
  `test:e2e:headed` / `test:e2e:debug` plus the no-op
  `scripts.lint` echo that lets workspace-wide `pnpm -r lint`
  walk this member without a per-package opt-out; the four
  `devDependencies` `@ever-works/tsconfig` `workspace:*`,
  `@playwright/test` `^1.58.2`, `@faker-js/faker` `^10.1.0`,
  `dotenv` `^16.4.7`, `typescript` `^5`); the file-contents
  walkthrough; the per-field walkthrough that pins each field
  to a concrete responsibility; the deliberately-absent fields
  matrix (no `description` / `homepage` / `repository` /
  `bugs` / `author` / `keywords` / `engines` / `packageManager`
  / `type` / `main` / `types` / `exports` / `bin` /
  `peerDependencies` / `files` / `dependencies` /
  `scripts.dev` / `scripts.build` / `scripts.start` / `pnpm.*`
  / `prettier`); the consumer table mapping each reader
  (`pnpm install`, `pnpm --filter @ever-works/web-e2e
    <script>`, Turborepo's `test:e2e` task, CI workflows, the
  Playwright runner's CLI walk-up, TypeScript's `tsc --noEmit`
  gate, Renovate / Dependabot, editors) to the fields it
  consumes; the failure matrix that maps each manifest-level
  mistake (drop `name`, rename off `@ever-works/*`, drop
  `private: true`, drop `license`, drop `scripts.test:e2e` /
  `scripts.lint`, switch the no-op `scripts.lint` to a real
  lint without wiring `eslint.config.mjs`, drop any of the four
  `devDependencies`, tighten / loosen the Playwright range,
  move the file, add a `dependencies` block, add
  `"type": "module"`, bump `version` away from `0.0.0`) onto
  the layer that surfaces it; the per-line walkthrough table;
  and the `package.json`-change checklist that ties any field
  change to the appropriate cross-check
  ([`pnpm-workspace.md`](plugins/pnpm-workspace.md) on `name`
  change, [`playwright-config.md`](plugins/playwright-config.md)
  on Playwright or dotenv change,
  [`e2e-tsconfig.md`](plugins/e2e-tsconfig.md) on tsconfig or
  typescript change,
  [`auth-fixture.md`](plugins/auth-fixture.md) on Playwright
  major bump, [`e2e-test-data.md`](plugins/e2e-test-data.md)
  on Faker major bump,
  [`turbo-config.md`](plugins/turbo-config.md) on new
  workspace-spanning script,
  [`workspace-root-manifest.md`](plugins/workspace-root-manifest.md)
  on inherited posture divergence), a `pnpm install`
  round-trip, a dual `pnpm tsc --noEmit` gate run, a
  smoke-subset Playwright run, a
  [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
  cross-link if the change introduces a new shared concept,
  and a reviewer pass. Indexed in
  [`docs/index.md`](index.md).
- `apps/web-e2e/tests/api` Added
  [`item-votes-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/item-votes-query.spec.ts) —
  the **query-param surface** smoke for `GET
/api/items/[slug]/votes` defined by
  [`apps/web/app/api/items/[slug]/votes/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/items/%5Bslug%5D/votes/route.ts).
  The route's `GET` handler signature is
  `GET(request: Request, context: { params: Promise<{ slug:
string }> })` — `request` is **declared** but **never read**
  inside the body (no `request.url`, no `request.headers`, no
  `searchParams.get(...)`); the handler awaits `context.params`
  and `auth()` together, then calls `getVoteCountForItem(slug)`
  and (when signed in) `getClientProfileByUserId(...)` /
  `getVoteByUserIdAndItemId(...)`. The route therefore must be
  invariant to **any** query parameter the caller appends —
  present, absent, empty, repeated, special-character, or
  long. The existing
  [`item-votes-public.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/item-votes-public.spec.ts)
  covers the no-arg unknown-slug 5xx-resilience contract; this
  new spec walks the **query-param surface** so a regression
  that introduces a `request.url`-based wiring (which a future
  "filter votes by date range" or "include per-vote breakdown"
  feature might tempt a future contributor into adding) is
  caught immediately as a status divergence between the
  no-arg and parameter-laden branches. The route contract is
  deliberately permissive on the catch path: success is
  `{ success: true, count: number, userVote: 'up' | 'down' |
null }` with status 200; the `try / catch` block degrades to
  the same `{ success: true, count: 0, userVote: null }`
  envelope with status 200 (logging the error in development
  only), so there is **no** 5xx branch on this route. The
  matrix accepts `< 500` as the dominant happy path and pins
  the 200-only contract in the dedicated tests at the bottom.
  The query enumeration covers the `?userId=` / `?include=`
  / `?fields=` / `?select=` / `?expand=` / `?refresh=` /
  `?force=` / `?fresh=` / `?format=` / `?locale=` / `?lang=`
  / `?since=` / `?from=` / `?until=` / `?direction=` / `?type=`
  obvious-future-wiring keys, the empty-value / repeated-key /
  special-character / long-value / bogus-key edge variants,
  and the deliberate `?type=up` overlap with the POST body's
  `type: 'up' | 'down'` field that proves URL params do not
  influence the GET response. Three dedicated tests at the
  bottom pin the canonical envelope shape, the
  status-invariance across no-arg and parameter-laden
  branches, and the response-shape stability across param
  permutations — anchoring the bulk-loop's `< 500` matrix to
  the stricter 200-with-`{ success, count, userVote }` shape
  on the happy path.
- `docs/plugins` Added `auth-fixture.md` — the
  **per-source-file reference** for the Playwright e2e suite's
  authenticated-context fixture paired with
  [`apps/web-e2e/fixtures/auth.fixture.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/fixtures/auth.fixture.ts),
  the authenticated-fixture companion to
  [`global-setup.md`](plugins/global-setup.md) (which mints the
  persisted authentication storage states),
  [`global-teardown.md`](plugins/global-teardown.md) (today a
  no-op placeholder), and
  [`e2e-test-data.md`](plugins/e2e-test-data.md) (which
  exports `ADMIN_STATE_FILE` and `CLIENT_STATE_FILE`). Where
  `global-setup.md` documents the **suite's pre-flight
  boundary**, `global-teardown.md` documents the **suite's
  post-flight boundary**, and `e2e-test-data.md` documents the
  **suite's shared-data boundary**, this page documents the
  **suite's authenticated-fixture boundary** — how the
  persisted storage states minted at pre-flight become per-test
  isolated browser contexts, with what failure modes, and what
  guarantees a spec can rely on when it imports `test` from
  this file instead of from `@playwright/test`. Documents the
  at-a-glance summary table of every load-bearing element (the
  file-scoped `eslint-disable react-hooks/rules-of-hooks`
  directive that suppresses the false-positive flag on
  Playwright's `use` parameter name; `import { test as base,
type Page, type BrowserContext } from '@playwright/test'`
  with the mandatory `as base` rename to free up `test` for the
  local export and the type-only imports that stay out of the
  runtime bundle; `fs` / `path` Node imports for the
  `requireAuthState()` `existsSync` check and the
  `path.resolve(__dirname, '..', ...)` absolute-path
  computation; the `import { ADMIN_STATE_FILE, CLIENT_STATE_FILE
} from '../helpers/test-data'` so the fixture never types the
  literal `'auth-states/admin.json'`; the `ADMIN_STATE_PATH` /
  `CLIENT_STATE_PATH` resolved-once-at-module-load absolute
  paths with the `__dirname`-anchored shape that survives
  `webServer.cwd: '../..'`; the `requireAuthState(filePath)`
  fail-fast guard that throws with a contributor-actionable
  message naming the file path AND the most likely cause
  `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`; the `AuthFixtures`
  type with the four fixture names; the four
  `base.extend<AuthFixtures>(...)` factories with `adminContext`
  depending on `browser` and `adminPage` depending on
  `adminContext` — the only shapes that load the storage state
  at context creation; the per-test `await close()` teardown
  that prevents memory leaks under high-parallelism workers;
  and the `export { expect } from '@playwright/test'` re-export
  that saves every spec one import line and prevents the
  imported-`test`-but-not-`expect` anti-pattern that breaks
  Playwright's test-soft-failure aggregation); the full file
  annotated chunk-by-chunk; the "How a spec uses the fixture"
  walkthrough showing the canonical
  `import { test, expect } from '../../fixtures/auth.fixture'`
  shape; the "Why a fixture instead of a `test.beforeEach()`
  hook" walkthrough that pins the three failure modes of the
  hook approach against the lazy-composition fixture model; the
  "Why `BrowserContext` per fixture, not a shared one"
  walkthrough that pins the three failure modes of the
  shared-context optimisation against the fresh-context-per-test
  isolation; the failure matrix that maps each `auth.fixture.ts`
  mistake (drop the `requireAuthState` guard → cryptic 30-s
  timeout instead of fail-fast, switch to `fs.statSync` →
  low-level `ENOENT` instead of contributor-actionable message,
  drop the `path.resolve(__dirname, '..', ...)` shape →
  relative paths resolve against the wrong `webServer.cwd`,
  hard-code the literal `'auth-states/admin.json'` → drift on a
  future directory rename, drop the `as base` rename →
  TypeScript redeclaration error, drop the `AuthFixtures` type
  parameter → loss of IntelliSense and typo-driven runtime
  errors, reuse a shared `BrowserContext` → cross-test
  pollution and races, drop the `await close()` teardown → OOM
  under high parallelism, drop the `re-export { expect }` →
  spec drift back to dual imports breaking soft-failure
  aggregation, switch the `adminContext` factory's dependency
  from `browser` to `context` → silent breakage of the
  "pre-loaded with admin auth" guarantee, switch the
  `adminPage` factory's dependency from `adminContext` to
  `page` → silent breakage of the "authenticated page"
  guarantee, move the file from `apps/web-e2e/fixtures/` →
  `Cannot find module` on every consumer import, add a third
  fixture pair without updating the `AuthFixtures` type → new
  fixture not destructurable from spec, remove the
  `eslint-disable` directive → CI lint failure on the
  false-positive flag) onto the layer that surfaces each one;
  the per-line walkthrough table; and the `auth.fixture.ts`-change
  checklist that ties any fixture change to a
  [`global-setup.md`](plugins/global-setup.md) cross-check, a
  [`global-teardown.md`](plugins/global-teardown.md)
  cross-check, an [`e2e-test-data.md`](plugins/e2e-test-data.md)
  cross-check, a [`playwright-config.md`](plugins/playwright-config.md)
  cross-check, an [`e2e-tsconfig.md`](plugins/e2e-tsconfig.md)
  cross-check, every authenticated spec under
  `apps/web-e2e/tests/admin/` and `apps/web-e2e/tests/client/`
  (they all import `{ test, expect }` from this file), dual
  `pnpm tsc --noEmit` runs (e2e + workspace root), a
  smoke-subset Playwright run of the admin / client spec set, a
  [`docs/log.md`](log.md) entry, a
  [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
  cross-link if a new auth role or fixture pair is added, and
  a reviewer pass.

- `apps/web-e2e/tests/api` Added
  `internal-db-init-query.spec.ts` — a query-param surface
  smoke spec for `GET /api/internal/db-init` (the
  development-only database-initialization endpoint served by
  [`apps/web/app/api/internal/db-init/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/internal/db-init/route.ts)
  that triggers `initializeDatabase()` — auto-migration plus
  seeding — when the host app is in `NODE_ENV=development` and
  hard-blocks with `403` and `{ error: 'Not available in
production' }` otherwise). Pins the route's status surface
  against future regressions that might introduce a `?force=`
  bypass for the production guard (which a future "allow init
  in staging" feature might tempt a contributor into adding by
  flipping the hard-coded `NODE_ENV !== 'development'` check),
  a `?env=` query-string spoof for the server-side
  `process.env.NODE_ENV`, a `?seed=` / `?reset=` / `?drop=`
  destructive toggle, a `?token=` / `?secret=` / `?api_key=`
  query-token authentication bypass, or any other
  caller-controlled flag that would change the production-mode
  behaviour. Walks the route's three-branch contract (`200` on
  the dev happy path, `403` on the production guard, `500` on
  a thrown `initializeDatabase()` error mapped through
  `safeErrorResponse`) and asserts `< 600 && >= 200` on every
  parameterised path because all three branches are part of
  the route's contract; pins the more precise allowed-set
  `[200, 403, 500]` on the no-arg path; asserts status-equality
  between the no-arg case and a parameter-laden case to pin
  the "every unknown query key is silently ignored"
  invariant; and asserts three load-bearing security
  invariants explicitly: `?force=true` does NOT bypass the
  production guard, `?env=development` / `?env=production` do
  NOT spoof `NODE_ENV`, and `?token=anything` / `?secret=anything`
  / `?authorization=Bearer+anything` do NOT introduce a
  query-token auth bypass. The matrix covers the obvious
  bypass keys (`?force=`, `?bypass=`, `?override=`), env-spoof
  keys (`?env=`, `?NODE_ENV=`), destructive toggles
  (`?seed=`, `?reset=`, `?drop=`, `?recreate=`), migration
  toggles (`?migrate=`, `?skip-migration=`), dry-run toggles
  (`?dryRun=`, `?dry-run=`), logging toggles (`?verbose=`,
  `?debug=`, `?logLevel=`), cache-busting keys (`?refresh=`,
  `?nocache=`), content-negotiation keys (`?format=`),
  multi-tenancy keys (`?tenant=`, `?tenantId=`), magic-token
  keys (`?token=`, `?secret=`, `?api_key=`,
  `?authorization=`), the empty-value case for each, repeated
  keys, special characters that would tempt regex / LIKE /
  SQL-injection wiring (including a `?token=' OR 1=1`
  classic), long values to guard against future regex-based
  indexing bugs, and bogus / typo'd keys. Cross-references
  [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage),
  the
  [`method-guards.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/method-guards.spec.ts)
  spec that already covers the route indirectly, and the
  [`apps/web/app/api/internal/db-init/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/internal/db-init/route.ts)
  source file the spec is paired with.

- `docs/plugins` Added `e2e-test-data.md` — the
  **per-source-file reference** for the Playwright e2e suite's
  central test-data and constants module paired with
  [`apps/web-e2e/helpers/test-data.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/helpers/test-data.ts),
  the shared-data companion to
  [`global-setup.md`](plugins/global-setup.md) (which destructures
  `TEST_DATA`, `ADMIN_STATE_FILE`, `CLIENT_STATE_FILE`,
  `AUTH_STATE_DIR`, and `REQUIRED_ENV_VARS` from this module) and
  to [`global-teardown.md`](plugins/global-teardown.md) (which
  will consume the same constants when the no-op placeholder
  grows into a real cleanup sequence). Where `global-setup.md`
  documents the **suite's pre-flight boundary** and
  `global-teardown.md` documents the **suite's post-flight
  boundary**, this page documents the **suite's shared-data
  boundary** — every constant, generator, env-var name, route
  path, auth-state file path, and seeded credential the rest of
  the suite reads through. Documents the at-a-glance summary
  table of every export (`requireEnv(name)` private fail-fast
  helper that throws on missing OR empty env-vars with a
  contributor-actionable message naming the missing key and the
  file `.env.local` it must be set in; `TEST_DATA.ADMIN_EMAIL` /
  `TEST_DATA.ADMIN_PASSWORD` lazy getters calling `requireEnv(...)`
  so the env-var read happens at access time, not module load —
  specs that never touch admin credentials never trigger the
  throw; `TEST_DATA.CLIENT_PASSWORD` static `'TestClient123!'`
  because per-run uniqueness comes from the email so the
  password is irrelevant to identity and a static value makes
  failed sign-ups immediately reproducible from the trace;
  `TEST_DATA.generateClientEmail()` returning
  `e2e-client-${Date.now()}-${randomSuffix}@test.local` with a
  6-char base-36 random suffix and the RFC 6761 reserved
  `@test.local` TLD; `TEST_DATA.generateItemName()` and
  `TEST_DATA.generateItemUrl()` (the latter using the IANA
  RFC 2606 reserved `example.com` apex); `REQUIRED_ENV_VARS`
  `as const` whitelist consumed by `promptForMissingEnv()`;
  `PUBLIC_ROUTES` 13-row `as const` table of every public route
  the navigation shell links to; `AUTH_STATE_DIR`,
  `ADMIN_STATE_FILE`, `CLIENT_STATE_FILE` template-composed
  path constants); the full file annotated chunk-by-chunk; the
  "Why the lazy-getter pattern for the admin credentials"
  walkthrough that pins the three failure modes of property
  assignment (`process.env` read at module load punishes specs
  that do not need credentials, `?? ''` fallback turns the error
  into silent `''` propagation 30 seconds in, `??` removes the
  type-check safety net) against the lazy-getter shape
  (access-time read, fail-fast throw with contributor-actionable
  message, narrow `string` return type); the "Why the generators
  use `Date.now()` + base-36 random" walkthrough with the three
  rejected alternatives (`crypto.randomUUID()`, Faker's real-world
  TLDs, per-worker static emails); the "Why `PUBLIC_ROUTES` is
  a `readonly` array of objects" rationale (the `name` field is
  the test description, survives a route rename, and the
  `as const` posture lets specs type-check against literal
  values); the failure matrix that maps each `test-data.ts`
  mistake (drop the empty-string check → 30-second timeout
  instead of fail-fast, switch getters to property assignments
  → punishes credential-free specs, add `?? ''` → silent `''`
  propagation, switch client TLD from `@test.local` to
  `@example.com` → real-MX-records risk, switch URL apex from
  `example.com` to a real domain → accidental traffic, drop
  the `Date.now()` prefix → suite-lifetime collision risk,
  add a required env-var without updating `REQUIRED_ENV_VARS`
  → pre-flight prompt skips it, drop `as const` → typos
  become silent test failures, public-route drift between the
  navigation and `PUBLIC_ROUTES` in either direction, hard-code
  `'auth-states'` instead of importing → multi-file rename
  becomes lossy, switch `CLIENT_PASSWORD` to a generator →
  failed sign-ups become harder to reproduce, move the file
  out of `helpers/` → `Cannot find module`, export
  `requireEnv` → multiple opinions of "missing env-var"
  drift) onto the layer that surfaces each one; the per-line
  walkthrough table; and the `test-data.ts`-change checklist
  that ties any export change to a
  [`global-setup.md`](plugins/global-setup.md) cross-check, a
  [`global-teardown.md`](plugins/global-teardown.md)
  cross-check, a
  [`playwright-config.md`](plugins/playwright-config.md)
  cross-check (the `webServer.cwd` resolves the relative paths
  in `ADMIN_STATE_FILE` / `CLIENT_STATE_FILE`), an
  [`e2e-tsconfig.md`](plugins/e2e-tsconfig.md) cross-check, the
  `.gitignore` cross-check (`AUTH_STATE_DIR` must match the
  gitignore entry), the public-routes smoke spec cross-check
  under `apps/web-e2e/tests/public/`, the
  `apps/web/.env.example` and workspace README propagation for
  new required env-vars, dual `pnpm tsc --noEmit` runs (e2e +
  workspace root), a smoke-subset Playwright run, a
  [`docs/log.md`](log.md) entry, a
  [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
  cross-link if the change introduces a new shared concept, and
  a reviewer pass.

- `apps/web-e2e/tests/api` Added
  `surveys-exists-query.spec.ts` — a query-param surface smoke
  spec for `GET /api/surveys/exists` (the navigation-shell
  surveys-existence-probe served by
  [`apps/web/app/api/surveys/exists/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/surveys/exists/route.ts)
  that decides whether the "Surveys" link belongs in the header,
  the same way the sibling `categories/exists` and
  `collections/exists` probes decide whether the "Categories" /
  "Collections" links belong there). Pins the route's status
  surface against future regressions that might introduce a
  `?status=` filter (which a future "show draft surveys"
  feature might tempt a contributor into adding by flipping the
  hard-coded `SurveyStatusEnum.PUBLISHED`), a `?lang=` filter,
  a `?refresh=` cache-bust, a `?limit=` override (which a
  contributor might wire to flip the hard-coded `limit: 1`), or
  a non-200 status on an unknown `?type=` value (which a future
  "throw on unknown survey type" change might add). Walks the
  route's coercion contract (`typeParam === SurveyTypeEnum.ITEM
? ITEM : GLOBAL` byte-for-byte ternary so every non-`'item'`
  value — including `'ITEM'`, `'global'`, `''`, `null`, typos —
  falls through to the GLOBAL branch). Asserts `< 500` on every
  parameterised path; asserts the canonical `{ exists: boolean
}` shape on the no-arg path; asserts status-equality between
  the no-arg case and a parameter-laden case to pin the
  "every unknown query key is silently ignored" invariant;
  asserts the GLOBAL-branch invariance across no-arg /
  `?type=global` / `?type=unknown` / `?type=ITEM` (case variant
  must NOT match) / `?type=` (empty); and asserts that the
  ITEM and GLOBAL branches both return the same canonical
  envelope shape. The matrix covers every `?type=` case variant
  (`item` / `ITEM` / `Item` / `iTeM` / `GLOBAL` / `Global`),
  unknown `?type=` values (`location`, `tag`, `category`,
  `unknown`, `null`), empty / whitespace `?type=` values, the
  obvious filter-by-state keys (`?status=`, `?published=`),
  pagination keys (`?limit=`), i18n keys (`?locale=`, `?lang=`),
  cache-busting keys (`?refresh=`, `?force=`, `?fresh=`,
  `?nocache=`), validation keys (`?strict=`, `?validate=`),
  projection keys (`?include=`, `?fields=`, `?select=`,
  `?expand=`), content-negotiation keys (`?format=`),
  multi-tenancy keys (`?tenant=`, `?tenantId=`), valid keys
  combined with unknown keys, repeated `?type=` keys (the
  `searchParams.get('type')` first-value semantics), special
  characters in `?type=` and `?include=` (would tempt regex /
  LIKE / SQL-injection wiring), long values to guard against
  future regex-based indexing bugs, and bogus / typo'd keys.
  Cross-references
  [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage),
  the
  [`categories-exists-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/categories-exists-query.spec.ts)
  and
  [`collections-exists-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/collections-exists-query.spec.ts)
  sibling specs, the
  [`feature-existence.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/feature-existence.spec.ts)
  spec that already covers the surveys-exists endpoint
  indirectly, the
  [`apps/web/lib/types/survey.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/lib/types/survey.ts)
  enum source, and the
  [`apps/web/app/api/surveys/exists/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/surveys/exists/route.ts)
  source file the spec is paired with.

- `docs/plugins` Added `global-teardown.md` — the
  **per-source-file reference** for the Playwright e2e suite's
  per-run global teardown paired with
  [`apps/web-e2e/global-teardown.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/global-teardown.ts),
  the post-flight companion to
  [`global-setup.md`](plugins/global-setup.md) (where the setup
  mints the two persisted authentication storage states by
  driving a real Chromium browser against the host web app's
  `/auth/signin` and `/auth/register` screens, this file
  documents the **post-flight boundary** — what the runner does
  once after the last test, in what order, with what failure
  modes — even when, today, the answer is _nothing_) and wired
  into [`playwright-config.md`](plugins/playwright-config.md)
  via the always-resolved `globalTeardown: path.resolve(__dirname,
'./global-teardown.ts')` field. Documents the at-a-glance
  summary table of every load-bearing element (`async function
globalTeardown()` with the empty parameter list because the
  no-op does not use Playwright's `FullConfig`, the single
  `// Placeholder for future cleanup (e.g., test database reset)`
  marker comment that prevents the file from being deleted as
  dead code, the `export default globalTeardown;` shape
  Playwright's runner imports as `(await
import('./global-teardown.ts')).default`, and the absence of
  imports because there is nothing to clean up today); the full
  file annotated chunk-by-chunk; the "Why a no-op placeholder
  instead of dropping the file" walkthrough that pins the
  lowest-coupling rationale against the three rejected
  alternatives (drop both the file and the config field, point
  the field at a real `noop.ts` that does not communicate intent,
  or keep both with a self-descriptive empty stub); the five
  concrete cleanup buckets the placeholder reserves the slot for
  (per-run `auth-states/` directory cleanup, per-run client
  account deletion via `TEST_DATA.generateClientEmail()`, per-run
  Stripe / Polar / LemonSqueezy sandbox fixture cleanup,
  `apps/web-e2e/test-results/` directory cleanup on success, and
  test-database snapshot reset); the "Why the parameter list is
  empty today" rationale that pins the `(config: FullConfig) =>
Promise<void> | void` Playwright contract against the
  future-friendly addition of `(config: FullConfig)`; the "Why
  `globalTeardown` is not allowed to throw" rationale that pins
  the recommended per-bucket `try / catch` + `console.error`
  pattern; the "Why `globalTeardown` runs once, not per-worker"
  rationale that pins the global-shared cleanup buckets against
  the race-condition cost of pushing cleanup down to project /
  file / test level; the failure matrix that maps each
  `global-teardown.ts` mistake (drop the file → `ENOENT` on every
  run before `globalSetup`, drop the `globalTeardown` field →
  silent skip with no error, switch to a named export →
  `TypeError: undefined is not a function` at run end, make the
  function synchronous and throw → "tests passed but the run
  failed" log noise, leave the body empty without the marker
  comment → contributor deletes the file as dead code, move the
  file to `apps/web-e2e/setup/global-teardown.ts` → `ENOENT` from
  the hard-coded `path.resolve(__dirname, './global-teardown.ts')`,
  add `process.exit(0)` → empty `playwright-report/` directory,
  hard-code an `await` on a database client → failure on minimal
  local-dev configurations, add a `setTimeout` / long-running
  async wait → 60-s end-of-run blocker that produces false
  "run timed out" results) onto the layer that surfaces each one;
  the per-line walkthrough table; and the `global-teardown.ts`-change
  checklist that ties any flip back to a
  [`global-setup.md`](plugins/global-setup.md) cross-check, a
  [`playwright-config.md`](plugins/playwright-config.md)
  cross-check, an
  [`apps/web-e2e/helpers/test-data.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/helpers/test-data.ts)
  cross-check, an [`e2e-tsconfig.md`](plugins/e2e-tsconfig.md)
  cross-check, dual `pnpm tsc --noEmit` runs (e2e + workspace root),
  a smoke-subset Playwright run that confirms the runner starts
  (no `ENOENT`), exits cleanly (teardown returns within timeout),
  and writes the HTML report (`playwright-report/index.html`
  exists), a [`docs/log.md`](log.md) entry, a
  [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage)
  cross-link if the teardown gains a real cleanup bucket, and a
  reviewer pass. Added per-source-file reference link to
  [`docs/index.md`](index.md) under the plugin-package
  per-source-file section right above the matched `global-setup.md`
  entry. Cross-references
  [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage),
  the [`apps/web-e2e/playwright.config.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/playwright.config.ts)
  `globalTeardown:` field, the
  [`apps/web-e2e/global-setup.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/global-setup.ts)
  matched pre-flight file,
  [`apps/web-e2e/helpers/test-data.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/helpers/test-data.ts)
  for the constants a future teardown will use,
  [`apps/web-e2e/tsconfig.json`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tsconfig.json)
  for the `include: ["./**/*.ts"]` glob that picks up this file,
  and the [`docs/log.md`](log.md) running change log itself.

- `apps/web-e2e/tests/api` Added
  `collections-exists-query.spec.ts` — a query-param surface
  smoke spec for `GET /api/collections/exists` (the
  navigation-shell existence-probe served by
  [`apps/web/app/api/collections/exists/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/collections/exists/route.ts)
  that decides whether the "Collections" link belongs in the
  header, the same way the sibling `categories/exists` probe
  decides whether the "Categories" link belongs there). Pins the
  route's status surface against future regressions that might
  introduce a `?fresh=` cache-busting wiring, a `?strict=`
  validation that throws, an `?include=inactive` toggle (which a
  future "show archived collections" feature might tempt a future
  contributor into adding by flipping the hard-coded
  `includeInactive: false` argument), or a per-locale 404 (which
  a hypothetical i18n-aware variant might add). Walks the
  route's two-branch contract (happy path returns
  `{ exists, count }` with `200`; the catch branch — which today
  is the only legitimate non-200 path — returns
  `{ exists: false, count: 0, error: 'Failed to check collections
existence' }` with `500`). Asserts on `< 600 && >= 200` for
  every parameterised path because both `200` and `500` are
  legitimate route branches; asserts the canonical
  `{ exists: boolean, count: number }` shape on the no-arg path;
  asserts status-equality between the no-arg case and a
  parameter-laden case to pin the "every unknown query key is
  silently ignored" invariant; asserts that
  `?includeInactive=true` does not flip the repository's
  `includeInactive` flag (the route hard-codes `false` today);
  and asserts that the `?locale=en` and `?locale=` empty-string
  cases round-trip to the same status as the no-arg case (the
  route reads zero query input, so all three must land in the
  same branch). The matrix covers the obvious i18n keys
  (`?locale=`, `?lang=`), cache-busting keys (`?refresh=`,
  `?force=`, `?fresh=`, `?nocache=`), validation keys
  (`?strict=`, `?validate=`), projection keys (`?include=`,
  `?fields=`, `?select=`, `?expand=`, `?includeInactive=`),
  content-negotiation keys (`?format=`), filter-by-state keys
  (`?status=`, `?active=`), multi-tenancy keys (`?tenant=`,
  `?tenantId=`), the empty-value case for each, repeated keys,
  special-character values that would tempt a future regex /
  LIKE / path-injection wiring, long values to guard against
  future regex-based indexing bugs, and bogus / typo'd keys.
  Cross-references
  [Spec 010 — E2E Test Coverage](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/010-e2e-test-coverage),
  the
  [`categories-exists-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/categories-exists-query.spec.ts)
  sibling spec for the categories-existence probe, and the
  [`apps/web/app/api/collections/exists/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/collections/exists/route.ts)
  source file the spec is paired with.

- `docs/plugins` Added `global-setup.md` — the
  **per-source-file reference** for the Playwright e2e suite's
  per-run pre-flight hook paired with
  [`apps/web-e2e/global-setup.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/global-setup.ts),
  the pre-flight companion to
  [`playwright-config.md`](plugins/playwright-config.md) (where the
  config locks the suite's runtime boundary, this file locks the
  suite's pre-flight boundary — what the runner does once before
  the first test, in what order, with what failure modes) and the
  type-checking companion to [`e2e-tsconfig.md`](plugins/e2e-tsconfig.md)
  (which scopes the type-checker's walk to include this file). Documents
  the ordered pre-flight sequence — `promptForMissingEnv()` first
  (walks `REQUIRED_ENV_VARS = ['SEED_ADMIN_EMAIL',
'SEED_ADMIN_PASSWORD']`, throws on `process.env.CI` to prevent CI
  hangs, prompts on a TTY using `readline/promises` with an empty-answer
  guard and a `try / finally` close), `baseURL` resolution from
  `config.projects[0]?.use?.baseURL ?? 'http://localhost:3000'`,
  recursive `mkdirSync(auth-states/)` because Playwright's
  `storageState({ path })` does not auto-create the parent directory,
  the `__dirname`-anchored absolute path resolution that survives
  `webServer.cwd: '../..'`, single shared `chromium.launch()` reused
  by both auth flows for the boot-cost / memory-footprint win
  (~500 ms × 1 vs ~500 ms × 2, ~150 MB × 1 vs ~150 MB × 2), the admin
  sign-in flow (`/auth/signin` → `#email` / `#password` → click
  `getByRole('button', { name: /sign in/i })` → `waitForURL(/\/(admin|client\/dashboard)/)`
  → `storageState({ path: 'auth-states/admin.json' })` →
  `[global-setup] Admin auth state saved`), the client sign-up flow
  (per-run `TEST_DATA.generateClientEmail()` → `/auth/register` →
  `#name` / `#email` / `#password` → `press('Enter')` instead of
  click → `waitForURL(/\/client\/dashboard/, { timeout: 120_000,
waitUntil: 'domcontentloaded' })` → `storageState({ path:
'auth-states/client.json' })` → `[global-setup] Client auth state
saved`), the per-flow `try / catch` that closes the browser on
  failure, the single `await browser.close()` that runs only on the
  happy path, and the `export default globalSetup` Playwright
  contract; the full file annotated chunk-by-chunk; the "Why
  `promptForMissingEnv` is the first call" walkthrough that pins the
  fail-fast posture against the `locator('#email').fill(undefined)`
  failure mode 30 seconds in; the "Why one Chromium, two contexts"
  cost / benefit rationale; the "Why `storageState({ path })` instead
  of cookies-only" rationale; the "Why the admin flow accepts both
  `/admin` and `/client/dashboard`" role-tolerance rationale; the
  "Why the client flow uses `domcontentloaded` instead of `load`"
  analytics-pixel rationale; the "Why the `auth-states/` directory
  is per-suite, not per-worker" cost rationale; the failure matrix
  that maps each `global-setup.ts` mistake (drop
  `promptForMissingEnv()` → cryptic `fill(undefined)` 30 s in,
  drop the `process.env.CI` branch → CI hangs forever, drop the
  empty-answer guard → silent failure later, hard-code `baseURL` →
  `BASE_URL=` override stops working, drop the `?? '...'` fallback
  → `goto(undefined)` `TypeError`, drop `mkdir auth-states/` →
  `ENOENT`, use `process.cwd()` → broken paths under
  `webServer.cwd: '../..'`, two `chromium.launch()` calls →
  doubled wall-clock and memory, drop `try / catch` → leaked
  Chromium processes, hard-code admin email → suite breaks on seed
  rotation, hard-code client email → parallel-worker collisions,
  use real-world TLD on client email → accidental delivery risk,
  use `.click()` instead of `press('Enter')` on register → button-text
  dependency, use `waitUntil: 'load'` on client redirect → analytics
  pixel wall-clock blow-up, use 30-s client timeout → cold-render
  flakes, drop `storageState({ path })` → every authenticated test
  re-runs sign-in, tighten admin redirect regex to `/admin` only →
  breaks on demoted seeded admin, loosen admin redirect regex to
  `/` → succeeds when sign-in fails, remove per-success
  `console.log` → silent CI on success, drop `AUTH_STATE_DIR` /
  `ADMIN_STATE_FILE` / `CLIENT_STATE_FILE` constants → path drift
  across files) onto the layer that surfaces each one; the per-line
  walkthrough table; and the `global-setup.ts`-change checklist that
  ties any flip back to a [`playwright-config.md`](plugins/playwright-config.md)
  cross-check, a [`apps/web-e2e/helpers/test-data.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/helpers/test-data.ts)
  cross-check, dual `pnpm tsc --noEmit` runs (e2e + workspace root),
  a smoke-subset run that proves both auth states land in
  `apps/web-e2e/auth-states/`, the per-CI-vs-local both-modes
  verification (set `CI=1` to exercise the no-prompt branch), a
  [`docs/log.md`](log.md) entry, a Spec 010 cross-link, and a
  reviewer pass.
- `apps/web-e2e` Added a query-param surface smoke spec for
  `GET /api/categories/exists`
  ([`categories-exists-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/categories-exists-query.spec.ts))
  — the public categories-existence probe served by
  `apps/web/app/api/categories/exists/route.ts` that the navigation
  shell hits on every render to decide whether the "Categories"
  link belongs in the header. The handler reads exactly **one**
  query param — `?locale=` — via
  `request?.nextUrl?.searchParams?.get('locale') || 'en'` and
  forwards it to `fetchItems({ lang: locale })`. The spec
  enumerates every plausible query-param shape a future contributor
  might add (`?locale=en/fr/es/de/ar/zh/pt/ja`, the obvious
  `?lang=` alias, `?lang=` and `?locale=` together to confirm
  `?locale=` continues to win, `?refresh=` / `?force=` / `?fresh=` /
  `?nocache=` cache-busting keys that the route does not honour,
  `?strict=` / `?validate=` keys that would tempt a future
  throw-on-invalid-locale wiring, `?include=` / `?fields=` /
  `?select=` / `?expand=` projection keys, `?format=`,
  `?status=` / `?active=` filter-by-state keys, `?tenant=` /
  `?tenantId=` multi-tenancy scoping keys, plus empty values
  that exercise the `|| 'en'` fallback, repeated keys,
  special-character payloads, long payloads, and bogus typo'd
  keys) and asserts the bulk-loop `< 500` contract (the route
  has two success branches — the happy `fetchItems` resolution and
  the catch-and-empty fallback that maps every thrown error to
  `{ exists: false, count: 0 }` with status 200), the canonical
  `{ exists: boolean, count: number }` envelope shape on the happy
  path, the status-invariance between the no-arg and parameter-laden
  branches, a multi-permutation shape-stability assertion, and a
  dedicated `?locale=en` / `?locale=` / no-arg three-way
  status-equality assertion that pins the `|| 'en'` fallback
  semantics. The spec guards against regressions that introduce a
  `?fresh=` cache-busting wiring, a `?strict=` locale validation
  that throws, or a per-locale 404 (which a future "treat unknown
  locales as missing" feature might tempt a future contributor into
  adding), and pairs with `global-setup.md` in the same change so
  the per-source-file documentation set and the e2e coverage
  advance together.
- `docs/plugins` Added `playwright-config.md` — the
  **per-source-file reference** for the Playwright e2e suite's
  runner configuration paired with
  [`apps/web-e2e/playwright.config.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/playwright.config.ts),
  the runtime companion to
  [`e2e-tsconfig.md`](plugins/e2e-tsconfig.md) (where the tsconfig
  locks the suite's type-checking posture, this file locks the
  suite's runtime behaviour). Documents the at-a-glance summary of
  every load-bearing field (`dotenv.config({ path: '../web/.env.local' })`
  cross-app env loading, the `BASE_URL` override hatch with the
  `'http://localhost:3000'` default, the `isCI` boolean gate, the
  `testDir: './tests'` and `outputDir: './test-results'` artefact
  boundaries, `fullyParallel: true`, `workers: isCI ? 2 : 1`,
  `retries: isCI ? 2 : 0`, the per-environment reporter set with
  `open: 'never'` on CI, the `60_000` per-test and `30_000`
  `expect()` timeouts, the `globalSetup` / `globalTeardown` paths,
  the `use`-block defaults — `baseURL`, `trace: isCI ?
'on-first-retry' : 'retain-on-failure'`, `screenshot:
'only-on-failure'`, `video: isCI ? 'on-first-retry' : 'off'`,
  `navigationTimeout: 60_000`, `actionTimeout: 30_000`, `locale:
'en-US'`, `timezoneId: 'America/New_York'` — the three browser
  projects (Chromium, Firefox, WebKit), and the `webServer` block
  with the per-environment `command` (`build && start` on CI,
  `dev` locally), `cwd: '../..'` monorepo-root anchor,
  `reuseExistingServer: !isCI`, the per-environment timeouts
  (`300_000` CI, `120_000` local), and the `stdout: 'pipe'` /
  `stderr: 'pipe'` self-diagnosing posture); the full file
  annotated line-by-line; the "Why
  `dotenv.config({ path: '../web/.env.local' })`" walkthrough that
  pins the single-source-of-truth posture against drift; the "Why
  `BASE_URL` is the only env-var override surface" rationale; the
  per-CI-vs-local branch matrix that maps each `isCI ? X : Y`
  branch to its trade-off; the "Why the three browser projects"
  cost / benefit matrix; the "Why `webServer.cwd` is the monorepo
  root" rationale; the "Why `stdout: 'pipe'` and `stderr: 'pipe'`"
  self-diagnosing rationale; the failure matrix that maps each
  `playwright.config.ts` mistake (dropped `dotenv.config(...)` →
  cryptic 500s, separate `apps/web-e2e/.env.local` → drift,
  `BASE_URL` fallback dropped → cannot target deployed previews,
  `fullyParallel: false` → ~3× wall-clock, `workers > 2` on CI →
  resource contention flakes, `retries: 0` on CI → un-mergeable
  flake amplification, `github` reporter dropped → no inline
  annotations, `html` reporter dropped → unreproducible flakes,
  `open: 'always'` on CI → CI hangs on no-display, `timeout`
  reduction → cold-render flakes, `globalSetup` dropped →
  unseeded specs, `use.trace: 'off'` on CI → un-diagnosable
  CI-only flakes, `use.locale: 'en-GB'` → date-format breakage,
  `use.timezoneId: 'UTC'` → timestamp-render breakage, project
  drop → engine-specific regressions slip past CI, project add
  without matrix bump → wall-clock blow-up, `next start` without
  `build` step on CI → cold-checkout failure, `webServer.cwd:
__dirname` → `ERR_PNPM_NO_WORKSPACE_FOUND`,
  `reuseExistingServer: false` locally → `EADDRINUSE`,
  `stdout: 'ignore'` → silent host-app errors) onto the layer
  that surfaces each one; the per-line walkthrough table; and
  the `playwright.config.ts`-change checklist that ties any flip
  back to a [`e2e-tsconfig.md`](plugins/e2e-tsconfig.md)
  cross-check, a `pnpm tsc --noEmit` run, a smoke-subset run, the
  per-CI-vs-local both-modes verification, a [`docs/log.md`](log.md)
  entry, a Spec 010 cross-link, and a reviewer pass.
- `apps/web-e2e` Added a query-param surface smoke spec for
  `GET /api/items/[slug]/comments`
  ([`item-comments-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/item-comments-query.spec.ts))
  — the public per-item comments-list endpoint served by
  `apps/web/app/api/items/[slug]/comments/route.ts`. The handler
  signature is `GET(request: Request, { params }: ...)` —
  `request` is declared but never read; the handler only awaits
  `params.slug`, calls `checkDatabaseAvailability()` (which
  short-circuits to an empty list when no DB is configured), and
  otherwise calls `getCommentsByItemId(slug)`. The spec
  enumerates every plausible query-param shape a future
  contributor might add (`?limit=` / `?offset=` / `?page=` /
  `?pageSize=` pagination keys, `?sort=` / `?order=` / `?orderBy=`
  sort keys, `?rating=` / `?minRating=` / `?maxRating=` filter
  keys, `?include=` / `?fields=` / `?select=` / `?expand=`
  projection keys, `?userId=` / `?status=` / `?moderation=`
  filter keys, `?refresh=` / `?force=` / `?fresh=` cache-busting
  keys, `?format=`, `?locale=` / `?lang=`, `?since=` / `?from=` /
  `?until=` time-window keys, plus empty values, repeated keys,
  special-character payloads, long payloads, and bogus typo'd
  keys) and asserts the bulk-loop `< 500` contract (the route
  has three success branches — DB-unavailable short-circuit,
  happy-path data-layer query, and catch-and-empty fallback —
  that all legitimately return `200 OK`), the canonical
  `{ success, comments }` envelope shape on the happy path, the
  status-invariance between the no-arg and parameter-laden
  branches, and a multi-permutation shape-stability assertion.
  The spec guards against regressions that introduce a
  `request.url`-based wiring (which a future "filter by rating",
  "include only top-level", "sort by helpfulness", or
  "paginate" feature might tempt a future contributor into
  adding), and pairs with `playwright-config.md` in the same
  change so the per-source-file documentation set and the e2e
  coverage advance together.
- `docs/plugins` Added `e2e-tsconfig.md` — the
  **per-source-file reference** for the Playwright e2e suite's
  TypeScript configuration paired with
  [`apps/web-e2e/tsconfig.json`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tsconfig.json),
  sitting one directory below the shared
  [`@ever-works/tsconfig`](plugins/tsconfig-presets.md) presets the
  same way [`web-app-tsconfig.md`](plugins/web-app-tsconfig.md) sits
  one directory below those presets for the host web app and
  [`plugin-tsconfigs.md`](plugins/plugin-tsconfigs.md) sits one
  directory below them for the three plugin packages. Documents the
  `extends: "@ever-works/tsconfig/playwright.json"` chain that
  inherits the workspace's TypeScript posture (`target: ES2017`,
  `module: esnext`, `moduleResolution: bundler`, `strict: true`,
  `noEmit: true`, `esModuleInterop`, `resolveJsonModule`,
  `isolatedModules`, `incremental`, the `dom`/`dom.iterable`/`esnext`
  lib set) plus the Playwright leaf's `types: ["node"]` whitelist
  that opens up `process.env.*`, `URL`, `Buffer`, and the rest of
  the Node ambient surface; the single-entry `include` array
  (`./**/*.ts`) that scopes the type-checker to the suite's own
  source tree (the `tests/` tree under `tests/api/`, `tests/admin/`,
  `tests/auth/`, `tests/client/`, `tests/i18n/`, `tests/public/`,
  `tests/smoke/`, plus `fixtures/`, `helpers/`, `page-objects/`, and
  the four top-level globals `global-setup.ts`, `global-teardown.ts`,
  and `playwright.config.ts`); the `exclude: ["node_modules"]`
  resilience rationale; the deliberate divergences from
  [`apps/web/tsconfig.json`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/tsconfig.json)
  (no `@/*` alias, no `**/*.tsx` glob, no `.next/types/**/*.ts` or
  `.next/dev/types/**/*.ts` entries, no `scripts/generate-openapi.ts`
  entry, the leading-`./` anchor on the include glob); the per-line
  walkthrough that pins each line to a documentation impact; the
  failure matrix that maps each `tsconfig.json` mistake (`extends`
  dropped → mass type errors, `extends` switched to `nextjs.json` →
  Node-ambient regression for `process.env.*`, `extends` switched to
  `base.json` directly → loses both the Node whitelist and the
  `noEmit` re-pin, `./**/*.ts` glob narrowed to `tests/**/*.ts` →
  `global-setup.ts`/`global-teardown.ts`/`playwright.config.ts`/
  `fixtures/`/`helpers/`/`page-objects/` fall out of scope,
  `**/*.tsx` added → drift away from the suite's TS-only posture,
  `node_modules` exclude dropped → orders of magnitude slower
  type-check, `composite: true` added → `'isolatedModules' may not
be used with 'composite'` panic, `noEmit: false` flipped → `.js`
  contamination next to every `.ts` file) onto the layer that
  surfaces each one; and the `tsconfig.json`-change checklist that
  ties any flip back to a [`tsconfig-presets.md`](plugins/tsconfig-presets.md)
  cross-check, a [`docs/log.md`](log.md) entry, a Spec 010
  cross-link, the dual `pnpm tsc --noEmit` runs (e2e + workspace
  root), the Playwright smoke run, and a reviewer pass.
- `apps/web-e2e` Added a query-param surface smoke spec for
  `GET /api/reference`
  ([`reference-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/reference-query.spec.ts))
  — the public Scalar API reference UI served by
  `apps/web/app/api/reference/route.ts`. The spec enumerates every
  plausible query-param shape a future contributor might add
  (`?theme=`, `?layout=` / `?sidebar=` / `?showSidebar=`, `?spec=` /
  `?url=` / `?source=`, `?tag=` / `?operation=` / `?path=`,
  `?format=`, `?locale=` / `?lang=`, `?refresh=` / `?force=` /
  `?fresh=` / `?nocache=`, `?dark=` / `?darkMode=` / `?colorMode=`,
  plus empty values, repeated keys, special-character payloads —
  including SSRF-shaped `?spec=` URLs — long payloads, and bogus
  typo'd keys) and asserts the bulk-loop `< 500` contract, the
  status-invariance between the no-arg and parameter-laden branches,
  a multi-permutation status-stability assertion, and a dedicated
  guard against a future `?spec=` SSRF wiring (the handler today is
  the library-provided constant `ApiReference(config)` from
  `@scalar/nextjs-api-reference` closed over a static `config`
  object, so any caller-supplied URL must be ignored). The spec
  guards against regressions that swap the constant handler for a
  `request.url`-based wiring, and pairs with `e2e-tsconfig.md` in
  the same change so the per-source-file documentation set and the
  e2e coverage advance together.
- `docs/plugins` Added `web-app-tsconfig.md` — the
  **per-source-file reference** for the host web application's
  TypeScript configuration paired with
  [`apps/web/tsconfig.json`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/tsconfig.json),
  sitting one directory below the shared
  [`@ever-works/tsconfig`](plugins/tsconfig-presets.md) presets the
  same way [`plugin-tsconfigs.md`](plugins/plugin-tsconfigs.md) sits
  one directory below those presets for the three plugin packages.
  Documents the `extends: "@ever-works/tsconfig/nextjs.json"` chain
  that locks the workspace-wide TypeScript posture (`target: ES2017`,
  `module: esnext`, `moduleResolution: bundler`, `strict: true`,
  `noEmit: true`, `jsx: react-jsx`, the `next` LSP plugin, the
  `dom`/`dom.iterable`/`esnext` lib set, `allowJs: true`,
  `skipLibCheck: true`, `incremental: true`, `isolatedModules: true`)
  in one place; the single `compilerOptions.paths` entry
  `{ "@/*": ["./*"] }` that is the Next.js convention for an
  internal-import alias rooted at the application's top-level
  directory and powers every internal import in the App Router; the
  six-entry `include` array (`next-env.d.ts`, `**/*.ts`, `**/*.tsx`,
  `.next/types/**/*.ts` for `next build` typed-link declarations,
  `scripts/generate-openapi.ts` for the OpenAPI-generation script,
  and `.next/dev/types/**/*.ts` for the Next 16 dev-server variant);
  the `exclude: ["node_modules"]` resilience rationale; the per-line
  walkthrough that pins each line to a documentation impact; the
  failure matrix that maps each `tsconfig.json` mistake (`extends`
  dropped → mass type errors, `extends` switched to a non-Next preset
  → JSX transform breaks, `@/*` alias dropped → every internal import
  that uses the alias fails to resolve, `**/*.tsx` dropped → JSX
  source files fall out of scope, `.next/types/**/*.ts` dropped →
  typed routes regress, `node_modules` exclude dropped → orders of
  magnitude slower type-check) onto the layer that surfaces each
  one; and the `tsconfig.json`-change checklist that ties any flip
  back to a [`tsconfig-presets.md`](plugins/tsconfig-presets.md)
  cross-check, a [`docs/log.md`](log.md) entry, a Spec 002
  cross-link, the dual `pnpm tsc --noEmit` runs, and a reviewer pass.
- `apps/web-e2e` Added a query-param surface smoke spec for
  `GET /api/items/[slug]/votes/count`
  ([`item-vote-count-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/item-vote-count-query.spec.ts))
  — the public per-item vote-count endpoint served by
  `apps/web/app/api/items/[slug]/votes/count/route.ts`. The spec
  enumerates every plausible query-param shape a future contributor
  might add (`?userId=`, `?include=` / `?fields=` / `?select=`,
  `?expand=`, `?refresh=` / `?force=` / `?fresh=`, `?format=`,
  `?locale=` / `?lang=`, `?since=` / `?from=` / `?until=`,
  `?direction=`, plus empty values, repeated keys, special-character
  payloads, long payloads, and bogus typo'd keys) and asserts the
  bulk-loop `< 500` contract, the canonical `{ success, count }`
  envelope shape on the happy path, the status-invariance between
  the no-arg and parameter-laden branches, and a multi-permutation
  shape-stability assertion. The spec guards against regressions
  that introduce a `request.url`-based wiring (the handler signature
  is `GET(request, context)` — `request` is declared but never read;
  the handler only awaits `context.params` and calls
  `getVoteCountForItem(slug)`), and pairs with `web-app-tsconfig.md`
  in the same change so the per-source-file documentation set and
  the e2e coverage advance together.

## 2026-05-01

- `docs/plugins` Added `npmrc-config.md` — the
  **per-source-file reference** for the monorepo's pnpm
  install-time hoisting posture paired with
  [`.npmrc`](https://github.com/ever-works/directory-web-template/tree/develop/.npmrc)
  at the repo root, the fourth root-level config reference after
  [`pnpm-workspace.md`](plugins/pnpm-workspace.md),
  [`turbo-config.md`](plugins/turbo-config.md), and
  [`workspace-root-manifest.md`](plugins/workspace-root-manifest.md).
  Where `pnpm-workspace.md` documents **which folders become
  workspace members**, `turbo-config.md` documents **what tasks
  those members can run**, and `workspace-root-manifest.md`
  documents **the version-pinning, native-build allow-list, and
  Prettier baseline** for the entire repo, this page documents the
  **install-time hoisting posture itself** — the two load-bearing
  settings (`shamefully-hoist=true` that flattens every transitive
  dependency into the workspace root's `node_modules/`, and
  `public-hoist-pattern[]=*@heroui/*` that forces every `@heroui/*`
  package into the workspace-root public-hoist directory so
  HeroUI's internal-peer model resolves identically from every
  workspace member), the rationale for each (Next.js / ESLint /
  Tailwind / PostCSS plugin discovery from the project root for
  the first; `@heroui/system` / `@heroui/shared-utils` /
  per-component peer resolution for the second), the `.npmrc`
  precedence chain (system → user → project → env-vars → CLI
  flags), the failure matrix that pins each setting flip to a
  concrete user-visible failure, the per-line walkthrough that
  pairs each line with the documentation impact, and the
  `.npmrc`-change checklist that ties any flip back to a
  [`docs/log.md`](log.md) entry, a Spec 002 cross-link, and a
  reviewer pass.
- `apps/web-e2e` Added a query-param surface smoke spec for
  `GET /api/user/profile/location`
  ([`user-profile-location-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/user-profile-location-query.spec.ts))
  — the auth-gated `clientProfileId`-derived location lookup served
  by `apps/web/app/api/user/profile/location/route.ts`. The spec
  enumerates every plausible query-param shape a future contributor
  might add (`?userId=`, `?clientProfileId=`, `?id=`, `?include=`,
  `?fields=` / `?select=`, `?expand=`, `?refresh=` / `?force=` /
  `?fresh=`, `?format=`, `?locale=` / `?lang=`, `?privacy=`, plus
  empty values, repeated keys, special-character payloads, long
  payloads, and bogus typo'd keys) and asserts the bulk-loop
  `< 500` contract and the canonical typed `{ error }` envelope
  shape on the unauthenticated branch. The spec guards against
  regressions that introduce a `request.nextUrl.searchParams.get(...)`
  call (the handler signature is `export async function GET()` —
  no `request` parameter, no query-key reads), and pairs with
  `npmrc-config.md` in the same change so the per-source-file
  documentation set and the e2e coverage advance together.
- `docs/plugins` Added `workspace-root-manifest.md` — the
  **per-source-file reference** for the monorepo's
  workspace-coordination manifest paired with
  [`package.json`](https://github.com/ever-works/directory-web-template/tree/develop/package.json)
  at the repo root, the third root-level config reference after
  [`pnpm-workspace.md`](plugins/pnpm-workspace.md) and
  [`turbo-config.md`](plugins/turbo-config.md). Where
  `pnpm-workspace.md` documents **which folders become workspace
  members** and `turbo-config.md` documents **what tasks those
  members can run**, this page documents the **workspace-coordination
  posture itself** — the eleven top-level `scripts.*` entries every
  contributor and CI runner invokes (`pnpm build`, `pnpm dev`,
  `pnpm dev:web`, `pnpm dev:docs`, `pnpm lint`, `pnpm test:e2e`,
  `pnpm clean`, `pnpm format`, `pnpm build:web`, `pnpm build:docs`,
  `pnpm build:docs:en`), the runtime / package-manager floor
  (`engines.node` `>=20.19.0`, `packageManager` exact pin
  `pnpm@10.31.0` enforced by Corepack), the version-pinning posture
  for transitive dependencies via `pnpm.overrides` (`@types/react`
  `19.2.7`, `@types/react-dom` `19.2.3`, `esbuild` `0.27.0`,
  `esbuild-register` `3.6.0`, `@opentelemetry/api` `1.9.0`), the
  `pnpm.publicHoistPattern: ['@opentelemetry/*']` hoist rule that
  protects OTel's global-registration model, the 11-entry
  `pnpm.onlyBuiltDependencies` allow-list (`@vercel/speed-insights`,
  `@heroui/shared-utils`, `@parcel/watcher`, `@scarf/scarf`,
  `@sentry/cli`, `@swc/core`, `core-js`, `core-js-pure`, `esbuild`,
  `protobufjs`, `sharp`) that gates `postinstall` hooks during
  `pnpm install` under pnpm 10's deny-by-default hardening, and the
  workspace-wide Prettier formatting baseline (`printWidth: 120`,
  `singleQuote`, `semi`, `useTabs` with `tabWidth: 4`,
  `arrowParens: 'always'`, `trailingComma: 'none'`, plus the two
  language-specific overrides for `*.scss` and `*.yml` that switch
  to 2-space indents because YAML cannot use tab characters at the
  syntax level). Documents the at-a-glance summary table of every
  load-bearing field with its value and why-it-matters note; the
  file-contents walk-through (the full JSON file); the per-field
  walkthrough — `name`, `version`, `private`, `license`,
  `packageManager` with the Corepack-shim rationale, `engines.node`
  with the Next.js 16 / `apps/web/scripts/check-env.js` ESM-API /
  `node:test` parity rationale, the eleven `scripts.*` entries with
  their `turbo run <task>` delegations and the
  `--filter=@ever-works/<name>` shortcut rationale, the two
  `devDependencies.turbo`/`prettier` ranges with their exact-version
  rationales (Turborepo 2.x cache-key semantics + `$schema`
  enforcement + `persistent: true` honouring `dependsOn`;
  Prettier 3.x's `overrides` matcher syntax), the
  `pnpm.publicHoistPattern` rule and why it must coexist with the
  `@opentelemetry/api` override, the `pnpm.overrides` field with the
  per-entry rationale for each pin (React typings to lock the
  React 19 narrowed `ReactNode`, `esbuild` to align Next.js /
  Drizzle Kit / Trigger.dev bundler output, `esbuild-register` to
  keep TS syntax features parsing identically across the workspace,
  `@opentelemetry/api` for OTel singleton enforcement), the
  `pnpm.onlyBuiltDependencies` allow-list as pnpm 10's deny-by-default
  `postinstall` hardening with a per-entry table of why each package
  needs to run a build step, the `prettier` block as the
  single-source-of-truth for formatting rules (no `.prettierrc` at
  the repo root by intent), and the two language-specific overrides
  for SCSS conventions and YAML's tab-disallow syntax constraint;
  the deliberately-absent-fields matrix covering top-level
  `dependencies`, `workspaces` (because pnpm reads
  `pnpm-workspace.yaml`), `main` / `exports` / `types` / `module`,
  `bin`, `type`, `repository` / `homepage` / `bugs`,
  `peerDependencies`, `engineStrict` / `os` / `cpu` with the reason
  each is omitted; the "Why this file lives at the repo root"
  rationale (pnpm, Corepack, Turborepo, Vercel, GitHub Actions,
  Renovate, and editors all walk upward and stop at the first
  `package.json`); the consumer table mapping each reader (Corepack,
  pnpm, Turborepo CLI, Prettier CLI, Vercel build runner, GitHub
  Actions, editors, Renovate / Dependabot, contributors) to the
  fields it consumes; the failure matrix that maps each
  manifest-level mistake (`ERR_PNPM_UNSUPPORTED_ENGINE` from a
  Node-floor regression, `Wrong package manager` from a Corepack
  drift, OTel span loss from a hoist or override drop, `pnpm install`
  `ignored build script` warnings from a missing allow-list entry,
  React 19 typings clash from a missing override, YAML re-formatted
  with tabs from a missing override, `--filter` shortcut breakage
  from a renamed package `name`, `Couldn't find a turbo binary` from
  a dropped `devDependency`, Vercel's `pnpm: command not found` from
  disabled Corepack) onto the layer that surfaces each one; and the
  public-surface change checklist that ties any field change to a
  Spec 001 plan cross-check, a CI workflow Corepack-enable check, a
  `.github/workflows/*.yml` propagation check, an
  `apps/*/vercel.json` propagation check, a workspace-wide
  `pnpm format` round-trip, a `docs/log.md` entry, and the
  Constitution-Check note in the PR description for Article III
  (Public-Surface Stability) and Article IX (Test Coverage Bar).
- `apps/web-e2e` Added a Playwright smoke spec for the
  **query-param surface** of the auth-gated current-tenant endpoint
  served by
  [`apps/web/app/api/tenant/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/tenant/route.ts)
  at
  [`apps/web-e2e/tests/api/tenant-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/tenant-query.spec.ts).
  The handler signature is `export async function GET()` (no
  `request` parameter) and it reads zero query keys; the spec walks
  ~50 query strings — `?tenantId=`, `?id=`, `?slug=`, `?include=`,
  `?fields=` / `?select=`, `?expand=`, `?refresh=` / `?force=` /
  `?fresh=`, `?format=`, `?locale=` / `?lang=`, empty values,
  repeated keys, SQL-injection-style escapes (`'`, `<script>`, `..`,
  `%00`), and 500-character payloads — asserting `status < 500` for
  each so a regression that introduces a `searchParams.get(...)`
  call is caught immediately as a typed-envelope-shape failure
  rather than as a session-bearing test flake. Pins the
  unauthenticated branch's typed `{ tenant: null }` envelope on the
  401 path against accidental drops to `null` or
  `{ error: 'Unauthorized' }`, and asserts that the bogus-query
  response and the no-arg response have identical envelope shapes.
- `docs/plugins` Added `turbo-config.md` — the **per-source-file
  reference** for the monorepo's Turborepo task pipeline paired
  with
  [`turbo.json`](https://github.com/ever-works/directory-web-template/tree/develop/turbo.json)
  at the repo root, the second root-level config reference after
  [`pnpm-workspace.md`](plugins/pnpm-workspace.md). Where
  `pnpm-workspace.md` documents **which folders become workspace
  members**, this page documents **what tasks those members can
  run, in what order, with what inputs**. Documents the at-a-glance
  summary (path at the repo root, JSON-with-comments format,
  `$schema: "https://turbo.build/schema.json"`, two top-level keys
  `$schema` and `tasks`, six task entries `build`, `build:en`,
  `lint`, `dev`, `test:e2e`, `clean`, four cached tasks vs. two
  uncached, one persistent task `dev`, local `.turbo/` cache
  backend, no remote-cache wired today, Prettier `*.json` override
  pinning JSON to spaces with `tabWidth: 2`); the file-contents
  walk-through (the full JSON file with one row per task entry);
  the per-task field-by-field walkthrough (`build` with
  `dependsOn: ["^build"]` upstream-first ordering, the
  `outputs: [".next/**", "!.next/cache/**", "build/**", "dist/**"]`
  artefact whitelist with the Next.js cache exclusion rationale,
  the 19-entry `env` allow-list `ANALYZE`, `AUTH_*`, `COOKIE_SECRET`,
  `CRON_SECRET`, `DATA_REPOSITORY`, `DATABASE_*`, `EMAIL_*`,
  `GH_*`, `GITHUB_*`, `NEXT_PUBLIC_*`, `PLATFORM_API_*`,
  `POLAR_*`, `POSTHOG_*`, `RESEND_*`, `SENTRY_*`, `SMTP_*`,
  `STRIPE_*`, `TRIGGER_DEV_*`, `VERCEL_*` with the per-family
  rationale for why each must be in the cache key; `build:en` with
  the narrowed `outputs: ["build/**"]` Docusaurus-only artefact
  set; `lint` with `dependsOn: ["^build"]` so generated typings
  compile first; `dev` with `cache: false` + `persistent: true`
  for the long-running watch process; `test:e2e` with
  `dependsOn: ["build"]` (no `^` prefix so the local-package
  build runs first) and `cache: false` because Playwright runs are
  not deterministic functions of source content; `clean` with
  `cache: false` because a delete operation is meaningless to
  cache); the workspace-and-task-graph composition walk-through
  showing how `pnpm-workspace.yaml` expands → workspace members
  → `package.json#dependencies` DAG → Turborepo's `^build`
  rule → the four-stage build chain
  `plugin-sdk → plugin-runtime + plugin-demo (parallel) → web`;
  the "Why some tasks declare `outputs` and others don't" matrix;
  the `env` allow-list family-by-family table (Bundle analysis /
  Auth / Cookies / Cron / Content repo / Database / Email
  transport / GitHub integration / Public client vars / Platform
  API / Polar / PostHog / Resend / Sentry / SMTP / Stripe /
  Trigger.dev / Vercel) with the consumer file path and why each
  family must contribute to the cache key; the "Deliberately
  absent fields" matrix covering top-level `globalDependencies`,
  `globalEnv`, `globalDotEnv`, `remoteCache`, `ui`, `daemon`,
  `concurrency`, and per-task `inputs`, `passThroughEnv`,
  `dotEnv`, `cache: false on build`, `interactive`, `extends`
  with the default behaviour we accept and why each one is not
  set today; the "Why this file lives at the repo root" rationale
  (Turborepo walks up the directory tree and uses the first
  `turbo.json` it finds as the workspace anchor; same property as
  `pnpm-workspace.yaml`); the consumer table mapping each reader
  (`pnpm run build`, `pnpm run lint`, `pnpm run dev`,
  `pnpm run test:e2e`, the `dev:web` / `dev:docs` script aliases
  using `--filter`, CI's `turbo run build lint --filter`, editor
  tooling that reads `$schema`) to how each consumes this file;
  the failure matrix mapping each pipeline-level mistake (file
  deleted, file renamed, file moved out of root, dropping the `^`
  from `dependsOn` on `build`, removing `dependsOn` from `build`,
  widening `outputs` to `["**"]`, narrowing `outputs` to drop
  `.next/**`, removing an `env` family entry like `NEXT_PUBLIC_*`,
  adding a literal `MY_VAR=value` non-pattern entry, removing
  `cache: false` from `dev` or `test:e2e`, removing
  `persistent: true` from `dev`, adding a new task without
  `cache` / `outputs` / `env` decisions, changing the `$schema`
  URL, JSON syntax errors, task-name collisions with a future
  per-package `turbo.json`) onto the layer that surfaces each
  one; and the public-surface change checklist that ties any
  pipeline change to a `turbo run --dry-run` round-trip, a
  `--summarize` cache-key cross-check, a `pnpm-workspace.md`
  cross-check, an `apps/web/.env.example` propagation check, a
  `docs/log.md` entry, an open-questions register entry, and the
  Constitution-Check note in the PR description for Article I
  (Plugin-First), Article III (Public-Surface Stability), and
  Article IX (Test Coverage Bar).
- `apps/web-e2e` Added
  [`tests/api/config-features-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/config-features-query.spec.ts)
  — query-param surface smoke for the `/api/config/features`
  endpoint, mirroring the pattern set by
  [`tests/api/feature-existence-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/feature-existence-query.spec.ts).
  The route's handler signature is
  `export async function GET()` — no `request` parameter and zero
  `searchParams.get(...)` calls — so any query string the caller
  appends must be silently ignored. The spec walks ~70 query
  variants (locale-style keys `?locale=`, `?lang=`; tenant-style
  keys `?tenant=`, `?tenantId=`, `?org=`; filter keys `?feature=`,
  `?features=`; caller-controlled flag overrides
  `?ratings=`/`?comments=`/`?favorites=`/`?featuredItems=`/
  `?surveys=`; pagination keys `?limit=`, `?offset=`, `?page=`,
  `?pageSize=`; sort keys `?sort=`, `?order=`, `?direction=`;
  type-ahead keys `?q=`, `?search=`, `?prefix=`, `?filter=`;
  cache-bypass knobs `?cache=`, `?fresh=`, `?nocache=`,
  `?bypass=`, `?_=<timestamp>`; empty values, repeated keys,
  special-character percent-encoded values for `%`, `/`, `\`,
  `'`, `"`, `<`, `>`, null byte, `;`, `--`, long values up to
  2,000 chars, prototype-pollution attempts via `?__proto__=` and
  `?constructor=`) and asserts each must respond with one of the
  two documented status codes (200 success, 500 catch-and-degrade)
  — anything else (502, 503, framework crash) indicates a
  regression. Three dedicated tests pin the canonical envelope
  shape (`{ ratings: boolean, comments: boolean, favorites:
boolean, featuredItems: boolean, surveys: boolean }` on either
  branch, with all five flags hard-coded to `false` on the catch
  path), the per-branch `Cache-Control` header (`public,
s-maxage=300, stale-while-revalidate=600` on success vs.
  `no-cache` on the 500 path so a degraded response is not pinned
  by a CDN for five minutes), the no-arg-vs-bogus-args status
  invariance, and the caller-controlled-flag-override
  ignorability (`?ratings=false` does not flip the envelope's
  flag — the response reflects the server's view, not the
  client's suggestion).
- `docs/index.md` Added the
  [`turbo-config.md`](plugins/turbo-config.md) entry to the
  monorepo / packages section so the new pipeline reference is
  discoverable from the top-level docs navigation, sitting
  immediately after `pnpm-workspace.md` as the second of the two
  root-level config references.
- `docs/plugins` Added `pnpm-workspace.md` — the **per-source-file
  reference** for the monorepo's pnpm workspace declaration paired
  with
  [`pnpm-workspace.yaml`](https://github.com/ever-works/directory-web-template/tree/develop/pnpm-workspace.yaml)
  at the repo root, the same way `tsconfig-presets.md` pairs with the
  four files inside `packages/tsconfig/`, `eslint-config.md` pairs
  with the two files inside `packages/eslint-config/`, and the
  per-package manifest references each pair with one
  `packages/*/package.json`. Where the package-level references
  document **what each package contributes** to the workspace graph,
  this page documents **how the graph is declared in the first
  place** — the single YAML file that pnpm reads before any package
  manifest is touched. The page documents the at-a-glance summary
  (path `pnpm-workspace.yaml` at the repo root, YAML 1.2 format,
  single `packages` top-level key, two globs `"apps/*"` and
  `"packages/*"`, eight resolved members across `apps/web`,
  `apps/docs`, `apps/web-e2e` and the five `packages/*`, micromatch
  glob engine, pinned to `pnpm@10.31.0` via
  `package.json#packageManager`, Prettier `*.yml` override that
  pins YAML to spaces with `tabWidth: 2`); the file contents
  walk-through (the three-line file with one row per field —
  `packages` array, the `"apps/*"` glob and what it does and does
  not match, the `"packages/*"` glob and what it does and does not
  match); the "Why a glob, not an explicit list" rationale (new
  packages auto-register, removed packages auto-unregister, the
  convention scales to two roots without over-matching
  `apps/web/.content/**`); the resolved-members table that maps
  each of the eight current members to its path, glob, and matching
  per-package reference page; the glob-semantics matrix that pins
  what `"apps/*"` and `"packages/*"` match versus do not match (one
  level deep, no `**` recursion); the `workspace:*` resolution
  walk-through that traces the four-step chain pnpm performs at
  install time; the "Deliberately absent fields" matrix covering
  `catalog` / `catalogs`, `linkWorkspacePackages`,
  `preferWorkspacePackages`, `sharedWorkspaceLockfile`,
  `saveWorkspaceProtocol`, `injectWorkspacePackages`, `overrides`,
  `peerDependencyRules`, `packageExtensions`, and
  `onlyBuiltDependencies` with the default behaviour we accept and
  why each one is not set today; the "Why this file lives at the
  repo root" rationale (pnpm walks up the directory tree and uses
  the first `pnpm-workspace.yaml` it finds as the workspace anchor;
  same property as `turbo.json`); the consumer table that maps each
  reader (`pnpm install`, `pnpm -r`, `pnpm --filter`, `turbo run`,
  the script aliases like `pnpm dev:web`, and tooling that imports
  `@pnpm/find-workspace-packages`) to how it consumes this file;
  the failure matrix that maps each workspace-level mistake (file
  deleted, file renamed `.yml`, file moved out of root, globs
  narrowed, globs broadened to `**`, two members declared with the
  same `name`, YAML indentation mistake, `packages` key renamed to
  Yarn's `workspaces:`, package added without a `package.json`,
  package's `name` changed without updating consumers, glob uses
  Windows-style backslashes, `apps/web/.content/` accidental
  inclusion) onto the layer that surfaces them; and the public-
  surface change checklist that ties any glob change to a
  `pnpm install` round-trip, a `turbo run --dry-run` discovery
  check, a `packages.md` cross-check, an `apps/web/package.json`
  lockfile cross-check, a `docs/log.md` entry, an open-questions
  register entry, and the Constitution-Check note in the PR
  description for Article I (Plugin-First) and Article III
  (Public-Surface Stability).
- `apps/web-e2e` Added
  [`tests/api/current-user-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/current-user-query.spec.ts)
  — query-param surface smoke for the `/api/current-user`
  endpoint, mirroring the pattern set by
  [`tests/api/health-database-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/health-database-query.spec.ts),
  [`tests/api/version-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/version-query.spec.ts),
  [`tests/api/feature-existence-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/feature-existence-query.spec.ts),
  and the other `*-query.spec.ts` files. The handler signature is
  `export async function GET()` (no `request` parameter), so the
  spec walks the obvious query-param keys a future contributor
  might add (`refresh`, `force`, `provider`, `tenantId`, `locale`,
  `lang`, `format`, `verbose`, `debug`, `fields`, `include`,
  `exclude`) plus empty values, repeated keys, SQL-injection-shaped
  values (`%27`, `%22`, `%3B`, `%2D%2D`, `'OR'1'='1`,
  `DROP+TABLE+users`), an XSS-shaped value
  (`<script>alert(1)</script>`), a path-traversal-shaped value
  (`../../etc/passwd`), long values, and bogus typo'd keys.
  Asserts a tighter contract than the other query-smoke specs: the
  route is intentionally public (returns `null` rather than `401`
  when unauthenticated) so the only valid status is `200`, and any
  4xx — not just 5xx — is a regression. Also pins the
  unauthenticated response envelope (the JSON literal `null`, not
  `{}`, not `{ user: null }`, not the safe-user shape with `null`
  fields), the authenticated envelope shape (`id` is a string,
  `isAdmin` is a boolean — the only two `required` fields per the
  route's swagger doc), the same-status invariant across baseline
  and parameterised URLs, the SQL-injection invariant (the route
  runs `auth()` only with no SQL interpolation, so injection-shaped
  values cannot reach any downstream layer), and the
  Authentication-spec sensitive-field-non-exposure contract that
  forbids `password`, `passwordHash`, `hashedPassword`, `salt`,
  `token`, `accessToken`, `refreshToken`, `idToken`, `jwt`,
  `session`, `sessionToken`, `iat`, `exp`, `jti`, `sub`, and
  `secret` from appearing in the safe-user shape.
- `docs/plugins` Added `tsconfig-presets.md` — the **per-source-file
  reference** for the workspace's shared TypeScript preset package,
  paired with
  [`packages/tsconfig/base.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/tsconfig/base.json),
  [`packages/tsconfig/nextjs.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/tsconfig/nextjs.json),
  [`packages/tsconfig/playwright.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/tsconfig/playwright.json),
  and
  [`packages/tsconfig/package.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/tsconfig/package.json),
  the same way `eslint-config.md` pairs with the two
  `packages/eslint-config/*` files and `plugin-tsconfigs.md` pairs
  with the three plugin-package `tsconfig.json` files. Where
  `plugin-tsconfigs.md` covers the **downstream** plugin tsconfigs
  that extend `base.json`, this page covers the **upstream** preset
  package itself — the three preset files plus the manifest that
  publishes them. The page documents the at-a-glance summary
  (package name `@ever-works/tsconfig`, `private: true`,
  `version: '0.0.0'` pinned because consumed via `workspace:*`
  only, three preset files declared in `package.json#files`, six
  current consumers across `apps/web`, `apps/web-e2e`, and the
  three plugin packages, no `dependencies` / `devDependencies` /
  `peerDependencies` / `scripts`); the file map; the per-field
  walk-through of each preset file (twelve compiler options on
  `base.json` plus an `exclude` entry, two-line override on
  `nextjs.json`, two-line override on `playwright.json`); the
  per-field walk-through of `package.json` plus the matrix of
  deliberately-absent fields (`type`, `main`, `types`, `exports`,
  `dependencies`, `devDependencies`, `peerDependencies`, `scripts`)
  and what each absence implies; the inheritance ASCII diagram
  showing the two leaves fanning out from `base.json` and the three
  plugin packages bypassing the leaves; the consumer table mapping
  each of the six current consumers to its `extends` target with
  the rationale; the deliberate `apps/docs` out-of-scope note;
  the cross-cutting concerns walkthrough (`target: 'ES2017'`,
  `module` + `moduleResolution` pair semantics, `strict` sub-flags,
  `incremental` cache mechanics); the "How the leaves diverge from
  the base" matrix; the failure matrix that maps each preset-level
  mistake onto the layer that surfaces it; and the public-surface
  change checklist with the Constitution-Check note for Article II
  (TypeScript-Only) and Article III (Public-Surface Stability).
- `apps/web-e2e` Added
  [`tests/api/health-database-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/health-database-query.spec.ts)
  — query-param surface smoke for the `/api/health/database`
  endpoint, mirroring the pattern set by
  [`tests/api/version-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/version-query.spec.ts),
  [`tests/api/feature-existence-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/feature-existence-query.spec.ts),
  and the other `*-query.spec.ts` files. The handler signature is
  `export async function GET()` (no `request` parameter), so the
  spec walks the obvious query-param keys a future contributor
  might add (`refresh`, `force`, `schema`, `database`, `table`,
  `timeout`, `check`, `probe`, `format`, `verbose`, `debug`,
  `locale`, `lang`) plus empty values, repeated keys,
  SQL-injection-shaped values (`%27`, `%22`, `%3B`, `%2D%2D`,
  `'OR'1'='1`, `DROP+TABLE+users`), long values, and bogus typo'd
  keys. Asserts a tighter contract than the other query-smoke
  specs (`< 500`): the route's two valid branches are 200 (healthy)
  and 500 (unhealthy on a missing-database CI environment), and
  every parameterised URL must respond with the **same status as
  the no-arg baseline** — any URL-driven status drift is a real
  regression. Also pins the response envelope shape (`status`
  one-of `'healthy'`/`'unhealthy'`, `database` one-of
  `'connected'`/`'disconnected'`, `timestamp` an ISO-8601 string)
  and the SQL-injection invariant (the route runs a hard-coded
  `db.execute(sql\`SELECT 1 as test\`)` with no parameter binding,
  so injection-shaped values cannot reach the SQL layer).
- `docs/index.md` Added the [Shared TypeScript Presets](https://github.com/ever-works/directory-web-template/blob/develop/docs/plugins/tsconfig-presets.md) entry under the
  "For Contributors & AI Agents" section so the new plugin docs
  page is reachable from the docs index.
- `docs/plugins` Added `eslint-config.md` — the **per-source-file
  reference** for the workspace's shared ESLint flat config preset,
  paired with
  [`packages/eslint-config/nextjs.mjs`](https://github.com/ever-works/directory-web-template/tree/develop/packages/eslint-config/nextjs.mjs)
  and
  [`packages/eslint-config/package.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/eslint-config/package.json),
  the same way `plugin-tsconfigs.md` pairs with the three plugin-package
  `tsconfig.json` files. Where `plugin-tsconfigs.md` covers the
  workspace's TypeScript posture, this page covers the workspace's
  lint posture — the rules, the parser, the ignored globs, and the
  `tsconfigPath` parameter every consumer threads through. The page
  is organised as a per-block walkthrough of the three flat-config
  blocks the factory returns (block 1: `ignores` for `**/node_modules/**`,
  `**/.next/**`, `**/out/**`, `**/build/**`, `**/dist/**`, and
  `**/*.config.{js,ts,mjs}` with each pattern's rationale; block 2:
  JS/TS shared rules for `*.{js,jsx,ts,tsx}` with
  `react-hooks/rules-of-hooks: 'error'` as the load-bearing rule,
  `react-hooks/exhaustive-deps: 'warn'` as the hint level, the
  deliberate `'no-unused-vars': 'off'` to defer to the TS-aware
  variant, and `'no-console': 'off'` to allow the structured-logging
  convention used by the API routes; block 3: TS-only typed rules
  for `*.{ts,tsx}` with the typed `@typescript-eslint/parser`
  threading `parserOptions.project: tsconfigPath`,
  `@typescript-eslint/no-unused-vars: 'warn'` with the `^_` prefix
  convention for `_request`, `catch (_) { ... }`, and head-discarded
  destructuring); the `package.json` field-by-field walkthrough
  (`name: '@ever-works/eslint-config'`, `version: '0.0.0'`,
  `private: true`, `license: AGPL-3.0`, the single sub-path
  `exports."./nextjs"` that forces consumers to import via the full
  path, the four direct dependencies and their workspace-floor
  ranges, the `eslint@^9` peer-dep that pins the flat-config
  format); the consumer table that maps the four current consumers
  (`apps/web`, `apps/docs`, `apps/web-e2e`, plugin packages) onto
  how each calls `nextjsConfig(...)` and the Phase-D plan to wire
  the per-package lint gate scheduled in Spec 002; the failure
  matrix that maps each configuration mistake (`Cannot find module
'@ever-works/eslint-config/nextjs'` from a lost sub-path entry,
  `Parsing error: Cannot find module '@typescript-eslint/parser'`
  from a stale ESLint-8 lockfile, `Configuration for rule
"react-hooks/rules-of-hooks" is invalid` from a stale plugin pin,
  `'_request' is defined but never used` from a re-enabled JS
  `no-unused-vars`, `'console' is not defined` from a flipped
  `no-console`, raised-to-error `react/jsx-key` from a consumer
  override, invalid `tsconfigPath`, `.next/`-build-output linting
  from a removed ignore, tooling-config linting from a removed
  `*.config.*` ignore, eslintrc-syntax-mixed-with-flat-config from
  a regression, `eslint@9.x not found` peer-dep refusal) onto the
  layer that surfaces them; and the public-surface change checklist
  that ties any rule or field change to a `plugin-tsconfigs.md`
  cross-check, an `authoring-a-plugin.md` cross-check, an
  `apps/web/eslint.config.mjs` propagation check, the workspace-root
  `pnpm lint` run, the `pnpm install` lockfile run, a
  `docs/log.md` entry, an open-questions register entry, and the
  Constitution-Check note in the PR description for Article II
  (TypeScript-Only) and Article IX (Test Coverage Bar). Cross-linked
  from `plugin-tsconfigs.md` and from `docs/index.md`.
- `apps/web-e2e` Added `tests/api/version-query.spec.ts` — a
  **query-param surface smoke** for the public version endpoints
  (`/api/version` GET, `/api/version/sync` GET, `/api/version/sync`
  POST). The existing `version.spec.ts` covers the canonical
  no-arg / no-body happy paths; this spec walks ~50 query-string
  variations (`?branch=`, `?refresh=`, `?force=`, `?clone=`,
  `?commit=`, `?sha=`, `?ref=`, `?repository=`, `?format=`,
  `?short=`, `?long=`, `?locale=`, `?lang=`, empty values, repeated
  keys, special-character values that would tempt a future
  shell-quoting bug if a contributor ever swapped `isomorphic-git`
  for a shell `git` invocation, 500-character values, and bogus /
  typo'd unknown keys) and asserts each variation returns a non-5xx
  response, plus per-endpoint envelope-shape assertions
  (`/api/version`: `{commit, message, ...}` always at 200 with
  `commit` always a non-empty string and `message` always a string
  on both the success and the graceful-degrade branches;
  `/api/version/sync` GET: `{syncInProgress, lastSyncTime,
timeSinceLastSyncHuman, uptime, timestamp}` always at 200 with
  `syncInProgress: boolean`, `lastSyncTime: string | null`,
  `uptime: number >= 0`), an "identical with and without bogus
  query parameters" status-code invariant for both GETs, and a
  POST `/api/version/sync` "ignores query parameters" invariant
  that proves the body-only handler does not regress to reading
  the URL. Closes the query-surface gap for these three endpoints
  in [Spec 010](spec/010-e2e-test-coverage/spec.md).
- `docs/plugins` Added `plugin-tsconfigs.md` — the **per-source-file
  reference** for the three byte-identical `tsconfig.json` files in
  the plugin-system packages, paired with
  [`packages/plugin-sdk/tsconfig.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/tsconfig.json),
  [`packages/plugin-runtime/tsconfig.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime/tsconfig.json),
  and
  [`packages/plugin-demo/tsconfig.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-demo/tsconfig.json),
  the same way `sdk-package-manifest.md` pairs with
  `packages/plugin-sdk/package.json`,
  `runtime-package-manifest.md` pairs with
  `packages/plugin-runtime/package.json`, and
  `plugin-demo-package-manifest.md` pairs with
  `packages/plugin-demo/package.json`. Where the package-manifest
  references cover **how** each package is wired into Node's
  resolution algorithm and `package.json#exports`, this page covers
  **how** each package's TypeScript compiler is configured when
  `pnpm tsc --noEmit` runs against its sources. The page is
  organised as a field-by-field reference (`extends:
"@ever-works/tsconfig/base.json"`, `compilerOptions.jsx:
"react-jsx"`, `compilerOptions.types: ["react"]`, `include:
["src/**/*"]`, `exclude: ["node_modules", "dist"]`) with each
  field paired with its purpose, the practical consequence for
  plugin authors, and the change-event-class it implies for any
  third-party plugin author copying this configuration as a
  starting point; the per-flag walkthrough of the inherited base
  config (`target: "ES2017"`, `lib`, `allowJs`, `skipLibCheck`,
  `strict`, `noEmit`, `esModuleInterop`, `module`,
  `moduleResolution: "bundler"`, `resolveJsonModule`,
  `isolatedModules`, `incremental`) that pins each one to a
  documentation impact; the `react-jsx` automatic-runtime
  rationale (the SDK's `plugin.ts` references `React.ComponentType`
  types so the JSX scope must be open even where no JSX is
  authored, runtime's `SlotHost.tsx` and demo's `Header.tsx`
  author literal JSX, all three packages need the same JSX flag);
  the `types: ["react"]` whitelist semantics (transitive
  `@types/node` / `@types/jest` / DOM-polyfill packages cannot
  leak ambient types into the plugin's compilation, plugin
  authors who need `process.env` ambient typing must explicitly
  add `"node"` to their own `types` array); the
  `include`-and-`exclude` rationale that locks the package
  boundary at `src/` and forward-guards against a future `dist/`
  build step (a one-off script in `packages/plugin-demo/scripts/`
  is intentionally outside the type-check guarantee, which is the
  forcing function for "move under `src/`" or "stay outside the
  package's public surface"); the "How the three packages diverge
  from this baseline" matrix that lists every hypothetical
  override (`types: ["react", "node"]` for a Node-aware demo,
  `declaration: true` for IDE pre-warm, `outDir: "./dist"` for a
  future build step, `composite: true` for project-references
  parallelism, `lib: ["esnext"]` for a Node-only plugin, widened
  `include` for a CLI-helper plugin, narrowed `exclude` for
  co-located Vitest tests) with the reason it is and is not
  warranted today; the failure matrix that maps each
  `tsconfig.json` mistake (`JSX element implicitly has type
'any'` from a dropped React-types entry, `Cannot use JSX unless
the '--jsx' flag is provided` from a removed JSX flag,
  `'process' is not defined` from a missing Node-types entry,
  slow `pnpm tsc --noEmit` from an `incremental: false`
  regression, stray `@types/jest` symbols leaking into
  IntelliSense from a removed `types` whitelist,
  `Output file 'dist/index.js' has not been built from source
file 'src/index.ts'` from an accidental `noEmit: false`,
  `Compiler option 'isolatedModules' may not be used with
'composite'` from a `composite: true` override that didn't
  drop `isolatedModules`, the demo's `Cannot find module
'react/jsx-runtime'` symptom of a React-18 lockfile downgrade
  while keeping `jsx: "react-jsx"`, and a downstream plugin's
  silent-strict-mode regression from a missed `extends`
  directive) onto the layer that surfaces them; and the
  public-surface change checklist that ties any option change to
  a matching package-manifest cross-check (changes to JSX runtime
  / React peer-dep range / entry-file extension propagate to
  [`sdk-package-manifest.md`](https://github.com/ever-works/directory-web-template/blob/develop/docs/plugins/sdk-package-manifest.md),
  [`runtime-package-manifest.md`](https://github.com/ever-works/directory-web-template/blob/develop/docs/plugins/runtime-package-manifest.md),
  and
  [`plugin-demo-package-manifest.md`](https://github.com/ever-works/directory-web-template/blob/develop/docs/plugins/plugin-demo-package-manifest.md)
  in the same commit), an
  [`Authoring a Plugin`](https://github.com/ever-works/directory-web-template/blob/develop/docs/plugins/authoring-a-plugin.md)
  cross-check, a `packages.md` cross-check, the dual
  `pnpm tsc --noEmit` runs (workspace-root + per-package, because
  Turborepo's cache may mask a regression that only shows up
  in the per-package run), a `docs/log.md` entry, an
  open-questions register entry, and the Constitution-Check note
  in the PR description for Article II (TypeScript-Only) and
  Article III (Public-Surface Stability). Cross-linked from the
  three package-manifest references' Cross-references sections
  and from `docs/index.md`.
- `apps/web-e2e` Added `tests/api/feature-existence-query.spec.ts`
  — a **query-param surface smoke** for the four public
  feature-existence endpoints (`/api/categories/exists`,
  `/api/collections/exists`, `/api/surveys/exists`, and
  `/api/items/export/settings`). The existing
  `feature-existence.spec.ts` covers the no-arg / single-canonical-arg
  happy path; this spec walks ~80 query-string variations
  (`?locale=`, `?type=`, `?limit=`, `?offset=`, `?page=`,
  `?pageSize=`, `?q=`, `?search=`, `?filter=`, `?prefix=`,
  `?sort=`, `?order=`, `?direction=`, `?lang=`, empty values,
  repeated keys, special-character values, 500-character values,
  and bogus / typo'd unknown keys across all four endpoints) and
  asserts each variation returns a non-5xx response, plus a
  per-endpoint envelope-shape assertion (categories: `{exists,
count}` always at 200; collections: same envelope at 200 or 500
  with the optional `error` string; surveys: `{exists}` always at
  200; items/export/settings: `{export_enabled}` always at 200),
  plus an "identical with and without bogus query parameters"
  invariant for the three endpoints whose handlers do not read
  the request URL. Closes the query-surface gap for these four
  endpoints in [Spec 010](spec/010-e2e-test-coverage/spec.md).
- `docs/plugins` Added `plugin-demo-package-manifest.md` — the
  **per-source-file reference** for the demo plugin package
  manifest that pairs with
  [`packages/plugin-demo/package.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-demo/package.json)
  the same way `sdk-package-manifest.md` pairs with
  `packages/plugin-sdk/package.json`,
  `runtime-package-manifest.md` pairs with
  `packages/plugin-runtime/package.json`, and `plugin-demo.md`
  pairs with the bundled reference plugin's TypeScript sources
  under `packages/plugin-demo/src/`. Where the
  [Reference Plugin](https://github.com/ever-works/directory-web-template/blob/develop/docs/plugins/plugin-demo.md)
  page documents the three TypeScript files (`config.ts`,
  `Header.tsx`, `index.tsx`), this page documents the
  **package-level contract** — the `package.json` fields that
  decide how the demo plugin is wired into the workspace and how
  a downstream plugin author must wire their own package the
  same way. The page is organised as a field-by-field reference
  (`name`, `version`, `description`, `license`, `private`,
  `type: "module"`, `sideEffects: false`, `main`, `types`,
  `exports."."` (single entry pointing at `./src/index.tsx`
  because the entry composes JSX), `files`, `scripts.typecheck`
  / `scripts.lint`, `dependencies.@ever-works/plugin-sdk`
  (workspace), `dependencies.zod`, `peerDependencies.react`
  (required, **no** `peerDependenciesMeta` because the demo
  always ships a slot component), and the `devDependencies`
  set) with each field paired with its purpose, why-it-matters
  note, and the change-event-class it implies for downstream
  plugin authors who copy this manifest as a starting point;
  the deliberately-empty sub-path map (no narrowed sub-paths
  because the demo is a leaf consumer with a single `default`
  export — narrowing would imply public structure inside
  `Header.tsx` / `config.ts` which the demo intentionally
  hides); the `manifest.version` vs. `package.json#version`
  drift contract (the manifest version gates `templateRange`;
  the package version is workspace-graph metadata only); the
  `.tsx`-vs-`.ts`-extension-on-the-entry rationale (the entry
  composes JSX through `Header.tsx`, so `.tsx` opens the JSX
  scope under `jsx: "preserve"`); a failure matrix that maps
  each demo-level manifestation (non-public sub-path import
  like `@ever-works/plugin-demo/Header`, CJS-without-`import()`,
  dropped `sideEffects` flag, non-`workspace:*` SDK specifier,
  `.tsx`-flipped-to-`.ts`, React-18-typings, Zod-3-schemas,
  `manifest.version`/`package.json#version` drift,
  `templateRange` widened beyond SDK `version`, downstream-author
  -keeps-`@ever-works`-scope, downstream-author-keeps-`private:
true`-while-publishing, downstream-author-keeps-required-React
  -peer-on-non-React-plugin) onto the layer that surfaces it;
  and a public-surface change checklist that ties any field
  change to a cross-check against `plugin-demo.md`,
  `sdk-package-manifest.md`, `runtime-package-manifest.md`
  (the three manifests move in lock-step on `version`, Zod
  range, React peer range, and `sideEffects` flag),
  `packages.md`, an `apps/web/package.json` lockfile
  cross-check, a `docs/log.md` entry, an open-questions
  register entry, the `pnpm tsc --noEmit` and Playwright
  smoke-spec verification step, and the Constitution-Check
  note in the PR description for Article I (Plugin-First) and
  Article III (Public-Surface Stability). Cross-linked from
  `docs/index.md` Plugins section.
- `apps/web-e2e` Added `tests/api/location-listing-query.spec.ts`
  — a Playwright API smoke spec that closes the **query-param
  surface** coverage gap for the public no-arg location-listing
  endpoints
  [`/api/location/cities`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/location/cities/route.ts)
  and
  [`/api/location/countries`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/location/countries/route.ts).
  The existing `location.spec.ts` covers the no-arg happy
  path for both endpoints; the new spec walks the
  **query-param surface** so a regression that introduces a
  typo'd `request.nextUrl.searchParams.get(...)` call (which
  a future filter-by-country-prefix or filter-by-locale
  change might tempt a future contributor into adding) is
  caught immediately as a non-200 / non-404 / 5xx response.
  Both routes are intentionally no-arg — the `GET()` function
  signature is `export async function GET()` — so the route's
  contract is that **any** query string is silently ignored,
  and the spec enumerates every plausible-future-typed key
  family (`?city=` / `?country=` typo'd from
  `/api/location/coordinates`; `?prefix=` / `?q=` /
  `?search=` / `?filter=` typed for type-ahead search;
  `?limit=` / `?offset=` / `?page=` / `?pageSize=` typed
  for pagination; `?sort=` / `?order=` / `?direction=` typed
  for sort wiring; `?locale=` / `?lang=` typed for i18n;
  empty-value forms; repeated keys; special-character
  values like `%25`/`%2F`/`%5C`/`%27` that would tempt a
  future regex / LIKE-prefix wiring; long values
  `'x'.repeat(500)`; bogus / typo'd keys). The assertion
  contract is intentionally narrow — every URL must respond
  with a `<500` status, and the no-arg envelope must be
  either `{ success: false, error: 'Location features are
disabled' }` (404 branch when the feature gate is off,
  the most-likely branch in local dev) or `{ success: true,
data: string[] }` (200 branch when the feature is on
  and the data layer succeeds). The two
  `responds identically with and without bogus query
parameters` assertions pin the contract that the route
  never reads the request URL, so the status code with any
  query string must match the no-arg status code exactly.
- `docs/plugins` Added `runtime-package-manifest.md` — the
  **per-source-file reference** for the runtime package manifest
  that pairs with
  [`packages/plugin-runtime/package.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime/package.json)
  the same way `sdk-package-manifest.md` pairs with
  `packages/plugin-sdk/package.json`,
  `runtime-public-surface.md` pairs with
  `packages/plugin-runtime/src/index.ts`, and the per-source-file
  reference set under `docs/plugins/` already documents every
  TypeScript file in `packages/plugin-sdk/src/` and
  `packages/plugin-runtime/src/`. Where the
  [Runtime Public Surface Reference](https://github.com/ever-works/directory-web-template/blob/develop/docs/plugins/runtime-public-surface.md)
  documents the TypeScript barrel, this page documents the
  **package-level contract** — the `package.json` fields that
  decide which sub-paths are importable, how React is reached
  (peer dependency, **required** — unlike the SDK where it is
  optional), how the SDK is reached (workspace dependency via
  `workspace:*`), how Zod is reached (runtime dependency,
  required), and how bundlers tree-shake the runtime's React-aware
  `<SlotHost />` re-export off server bundles when the host imports
  through the narrowed `./registry` / `./loader` / `./testing`
  sub-paths. The page is organised as a field-by-field reference
  (`name`, `version`, `description`, `license`, `private`,
  `type: "module"`, `sideEffects: false`, `main`, `types`,
  `exports."."` / `./registry` / `./SlotHost` / `./loader` /
  `./testing`, `files`, `scripts.typecheck` / `scripts.lint`,
  `dependencies.@ever-works/plugin-sdk` (workspace),
  `dependencies.zod`, `peerDependencies.react` (required, **no**
  `peerDependenciesMeta`), and the `devDependencies` set) with
  each field paired with its purpose, why-it-matters note, and the
  change-event-class it implies for host-app authors; a sub-path
  map that locks the barrel-vs-narrowed contract (the four
  narrowed sub-paths are a strict subset of the barrel and resolve
  to the same module instance via Node's path-keyed module cache,
  and each one isolates a different concern — `./registry` keeps
  React out of server-only callers, `./loader` is the boot
  pipeline, `./SlotHost` makes the React boundary explicit,
  `./testing` keeps JSDOM out of server-side unit tests); a
  failure matrix that maps each manifest-level mistake (non-public
  sub-path import, server action importing `PluginRegistry` from
  the barrel instead of `./registry`, lowercased `slothost`,
  CJS-without-`import()`, dropped `sideEffects` flag,
  non-`workspace:*` specifier, runtime-version-diverges-from-SDK-version,
  host-installs-no-React, Zod-3-schema, public-name-without-`exports`-entry,
  file-without-barrel-re-export) onto the layer that surfaces it;
  and a public-surface change checklist that ties any field change
  to a cross-check against `runtime-public-surface.md`,
  `sdk-package-manifest.md`, `packages.md`, an
  `apps/web/package.json` peer-range / Zod-major propagation
  check, a `docs/log.md` entry, an open-questions register entry,
  the `pnpm tsc --noEmit` and Playwright smoke-spec verification
  step, and the Constitution-Check note in the PR description for
  Article I (Plugin-First) and Article III (Public-Surface
  Stability). Cross-linked from `docs/index.md` Plugins section.
- `apps/web-e2e` Added `tests/api/location-search-query.spec.ts`
  — a Playwright API smoke spec that closes the **query-param
  surface detail** coverage gap for the public
  `/api/location/search` endpoint served by
  [`apps/web/app/api/location/search/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/location/search/route.ts).
  The existing `location.spec.ts` covers the no-params 400, the
  single-param `city` / `country` / radius branches, and an
  invalid-coordinates 400; the new spec walks the full **query-
  param surface detail** (the radius branch's `parseFloat`
  finite-number checks, the `parseInt(radius, 10)` default-50
  fallback, the `radius=0` / negative / `NaN` 400, the `near_lat=NaN`
  / `near_lng=NaN` / `infinity` 400, the only-one-of-the-pair
  fall-through to city / country, the `if (city)` / `if (country)`
  truthy guards, the percent-encoded UTF-8 city / country values,
  the whitespace-only city / country values that pass the truthy
  check, the branch-priority order radius > city > country, the
  unknown / typo'd parameter names that hit the no-params 400, and
  the repeated query keys that take the first value via
  `searchParams.get(name)`) so a regression in any of those
  branches is caught explicitly. The assertion contract is
  intentionally narrow — every URL must respond with a `<500`
  status, the body must be valid JSON when present, and the JSON
  envelope must contain at least one of `success` / `error` /
  `data` keys; when `data` is present, `data.slugs` must be an
  array and `data.distances` (when present) must be a non-array
  object. 4xx-other and 5xx are never allowed because the route
  never validates beyond what the matrix above describes.
- `docs/plugins` Added `sdk-package-manifest.md` — the
  **per-source-file reference** for the SDK package manifest that
  pairs with
  [`packages/plugin-sdk/package.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/package.json)
  the same way `sdk-public-surface.md` pairs with
  `packages/plugin-sdk/src/index.ts`,
  `runtime-public-surface.md` pairs with
  `packages/plugin-runtime/src/index.ts`, `manifest.md` pairs with
  `manifest.ts`, `capabilities.md` pairs with `capabilities.ts`,
  `slots.md` pairs with `slots.ts`, `providers.md` pairs with
  `providers.ts`, `plugin.md` pairs with `plugin.ts`, `loader.md`
  pairs with `loader.ts`, `registry.md` pairs with `registry.ts`,
  `slot-host.md` pairs with `SlotHost.tsx`, `testing.md` pairs
  with `testing.ts`, and `plugin-demo.md` pairs with the bundled
  reference plugin under `packages/plugin-demo/src/`. Where the
  SDK public-surface page documents the TypeScript barrel, this
  page documents the **package-level contract** — the
  `package.json` fields that decide which sub-paths are
  importable, how React is reached (peer dependency, optional),
  how Zod is reached (runtime dependency, required), and how
  bundlers tree-shake the SDK's type-only exports down to nothing.
  The page is organised as a field-by-field reference (`name`,
  `version`, `license`, `private`, `type: "module"`,
  `sideEffects: false`, `main`, `types`,
  `exports."."` / `./capabilities` / `./slots`, `files`,
  `scripts.typecheck` / `scripts.lint`, `dependencies.zod`,
  `peerDependencies.react` with `peerDependenciesMeta.react.optional`,
  and the `devDependencies` set) with each field paired with its
  purpose, why-it-matters note, and the change-event-class it
  implies for plugin authors; a sub-path map that locks the
  barrel-vs-narrowed contract (the two narrowed sub-paths are a
  strict subset of the barrel and resolve to the same module
  instance via Node's path-keyed module cache, and `manifest.ts`
  / `providers.ts` / `plugin.ts` / `index.ts` deliberately have
  no narrowed sub-path because their exports are types-only or
  single-author-facing-factory); a failure matrix that maps each
  manifest-level mistake (non-public sub-path import,
  CJS-without-`import()`, dropped `sideEffects` flag,
  non-`workspace:*` specifier, React-18-typings, Zod-3-schema,
  public-name-without-`exports`-entry, file-without-barrel-re-export,
  breaking `version` bump) onto the layer that surfaces it; and a
  public-surface change checklist that ties any field change to a
  cross-check against `sdk-public-surface.md` and `packages.md`,
  an `apps/web/package.json` peer-range / Zod-major propagation
  check, a `docs/log.md` entry, an open-questions register entry,
  the `pnpm tsc --noEmit` and Playwright smoke-spec verification
  step, and the Constitution-Check note in the PR description for
  Article I (Plugin-First) and Article III (Public-Surface
  Stability). Cross-linked from `docs/index.md` Plugins section.
- `apps/web-e2e` Added `tests/api/location-coordinates-query.spec.ts`
  — a Playwright API smoke spec that closes a coverage gap for the
  public `/api/location/coordinates` endpoint served by
  [`apps/web/app/api/location/coordinates/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/location/coordinates/route.ts).
  The existing `location-coordinates.spec.ts` covers the
  no-query-param happy path and two basic filter cases; the new
  spec walks the **query-param surface** (the `searchParams.get('city')`
  / `searchParams.get('country')` reads, the
  `city.trim().toLowerCase()` normalisation against
  `entry.cityNormalized` / `entry.countryNormalized`, the
  `if (city)` / `if (country)` truthy guards, the
  `!entry.isRemote` filter, the `Number(entry.latitude)` /
  `Number(entry.longitude)` coercion, the 404-on-feature-disabled
  short-circuit, and the catch-and-500 fallback) so a regression
  in any of those branches is caught explicitly. The spec
  enumerates well-formed values (`Paris`, `paris`, `PARIS`,
  `New%20York`, percent-encoded UTF-8 like `S%C3%A3o%20Paulo` and
  `Bogot%C3%A1`), whitespace-only values that pass the truthy
  check but normalise to an empty string (single space, double
  space, `%09` tab, `%0A` newline), missing-key cases, and the
  combined `city`+`country` shape. The assertion contract is
  intentionally narrow — every URL must respond with a JSON body
  matching `{ success: true, data: [] | array }` (200 branch,
  feature enabled) or `{ success: false, error: string }` (404
  branch, feature disabled). 4xx-other and 5xx are never allowed
  because the route never validates the value and the
  data-layer call must not crash before the response renderer.
- `docs/plugins` Added `runtime-public-surface.md` — the
  **per-source-file reference** for the runtime barrel that pairs
  with [`packages/plugin-runtime/src/index.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime/src/index.ts)
  the same way `sdk-public-surface.md` pairs with
  `packages/plugin-sdk/src/index.ts`, `manifest.md` pairs with
  `manifest.ts`, `capabilities.md` pairs with `capabilities.ts`,
  `slots.md` pairs with `slots.ts`, `providers.md` pairs with
  `providers.ts`, `plugin.md` pairs with `plugin.ts`, `loader.md`
  pairs with `loader.ts`, `registry.md` pairs with `registry.ts`,
  `slot-host.md` pairs with `SlotHost.tsx`, `testing.md` pairs
  with `testing.ts`, and `plugin-demo.md` pairs with the bundled
  reference plugin under `packages/plugin-demo/src/`. The page is
  organised as a per-line walkthrough of the 15-line barrel: the
  JSDoc preamble's three pinned invariants (React-aware-only-in-`SlotHost`
  so a server action that imports `PluginRegistry` does not drag
  React into the server graph and the unit-test harness that
  imports `createTestRegistry` does not need a JSDOM environment;
  owns-registry-loader-host so anything beyond
  **register / enable / disable / load / render** belongs in a
  host-app module that wraps the registry rather than in this
  package; cross-link to `docs/architecture/plugin-system.md` so
  the architecture is the rationale and the barrel is the
  contract); line 9 the `PluginRegistry` value re-export and why
  it must cross the value boundary (an `export type` would erase
  the class at compile time and `new PluginRegistry({…})` would
  fail at runtime); line 10 the `loadPlugins` and
  `mergeConfigSources` value re-exports plus the explicit reason
  `mergeConfigSources` is a value re-export rather than a
  runtime-only helper (so a host app that builds config sources
  in a non-standard way like an admin REST handler that reads
  from a key-vault rather than a Postgres row can call
  `mergeConfigSources` directly to enforce the precedence
  contract without going through `loadPlugins`, removing the
  temptation to reimplement the merge in the host app and
  accidentally reverse the precedence order); line 11 the
  `PluginConfigSources` and `LoadPluginsResult` type-only
  re-exports plus the never-throws-for-plugin-level-config-failures
  invariant on `LoadPluginsResult` (every rejection lands in
  `result.rejected` so a host app can render a per-plugin admin
  UI that distinguishes "loaded successfully" from "loaded but
  rejected" without wrapping the loader call in a try / catch);
  line 12 the `SlotHost` value re-export and the Fragment-only
  zero-DOM output; line 13 the `SlotHostProps` type-only
  re-export with the `slotId` constraint that catches typos at
  the call site; and line 14 the `createTestRegistry` value
  re-export with the explicit no-`export type` companion line
  because the helper's options object (`{ plugins: DirectoryPlugin[] }`)
  is an inline anonymous type and test consumers that want to
  refer to it by name should declare a local alias rather than
  expand the public surface here. The page also documents the
  `package.json#exports` sub-path map (`.`, `./registry`,
  `./SlotHost`, `./loader`, `./testing`) and the rationale for
  keeping the four narrowed sub-paths so a server action can
  import `PluginRegistry` from `@ever-works/plugin-runtime/registry`
  without dragging React into the server bundle, a test file
  can import `createTestRegistry` from
  `@ever-works/plugin-runtime/testing` without spinning up a
  JSDOM environment, and a host layout can import `<SlotHost />`
  from `@ever-works/plugin-runtime/SlotHost` to keep the React
  boundary explicit in bundle reports; the value-vs-type contract
  that locks moving a name across the `export { ... }` /
  `export type { ... }` boundary as a breaking change and points
  at `@typescript-eslint/consistent-type-exports` as the lint
  rule the runtime turns on alongside the SDK; the failure matrix
  that maps barrel-level mistakes (`Cannot find module '@ever-works/plugin-runtime/internal'`
  from a non-public sub-path import,
  `'LoadPluginsResult' is not exported` from a value-vs-type
  mis-import, `PluginRegistry is not a constructor` from a
  bundler tree-shaking the registry value re-export,
  `<SlotHost />` rendering an empty Fragment when the host
  layout passes a different registry instance than the one
  `loadPlugins` populated, plugin admin UI showing the plugin
  disabled when the host app stored `LoadPluginsResult.registered`
  but ignored enable state from the registry, full-runtime-pulled-in
  regression when the `sideEffects: false` flag is dropped from
  `package.json`, React leaking into a server bundle when a host
  action imports from the barrel instead of the narrowed
  `./registry` sub-path) onto the layer that catches it (Node
  module resolution, TypeScript with `verbatimModuleSyntax`, the
  consumer call site, the `<SlotHost />` runtime, the admin
  dashboard, the bundle analyzer, the public page bundle-size
  budget under Spec 018, the server action bundle-size budget);
  and the public-surface change checklist that ties any addition
  / removal back to Spec Kit, the matching per-source reference
  page, the `docs/log.md` entry, the `pnpm tsc --noEmit`
  verification step, and Article VIII (No removal) for any name
  that needs to leave the barrel. Cross-link from
  [`docs/index.md`](./index.md) and from
  [`docs/plugins/packages.md`](./plugins/packages.md) so the new
  doc is discoverable from both the docs index and the package
  overview alongside the SDK / runtime / demo source links.
- `e2e/api` Added `items-engagement-query.spec.ts` — the
  **public query-param surface** smoke for
  [`GET /api/items/engagement`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/items/engagement/route.ts)
  that pairs with the four obvious branches already in
  [`items-engagement-and-favorites.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/items-engagement-and-favorites.spec.ts)
  the same way `sponsor-ads-public.spec.ts` pairs with the
  no-arg coverage already in `feature-existence.spec.ts`,
  `featured-items-query.spec.ts` pairs with the
  `featured-items` no-arg case in `items.spec.ts`,
  `items-export-query.spec.ts` pairs with the `items-export`
  no-arg case in `discovery.spec.ts`, and
  `items-popularity-scores.spec.ts` pairs with the
  `popularity-scores` no-arg case in `discovery.spec.ts`. The
  spec parametrises the route's single `slugs` required
  comma-separated query parameter (`split(',').map(s => s.trim()).filter(Boolean)`-parsed
  with no upper limit beyond the 200-entry abuse-prevention
  ceiling) across the missing-param branch (returns `400` +
  `{ error: 'Missing required parameter: slugs' }` from the
  `searchParams.get('slugs') === null` check), the present-but-empty /
  whitespace-only / comma-only branches (`?slugs=`, `?slugs=%20`,
  `?slugs=,,,` — all produce an empty parsed list and return
  `200` + `{ metrics: {} }` via the `slugs.length === 0`
  guard), the single-known-or-unknown-slug case, the
  multi-slug happy path, the surrounding / interior whitespace
  case (the route trims each entry and drops trimmed-empty
  entries via `filter(Boolean)`), the URL-encoded slug-content
  case (`%2F`, `%2B`, `%25`, `%26` are passed through verbatim
  to the data layer), the at-the-ceiling 200-slug case, the
  one-above-the-ceiling 201-slug case (the off-by-one boundary
  on the `slugs.length > 200` guard that the existing 250-slug
  case in `items-engagement-and-favorites.spec.ts` doesn't pin
  explicitly), the extra-unknown-query-params case (the route
  only reads `slugs` from `searchParams`), and the repeated
  `slugs` keys case (`searchParams.get` returns the **first**
  occurrence; the rest are silently ignored — the route does
  not call `searchParams.getAll`). Status `< 500` is the only
  asserted contract for the parametrised cases — the route has
  three distinct success branches that all legitimately return
  `200 OK` with different payloads (the
  `checkDatabaseAvailability()` short-circuit returning
  `{ metrics: {} }`, the happy-path
  `getEngagementMetricsPerItem(slugs)` query with the
  `Map`-to-plain-object conversion, and the `try / catch`
  empty-fallback that handles internal errors by warning in dev
  and still returning `{ metrics: {} }`), and asserting on the
  body would pin the spec to a single branch and break under
  the others. Two extra small assertions pin the deterministic
  branches: the no-arg case must produce a 4xx with the
  missing-param envelope (or the DB-fallback `{ metrics: {} }`
  short-circuit if a future refactor swaps the order — the
  assertion is permissive on which envelope but strict on the
  4xx-or-200 bracket so the JSON shape stays valid), and the
  two-slug happy path must always produce a 200 with a
  `metrics` plain-object envelope (not array, not null) so a
  future change that turned the route into a 4xx / 5xx response
  on a well-formed request would be caught explicitly.
- `docs/plugins` Added `sdk-public-surface.md` — the
  **per-source-file reference** for the SDK barrel that pairs with
  [`packages/plugin-sdk/src/index.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/src/index.ts)
  the same way `manifest.md` pairs with `manifest.ts`,
  `capabilities.md` pairs with `capabilities.ts`, `slots.md` pairs
  with `slots.ts`, `providers.md` pairs with `providers.ts`,
  `plugin.md` pairs with `plugin.ts`, `loader.md` pairs with
  `loader.ts`, `registry.md` pairs with `registry.ts`,
  `slot-host.md` pairs with `SlotHost.tsx`, `testing.md` pairs with
  `testing.ts`, and `plugin-demo.md` pairs with the bundled
  reference plugin under `packages/plugin-demo/src/`. The page is
  organised as a per-line walkthrough of the 40-line barrel: the
  JSDoc preamble's three pinned invariants (framework-agnostic, the
  `react` peer-dependency-not-direct-dep stance, and the
  cross-link to `docs/architecture/plugin-system.md`); lines 11-12
  the capability re-exports (`CAPABILITIES` and `isCapability` as
  values, `Capability` as a type-only re-export with the
  value-vs-type split that `isolatedModules` enforces); lines
  14-15 the slot re-exports with the same shape; line 17 the
  manifest type re-exports (`PluginManifest<C>` and
  `PluginConfig<C>`); lines 19-30 the nine concrete capability
  provider interfaces and the `CapabilityProviderMap` mapped type
  re-exports; line 32 the **only** value re-export from `plugin.ts`
  (`defineDirectoryPlugin`) and the inference path the factory's
  `<C extends z.ZodTypeAny>` signature creates; lines 33-39 the
  five plugin-shape type re-exports (`DirectoryPlugin<C>`,
  `PluginContext<TConfig>`, `SlotComponentProps<TConfig>`,
  `PluginProviders`, `PluginSlots<TConfig>`). The page also
  documents the `package.json#exports` sub-path map (`.`,
  `./capabilities`, `./slots`) and the deliberate decision to keep
  `manifest`, `providers`, `plugin`, `loader`, `registry`, and
  `SlotHost` reachable only through the barrel (so adding a new
  capability or provider interface does not implicitly create a
  public sub-path); the value-vs-type contract that locks moving a
  name across the `export { ... }` / `export type { ... }`
  boundary as a breaking change and points at
  `@typescript-eslint/consistent-type-exports` as the lint rule
  the SDK turns on once the surface is stable; the failure matrix
  that maps barrel-level mistakes (`Cannot find module
'@ever-works/plugin-sdk/manifest'` from a non-public sub-path
  import, `'Capability' is not exported` from a value-vs-type
  mis-import, `defineDirectoryPlugin is not a function` from a
  bundler tree-shaking a value re-export, `ctx.config` typing as
  `unknown` when an author skips the factory, new capability not
  appearing in admin UI when the id is missing from the
  `CAPABILITIES` tuple, new manifest field silently ignored when
  the barrel re-export is missing, full-SDK-pulled-in regression
  when the `sideEffects: false` flag is dropped from
  `package.json`) onto the layer that catches it (Node module
  resolution, TypeScript with `verbatimModuleSyntax`, the consumer
  call site, the admin dashboard, the bundle analyzer, the public
  page bundle-size budget under Spec 018); and the public-surface
  change checklist that ties any addition / removal back to Spec
  Kit, the matching per-source reference page, the `docs/log.md`
  entry, the `pnpm tsc --noEmit` verification step, and Article
  VIII (No removal) for any name that needs to leave the barrel.
  Cross-link from [`docs/index.md`](./index.md) and from
  [`docs/plugins/packages.md`](./plugins/packages.md) so the new
  doc is discoverable from both the docs index and the package
  overview alongside the SDK / runtime / demo source links.
- `e2e/api` Added `sponsor-ads-public.spec.ts` — the
  **public query-param surface** smoke for
  [`GET /api/sponsor-ads`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/sponsor-ads/route.ts)
  that pairs with the no-arg coverage already in
  [`feature-existence.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/feature-existence.spec.ts)
  the same way `featured-items-query.spec.ts` pairs with the
  `featured-items` no-arg case in `items.spec.ts`,
  `items-export-query.spec.ts` pairs with the `items-export`
  no-arg case in `discovery.spec.ts`, and
  `items-popularity-scores.spec.ts` pairs with the
  `popularity-scores` no-arg case in `discovery.spec.ts`. The spec
  parametrises the route's single `limit` query parameter
  (`Number(...)`-ed with default `10`,
  `Number.isFinite ? Math.min(Math.max(1, Math.floor(value)), 50)
: 10`-clamped) across the [1, 50] valid range, beyond the upper
  clamp (`51`, `999`, `10000`), below the lower clamp (`0`, `-5`,
  `-1`), non-numeric / `NaN` / `Infinity` / `-Infinity` (which
  exercise the `Number.isFinite` fallback path), float (truncated
  via `Math.floor` before clamping), leading-whitespace / `+`
  sign, extra unknown query params (silently ignored), and
  repeated `limit` keys (only the first occurrence is read by
  `searchParams.get`). Status `< 500` is the only asserted
  contract — the route has three distinct success branches that
  all legitimately return `200 OK` with different payloads (the
  `checkDatabaseAvailability()` short-circuit returning
  `{ success: true, data: [] }`, the happy-path
  `sponsorAdService.getActiveSponsorAdsWithItems` query, and the
  `try / catch` empty-list fallback that handles internal errors
  by logging in development and still returning
  `{ success: true, data: [] }`), and asserting on the body would
  pin the spec to a single branch and break under the others. A
  separate small assertion on the no-arg path verifies that the
  JSON envelope shape (`{ success: true, data: [...] }` with
  `data` an array) is preserved across all three branches so a
  future change that turned the route into a 4xx / 5xx response
  would be caught explicitly.
- `docs/plugins` Added `plugin-demo.md` — the **per-source-file
  reference** for the bundled reference / demo plugin that pairs
  with [`packages/plugin-demo/src/index.tsx`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-demo/src/index.tsx),
  [`packages/plugin-demo/src/config.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-demo/src/config.ts),
  and [`packages/plugin-demo/src/Header.tsx`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-demo/src/Header.tsx)
  the same way `manifest.md` pairs with `manifest.ts`,
  `capabilities.md` pairs with `capabilities.ts`, `slots.md` pairs
  with `slots.ts`, `providers.md` pairs with `providers.ts`,
  `plugin.md` pairs with `plugin.ts`, `loader.md` pairs with
  `loader.ts`, `registry.md` pairs with `registry.ts`,
  `slot-host.md` pairs with `SlotHost.tsx`, and `testing.md` pairs
  with `testing.ts`. The page documents the at-a-glance manifest
  summary (name `'demo'`, `templateRange '>=0.1 <1.0'`,
  `'ui-slot'` capability, `'header.right'` slot, `defaultEnabled:
true`, `adminToggleable: true`); the file map that ties each of
  the three source files to the SDK surface they consume; the
  per-line walk-through of `ConfigSchema` and `DemoConfig` (the
  `.default(true)` / `.default('Demo plugin loaded')` calls that
  make `z.infer<typeof ConfigSchema>` non-optional and let the
  loader parse cleanly with **no** config sources at all); the
  `DemoHeaderBadge` props / render contract / disabled-config
  short-circuit (the `if (!ctx.config.enabled) return null;` line
  the admin enable / disable flow exercises through merged config
  sources rather than registry-level unregistration) and the
  stable `data-plugin="demo"` / `data-testid="demo-plugin-badge"`
  test hooks; the `defineDirectoryPlugin` invocation broken down
  by manifest field and slot binding with the type-inference path
  that ties `ConfigSchema` to `SlotComponentProps<DemoConfig>` so
  the slot component cannot drift out of sync with the schema;
  the three call sites the demo plugin participates in (loader
  Zod parse + register, registry key under `'demo'`, slot host
  render via `<SlotHost slotId="header.right" />`); the failure
  matrix that maps demo-plugin manifestations onto the
  loader / registry / slot-host failure surfaces (Zod-rejected
  `enabled: 'yes'` / `greeting: 42`, `templateRange` mismatch,
  admin override flipping `enabled` post-boot, duplicate-name
  throw); the replace-the-demo-plugin recipe that exercises the
  slot ordering guarantee, the admin toggle, and the
  `defaultEnabled: false` lever without removing the reference
  package from tree (per the no-removal rule); and the evolution
  checklist that pairs every source-file change with the matching
  SDK reference page and `docs/log.md` entry. Cross-link from
  [`docs/index.md`](./index.md) so the new doc is discoverable
  from the docs index alongside the SDK / runtime / demo package
  links it complements.
- `e2e/api` Added `featured-items-query.spec.ts` — the
  **query-param surface** smoke for the public
  [`GET /api/featured-items`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/featured-items/route.ts)
  endpoint that pairs with the no-arg coverage already in
  [`items.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/items.spec.ts)
  the same way `items-export-query.spec.ts` pairs with the
  `items-export` no-arg case in `discovery.spec.ts` and
  `items-popularity-scores.spec.ts` pairs with the
  `popularity-scores` no-arg case in `discovery.spec.ts`. The
  spec parametrises the route's two query parameters: the
  `limit` parameter (`Number.parseInt`-ed with default `6`,
  `Math.min(Math.max(value, 1), 50)`-clamped, `Number.isFinite`
  fallback to default for `NaN`) across the [1, 50] valid range,
  beyond the upper clamp (`51`, `999`, `10000`), below the lower
  clamp (`0`, `-5`), non-numeric / empty (`abc`, `NaN`, empty
  string), float (`6.5`, `49.9`), and leading-whitespace / `+`
  sign (`%2010`, `%2B10`) cases that exercise every branch of
  `Number.parseInt` + clamp + finiteness fallback; and the
  `includeExpired` parameter (strict `=== 'true'` check) across
  the literal `'true'` flip and every other value that keeps the
  default-on path (`'false'`, `'1'`, `'0'`, empty, `'TRUE'`).
  Combined `limit` + `includeExpired` cases verify the two
  parameters stay independent. Status `< 500` is the only
  asserted contract — the route has two distinct success
  branches (DB-available query vs.
  `checkDatabaseAvailability()`-short-circuit /
  `getTenantId() === null`-short-circuit, both legitimately
  returning `200 OK` with different payloads) plus a
  catch-and-empty fallback, and asserting on the body would
  pin the spec to a single branch and break under the others.

- `docs/plugins` Added `providers.md` — the parallel **per-export
  capability-provider reference** that pairs with [`packages/plugin-sdk/src/providers.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/src/providers.ts)
  exactly the way `manifest.md` pairs with `manifest.ts`,
  `capabilities.md` pairs with `capabilities.ts`, `slots.md` pairs
  with `slots.ts`, `loader.md` pairs with `loader.ts`, `registry.md`
  pairs with `registry.ts`, `slot-host.md` pairs with `SlotHost.tsx`,
  `testing.md` pairs with `testing.ts`, and `plugin.md` pairs with
  `plugin.ts`. The page is one section per public export of
  `providers.ts`: each of the nine concrete provider interfaces
  ([`AuthProvider`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/providers.md#authprovider),
  [`PaymentProvider`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/providers.md#paymentprovider),
  [`AnalyticsProvider`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/providers.md#analyticsprovider),
  [`SearchProvider`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/providers.md#searchprovider),
  [`ContentSource`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/providers.md#contentsource),
  [`MapsProvider`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/providers.md#mapsprovider),
  [`NewsletterProvider`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/providers.md#newsletterprovider),
  [`NotificationsProvider`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/providers.md#notificationsprovider),
  [`AIProvider`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/providers.md#aiprovider))
  with one sub-section per member documenting its type, nullability,
  and per-member type-system notes (the `(string & {})`
  literal-with-fallback trick on `PaymentProvider.id` that keeps the
  union open without giving up autocomplete on the three built-in
  literals; the `Promise<unknown[]>` widening contract on
  `SearchProvider.search` that defers `Item`-shape assertion to the
  host; the `Promise<unknown | undefined>` absent-vs-error
  distinction on `ContentSource.getItem` where `unknown` is success,
  `undefined` is 404, and a thrown error is the third case; the
  `void | Promise<void>` sync-or-async pattern on optional hooks
  that lets a synchronous backend declare without an `async`
  wrapper; the `{ ok; reason? }` result envelope on
  `NewsletterProvider` that surfaces provider-specific failures as
  data so the host renders them without a try/catch on the request
  path; the `markRead(string[])` batch-baked-into-the-type contract
  on `NotificationsProvider`; the deliberately-minimal v1
  `AIProvider.complete` shape that a future
  `AIProvider<TStream extends boolean = false>` extension can grow
  without breaking), the [`CapabilityProviderMap`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/providers.md#capabilityprovidermap)
  mapped type that binds every member of `Capability` to its
  provider interface and types
  [`PluginRegistry.get<C>`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/registry.md#getcapability--single-provider-lookup)
  /
  [`list<C>`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/registry.md#listcapability--enumerate-providers-by-capability)
  / [`PluginProviders`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/plugin.md#pluginproviders)
  generically including the `'ui-slot' = never` lockout that turns
  any `providers: { 'ui-slot': anything }` attempt into a
  TypeScript compile error and the `[K in Capability]?: K extends keyof CapabilityProviderMap ? CapabilityProviderMap[K] : never;`
  mapped-type expression that catches an unknown-capability key the
  same way; the read / write surface that maps every caller (plugin
  author, [`defineDirectoryPlugin`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/plugin.md#definedirectoryplugin),
  [`PluginRegistry.register`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/registry.md#registerplugin-validatedconfig-opts--add-a-plugin),
  [`get<C>`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/registry.md#getcapability--single-provider-lookup),
  [`list<C>`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/registry.md#listcapability--enumerate-providers-by-capability),
  [`<SlotHost />`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/slot-host.md),
  host code under `apps/web/lib/<capability>/**`) to the fields
  they touch and which calls are async; and a nine-row **failure
  matrix** that maps every observable failure mode (missing required
  interface member, extra unknown member excess-property check,
  `'ui-slot'` provider attempt as a TypeScript compile error,
  provider attached for an undeclared capability as the same
  compile-time category error via the `[K in Capability]?: …`
  mapped type, `setup` throw routed to
  `LoadPluginsResult.rejected[name].reason: 'setup'`, fan-out
  `forward` throw swallowed by the host wrapper, single-lookup
  throw propagated through normal `try/catch`, runtime malformed
  shape caught by the host's per-call re-narrowing, two enabled
  plugins on the same single-lookup capability resolved as
  "first-registered wins") onto the layer that surfaces it. The
  page bookends [Spec 002](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture)'s
  per-source-file SDK reference set so every public export of
  every `packages/plugin-sdk/**` and `packages/plugin-runtime/**`
  source file now has a paired `docs/plugins/<file>.md` page with
  the same `> When the SDK adds, removes, or renames an export
update **this** page in the same change` anti-drift contract.
  Cross-linked from [`docs/plugins/plugin.md`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/plugin.md),
  [`docs/plugins/capabilities.md`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/capabilities.md),
  [`docs/plugins/manifest.md`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/manifest.md),
  [`docs/plugins/registry.md`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/registry.md),
  [`docs/plugins/loader.md`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/loader.md),
  [`docs/plugins/slots.md`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/slots.md),
  [`docs/plugins/slot-host.md`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/slot-host.md),
  [`docs/plugins/testing.md`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/testing.md),
  [`docs/plugins/lifecycle.md`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/lifecycle.md),
  [`docs/plugins/authoring-a-plugin.md`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/authoring-a-plugin.md),
  [`docs/plugins/testing-a-plugin.md`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/testing-a-plugin.md),
  [`docs/plugins/packages.md`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/packages.md),
  and [`docs/index.md`](https://github.com/ever-works/directory-web-template/tree/develop/docs/index.md);
  the parallel page [`docs/plugins/capabilities.md`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/capabilities.md)
  retains the **runtime contract** angle (lookup style, fan-out vs.
  single, dispatch order) while this new page owns the
  **TypeScript shape** angle (per-member type-system notes, the
  `CapabilityProviderMap` mapped-type expression, and the
  compile-time failure modes), and the two pages cross-link to make
  the split explicit so a reader implementing a provider knows to
  read this one and a reader deciding which capability to declare
  knows to read the other.
- `spec-002` Updated [`docs/spec/002-plugin-architecture/tasks.md`](https://github.com/ever-works/directory-web-template/tree/develop/docs/spec/002-plugin-architecture)'s
  T-010 to enumerate `docs/plugins/providers.md` alongside the other
  thirteen `docs/plugins/**` pages and to document the same
  anti-drift / per-member / read-write / failure-matrix
  cross-reference contract this new page satisfies — completing
  the per-source-file SDK doc set so every `packages/plugin-sdk/**`
  and `packages/plugin-runtime/**` source file is paired with
  exactly one `docs/plugins/<file>.md` reference under Spec 002.
- `apps/web-e2e` Added `tests/api/items-export-query.spec.ts` —
  ten cases that exercise the **query-param surface** of
  [`apps/web/app/api/items/export/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/items/export/route.ts)
  (the Zod-validated `format` enum
  [`exportQuerySchema`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/lib/validations/item-import.ts):
  both valid values `csv` / `xlsx`, the empty-string rejection,
  the unknown-value rejections, the case-sensitivity check, and
  the unknown-extra-key passthrough). Complements the single
  happy-path entry already smoked in `discovery.spec.ts` so a
  regression in the schema, the default-on-omit fallback, the
  rate-limit short-circuit, or the `getExportEnabled()`
  feature-flag gate surfaces as a failing case rather than a
  silent change in export behaviour. No-5xx contract; payload
  shape and `Content-Type` are intentionally not asserted because
  the response is either a 403 / 4xx JSON envelope or a binary
  CSV / XLSX stream depending on whether the export feature flag
  is on for the active config repository.
- `docs/plugins` Added `plugin.md` — the parallel **per-export
  plugin definition reference** that pairs with [`packages/plugin-sdk/src/plugin.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/src/plugin.ts)
  exactly the way `manifest.md` pairs with `manifest.ts`,
  `capabilities.md` pairs with `capabilities.ts`, `slots.md` pairs
  with `slots.ts`, `loader.md` pairs with `loader.ts`, `registry.md`
  pairs with `registry.ts`, `slot-host.md` pairs with `SlotHost.tsx`,
  and `testing.md` pairs with `testing.ts`. The page is one section
  per public export of `plugin.ts`: the
  [`defineDirectoryPlugin`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/plugin.md#definedirectoryplugin)
  factory (and its **inference-only** semantics — the function
  returns its argument unchanged and never validates / mutates
  anything; validation is the loader's job and registration is the
  registry's job), the `DirectoryPlugin<C>` interface (with
  per-field sub-sections for `manifest`, `setup`, `teardown`,
  `slots`, `providers` that document the runtime contract for each
  hook including the silent-rejection / propagated-throw
  distinctions, the "where it runs" / "use it for" / "do not use it
  for" / "what happens if it throws" framing established by the
  earlier per-source-file references), the `PluginContext<TConfig>`
  runtime context (one sub-section per field — `config`, `name`,
  `enabled`, optional `logger` — including the always-`true`
  invariant for `enabled` inside `setup`, the explicit "where
  `config` comes from" three-step trace through
  `mergeConfigSources` → Zod parse → `ctx.config`, and the
  `console`-vs-`ctx.logger` guidance), the `SlotComponentProps<TConfig>`
  slot-component contract (single `ctx` field, no extra props from
  `<SlotHost />`, request-scoped data via `headers()` /
  `cookies()` / context providers above the host), and the
  `PluginProviders` and `PluginSlots<TConfig>` typed maps (mapped-type
  internals including the `'ui-slot' = never` lockout that catches
  `providers: { 'ui-slot': anything }` at compile time and the
  `Partial<Record<SlotId, ...>>` shape that catches unknown slot
  ids the same way). The page also documents a nine-row **failure
  matrix** that lists every observable failure mode in the loader /
  registry / `<SlotHost />` layers a plugin returns into
  (hand-rolled plugin loses `C` inference at the TypeScript layer,
  duplicate `name` is the only manifest-level propagated throw via
  `register`, `manifest.config` rejection routes through
  `LoadPluginsResult.rejected[name].reason: 'config'` silently,
  invalid / unmatched `templateRange` routes the same way with
  `reason: 'templateRange'`, throwing `setup` is plugin-local with
  `reason: 'setup'`, throwing `teardown` is swallowed by `disable`,
  slot-component throw bubbles through React, and the two
  TypeScript-only failures — `'ui-slot'` provider attempt and
  unknown `SlotId` — are caught at compile time), a **read / write
  surface summary** that mirrors the `manifest.md` and `registry.md`
  tables and maps every caller (plugin author, `loadPlugins`,
  `PluginRegistry.register`, `PluginRegistry.disable`, `<SlotHost />`,
  `createTestRegistry`, slot components) to the fields they touch,
  three worked examples (minimal `defineDirectoryPlugin` call, a
  `setup` hook reading the typed `ctx.config`, a slot component
  reading `props.ctx`), and a five-step "how to add a new plugin
  field" checklist that mirrors the patterns established in
  `capabilities.md`, `slots.md`, `loader.md`, `registry.md`,
  `slot-host.md`, `testing.md`, and `manifest.md` — bookending the
  SDK with the same anti-drift contract every per-source-file
  SDK / runtime page now satisfies. Cross-links added in
  `authoring-a-plugin.md`, `lifecycle.md` _See also_,
  `loader.md` _See also_, `registry.md` _See also_,
  `slot-host.md` _See also_, `testing.md` _See also_,
  `testing-a-plugin.md` _See also_, `packages.md` _See also_,
  `capabilities.md` _See also_, `slots.md` _See also_,
  `manifest.md` _See also_, and `docs/index.md`. Spec 002 `T-010`
  task list grew from "eleven pages" to "twelve pages" and adds an
  explicit "doc and SDK cannot drift" verification bullet for the
  new reference (matching the wording added for `capabilities.md`,
  `slots.md`, `loader.md`, `registry.md`, `slot-host.md`,
  `testing.md`, and `manifest.md`).
- `apps/web-e2e` Added `api/items-popularity-scores.spec.ts`
  (15 cases) closing the **query-param surface** of the public
  `GET /api/items/popularity-scores` debug endpoint served by
  [`apps/web/app/api/items/popularity-scores/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/items/popularity-scores/route.ts).
  The single happy-path entry (`/api/items/popularity-scores` with
  no query) was already smoked by `discovery.spec.ts`; this spec
  exercises the route's `parseInt` + `Math.min(value, 100)` clamp
  on `limit` (valid integers `5` / `20`, beyond-clamp values
  `999` / `10000`, empty string falling back to the `'20'` default,
  non-integer `abc`, negative `-5`, zero, plus combined
  `limit=200&locale=de`) and the `locale` default / unknown-locale
  fallback (`en`, `fr`, `zh`, `__no_such_locale__`) so a regression
  in the route's parameter parsing surfaces as a failing case
  rather than a silent change in scoring output. Same conservative
  no-5xx contract as the rest of the smoke layer — payload shape
  is intentionally not asserted because the score breakdown varies
  with the active data repository / database state.
  `E2E-TESTS.md` updated with the entry and the
  continual-improvement total annotation (~292 → ~307 across
  47 → 48 spec files).
- `docs/plugins` Added `manifest.md` — the parallel **per-field
  manifest reference** that pairs with [`packages/plugin-sdk/src/manifest.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/src/manifest.ts)
  exactly the way `registry.md` pairs with `registry.ts`,
  `loader.md` pairs with `loader.ts`, `slot-host.md` pairs with
  `SlotHost.tsx`, and `testing.md` pairs with `testing.ts`. The
  page is one section per field (`name`, `version`, `description`,
  `templateRange`, `capabilities`, `config`, `defaultEnabled`,
  `adminToggleable`, `homepage`) plus an eight-row **failure
  matrix** covering every observable manifest-level outcome
  (duplicate `name` → the only propagated throw, invalid semver
  in `templateRange` → silent rejection with reason
  `templateRange`, mismatched `templateRange` → same, empty
  `capabilities` → empty `list<C>` index, Zod-rejected `config`
  → silent rejection with reason `config`, `defaultEnabled` vs
  DB row → DB wins, `adminToggleable: false` vs programmatic
  `disable` → mutation succeeds (UI hint, not authz),
  non-URL `homepage` → not validated). It documents the
  `PluginManifest<C>` interface, the `PluginConfig<C>` type alias
  the SDK ships, the registry / loader / `<SlotHost />` reads
  every field powers (`manifest.name` → React key, registry
  primary key, `plugin_settings` row id; `manifest.capabilities`
  → registry `list<C>` index; `manifest.config` →
  `loadPlugins` Zod gate; `manifest.templateRange` → boot-time
  semver compatibility check), and the **rename-is-a-breaking-change**
  contract that previously lived only in source comments. The
  page closes with a five-step "how to add a new manifest field"
  checklist that mirrors the patterns established in
  `capabilities.md`, `slots.md`, `loader.md`, `registry.md`,
  `slot-host.md`, and `testing.md` — bookending the surface so
  every per-source-file SDK / runtime page is now covered by a
  matching anti-drift reference. Cross-links added in
  `authoring-a-plugin.md`, `lifecycle.md`, `loader.md`,
  `registry.md`, `slot-host.md`, `testing.md`, `testing-a-plugin.md`,
  `capabilities.md`, `slots.md`, `packages.md`, and
  `docs/index.md`. Spec 002 `T-010` task list grew from "ten
  pages" to "eleven pages" and adds an explicit
  "doc and SDK cannot drift" verification bullet for the new
  reference (matching the wording added for `capabilities.md`,
  `slots.md`, `loader.md`, `registry.md`, `slot-host.md`, and
  `testing.md`).
- `apps/web-e2e` Added `api/client-item-restore.spec.ts` (1 case)
  closing the last `/api/client/**` per-id surface that was
  previously implicit rather than explicit:
  `POST /api/client/items/[id]/restore`, the soft-delete restore
  action served by
  [`apps/web/app/api/client/items/[id]/restore/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/client/items/%5Bid%5D/restore/route.ts).
  The matching CRUD surface (`GET / PATCH / DELETE /api/client/items/[id]`)
  is already smoked via `client-protected.spec.ts`; this spec closes
  the per-id action sub-route. Same conservative no-5xx pattern as
  the rest of the smoke layer — uses an intentionally non-existent
  UUID so the spec never depends on data-repository content.
  `E2E-TESTS.md` updated with the entry and the
  continual-improvement total annotation (~291 → ~292 across
  46 → 47 spec files).
- `apps/web-e2e` Added `api/nextauth-discovery.spec.ts` (9 cases)
  closing the NextAuth catch-all (`/api/auth/[...nextauth]`) public
  discovery surface: GET `providers`, `csrf`, `session`, `signin`,
  `signout`, `error` plus POST `signout` (no CSRF), POST
  `callback/credentials` (empty body), and GET
  `callback/<unknown-provider>` — no-5xx contract for every entry.
  Closes the last NextAuth-managed surface that was implicit rather
  than explicit (the custom `/api/auth/change-password` helper sits
  in `auth-change-password.spec.ts`). Also added
  `public/seo-manifests.spec.ts` (4 cases) for the public SEO /
  manifest surface generated by `app/{robots,sitemap,opengraph-image}.{ts,tsx}`
  and the static favicon: `/robots.txt` (with `User-agent` content
  sanity check), `/sitemap.xml` (XML prolog sanity check),
  `/opengraph-image`, `/favicon.ico` — no-5xx contract. Same
  conservative pattern as the rest of the smoke layer so the specs
  stay valid across local / CI environments. `E2E-TESTS.md` updated
  with both entries and the continual-improvement total annotation.
- `docs/plugins` Added `testing.md` — the parallel **per-helper
  testing reference** that pairs with [`packages/plugin-runtime/src/testing.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime/src/testing.ts)
  exactly the way `registry.md` pairs with `registry.ts`,
  `loader.md` pairs with `loader.ts`, and `slot-host.md` pairs with
  `SlotHost.tsx`. The page is one section per helper
  (`createTestRegistry({ plugins })` is the only one in v1) plus a
  six-row **failure matrix** covering every observable outcome
  (Zod-rejected schema → silent drop, throwing `setup` → loader
  records as rejected but helper still resolves, duplicate-name →
  the **only** propagated throw out of the helper, empty-array →
  empty registry no-op, `defaultEnabled: false` → registered but
  not enabled, slot component throws on render → bubbles through
  React when `<SlotHost />` calls it). It documents the four
  things `createTestRegistry` does in order
  (`new PluginRegistry()` with `persistEnabled` undefined, map each
  plugin to a `{ plugin }` envelope, `await loadPlugins(...)`,
  return the loaded registry) and the **explicit non-goals** that
  previously lived only in source comments — the helper is not a
  registry constructor, not a config harness, not a rejection
  inspector, not a persistence harness, not a render harness, not
  async-cleanup-aware — so test authors can pick the right tool
  the first time. It also documents the **dual import surface**
  (`from '@ever-works/plugin-runtime'` versus `from '@ever-works/plugin-runtime/testing'`)
  declared in the runtime's
  [`package.json`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime/package.json)
  `exports` map, the **read / write surface summary** that maps
  callers (plugin package unit tests, capability composition tests,
  slot composition tests, admin enable / disable tests,
  config-required plugins, rejection-asserting tests,
  persistence-callback tests) to the methods they're allowed to
  invoke, three worked Vitest examples (happy-path register-and-slot,
  config-required plugin via direct `loadPlugins`, disable-then-empty
  round-trip) — the same three paths that
  `apps/web-e2e/tests/plugins/admin-toggle.spec.ts` and
  `apps/web-e2e/tests/plugins/slots.spec.ts` cover at the
  Playwright layer (per Spec 002 / T-009), and a five-step
  "how to add a new test seam" checklist that mirrors the patterns
  established in `capabilities.md`, `slots.md`, `loader.md`,
  `registry.md`, and `slot-host.md`. Cross-links added in
  `authoring-a-plugin.md`, `lifecycle.md` _See also_,
  `testing-a-plugin.md` _See also_, `packages.md` _See also_,
  `capabilities.md` _See also_, `slots.md` _See also_,
  `loader.md` _See also_, `registry.md` _See also_,
  `slot-host.md` _See also_, and `docs/index.md`. Spec 002 `T-010`
  task list grew from "nine pages" to "ten pages" and adds an
  explicit "doc and runtime cannot drift" verification bullet for
  the new reference (matching the wording added for
  `capabilities.md`, `slots.md`, `loader.md`, `registry.md`, and
  `slot-host.md`).
- `docs/plugins` Added `slot-host.md` — the parallel **per-component
  SlotHost reference** that pairs with [`packages/plugin-runtime/src/SlotHost.tsx`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime/src/SlotHost.tsx)
  exactly the way `registry.md` pairs with `registry.ts` and
  `loader.md` pairs with `loader.ts`. The page is one section per
  prop (`slotId`, `registry`, `fallback?`) plus a six-row
  **failure matrix** covering every observable outcome (no
  contributors, all contributors disabled, one or more enabled
  contributors, contributed component throws, duplicate plugin name
  — already caught one level up by `PluginRegistry.register`,
  unknown `slotId` typed through `any`). It documents the four
  things `<SlotHost />` does in order (call `slotsFor`, fall back
  to `fallback ?? null` on empty, wrap each contribution in a
  Fragment keyed by `pluginName`, return with no extra DOM wrapper)
  and the **server-friendliness contract** that previously lived
  only in source comments — no `"use client"`, no client-only
  hooks, no `react-dom` import, only a synchronous registry read —
  which means a layout that uses `<SlotHost />` stays a server
  component even when its contributed slot components opt into
  client rendering. It also documents the **anti-patterns** (the
  host is not a wrapper element, not a client component, not a
  reactivity boundary, not an error-boundary, not a way to pass
  extra props to slot components) so layout authors do not have to
  read the source to rule them out. Three worked Vitest examples
  cover the happy-path render, the empty-fallback path, and the
  disable-then-empty round-trip — the same three paths that
  `apps/web-e2e/tests/plugins/slots.spec.ts` covers at the
  Playwright layer (per Spec 002 / T-009). The page also documents
  the dual import surface (`from '@ever-works/plugin-runtime'`
  versus `from '@ever-works/plugin-runtime/SlotHost'`) and a
  five-step "how to add a new prop" checklist that mirrors the
  patterns established in `capabilities.md`, `slots.md`,
  `loader.md`, and `registry.md`. Cross-links added in
  `authoring-a-plugin.md`, `lifecycle.md` _See also_,
  `testing-a-plugin.md` _See also_, `packages.md` _See also_,
  `capabilities.md` _See also_, `slots.md` _See also_,
  `loader.md` _See also_, `registry.md` _See also_, and
  `docs/index.md`. Spec 002 `T-010` task list grew from "eight
  pages" to "nine pages" and adds an explicit "doc and runtime
  cannot drift" verification bullet for the new reference
  (matching the wording added for `capabilities.md`, `slots.md`,
  `loader.md`, and `registry.md`).
- `docs/plugins` Added `registry.md` — the parallel **per-API
  registry reference** that pairs with [`packages/plugin-runtime/src/registry.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime/src/registry.ts)
  exactly the way `loader.md` pairs with `loader.ts`. One section
  per public method (`new PluginRegistry({ persistEnabled? })`,
  `register`, `isEnabled`, `isRegistered`, `enable`, `disable`,
  `get<C>`, `list<C>`, `slotsFor`, `list_all`) with the full
  TypeScript signature, the throws / no-throws contract, and the
  precise idempotence rules (`enable` on an already-enabled plugin
  is a no-op and **does not** invoke the persistence callback;
  `disable` on an already-disabled plugin **does not** invoke
  `teardown`). The page includes a **read / write surface
  summary** that maps callers (layouts / capability code / admin
  UI / boot / tests) to the methods they're allowed to invoke,
  plus an explicit eight-row failure matrix covering the throwing
  outcomes (duplicate-name on `register`, unregistered name on
  `enable` / `disable`), the silent outcomes (already-enabled,
  already-disabled, unknown capability returning
  `undefined` / `[]`, empty `slotsFor`), and the propagating
  outcomes (throwing `persistEnabled`, throwing `teardown` —
  including the "stays disabled in memory" semantics that allow
  safe retries). Two worked Vitest examples cover the
  disable-then-`slotsFor`-empty round-trip and the duplicate-name
  throw. The page also documents the `defaultEnabled` precedence
  (`opts?.enabled ?? plugin.manifest.defaultEnabled ?? true`) and
  the rationale for the underscore-cased `list_all` name — both
  facts that previously lived only in the source comments.
  Cross-links added in `authoring-a-plugin.md`, `lifecycle.md`
  _See also_, `testing-a-plugin.md` _See also_, `packages.md`
  _See also_, `capabilities.md` _See also_, `slots.md` _See
  also_, `loader.md` _See also_, and `docs/index.md`. Spec 002
  `T-010` task list grew from "seven pages" to "eight pages" and
  adds an explicit "doc and runtime cannot drift" verification
  bullet for the new reference (matching the wording added for
  `capabilities.md`, `slots.md`, and `loader.md`).
- `docs/plugins` Added `loader.md` — the parallel **per-API loader
  reference** that pairs with [`packages/plugin-runtime/src/loader.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime/src/loader.ts)
  exactly the way `capabilities.md` pairs with `providers.ts` and
  `slots.md` pairs with `slots.ts`. One section per export
  (`loadPlugins`, `mergeConfigSources`, `PluginConfigSources`,
  `LoadPluginsResult`) with the full TypeScript signature, the
  precedence rule (`env ⊆ db ⊆ override`), and an explicit
  six-row failure matrix covering the five outcomes
  ("config passes Zod", "config fails Zod", "setup throws",
  "`enabled: false` + valid config", "duplicate plugin name", "empty
  plugins array") that previously lived only in the source comments.
  The page also includes a worked Vitest example that calls
  `loadPlugins` directly to verify override precedence and the
  validation-failure path, plus a five-step "how to add a new loader
  feature" checklist that mirrors the patterns established in
  `capabilities.md` and `slots.md`. Plugin authors and host-app
  integrators previously had to read the loader source to discover
  that a plugin whose `setup()` throws appears in **both**
  `registered` and `rejected`, that the merge is intentionally
  shallow (not deep), and that the loader does not abort on failure;
  that information now lives in one place. Cross-links added in
  `authoring-a-plugin.md`, `lifecycle.md` _See also_,
  `testing-a-plugin.md` _See also_, `packages.md` _See also_,
  `capabilities.md` _See also_, `slots.md` _See also_, and
  `docs/index.md`. Spec 002 `T-010` task list grew from "six pages"
  to "seven pages" and adds an explicit "doc and runtime cannot
  drift" verification bullet for the new reference (matching the
  wording added for `capabilities.md` and `slots.md`).
- `docs/plugins` Added `slots.md` — the parallel **per-slot reference**
  that pairs with [`packages/plugin-sdk/src/slots.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/src/slots.ts)
  exactly the way `capabilities.md` pairs with `providers.ts`. One
  section per canonical slot id (`header.left`, `header.right`,
  `footer.center`, `home.before-listing`, `home.after-listing`,
  `item.detail.sidebar`, `item.detail.actions`,
  `item.detail.afterFooter`, `admin.layout.header.right`,
  `admin.settings.section`, `admin.dashboard.widgets`,
  `admin.items.row.actions`, `admin.items.toolbar`,
  `client.dashboard.widgets`, `client.settings.section`) with the
  layout it renders into, the intended use case, and any composition
  caveats. Top of the page documents the `{ ctx }` component contract
  (props are fixed; render an accessible region; keep server-friendly;
  localise via `next-intl`), the composition rules
  (registration-order, multi-contributor support, immediate disable,
  `fallback` semantics, fragment-only host), and a five-step "how to
  add a new slot" checklist. Cross-links added in the architecture
  page (Slots table now points at this reference as the source of
  truth), `authoring-a-plugin.md`, `lifecycle.md`,
  `testing-a-plugin.md`, `capabilities.md`, `packages.md`, and
  `docs/index.md`. Spec 002 `T-010` task list grew from "five pages"
  to "six pages" and adds an explicit "doc and SDK cannot drift"
  verification bullet for the new reference (matching the wording
  added for `capabilities.md`).
- `docs/plugins` Added `capabilities.md` — the missing **per-capability
  reference** that pairs with [`packages/plugin-sdk/src/providers.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/src/providers.ts).
  One section per canonical capability (`auth`, `payment`, `analytics`,
  `search`, `content-source`, `maps`, `newsletter`, `notifications`,
  `ai`, `ui-slot`) with the full TypeScript interface, the lookup
  style (single-provider via `registry.get` vs fan-out via
  `registry.list`), the rules the runtime applies when two enabled
  plugins declare the same capability, and a five-step "how to add a
  new capability" checklist that mirrors Spec 002. Plugin authors
  previously had to read the SDK source to discover that
  `analytics` / `newsletter` / `notifications` are fan-out and that
  `auth` / `payment` / `search` / `content-source` / `maps` / `ai`
  are single-lookup; that information now lives in one place. Cross-links
  added in the architecture page (`Capabilities` table now points at
  this reference as the source of truth), `authoring-a-plugin.md`
  _See also_, `lifecycle.md` _See also_, `testing-a-plugin.md`
  _See also_, `packages.md` _See also_, and `docs/index.md`.
  Spec 002 `T-010` task list grew from "four pages" to "five pages"
  and adds an explicit "doc and SDK cannot drift" verification
  bullet for the new reference.
- `apps/web-e2e` Added `public/per-survey-public.spec.ts` (1 — `GET
/surveys/[slug]` with an unknown slug; exercises the
  `notFound()` / disabled-feature branch with the same non-5xx
  contract as the rest of the smoke layer. Closes the last
  public-survey page surface that was implicit rather than explicit;
  the listing page is already covered by `public/surveys.spec.ts`,
  the dashboard owner flow by `public/dashboard-surveys-protected.spec.ts`,
  the admin per-slug pages by `public/admin-by-id-pages-protected.spec.ts`,
  and the REST surface by `api/surveys.spec.ts`). `E2E-TESTS.md`
  updated with the new entry and the continual-improvement headline
  total annotation (now ~278 tests across 44 spec files).
- `docs/plugins` Added `testing-a-plugin.md` (~6 KB) — author-facing
  guide that pairs with the existing `authoring-a-plugin.md`. It
  documents the four-layer test pyramid for plugins
  (manifest/Zod schema, registry round-trip via
  `createTestRegistry`, slot rendering through `<SlotHost />`, and
  Playwright smoke specs), an explicit _what not to do_ list (don't
  mock `PluginRegistry`, don't reach into `apps/web/**`, don't
  assert on translatable copy), and an "override" recipe for
  schemas with non-default required fields. Each example imports
  from the published runtime exports
  (`@ever-works/plugin-runtime/testing`,
  `@ever-works/plugin-runtime/SlotHost`,
  `@ever-works/plugin-runtime`), so the doc and
  [`packages/plugin-runtime/src/testing.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime/src/testing.ts)
  / [`SlotHost.tsx`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime/src/SlotHost.tsx)
  cannot drift. Cross-links added in `authoring-a-plugin.md`
  (replaces the inline "Add a Playwright spec" snippet with a
  pointer to the dedicated guide and the original Playwright
  example), `packages.md` _See also_ section, and `lifecycle.md`
  _See also_ section. `docs/index.md` now lists three plugin
  guides under the spec-driven pointers — `Authoring a Plugin`,
  the previously-unlinked `Plugin Lifecycle`, and the new
  `Testing a Plugin`. Spec 002 `tasks.md` `T-010` task list grew
  from "three new pages" to the four canonical
  `docs/plugins/**` pages and now includes
  `docs/plugins/packages.md` + `docs/plugins/testing-a-plugin.md`,
  with an explicit "doc and runtime cannot drift" verification
  bullet.
- `docs/architecture` `plugin-system.md` status block updated from
  _proposed_ to _in-progress_ (Phase A scaffolding shipped in commit
  `8b68d29a`); the "two packages" section now reads "three packages"
  to include the existing `@ever-works/plugin-demo` reference plugin
  (with a note that it is not part of the runtime contract). The
  Slots table was extended from 9 rows to the full 15 canonical slot
  ids (`home.after-listing`, `item.detail.actions`,
  `admin.layout.header.right`, `admin.items.row.actions`,
  `admin.items.toolbar`, `client.settings.section`) and now points
  readers at [`packages/plugin-sdk/src/slots.ts`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk/src/slots.ts)
  as the authoritative source so the doc and the SDK can never drift
  again.
- `apps/web-e2e` Added `api/item-company-write.spec.ts` (2 — `POST`
  and `DELETE` `/api/items/[slug]/company` for a non-existent slug;
  the matching `GET` is already covered in
  `payment-protected.spec.ts` line 37, but the **write** surfaces of
  the per-item admin company-assignment route were not explicitly
  smoke-tested. Same no-5xx contract as the rest of the smoke layer
  — anonymous callers must receive a 4xx, never a 5xx).
  `E2E-TESTS.md` updated with the new entry.
- `spec-018` Added `018-performance-budget` (proposed): full
  spec/plan/tasks trio that converts Article V of the constitution
  into a measurable, CI-enforced contract — per-route gzip first-load
  JS budget, a `pnpm perf:bundle` script, a Lighthouse CI workflow,
  and a maintainer-facing dashboard page. Two PRs are scoped: PR 1
  (bundle gate + docs) and PR 2 (Lighthouse CI). Two open questions
  recorded in `docs/questions.md` (Q-018a Lighthouse trigger
  surface; Q-018b budget file location). No code yet — this entry
  only adds the docs/spec scaffolding so future work stops "Article
  V is aspirational" being a true statement.
- `spec-017` Status flipped from _in-progress_ to **shipped** in
  the spec index and in [`spec.md`](spec/017-map-view/spec.md). All
  T-001..T-009 tasks landed in commit `fe808cc3` (`feat: more on
maps`) on the `develop` branch — sidebar + dedicated `/map`
  route + header nav link + e2e coverage are live. Follow-up
  enhancements (sidebar virtualisation, mini-map embed on
  item-detail) tracked as separate iterations.
- `questions` Added `Q-018a` (Lighthouse trigger surface) and
  `Q-018b` (perf budget file location) under the new Spec 018
  section.
- `spec-017` Added `017-map-view` (proposed → implemented in this PR):
  spec/plan/tasks for the listing map view + dedicated `/map` route +
  header `Map` nav link gated on `settings.header.map_enabled`. Adds
  `MapSidebar`, extends `LayoutMap` with marker↔card sync and
  auto-fit bounds, adds `apps/web-e2e/tests/public/map.spec.ts` and
  `docs/features/map-view.md`. No new dependencies.
- `index` Added a Maps & Location bullet to `docs/index.md` Key
  Features that links to the new feature page.
- `docs/features` `maps-location.md` and `guides/map-integration-guide.md`
  now cross-link to the Map View feature page and Spec 017.
- `README` Root `README.md` Tech Stack now mentions Mapbox GL JS /
  Google Maps and a new "Maps & Location" section documents the
  Map view config, env vars, and YAML location example.
- `apps/web-e2e` Added two more smoke spec files closing the last
  notable per-slug surfaces that were not yet explicitly covered:
  `public/per-slug-public.spec.ts` (3 — `/comparisons/[slug]`,
  `/categories/[category]`, `/tags/[tag]` per-slug detail pages with
  an intentionally unknown slug; exercises each page's `notFound()`
  / disabled-feature branch with the same non-5xx contract used
  elsewhere in the smoke layer; complements the legacy `(listing)`
  versions in `public/legacy-routing.spec.ts`) and
  `api/item-comment-rating-by-id.spec.ts` (2 — `GET` and `PATCH` of
  `/api/items/[slug]/comments/rating/[commentId]` for a non-existent
  comment id; closes the last `/api/items/[slug]/**` per-comment
  route that was not explicitly smoke-tested — sibling routes
  `/api/items/[slug]/comments/rating` and `.../comments/[commentId]`
  are already covered by `api/item-public.spec.ts` and
  `api/items-engagement-and-favorites.spec.ts`). Same no-5xx contract
  as the rest of the smoke layer. `E2E-TESTS.md` updated with both
  entries and the continual-improvement headline total annotation
  (now ~277 tests across 43 spec files).

## 2026-04-30

- `apps/web-e2e` Added `api/item-votes-public.spec.ts` (2 — public
  `GET /api/items/[slug]/votes` non-existent-slug contract: no-5xx
  status plus a non-error JSON envelope when the body parses). This
  closes the last public per-item GET surface that was implicit
  rather than explicit (the `/votes/count` route is its sibling and
  was already covered by `api/item-public.spec.ts`; the auth-gated
  `/votes` POST/DELETE and `/votes/status` GET sit in
  `items-engagement-and-favorites.spec.ts` and
  `payment-protected.spec.ts` respectively). Same no-5xx contract as
  the rest of the smoke layer. `E2E-TESTS.md` updated with the new
  entry and the continual-improvement headline total annotation.
- `spec-001` Added retroactive `plan.md` and `tasks.md` so the
  monorepo-conversion spec now carries the full Spec Kit
  spec → plan → tasks trio. Both files state up front that they are
  retroactive and defer to the originals under
  `docs/plans/2026-03-08-monorepo-conversion*` for historical
  sequencing per Article VIII of the constitution. The spec index
  (`docs/spec/README.md`) gained inline `(plan, tasks)` links on the
  001 row and a clarifying line in _Conventions_ explaining when a
  retroactive trio is reconstructed for parity.
- `apps/web-e2e` Added three more smoke spec files closing the
  remaining admin-by-id and client / page-by-id gaps not covered by
  the earlier collection-level specs:
  `api/admin-by-id.spec.ts` (47 — admin per-`[id]` REST routes
  across categories, clients, collections (+ items helper), comments,
  companies, featured-items, items (+ history / review / full
  import), notifications read receipt, reports, roles (+ permissions
  sub-route), sponsor-ads (+ approve / cancel / reject), tags, users - settings POST), `api/items-engagement-and-favorites.spec.ts`
  (11 — public `/api/items/engagement` 4 cases including
  missing-slugs, empty-slugs, unknown-slugs, and >200-slugs guard +
  auth-gated comment-by-id PUT / DELETE, vote toggle / clear, and
  favorites GET / POST + `/favorites/[itemSlug]` DELETE),
  `public/admin-by-id-pages-protected.spec.ts` (18 — admin per-id
  page routes `/admin/clients/[id]`, `/admin/surveys/[slug]/{edit,
preview,responses}`, `/admin/auth/signin`, plus `/client/**`
  authenticated owner pages: dashboard, profile/[username],
  settings (basic-info / billing / location / portfolio /
  theme-colors / submissions/trash), security, sponsorships,
  submissions, submissions/trash). Same no-5xx contract as the rest
  of the smoke layer. `E2E-TESTS.md` updated with all three entries
  and the continual-improvement headline total annotation.
- `apps/web-e2e` Added five more page-route smoke specs closing the
  remaining gaps in the public + protected page surface:
  `public/pricing-success.spec.ts` (2 — `/pricing/success` with and
  without checkout query params), `public/listing-paginated.spec.ts`
  (6 — `/discover/[page]` with a high page number,
  `/collections/paging[/page]`, `/tags/paging[/page]`),
  `public/legacy-routing.spec.ts` (5 — legacy nested catch-alls
  `/categories/category/[...categorie]`, `/tags/tag/[...tags]`, and
  the `(listing)` group's `/tags/[...tag]`),
  `public/item-survey-public.spec.ts` (2 — public per-item survey
  response page `/items/[slug]/surveys/[surveySlug]` for unknown
  slugs), `public/dashboard-surveys-protected.spec.ts` (3 — owner
  flow `/dashboard/items/[itemId]/surveys[/preview|/responses]`
  redirect-or-404 contract). Same no-5xx contract as the rest of the
  smoke layer. `E2E-TESTS.md` updated with all five entries and the
  continual-improvement headline total annotation.
- `apps/web-e2e` Added eleven more smoke specs closing the largest
  remaining coverage gaps: `api/admin-protected-extra.spec.ts` (36
  admin-only endpoints across every slice — categories `all`/`git`/
  `reorder`, clients `dashboard`/`stats`/`advanced-search`/`bulk`,
  collections, comments, companies, featured-items, geo-analytics,
  items `stats`/`bulk`/`export`/`export/sample`/`import/validate`,
  location-index, navigation, notifications `mark-all-read`,
  reports `list`/`stats`, roles `list`/`active`/`stats`, settings
  `list`/`map-status`, sponsor-ads, tags `list`/`all`, twenty-crm
  `config`/`test-connection`, users `check-email`/`check-username`/
  `stats`), `api/client-protected.spec.ts` (8 `/api/client/**`
  endpoints — dashboard `stats`, `geo-stats`, items list /
  `coordinates` / `stats`, import `sample`/`validate`/POST),
  `api/surveys.spec.ts` (8 auth-gated CRUD + per-survey responses - per-response detail), `api/payment-checkouts.spec.ts` (28
  auth-gated checkout / payment-method / setup-intent /
  subscription mutation routes across Stripe, LemonSqueezy, Polar,
  Solidgate + sponsor-ad lifecycle), `api/auth-change-password.spec.ts`
  (2 no-session / empty-body cases), `api/location-coordinates.spec.ts`
  (3 enabled / disabled feature-gate cases),
  `api/user-profile-location.spec.ts` (2 GET + PUT no-session
  cases), `api/reports.spec.ts` (2 no-session / empty-body cases),
  `public/newsletter-unsubscribe.spec.ts` (2 with / without token),
  `public/integration.spec.ts` (3 `/integration/{analytics,posthog,
speed-insights}` showcase pages), and
  `public/admin-pages-protected.spec.ts` (18 `/admin/**` and
  `/dashboard/**` page routes redirect anonymous visitors without
  5xx). Same no-5xx contract as the rest of the smoke layer.
  `E2E-TESTS.md` updated with all eleven entries and the
  continual-improvement headline total annotation.
- `apps/web-e2e` Added six more API smoke spec files closing
  remaining coverage gaps in the public surface:
  `api/feature-existence.spec.ts` (`/api/categories/exists`,
  `/api/collections/exists`, `/api/surveys/exists` with
  `type=item|global`, `/api/items/export/settings`),
  `api/location.spec.ts` (`/api/location/countries`, `/cities`,
  `/search` with no-params / city / country / valid-radius /
  invalid-coords variants — covers both the location-enabled 200/400
  and location-disabled 404 contracts), `api/item-public.spec.ts`
  (public per-item GETs and POSTs against a non-existent slug —
  votes/count, comments listing, comments/rating, views POST,
  unauthenticated comments POST), `api/cron-jobs.spec.ts`
  (`/api/cron/subscription-expiration` and
  `/api/cron/subscription-reminders` with no secret and with a
  wrong secret), `api/stripe-public.spec.ts` (`/api/stripe/products`
  dynamic-pricing gate), and `api/payment-protected.spec.ts` (13
  auth-required user / Stripe / LemonSqueezy / sponsor-ads / payment
  account / per-item company / votes-status surfaces). Same
  no-5xx contract as the rest of the API smoke layer. `E2E-TESTS.md`
  updated with all six entries and the continual-improvement total
  annotation.
- `spec-002` Status moved from _proposed_ to _in-progress_ in the
  spec index now that Phase A (T-001/T-002/T-003 — SDK, runtime, and
  demo plugin scaffolds) has shipped. T-004..T-012 still remain.
- `apps/web-e2e` Added API smoke specs for previously-uncovered
  endpoint surfaces: `api/version.spec.ts` (GET `/api/version`, GET
  and POST on `/api/version/sync`), `api/webhooks.spec.ts` (Stripe,
  LemonSqueezy, Polar, Solidgate webhook GET / unsigned-POST
  contracts — both must be 4xx, never 5xx),
  `api/discovery.spec.ts` (public sponsor-ads, items
  popularity-scores, items export, items/[slug] 404 contract),
  `api/protected.spec.ts` (10 auth-required endpoints across tenant,
  admin, user, client, current-user surfaces — must respond 4xx, not
  5xx, when unauthenticated), and `api/method-guards.spec.ts`
  (POST-only `/api/extract`, `/api/verify-recaptcha`, `/api/geocode`,
  plus `/api/internal/db-init` dev-gate and `/api/cron/sync`
  contract). Each spec only asserts "no 5xx" so it stays valid
  across local / CI environments. `apps/web-e2e/E2E-TESTS.md`
  updated with new entries and the headline total annotation.
- `apps/web-e2e` Added smoke specs for previously-uncovered surfaces:
  `auth/new-verification.spec.ts`, `public/docs.spec.ts`,
  `public/cms-page.spec.ts` (the generic `/pages/[slug]` route),
  `client/billing.spec.ts` (dashboard billing auth + redirect), and
  `api/reference.spec.ts` (Scalar API reference UI + `openapi.json`).
  `apps/web-e2e/E2E-TESTS.md` updated to list each new spec.
- `docs/plugins` Added `packages.md` — a per-package overview of
  `@ever-works/plugin-sdk`, `@ever-works/plugin-runtime`,
  `@ever-works/plugin-demo`. Linked from `docs/index.md`.
- `spec-002` Phase A complete: scaffolded
  [`@ever-works/plugin-sdk`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-sdk),
  [`@ever-works/plugin-runtime`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-runtime),
  and [`@ever-works/plugin-demo`](https://github.com/ever-works/directory-web-template/tree/develop/packages/plugin-demo)
  per [Spec 002 / T-001..T-003](spec/002-plugin-architecture/tasks.md).
  All three packages typecheck cleanly. No `apps/web` wire-up yet —
  that lands in Phase B (T-004..T-006).
- `spec-006`, `spec-007`, `spec-008`, `spec-009`, `spec-011`,
  `spec-012`, `spec-013`, `spec-014`, `spec-015`, `spec-016` Added
  implementation plans + task lists, completing the Spec Kit trio
  (`spec.md` + `plan.md` + `tasks.md`) for every retroactive feature
  spec from this run. Each plan documents the existing topology and
  the migration path to the plugin architecture (Spec 002).
- `apps/web-e2e` Added smoke specs for previously-uncovered surfaces
  to close gaps in [Spec 010](spec/010-e2e-test-coverage/spec.md):
  `auth/forgot-password.spec.ts`, `auth/new-password.spec.ts`,
  `public/help.spec.ts`, `public/about.spec.ts`,
  `public/comparisons.spec.ts`, `public/sponsor.spec.ts`.
- `spec-003` Added implementation plan + tasks for auth providers,
  documenting the existing topology and the migration path to plugin
  packages once Spec 002 stabilises.
- `spec-004` Added implementation plan + tasks for payment providers
  with the same pattern (current shape + plugin-migration target).
- `spec-005` Added implementation plan + tasks for i18n covering
  message catalogue management, locale switcher, RTL, and Docusaurus
  i18n.
- `spec-016` Added retroactive spec for the typed analytics events
  layer shipped in PR #692, sitting on top of Spec 008.
- `spec-010` Added implementation plan and task list for the e2e
  test coverage spec, including engineering backlog (resilience and
  speed passes).
- `docs/plugins` Added `lifecycle.md` covering boot, validation,
  registration, setup, runtime use, enable/disable/swap, teardown,
  events, versioning, and anti-patterns.
- `claude` Added a "Read first" block to `CLAUDE.md` pointing to
  AGENTS.md, `.specify/`, `docs/spec/`, log, and questions.
- `spec-002` Added Spec Kit feature spec, plan, and tasks for the
  plugin / adapter architecture.
- `spec-001` Added retroactive spec for the monorepo conversion (the
  underlying plan documents in `docs/plans/` are kept untouched per
  Article VIII of the constitution).
- `spec-003`, `spec-004`, `spec-005`, `spec-006`, `spec-007`,
  `spec-008`, `spec-009`, `spec-010`, `spec-011`, `spec-012`,
  `spec-013`, `spec-014`, `spec-015` Added retroactive specs for the
  shipped or in-progress features (auth providers, payment providers,
  i18n, Git CMS, theming, analytics, admin dashboard, e2e test
  coverage, maps, newsletter, notifications, docs translation, Spec
  Kit adoption).
- `constitution` Created `.specify/memory/constitution.md` with ten
  durable principles (Plugin-First, TypeScript-Only, Spec-Before-Code,
  Documentation-First, Performance Budget, Latest Stable Frameworks,
  Reuse Before Build, No Removal Without Migration, Test Coverage
  Bar, Modular Packages).
- `docs/.specify` Added `.specify/README.md`, the constitution, and the
  spec / plan / tasks templates per the [GitHub Spec Kit](https://github.com/github/spec-kit)
  convention.
- `agents` Rewrote `AGENTS.md` to enumerate the cross-cutting rules
  for any AI agent operating in this monorepo (Spec-Driven
  Development, plugin-first, TypeScript-only, performance budget,
  latest frameworks, reuse, no-removal, test bar, docs-first, modular
  packages, safety, continual-improvement runs).
- `index` Linked `.specify/`, `docs/spec/`, `docs/log.md`, and
  `docs/questions.md` from `docs/index.md`.
- `questions` Created `docs/questions.md` to capture open questions
  with chosen defaults.

## 2026-04-26 (pre-Spec-Kit)

- `docs/architecture` Translation work landed for architecture pages
  (PR #681).
- `docs/api` Translation work landed for API pages (PR #680).
- `docs/advanced-guide` `docs/features` `docs/payment` Translations
  landed (PR #677).

## 2026-03-08

- Monorepo conversion design and plan landed in
  [`docs/plans/2026-03-08-monorepo-conversion.md`](plans/2026-03-08-monorepo-conversion.md)
  and
  [`docs/plans/2026-03-08-monorepo-conversion-design.md`](plans/2026-03-08-monorepo-conversion-design.md).
  These remain the definitive source for that effort and are now
  cross-linked from `docs/spec/001-monorepo-conversion/spec.md`.

---

## How to add an entry

1. Append a single line under the most recent date heading; create a
   new date heading for a new day.
2. Keep entries in a stable bullet style (`- area: summary`).
3. If the change implements or amends a spec, link the spec folder.
4. If the change has a PR, mention the PR number in parentheses.
