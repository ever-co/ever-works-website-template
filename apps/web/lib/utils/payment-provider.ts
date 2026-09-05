import { useMemo } from 'react';
import { MANUAL_PAYMENT_PROVIDER, PaymentProvider, type PricingProvider } from '@/lib/constants';
import type { CheckoutProvider } from '@/components/context/LayoutThemeContext';
import type { PricingPlanConfig } from '@/lib/content';

/**
 * Maps CheckoutProvider string to PaymentProvider enum
 */
const CHECKOUT_PROVIDER_TO_PAYMENT_PROVIDER: Record<CheckoutProvider, PaymentProvider> = {
	stripe: PaymentProvider.STRIPE,
	lemonsqueezy: PaymentProvider.LEMONSQUEEZY,
	polar: PaymentProvider.POLAR,
	solidgate: PaymentProvider.SOLIDGATE
};

/**
 * Determines the payment provider with the following priority:
 * 1. User's selected provider from Settings
 * 2. Config default provider
 * 3. Fallback to Stripe
 *
 * A config provider of `manual` (spec 046) is returned as-is rather than
 * resolved to a gateway: `works.yml` declared that checkout happens outside
 * the template, so falling through to the Stripe default would send buyers
 * into a checkout the operator never asked for. Callers that must name a
 * gateway pass the result through {@link resolveGatewayProvider}; callers
 * that start a checkout gate on {@link isManualPaymentProvider} first.
 *
 * @param userSelectedProvider - The provider selected by the user (from useSelectedCheckoutProvider)
 * @param configProvider - The provider from config.pricing?.provider
 * @returns The determined provider, possibly `manual`
 *
 * @example
 * ```ts
 * const { getActiveProvider } = useSelectedCheckoutProvider();
 * const config = useConfig();
 * const provider = determinePaymentProvider(getActiveProvider(), config.pricing?.provider);
 * ```
 */
export function determinePaymentProvider(
	userSelectedProvider: CheckoutProvider | null,
	configProvider?: PricingProvider
): PricingProvider {
	// Priority 1: User's selected provider
	if (userSelectedProvider && userSelectedProvider in CHECKOUT_PROVIDER_TO_PAYMENT_PROVIDER) {
		return CHECKOUT_PROVIDER_TO_PAYMENT_PROVIDER[userSelectedProvider];
	}

	// Priority 2: Config default provider (`manual` included - see above)
	if (configProvider) {
		return configProvider;
	}

	// Priority 3: Fallback to Stripe
	return PaymentProvider.STRIPE;
}

/**
 * Whether provider resolution landed on `works.yml`'s `manual` declaration,
 * i.e. no checkout provider is configured for this directory.
 */
export function isManualPaymentProvider(provider: PricingProvider): provider is typeof MANUAL_PAYMENT_PROVIDER {
	return provider === MANUAL_PAYMENT_PROVIDER;
}

/**
 * Narrows a resolved provider to a gateway for the surfaces that must name
 * one - existing-subscription reads (auto-renewal, billing history) and the
 * built-in default plans. Those act on subscriptions a gateway already
 * created, so `manual` carries no information there and the pre-spec-046
 * Stripe default is kept - the same default `determinePaymentProvider`
 * applies when nothing is configured at all.
 *
 * Do NOT use this to start a checkout: gate on
 * {@link isManualPaymentProvider} instead.
 */
export function resolveGatewayProvider(provider: PricingProvider | undefined): PaymentProvider {
	if (provider === undefined || isManualPaymentProvider(provider)) {
		return PaymentProvider.STRIPE;
	}

	return provider;
}

/**
 * Hook helper to determine payment provider using React hooks
 * This is a convenience wrapper for useMemo with determinePaymentProvider
 *
 * @param getActiveProvider - Function from useSelectedCheckoutProvider hook
 * @param configPricing - The pricing config from useConfig hook
 * @returns The determined provider, possibly `manual`
 *
 * @example
 * ```tsx
 * const { getActiveProvider } = useSelectedCheckoutProvider();
 * const config = useConfig();
 * const paymentProvider = usePaymentProvider(getActiveProvider, config.pricing);
 * ```
 */
export function usePaymentProvider(
	getActiveProvider: () => CheckoutProvider | null,
	configPricing?: PricingPlanConfig
): PricingProvider {
	const userSelectedProvider = getActiveProvider();
	return useMemo(
		() => determinePaymentProvider(userSelectedProvider, configPricing?.provider),
		[userSelectedProvider, configPricing?.provider]
	);
}
