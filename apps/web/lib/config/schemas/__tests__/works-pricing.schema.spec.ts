import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import yaml from 'yaml';

import {
	MANUAL_PRICING_PROVIDER,
	STANDARD_PLAN_ALIAS,
	parseWorksPricingConfig,
	worksPricingPlanSchema,
	worksPricingSchemaCoversContract
} from '../works-pricing.schema';

/**
 * Spec 046 / EW-131 — the `pricing:` block of a data repository's
 * `.works/works.yml`.
 *
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * The published example is parsed here rather than duplicated, so
 * `docs/configuration/examples/works-pricing.example.yml` cannot drift from
 * the schema without this file going red.
 */

const REPO_ROOT = path.resolve(__dirname, '../../../../../..');
const EXAMPLE_PATH = path.join(REPO_ROOT, 'docs/configuration/examples/works-pricing.example.yml');

function loadExample(): Record<string, unknown> {
	return yaml.parse(readFileSync(EXAMPLE_PATH, 'utf8')) as Record<string, unknown>;
}

/** A minimal-but-valid block, used as the base for the negative cases. */
function minimalPricing() {
	return {
		provider: 'stripe',
		plans: {
			FREE: { id: 'free', name: 'Free', price: 0 },
			STANDARD: { id: 'standard', name: 'Standard', price: 19 },
			PREMIUM: { id: 'premium', name: 'Premium', price: 49 }
		}
	};
}

describe('works.yml pricing example', () => {
	it('is valid YAML and passes the schema', () => {
		const parsed = loadExample();
		const { pricing, errors } = parseWorksPricingConfig(parsed.pricing);

		assert.deepEqual(errors, []);
		assert.ok(pricing, 'the published example must parse');
		assert.equal(pricing.provider, 'stripe');
		assert.equal(pricing.currency, 'USD');
		assert.deepEqual(Object.keys(pricing.plans).sort(), ['FREE', 'PREMIUM', 'STANDARD']);
	});

	it('🛑 documents EVERY field of the PricingConfig contract on EVERY plan', () => {
		// AC1: "All fields from the PricingPlanConfig TypeScript interface are
		// correctly represented". The schema shape is compile-time-proven to
		// cover the interface (see worksPricingSchemaCoversContract), so
		// comparing the example against the shape closes the loop.
		const parsed = loadExample();
		const pricing = (parsed.pricing ?? {}) as { plans?: Record<string, Record<string, unknown>> };
		const expectedFields = Object.keys(worksPricingPlanSchema.shape).sort();

		for (const planKey of ['FREE', 'STANDARD', 'PREMIUM']) {
			const plan = pricing.plans?.[planKey];
			assert.ok(plan, `example is missing the ${planKey} plan`);
			assert.deepEqual(
				Object.keys(plan).sort(),
				expectedFields,
				`example plan ${planKey} does not list exactly the PricingConfig fields`
			);
		}
	});

	it('proves the schema covers the TypeScript contract', () => {
		// Fails to COMPILE (not merely at runtime) if a field is added to
		// PricingConfig / PricingPlanConfig without being added to the schema.
		assert.equal(worksPricingSchemaCoversContract, true);
	});
});

describe('works.yml pricing provider', () => {
	for (const provider of ['stripe', 'lemonsqueezy', 'polar', 'solidgate']) {
		it(`accepts provider "${provider}"`, () => {
			const { pricing, errors } = parseWorksPricingConfig({ ...minimalPricing(), provider });

			assert.deepEqual(errors, []);
			assert.equal(pricing?.provider, provider);
		});
	}

	it(`accepts provider "${MANUAL_PRICING_PROVIDER}" and keeps it distinct from "unset"`, () => {
		const { pricing, errors, warnings } = parseWorksPricingConfig({
			...minimalPricing(),
			provider: MANUAL_PRICING_PROVIDER
		});

		assert.deepEqual(errors, []);
		assert.ok(pricing);
		// Carried through, NOT erased: dropping it would be indistinguishable
		// from "no provider declared", which resolves to the Stripe default —
		// exactly the checkout the operator opted out of.
		assert.equal(pricing.provider, MANUAL_PRICING_PROVIDER);
		assert.equal(warnings.length, 1);
		assert.match(warnings[0], /manual/);
	});

	it(`accepts "${MANUAL_PRICING_PROVIDER}" in any case`, () => {
		const { pricing, errors } = parseWorksPricingConfig({ ...minimalPricing(), provider: ' Manual ' });

		assert.deepEqual(errors, []);
		assert.equal(pricing?.provider, MANUAL_PRICING_PROVIDER);
	});

	it('leaves provider unset when works.yml declares none', () => {
		const { plans } = minimalPricing();
		const { pricing, errors, warnings } = parseWorksPricingConfig({ plans });

		assert.deepEqual(errors, []);
		assert.deepEqual(warnings, []);
		assert.ok(pricing);
		assert.ok(!('provider' in pricing), 'an undeclared provider must stay absent');
	});

	it('accepts provider values in any case', () => {
		const { pricing, errors } = parseWorksPricingConfig({ ...minimalPricing(), provider: ' LemonSqueezy ' });

		assert.deepEqual(errors, []);
		assert.equal(pricing?.provider, 'lemonsqueezy');
	});

	it('🛑 stays silent about `manual` when the block is rejected', () => {
		// The warnings describe what the ACCEPTED block does. A rejected block
		// is dropped and the built-in plans render with their own provider
		// resolution, so claiming "no in-site checkout" would be false.
		const config = minimalPricing();
		const { pricing, errors, warnings } = parseWorksPricingConfig({
			...config,
			provider: MANUAL_PRICING_PROVIDER,
			plans: { ...config.plans, STANDARD: { ...config.plans.STANDARD, price: '19' } }
		});

		assert.equal(pricing, undefined);
		assert.equal(errors.length, 1);
		assert.deepEqual(warnings, []);
	});

	it('rejects an unknown provider with a path-prefixed message', () => {
		const { pricing, errors } = parseWorksPricingConfig({ ...minimalPricing(), provider: 'paypal' });

		assert.equal(pricing, undefined);
		assert.equal(errors.length, 1);
		assert.match(errors[0], /^pricing\.provider: /);
	});
});

describe('works.yml pricing plans', () => {
	it(`accepts ${STANDARD_PLAN_ALIAS} as an alias for STANDARD`, () => {
		const base = minimalPricing();
		const { pricing, errors, warnings } = parseWorksPricingConfig({
			provider: 'stripe',
			plans: {
				FREE: base.plans.FREE,
				[STANDARD_PLAN_ALIAS]: { id: 'pro', name: 'Pro', price: 29 },
				PREMIUM: base.plans.PREMIUM
			}
		});

		assert.deepEqual(errors, []);
		assert.equal(pricing?.plans.STANDARD.id, 'pro');
		assert.ok(!(STANDARD_PLAN_ALIAS in (pricing?.plans ?? {})));
		assert.equal(warnings.length, 1);
		assert.match(warnings[0], new RegExp(STANDARD_PLAN_ALIAS));
	});

	it(`prefers STANDARD when both STANDARD and ${STANDARD_PLAN_ALIAS} are present`, () => {
		const base = minimalPricing();
		const { pricing, warnings } = parseWorksPricingConfig({
			plans: { ...base.plans, [STANDARD_PLAN_ALIAS]: { id: 'pro', name: 'Pro', price: 29 } }
		});

		assert.equal(pricing?.plans.STANDARD.id, 'standard');
		assert.equal(warnings.length, 1);
		assert.match(warnings[0], /STANDARD wins/);
	});

	it('reports every missing plan at once', () => {
		const { pricing, errors } = parseWorksPricingConfig({ provider: 'stripe', plans: {} });

		assert.equal(pricing, undefined);
		assert.deepEqual(errors, [
			'pricing.plans.FREE: plans.FREE is required',
			`pricing.plans.STANDARD: plans.STANDARD is required (the alias plans.${STANDARD_PLAN_ALIAS} is also accepted)`,
			'pricing.plans.PREMIUM: plans.PREMIUM is required'
		]);
	});

	it('names the offending field when a price is not a number', () => {
		const config = minimalPricing();
		const { pricing, errors } = parseWorksPricingConfig({
			...config,
			plans: { ...config.plans, STANDARD: { ...config.plans.STANDARD, price: '19' } }
		});

		assert.equal(pricing, undefined);
		assert.equal(errors.length, 1);
		assert.match(errors[0], /^pricing\.plans\.STANDARD\.price: /);
	});

	it('rejects an unknown billing interval', () => {
		const config = minimalPricing();
		const { errors } = parseWorksPricingConfig({
			...config,
			plans: { ...config.plans, PREMIUM: { ...config.plans.PREMIUM, interval: 'fortnightly' } }
		});

		assert.equal(errors.length, 1);
		assert.match(errors[0], /^pricing\.plans\.PREMIUM\.interval: /);
	});
});

describe('works.yml pricing backward compatibility', () => {
	it('CONTROL: a works.yml with no pricing block is left alone', () => {
		assert.deepEqual(parseWorksPricingConfig(undefined), { errors: [], warnings: [] });
		assert.deepEqual(parseWorksPricingConfig(null), { errors: [], warnings: [] });
	});

	it('accepts the pre-EW-131 documented example, which omitted required-in-TS fields', () => {
		// The example published in docs/payment/payment.md before this spec had
		// no `description` / `annualDiscount` on FREE. Those sites must keep
		// working, so the schema defaults them instead of failing.
		const { pricing, errors } = parseWorksPricingConfig({
			provider: 'stripe',
			currency: 'USD',
			plans: {
				FREE: {
					id: 'free',
					name: 'Free',
					description: 'Basic access',
					price: 0,
					features: ['List your product']
				},
				STANDARD: { id: 'standard', name: 'Standard', description: 'Enhanced', price: 9, annualDiscount: 20 },
				PREMIUM: { id: 'premium', name: 'Premium', description: 'Full access', price: 29, annualDiscount: 25 }
			}
		});

		assert.deepEqual(errors, []);
		assert.equal(pricing?.plans.FREE.annualDiscount, 0);
		assert.equal(pricing?.plans.STANDARD.annualDiscount, 20);
	});

	it('defaults description and annualDiscount so the parsed value satisfies PricingConfig', () => {
		const { pricing } = parseWorksPricingConfig(minimalPricing());

		assert.equal(pricing?.plans.FREE.description, '');
		assert.equal(pricing?.plans.FREE.annualDiscount, 0);
	});

	it('preserves keys this template does not know yet', () => {
		const config = minimalPricing();
		const { pricing } = parseWorksPricingConfig({
			...config,
			futureRootKey: 'kept',
			plans: {
				...config.plans,
				ENTERPRISE: { id: 'enterprise', name: 'Enterprise', price: 199 },
				FREE: { ...config.plans.FREE, futurePlanKey: 'kept too' }
			}
		});

		const plans = pricing?.plans as Record<string, unknown> | undefined;

		assert.equal((pricing as Record<string, unknown> | undefined)?.futureRootKey, 'kept');
		assert.equal((pricing?.plans.FREE as Record<string, unknown> | undefined)?.futurePlanKey, 'kept too');
		// An unrecognised plan key round-trips like any other unknown key —
		// only the consumed PRO alias is dropped.
		assert.ok(plans?.ENTERPRISE, 'unknown plan keys must round-trip');
	});

	it('rejects a pricing block that is not a mapping', () => {
		assert.deepEqual(parseWorksPricingConfig('stripe').errors, [
			'pricing: expected a mapping of pricing options, received a string'
		]);
		assert.deepEqual(parseWorksPricingConfig([]).errors, [
			'pricing: expected a mapping of pricing options, received a list'
		]);
	});
});
