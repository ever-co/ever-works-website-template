---
id: tasks-047-email-two-factor-auth
title: Tasks 046 — Email two-factor authentication
sidebar_label: 046 Tasks
---

# Tasks — `047-email-two-factor-auth`

> **Spec:** [`spec.md`](./spec.md)
>
> **Plan:** [`plan.md`](./plan.md)

## Task list

- [x] T-001: add the `twoFactorCodes` table and the two `client_profiles`
      brute-force columns, with migration `0040` and its drizzle snapshot; extend
      the three `ClientProfileWithAuth` projections.
- [x] T-002: write the pure primitives in `lib/auth/two-factor-code.ts` —
      CSPRNG code generation, SHA-256 hashing, constant-time digest comparison,
      TTL / lockout arithmetic, all env-overridable.
- [x] T-003: write the stateful helpers in `lib/auth/two-factor.ts` —
      `getTwoFactorAccountState`, `canEnableTwoFactor`, `setTwoFactorEnabled`,
      `issueTwoFactorCode` (rotate-on-issue + sweep), `verifyTwoFactorCode`.
- [x] T-004: branded `lib/mail/templates/two-factor-code.ts` and wire
      `sendTwoFactorTokenEmail` to it without breaking its old signature.
- [x] T-005: `POST /api/auth/security/2fa/enable` and `/disable` with session
      auth, tenant scoping, the OAuth guard and activity logging.
- [x] T-006: extend `GET /api/auth/security/settings` with `canEnableTwoFactor`,
      `authMethod`, `accountLockedUntil`, and real `loginAttemptsCount` /
      `accountLocked`.
- [x] T-007: `POST /api/auth/2fa/resend` — password-checked, enumeration-safe,
      rate limited per IP and per email.
- [x] T-008: `TWO_FACTOR_*` error codes plus the authoritative gate in the
      NextAuth `authorize` callback.
- [x] T-009: the 2FA leg of `signInAction` (issue on first submit, verify without
      consuming on the second).
- [x] T-010: the code step in `credentials-form.tsx` — numeric input, countdown,
      resend, back, distinct messages, reCAPTCHA gating.
- [x] T-011: `two-factor-card.tsx` plus `useEnableTwoFactor` /
      `useDisableTwoFactor`, mounted on `/client/settings/security`.
- [x] T-012: `settings.SECURITY_PAGE.TWO_FACTOR.*` and `auth.TWO_FACTOR.*` in all
      21 locale files.
- [x] T-013: unit spec for the pure primitives; Playwright specs for the login
      flow and the API contract; the `two-factor-db` test helper.
- [x] T-014: document the four env vars in `.env.example`,
      `docs/authentication/two-factor-auth.md`, this spec trio, the spec index,
      `docs/log.md`, and Q-047a / Q-047b.
- [x] T-015 (review follow-up): key the code digest with an HMAC under
      `TWO_FACTOR_CODE_SECRET` / `AUTH_SECRET` so a database dump cannot reverse
      the 10^6 code space; scope the linked-account lookup by tenant; increment
      the failure counter in the database and derive the lock from the
      serialized result; consume the code conditionally on `consumed_at IS NULL`;
      refuse to enable when no mail provider is configured.
- [x] T-016 (review follow-up): validate both operands as hex before
      `timingSafeEqual` (an empty decode made any two non-hex strings compare
      equal); reserve-and-refund the password budget so a `code` parameter
      cannot widen it; accept legacy `type: 'email'` / NULL-tenant credential
      rows; normalize an expired lock on read; move the issuance cap into the
      database so it holds across instances; purge pending codes on enable as
      well as disable; charge the resend per-address budget only after the
      password verifies; equalise unknown-account timing; take only the first
      `x-forwarded-for` address; reject a `MockEmailProvider` fallback in the
      mail-configured check; list the 2FA audit events in the security activity
      feed; show the OAuth notice only for genuinely OAuth-only accounts; clear
      the spent captcha token and the rejected code in the sign-in form; and
      clear the `serverClient` GET cache after a 2FA mutation.
- [x] T-017 (review follow-up): serialize per-user code issuance behind a
      `pg_advisory_xact_lock` inside a transaction, so the database-backed
      issuance cap holds under concurrency; and consult the per-address resend
      budget only after the account, password and 2FA flag have checked out, so
      its 429 cannot signal that an address exists and has had recent
      authenticated activity.

## Acceptance Criteria → Task Map

| AC | Jira | Tasks |
| --- | --- | --- |
| AC-1 | EW-136 | T-011, T-012 |
| AC-2 | EW-137 | T-001, T-003, T-005 |
| AC-3 | EW-138 | T-001, T-002, T-003, T-004, T-009 |
| AC-4 | EW-139 | T-008, T-009, T-010, T-012 |
| AC-5 | EW-140 | T-002, T-003, T-007, T-010 |
| AC-6 | EW-141 | T-001, T-002, T-003, T-006, T-007 |
| AC-7 | EW-142 | T-003, T-005, T-006, T-011 |
| AC-8 | — | T-012 |
| AC-9 | — | T-015, T-016 |
| AC-10 | — | T-016 |

## Verification

```bash
pnpm run lint                      # 0 errors
(cd apps/web     && npx tsc --noEmit)
(cd apps/web-e2e && npx tsc --noEmit)
pnpm run build:web                 # the check CI actually gates on
# Requires a database and a running app:
pnpm --filter @ever-works/web-e2e exec playwright test tests/unit/two-factor-code.spec.ts
pnpm --filter @ever-works/web-e2e exec playwright test tests/auth/two-factor-login.spec.ts
```
