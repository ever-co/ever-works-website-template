---
id: tasks-046-works-yml-pricing-config
title: Tasks 046 — Provider-aware pricing configuration in works.yml
sidebar_label: 046 Tasks
---

# Tasks — `046-works-yml-pricing-config`

> **Spec:** [`spec.md`](./spec.md)
>
> **Plan:** [`plan.md`](./plan.md)

## Task list

- [x] T-001: add `works-pricing.schema.ts` mirroring `PricingConfig` /
      `PricingPlanConfig`, with loose objects, minimal required fields and
      defaults for the two fields the previous published example omitted.
- [x] T-002: accept `manual` alongside the shipped gateways, case-insensitively,
      and carry it through parsing as a value distinct from "no provider
      declared".
- [x] T-003: accept `PRO` as an alias for the `STANDARD` plan key, preferring
      `STANDARD` when both are present.
- [x] T-004: add the compile-time contract-coverage constant so a new interface
      field cannot be forgotten in the schema.
- [x] T-005: call the schema from `getConfig()`; log every problem as
      `pricing.<path>: <message>` and fall back to the built-in plans.
- [x] T-006: publish `docs/configuration/examples/works-pricing.example.yml`
      with every field for all three plans.
- [x] T-007: write the `node:test` suite, including parsing the published
      example so it cannot drift.
- [x] T-008: add `test:unit` (web + root + turbo) and run it in `Web CI`, which
      also enforces the previously-unrun spec-045 assertions.
- [x] T-009: write `docs/configuration/works-yml-pricing.md`, list it in the
      docs sidebar, and cross-link it from `payment-config.md` and
      `payment.md`.
- [x] T-010: record the open manual-checkout UX question in
      `docs/questions.md`.
- [x] T-012: gate the checkout flow on `manual` — `MANUAL_PAYMENT_PROVIDER` /
      `PricingProvider` in `lib/constants/payment.ts`, `determinePaymentProvider()`
      carrying the value, `isManualPaymentProvider()` / `resolveGatewayProvider()`
      in `lib/utils/payment-provider.ts`, an early return in `handleCheckout()`,
      and gateway narrowing at the four surfaces that must name one.
- [x] T-013: cover the resolution rules in
      `apps/web/lib/utils/__tests__/payment-provider.spec.ts`.
- [ ] T-011: merge the PR and, separately, add a `pricing:` block to the
      canonical data repositories if the operator wants one there.

## Acceptance Criteria → Task Map

| AC   | Tasks                      |
| ---- | -------------------------- |
| AC-1 | T-001, T-004, T-006, T-007 |
| AC-2 | T-006, T-007, T-008        |
| AC-3 | T-002, T-007, T-009        |
| AC-4 | T-003, T-006, T-007, T-009 |
| AC-5 | T-005, T-007, T-009        |
| AC-6 | T-001, T-005, T-007        |
| AC-7 | T-002, T-012, T-013        |

## Verification

```bash
pnpm --filter @ever-works/web test:unit   # 45 tests pass; 28 of them new (20 + 8)
pnpm run lint
pnpm --filter @ever-works/web exec tsc --noEmit
pnpm run build:web
```

## Rollback

Revert the PR. No data, schema or environment change is involved.
