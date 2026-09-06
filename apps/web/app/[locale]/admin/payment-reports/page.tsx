'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, Download, FileSpreadsheet, Loader2, Receipt, TrendingUp, Users } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Container } from '@/components/ui/container';
import { UniversalPagination } from '@/components/universal-pagination';
import { useAdminPaymentReports } from '@/hooks/use-admin-payment-reports';
import { SubscriptionStatus } from '@/lib/db/schema';
import { PaymentPlan, PaymentProvider } from '@/lib/constants/payment';
import { cn } from '@/lib/utils';
import { formatCurrencyAmount } from '@/lib/utils/currency-format';

const PAGE_SIZE = 20;

const INPUT_BASE = cn(
	'w-full h-9 px-3 text-xs rounded-lg',
	'bg-white dark:bg-white/5',
	'border border-gray-200 dark:border-white/8',
	'text-gray-900 dark:text-white',
	'focus:outline-none focus:ring-2 focus:ring-gray-900/20 dark:focus:ring-white/20 focus:border-gray-400 dark:focus:border-white/20',
	'transition-all duration-150 disabled:opacity-50 appearance-none'
);

/**
 * Report amounts come straight from `subscriptions`, which stores MAJOR units
 * (the webhook writer runs `convertCentsToDecimal` before saving). Dividing again
 * would show 1% of the real revenue, so this uses the template's major-unit
 * formatter — which also picks the right number of decimals per currency.
 */
function formatAmount(amount: number, currency: string, locale: string): string {
	return formatCurrencyAmount(amount ?? 0, (currency || 'usd').toUpperCase(), locale);
}

export default function AdminPaymentReportsPage() {
	const t = useTranslations('admin.ADMIN_PAYMENT_REPORTS_PAGE');
	const locale = useLocale();

	const [page, setPage] = useState(1);
	const [from, setFrom] = useState('');
	const [to, setTo] = useState('');
	const [planId, setPlanId] = useState('');
	const [status, setStatus] = useState('');
	const [provider, setProvider] = useState('');

	const resetToFirstPage = () => setPage(1);

	const { records, summary, isLoading, isError, errorMessage, isExporting, totalRecords, totalPages, exportReport } =
		useAdminPaymentReports({
			page,
			limit: PAGE_SIZE,
			from: from || undefined,
			to: to || undefined,
			planId: planId || undefined,
			status: status || undefined,
			provider: provider || undefined
		});

	const hasActiveFilters = Boolean(from || to || planId || status || provider);

	/**
	 * Every currency, not the biggest number.
	 *
	 * Picking a "primary" currency by comparing raw amounts compares unlike units
	 * and then hides every other currency's revenue from the headline total.
	 * Rendering each currency on its own line is the only honest summary, and on
	 * the overwhelmingly common single-currency site it looks exactly the same.
	 */
	const totalRevenue = useMemo(() => {
		if (!summary?.totalsByCurrency?.length) return formatAmount(0, 'usd', locale);
		return summary.totalsByCurrency.map((row) => formatAmount(row.amount, row.currency, locale)).join(' · ');
	}, [summary, locale]);

	/**
	 * `plan_id` is free-form on `subscriptions` — a Work may define its own plans —
	 * so an options list built only from the `PaymentPlan` enum would leave a custom
	 * plan unfilterable. Merge in whatever the current roll-up actually contains.
	 */
	const planOptions = useMemo(() => {
		const fromData = (summary?.byPlan ?? []).map((row) => row.planId).filter(Boolean);
		return Array.from(new Set([...Object.values(PaymentPlan), ...fromData]));
	}, [summary]);

	/**
	 * Distinct plans and providers, not roll-up rows.
	 *
	 * Currency is part of the grouping key in `byPlan` / `byProvider` (see
	 * `PaymentReportSummary`), so one plan sold in USD and EUR is TWO rows. Counting
	 * rows would have told an admin the site has two plans when it has one — and the
	 * more currencies a site takes, the further off the card gets.
	 */
	const distinctPlanCount = useMemo(() => new Set((summary?.byPlan ?? []).map((row) => row.planId)).size, [summary]);
	const distinctProviderCount = useMemo(
		() => new Set((summary?.byProvider ?? []).map((row) => row.provider)).size,
		[summary]
	);

	const clearFilters = () => {
		setFrom('');
		setTo('');
		setPlanId('');
		setStatus('');
		setProvider('');
		resetToFirstPage();
	};

	const handleExport = (format: 'csv' | 'xlsx') =>
		exportReport(format, t('EXPORT_FAILED'), t('EXPORT_SUCCESS', { format: format.toUpperCase() }));

	const formatDate = (value: string | null) =>
		value
			? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
			: '—';

	return (
		<Container useGlobalWidth>
			{/* Page header */}
			<div className="mb-8">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					<div className="flex items-center gap-4">
						<div className="w-11 h-11 rounded-xl bg-gray-900 dark:bg-gray-800 flex items-center justify-center shrink-0 shadow-sm">
							<BarChart3 className="w-5 h-5 text-white" />
						</div>
						<div>
							<h1 className="text-xl font-semibold text-gray-900 dark:text-white leading-tight tracking-tight">
								{t('TITLE')}
							</h1>
							<p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('SUBTITLE')}</p>
						</div>
					</div>
					<div className="flex items-center gap-2 self-start">
						<button
							type="button"
							data-testid="payment-report-export-csv"
							onClick={() => handleExport('csv')}
							disabled={isExporting !== null}
							className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 shadow-sm transition-colors disabled:opacity-50"
						>
							{isExporting === 'csv' ? (
								<Loader2 className="w-3.5 h-3.5 animate-spin" />
							) : (
								<Download className="w-3.5 h-3.5" />
							)}
							{t('EXPORT_CSV')}
						</button>
						<button
							type="button"
							data-testid="payment-report-export-xlsx"
							onClick={() => handleExport('xlsx')}
							disabled={isExporting !== null}
							className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-white/8 transition-colors disabled:opacity-50"
						>
							{isExporting === 'xlsx' ? (
								<Loader2 className="w-3.5 h-3.5 animate-spin" />
							) : (
								<FileSpreadsheet className="w-3.5 h-3.5" />
							)}
							{t('EXPORT_XLSX')}
						</button>
					</div>
				</div>
				<div className="mt-5 h-px bg-linear-to-r from-gray-200 via-gray-100 to-transparent dark:from-white/10 dark:via-white/5 dark:to-transparent" />
			</div>

			{/* Summary cards */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
				{[
					{ label: t('TOTAL_REVENUE'), value: totalRevenue, Icon: TrendingUp },
					{ label: t('TRANSACTIONS'), value: String(summary?.transactions ?? 0), Icon: Receipt },
					{ label: t('PLANS'), value: String(distinctPlanCount), Icon: Users },
					{ label: t('PROVIDERS'), value: String(distinctProviderCount), Icon: BarChart3 }
				].map((card) => (
					<div
						key={card.label}
						className="relative bg-white dark:bg-white/3 border border-gray-100 dark:border-white/6 rounded-2xl p-5 overflow-hidden hover:shadow-sm hover:border-gray-200 dark:hover:border-white/10 transition-all duration-200"
					>
						<div className="flex items-start justify-between mb-4 pt-0.5">
							<p className="text-[11px] uppercase tracking-widest font-semibold text-gray-400 dark:text-gray-500 leading-none">
								{card.label}
							</p>
							<div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400">
								<card.Icon className="w-4 h-4" />
							</div>
						</div>
						<p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight leading-none">
							{card.value}
						</p>
					</div>
				))}
			</div>

			{/* Report */}
			<div className="bg-white dark:bg-white/3 border border-gray-100 dark:border-white/6 rounded-2xl overflow-hidden">
				<div className="px-5 py-3.5 border-b border-gray-100 dark:border-white/6 bg-gray-50/60 dark:bg-white/1.5">
					<h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('TABLE_TITLE')}</h3>
				</div>

				{/* Filters */}
				<div className="px-5 py-4 border-b border-gray-50 dark:border-white/4">
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
						<div>
							<label
								htmlFor="payment-report-from"
								className="block text-[10px] uppercase tracking-wide font-semibold text-gray-400 dark:text-gray-500 mb-1"
							>
								{t('FROM')}
							</label>
							<input
								id="payment-report-from"
								type="date"
								value={from}
								onChange={(event) => {
									setFrom(event.target.value);
									resetToFirstPage();
								}}
								className={INPUT_BASE}
							/>
						</div>
						<div>
							<label
								htmlFor="payment-report-to"
								className="block text-[10px] uppercase tracking-wide font-semibold text-gray-400 dark:text-gray-500 mb-1"
							>
								{t('TO')}
							</label>
							<input
								id="payment-report-to"
								type="date"
								value={to}
								onChange={(event) => {
									setTo(event.target.value);
									resetToFirstPage();
								}}
								className={INPUT_BASE}
							/>
						</div>
						<div>
							<label
								htmlFor="payment-report-plan"
								className="block text-[10px] uppercase tracking-wide font-semibold text-gray-400 dark:text-gray-500 mb-1"
							>
								{t('PLAN')}
							</label>
							<select
								id="payment-report-plan"
								value={planId}
								onChange={(event) => {
									setPlanId(event.target.value);
									resetToFirstPage();
								}}
								className={INPUT_BASE}
							>
								<option value="">{t('ALL')}</option>
								{planOptions.map((value) => (
									<option key={value} value={value}>
										{value}
									</option>
								))}
							</select>
						</div>
						<div>
							<label
								htmlFor="payment-report-status"
								className="block text-[10px] uppercase tracking-wide font-semibold text-gray-400 dark:text-gray-500 mb-1"
							>
								{t('STATUS')}
							</label>
							<select
								id="payment-report-status"
								value={status}
								onChange={(event) => {
									setStatus(event.target.value);
									resetToFirstPage();
								}}
								className={INPUT_BASE}
							>
								<option value="">{t('ALL')}</option>
								{Object.values(SubscriptionStatus).map((value) => (
									<option key={value} value={value}>
										{value}
									</option>
								))}
							</select>
						</div>
						<div>
							<label
								htmlFor="payment-report-provider"
								className="block text-[10px] uppercase tracking-wide font-semibold text-gray-400 dark:text-gray-500 mb-1"
							>
								{t('PROVIDER')}
							</label>
							<select
								id="payment-report-provider"
								value={provider}
								onChange={(event) => {
									setProvider(event.target.value);
									resetToFirstPage();
								}}
								className={INPUT_BASE}
							>
								<option value="">{t('ALL')}</option>
								{Object.values(PaymentProvider).map((value) => (
									<option key={value} value={value}>
										{value}
									</option>
								))}
							</select>
						</div>
					</div>
					<div className="flex items-center justify-between gap-3 mt-3 text-xs text-gray-500 dark:text-gray-400">
						<span>
							{t('SHOWING_RECORDS', { count: records.length, total: totalRecords || records.length })}
						</span>
						{hasActiveFilters && (
							<button
								type="button"
								onClick={clearFilters}
								className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white underline underline-offset-2"
							>
								{t('CLEAR_FILTERS')}
							</button>
						)}
					</div>
				</div>

				{/* Records */}
				{isLoading ? (
					<div className="divide-y divide-gray-50 dark:divide-white/4">
						{[0, 1, 2].map((index) => (
							<div key={index} className="px-5 py-5">
								<div className="h-4 w-48 bg-gray-200 dark:bg-white/8 rounded animate-pulse mb-2" />
								<div className="h-3 w-full bg-gray-200 dark:bg-white/8 rounded animate-pulse" />
							</div>
						))}
					</div>
				) : isError ? (
					/*
					 * A failed read is NOT an empty report. Falling through to the empty
					 * state would tell an admin "no payments in this range" when the truth
					 * is "we could not read them" — and that difference is the whole point
					 * of a revenue report.
					 */
					<div
						role="alert"
						data-testid="payment-report-error"
						className="flex flex-col items-center justify-center px-6 py-20 text-center"
					>
						<div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-4 ring-1 ring-red-200 dark:ring-red-500/20">
							<AlertTriangle className="w-6 h-6 text-red-500 dark:text-red-400" />
						</div>
						<h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">
							{t('LOAD_FAILED')}
						</h3>
						{errorMessage && (
							<p className="text-sm text-gray-500 dark:text-gray-400 max-w-md leading-relaxed break-words">
								{errorMessage}
							</p>
						)}
					</div>
				) : records.length === 0 ? (
					<div className="flex flex-col items-center justify-center px-6 py-20 text-center">
						<div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/6 flex items-center justify-center mb-4 ring-1 ring-gray-200 dark:ring-white/8">
							<Receipt className="w-6 h-6 text-gray-400 dark:text-gray-500" />
						</div>
						<h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">
							{t('NO_RECORDS_FOUND')}
						</h3>
						<p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">
							{hasActiveFilters ? t('NO_RECORDS_FILTERED_DESCRIPTION') : t('NO_RECORDS_DESCRIPTION')}
						</p>
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-left text-xs" data-testid="payment-report-table">
							<thead className="bg-gray-50/60 dark:bg-white/1.5 text-gray-500 dark:text-gray-400">
								<tr>
									<th scope="col" className="px-5 py-2.5 font-semibold">
										{t('COLUMN_DATE')}
									</th>
									<th scope="col" className="px-5 py-2.5 font-semibold">
										{t('COLUMN_CUSTOMER')}
									</th>
									<th scope="col" className="px-5 py-2.5 font-semibold">
										{t('COLUMN_PLAN')}
									</th>
									<th scope="col" className="px-5 py-2.5 font-semibold">
										{t('COLUMN_PROVIDER')}
									</th>
									<th scope="col" className="px-5 py-2.5 font-semibold">
										{t('COLUMN_STATUS')}
									</th>
									<th scope="col" className="px-5 py-2.5 font-semibold text-right">
										{t('COLUMN_AMOUNT')}
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-50 dark:divide-white/4">
								{records.map((record) => (
									<tr
										key={record.id}
										data-testid="payment-report-row"
										className="hover:bg-gray-50/80 dark:hover:bg-white/2.5 transition-colors duration-150"
									>
										<td className="px-5 py-3 whitespace-nowrap text-gray-500 dark:text-gray-400">
											{formatDate(record.createdAt)}
										</td>
										<td className="px-5 py-3 max-w-[220px] truncate text-gray-900 dark:text-white">
											{record.userEmail || record.userId}
										</td>
										<td className="px-5 py-3 capitalize text-gray-700 dark:text-gray-300">
											{record.planId}
										</td>
										<td className="px-5 py-3 capitalize text-gray-700 dark:text-gray-300">
											{record.paymentProvider}
										</td>
										<td className="px-5 py-3 capitalize text-gray-700 dark:text-gray-300">
											{record.status}
										</td>
										<td className="px-5 py-3 text-right font-medium text-gray-900 dark:text-white whitespace-nowrap">
											{formatAmount(
												record.amountPaid ?? record.amount ?? 0,
												record.currency || 'usd',
												locale
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}

				{/* Breakdown */}
				{summary && summary.byPlan.length > 0 && (
					<div className="px-5 py-4 border-t border-gray-100 dark:border-white/6 grid grid-cols-1 sm:grid-cols-3 gap-4">
						{[
							{ title: t('BY_PLAN'), rows: summary.byPlan.map((row) => ({ ...row, label: row.planId })) },
							{
								title: t('BY_PROVIDER'),
								rows: summary.byProvider.map((row) => ({ ...row, label: row.provider }))
							},
							{
								title: t('BY_STATUS'),
								rows: summary.byStatus.map((row) => ({ ...row, label: row.status }))
							}
						].map((group) => (
							<div key={group.title}>
								<p className="text-[10px] uppercase tracking-wide font-semibold text-gray-400 dark:text-gray-500 mb-2">
									{group.title}
								</p>
								<ul className="space-y-1">
									{group.rows.map((row) => (
										<li
											key={`${group.title}-${row.label}-${row.currency}`}
											className="flex items-center justify-between gap-2 text-xs text-gray-600 dark:text-gray-300"
										>
											<span className="capitalize truncate">{row.label}</span>
											<span className="font-medium text-gray-900 dark:text-white whitespace-nowrap">
												{formatAmount(row.amount, row.currency, locale)} · {row.transactions}
											</span>
										</li>
									))}
								</ul>
							</div>
						))}
					</div>
				)}

				{totalPages > 1 && (
					<div className="p-4 border-t border-gray-100 dark:border-white/6">
						<UniversalPagination page={page} totalPages={totalPages} onPageChange={setPage} />
					</div>
				)}
			</div>
		</Container>
	);
}
