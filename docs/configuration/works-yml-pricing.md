---
id: works-yml-pricing
title: works.yml Pricing Configuration
sidebar_label: works.yml Pricing
sidebar_position: 14
---

# `works.yml` Pricing Configuration

A directory's plans, prices and checkout provider live in the **data
repository**, not in the app: the `pricing:` block of `.works/works.yml`. This
page is the complete field reference for that block.

The block is optional. A `works.yml` with no `pricing:` key keeps the
template's built-in plans (`apps/web/lib/types.ts`, `defaultPricingConfig`),
which read their provider IDs from `NEXT_PUBLIC_*` environment variables.
Adding the block replaces those defaults wholesale.

A ready-to-copy example listing every field lives at
`docs/configuration/examples/works-pricing.example.yml`.

## Where it is read

| Step                                | Code                                                                                |
| ----------------------------------- | ----------------------------------------------------------------------------------- |
| `.works/works.yml` is parsed        | `getConfig()` — `apps/web/lib/content.ts`                                           |
| `pricing:` is validated             | `parseWorksPricingConfig()` — `apps/web/lib/config/schemas/works-pricing.schema.ts` |
| The result becomes `config.pricing` | `Config` — `apps/web/lib/content.ts`                                                |
| Defaults fill in when it is absent  | `ConfigProvider` — `apps/web/app/[locale]/config.tsx`                               |
| Plan cards are rendered             | `useMemo` over `config.pricing?.plans` — `apps/web/hooks/use-pricing-section.ts`    |
| The provider is resolved            | `determinePaymentProvider()` — `apps/web/lib/utils/payment-provider.ts`             |

## Top-level fields

```yaml
pricing:
    provider: stripe
    currency: USD
    lemonCheckoutUrl: https://your-store.lemonsqueezy.com/checkout
    plans: { ... }
```

| Field              | Type    | Required | Description                                                                                             |
| ------------------ | ------- | -------- | ------------------------------------------------------------------------------------------------------- |
| `provider`         | enum    | no       | Default checkout gateway. `stripe`, `lemonsqueezy`, `polar`, `solidgate` or `manual`. Case-insensitive. |
| `currency`         | string  | no       | Currency symbol or ISO code shown next to prices (`USD`, `$`, `EUR`).                                   |
| `lemonCheckoutUrl` | string  | no       | LemonSqueezy hosted-checkout URL shared by all plans; a plan-level value wins.                          |
| `plans`            | mapping | **yes**  | `FREE`, `STANDARD` and `PREMIUM` — see below.                                                           |

### `provider: manual`

`manual` says _"display the prices, take payment somewhere else."_

It is **not** the same as omitting `provider`. An omitted provider means
"nothing was declared", and resolution falls back to the Stripe default.
`manual` means the operator declared that this site has **no** gateway, so
the value is carried through resolution and the plan buttons never start an
in-site checkout — clicking one writes this to the **visitor's browser
console** (it is a client-side hook, so it does not appear in server logs)

```text
[PRICING] works.yml sets pricing.provider: manual — no in-site checkout is started for plan "standard". Payment must be collected outside this site.
```

and nothing else happens. Which plan cards render is unchanged: that is still
decided by the LIVE / DEMO logic of
[Spec 044](../spec/044-public-payment-config/spec.md).

Surfaces that act on a subscription some gateway already created — auto-renewal,
the billing portal, the built-in default plans — keep their pre-existing Stripe
default, because `manual` carries no information about a subscription that
already exists.

`manual` is deliberately not a member of the `PaymentProvider` enum, which
only names gateways `PaymentProviderFactory` can instantiate and the
`payment_provider` column stores. It is a separate constant,
`MANUAL_PAYMENT_PROVIDER`, and the union of the two is `PricingProvider`. See
[Payment Configuration](./payment-config.md) for that enum.

Whatever the block says, a signed-in user's own choice under
**Settings → Checkout provider** still takes precedence — that picker only
lists gateways the deployment actually configured, so such a user checks out
through the gateway they picked even on a `manual` site. Everything above
describes the site's default, which is what an anonymous or never-configured
visitor gets.

`manual` does not yet render its own call to action (a "Contact us" button, a
per-plan external URL); that is recorded as Q-046a in
[Open questions](../questions.md).

## Plan fields

Every plan under `plans:` accepts the same fields — the `PricingConfig`
interface in `apps/web/lib/content.ts`, field for field.

Only `id`, `name` and `price` are required. `description` defaults to an empty
string and `annualDiscount` to `0`, so blocks written against the older,
shorter example keep working.

### Identity and display

| Field            | Type        | Description                                                                               |
| ---------------- | ----------- | ----------------------------------------------------------------------------------------- |
| `id`             | string      | **Required.** Plan identifier — use `free`, `standard`, `premium` to match `PaymentPlan`. |
| `name`           | string      | **Required.** Card title.                                                                 |
| `description`    | string      | Card subtitle. Defaults to `''`.                                                          |
| `price`          | number      | **Required.** Amount in the configured currency. Must be a YAML number: `19`, not `"19"`. |
| `annualDiscount` | number      | Percentage off the annual price, `0`–`100`. Defaults to `0`.                              |
| `features`       | string list | Bullet list rendered on the card.                                                         |
| `interval`       | enum        | `daily`, `weekly`, `monthly`, `yearly`, `one-time` or `per-submission`.                   |
| `popular`        | boolean     | Renders the "most popular" ribbon.                                                        |
| `isPremium`      | boolean     | Marks the plan as a paid tier.                                                            |
| `isActive`       | boolean     | Whether the plan can be subscribed to.                                                    |
| `isFeatured`     | boolean     | Highlights the card.                                                                      |
| `disabled`       | boolean     | Renders the card but blocks checkout.                                                     |
| `envKey`         | string      | Key used to correlate the plan with `*_PLAN` environment variables.                       |

### Trial

| Field                     | Type    | Description                                         |
| ------------------------- | ------- | --------------------------------------------------- |
| `trialPeriodDays`         | number  | Free-trial length in days.                          |
| `trialAmountId`           | string  | Provider price ID charged as a trial authorisation. |
| `trialAmount`             | number  | Amount of that authorisation.                       |
| `isAuthorizedTrialAmount` | boolean | Whether the trial authorisation is collected.       |

### Provider IDs

| Field                 | Type   | Provider                                    |
| --------------------- | ------ | ------------------------------------------- |
| `stripeProductId`     | string | Stripe product.                             |
| `stripePriceId`       | string | Stripe monthly price.                       |
| `annualPriceId`       | string | Stripe annual price.                        |
| `lemonProductId`      | string | LemonSqueezy product.                       |
| `lemonVariantId`      | string | LemonSqueezy variant.                       |
| `lemonCheckoutUrl`    | string | LemonSqueezy hosted checkout for this plan. |
| `polarFreePlanId`     | string | Polar plan ID for the free tier.            |
| `polarStandardPlanId` | string | Polar plan ID for the standard tier.        |
| `polarPremiumPlanId`  | string | Polar plan ID for the premium tier.         |
| `polarProductId`      | string | Polar product backing this plan.            |

Keys the running template does not recognise are preserved rather than
rejected, so a `works.yml` written for a newer template still loads.

## Plan keys

The three keys are `FREE`, `STANDARD` and `PREMIUM`, matching `PaymentPlan`.

`PRO` is accepted as an **alias** for `STANDARD` — configs written against the
original ticket wording load unchanged, with a warning naming the alias. If
both are present, `STANDARD` wins and `PRO` is ignored. Prefer `STANDARD`.

## Minimal example

```yaml
pricing:
    provider: stripe
    currency: USD
    plans:
        FREE:
            id: free
            name: Free Plan
            description: Access basic features and submit content for free.
            price: 0
            interval: per-submission
            features:
                - List your product
        STANDARD:
            id: standard
            name: Standard Plan
            description: Get more visibility.
            price: 19
            interval: monthly
            annualDiscount: 10
            popular: true
            stripePriceId: price_standard_monthly_xxx
        PREMIUM:
            id: premium
            name: Premium Plan
            description: Maximum exposure.
            price: 49
            interval: monthly
            annualDiscount: 20
            isPremium: true
            stripePriceId: price_premium_monthly_xxx
```

## Validation and errors

The block is validated on read. It is **never fatal**: bad pricing metadata
must not take a directory offline.

- **Valid** — used as-is.
- **Invalid** — a `[CONTENT] Invalid "pricing" section …` line is logged,
  followed by one `pricing.<path>: <message>` line per problem, and the block
  is dropped so the built-in plans render.
- **Accepted with a note** — a `[CONTENT]` warning for the `PRO` alias or for
  `provider: manual`. These describe what the accepted block does, so they are
  emitted only when the block validates; a rejected block reports errors only.

A typical failure:

```text
[CONTENT] Invalid "pricing" section in .works/works.yml; falling back to the built-in pricing plans:
  - pricing.plans.STANDARD.price: Invalid input: expected number, received string
  - pricing.plans.PREMIUM.interval: Invalid option: expected one of "daily"|"weekly"|"monthly"|"yearly"|"one-time"|"per-submission"
```

Quoting a price (`price: "19"`) is the most common mistake — YAML keeps the
quotes, and a string price fails validation.

Validate a block before committing it:

```bash
pnpm --filter @ever-works/web test:unit
```

The suite parses `docs/configuration/examples/works-pricing.example.yml`, so
the published example can never drift from the schema.

## Related pages

- [Payment Configuration](./payment-config.md) — enums, provider setup, env vars.
- [Payment System](../payment/payment.md) — end-to-end payment architecture.
- [Content Management](../content-management/content-management.md) — the data repository layout.
- [Spec 046](../spec/046-works-yml-pricing-config/spec.md) — why this block is validated.
