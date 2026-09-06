/**
 * Payment-related enums and types.
 * This file is kept separate from the main constants.ts to avoid
 * importing @/lib/config, which allows it to be used in scripts
 * that run outside the Next.js runtime (migrations, seeds, etc.)
 */

// ============================================
// PAYMENT FLOW
// ============================================
export type ExceptionTrackingProvider = 'sentry' | 'posthog' | 'both' | 'none';

export enum PaymentFlow {
	PAY_AT_START = 'pay_at_start',
	PAY_AT_END = 'pay_at_end'
}

export enum PaymentStatus {
	PENDING = 'pending',
	PAID = 'paid',
	FAILED = 'failed'
}

export enum PaymentInterval {
	DAILY = 'daily',
	WEEKLY = 'weekly',
	MONTHLY = 'monthly',
	YEARLY = 'yearly',
	ONE_TIME = 'one-time',
	PER_SUBMISSION = 'per-submission'
}

// ============================================
// PAYMENT PLANS
// ============================================
export enum PaymentPlan {
	FREE = 'free',
	STANDARD = 'standard',
	PREMIUM = 'premium'
}

/**
 * Display names for payment plans
 */
export const PAYMENT_PLAN_NAMES: Record<PaymentPlan, string> = {
	[PaymentPlan.FREE]: 'Free Plan',
	[PaymentPlan.STANDARD]: 'Standard Plan',
	[PaymentPlan.PREMIUM]: 'Premium Plan',
};

export enum PaymentMethod {
	CREDIT_CARD = 'credit_card',
	PAYPAL = 'paypal'
}

export enum PaymentCurrency {
	USD = 'USD',
	EUR = 'EUR',
	GBP = 'GBP',
	CAD = 'CAD',
	AUD = 'AUD',
	ETH = 'ETH'
}

export enum PaymentProvider {
	STRIPE = 'stripe',
	SOLIDGATE = 'solidgate',
	LEMONSQUEEZY = 'lemonsqueezy',
	POLAR = 'polar'
}

/**
 * `works.yml` `pricing.provider: manual` — "this directory takes payment
 * outside the template" (spec 046, EW-131).
 *
 * Deliberately NOT a `PaymentProvider` member: that enum names gateways
 * `PaymentProviderFactory` can instantiate and the `payment_provider` column
 * stores. `manual` is the declared absence of one, so it must never select a
 * checkout branch.
 */
export const MANUAL_PAYMENT_PROVIDER = 'manual';

/**
 * What `works.yml` may declare as its pricing provider: any gateway, or
 * {@link MANUAL_PAYMENT_PROVIDER}.
 */
export type PricingProvider = PaymentProvider | typeof MANUAL_PAYMENT_PROVIDER;

export enum SubmissionStatus {
	DRAFT = 'draft',
	PENDING = 'pending',
	APPROVED = 'approved',
	REJECTED = 'rejected',
	PUBLISHED = 'published',
	ARCHIVED = 'archived'
}

// ============================================
// SPONSOR AD PRICING (default fallback values in dollars)
// Must match defaults in lib/utils/settings.ts for consistency
// ============================================
export const SponsorAdPricing = {
	WEEKLY: 100, // $100.00 - matches getSponsorAdWeeklyPrice() default
	MONTHLY: 300, // $300.00 - matches getSponsorAdMonthlyPrice() default
} as const;
