'use client';

import type { Config } from '@/lib/content';
import { createContext, useContext, useMemo } from 'react';
import { getAuthConfig } from '@/lib/auth/config';
import { defaultPricingConfig, getDefaultPricingConfigWithCurrency } from '@/lib/types';
import { useOptionalCurrencyContext } from '@/components/context/currency-provider';
import { useSelectedCheckoutProvider } from '@/hooks/use-selected-checkout-provider';
import { resolveGatewayProvider, usePaymentProvider } from '@/lib/utils/payment-provider';

const ConfigContext = createContext<Config>({});
const initialAuthConfig = getAuthConfig();

export function ConfigProvider({ config, children }: { config: Config; children: React.ReactNode }) {
	const { currency, isLoading: currencyLoading } = useOptionalCurrencyContext();
	const { getActiveProvider } = useSelectedCheckoutProvider();
	const paymentProvider = usePaymentProvider(getActiveProvider, config.pricing);

	const enhancedConfig = useMemo(() => {
		let pricing = config.pricing;

		if (!pricing && !currencyLoading) {
			// The built-in defaults name a gateway for their price IDs. Reached only
			// when works.yml carries no `pricing:` block at all, so `paymentProvider`
			// can never be `manual` here (spec 046).
			pricing = getDefaultPricingConfigWithCurrency(currency, resolveGatewayProvider(paymentProvider));
		} else if (!pricing) {
			pricing = defaultPricingConfig;
		}

		const configWithPricing = { ...config, pricing };
		return { ...configWithPricing, authConfig: initialAuthConfig };
	}, [config, currency, currencyLoading, paymentProvider]);

	return <ConfigContext.Provider value={enhancedConfig}>{children}</ConfigContext.Provider>;
}

export function useConfig() {
	const context = useContext<Config>(ConfigContext);
	if (!context) {
		throw new Error('useConfig must be used within a ConfigProvider');
	}
	return context;
}
