---
id: tasks-051-admin-billing-issues
title: Tasks 046 — Admin billing issues and refunds
sidebar_label: 046 Tasks
---

# Tasks — `051-admin-billing-issues`

> **Spec:** [`spec.md`](./spec.md) · **Plan:** [`plan.md`](./plan.md)

| # | Task | Verification | Status |
| --- | --- | --- | --- |
| T-1 | Add `billingIssues` plus its type/status enums to the Drizzle schema | `pnpm tsc --noEmit` in `apps/web` | done |
| T-2 | Hand-write migration `0040_admin_billing_issues.sql` and add its journal entry | Migration is idempotent; re-running is a no-op | done |
| T-3 | Add `billing-issue.queries.ts` (list, get, create, update, stats, idempotent detection, webhook upsert) and export it from the queries barrel | Type-check; every read is tenant-scoped and paginated | done |
| T-4 | Add `billing-issue.service.ts` with the refund and resolve actions, provider resolution injected | Type-check; refund writes only after the provider call returns | done |
| T-4a | Convert cents to the major units every provider adapter expects (and back on the way out) at the single provider-call boundary | Read `refundPayment` in the Stripe / Polar / Solidgate adapters: each does its own `* 100` | done |
| T-4b | Let the refund request override and persist `providerPaymentId`, exposed as an editable field in the dialog | `apps/web-e2e/tests/admin/billing-issues.spec.ts` refund-reference test | done |
| T-4c | Claim a refund atomically (`refund_claimed_at`) before the provider call, and carry the not-already-refunded condition into the status UPDATE's WHERE | Two concurrent refunds cannot both reach the provider; a PATCH racing a refund cannot overwrite `refunded` | done |
| T-4d | Validate tenant ownership of `userId` / `subscriptionId` on manual create, and drop the tenant override from the query signature | `admin-billing-issues-query.spec.ts` out-of-tenant create test | done |
| T-5 | Add the four admin API routes with swagger JSDoc and the admin guard | `apps/web-e2e/tests/api/admin-billing-issues-query.spec.ts` | done |
| T-6 | Add `use-admin-billing-issues.ts` (React Query list/stats + update/refund/sync mutations) | Type-check; mutations invalidate the shared key | done |
| T-7 | Add `/admin/billing-issues` page and the action dialog, reusing the admin shell | `apps/web-e2e/tests/admin/billing-issues.spec.ts` | done |
| T-8 | Add the dashboard-grid card and the profile-menu entry | Admin route coverage matrix | done |
| T-9 | Open an issue from the failed-payment webhook, best-effort | Type-check; intake never throws into the dispatcher | done |
| T-10 | Add `admin.ADMIN_BILLING_ISSUES_PAGE` to all 21 locale files | `pnpm run lint`; every locale parses | done |
| T-11 | Add both Playwright specs and register the routes in both coverage matrices | Specs run under `@ever-works/web-e2e` | done |
| T-12 | Spec, plan, tasks, `docs/spec/README.md` row, `docs/questions.md` entry, `docs/log.md` line | Definition of Done checklist in `AGENTS.md` §2 | done |
