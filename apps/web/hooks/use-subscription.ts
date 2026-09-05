'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiUtils, serverClient } from '@/lib/api/server-api-client';
import { useConfig } from '@/app/[locale]/config';
import { PaymentProvider } from '@/lib/constants';
import { useSelectedCheckoutProvider } from './use-selected-checkout-provider';
import { resolveGatewayProvider, usePaymentProvider } from '@/lib/utils/payment-provider';

// Types
export interface SubscriptionData {
	id: string;
	status: string;
	currentPeriodStart: number;
	currentPeriodEnd: number;
	cancelAtPeriodEnd: boolean;
	metadata: Record<string, any>;
}

export interface CreateSubscriptionRequest {
	priceId: string;
	paymentMethodId: string;
	trialPeriodDays?: number;
}

export interface UpdateSubscriptionRequest {
	subscriptionId: string;
	priceId?: string;
	cancelAtPeriodEnd?: boolean;
	billingInterval?: string;
	planId?: string;
}

export interface BillingPortalSession {
	id: string;
	object: 'billing_portal.session';
	configuration: string;
	created: number;
	customer: string;
	flow: string | null;
	livemode: boolean;
	locale: string | null;
	on_behalf_of: string | null;
	return_url: string;
	url: string;
}

export interface BillingPortalResponse {
	success: boolean;
	message: string;
	data: BillingPortalSession;
}

export interface CancelSubscriptionRequest {
	subscriptionId: string;
	cancelAtPeriodEnd: boolean;
}

export interface ReactivateSubscriptionRequest {
	subscriptionId: string;
}

export interface SubscriptionResponse {
	success: boolean;
	data?: SubscriptionData;
	error?: string;
	message?: string;
}

/**
 * Hook for managing subscriptions (supports multiple payment providers)
 */
export function useSubscription() {
	const queryClient = useQueryClient();
	const config = useConfig();

	// Get user's selected checkout provider from Settings
	const { getActiveProvider } = useSelectedCheckoutProvider();

	// Determine payment provider: User selection takes precedence over config.
	// These mutations act on subscriptions a gateway already created, so a
	// works.yml `provider: manual` (spec 046) carries no information here and
	// keeps the pre-existing Stripe default.
	const configuredProvider = usePaymentProvider(getActiveProvider, config.pricing);
	const paymentProvider = resolveGatewayProvider(configuredProvider);

	// Create subscription mutation
	const createSubscription = useMutation({
		mutationFn: async (data: CreateSubscriptionRequest): Promise<SubscriptionData> => {
			const response = await serverClient.post<SubscriptionData>('/api/stripe/subscription', data);

			if (!apiUtils.isSuccess(response)) {
				throw new Error(apiUtils.getErrorMessage(response) || 'Failed to create subscription');
			}

			return response.data;
		},
		onSuccess: (data) => {
			// Invalidate and refetch related queries
			queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
			queryClient.invalidateQueries({ queryKey: ['user-subscription'] });
			queryClient.invalidateQueries({ queryKey: ['billing'] });

			console.log('Subscription created successfully:', data.id);
		},
		onError: (error) => {
			console.error('Failed to create subscription:', error);
		}
	});

	// Update subscription mutation
	const updateSubscription = useMutation({
		mutationFn: async (data: UpdateSubscriptionRequest): Promise<SubscriptionData> => {
			const response = await serverClient.put<SubscriptionData>('/api/stripe/subscription', data);

			if (!apiUtils.isSuccess(response)) {
				throw new Error(apiUtils.getErrorMessage(response) || 'Failed to update subscription');
			}

			return response.data;
		},
		onSuccess: (data) => {
			// Invalidate and refetch related queries
			queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
			queryClient.invalidateQueries({ queryKey: ['user-subscription'] });
			queryClient.invalidateQueries({ queryKey: ['billing'] });

			console.log('Subscription updated successfully:', data.id);
		},
		onError: (error) => {
			console.error('Failed to update subscription:', error);
		}
	});

	// Update subscription by ID mutation
	const updateSubscriptionById = useMutation({
		mutationFn: async (data: UpdateSubscriptionRequest): Promise<SubscriptionData> => {
			const response = await serverClient.post<SubscriptionData>(
				`/api/stripe/subscription/${data.subscriptionId}/update`
			);

			if (!apiUtils.isSuccess(response)) {
				throw new Error(apiUtils.getErrorMessage(response) || 'Failed to update subscription');
			}

			return response.data;
		},
		onSuccess: (data) => {
			// Invalidate and refetch related queries
			queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
			queryClient.invalidateQueries({ queryKey: ['user-subscription'] });
			queryClient.invalidateQueries({ queryKey: ['billing'] });

			console.log('Subscription updated successfully:', data.id);
		},
		onError: (error) => {
			console.error('Failed to update subscription:', error);
		}
	});

	// Cancel subscription mutation
	const cancelSubscription = useMutation({
		mutationFn: async (data: CancelSubscriptionRequest): Promise<SubscriptionData> => {
			const response = await serverClient.delete<SubscriptionData>('/api/stripe/subscription', {
				body: JSON.stringify(data)
			});

			if (!apiUtils.isSuccess(response)) {
				throw new Error(apiUtils.getErrorMessage(response) || 'Failed to cancel subscription');
			}

			return response.data;
		},
		onSuccess: (data) => {
			// Invalidate and refetch related queries
			queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
			queryClient.invalidateQueries({ queryKey: ['user-subscription'] });
			queryClient.invalidateQueries({ queryKey: ['billing'] });

			console.log('Subscription cancelled successfully:', data.id);
		},
		onError: (error) => {
			console.error('Failed to cancel subscription:', error);
		}
	});

	// Cancel subscription by ID mutation
	const cancelSubscriptionById = useMutation({
		mutationFn: async (data: CancelSubscriptionRequest): Promise<SubscriptionData> => {
			const response = await serverClient.post<SubscriptionData>(
				`/api/stripe/subscription/${data.subscriptionId}/cancel`,
				data
			);

			if (!apiUtils.isSuccess(response)) {
				throw new Error(apiUtils.getErrorMessage(response) || 'Failed to cancel subscription');
			}

			return response.data;
		},
		onSuccess: (data) => {
			// Invalidate and refetch related queries
			queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
			queryClient.invalidateQueries({ queryKey: ['user-subscription'] });
			queryClient.invalidateQueries({ queryKey: ['billing'] });

			console.log('Subscription cancelled successfully:', data.id);
		},
		onError: (error) => {
			console.error('Failed to cancel subscription:', error);
		}
	});

	// Reactivate subscription mutation
	const reactivateSubscription = useMutation({
		mutationFn: async (data: ReactivateSubscriptionRequest): Promise<SubscriptionData> => {
			const response = await serverClient.post<SubscriptionData>(
				`/api/stripe/subscription/${data.subscriptionId}/reactivate`,
				{}
			);

			if (!apiUtils.isSuccess(response)) {
				throw new Error(apiUtils.getErrorMessage(response) || 'Failed to reactivate subscription');
			}

			return response.data;
		},
		onSuccess: (data) => {
			// Invalidate and refetch related queries
			queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
			queryClient.invalidateQueries({ queryKey: ['user-subscription'] });
			queryClient.invalidateQueries({ queryKey: ['billing'] });

			console.log('Subscription reactivated successfully:', data.id);
		},
		onError: (error) => {
			console.error('Failed to reactivate subscription:', error);
		}
	});

	const createBillingPortalSession = useMutation({
		mutationFn: async (): Promise<BillingPortalResponse> => {
			// Determine the API endpoint based on the current provider
			const portalEndpoint =
				paymentProvider === PaymentProvider.POLAR
					? '/api/polar/subscription/portal'
					: '/api/stripe/subscription/portal';

			const response = await serverClient.post<BillingPortalResponse>(portalEndpoint);
			if (!apiUtils.isSuccess(response)) {
				throw new Error(apiUtils.getErrorMessage(response) || 'Failed to create billing portal session');
			}
			return response.data;
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ['billing'] });
			console.log('Billing portal session created successfully:', data.data.url);
		},
		onError: (error) => {
			console.error('Failed to create billing portal session:', error);
		}
	});

	return {
		// Mutations
		createSubscription,
		updateSubscription,
		updateSubscriptionById,
		cancelSubscription,
		cancelSubscriptionById,
		reactivateSubscription,
		createBillingPortalSession,

		// Loading states
		isCreating: createSubscription.isPending,
		isUpdating: updateSubscription.isPending,
		isUpdatingById: updateSubscriptionById.isPending,
		isCancelling: cancelSubscription.isPending,
		isCancellingById: cancelSubscriptionById.isPending,
		isReactivating: reactivateSubscription.isPending,

		// Error states
		createError: createSubscription.error,
		updateError: updateSubscription.error,
		updateByIdError: updateSubscriptionById.error,
		cancelError: cancelSubscription.error,
		cancelByIdError: cancelSubscriptionById.error,
		reactivateError: reactivateSubscription.error,

		// Success states
		isCreateSuccess: createSubscription.isSuccess,
		isUpdateSuccess: updateSubscription.isSuccess,
		isUpdateByIdSuccess: updateSubscriptionById.isSuccess,
		isCancelSuccess: cancelSubscription.isSuccess,
		isCancelByIdSuccess: cancelSubscriptionById.isSuccess,
		isReactivateSuccess: reactivateSubscription.isSuccess,

		// Billing portal session states
		isCreateBillingPortalSessionPending: createBillingPortalSession.isPending,
		isCreateBillingPortalSessionSuccess: createBillingPortalSession.isSuccess,
		isCreateBillingPortalSessionError: createBillingPortalSession.isError,

		// Reset functions
		resetCreate: createSubscription.reset,
		resetUpdate: updateSubscription.reset,
		resetUpdateById: updateSubscriptionById.reset,
		resetCancel: cancelSubscription.reset,
		resetCancelById: cancelSubscriptionById.reset,
		resetReactivate: reactivateSubscription.reset
	};
}

/**
 * Hook for fetching user subscription data
 */
export function useUserSubscription() {
	return useQuery({
		queryKey: ['user-subscription'],
		queryFn: async (): Promise<SubscriptionData | null> => {
			try {
				const response = await serverClient.get<SubscriptionData>('/api/user/subscription');

				if (apiUtils.isSuccess(response)) {
					return response.data;
				}

				return null;
			} catch (error) {
				console.error('Failed to fetch user subscription:', error);
				return null;
			}
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000 // 10 minutes
	});
}

/**
 * Hook for fetching subscription by ID
 */
export function useSubscriptionById(subscriptionId: string) {
	return useQuery({
		queryKey: ['subscription', subscriptionId],
		queryFn: async (): Promise<SubscriptionData | null> => {
			if (!subscriptionId) return null;

			try {
				const response = await serverClient.get<SubscriptionData>(`/api/stripe/subscription/${subscriptionId}`);

				if (apiUtils.isSuccess(response)) {
					return response.data;
				}

				return null;
			} catch (error) {
				console.error('Failed to fetch subscription:', error);
				return null;
			}
		},
		enabled: !!subscriptionId,
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000 // 10 minutes
	});
}

/**
 * Hook for subscription management with optimistic updates
 */
export function useSubscriptionManager() {
	const queryClient = useQueryClient();

	const { updateSubscription, cancelSubscription } = useSubscription();

	// Optimistic update for subscription creation
	const createSubscriptionOptimistic = useMutation<
		SubscriptionData,
		Error,
		CreateSubscriptionRequest,
		{ previousSubscription: any }
	>({
		mutationFn: async (data: CreateSubscriptionRequest): Promise<SubscriptionData> => {
			const response = await serverClient.post<SubscriptionData>('/api/stripe/subscription', data);

			if (!apiUtils.isSuccess(response)) {
				throw new Error(apiUtils.getErrorMessage(response) || 'Failed to create subscription');
			}

			return response.data;
		},
		onMutate: async () => {
			// Cancel any outgoing refetches
			await queryClient.cancelQueries({ queryKey: ['user-subscription'] });

			// Snapshot the previous value
			const previousSubscription = queryClient.getQueryData(['user-subscription']);

			// Optimistically update to the new value
			queryClient.setQueryData(['user-subscription'], {
				id: 'temp-id',
				status: 'incomplete',
				currentPeriodStart: Date.now(),
				currentPeriodEnd: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
				cancelAtPeriodEnd: false,
				metadata: { userId: 'temp-user' }
			});

			return { previousSubscription };
		},
		onError: (_, __, context) => {
			// If the mutation fails, use the context returned from onMutate to roll back
			if (context?.previousSubscription) {
				queryClient.setQueryData(['user-subscription'], context.previousSubscription);
			}
		},
		onSettled: () => {
			// Always refetch after error or success
			queryClient.invalidateQueries({ queryKey: ['user-subscription'] });
		}
	});

	return {
		createSubscription: createSubscriptionOptimistic,
		updateSubscription,
		cancelSubscription,

		// Loading states
		isCreating: createSubscriptionOptimistic.isPending,
		isUpdating: updateSubscription.isPending,
		isCancelling: cancelSubscription.isPending,

		// Error states
		createError: createSubscriptionOptimistic.error,
		updateError: updateSubscription.error,
		cancelError: cancelSubscription.error
	};
}

// Types are already exported above, no need to re-export
