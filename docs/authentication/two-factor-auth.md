---
id: two-factor-auth
title: Email Two-Factor Authentication
sidebar_label: Two-Factor Auth
sidebar_position: 6
---

# Email Two-Factor Authentication

Client accounts that registered with an email address and a password can add a
second sign-in step: a six-digit code emailed to the account address on every
sign-in. It is off by default and each member turns it on for themselves.

Specification: [Spec 047](../spec/047-email-two-factor-auth/spec.md).

## For members

### Turning it on

1. Go to **Settings → Security** (`/client/settings/security`).
2. In the **Two-Factor Authentication** card, flip the switch.

The card shows the current status and, for accounts created through Google,
GitHub, Facebook or X, a notice explaining that email 2FA is not available:

> You cannot set up two-factor authentication because you signed up with OAuth.

An OAuth account has no password, so a second factor on top of one would never be
satisfiable. Turning 2FA **off** is always allowed for whoever owns the account.

### Signing in with it on

1. Enter your email and password as usual.
2. The form asks for the six-digit code that was just emailed to you.
3. Enter it. You are signed in only after it is accepted.

The code is valid for **10 minutes**. A countdown is shown; when it runs out,
use **Send a new code**. Requesting a new code invalidates the previous one, so
always use the newest email.

After **5** wrong codes, verification is blocked for **15 minutes**. The block
clears by itself — no support ticket is needed. A correct code resets the
counter, and so does letting a code expire.

## For operators

### Configuration

All four settings are optional; the defaults match the specification.

| Variable | Default | Meaning |
| --- | --- | --- |
| `TWO_FACTOR_CODE_SECRET` | `AUTH_SECRET` | Key the codes are hashed under; rotating it invalidates codes in flight |
| `TWO_FACTOR_CODE_TTL_MS` | `600000` (10 min) | How long a code stays valid |
| `TWO_FACTOR_MAX_ATTEMPTS` | `5` | Failed verifications before a lockout |
| `TWO_FACTOR_LOCK_MS` | `900000` (15 min) | How long that lockout lasts |

The three numeric settings accept a **positive whole number** only. Anything
else — a fraction, zero, a negative, a non-number, or a value past
`Number.MAX_SAFE_INTEGER` — falls back to the default shown above rather than
being coerced. That is deliberate: coercing `0.5` down to `0` would have made
every code expire the instant it was minted, or locked an account on its first
wrong digit, from a typo the operator could not see.

A working mail provider is required — the same one the rest of the template uses
(`SMTP_*` for Nodemailer, or `RESEND_API_KEY`; see
[Setup Guide](./setup-guide.md)). When no provider is configured the sign-in form
reports that the code could not be sent instead of stranding the user on a step
no email will ever satisfy.

### Unlocking an account by hand

```sql
UPDATE client_profiles
   SET two_factor_failed_attempts = 0,
       two_factor_locked_until = NULL
 WHERE email = 'member@example.com';
```

To turn the factor off for someone who has lost access to their inbox, set
`two_factor_enabled = false` on the same row.

## For developers

### Where the code lives

| Concern | File |
| --- | --- |
| Code generation, hashing, expiry / lockout arithmetic (pure) | `apps/web/lib/auth/two-factor-code.ts` |
| Issue / verify / enable / disable against the database | `apps/web/lib/auth/two-factor.ts` |
| Authoritative sign-in gate | `apps/web/lib/auth/credentials.ts` |
| Sign-in server action (specific error messages) | `apps/web/app/[locale]/auth/actions.ts` |
| Code step in the form | `apps/web/app/[locale]/auth/components/credentials-form.tsx` |
| Settings card | `apps/web/components/settings/security/two-factor-card.tsx` |
| Email template | `apps/web/lib/mail/templates/two-factor-code.ts` |

### API

| Route | Method | Notes |
| --- | --- | --- |
| `/api/auth/security/2fa/enable` | `POST` | Session required. `403` + `code: "OAUTH_ACCOUNT"` for OAuth-only accounts |
| `/api/auth/security/2fa/disable` | `POST` | Session required. No OAuth guard — turning a factor off is always allowed |
| `/api/auth/2fa/resend` | `POST` | Body `{ email, password }`. `400` for a malformed body, `429` when a resend budget (3 per 10 minutes, per IP and per email) or the per-account issuance budget is spent, `502` when the credentials checked out but the code could not be emailed, `500` on an internal failure. Every outcome that depends on whether the address exists, the password is right or 2FA is on shares one `200` envelope, so the response cannot be used to enumerate addresses — the `429` / `502` answers sit **behind** the password check |
| `/api/auth/security/settings` | `GET` | Now also returns `canEnableTwoFactor`, `authMethod`, `accountLockedUntil` |

Sign-in errors surface as `AuthErrorCode.TWO_FACTOR_REQUIRED`, `_INVALID`,
`_EXPIRED`, `_LOCKED` and `_SEND_FAILED`, each mapped to an `auth.TWO_FACTOR.*`
message.

Code **issuance** is itself capped at 6 per 10 minutes per account inside
`issueTwoFactorCode`, so the cap applies to the sign-in action, the NextAuth
`authorize` callback and the resend route alike — including a request posted
directly to `/api/auth/callback/credentials`. On the two **sign-in** paths
exceeding it surfaces as `AuthErrorCode.RATE_LIMITED`; the resend route answers
`429`, and a send that fails after the credentials check answers `502`. Neither
is an enumeration signal: both sit behind the account, password and 2FA-flag
checks — the same point the per-address `429` already sits at — so only somebody
who already holds the password can reach them. Answering the generic `200`
there was worse than a leak: the sign-in form reads it as "a new code is on its
way", resets its countdown and clears the code box, so the user ends up waiting
on an email that will never arrive with no way back to the code they had.

The resend route resolves its tenant like every other session-free `/api`
route. Next middleware does not run for `/api`, so the `x-tenant-domain` header
it injects is absent there — which used to send `getTenantId()` straight to
`TENANT_ID` or the default tenant, so on a host-routed multi-tenant deployment a
resend (and a POST straight to `/api/auth/callback/credentials`) looked the
account up in the wrong tenant and silently sent nothing. `getTenantId()` now
falls back to the request's own `Host` header, which is the same value the proxy
copies into `x-tenant-domain`, so `/api` resolves the tenant the way a page
request does. It can only ever select an **existing** `tenant` row, so an
unrecognised host still falls through to the previous behaviour. See Q-047c.

### Storage

Only a **hex HMAC-SHA256 digest** of the code is written to `twoFactorCodes`,
keyed by `TWO_FACTOR_CODE_SECRET` (falling back to `AUTH_SECRET`); the plaintext
exists solely in the issuing request and the email. The keying matters because
the six-digit space is small enough that a bare SHA-256 could be reversed from a
database dump in about a second — the key lives in the environment, not the
database. Verification re-hashes the submitted value and compares digests with
`crypto.timingSafeEqual`. The brute-force counter lives on `client_profiles`,
not on the code row, so that requesting a new code cannot reset it.

Enabling and disabling are transactional: the `two_factor_enabled` flip and
the purge of pending codes commit together, so a failed purge rolls the flag
change back rather than leaving the factor off with a live code behind it. The
purge runs on **both** transitions, so a code minted before a disable can never
satisfy a sign-in after a later re-enable.

**At most one live code per account**, and the database says so: a partial
unique index (`two_factor_codes_active_user_idx`, on `"userId"` where
`consumed_at IS NULL`) enforces it. Verification reads the newest unconsumed row
and treats it as *the* code, so a second unconsumed row would leave a stale code
quietly valid behind the one the member was just emailed. `issueTwoFactorCode`
upholds the invariant by marking earlier rows consumed inside a transaction
guarded by a per-user `pg_advisory_xact_lock`; the index is the same statement
made where a future code path cannot skip it. Consumed rows stay unconstrained —
they are kept because the per-account issuance budget counts them.

Because there is no column holding a usable code, the e2e helper
(`apps/web-e2e/helpers/two-factor-db.ts`) recovers one by hashing the six-digit
space **under the same key** against the stored digest — which doubles as a
standing assertion that the column really is a keyed hash: without the secret,
the search finds nothing.

Enabling 2FA is refused with `503` `EMAIL_NOT_CONFIGURED` on a deployment with
no mail provider, because a code that can never be delivered would lock the
member out at their next sign-in.
