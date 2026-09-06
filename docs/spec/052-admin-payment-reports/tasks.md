---
id: tasks-052-admin-payment-reports
title: Tasks 047 — Admin payment reports and export
sidebar_label: 047 Tasks
---

# Tasks — `052-admin-payment-reports`

> **Spec:** [`spec.md`](./spec.md) · **Plan:** [`plan.md`](./plan.md)

| # | Task | Verification | Status |
| --- | --- | --- | --- |
| T-1 | Add `payment-report.queries.ts` (paginated list, export list, roll-ups) and export it from the queries barrel | `pnpm tsc --noEmit` in `apps/web`; every read is tenant-scoped | done |
| T-2 | Add `payment-report-filters.ts` as the one validator both routes import | Type-check; the API spec asserts list and export reject the same bad range | done |
| T-3 | Add `payment-report-export.service.ts` (CSV via papaparse, XLSX via exceljs, shared column order, summary sheet) | API spec asserts the CSV header row and the XLSX ZIP magic bytes | done |
| T-4 | Add `GET /api/admin/payment-reports` with swagger JSDoc and the admin guard | `apps/web-e2e/tests/api/admin-payment-reports-query.spec.ts` | done |
| T-5 | Add `GET /api/admin/payment-reports/export`, requiring a resolved session so the download is logged | Same spec: no attachment ever reaches an anonymous caller | done |
| T-6 | Add `use-admin-payment-reports.ts` (React Query + blob download that honours the server filename) | Type-check | done |
| T-7 | Add `/admin/payment-reports` with the five filter controls, summary cards, table and breakdowns | `apps/web-e2e/tests/admin/payment-reports.spec.ts` | done |
| T-8 | Add the dashboard-grid card and the profile-menu entry | Admin route coverage matrix | done |
| T-9 | Add `admin.ADMIN_PAYMENT_REPORTS_PAGE` to all 21 locale files | `pnpm run lint`; every locale parses | done |
| T-10 | Add both Playwright specs and register the routes in both coverage matrices | Specs run under `@ever-works/web-e2e` | done |
| T-11 | Record the PDF decision as Q-052-1 with a chosen default | `docs/questions.md` | done |
| T-12 | Spec, plan, tasks, `docs/spec/README.md` row, `docs/log.md` line | Definition of Done checklist in `AGENTS.md` §2 | done |
| T-13 | Group every roll-up BY currency and label each amount with its own, in the API, the page and the XLSX Summary sheet | `admin-payment-reports-query.spec.ts` currency test | done |
| T-14 | Book revenue from `amount_paid`, falling back to `amount` only when it is NULL | A pending subscription no longer counts its scheduled amount as collected | done |
| T-15 | Refuse an export whose filters match more rows than the cap, instead of truncating it | `GET .../export` answers 400 naming the limit | done |
| T-16 | Reject calendar-invalid dates (`2026-02-30`) and fractional pagination on both routes | `admin-payment-reports-query.spec.ts` date + pagination tests | done |
| T-17 | Render a failed read as an error state rather than as an empty report | `LOAD_FAILED` in all 21 locales; `payment-report-error` test id | done |
| T-18 | Escape spreadsheet formulas in the CSV export | `escapeFormulae` on `Papa.unparse`; a customer-supplied `=`-leading value cannot execute in Excel | done |
