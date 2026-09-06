---
id: spec-053-email-two-factor-auth
title: Spec 047 — Email two-factor authentication
sidebar_label: 046 Email 2FA
---

# Feature spec — `053-email-two-factor-auth`

## 1. Summary

Client accounts that registered with an email address and a password can turn on
a second sign-in factor. Once it is on, every credentials sign-in stops after the
password and asks for a six-digit one-time code that was just emailed to the
account address. The code is valid for ten minutes, only its hash is stored, and
five wrong codes lock verification for fifteen minutes.

Jira: [EW-135](https://evertech.atlassian.net/browse/EW-135) (epic) with children
EW-136 … EW-142.

## 2. Motivation

A stolen or reused password is the single most common way a directory account is
taken over, and the template shipped no second factor at all: `client_profiles`
already carried a `two_factor_enabled` boolean and the security page already
rendered an "Enabled / Disabled" badge for it, but nothing ever wrote the column
and no sign-in path ever asked for anything beyond the password. The badge was,
in effect, decoration.

Email is the right first factor to add here because every client account already
has an address on file and the template already ships a mail provider abstraction
(Nodemailer / Resend behind `lib/mail`). It needs no new dependency, no new
device, and no new enrolment ceremony.

## 3. Goals

- A client can enable and disable email 2FA from `/client/settings/security`.
- With 2FA on, a one-time code is emailed on **every** credentials sign-in and
  the session is issued only after that code is verified.
- The code expires after ten minutes and can be re-requested.
- Failed verifications are counted and the account is temporarily locked after
  five, then reset on success or expiry.
- OAuth-only sign-ups cannot enable it and are told why, in the UI **and** at the
  API boundary.
- The plaintext code is never persisted, is stored only as a keyed digest, and
  is never compared with `===`.

## 4. Non-Goals

- TOTP authenticator apps, SMS, WebAuthn, or recovery codes. Email is the only
  factor in this spec; the surface is deliberately shaped so a second method can
  be added later without changing the sign-in step machine.
- 2FA for **admin** users. The flag, the counters and the settings surface all
  live on `client_profiles`; an admin `users` row has no profile. See
  [Q-047a](../../questions.md).
- Rate limiting shared across pods. The template's `ratelimit()` helper is
  in-memory by design; the authoritative brute-force guard in this spec is the
  per-account counter in the database, which is shared.
- Re-authentication (asking for the password again) before toggling the factor.

## 5. User Stories

As a directory member who signed up with an email and password, I want a second
step at sign-in so that a leaked password alone does not give someone my account.

As that same member, I want to request a new code when the first one expires or
never arrives, so a slow inbox does not lock me out of my own account.

As a member who signed up with Google or GitHub, I want to be told plainly why
the email-2FA switch does nothing for me, rather than to be shown a control that
fails when I use it.

As an operator, I want a wrong-code guessing attempt to stop after a handful of
tries without my intervention.

## 6. Acceptance Criteria

- [x] AC-1 (EW-136): `/client/settings/security` has a "Two-Factor
      Authentication" section showing the current status and a switch that turns
      it on and off, laid out like the other security cards and reflowing on
      narrow screens.
- [x] AC-2 (EW-137): `POST /api/auth/security/2fa/enable` and
      `POST /api/auth/security/2fa/disable` persist
      `client_profiles.two_factor_enabled` and require a session. **Enable**
      additionally refuses a non-credentials account; **disable** deliberately
      does not — turning a factor off must always be possible for the account
      that owns it, whatever it signed up with.
- [x] AC-3 (EW-138): with 2FA on, signing in mints a cryptographically random
      six-digit code, stores **only a keyed HMAC-SHA256 of it** with a timestamp
      and the owning user, and emails the plaintext in a branded template that
      states the expiry. The code appears in the message **body only** — never
      in the subject, which leaks to lock-screen previews and to every mail log
      on the path without the message being opened.
- [x] AC-4 (EW-139): the sign-in form asks for that code after the password,
      issues no session until it verifies, offers a resend, and shows distinct
      messages for wrong / expired / locked.
- [x] AC-5 (EW-140): a code older than ten minutes (`TWO_FACTOR_CODE_TTL_MS`) is
      rejected server-side and the user is prompted to request a new one.
- [x] AC-6 (EW-141): five failed verifications (`TWO_FACTOR_MAX_ATTEMPTS`) lock
      code validation for fifteen minutes (`TWO_FACTOR_LOCK_MS`); the counter is
      tracked in the database, survives a resend, and resets on success or code
      expiry. Resends are additionally rate limited per IP and per email.
- [x] AC-7 (EW-142): an OAuth-only account sees the switch disabled with "You
      cannot set up two-factor authentication because you signed up with OAuth."
      and the enable route answers `403` with `code: "OAUTH_ACCOUNT"`.
- [x] AC-9: enabling is refused with `503` `EMAIL_NOT_CONFIGURED` when the
      deployment has no mail provider — including the case where the provider
      factory has silently fallen back to `MockEmailProvider` — so a member
      cannot switch on a factor whose codes could never be delivered.
- [x] AC-10: enabling and disabling 2FA, and the brute-force lockout, appear in
      the account's own security activity list.
- [x] AC-8: every user-visible string exists in all 21 locale files under
      `apps/web/messages/`.

## 7. Out-of-Scope Considerations

`GET /api/auth/security/settings` previously returned hardcoded
`loginAttemptsCount: 0` and `accountLocked: false` while the security overview
rendered them as if they were real. This spec wires those two fields to the new
2FA brute-force state rather than leaving a component reading placeholders; it
does not introduce a general failed-password counter, which would be a separate
change to the credentials path.

The `twoFactorCodes.attempts` column counts failures against one specific code.
It is an audit aid — the enforcement counter is the per-account one on
`client_profiles`, because that is the one that must survive code rotation.

Residual, accepted: the resend route's *success* path does more work (mint,
store, send) than its miss paths, so response time still carries a weak signal
about whether an address exists with 2FA on, even though the unknown-account
path now burns a comparable password comparison. Closing it properly means
deferring the send off the request, which is a queueing change rather than a
2FA one.

## 8. UX Notes

- The code step replaces the password field in place rather than navigating: the
  email input stays visible but read-only so the user can see which account is
  being signed into, and a "Use a different account" link returns to step one.
- `TWO_FACTOR_REQUIRED` is rendered as a neutral blue notice, not a red error —
  it is an instruction, not a failure.
- A countdown shows the remaining validity of the current code. It is
  informational; the ten-minute window is enforced server-side.
- reCAPTCHA, when configured, gates the password step only. Its tokens are
  single-use, so re-verifying on the code submit would always fail.
- The disabled switch for OAuth accounts keeps an amber notice in the same style
  as the existing "no password set" notice on the connected-accounts card.
