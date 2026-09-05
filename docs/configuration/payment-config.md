---
id: payment-config
title: "Payment Configuration"
sidebar_label: "Payment"
sidebar_position: 12
---

# Payment Configuration

The template supports multiple payment providers and flexible billing workflows. This reference covers every payment-related constant, enum, and configuration option.

## Payment Constants

All core payment enums and types are defined in `lib/constants/payment.ts`. This file is intentionally kept separate from the main config module so it can be imported in scripts that run outside the Next.js runtime (migrations, seeds, CLI tools).

### PaymentFlow

Determines when payment is collected relative to the submission process.

```typescript
export enum PaymentFlow {
  PAY_AT_START = 'pay_at_start',
  PAY_AT_END = 'pay_at_end',
}
```

| Value | Description |
|-------|-------------|
| `pay_at_start` | User pays before submitting; item is published immediately |
| `pay_at_end` | User submits first; payment is collected after admin approval |

### PaymentStatus

Tracks the state of a payment attempt.

```typescript
export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
}
```

### PaymentInterval

Billing frequency options.

```typescript
export enum PaymentInterval {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  ONE_TIME = 'one-time',
  PER_SUBMISSION = 'per-submission',
}
```

### PaymentPlan

Available subscription tiers.

```typescript
export enum PaymentPlan {
  FREE = 'free',
  STANDARD = 'standard',
  PREMIUM = 'premium',
}
```

### PaymentProvider

Supported payment gateways.

```typescript
export enum PaymentProvider {
  STRIPE = 'stripe',
  SOLIDGATE = 'solidgate',
  LEMONSQUEEZY = 'lemonsqueezy',
  POLAR = 'polar',
}
```

## Payment Configuration Schema

Defined in `lib/config/schemas/payment.schema.ts` and validated at startup with Zod.

### Product Pricing (Display Values)

```typescript
pricing: {
  free: number;       // Default: 0
  standard: number;   // Default: 10
  premium: number;    // Default: 20
}
```

| Env Var | Field | Default |
|---------|-------|---------|
| `NEXT_PUBLIC_PRODUCT_PRICE_FREE` | `pricing.free` | `0` |
| `NEXT_PUBLIC_PRODUCT_PRICE_STANDARD` | `pricing.standard` | `10` |
| `NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM` | `pricing.premium` | `20` |

### Trial Configuration

| Env Var | Field | Description |
|---------|-------|-------------|
| `NEXT_PUBLIC_STANDARD_TRIAL_AMOUNT_ID` | `trial.standardTrialAmountId` | Price ID for standard trial |
| `NEXT_PUBLIC_PREMIUM_TRIAL_AMOUNT_ID` | `trial.premiumTrialAmountId` | Price ID for premium trial |
| `NEXT_PUBLIC_AUTHORIZED_TRIAL_AMOUNT` | `trial.authorized` | Enable trial amounts (`true`/`false`) |

## Plans in `works.yml`

The schema above configures the payment **integration** from environment
variables. The **plans a visitor sees** — names, prices, features, provider
IDs — come from the data repository instead, in the optional `pricing:` block
of `.works/works.yml`.

```yaml
pricing:
  provider: stripe # stripe | lemonsqueezy | polar | solidgate | manual
  currency: USD
  plans:
    FREE: { id: free, name: Free Plan, price: 0 }
    STANDARD: { id: standard, name: Standard Plan, price: 19 }
    PREMIUM: { id: premium, name: Premium Plan, price: 49 }
```

Omit the block and the built-in plans in `lib/types.ts`
(`defaultPricingConfig`) are used, exactly as before. When present, it is
validated by `lib/config/schemas/works-pricing.schema.ts`; a malformed block
is logged field by field and then ignored in favour of those defaults.

`provider: manual` declares that this site has no gateway — prices are
displayed and no in-site checkout is started, so payment is collected
elsewhere. Omitting `provider` is not the same thing: that falls back to the
Stripe default.

Full field reference:
[works.yml Pricing Configuration](./works-yml-pricing.md). Copy-ready example:
`docs/configuration/examples/works-pricing.example.yml`.

## Provider Setup

### Stripe

Auto-enabled when both `secretKey` and `publishableKey` are present.

| Env Var | Required | Description |
|---------|----------|-------------|
| `STRIPE_SECRET_KEY` | Yes | Server-side API key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Yes | Client-side publishable key |
| `STRIPE_WEBHOOK_SECRET` | Recommended | Webhook signature verification |
| `NEXT_PUBLIC_STRIPE_FREE_PRICE` | No | Price ID for free plan |
| `NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID` | No | Price ID for standard plan |
| `NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID` | No | Price ID for premium plan |
| `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING` | No | Set `true` to fetch prices from Stripe API |

### LemonSqueezy

Auto-enabled when both `apiKey` and `storeId` are present.

| Env Var | Required | Description |
|---------|----------|-------------|
| `LEMONSQUEEZY_API_KEY` | Yes | API key from LemonSqueezy dashboard |
| `LEMONSQUEEZY_STORE_ID` | Yes | Your store identifier |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Recommended | Webhook signature verification |
| `LEMONSQUEEZY_WEBHOOK_URL` | No | Override webhook endpoint URL |
| `LEMONSQUEEZY_TEST_MODE` | No | Set `true` for test mode |
| `LEMONSQUEEZY_VARIANT_ID` | No | Default variant ID |

### Polar

Auto-enabled when both `accessToken` and `organizationId` are present.

| Env Var | Required | Description |
|---------|----------|-------------|
| `POLAR_ACCESS_TOKEN` | Yes | API access token |
| `POLAR_ORGANIZATION_ID` | Yes | Organization identifier |
| `POLAR_WEBHOOK_SECRET` | Recommended | Webhook signature verification |
| `POLAR_SANDBOX` | No | Set `false` for production (default: `true`) |
| `POLAR_API_URL` | No | Override API base URL |

### Solidgate

Requires manual environment variable configuration.

| Env Var | Required | Description |
|---------|----------|-------------|
| `SOLIDGATE_API_KEY` | Yes | API key |
| `SOLIDGATE_SECRET_KEY` | Yes | Secret key for signing |
| `SOLIDGATE_WEBHOOK_SECRET` | Yes | Webhook verification |
| `SOLIDGATE_MERCHANT_ID` | Yes | Merchant identifier |
| `NEXT_PUBLIC_SOLIDGATE_PUBLISHABLE_KEY` | No | Client-side key |

## Multi-Currency Billing

Each provider supports per-currency pricing via the billing config modules in `lib/config/billing/`.

### Billing Config Types

```typescript
type CurrencyCode = 'usd' | 'eur' | 'gbp' | 'cad';
type PlanName = 'premium' | 'standard' | 'free';

interface AmountConfig {
  monthly?: string;   // Price/variant ID for monthly billing
  yearly?: string;    // Price/variant ID for yearly billing
  setupFee?: string;  // Optional setup fee price ID
}

interface CurrencyConfig {
  amount: AmountConfig;
  currency?: string;  // ISO 4217 code (e.g., 'USD')
  symbol?: string;    // Display symbol (e.g., '$')
}

type PlanConfig = {
  productId: string | undefined;
} & Partial<Record<CurrencyCode, CurrencyConfig>>;
```

### Supported Currencies

The `SUPPORTED_CURRENCIES` array in `lib/config/billing/types.ts` lists all 32 ISO 4217 codes accepted by the system (USD, EUR, GBP, JPY, CNY, CAD, AUD, CHF, and more).

### Price Resolution Functions

Each provider exports a price config function:

| Provider | Function | Source |
|----------|----------|--------|
| Stripe | `getStripePriceConfig(plan, currency, interval)` | `billing/stripe.config.ts` |
| LemonSqueezy | `getLemonSqueezyPriceConfig(plan, currency, interval)` | `billing/lemonsqueezy.config.ts` |
| Polar | `getPolarPriceConfig(plan, currency, interval)` | `billing/polar.config.ts` |

All functions fall back to USD if the requested currency is not configured.

## Payment Flow Configuration

Defined in `lib/config/payment-flows.ts`, the `PAYMENT_FLOWS` array configures the two payment flow options with their UI properties:

```typescript
interface PaymentFlowConfig {
  id: PaymentFlow;
  title: string;
  subtitle: string;
  description: string;
  icon: string;            // Lucide icon name
  color: string;           // Tailwind gradient classes
  features: string[];      // Feature bullet points
  benefits: Array<{ icon: string; text: string; color: string }>;
  badge?: string;          // Optional badge label
  isDefault?: boolean;     // Whether this is the default flow
}
```

Helper functions:
- `getDefaultPaymentFlow()` -- returns the default `PaymentFlow` value
- `getPaymentFlowConfig(flowId)` -- returns the `PaymentFlowConfig` for a given flow

## Payment Provider Manager

The `PaymentProviderManager` class in `lib/payment/config/payment-provider-manager.ts` provides singleton access to provider instances:

```typescript
// Get a specific provider
const stripe = PaymentProviderManager.getStripeProvider();
const ls = PaymentProviderManager.getLemonsqueezyProvider();
const polar = PaymentProviderManager.getPolarProvider();
const sg = PaymentProviderManager.getSolidgateProvider();

// Or use the generic function
import { getOrCreateProvider } from '@/lib/payment/config/payment-provider-manager';
const provider = getOrCreateProvider('stripe');
```

## Related Pages

- [works.yml Pricing Configuration](./works-yml-pricing.md) -- the `pricing:` block in the data repository
- [Payment Types](../types/payment-types.md) -- type definitions for payment operations
- [Subscription Types](../types/subscription-types.md) -- subscription lifecycle types
- [Environment Reference](./environment-reference.md) -- full environment variable listing
