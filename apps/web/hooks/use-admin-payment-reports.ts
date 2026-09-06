import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiUtils, serverClient } from '@/lib/api/server-api-client';

export interface AdminPaymentRecord {
	id: string;
	userId: string;
	userEmail: string | null;
	planId: string;
	status: string;
	paymentProvider: string;
	subscriptionId: string | null;
	invoiceId: string | null;
	amount: number | null;
	amountPaid: number | null;
	amountDue: number | null;
	currency: string | null;
	interval: string | null;
	startDate: string | null;
	endDate: string | null;
	cancelledAt: string | null;
	createdAt: string;
}

export interface AdminPaymentReportSummary {
	transactions: number;
	totalsByCurrency: Array<{ currency: string; amount: number; transactions: number }>;
	byPlan: Array<{ planId: string; currency: string; transactions: number; amount: number }>;
	byProvider: Array<{ provider: string; currency: string; transactions: number; amount: number }>;
	byStatus: Array<{ status: string; currency: string; transactions: number; amount: number }>;
}

export interface PaymentReportFilterValues {
	from?: string;
	to?: string;
	planId?: string;
	status?: string;
	provider?: string;
	search?: string;
}

export interface PaymentReportParams extends PaymentReportFilterValues {
	page?: number;
	limit?: number;
}

export type PaymentReportExportFormat = 'csv' | 'xlsx';

interface PaymentReportResponse {
	records: AdminPaymentRecord[];
	summary: AdminPaymentReportSummary;
	pagination: { total: number; page: number; limit: number; totalPages: number };
}

const paymentReportQueryKeys = {
	all: ['admin-payment-reports'] as const,
	list: (params: PaymentReportParams) => [...paymentReportQueryKeys.all, 'list', params] as const
};

/** Build the query string once, so the table and the export always agree on the filters. */
export function buildPaymentReportQuery(params: PaymentReportParams): string {
	const queryParams: Record<string, string> = {};
	if (params.page) queryParams.page = String(params.page);
	if (params.limit) queryParams.limit = String(params.limit);
	if (params.from) queryParams.from = params.from;
	if (params.to) queryParams.to = params.to;
	if (params.planId) queryParams.planId = params.planId;
	if (params.status) queryParams.status = params.status;
	if (params.provider) queryParams.provider = params.provider;
	if (params.search) queryParams.search = params.search;
	return apiUtils.createQueryString(queryParams);
}

/**
 * `signal` is not only for cancellation here: `serverClient` skips its own
 * five-minute GET cache whenever a signal is supplied. Without it the table could
 * keep serving a cached page while the export — which fetches directly — returned
 * fresher rows, and the two would disagree for the same filters.
 */
const fetchReport = async (params: PaymentReportParams, signal?: AbortSignal): Promise<PaymentReportResponse> => {
	const response = await serverClient.get<{ success: boolean; data: PaymentReportResponse }>(
		`/api/admin/payment-reports?${buildPaymentReportQuery(params)}`,
		{ signal }
	);

	if (!apiUtils.isSuccess(response)) throw new Error(apiUtils.getErrorMessage(response));
	return response.data.data;
};

export function useAdminPaymentReports(options: PaymentReportParams = {}) {
	const { page = 1, limit = 20, from, to, planId, status, provider, search } = options;
	const [isExporting, setIsExporting] = useState<PaymentReportExportFormat | null>(null);

	const queryParams = useMemo(
		() => ({ page, limit, from, to, planId, status, provider, search }),
		[page, limit, from, to, planId, status, provider, search]
	);

	const { data, isLoading, isError, error, refetch } = useQuery({
		queryKey: paymentReportQueryKeys.list(queryParams),
		queryFn: ({ signal }) => fetchReport(queryParams, signal),
		staleTime: 60 * 1000,
		gcTime: 5 * 60 * 1000,
		retry: 2
	});

	/**
	 * Download the current report. The request goes through `fetch` rather than the
	 * JSON client because the response is a file: it is turned into a blob and
	 * handed to an anchor so the browser saves it with the server's filename.
	 */
	const exportReport = useCallback(
		async (format: PaymentReportExportFormat, failureMessage: string, successMessage: string) => {
			try {
				setIsExporting(format);

				const query = buildPaymentReportQuery({ from, to, planId, status, provider, search });
				const response = await fetch(`/api/admin/payment-reports/export?format=${format}&${query}`, {
					credentials: 'same-origin'
				});

				if (!response.ok) {
					let message = `HTTP ${response.status}`;
					try {
						const body = await response.json();
						if (body?.error) message = body.error;
					} catch {
						// A non-JSON error body is fine — the status is enough.
					}
					throw new Error(message);
				}

				const blob = await response.blob();
				const disposition = response.headers.get('Content-Disposition') || '';
				const match = disposition.match(/filename="?([^";]+)"?/i);
				const filename = match?.[1] || `payment-report.${format}`;

				const url = URL.createObjectURL(blob);
				const anchor = document.createElement('a');
				anchor.href = url;
				anchor.download = filename;
				document.body.appendChild(anchor);
				anchor.click();
				anchor.remove();
				URL.revokeObjectURL(url);

				toast.success(successMessage);
				return true;
			} catch (error) {
				toast.error(`${failureMessage}: ${error instanceof Error ? error.message : 'Unknown error'}`);
				return false;
			} finally {
				setIsExporting(null);
			}
		},
		[from, to, planId, status, provider, search]
	);

	return {
		records: data?.records ?? [],
		summary: data?.summary ?? null,
		isLoading,
		// Surfaced so the page can say the report FAILED. Collapsing an error into an
		// empty list would tell an admin "no payments" when the truth is "we could
		// not read them" — the difference matters when the answer is revenue.
		isError,
		errorMessage: error instanceof Error ? error.message : null,
		isExporting,
		totalRecords: data?.pagination?.total ?? 0,
		totalPages: data?.pagination?.totalPages ?? 1,
		exportReport,
		refetch
	};
}
