'use client';

import { PlanCard } from './plan-card';
import { Check, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PaymentInterval, PaymentPlan, SponsorAdPricing } from '@/lib/constants';
import { PaymentFlowSelectorModal } from '../payment';
import { PricingConfig } from '@/lib/content';
import { usePricingSection } from '@/hooks/use-pricing-section';
import { resolveGatewayProvider } from '@/lib/utils/payment-provider';
import { usePaymentAvailability } from '@/hooks/use-payment-availability';
import { useTheme } from 'next-themes';
import { useDisclosure } from '@heroui/react';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { PaymentFormModal } from '@/components/payment/stripe-payment-modal';
import { useEffect } from 'react';
import { useAnalytics } from '@/hooks/use-analytics';
import { AnalyticsEvent } from '@/lib/analytics/types';

interface PricingSectionProps {
	onSelectPlan?: (plan: PaymentPlan) => void;
	isReview?: boolean;
	initialSelectedPlan?: PaymentPlan | null;
}

export function PricingSection({ onSelectPlan, isReview, initialSelectedPlan }: PricingSectionProps) {
	const { resolvedTheme } = useTheme();
	const theme = resolvedTheme as 'light' | 'dark';
	const { isOpen: isModalOpen, onOpen: onOpenSelectorModal, onClose: onCloseSelectorModal } = useDisclosure();
	const { shouldShowPaidPlans } = usePaymentAvailability();
	const { track } = useAnalytics();

	const {
		FREE,
		STANDARD,
		PREMIUM,
		getPlanConfig,
		getActionText,
		getNotLoggedInActionText,
		isLoading,
		error,
		user,
		t,
		tBilling,
		router,
		billingInterval,
		setBillingInterval,
		processingPlan,
		selectedPlan,
		selectedFlow,
		isButton,
		handleFlowSelect,
		handleSelectPlan,
		handleCheckout,
		calculatePrice,
		getSavingsText,
		clientSecret,
		isReady,

		freePlanFeatures,
		standardPlanFeatures,
		premiumPlanFeatures,
		loginModal,
		formatPrice,
		currency,
		paymentForm,
		provider
	} = usePricingSection({
		onSelectPlan: onSelectPlan,
		initialSelectedPlan: initialSelectedPlan,
		isReview
	});

	useEffect(() => {
		if (!isReview) {
			track(AnalyticsEvent.PRICING_VIEWED, {
				source: 'pricing_page'
			});
		}
	}, [isReview, track]);

	return (
		<div className="relative">
			{/* Header — mono headline, left-aligned (minimal, 21st.dev style) */}
			{!isReview && (
				<header className="max-w-3xl mb-12 sm:mb-16">
					<h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 dark:text-white leading-[1.05]">
						{t('CHOOSE_YOUR_PERFECT_PLAN')}
					</h1>
					<p className="mt-5 text-base sm:text-lg text-gray-500 dark:text-gray-400 max-w-xl">
						{t('DESCRIPTION')}
					</p>
				</header>
			)}

			{/* Billing Interval Selector */}
			<div className="mb-10">
				<div className="inline-flex items-center rounded-full bg-gray-100 dark:bg-white/[0.04] p-1 gap-1">
					<button
						type="button"
						onClick={() => setBillingInterval(PaymentInterval.MONTHLY)}
						className={cn(
							'h-9 px-5 rounded-full text-sm font-medium transition-colors cursor-pointer',
							billingInterval === PaymentInterval.MONTHLY
								? 'bg-white text-gray-900 dark:bg-white/[0.1] dark:text-white'
								: 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
						)}
					>
						{tBilling('MONTHLY')}
					</button>
					<button
						type="button"
						onClick={() => setBillingInterval(PaymentInterval.YEARLY)}
						className={cn(
							'h-9 px-5 rounded-full text-sm font-medium transition-colors cursor-pointer inline-flex items-center gap-2',
							billingInterval === PaymentInterval.YEARLY
								? 'bg-white text-gray-900 dark:bg-white/[0.1] dark:text-white'
								: 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
						)}
					>
						<span>{tBilling('YEARLY')}</span>
						<span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-400">
							-20%
						</span>
					</button>
				</div>
			</div>

			{/* Plan Grid */}
			<div
				className={cn(
					'grid gap-6 mb-16',
					shouldShowPaidPlans ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 max-w-md'
				)}
			>
				<PlanCard
					plan={PaymentPlan.FREE}
					title={getPlanConfig(PaymentPlan.FREE).name}
					description={getPlanConfig(PaymentPlan.FREE).description}
					price={formatPrice(FREE ? calculatePrice(FREE) : 0)}
					priceUnit={t('PER_MONTH')}
					features={freePlanFeatures}
					isSelected={selectedPlan === PaymentPlan.FREE}
					onSelect={handleSelectPlan}
					actionText={
						isReview
							? t('SELECT_FREE')
							: error
								? tBilling('ERROR_TRY_AGAIN')
								: !user
									? getNotLoggedInActionText(PaymentPlan.FREE)
									: processingPlan === FREE?.id && isLoading
										? tBilling('PROCESSING')
										: getActionText(PaymentPlan.FREE)
					}
					actionHref={isReview ? undefined : '/submit'}
					isLoading={processingPlan === FREE?.id && isLoading}
					isButton={isReview ? false : isButton}
					onClick={() => {
						if (!user?.id) {
							loginModal?.onOpen('Please sign in to continue with your purchase.');
							return;
						}
						if (isReview) {
							handleSelectPlan(PaymentPlan.FREE);
							return;
						}
						handleCheckout(FREE as PricingConfig);
					}}
					selectedFlow={selectedFlow}
					onFlowChange={isReview ? undefined : handleFlowSelect}
				>
					{FREE && getSavingsText(FREE) && (
						<span className="text-emerald-600 dark:text-emerald-400">
							{getSavingsText(FREE)}
						</span>
					)}
				</PlanCard>

				{shouldShowPaidPlans && (
					<>
						<PlanCard
							plan={PaymentPlan.STANDARD}
							title={getPlanConfig(PaymentPlan.STANDARD).name}
							description={getPlanConfig(PaymentPlan.STANDARD).description}
							price={formatPrice(STANDARD ? calculatePrice(STANDARD) : 0)}
							priceUnit={billingInterval === PaymentInterval.YEARLY ? t('PER_YEAR') : t('PER_MONTH')}
							features={standardPlanFeatures}
							isPopular={true}
							isSelected={selectedPlan === PaymentPlan.STANDARD}
							onSelect={handleSelectPlan}
							actionText={
								isReview
									? t('SELECT_STANDARD')
									: error
										? tBilling('ERROR_TRY_AGAIN')
										: !user
											? getNotLoggedInActionText(PaymentPlan.STANDARD)
											: processingPlan === STANDARD?.id && isLoading
												? tBilling('PROCESSING')
												: getActionText(PaymentPlan.STANDARD)
							}
							actionVariant="default"
							actionHref={isReview ? undefined : '/submit'}
							isLoading={processingPlan === STANDARD?.id && isLoading}
							isButton={isReview ? false : isButton}
							onClick={() => {
								if (!user?.id) {
									loginModal?.onOpen('Please sign in to continue with your purchase.');
									return;
								}
								if (isReview) {
									handleSelectPlan(PaymentPlan.STANDARD);
									return;
								}
								handleCheckout(STANDARD as PricingConfig);
							}}
							selectedFlow={selectedFlow}
							onFlowChange={isReview ? undefined : handleFlowSelect}
							onOpenModal={isReview ? undefined : onOpenSelectorModal}
						>
							{getSavingsText(STANDARD as PricingConfig) && (
								<span className="text-emerald-600 dark:text-emerald-400">
									{getSavingsText(STANDARD as PricingConfig)}
								</span>
							)}
						</PlanCard>

						<PlanCard
							plan={PaymentPlan.PREMIUM}
							title={getPlanConfig(PaymentPlan.PREMIUM).name}
							description={getPlanConfig(PaymentPlan.PREMIUM).description}
							price={formatPrice(PREMIUM ? calculatePrice(PREMIUM) : 0)}
							priceUnit={billingInterval === PaymentInterval.YEARLY ? t('PER_YEAR') : t('PER_MONTH')}
							features={premiumPlanFeatures}
							isSelected={selectedPlan === PaymentPlan.PREMIUM}
							onSelect={handleSelectPlan}
							actionText={
								isReview
									? t('SELECT_PREMIUM')
									: error
										? tBilling('ERROR_TRY_AGAIN')
										: !user
											? getNotLoggedInActionText(PaymentPlan.PREMIUM)
											: processingPlan === PREMIUM?.id && isLoading
												? tBilling('PROCESSING')
												: getActionText(PaymentPlan.PREMIUM)
							}
							actionVariant="default"
							actionHref={isReview ? undefined : '/submit'}
							isButton={isReview ? false : isButton}
							isLoading={processingPlan === PREMIUM?.id && isLoading}
							onClick={() => {
								if (!user?.id) {
									loginModal?.onOpen('Please sign in to continue with your purchase.');
									return;
								}
								if (isReview) {
									handleSelectPlan(PaymentPlan.PREMIUM);
									return;
								}
								handleCheckout(PREMIUM as PricingConfig);
							}}
							selectedFlow={selectedFlow}
							onFlowChange={isReview ? undefined : handleFlowSelect}
							onOpenModal={isReview ? undefined : onOpenSelectorModal}
						>
							{getSavingsText(PREMIUM as PricingConfig) && (
								<span className="text-emerald-600 dark:text-emerald-400">
									{getSavingsText(PREMIUM as PricingConfig)}
								</span>
							)}
						</PlanCard>
					</>
				)}
			</div>

			{/* Continue Section — only on the standalone /pricing page */}
			{!isReview && selectedPlan && (
				<div className="mb-16">
					<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03]">
						<div>
							<p className="text-base font-medium text-gray-900 dark:text-white">
								{t('GREAT_CHOICE')} {selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)}{' '}
								{t('PLAN')}
							</p>
							<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
								{t('READY_TO_GET_STARTED')}
							</p>
						</div>
						<button
							onClick={() => router.push('/submit')}
							className="inline-flex items-center gap-2 h-11 px-6 rounded-full font-medium text-sm bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 transition-colors cursor-pointer"
						>
							<span>{t('CONTINUE_TO_NEXT_STEP')}</span>
							<ArrowRight className="w-4 h-4" />
						</button>
					</div>
				</div>
			)}

			{/* Sponsor Block — simplified, minimal card */}
			{!isReview && (
				<section className="mb-16">
					<div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-8 sm:p-10">
						<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
							<div className="max-w-xl">
								<span className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300">
									{t('SPONSOR_BADGE')}
								</span>
								<h3 className="mt-4 text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white tracking-tight">
									{t('SPONSOR_TITLE')}
								</h3>
								<p className="mt-3 text-sm sm:text-base text-gray-500 dark:text-gray-400 leading-relaxed">
									{t('SPONSOR_DESCRIPTION')}
								</p>
								<ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
									{[t('SPONSOR_FEATURE_1'), t('SPONSOR_FEATURE_2'), t('SPONSOR_FEATURE_3')].map(
										(feat) => (
											<li
												key={feat}
												className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
											>
												<Check className="w-4 h-4 text-emerald-500" strokeWidth={2.5} />
												<span>{feat}</span>
											</li>
										)
									)}
								</ul>
							</div>
							<div className="shrink-0 w-full lg:w-auto lg:min-w-[260px]">
								<div className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.04] p-6">
									<div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
										{t('SPONSOR_STARTING_FROM')}
									</div>
									<div className="flex items-baseline gap-1">
										<span className="text-4xl font-bold text-gray-900 dark:text-white">
											${SponsorAdPricing.WEEKLY}
										</span>
										<span className="text-sm text-gray-500 dark:text-gray-400">
											/{t('SPONSOR_WEEK')}
										</span>
									</div>
									<div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
										{t('SPONSOR_OR')} ${SponsorAdPricing.MONTHLY}/{t('SPONSOR_MONTH')}
									</div>
									<Link href="/sponsor">
										<Button className="mt-5 w-full h-11 rounded-full font-medium text-sm bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 transition-colors cursor-pointer">
											{t('SPONSOR_CTA')}
										</Button>
									</Link>
								</div>
							</div>
						</div>
					</div>
				</section>
			)}

			{/* Trust Section — minimal three-up */}
			{!isReview && (
				<section className="mb-12">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						{[
							{ title: t('INSTANT_ACTIVATION'), desc: t('GET_STARTED_IMMEDIATELY') },
							{ title: t('NO_SETUP_FEES'), desc: t('PAY_ONLY_WHAT_YOU_USE') },
							{ title: t('PREMIUM_SUPPORT'), desc: t('EXPERT_ASSISTANCE') }
						].map((item) => (
							<div
								key={item.title}
								className="p-5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02]"
							>
								<div className="flex items-center gap-2">
									<Check className="w-4 h-4 text-emerald-500" strokeWidth={2.5} />
									<h4 className="text-sm font-medium text-gray-900 dark:text-white">
										{item.title}
									</h4>
								</div>
								<p className="mt-2 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
									{item.desc}
								</p>
							</div>
						))}
					</div>
				</section>
			)}

			<PaymentFlowSelectorModal
				selectedFlow={selectedFlow}
				isOpen={isModalOpen}
				onClose={onCloseSelectorModal}
				onSelect={handleFlowSelect}
			/>

			<PaymentFormModal
				isOpen={paymentForm.isOpen}
				onClose={paymentForm.closePaymentForm}
				onSuccess={paymentForm.onPaymentSuccess}
				onError={paymentForm.onPaymentError}
				planName={paymentForm.planForPayment?.name}
				planPrice={
					paymentForm.planForPayment ? formatPrice(calculatePrice(paymentForm.planForPayment)) : undefined
				}
				amount={paymentForm.planForPayment ? calculatePrice(paymentForm.planForPayment) : 0}
				currency={currency}
				clientSecret={clientSecret || ''}
				checkoutUrl={paymentForm.checkoutUrl}
				isReady={isReady}
				isError={paymentForm.isError}
				// The modal is only ever opened from a gateway branch of handleCheckout,
				// so `provider` cannot be `manual` here (spec 046).
				provider={resolveGatewayProvider(provider)}
				theme={theme}
				isDismissable={true}
			/>
		</div>
	);
}
