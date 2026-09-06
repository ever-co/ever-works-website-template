'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { serverClient, apiUtils } from '@/lib/api/server-api-client';
import { useConfig } from '@/app/[locale]/config';
import { PaymentProvider } from '@/lib/constants';
import { useSelectedCheckoutProvider } from './use-selected-checkout-provider';
import { resolveGatewayProvider, usePaymentProvider } from '@/lib/utils/payment-provider';

export interface AutoRenewalStatus {
	subscriptionId: string;
	autoRenewal: boolean;
	cancelAtPeriodEnd: boolean;
	endDate: string | null;
	paymentProvider?: string;
}

export interface UpdateAutoRenewalRequest {
	subscriptionId: string;
	enabled: boolean;
	paymentProvider: PaymentProvider;
}

export interface UpdateAutoRenewalResponse {
	success: boolean;
	subscription: {
		id: string;
		autoRenewal: boolean;
		cancelAtPeriodEnd: boolean;
		endDate: string | null;
		[key: string]: any;
	};
	message: string;
}

interface AutoRenewalError extends Error {
	status?: number;
	code?: string;
}

/**
 * Query key factory for auto-renewal status
 * @param subscriptionId - The subscription ID
 * @param paymentProvider - The payment provider (e.g., 'stripe', 'lemonsqueezy', 'polar')
 * @returns Query key tuple
 */
export const AUTO_RENEWAL_QUERY_KEY = (subscriptionId: string, paymentProvider?: string) =>
	['auto-renewal', subscriptionId, paymentProvider ?? 'stripe'] as const;

const CACHE_CONFIG = {
	STALE_TIME: 2 * 60 * 1000, // 2 minutes
	GC_TIME: 10 * 60 * 1000 // 10 minutes
} as const;

/**
 * Fetch auto-renewal status from the API
 * @param subscriptionId - The subscription ID
 * @returns Promise with auto-renewal status
 */
const fetchAutoRenewalStatus = async (subscriptionId: string, provider: string): Promise<AutoRenewalStatus> => {
	const response = await serverClient.get<AutoRenewalStatus>(
		`/api/payment/${subscriptionId}?provider=${encodeURIComponent(provider)}`
	);

	if (!apiUtils.isSuccess(response)) {
		const error = new Error(apiUtils.getErrorMessage(response)) as AutoRenewalError;
		error.status = 'status' in response ? (response.status as number) : undefined;
		throw error;
	}

	return response.data;
};

/**
 * Update auto-renewal status via the API
 * @param request - Update request with subscriptionId, enabled flag, and payment provider
 * @returns Promise with update response
 */
const updateAutoRenewalApi = async ({
	subscriptionId,
	enabled,
	paymentProvider
}: UpdateAutoRenewalRequest): Promise<UpdateAutoRenewalResponse> => {
	const response = await serverClient.patch<UpdateAutoRenewalResponse>(`/api/payment/${subscriptionId}`, {
		enabled,
		paymentProvider
	});

	if (!apiUtils.isSuccess(response)) {
		const error = new Error(apiUtils.getErrorMessage(response)) as AutoRenewalError;
		error.status = 'status' in response ? (response.status as number) : undefined;
		throw error;
	}

	return response.data;
};

export interface UseAutoRenewalOptions {
	/** The subscription ID to manage auto-renewal for */
	subscriptionId: string;
	/** Whether to enable the query (defaults to true) */
	enabled?: boolean;
	/** Callback when auto-renewal status is successfully loaded */
	onSuccess?: (data: AutoRenewalStatus) => void;
	/** Callback when loading auto-renewal status fails */
	onError?: (error: AutoRenewalError) => void;
	/** Callback when auto-renewal is successfully updated */
	onUpdateSuccess?: (data: UpdateAutoRenewalResponse) => void;
	/** Callback when updating auto-renewal fails */
	onUpdateError?: (error: AutoRenewalError) => void;
}

export interface UseAutoRenewalReturn {
	// Data
	/** Full auto-renewal status object */
	autoRenewalStatus: AutoRenewalStatus | undefined;
	/** Whether auto-renewal is enabled */
	autoRenewal: boolean | undefined;
	/** Whether subscription will cancel at period end */
	cancelAtPeriodEnd: boolean;
	/** Subscription end date */
	endDate: string | null;
	/** Current payment provider */
	paymentProvider: PaymentProvider;

	// Query Status
	/** Whether the query is loading */
	isLoading: boolean;
	/** Whether the query errored */
	isError: boolean;
	/** Whether the query succeeded */
	isSuccess: boolean;
	/** Query error if any */
	error: AutoRenewalError | null;

	// Mutation Status
	/** Whether an update is in progress */
	isUpdating: boolean;
	/** Update error if any */
	updateError: AutoRenewalError | null;
	/** Whether the last update succeeded */
	isUpdateSuccess: boolean;

	// Actions
	/** Refetch the auto-renewal status */
	refetch: () => void;
	/** Update auto-renewal status (fire-and-forget) */
	updateAutoRenewal: (enabled: boolean) => void;
	/** Update auto-renewal status (async, returns promise) */
	updateAutoRenewalAsync: (enabled: boolean) => Promise<UpdateAutoRenewalResponse>;
	/** Enable auto-renewal */
	enableAutoRenewal: () => void;
	/** Disable auto-renewal */
	disableAutoRenewal: () => void;
	/** Toggle auto-renewal (convenience method) */
	toggleAutoRenewal: () => void;

	// Cache Management
	/** Invalidate the auto-renewal cache */
	invalidateCache: () => void;
	/** Clear the auto-renewal cache */
	clearCache: () => void;
}

/**
 * Hook for managing subscription auto-renewal status
 *
 * Features:
 * - Automatic payment provider detection (Stripe, LemonSqueezy, Polar)
 * - User provider selection takes precedence over config defaults
 * - Optimistic updates with rollback on error
 * - Smart caching with stale time management
 * - Toast notifications for success/error states
 * - Related query invalidation for data consistency
 *
 * @example
 * ```tsx
 * const {
 *   autoRenewal,
 *   isLoading,
 *   isUpdating,
 *   enableAutoRenewal,
 *   disableAutoRenewal,
 *   toggleAutoRenewal
 * } = useAutoRenewal({
 *   subscriptionId: 'sub_123',
 *   onSuccess: (data) => console.log('Loaded:', data),
 *   onUpdateSuccess: (data) => console.log('Updated:', data)
 * });
 *
 * return (
 *   <Switch
 *     checked={autoRenewal}
 *     disabled={isLoading || isUpdating}
 *     onCheckedChange={toggleAutoRenewal}
 *   />
 * );
 * ```
 */
export function useAutoRenewal(options: UseAutoRenewalOptions): UseAutoRenewalReturn {
	const { subscriptionId, enabled = true, onSuccess, onError, onUpdateSuccess, onUpdateError } = options;

	const queryClient = useQueryClient();
	const config = useConfig();

	// ===================== Payment Provider Detection =====================

	const { getActiveProvider } = useSelectedCheckoutProvider();

	// Determine payment provider: User selection takes precedence over config.
	// Auto-renewal acts on a subscription some gateway already created, so a
	// works.yml `provider: manual` carries no information here and the
	// pre-spec-046 Stripe default is kept.
	const configuredProvider = usePaymentProvider(getActiveProvider, config.pricing);
	const paymentProvider = resolveGatewayProvider(configuredProvider);

	// ===================== Query =====================

	const { data, isLoading, isError, error, refetch, isSuccess } = useQuery<AutoRenewalStatus, AutoRenewalError>({
		queryKey: AUTO_RENEWAL_QUERY_KEY(subscriptionId, paymentProvider),
		queryFn: () => fetchAutoRenewalStatus(subscriptionId, paymentProvider),
		enabled: enabled && !!subscriptionId,
		staleTime: CACHE_CONFIG.STALE_TIME,
		gcTime: CACHE_CONFIG.GC_TIME,
		retry: (failureCount, error) => {
			// Don't retry auth errors
			if (error.status === 401 || error.status === 403) {
				return false;
			}
			// Don't retry not found errors
			if (error.status === 404) {
				return false;
			}
			return failureCount < 3;
		}
	});

	// ===================== Callback Refs for Transition Detection =====================

	const prevIsSuccessRef = useRef(false);
	const prevIsErrorRef = useRef(false);
	const lastSubscriptionIdRef = useRef<string | null>(null);

	// Reset refs when subscriptionId changes
	useEffect(() => {
		if (lastSubscriptionIdRef.current !== subscriptionId) {
			prevIsSuccessRef.current = false;
			prevIsErrorRef.current = false;
			lastSubscriptionIdRef.current = subscriptionId;
		}
	}, [subscriptionId]);

	// Handle onSuccess callback - only call on transition to success
	useEffect(() => {
		const isTransitioningToSuccess = !prevIsSuccessRef.current && isSuccess;

		if (isTransitioningToSuccess && data && onSuccess) {
			onSuccess(data);
		}

		prevIsSuccessRef.current = isSuccess;
	}, [isSuccess, data, onSuccess]);

	// Handle onError callback - only call on transition to error
	useEffect(() => {
		const isTransitioningToError = !prevIsErrorRef.current && isError;

		if (isTransitioningToError && error && onError) {
			onError(error);
		}

		prevIsErrorRef.current = isError;
	}, [isError, error, onError]);

	// ===================== Mutation =====================

	const updateMutation = useMutation<
		UpdateAutoRenewalResponse,
		AutoRenewalError,
		UpdateAutoRenewalRequest,
		{ previousStatus: AutoRenewalStatus | undefined }
	>({
		mutationFn: updateAutoRenewalApi,
		onMutate: async (variables) => {
			// Cancel any outgoing refetches to prevent race conditions
			await queryClient.cancelQueries({
				queryKey: AUTO_RENEWAL_QUERY_KEY(subscriptionId, paymentProvider)
			});

			// Snapshot the previous value for rollback
			const previousStatus = queryClient.getQueryData<AutoRenewalStatus>(
				AUTO_RENEWAL_QUERY_KEY(subscriptionId, paymentProvider)
			);

			// Optimistically update to the new value
			queryClient.setQueryData<AutoRenewalStatus>(
				AUTO_RENEWAL_QUERY_KEY(subscriptionId, paymentProvider),
				(oldData): AutoRenewalStatus => {
					if (!oldData) {
						return {
							subscriptionId,
							autoRenewal: variables.enabled,
							cancelAtPeriodEnd: !variables.enabled,
							endDate: null,
							paymentProvider
						};
					}
					return {
						...oldData,
						autoRenewal: variables.enabled,
						cancelAtPeriodEnd: !variables.enabled
					};
				}
			);

			return { previousStatus };
		},
		onSuccess: (response, variables) => {
			// Update the cache with the server response
			queryClient.setQueryData<AutoRenewalStatus>(
				AUTO_RENEWAL_QUERY_KEY(subscriptionId, paymentProvider),
				(oldData): AutoRenewalStatus => ({
					subscriptionId,
					autoRenewal: response.subscription.autoRenewal,
					cancelAtPeriodEnd: response.subscription.cancelAtPeriodEnd,
					endDate: response.subscription.endDate,
					paymentProvider: oldData?.paymentProvider || paymentProvider
				})
			);

			// Invalidate related queries for data consistency
			queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
			queryClient.invalidateQueries({ queryKey: ['user-subscription'] });
			queryClient.invalidateQueries({ queryKey: ['billing'] });

			// Show success toast
			toast.success(
				response.message ||
					(variables.enabled
						? 'Auto-renewal has been enabled successfully'
						: 'Auto-renewal has been disabled successfully')
			);

			// Call user callback if provided
			onUpdateSuccess?.(response);
		},
		onError: (error, _, context) => {
			console.error('Error updating auto-renewal:', error);

			// Rollback to previous value on error
			if (context?.previousStatus) {
				queryClient.setQueryData(
					AUTO_RENEWAL_QUERY_KEY(subscriptionId, paymentProvider),
					context.previousStatus
				);
			}

			// Show error toast
			toast.error(error.message || 'Failed to update auto-renewal status');

			// Call user callback if provided
			onUpdateError?.(error);

			// Refetch to ensure data consistency
			refetch();
		}
	});

	// ===================== Derived Values =====================

	const autoRenewalStatus = data;
	const autoRenewal = data?.autoRenewal;
	const cancelAtPeriodEnd = data?.cancelAtPeriodEnd ?? false;
	const endDate = data?.endDate ?? null;

	// ===================== Actions =====================

	const { mutate, mutateAsync } = updateMutation;

	const updateAutoRenewalAction = useCallback(
		(enabled: boolean) => {
			mutate({
				subscriptionId,
				enabled,
				paymentProvider
			});
		},
		[subscriptionId, paymentProvider, mutate]
	);

	const updateAutoRenewalAsyncAction = useCallback(
		async (enabled: boolean) => {
			return mutateAsync({
				subscriptionId,
				enabled,
				paymentProvider
			});
		},
		[subscriptionId, paymentProvider, mutateAsync]
	);

	const enableAutoRenewalAction = useCallback(() => {
		updateAutoRenewalAction(true);
	}, [updateAutoRenewalAction]);

	const disableAutoRenewalAction = useCallback(() => {
		updateAutoRenewalAction(false);
	}, [updateAutoRenewalAction]);

	const toggleAutoRenewalAction = useCallback(() => {
		if (autoRenewal !== undefined) {
			updateAutoRenewalAction(!autoRenewal);
		}
	}, [autoRenewal, updateAutoRenewalAction]);

	// ===================== Cache Management =====================

	const invalidateCache = useCallback(() => {
		queryClient.invalidateQueries({
			queryKey: AUTO_RENEWAL_QUERY_KEY(subscriptionId, paymentProvider)
		});
	}, [queryClient, subscriptionId, paymentProvider]);

	const clearCache = useCallback(() => {
		queryClient.removeQueries({
			queryKey: AUTO_RENEWAL_QUERY_KEY(subscriptionId, paymentProvider)
		});
	}, [queryClient, subscriptionId, paymentProvider]);

	// ===================== Return =====================

	return {
		// Data
		autoRenewalStatus,
		autoRenewal,
		cancelAtPeriodEnd,
		endDate,
		paymentProvider,

		// Query Status
		isLoading,
		isError,
		isSuccess,
		error: error || null,

		// Mutation Status
		isUpdating: updateMutation.isPending,
		updateError: updateMutation.error || null,
		isUpdateSuccess: updateMutation.isSuccess,

		// Actions
		refetch,
		updateAutoRenewal: updateAutoRenewalAction,
		updateAutoRenewalAsync: updateAutoRenewalAsyncAction,
		enableAutoRenewal: enableAutoRenewalAction,
		disableAutoRenewal: disableAutoRenewalAction,
		toggleAutoRenewal: toggleAutoRenewalAction,

		// Cache Management
		invalidateCache,
		clearCache
	};
}
