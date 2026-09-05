/**
 * `works.yml` pricing block schema (spec 046, EW-131).
 *
 * The data repository's `.works/works.yml` may carry a `pricing:` block that
 * mirrors the `PricingPlanConfig` TypeScript contract in `lib/content.ts`.
 * Until this schema existed the block was cast straight to `Config`, so a
 * typo (`price: "19"`, `interval: month`) reached the pricing page as an
 * unusable plan card with no diagnostic anywhere.
 *
 * Design rules, in priority order:
 *
 * 1. **Backward compatible.** A `works.yml` with no `pricing:` key keeps the
 *    built-in defaults (`getDefaultPricingConfigWithCurrency`) exactly as
 *    before — this module is never even consulted. Every block that renders
 *    correctly today must keep parsing, so optional metadata stays optional
 *    and the two fields the TypeScript contract marks required but our own
 *    documented example omitted (`description`, `annualDiscount`) get
 *    defaults instead of errors.
 * 2. **Forward compatible.** Every object is a `looseObject`: keys this
 *    template does not know yet round-trip untouched rather than failing a
 *    site that was authored against a newer template.
 * 3. **Never throw.** `parseWorksPricingConfig` returns errors; the caller
 *    (`getConfig()` in `lib/content.ts`) logs them and falls back to the
 *    built-in defaults. A malformed block must not take a directory down.
 *
 * @see docs/configuration/works-yml-pricing.md
 * @see docs/spec/046-works-yml-pricing-config/spec.md
 */

import { z } from 'zod';
import { MANUAL_PAYMENT_PROVIDER, PaymentInterval, PaymentProvider } from '../../constants/payment';
import type { PricingConfig, PricingPlanConfig, PricingPlans } from '../../content';

/**
 * `provider: manual` — the value EW-131 asks `works.yml` to accept for
 * "checkout is handled outside the template".
 *
 * It is deliberately NOT a member of the `PaymentProvider` enum: that enum
 * names gateways `PaymentProviderFactory` can instantiate and the
 * `payment_provider` column stores. It IS carried through parsing rather
 * than erased, because dropping it would leave `provider` undefined and
 * `determinePaymentProvider()` would fall through to its Stripe default —
 * sending buyers into a checkout the operator explicitly opted out of. See
 * `lib/utils/payment-provider.ts`.
 */
export const MANUAL_PRICING_PROVIDER = MANUAL_PAYMENT_PROVIDER;

/**
 * Accepted values of `pricing.provider` in `works.yml`: every configurable
 * gateway plus {@link MANUAL_PRICING_PROVIDER}.
 */
export const WORKS_PRICING_PROVIDERS = [...Object.values(PaymentProvider), MANUAL_PRICING_PROVIDER] as const;

export type WorksPricingProvider = (typeof WORKS_PRICING_PROVIDERS)[number];

/**
 * Plan key EW-131 used for the middle tier. The shipped contract calls it
 * `STANDARD` (EW-160, `PaymentPlan.STANDARD`); `PRO` is accepted as an alias
 * so a `works.yml` written against the ticket's wording still loads.
 */
export const STANDARD_PLAN_ALIAS = 'PRO';

/**
 * YAML is hand-written, so accept `Stripe` / `STRIPE` / ` stripe ` for the
 * closed vocabularies and normalize before matching the enum.
 */
function normalizeEnumInput(value: unknown): unknown {
	return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

const providerSchema = z.preprocess(normalizeEnumInput, z.enum(WORKS_PRICING_PROVIDERS));

const intervalSchema = z.preprocess(normalizeEnumInput, z.enum(PaymentInterval));

/**
 * One plan entry — mirrors the `PricingConfig` interface field for field.
 *
 * `id`, `name` and `price` are the only hard requirements: a card cannot be
 * rendered or checked out without them. `description` and `annualDiscount`
 * are required by the TypeScript interface but were absent from the FREE plan
 * in our own published example, so they default rather than fail.
 */
export const worksPricingPlanSchema = z.looseObject({
	id: z.string().min(1),
	name: z.string().min(1),
	description: z.string().default(''),
	price: z.number().nonnegative(),
	annualDiscount: z.number().min(0).max(100).default(0),
	features: z.array(z.string()).optional(),
	interval: intervalSchema.optional(),
	popular: z.boolean().optional(),
	isPremium: z.boolean().optional(),
	isActive: z.boolean().optional(),
	isFeatured: z.boolean().optional(),
	disabled: z.boolean().optional(),
	envKey: z.string().optional(),
	trialPeriodDays: z.number().int().nonnegative().optional(),
	trialAmountId: z.string().optional(),
	trialAmount: z.number().nonnegative().optional(),
	isAuthorizedTrialAmount: z.boolean().optional(),
	stripeProductId: z.string().optional(),
	stripePriceId: z.string().optional(),
	annualPriceId: z.string().optional(),
	lemonProductId: z.string().optional(),
	lemonVariantId: z.string().optional(),
	lemonCheckoutUrl: z.string().optional(),
	polarFreePlanId: z.string().optional(),
	polarStandardPlanId: z.string().optional(),
	polarPremiumPlanId: z.string().optional(),
	polarProductId: z.string().optional()
});

const plansBaseSchema = z.looseObject({
	FREE: worksPricingPlanSchema.optional(),
	STANDARD: worksPricingPlanSchema.optional(),
	PRO: worksPricingPlanSchema.optional(),
	PREMIUM: worksPricingPlanSchema.optional()
});

const plansSchema = plansBaseSchema
	.superRefine((plans, ctx) => {
		if (!plans.FREE) {
			ctx.addIssue({ code: 'custom', path: ['FREE'], message: 'plans.FREE is required' });
		}

		if (!plans.STANDARD && !plans.PRO) {
			ctx.addIssue({
				code: 'custom',
				path: ['STANDARD'],
				message: `plans.STANDARD is required (the alias plans.${STANDARD_PLAN_ALIAS} is also accepted)`
			});
		}

		if (!plans.PREMIUM) {
			ctx.addIssue({ code: 'custom', path: ['PREMIUM'], message: 'plans.PREMIUM is required' });
		}
	})
	.transform((plans): PricingPlans => {
		const { FREE, STANDARD, PRO, PREMIUM, ...rest } = plans;

		return {
			// Plan keys this template does not know yet round-trip, like every
			// other unrecognised key. Only the consumed alias is dropped.
			...rest,
			// superRefine above guarantees these are present by the time we get here.
			FREE: FREE as PricingConfig,
			STANDARD: (STANDARD ?? PRO) as PricingConfig,
			PREMIUM: PREMIUM as PricingConfig
		};
	});

const worksPricingConfigBaseSchema = z.looseObject({
	provider: providerSchema.optional(),
	currency: z.string().min(1).optional(),
	lemonCheckoutUrl: z.string().optional(),
	plans: plansSchema
});

/**
 * Full `pricing:` block. Output is a `PricingPlanConfig`, so the parsed value
 * drops straight into `Config.pricing` with no cast.
 */
export const worksPricingConfigSchema = worksPricingConfigBaseSchema.transform((config): PricingPlanConfig => {
	const { provider, plans, currency, lemonCheckoutUrl, ...rest } = config;

	return {
		// Unknown keys are preserved so a newer template can read them.
		...rest,
		plans,
		...(currency === undefined ? {} : { currency }),
		...(lemonCheckoutUrl === undefined ? {} : { lemonCheckoutUrl }),
		// `manual` is carried through, NOT erased: an absent provider means
		// "nothing was declared" and resolves to the Stripe default, while
		// `manual` means "the operator declared there is no gateway here".
		// See MANUAL_PRICING_PROVIDER and lib/utils/payment-provider.ts.
		...(provider === undefined ? {} : { provider })
	};
});

type MissingPlanFields = Exclude<keyof PricingConfig, keyof typeof worksPricingPlanSchema.shape>;
type MissingConfigFields = Exclude<keyof PricingPlanConfig, keyof typeof worksPricingConfigBaseSchema.shape>;

/**
 * Compile-time proof that the schema covers **every** field of the
 * `PricingConfig` / `PricingPlanConfig` interfaces (EW-131 AC1). Add a field
 * to either interface without adding it here and this assignment stops
 * compiling, naming the missing keys in the type error.
 */
export const worksPricingSchemaCoversContract: [MissingPlanFields, MissingConfigFields] extends [never, never]
	? true
	: [MissingPlanFields, MissingConfigFields] = true;

/** Outcome of validating a `works.yml` `pricing:` block. */
export interface WorksPricingParseResult {
	/**
	 * The validated block, or `undefined` when there was nothing to validate
	 * or validation failed — in both cases the caller keeps the built-in
	 * default pricing.
	 */
	pricing?: PricingPlanConfig;
	/** Human-readable, path-prefixed validation failures. */
	errors: string[];
	/** Accepted-but-noteworthy input (aliases, `manual` provider). */
	warnings: string[];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Names the shape of a `pricing:` value that is not a mapping, for the error
 * message. `null` never reaches here — `parseWorksPricingConfig` treats an
 * empty `pricing:` key as "absent" and returns before this call.
 */
function describeType(value: unknown): string {
	return Array.isArray(value) ? 'a list' : `a ${typeof value}`;
}

/**
 * Collects notes about input that is accepted but worth telling the operator
 * about. Read from the RAW block so the message names the key the author
 * actually wrote, not the normalized one.
 */
function collectWarnings(raw: Record<string, unknown>): string[] {
	const warnings: string[] = [];
	const provider = raw.provider;

	if (typeof provider === 'string' && provider.trim().toLowerCase() === MANUAL_PRICING_PROVIDER) {
		warnings.push(
			`pricing.provider is "${MANUAL_PRICING_PROVIDER}": plans are displayed but no in-site checkout is ` +
				'started, so payment must be collected outside this site.'
		);
	}

	if (!isPlainObject(raw.plans)) {
		return warnings;
	}

	const hasAlias = raw.plans[STANDARD_PLAN_ALIAS] !== undefined;
	const hasStandard = raw.plans.STANDARD !== undefined;

	if (hasAlias && hasStandard) {
		warnings.push(
			`pricing.plans defines both STANDARD and ${STANDARD_PLAN_ALIAS}; ` +
				`STANDARD wins and ${STANDARD_PLAN_ALIAS} is ignored.`
		);
	} else if (hasAlias) {
		warnings.push(
			`pricing.plans.${STANDARD_PLAN_ALIAS} is an alias for pricing.plans.STANDARD; ` +
				'rename it to STANDARD to match the template contract.'
		);
	}

	return warnings;
}

function formatIssues(error: z.ZodError): string[] {
	return error.issues.map((issue) => {
		const path = ['pricing', ...issue.path.map(String)].join('.');

		return `${path}: ${issue.message}`;
	});
}

/**
 * Validates the `pricing:` block of a `works.yml`.
 *
 * Never throws: a caller that gets `pricing: undefined` back should log
 * `errors` and keep whatever default it already had.
 *
 * @param raw - the value of the `pricing` key, exactly as YAML-parsed.
 */
export function parseWorksPricingConfig(raw: unknown): WorksPricingParseResult {
	if (raw === undefined || raw === null) {
		return { errors: [], warnings: [] };
	}

	if (!isPlainObject(raw)) {
		return {
			errors: [`pricing: expected a mapping of pricing options, received ${describeType(raw)}`],
			warnings: []
		};
	}

	const result = worksPricingConfigSchema.safeParse(raw);

	if (!result.success) {
		// No warnings on the failure path. They describe what the ACCEPTED block
		// does ("manual means no in-site checkout", "PRO was read as STANDARD"),
		// and a rejected block does none of it - the caller drops it and the
		// built-in plans, with their own provider resolution, render instead.
		// Emitting them here would tell the operator their site is in a state it
		// is not.
		return { errors: formatIssues(result.error), warnings: [] };
	}

	return { pricing: result.data, errors: [], warnings: collectWarnings(raw) };
}
