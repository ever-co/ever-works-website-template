---
id: payment-overview
title: Payment Integration Overview
sidebar_label: Integration Guide
sidebar_position: 1.5
---

# Payment Integration Overview

This guide provides a hands-on walkthrough of the Ever Works payment system. It covers the provider abstraction layer, how to configure each provider, the checkout and subscription lifecycle, feature gating, and webhook handling.

## Provider Architecture at a Glance

The payment system is built on a **provider-agnostic abstraction**. Every payment provider implements the same `PaymentProviderInterface`, and a factory pattern lets you switch providers without changing application code.

```
lib/payment/
  index.ts                          # Public API exports
  config/
    provider-configs.ts             # Provider configuration factory
    payment-provider-manager.ts     # Singleton manager + ConfigManager
    validation.ts                   # Input validation utilities
  guards/
    feature.guard.tsx               # Plan-based feature gating
  hooks/
    use-payment.tsx                 # React context + usePayment hook
  lib/
    payment-provider-factory.ts     # Factory for creating providers
    payment-service.ts              # Service wrapping the active provider
    payment-service-manager.ts      # Singleton for service lifecycle
    providers/
      stripe-provider.ts
      lemonsqueezy-provider.ts
      polar-provider.ts
      solidgate-provider.ts
    client/
      payment-account-client.ts     # Client-side account API
    utils/
      prices.ts                     # Price formatting utilities
      polar-subscription-helpers.ts
  services/
    payment-email.service.ts        # Email notifications on payment events
  types/
    payment-types.ts                # Core type definitions
    payment.ts                      # Payment flow and submission types
  ui/
    stripe/stripe-elements.tsx
    lemonsqueezy/lemonsqueezy-elements.tsx
    polar/polar-elements.tsx
    solidgate/solidgate-elements.tsx
```

### Supported Providers

| Provider     | One-Time Payments | Subscriptions | Trials | Webhooks | Merchant of Record |
|-------------|:-:|:-:|:-:|:-:|:-:|
| Stripe       | Yes | Yes | Yes | Yes | No  |
| LemonSqueezy | Yes | Yes | Yes | Yes | Yes |
| Polar        | Yes | Yes | Yes | Yes | No  |
| Solidgate    | Yes | Yes | No  | Yes | No  |

## Core Interfaces

### PaymentProviderInterface

Every provider implements this interface, defined in `lib/payment/types/payment-types.ts`:

```typescript
// lib/payment/types/payment-types.ts
export interface PaymentProviderInterface {
  // Payment operations
  createPaymentIntent(params: CreatePaymentParams): Promise<PaymentIntent>;
  confirmPayment(paymentId: string, paymentMethodId: string): Promise<PaymentIntent>;
  verifyPayment(paymentId: string): Promise<PaymentVerificationResult>;
  createSetupIntent(user: User | null): Promise<SetupIntent>;

  // Subscription management
  createCustomer(params: CreateCustomerParams): Promise<CustomerResult>;
  createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionInfo>;
  cancelSubscription(subscriptionId: string, cancelAtPeriodEnd?: boolean): Promise<SubscriptionInfo>;
  updateSubscription(params: UpdateSubscriptionParams): Promise<SubscriptionInfo>;
  hasCustomerId(user: User | null): boolean;
  getCustomerId(user: User | null): Promise<string | null>;

  // Webhooks
  handleWebhook(payload: any, signature: string, rawBody?: string,
                timestamp?: string, webhookId?: string): Promise<WebhookResult>;

  // Refunds
  refundPayment(paymentId: string, amount?: number): Promise<any>;

  // Client-side configuration
  getClientConfig(): ClientConfig;
  getUIComponents(): UIComponents;
}
```

### Key Data Types

```typescript
// Subscription statuses
export enum SubscriptionStatus {
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired',
  TRIALING = 'trialing',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  UNPAID = 'unpaid',
}

// Payment types
export enum PaymentType {
  ONE_TIME = 'one_time',
  SUBSCRIPTION = 'subscription',
  FREE = 'free',
}

// Supported providers
export type SupportedProvider = 'stripe' | 'solidgate' | 'lemonsqueezy' | 'polar';
```

## Quick Setup

### Step 1: Set Environment Variables

Each provider requires API keys and webhook secrets. Add them to `.env.local`:

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# LemonSqueezy
LEMONSQUEEZY_API_KEY=...
LEMONSQUEEZY_WEBHOOK_SECRET=...
LEMONSQUEEZY_STORE_ID=...

# Polar
POLAR_ACCESS_TOKEN=...
POLAR_WEBHOOK_SECRET=...
POLAR_ORGANIZATION_ID=...

# Solidgate
SOLIDGATE_API_KEY=...
SOLIDGATE_SECRET_KEY=...
SOLIDGATE_WEBHOOK_SECRET=...
SOLIDGATE_MERCHANT_ID=...
NEXT_PUBLIC_SOLIDGATE_PUBLISHABLE_KEY=...
```

### Step 2: Configure Pricing Plans

Pricing plans are defined in your `.content/.works/works.yml`:

```yaml
pricing:
  provider: stripe          # Default provider
  currency: USD
  plans:
    FREE:
      id: free
      name: Free
      description: Basic access
      price: 0
      features:
        - "List your product"
        - "Basic analytics"
    STANDARD:
      id: standard
      name: Standard
      description: Enhanced features
      price: 9
      stripePriceId: price_xxx
      annualDiscount: 20
      features:
        - "Everything in Free"
        - "Priority listing"
        - "Advanced analytics"
    PREMIUM:
      id: premium
      name: Premium
      description: Full access
      price: 29
      stripePriceId: price_yyy
      annualDiscount: 25
      isPremium: true
      features:
        - "Everything in Standard"
        - "Featured placement"
        - "API access"
```

`provider` sets the site's default. It accepts `stripe`, `lemonsqueezy`,
`polar`, `solidgate` or `manual` — with `manual`, prices are displayed but the
site starts no checkout of its own, so payment is collected outside the
template. That is different from omitting `provider`, which falls back to
Stripe. Both statements describe the default: a signed-in user who has picked a
provider under Settings gets that one instead.
Plan keys are `FREE`, `STANDARD` and `PREMIUM`; `PRO` is accepted as an alias
for `STANDARD`.

The block above is the short form. Every field — trial configuration, Polar
and LemonSqueezy IDs, `isActive` / `isFeatured` / `disabled`, `envKey` — is
documented in
[works.yml Pricing Configuration](../configuration/works-yml-pricing.md), with
a complete copy-ready file at
`docs/configuration/examples/works-pricing.example.yml`.

The block is validated when the config is read. A malformed one is never
fatal: each problem is logged as `pricing.<path>: <message>` and the template
falls back to its built-in plans.

### Step 3: Set Up Webhooks

Each provider has a dedicated webhook endpoint:

| Provider     | Webhook URL                    |
|-------------|-------------------------------|
| Stripe       | `/api/stripe/webhook`         |
| LemonSqueezy | `/api/lemonsqueezy/webhook`  |
| Polar        | `/api/polar/webhook`          |
| Solidgate    | `/api/solidgate/webhook`      |

Configure these URLs in each provider's dashboard, pointing to your deployed domain.

## The PaymentProviderFactory

The factory creates provider instances based on a type string:

```typescript
// lib/payment/lib/payment-provider-factory.ts
export type SupportedProvider = 'stripe' | 'solidgate' | 'lemonsqueezy' | 'polar';

export class PaymentProviderFactory {
  static createProvider(
    providerType: SupportedProvider,
    config: PaymentProviderConfig
  ): PaymentProviderInterface {
    switch (providerType) {
      case 'stripe':
        return new StripeProvider(config);
      case 'solidgate':
        return new SolidgateProvider(config);
      case 'lemonsqueezy':
        return new LemonSqueezyProvider(config as unknown as LemonSqueezyConfig);
      case 'polar':
        return new PolarProvider(config as unknown as PolarConfig);
      default:
        throw new Error(`Unsupported payment provider: ${providerType}`);
    }
  }
}
```

## PaymentService and ServiceManager

### PaymentService

The `PaymentService` wraps the active provider instance and exposes a uniform API:

```typescript
// lib/payment/lib/payment-service.ts
export class PaymentService {
  private provider: PaymentProviderInterface;

  constructor(config: PaymentServiceConfig) {
    this.provider = PaymentProviderFactory.createProvider(
      config.provider,
      config.config
    );
  }

  async createPaymentIntent(params: CreatePaymentParams): Promise<PaymentIntent> {
    return this.provider.createPaymentIntent(params);
  }

  async createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionInfo> {
    return this.provider.createSubscription(params);
  }

  async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd = true
  ): Promise<SubscriptionInfo> {
    return this.provider.cancelSubscription(subscriptionId, cancelAtPeriodEnd);
  }

  getClientConfig(): ClientConfig {
    return this.provider.getClientConfig();
  }

  getUIComponents(): UIComponents {
    return this.provider.getUIComponents();
  }
}
```

### PaymentServiceManager (Singleton)

The manager handles provider switching at runtime and persists the user's choice in `localStorage`:

```typescript
// lib/payment/lib/payment-service-manager.ts
export class PaymentServiceManager {
  private static instance: PaymentServiceManager;
  private currentService: PaymentService | null = null;
  private readonly STORAGE_KEY = 'everworks_template.payment_provider.selected';

  static getInstance(
    providerConfigs: Record<SupportedProvider, PaymentProviderConfig>,
    defaultProvider?: SupportedProvider
  ): PaymentServiceManager {
    if (!PaymentServiceManager.instance) {
      PaymentServiceManager.instance = new PaymentServiceManager(
        providerConfigs, defaultProvider
      );
    }
    return PaymentServiceManager.instance;
  }

  async switchProvider(newProvider: SupportedProvider): Promise<void> {
    this.setStoredProvider(newProvider);
    this.currentService = new PaymentService({
      provider: newProvider,
      config: this.providerConfigs[newProvider],
    });
  }

  getAvailableProviders(): SupportedProvider[] {
    return Object.keys(this.providerConfigs) as SupportedProvider[];
  }
}
```

## React Integration

### PaymentProvider Context

Wrap your application (or payment-related pages) with the `PaymentProvider`:

```tsx
// Example: wrapping a layout
import { PaymentProvider } from '@/lib/payment';
import { createProviderConfigs } from '@/lib/payment/config/provider-configs';

const configs = createProviderConfigs(
  { apiKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!, webhookSecret: '' },
  undefined,  // solidgate
  undefined,  // lemonsqueezy
  undefined   // polar
);

export default function PricingLayout({ children }) {
  return (
    <PaymentProvider providerConfigs={configs} defaultProvider="stripe">
      {children}
    </PaymentProvider>
  );
}
```

### usePayment Hook

Components access the payment service through the `usePayment` hook:

```typescript
// lib/payment/hooks/use-payment.tsx
export function usePayment() {
  const context = useContext(PaymentContext);
  if (context === undefined) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  return context;
}

// Returns:
// {
//   service: PaymentService | null;
//   switchProvider: (provider: SupportedProvider) => Promise<void>;
//   currentProvider: SupportedProvider;
//   availableProviders: SupportedProvider[];
// }
```

**Usage example:**

```tsx
function CheckoutButton({ priceId }: { priceId: string }) {
  const { service, currentProvider } = usePayment();

  const handleCheckout = async () => {
    const intent = await service?.createPaymentIntent({
      amount: 2900,
      currency: 'usd',
      metadata: { priceId },
    });
    // Redirect to checkout or show payment form
  };

  return <button onClick={handleCheckout}>Pay with {currentProvider}</button>;
}
```

## Feature Gating

The `FeatureGuard` component restricts UI elements based on the user's subscription plan:

```tsx
// lib/payment/guards/feature.guard.tsx
export type PlanType = "TRIAL" | "FREE" | "STANDARD" | "PREMIUM" | "EXPIRED" | "CANCELLED";

const PLAN_LEVEL: Record<PlanType, number> = {
  CANCELLED: 0,
  EXPIRED: 1,
  TRIAL: 2,
  FREE: 3,
  STANDARD: 4,
  PREMIUM: 5,
};
```

**Usage:**

```tsx
import FeatureGuard from '@/lib/payment/guards/feature.guard';

<FeatureGuard
  user={currentUser}
  requiredPlan="STANDARD"
  fallback={<UpgradePrompt />}
  onAccessDenied={(userPlan, required, reason) => {
    console.log(`Access denied: ${reason}`);
  }}
>
  <PremiumFeature />
</FeatureGuard>
```

### Grace Period Support

Expired plans receive a 7-day grace period with degraded access:

```typescript
export const GRACE_PERIOD_CONFIG = {
  EXPIRED_GRACE_DAYS: 7,
  TRIAL_DURATION_DAYS: 14,
  EXPIRED_ACCESS_LEVEL: "FREE" as PlanType,
};

export const isInGracePeriod = (user: User): boolean => {
  if (!user.planExpiresAt) return false;
  const graceEnd = new Date(user.planExpiresAt);
  graceEnd.setDate(graceEnd.getDate() + GRACE_PERIOD_CONFIG.EXPIRED_GRACE_DAYS);
  return new Date() <= graceEnd && user.plan === "EXPIRED";
};
```

## Webhook Event Types

All webhook events are normalized into a common enum:

```typescript
// lib/payment/types/payment-types.ts
export enum WebhookEventType {
  PAYMENT_SUCCEEDED = 'payment_succeeded',
  PAYMENT_FAILED = 'payment_failed',
  SUBSCRIPTION_CREATED = 'subscription_created',
  SUBSCRIPTION_UPDATED = 'subscription_updated',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  SUBSCRIPTION_TRIAL_ENDING = 'subscription_trial_ending',
  INVOICE_PAID = 'invoice_paid',
  INVOICE_PAYMENT_FAILED = 'invoice_payment_failed',
  REFUND_CREATED = 'refund_created',
  // ... and more
}
```

## Payment Flows

The template supports two payment flows for content submissions:

```typescript
// lib/payment/types/payment.ts
export enum PaymentFlow {
  PAY_AT_START = "pay_at_start",
  PAY_AT_END = "pay_at_end",
}

export enum SubmissionStatus {
  DRAFT = "draft",
  PENDING_PAYMENT = "pending_payment",
  PAID = "paid",
  PUBLISHED = "published",
  REJECTED = "rejected",
}
```

- **Pay at Start**: User pays before the submission is reviewed.
- **Pay at End**: User submits for free, pays only after approval.

## API Route Reference

### Stripe Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/stripe/checkout` | POST | Create a checkout session |
| `/api/stripe/subscription` | GET/POST | Manage subscriptions |
| `/api/stripe/subscription/portal` | POST | Create billing portal session |
| `/api/stripe/subscription/[id]/cancel` | POST | Cancel a subscription |
| `/api/stripe/payment-intent` | POST | Create a payment intent |
| `/api/stripe/payment-methods/list` | GET | List saved payment methods |
| `/api/stripe/payment-methods/create` | POST | Add a payment method |
| `/api/stripe/payment-methods/delete` | POST | Remove a payment method |
| `/api/stripe/setup-intent` | POST | Create a setup intent |
| `/api/stripe/webhook` | POST | Handle Stripe webhooks |

### LemonSqueezy Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/lemonsqueezy/checkout` | POST | Create checkout session |
| `/api/lemonsqueezy/cancel` | POST | Cancel a subscription |
| `/api/lemonsqueezy/reactivate` | POST | Reactivate a subscription |
| `/api/lemonsqueezy/update-plan` | POST | Change subscription plan |
| `/api/lemonsqueezy/list` | GET | List user subscriptions |
| `/api/lemonsqueezy/webhook` | POST | Handle webhooks |

### Polar Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/polar/checkout` | POST | Create checkout session |
| `/api/polar/subscription/portal` | POST | Create customer portal |
| `/api/polar/subscription/[id]/cancel` | POST | Cancel a subscription |
| `/api/polar/subscription/[id]/reactivate` | POST | Reactivate |
| `/api/polar/webhook` | POST | Handle webhooks |

## Utility Functions

The `payment-types.ts` file includes useful formatting helpers:

```typescript
// Format cents to currency string
formatCentsToCurrency(2900, 'USD', 'en-US');
// => "$29.00"

// Convert cents to decimal
convertCentsToDecimal(2900);
// => 29.00

// Convert timestamp to Date
convertNumberToDate(1640995200);
// => Date: 2022-01-01T00:00:00.000Z
```

## Next Steps

- [Stripe Configuration](./stripe) -- Complete Stripe setup
- [LemonSqueezy Configuration](./lemonsqueezy) -- LemonSqueezy setup
- [Polar Configuration](./polar) -- Polar setup
- [Multi-Currency Integration](./multi-currency) -- Currency support
- [Payment Architecture](./payment-architecture) -- Deep dive into the architecture
- [Webhooks](./webhooks) -- Webhook handling details
- [Configuration Guide](./configuration) -- All environment variables and options
