import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { PaymentFlow, PaymentInterval, PaymentPlan, PaymentProvider, type PricingProvider } from '@/lib/constants';
import { usePaymentFlow } from '@/hooks/use-payment-flow';
import { useCreateCheckoutSession } from '@/hooks/use-create-checkout';
import { useCurrentUser } from '@/hooks/use-current-user';
import { toast } from 'sonner';
import { usePricingFeatures } from '@/hooks/use-pricing-features';
import { useConfig } from '@/app/[locale]/config';
import { PricingConfig } from '@/lib/content';
import { useLoginModal, type LoginModalStore } from './use-login-modal';
import { useCheckoutButton } from './use-checkout-button';
import { usePolarCheckout } from './use-polar-checkout';
import { useSelectedCheckoutProvider } from './use-selected-checkout-provider';
import { useCurrencyContext } from '@/components/context/currency-provider';
import { getLemonSqueezyPriceConfig } from '@/lib/config/billing/lemonsqueezy.config';
import { getPolarPriceConfig } from '@/lib/config/billing/polar.config';
import { isManualPaymentProvider, usePaymentProvider } from '@/lib/utils/payment-provider';
import { getCurrencySymbol, formatAmountWithSymbol } from '@/lib/utils/currency-format';
import { useSetupIntent } from './use-setup-intent';
import { useSubscription } from './use-subscription';
import { usePaymentAvailability } from './use-payment-availability';
import { useStripeProducts } from './use-stripe-products';
import { useStripeDynamicPricingEnabled } from './use-public-payment-config';
import { mapStripeProductsToPricingPlans } from '@/lib/services/stripe-products.service';
import { collectPaymentModeConfig } from '@/lib/config/schemas/payment.schema';
import { useRouter } from '@/i18n/navigation';

export interface UsePricingSectionParams {
	onSelectPlan?: (plan: PaymentPlan) => void;
	initialSelectedPlan?: PaymentPlan | null;
	isReview?: boolean;
}

export interface UsePricingSectionState {
	showSelector: boolean;
	billingInterval: PaymentInterval;
	processingPlan: string | null;
	selectedPlan: PaymentPlan | null;
	selectedFlow: PaymentFlow;
	isButton: boolean;
}

export interface UsePricingSectionActions {
	setShowSelector: (show: boolean | ((prev: boolean) => boolean)) => void;
	setBillingInterval: (interval: PaymentInterval) => void;
	setSelectedPlan: (plan: PaymentPlan | null) => void;
	handleFlowChange: () => void;
	handleFlowSelect: (flow: PaymentFlow) => Promise<void>;
	handleSelectPlan: (plan: PaymentPlan) => void;
	handleCheckout: (plan: PricingConfig) => Promise<void>;
	cancelCurrentProcess: () => void;
	calculatePrice: (plan: PricingConfig) => number;
	getSavingsText: (plan: PricingConfig) => string | null;
}

/**
 * Validates and maps plan.id to a valid plan name for billing configs
 * @param planId - The plan ID to validate
 * @returns The validated plan name ('free' | 'standard' | 'premium')
 * @throws Error if planId is not a valid PaymentPlan
 */
function validateAndMapPlanName(planId: string): 'free' | 'standard' | 'premium' {
	const validPlans: Record<string, 'free' | 'standard' | 'premium'> = {
		[PaymentPlan.FREE]: 'free',
		[PaymentPlan.STANDARD]: 'standard',
		[PaymentPlan.PREMIUM]: 'premium'
	};

	const planName = validPlans[planId];
	if (!planName) {
		throw new Error(`Invalid plan ID: "${planId}". Expected one of: ${Object.values(PaymentPlan).join(', ')}`);
	}

	return planName;
}

export interface UsePricingSectionReturn extends UsePricingSectionState, UsePricingSectionActions {
	// Additional data
	user: any;
	config: any;
	FREE: any;
	STANDARD: any;
	PREMIUM: any;
	/**
	 * Resolved pricing provider. `manual` (spec 046) means `works.yml` declared
	 * that checkout happens outside this site — see {@link isManualCheckout}.
	 */
	provider?: PricingProvider;
	/** `works.yml` declared `pricing.provider: manual` — no in-site checkout (spec 046). */
	isManualCheckout: boolean;
	freePlanFeatures: any[];
	standardPlanFeatures: any[];
	premiumPlanFeatures: any[];
	getPlanConfig: (planId: string) => any;
	getActionText: (planId: string) => string;
	getNotLoggedInActionText: (planId: string) => string;
	isLoading: boolean;
	error: any;
	isSuccess: boolean;
	t: any;
	tBilling: any;
	router: any;
	loginModal: LoginModalStore;
	clientSecret?: string | null;
	setClientSecret?: (clientSecret: string | null) => void;
	isReady?: boolean;
	// Currency-related
	currency: string;
	currencySymbol: string;
	formatPrice: (amount: number) => string;
	// Payment form modal
	paymentForm: {
		isOpen: boolean;
		planForPayment: PricingConfig | null;
		openPaymentForm: (plan: PricingConfig) => void;
		closePaymentForm: () => void;
		onPaymentSuccess: (paymentMethodId: string) => void;
		onPaymentError: (error: Error) => void;
		clientSecret?: string;
		checkoutUrl?: string | null;
		isReady?: boolean;
		isError?: boolean;
	};
}

/**
 * Custom hook that encapsulates all PricingSection logic
 */
export function usePricingSection(params: UsePricingSectionParams = {}): UsePricingSectionReturn {
	const { onSelectPlan, initialSelectedPlan, isReview } = params;
	// Hooks
	const searchParams = useSearchParams();
	const router = useRouter();
	const { user } = useCurrentUser();
	const config = useConfig();
	const { currency } = useCurrencyContext();
	const t = useTranslations('pricing');
	const tBilling = useTranslations('billing');

	const {
		freePlanFeatures,
		standardPlanFeatures,
		premiumPlanFeatures,
		getPlanConfig,
		getActionText,
		getNotLoggedInActionText
	} = usePricingFeatures();

	// Theme
	const { resolvedTheme } = useTheme();
	const isDark = resolvedTheme === 'dark';

	// Hooks for different payment providers
	const stripeHook: ReturnType<typeof useCreateCheckoutSession> = useCreateCheckoutSession(); // Stripe checkout hook

		const lemonsqueezyHook: ReturnType<typeof useCheckoutButton> = useCheckoutButton({
			embedded: collectPaymentModeConfig().lemonSqueezy,
			onPaymentSuccess: (_event) => {
				toast.success('Subscription created successfully!');
				router.push('/pricing/success');
			},
		onClose: () => {
			// Clear checkout URL to prevent stale state
			lemonsqueezyHook.clearCheckout();
			if (currentProcessingPlanRef.current) {
				currentProcessingPlanRef.current = null;
				setProcessingPlan(null);
			}
		},
		dark: isDark
	}); // Lemonsqueezy checkout hook
	const polarHook: ReturnType<typeof usePolarCheckout> = usePolarCheckout({
		embedded: collectPaymentModeConfig().polar
	}); // Polar checkout hook
	const { createSubscription } = useSubscription(); // Subscription management hook

	// Hook for payment flow
	const { selectedFlow, selectFlow, triggerAnimation } = usePaymentFlow({
		enableAnimations: true,
		autoSave: true
	});

	// Get payment availability to determine default plan
	const { shouldShowPaidPlans } = usePaymentAvailability();

	// Local state for pricing section
	const [showSelector, setShowSelector] = useState<boolean>(false);
	const [billingInterval, setBillingInterval] = useState<PaymentInterval>(PaymentInterval.MONTHLY);
	const [processingPlan, setProcessingPlan] = useState<string | null>(null);
	// Default to FREE when paid plans aren't available, otherwise use initialSelectedPlan or STANDARD
	const defaultPlan = shouldShowPaidPlans ? (initialSelectedPlan ?? PaymentPlan.STANDARD) : PaymentPlan.FREE;
	// A valid `?plan=` query param (free|standard|premium) takes precedence on first render,
	// so deep links like `/pricing?plan=premium` pre-select the requested plan without a flash.
	const [selectedPlan, setSelectedPlan] = useState<PaymentPlan | null>(() => {
		const planFromUrl = searchParams.get('plan');
		if (planFromUrl && (Object.values(PaymentPlan) as string[]).includes(planFromUrl)) {
			return planFromUrl as PaymentPlan;
		}
		return defaultPlan;
	});
	const [showPaymentForm, setShowPaymentForm] = useState(false);
	const [planForPayment, setPlanForPayment] = useState<PricingConfig | null>(null);
	const loginModal = useLoginModal();

	// Ref for current processing plan
	const currentProcessingPlanRef = useRef<string | null>(null);

	// Tracks the last `?plan=` value applied from the URL, so we don't re-apply it
	// over a user's manual plan selection on subsequent renders.
	const lastAppliedUrlPlanRef = useRef<string | null>(null);

	// Static plans from config (with proper typing)
	const staticPlans = useMemo(
		() =>
			config.pricing?.plans ??
			({} as {
				FREE?: PricingConfig;
				STANDARD?: PricingConfig;
				PREMIUM?: PricingConfig;
			}),
		[config.pricing?.plans]
	);

	// Get user's selected checkout provider from Settings
	const { getActiveProvider } = useSelectedCheckoutProvider();

	// Determine payment provider: User selection takes precedence over config
	const paymentProvider = usePaymentProvider(getActiveProvider, config.pricing);

	// `works.yml` declared `pricing.provider: manual` (spec 046): plans are
	// rendered, but this site never starts a checkout — payment is collected
	// outside it. Every gateway branch below is gated on this.
	const isManualCheckout = isManualPaymentProvider(paymentProvider);

	// Fetch dynamic products from Stripe if enabled (runtime flag from /api/payment/public-config, spec 044)
	const stripeDynamicPricingEnabled = useStripeDynamicPricingEnabled();
	const isDynamicPricingEnabled = paymentProvider === PaymentProvider.STRIPE && stripeDynamicPricingEnabled;
	const { data: stripeProductsData } = useStripeProducts({
		enabled: isDynamicPricingEnabled && !isReview
	});

	// Merge dynamic products with static config
	// Dynamic products take precedence when available
	const { FREE, STANDARD, PREMIUM } = useMemo(() => {
		if (isDynamicPricingEnabled && stripeProductsData?.products?.length) {
			const dynamicPlans = mapStripeProductsToPricingPlans(stripeProductsData.products, currency);
			// Merge: dynamic values override static, but keep static as fallback
			return {
				FREE: dynamicPlans.FREE ?? staticPlans.FREE,
				STANDARD: dynamicPlans.STANDARD ?? staticPlans.STANDARD,
				PREMIUM: dynamicPlans.PREMIUM ?? staticPlans.PREMIUM
			};
		}
		return staticPlans;
	}, [isDynamicPricingEnabled, stripeProductsData, staticPlans, currency]);

	const paymentHook =
		paymentProvider === PaymentProvider.LEMONSQUEEZY
			? lemonsqueezyHook
			: paymentProvider === PaymentProvider.POLAR
				? polarHook
				: stripeHook;
	const { isLoading, isSuccess, error } = paymentHook;
	const resetPaymentHook = useMemo(() => ('reset' in paymentHook ? paymentHook.reset : () => {}), [paymentHook]);

	// Prefetch Stripe SetupIntent only if using Stripe embedded mode and user is logged in
	const shouldPrefetch =
		!isReview && !!user?.id && paymentProvider === PaymentProvider.STRIPE && collectPaymentModeConfig().stripe;

	const { clientSecret, isReady, isError } = useSetupIntent({
		suppressSuccessToast: true,
		enabled: shouldPrefetch
	});

	/**
	 * Cancel current processing and reset state
	 */
	const cancelCurrentProcess = useCallback(() => {
		if (currentProcessingPlanRef.current) {
			console.log(`Cancelling current process for ${currentProcessingPlanRef.current}`);
			resetPaymentHook();
			currentProcessingPlanRef.current = null;
			setProcessingPlan(null);
		}
	}, [resetPaymentHook]);

	/**
	 * Handle flow change
	 */
	const handleFlowChange = useCallback(() => setShowSelector((prev) => !prev), []);

	/**
	 * Handle flow selection
	 */
	const handleFlowSelect = useCallback(
		async (flow: PaymentFlow) => {
			await selectFlow(flow);
			triggerAnimation();
		},
		[selectFlow, triggerAnimation]
	);

	/**
	 * Handle plan selection
	 */
	const handleSelectPlan = useCallback(
		(plan: PaymentPlan) => {
			setSelectedPlan(plan);
			if (onSelectPlan) {
				onSelectPlan(plan);
			}
		},
		[onSelectPlan]
	);

	/**
	 * Calculate price based on billing interval and discounts
	 */
	const calculatePrice = useCallback(
		(plan: PricingConfig): number => {
			if (billingInterval !== PaymentInterval.YEARLY || !plan.annualDiscount) {
				return plan.price;
			}

			const annualPrice = plan.price * 12;
			const discountMultiplier = 1 - plan.annualDiscount / 100;

			return Math.round(annualPrice * discountMultiplier);
		},
		[billingInterval]
	);

	/**
	 * Get the currency symbol for the current currency
	 */
	const currencySymbol = useMemo(() => getCurrencySymbol(currency), [currency]);

	/**
	 * Format a price amount with the current currency symbol
	 * Uses formatAmountWithSymbol for proper decimal handling per currency
	 * (e.g., JPY uses 0 decimals, USD uses 2)
	 */
	const formatPrice = useCallback(
		(amount: number): string => {
			return formatAmountWithSymbol(amount, currency);
		},
		[currency]
	);

	/**
	 * Get savings text for yearly billing
	 */
	const getSavingsText = useCallback(
		(plan: PricingConfig): string | null => {
			if (billingInterval !== PaymentInterval.YEARLY || !plan.annualDiscount) {
				return null;
			}

			const monthlyTotal = plan.price * 12;
			const yearlyPrice = calculatePrice(plan);
			const savings = monthlyTotal - yearlyPrice;
			return tBilling('SAVE_PER_YEAR', { amount: formatAmountWithSymbol(savings, currency) });
		},
		[billingInterval, calculatePrice, currency, tBilling]
	);

	/**
	 * Handle checkout process
	 */
	const handleCheckout = useCallback(
		async (plan: PricingConfig) => {
			if (isManualCheckout) {
				// `provider: manual` — the operator opted out of in-site checkout,
				// so return before the sign-in prompt and before any gateway
				// branch below (spec 046, Q-046a).
				console.warn(
					'[PRICING] works.yml sets pricing.provider: manual — no in-site checkout is started for ' +
						`plan "${plan.id}". Payment must be collected outside this site.`
				);
				return;
			}

			if (!user?.id) {
				loginModal.onOpen('Please sign in to continue with your purchase.');
				return;
			}

			// Si un autre plan est en cours de traitement, on l'annule d'abord
			if (currentProcessingPlanRef.current && currentProcessingPlanRef.current !== plan.id) {
				console.log(
					`Cancelling previous process for ${currentProcessingPlanRef.current}, starting new process for ${plan.id}`
				);
				toast.info(`Switching to ${plan.name} plan...`);
				cancelCurrentProcess();
			}

			// Update the current processing plan state
			currentProcessingPlanRef.current = plan.id;
			setProcessingPlan(plan.id);

			try {
				if (paymentProvider === PaymentProvider.LEMONSQUEEZY) {
					// Get currency-aware variant ID using multi-currency configs
					// Map plan.id to plan name for billing configs with explicit validation
					const planName = validateAndMapPlanName(plan.id);
					const interval = billingInterval === PaymentInterval.YEARLY ? 'yearly' : 'monthly';

					// Try to get currency-aware variant ID
					const currencyVariantConfig = getLemonSqueezyPriceConfig(planName, currency, interval);

					// Use currency-aware variant ID if available, otherwise fallback to plan's variant ID
					let variantId: string | undefined;
					if (currencyVariantConfig?.priceId) {
						variantId = currencyVariantConfig.priceId;
					} else {
						variantId = plan.lemonVariantId;
					}

					if (!variantId) {
						toast.error('No variant ID found for plan');
						currentProcessingPlanRef.current = null;
						setProcessingPlan(null);
						return;
					}
					// Create checkout session for Lemonsqueezy
					// Set planForPayment to show in modal (only for embedded mode)
					if (collectPaymentModeConfig().lemonSqueezy) {
						setPlanForPayment(plan);
						setShowPaymentForm(true);
					}

					// Lemonsqueezy checkout hook
					await lemonsqueezyHook.handleSubmitWithParams({
						variantId: Number(variantId),
						defaultPrice: plan.price,
						metadata: {
							source: 'checkout-button',
							timestamp: new Date().toISOString(),
							planId: plan.id,
							planName: plan.name,
							billingInterval: billingInterval,
							userId: user.id,
							email: user.email,
							currency: currency
						},
						embedded: collectPaymentModeConfig().lemonSqueezy,
						dark: isDark
					});
				} else if (paymentProvider === PaymentProvider.POLAR) {
					// Check if the product ID is valid
					const polarPaymentMode = collectPaymentModeConfig().polar;
					if (polarPaymentMode) {
						setPlanForPayment(plan);
						setShowPaymentForm(true);
						// Don't return here, we need to create the session to get the URL
					}

					// Get currency-aware price ID
					const planName = validateAndMapPlanName(plan.id);
					const interval = billingInterval === PaymentInterval.YEARLY ? 'yearly' : 'monthly';
					const polarPriceConfig = getPolarPriceConfig(planName, currency, interval);

					const priceId = polarPriceConfig?.priceId || plan.polarProductId;

					if (!priceId) {
						toast.error('No product ID found for plan', {
							description: `Plan: ${plan.name}, ID: ${plan.id}`
						});
						currentProcessingPlanRef.current = null;
						setProcessingPlan(null);
						return;
					}

					await polarHook.createCheckoutSession(priceId, user as any, plan, billingInterval);
				} else if (paymentProvider === PaymentProvider.STRIPE) {
					const stripePaymentMode = collectPaymentModeConfig().stripe;

					if (stripePaymentMode) {
						console.log('Using embedded payment mode');
						setPlanForPayment(plan);
						setShowPaymentForm(true);
						currentProcessingPlanRef.current = null;
						setProcessingPlan(null);
						return;
					}

					// Create checkout session for Stripe
					if (!plan.stripeProductId) {
						toast.error('No product ID found for plan', {
							description: `Plan: ${plan.name}, ID: ${plan.id}`
						});
						currentProcessingPlanRef.current = null;
						setProcessingPlan(null);
						return;
					}
					await stripeHook.createCheckoutSession(plan, user as any, billingInterval);
				}
			} catch (checkoutError) {
				// Log error if checkout fails
				console.error('Checkout error:', checkoutError);
				toast.error('Failed to create checkout session. Please try again.');
			} finally {
				// Only reset if it's still the same plan being processed
				if (currentProcessingPlanRef.current === plan.id) {
					currentProcessingPlanRef.current = null;
					setProcessingPlan(null);
				}
			}
		},
		[
			user,
			cancelCurrentProcess,
			loginModal,
			isManualCheckout,
			paymentProvider,
			lemonsqueezyHook,
			stripeHook,
			billingInterval,
			polarHook,
			currency,
			isDark
		]
	);

	// Computed values
	const isButton = selectedFlow === 'pay_at_end';

	// Effect to reset plan if paid plans become unavailable
	useEffect(() => {
		if (!shouldShowPaidPlans && selectedPlan && selectedPlan !== PaymentPlan.FREE) {
			setSelectedPlan(PaymentPlan.FREE);
		}
	}, [shouldShowPaidPlans, selectedPlan]);

	// Effect to apply plan selection when the `?plan=` query param changes after mount
	// (e.g. client-side navigation). The lazy initializer above covers the first render.
	useEffect(() => {
		const planFromUrl = searchParams.get('plan');

		if (!planFromUrl || planFromUrl === lastAppliedUrlPlanRef.current) return;
		if (!(Object.values(PaymentPlan) as string[]).includes(planFromUrl)) return;

		lastAppliedUrlPlanRef.current = planFromUrl;
		handleSelectPlan(planFromUrl as PaymentPlan);
	}, [searchParams, handleSelectPlan]);

	// Effect to handle checkout error
	const lemonSqueezyEmbedded = collectPaymentModeConfig().lemonSqueezy;
	useEffect(() => {
		if (error) {
			toast.error('Failed to create checkout session. Please try again.');
			setProcessingPlan(null);
			return;
		}

		if (isSuccess) {
			if (paymentProvider === PaymentProvider.LEMONSQUEEZY && lemonSqueezyEmbedded) {
				// Don't show toast for embedded mode as it opens immediately
			} else {
				toast.success(`Checkout session created! Redirecting to ${paymentProvider}...`);
			}
			setProcessingPlan(null);
		}
	}, [error, isSuccess, paymentProvider, lemonSqueezyEmbedded]);

	return {
		// State
		showSelector,
		billingInterval,
		processingPlan,
		selectedPlan,
		selectedFlow,
		isButton,

		// Actions
		setShowSelector,
		setBillingInterval,
		setSelectedPlan,
		handleFlowChange,
		handleFlowSelect,
		handleSelectPlan,
		handleCheckout,
		cancelCurrentProcess,
		calculatePrice,
		getSavingsText,

		// Data
		user,
		config,
		FREE,
		STANDARD,
		PREMIUM,
		freePlanFeatures,
		standardPlanFeatures,
		premiumPlanFeatures,
		getPlanConfig: (planId: string) => getPlanConfig(planId as PaymentPlan),
		getActionText: (planId: string) => getActionText(planId as PaymentPlan),
		getNotLoggedInActionText: (planId: string) => getNotLoggedInActionText(planId as PaymentPlan),
		isLoading,
		error,
		provider: paymentProvider,
		/** `works.yml` declared `pricing.provider: manual` — no in-site checkout (spec 046). */
		isManualCheckout,
		isSuccess,
		t,
		tBilling,
		router,
		loginModal,

		// Currency-related
		currency,
		currencySymbol,
		formatPrice,
		clientSecret,
		isReady,

		// Payment form modal
		paymentForm: {
			isOpen: showPaymentForm,
			planForPayment,
			openPaymentForm: (plan: PricingConfig) => {
				if (!user?.id) {
					loginModal.onOpen('Please sign in to continue with your purchase.');
					return;
				}
				setPlanForPayment(plan);
				setShowPaymentForm(true);
			},
			closePaymentForm: () => {
				setShowPaymentForm(false);
				setPlanForPayment(null);
				// Clear checkout URL if using LemonSqueezy to prevent stale state
				if (paymentProvider === PaymentProvider.LEMONSQUEEZY) {
					lemonsqueezyHook.clearCheckout();
				}
				// Clear checkout URL if using Polar
				if (paymentProvider === PaymentProvider.POLAR) {
					polarHook.reset();
				}
			},
			onPaymentSuccess: async (paymentMethodId: string) => {
				if (!planForPayment?.stripePriceId) {
					toast.error('Missing configuration: No price ID found for this plan.');
					return;
				}

				const toastId = toast.loading('Creating subscription...');

				try {
					await createSubscription.mutateAsync({
						priceId: planForPayment.stripePriceId,
						paymentMethodId
					});
					toast.success('Subscription created successfully!', { id: toastId });
					setShowPaymentForm(false);
					setPlanForPayment(null);
					// Optionally redirect to success page or dashboard
					router.push('/pricing/success');
				} catch (error) {
					toast.error('Failed to create subscription. Please try again or contact support.', { id: toastId });
					console.error('Subscription creation failed:', error);
				}
			},
			onPaymentError: (error: Error) => {
				toast.error(`Payment failed: ${error.message}`);
			},
			clientSecret,
			checkoutUrl: lemonsqueezyHook.checkoutUrl || polarHook.checkoutUrl,
			isReady,
			isError
		}
	} satisfies UsePricingSectionReturn;
}
