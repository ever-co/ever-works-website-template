import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { MANUAL_PAYMENT_PROVIDER, PaymentProvider } from '../../constants/payment';
import { determinePaymentProvider, isManualPaymentProvider, resolveGatewayProvider } from '../payment-provider';

/**
 * Spec 046 / EW-131 — resolution of `works.yml`'s `pricing.provider`.
 *
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * The load-bearing case is `manual`: it must NOT collapse into "nothing
 * configured", because that resolves to the Stripe default and would start a
 * checkout the operator explicitly opted out of.
 */

describe('determinePaymentProvider', () => {
	it('CONTROL: falls back to Stripe when nothing is configured or selected', () => {
		assert.equal(determinePaymentProvider(null, undefined), PaymentProvider.STRIPE);
	});

	it('CONTROL: prefers the user selection over the works.yml provider', () => {
		assert.equal(
			determinePaymentProvider('lemonsqueezy', PaymentProvider.STRIPE),
			PaymentProvider.LEMONSQUEEZY
		);
	});

	it('CONTROL: uses the works.yml provider when the user selected none', () => {
		assert.equal(determinePaymentProvider(null, PaymentProvider.POLAR), PaymentProvider.POLAR);
	});

	it('🛑 carries `manual` through instead of falling back to Stripe', () => {
		const resolved = determinePaymentProvider(null, MANUAL_PAYMENT_PROVIDER);

		assert.equal(resolved, MANUAL_PAYMENT_PROVIDER);
		assert.notEqual(resolved, PaymentProvider.STRIPE);
		assert.ok(isManualPaymentProvider(resolved));
	});

	it('still honours an explicit user selection over `manual`', () => {
		// The provider picker in Settings only lists gateways the deployment
		// configured, so an explicit choice stays authoritative.
		assert.equal(determinePaymentProvider('stripe', MANUAL_PAYMENT_PROVIDER), PaymentProvider.STRIPE);
	});
});

describe('isManualPaymentProvider', () => {
	it('is true only for the manual declaration', () => {
		assert.equal(isManualPaymentProvider(MANUAL_PAYMENT_PROVIDER), true);

		for (const provider of Object.values(PaymentProvider)) {
			assert.equal(isManualPaymentProvider(provider), false, `${provider} is a gateway`);
		}
	});
});

describe('resolveGatewayProvider', () => {
	it('maps `manual` and "unset" to the same Stripe default', () => {
		// Used only where a gateway must be named for a subscription some
		// gateway already created (auto-renewal, billing portal, default plans).
		assert.equal(resolveGatewayProvider(MANUAL_PAYMENT_PROVIDER), PaymentProvider.STRIPE);
		assert.equal(resolveGatewayProvider(undefined), PaymentProvider.STRIPE);
	});

	it('leaves every real gateway untouched', () => {
		for (const provider of Object.values(PaymentProvider)) {
			assert.equal(resolveGatewayProvider(provider), provider);
		}
	});
});
