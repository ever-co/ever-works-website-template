import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiUtils, serverClient } from '@/lib/api/server-api-client';
import type { BillingIssueStatusValues, BillingIssueTypeValues } from '@/lib/db/schema';

/** One row of the admin billing-issues table, with its payment context. */
export interface AdminBillingIssue {
	id: string;
	userId: string;
	subscriptionId: string | null;
	type: BillingIssueTypeValues;
	status: BillingIssueStatusValues;
	paymentProvider: string;
	providerPaymentId: string | null;
	amount: number | null;
	currency: string | null;
	detectionReason: string | null;
	refundId: string | null;
	refundAmount: number | null;
	refundedAt: string | null;
	resolutionNote: string | null;
	resolvedBy: string | null;
	resolvedAt: string | null;
	createdAt: string;
	updatedAt: string;
	userEmail: string | null;
	planId: string | null;
	subscriptionStatus: string | null;
	failedPaymentCount: number | null;
	providerSubscriptionId: string | null;
	invoiceId: string | null;
	hostedInvoiceUrl: string | null;
}

export interface AdminBillingIssueStats {
	total: number;
	openCount: number;
	refundedCount: number;
	resolvedCount: number;
	byStatus: Record<string, number>;
	byType: Record<string, number>;
	byProvider: Record<string, number>;
	/** Open + in-review totals PER currency, in the smallest currency unit. */
	amountAtRisk: Array<{ currency: string; amount: number }>;
}

export interface BillingIssuesListParams {
	page?: number;
	limit?: number;
	search?: string;
	status?: BillingIssueStatusValues;
	type?: BillingIssueTypeValues;
	provider?: string;
}

interface BillingIssuesListResponse {
	issues: AdminBillingIssue[];
	pagination: { total: number; page: number; limit: number; totalPages: number };
}

interface SyncResponse {
	created: number;
	skipped: number;
	scanned: number;
}

const billingIssuesQueryKeys = {
	all: ['admin-billing-issues'] as const,
	lists: () => [...billingIssuesQueryKeys.all, 'list'] as const,
	list: (params: BillingIssuesListParams) => [...billingIssuesQueryKeys.lists(), params] as const,
	stats: () => [...billingIssuesQueryKeys.all, 'stats'] as const
};

const fetchIssues = async (params: BillingIssuesListParams): Promise<BillingIssuesListResponse> => {
	const queryParams: Record<string, string> = {
		page: params.page?.toString() || '1',
		limit: params.limit?.toString() || '10'
	};

	if (params.search) queryParams.search = params.search;
	if (params.status) queryParams.status = params.status;
	if (params.type) queryParams.type = params.type;
	if (params.provider) queryParams.provider = params.provider;

	const response = await serverClient.get<{ success: boolean; data: BillingIssuesListResponse }>(
		`/api/admin/billing-issues?${apiUtils.createQueryString(queryParams)}`
	);

	if (!apiUtils.isSuccess(response)) throw new Error(apiUtils.getErrorMessage(response));
	return response.data.data;
};

const fetchStats = async (): Promise<AdminBillingIssueStats> => {
	const response = await serverClient.get<{ success: boolean; data: AdminBillingIssueStats }>(
		'/api/admin/billing-issues/stats'
	);

	if (!apiUtils.isSuccess(response)) throw new Error(apiUtils.getErrorMessage(response));
	return response.data.data;
};

export interface UpdateBillingIssueInput {
	status: BillingIssueStatusValues;
	/** Omit to leave the note alone; pass an empty string to clear it. */
	resolutionNote?: string;
}

export interface RefundBillingIssueInput {
	/** Smallest currency unit. Omit for a full refund. */
	amount?: number;
	/** Provider charge reference to refund; overrides the one stored on the issue. */
	providerPaymentId?: string;
	note?: string;
}

interface UseAdminBillingIssuesOptions extends BillingIssuesListParams {}

export function useAdminBillingIssues(options: UseAdminBillingIssuesOptions = {}) {
	const { page = 1, limit = 10, search, status, type, provider } = options;
	const [pendingId, setPendingId] = useState<string | null>(null);
	const queryClient = useQueryClient();

	const queryParams = useMemo(
		() => ({ page, limit, search: search || undefined, status, type, provider }),
		[page, limit, search, status, type, provider]
	);

	const { data, isLoading, isError, error, refetch } = useQuery({
		queryKey: billingIssuesQueryKeys.list(queryParams),
		queryFn: () => fetchIssues(queryParams),
		staleTime: 60 * 1000,
		gcTime: 5 * 60 * 1000,
		retry: 2
	});

	const { data: statsData, isLoading: isLoadingStats } = useQuery({
		queryKey: billingIssuesQueryKeys.stats(),
		queryFn: fetchStats,
		staleTime: 60 * 1000,
		gcTime: 5 * 60 * 1000,
		retry: 2
	});

	const invalidate = useCallback(() => {
		// `serverClient` keeps its OWN five-minute GET cache in front of React Query,
		// so invalidating the query key alone refetches straight out of that cache and
		// the list still shows the pre-mutation row. Clear it first.
		serverClient.clearCache();
		queryClient.invalidateQueries({ queryKey: billingIssuesQueryKeys.all });
	}, [queryClient]);

	const updateMutation = useMutation({
		mutationFn: async ({ id, input }: { id: string; input: UpdateBillingIssueInput }) => {
			const response = await serverClient.patch<{ success: boolean; data: AdminBillingIssue }>(
				`/api/admin/billing-issues/${id}`,
				input
			);
			if (!apiUtils.isSuccess(response)) throw new Error(apiUtils.getErrorMessage(response));
			return response.data.data;
		},
		onSuccess: invalidate
	});

	const refundMutation = useMutation({
		mutationFn: async ({ id, input }: { id: string; input: RefundBillingIssueInput }) => {
			const response = await serverClient.post<{ success: boolean; data: AdminBillingIssue }>(
				`/api/admin/billing-issues/${id}/refund`,
				input
			);
			if (!apiUtils.isSuccess(response)) throw new Error(apiUtils.getErrorMessage(response));
			return response.data.data;
		},
		onSuccess: invalidate
	});

	const syncMutation = useMutation({
		mutationFn: async () => {
			const response = await serverClient.post<{ success: boolean; data: SyncResponse }>(
				'/api/admin/billing-issues',
				{ action: 'sync' }
			);
			if (!apiUtils.isSuccess(response)) throw new Error(apiUtils.getErrorMessage(response));
			return response.data.data;
		},
		onSuccess: invalidate
	});

	const updateIssue = useCallback(
		async (id: string, input: UpdateBillingIssueInput, successMessage: string, failureMessage: string) => {
			try {
				setPendingId(id);
				await updateMutation.mutateAsync({ id, input });
				toast.success(successMessage);
				return true;
			} catch (error) {
				toast.error(`${failureMessage}: ${error instanceof Error ? error.message : 'Unknown error'}`);
				return false;
			} finally {
				setPendingId(null);
			}
		},
		[updateMutation]
	);

	const refundIssue = useCallback(
		async (id: string, input: RefundBillingIssueInput, successMessage: string, failureMessage: string) => {
			try {
				setPendingId(id);
				await refundMutation.mutateAsync({ id, input });
				toast.success(successMessage);
				return true;
			} catch (error) {
				toast.error(`${failureMessage}: ${error instanceof Error ? error.message : 'Unknown error'}`);
				return false;
			} finally {
				setPendingId(null);
			}
		},
		[refundMutation]
	);

	const syncIssues = useCallback(
		async (buildMessage: (result: SyncResponse) => string, failureMessage: string) => {
			try {
				const result = await syncMutation.mutateAsync();
				toast.success(buildMessage(result));
				return result;
			} catch (error) {
				toast.error(`${failureMessage}: ${error instanceof Error ? error.message : 'Unknown error'}`);
				return null;
			}
		},
		[syncMutation]
	);

	return {
		issues: data?.issues ?? [],
		stats: statsData ?? null,
		isLoading,
		// Surfaced so the page can say the QUEUE failed to load. `data?.issues ?? []`
		// turns a failed read into an empty array, and the page would then render
		// "No billing issues" — telling an admin that nothing needs their attention
		// at the exact moment the triage queue is unreadable. Mirrors what
		// `use-admin-payment-reports.ts` already does for the report.
		isError,
		errorMessage: error instanceof Error ? error.message : null,
		isLoadingStats,
		isSyncing: syncMutation.isPending,
		pendingId,
		totalIssues: data?.pagination?.total ?? 0,
		totalPages: data?.pagination?.totalPages ?? 1,
		updateIssue,
		refundIssue,
		syncIssues,
		refetch,
		refreshData: invalidate
	};
}
