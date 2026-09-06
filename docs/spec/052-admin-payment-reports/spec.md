---
id: spec-052-admin-payment-reports
title: Spec 052 — Admin payment reports and export
sidebar_label: 047 Admin payment reports
---

# Feature spec — `052-admin-payment-reports`

## 1. Summary

An admin can filter the site's payment records by date range, plan, provider and
status at `/admin/payment-reports`, see the revenue roll-ups for that filter set,
and export exactly the same rows as CSV or XLSX.

Amounts here are **major units** throughout: `subscriptions.amount*` are written
through `convertCentsToDecimal`, so the report reads and exports them as stored.
Revenue is `amount_paid` and falls back to the scheduled `amount` only when
`amount_paid` is genuinely NULL — a paid amount of 0 is a real answer for a
pending or failed subscription, and treating it as missing would book unpaid
subscriptions as revenue.

## 2. Motivation

The template had no way to answer "how much did we take last quarter, and on which
plan?". `/admin/reports` is content moderation; the only admin export is directory
items; the only payment CSV is a customer's own invoice list on their billing page.
`AnalyticsExportService` covers user-growth data and has no route calling it. An
operator asked for revenue numbers had to open a provider dashboard per provider
and reconcile by hand.

Jira: [EW-117](https://evertech.atlassian.net/browse/EW-117).

## 3. Goals

- Filter the stored payment records by date range, plan, provider and status.
- Show revenue roll-ups — by currency, plan, provider and status — for the same
  filter set.
- Export those rows as a file a stakeholder can open in a spreadsheet.
- Cover every configured provider at once, from local data.

## 4. Non-Goals

- **PDF.** The repository carries no PDF generation dependency; adding one is a
  dependency decision recorded in `docs/questions.md` (Q-052-1), not a silent
  side effect of this feature.
- Pulling live rows from a provider API (a `?source=provider` follow-up).
- Scheduled or emailed reports.
- Editing payment records from the report.

## 5. User Stories

As an admin, I want to filter payments by date and plan so that I can answer a
revenue question without opening a provider dashboard.

As an admin, I want to export the filtered rows so that I can share the numbers
with a stakeholder who does not have admin access.

## 6. Acceptance Criteria

- [x] AC-1: a "Payment Reports" entry exists in the admin dashboard grid and in
      the admin profile menu, pointing at `/admin/payment-reports`.
- [x] AC-2: the report can be filtered by date range (`from` / `to`), plan,
      provider and status, and by a free-text search over customer email and the
      provider identifiers.
- [x] AC-3: the page shows total revenue, transaction count, and breakdowns by
      plan, provider and status for the current filter set.
- [x] AC-4: the same filter set can be exported as CSV and as XLSX, delivered as
      a download with a timestamped filename.
- [x] AC-5: the JSON view and the export parse their filters through one shared
      validator, so an export always matches the table it came from.
- [x] AC-6: an unsupported format (including `pdf`) is rejected with a 400 naming
      the supported formats, never a 500 or an empty file; and an export whose
      filters match more rows than the 10,000-row cap is refused with a 400 rather
      than delivered silently truncated.
- [x] AC-8: every roll-up is grouped BY currency and every amount is labelled with
      its own, so a site charging in more than one currency never sees unlike
      amounts added together; and a failed read renders as an error, never as an
      empty report.
- [x] AC-7: both routes are admin-gated, and the export additionally requires a
      resolved session because it records the download in the activity log.

## 7. Out-of-Scope Considerations

A bare `to=YYYY-MM-DD` is widened to the end of that UTC day, because a report
"to 2026-01-31" that silently dropped everything charged on the 31st would be
worse than no report. The export is capped at 10,000 rows so a broad filter can
never stream an unbounded result set into memory.

## 8. UX Notes

Summary cards, then five filter controls in one row, then a paginated table, then
the breakdown lists. Export is two buttons (CSV, XLSX) in the page header, so the
format is an explicit choice rather than a hidden default. Every control carries a
stable `id` or `data-testid` so the e2e specs assert on structure, not copy.

All copy is `next-intl` under `admin.ADMIN_PAYMENT_REPORTS_PAGE`, present in all
21 locale files.

## 9. Data & API Surface

Reads the existing `subscriptions` table joined to `users`; no schema change. The
collected amount for a row is `coalesce(amount_paid, amount, 0)` — note the
absence of a `nullif(amount_paid, 0)`: a paid amount of 0 is a real answer for a
pending or failed subscription, and treating it as missing would book unpaid
subscriptions as revenue.

Amounts are stored and exported in MAJOR units, because `subscriptions.amount*`
are written through `convertCentsToDecimal`. The export therefore does not divide;
doing so would have shipped every stakeholder a report showing 1% of real revenue.

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/admin/payment-reports` | GET | Rows + summary + pagination (JSON) |
| `/api/admin/payment-reports/export` | GET | `?format=csv\|xlsx` download |

Filters (`from`, `to`, `planId`, `status`, `provider`, `search`) are parsed by
`lib/services/payment-report-filters.ts`, imported by both routes. It lives outside
the route files because a Next.js `route.ts` may only export route handlers.

The export reads ONE snapshot and derives everything from it. The rows written to
the file are also the input to the file's summary (`summarizePaymentRecords`), and
the over-cap refusal is decided by that same read — the route asks for
`MAX_EXPORT_ROWS + 1` rows, and the extra row, never exported, is what proves the
overflow. Counting in a separate statement first left a window in which a payment
inserted between the COUNT and the read pushed the set past the cap: the caller
then received a file truncated at exactly the limit whose summary totalled every
matching row, including the ones missing from the file, with nothing in the file
to reveal the discrepancy.

`page` and `limit` go through the strict pre-check in
`lib/utils/integer-query-param.ts` before the repo's shared
`validatePaginationParams`, exactly as the billing-issues list route does. The
shared validator parses with `parseInt`, so on its own it reads `limit=3.5` as 3
and answers 200 — a report whose row count silently disagrees with the request it
came from is precisely the failure this feature cannot afford, because the number
leaves the site in a file a stakeholder acts on.

## 10. Plugin / Adapter Impact

None. Export uses `papaparse` and `exceljs`, both already dependencies of
`apps/web` (the item export uses them).

## 11. Risks & Open Questions

- Q-052-1 (`docs/questions.md`): PDF export. **Default: not shipped** — no PDF
  library in the repo. `SUPPORTED_EXPORT_FORMATS` is the single place to extend.
- Multi-currency sites get one summary row per currency rather than a converted
  total; converting would need a rate source this template does not have.

## 12. Acceptance Test Plan

Playwright specs `apps/web-e2e/tests/admin/payment-reports.spec.ts` (filters and
both export controls are present for an admin, the CSV button produces a download,
client and anonymous are gated) and
`apps/web-e2e/tests/api/admin-payment-reports-query.spec.ts` (the export never
leaks a file anonymously; list and export reject the same malformed date range;
`format=pdf` is a 400; CSV carries a header row and XLSX is a real ZIP container).
Both routes are added to the coverage matrices.

## 13. References

- Related spec: [004 payment providers](../004-payment-providers/spec.md)
- Related spec: [046 admin billing issues](../051-admin-billing-issues/spec.md)
- Plan: [`plan.md`](./plan.md) · Tasks: [`tasks.md`](./tasks.md)
