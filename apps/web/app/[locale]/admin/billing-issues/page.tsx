'use client';

import { useEffect, useMemo, useState } from 'react';
import {
	AlertTriangle,
	Calendar,
	CheckCircle,
	Clock,
	CreditCard,
	Eye,
	RefreshCw,
	RotateCcw,
	ShieldAlert,
	User,
	Wallet,
	XCircle
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Container } from '@/components/ui/container';
import { UniversalPagination } from '@/components/universal-pagination';
import { useAdminBillingIssues, type AdminBillingIssue } from '@/hooks/use-admin-billing-issues';
import { useAdminFilters } from '@/hooks/use-admin-filters';
import BillingIssueActionDialog from '@/components/admin/billing-issues/billing-issue-action-dialog';
import {
	AdminActiveFilters,
	AdminFilterPopover,
	AdminSearchBar,
	AdminStatusTabs,
	type ActiveFilter,
	type FilterSection,
	type StatusTabOption
} from '@/components/admin/shared';
import {
	BillingIssueStatus,
	BillingIssueType,
	type BillingIssueStatusValues,
	type BillingIssueTypeValues
} from '@/lib/db/schema';
import { PaymentProvider } from '@/lib/constants/payment';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/currency-format';

type BillingIssueStatusFilter = BillingIssueStatusValues | '';

const PAGE_SIZE = 10;

const STATUS_BADGE: Record<BillingIssueStatusValues, { classes: string; Icon: typeof Clock }> = {
	open: {
		classes:
			'bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:ring-orange-500/20',
		Icon: AlertTriangle
	},
	in_review: {
		classes: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20',
		Icon: Eye
	},
	refunded: {
		classes:
			'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20',
		Icon: RotateCcw
	},
	resolved: {
		classes:
			'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20',
		Icon: CheckCircle
	},
	dismissed: {
		classes: 'bg-gray-100 text-gray-600 ring-gray-200 dark:bg-white/6 dark:text-gray-400 dark:ring-white/8',
		Icon: XCircle
	}
};

const TYPE_BADGE: Record<BillingIssueTypeValues, string> = {
	payment_failed: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20',
	refund_request:
		'bg-purple-50 text-purple-700 ring-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:ring-purple-500/20',
	dispute:
		'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20',
	subscription_state: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-500/20',
	other: 'bg-gray-100 text-gray-600 ring-gray-200 dark:bg-white/6 dark:text-gray-400 dark:ring-white/8'
};

/**
 * Amounts are stored in the smallest currency unit. `formatCurrency` is the
 * template's shared formatter and already knows which currencies have no minor
 * unit at all (JPY, KRW, …), where a hard-coded `/ 100` would show a hundredth
 * of the real figure.
 */
function formatAmount(amount: number | null, currency: string | null, locale: string): string {
	return formatCurrency(amount ?? 0, (currency || 'usd').toUpperCase(), locale);
}

export default function AdminBillingIssuesPage() {
	const t = useTranslations('admin.ADMIN_BILLING_ISSUES_PAGE');
	const locale = useLocale();
	const [currentPage, setCurrentPage] = useState(1);

	const {
		searchTerm,
		setSearchTerm,
		debouncedSearchTerm,
		isSearching,
		hasActiveSearch,
		statusFilter,
		setStatusFilter,
		multiFilters,
		setMultiFilter,
		hasActiveFilters,
		clearAllFilters
	} = useAdminFilters<BillingIssueStatusFilter>({
		minSearchLength: 2,
		debounceDelay: 300,
		initialMultiFilters: { type: [], provider: [] },
		onFiltersChange: () => setCurrentPage(1)
	});

	const {
		issues,
		stats,
		isLoading,
		isError,
		errorMessage,
		isLoadingStats,
		isSyncing,
		pendingId,
		totalIssues,
		totalPages,
		updateIssue,
		refundIssue,
		syncIssues
	} = useAdminBillingIssues({
		page: currentPage,
		limit: PAGE_SIZE,
		search: debouncedSearchTerm || undefined,
		status: (statusFilter || undefined) as BillingIssueStatusValues | undefined,
		type: (multiFilters.type?.[0] as BillingIssueTypeValues) || undefined,
		provider: multiFilters.provider?.[0] || undefined
	});

	const [dialogOpen, setDialogOpen] = useState(false);
	const [selectedIssue, setSelectedIssue] = useState<AdminBillingIssue | null>(null);

	// Keep the open dialog pointed at the freshest copy of its row after a mutation.
	useEffect(() => {
		if (!selectedIssue) return;
		const fresh = issues.find((issue) => issue.id === selectedIssue.id);
		if (fresh && fresh !== selectedIssue) setSelectedIssue(fresh);
	}, [issues, selectedIssue]);

	const statusOptions: StatusTabOption<BillingIssueStatusFilter>[] = useMemo(
		() => [
			{ value: '', label: t('STATUS_ALL'), count: stats?.total ?? 0 },
			{ value: BillingIssueStatus.OPEN, label: t('STATUS_LABELS.open'), count: stats?.byStatus?.open ?? 0 },
			{
				value: BillingIssueStatus.IN_REVIEW,
				label: t('STATUS_LABELS.in_review'),
				count: stats?.byStatus?.in_review ?? 0
			},
			{
				value: BillingIssueStatus.REFUNDED,
				label: t('STATUS_LABELS.refunded'),
				count: stats?.byStatus?.refunded ?? 0
			},
			{
				value: BillingIssueStatus.RESOLVED,
				label: t('STATUS_LABELS.resolved'),
				count: stats?.byStatus?.resolved ?? 0
			},
			{
				value: BillingIssueStatus.DISMISSED,
				label: t('STATUS_LABELS.dismissed'),
				count: stats?.byStatus?.dismissed ?? 0
			}
		],
		[stats, t]
	);

	const filterSections: FilterSection<string>[] = useMemo(
		() => [
			{
				id: 'type',
				label: t('TYPE'),
				type: 'radio' as const,
				options: Object.values(BillingIssueType).map((value) => ({
					id: value,
					label: t(`TYPES.${value}`),
					count: stats?.byType?.[value] || 0
				})),
				selectedValues: multiFilters.type?.slice(0, 1) || [],
				onChange: (values: string[]) => setMultiFilter('type', values)
			},
			{
				id: 'provider',
				label: t('PROVIDER'),
				type: 'radio' as const,
				options: Object.values(PaymentProvider).map((value) => ({
					id: value,
					label: value,
					count: stats?.byProvider?.[value] || 0
				})),
				selectedValues: multiFilters.provider?.slice(0, 1) || [],
				onChange: (values: string[]) => setMultiFilter('provider', values)
			}
		],
		[stats, multiFilters, setMultiFilter, t]
	);

	const advancedFilterCount = (multiFilters.type?.length || 0) + (multiFilters.provider?.length || 0);

	const activeFilters: ActiveFilter[] = useMemo(() => {
		const filters: ActiveFilter[] = [];
		if (hasActiveSearch) {
			filters.push({
				id: 'search',
				type: 'search',
				label: t('SEARCH_PLACEHOLDER').replace('...', ''),
				value: searchTerm.trim()
			});
		}
		if (statusFilter) {
			filters.push({
				id: `status:${statusFilter}`,
				type: 'status',
				label: t('STATUS'),
				value: t(`STATUS_LABELS.${statusFilter}`)
			});
		}
		(multiFilters.type || []).forEach((value) =>
			filters.push({ id: `type:${value}`, type: 'type', label: t('TYPE'), value: t(`TYPES.${value}`) })
		);
		(multiFilters.provider || []).forEach((value) =>
			filters.push({ id: `provider:${value}`, type: 'provider', label: t('PROVIDER'), value })
		);
		return filters;
	}, [hasActiveSearch, searchTerm, statusFilter, multiFilters, t]);

	const handleRemoveFilter = (filter: ActiveFilter) => {
		switch (filter.type) {
			case 'search':
				setSearchTerm('');
				break;
			case 'status':
				setStatusFilter('');
				break;
			case 'type':
				setMultiFilter('type', []);
				break;
			case 'provider':
				setMultiFilter('provider', []);
				break;
		}
	};

	const handleSync = () =>
		syncIssues((result) => t('SYNC_DONE', { created: result.created, scanned: result.scanned }), t('SYNC_FAILED'));

	const handleUpdate = (id: string, input: Parameters<typeof updateIssue>[1]) =>
		updateIssue(id, input, t('UPDATE_SUCCESS'), t('UPDATE_FAILED'));

	const handleRefund = (id: string, input: Parameters<typeof refundIssue>[1]) =>
		refundIssue(id, input, t('REFUND_SUCCESS'), t('REFUND_FAILED'));

	const formatDate = (value: string) =>
		new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

	// One line per currency: a site charging in more than one cannot be summarised
	// by a single number, and labelling a mixed sum with the first row's currency
	// would be worse than showing nothing.
	const amountAtRisk = stats?.amountAtRisk?.length
		? stats.amountAtRisk.map((row) => formatAmount(row.amount, row.currency, locale)).join(' · ')
		: formatAmount(0, 'usd', locale);

	return (
		<Container useGlobalWidth>
			{/* Page header */}
			<div className="mb-8">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					<div className="flex items-center gap-4">
						<div className="w-11 h-11 rounded-xl bg-gray-900 dark:bg-gray-800 flex items-center justify-center shrink-0 shadow-sm">
							<ShieldAlert className="w-5 h-5 text-white" />
						</div>
						<div>
							<h1 className="text-xl font-semibold text-gray-900 dark:text-white leading-tight tracking-tight">
								{t('TITLE')}
							</h1>
							<p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('SUBTITLE')}</p>
						</div>
					</div>
					<button
						type="button"
						onClick={handleSync}
						disabled={isSyncing}
						data-testid="billing-issues-sync"
						className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 shadow-sm transition-colors disabled:opacity-50 self-start"
					>
						<RefreshCw className={cn('w-3.5 h-3.5', isSyncing && 'animate-spin')} />
						{t('SYNC')}
					</button>
				</div>
				<div className="mt-5 h-px bg-linear-to-r from-gray-200 via-gray-100 to-transparent dark:from-white/10 dark:via-white/5 dark:to-transparent" />
			</div>

			{/* Stats */}
			{!isLoadingStats && stats && (
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
					{[
						{ label: t('TOTAL_ISSUES'), value: String(stats.total), Icon: ShieldAlert },
						{ label: t('OPEN'), value: String(stats.openCount), Icon: AlertTriangle },
						{ label: t('REFUNDED'), value: String(stats.refundedCount), Icon: RotateCcw },
						{ label: t('AMOUNT_AT_RISK'), value: amountAtRisk, Icon: Wallet }
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
			)}

			{/* Table */}
			<div className="bg-white dark:bg-white/3 border border-gray-100 dark:border-white/6 rounded-2xl overflow-hidden">
				<div className="px-5 py-3.5 border-b border-gray-100 dark:border-white/6 bg-gray-50/60 dark:bg-white/1.5">
					<div className="flex items-center justify-between gap-4 flex-wrap">
						<h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('TABLE_TITLE')}</h3>
						<div className="flex items-center gap-3">
							<AdminStatusTabs<BillingIssueStatusFilter>
								options={statusOptions}
								value={statusFilter}
								onChange={setStatusFilter}
							/>
							<AdminFilterPopover
								sections={filterSections}
								activeCount={advancedFilterCount}
								onClearAll={() => {
									setMultiFilter('type', []);
									setMultiFilter('provider', []);
								}}
							/>
						</div>
					</div>
				</div>

				<div className="px-5 py-4 space-y-3 border-b border-gray-50 dark:border-white/4">
					<AdminSearchBar
						value={searchTerm}
						onChange={setSearchTerm}
						isSearching={isSearching}
						placeholder={t('SEARCH_PLACEHOLDER')}
						ariaLabel={t('SEARCH_PLACEHOLDER')}
					/>
					{activeFilters.length > 0 && (
						<AdminActiveFilters
							filters={activeFilters}
							onRemove={handleRemoveFilter}
							onClearAll={clearAllFilters}
						/>
					)}
					<div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
						<span>
							{t('SHOWING_ISSUES', { count: issues.length, total: totalIssues || issues.length })}
							{hasActiveFilters && <span className="ml-1">{t('FILTERED')}</span>}
						</span>
					</div>
				</div>

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
					 * A failed read is NOT an empty queue. `issues` is `data?.issues ?? []`,
					 * so falling through to the empty state would render "No billing issues"
					 * — an all-clear on the page an admin opens to find out whether anyone's
					 * payment is broken. The one state this surface must never invent is
					 * "nothing is wrong".
					 */
					<div
						role="alert"
						data-testid="billing-issue-error"
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
				) : issues.length === 0 ? (
					<div className="flex flex-col items-center justify-center px-6 py-20 text-center">
						<div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/6 flex items-center justify-center mb-4 ring-1 ring-gray-200 dark:ring-white/8">
							<CreditCard className="w-6 h-6 text-gray-400 dark:text-gray-500" />
						</div>
						<h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">
							{t('NO_ISSUES_FOUND')}
						</h3>
						<p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">
							{hasActiveFilters ? t('NO_ISSUES_SEARCH_DESCRIPTION') : t('NO_ISSUES_DESCRIPTION')}
						</p>
					</div>
				) : (
					<div className="divide-y divide-gray-50 dark:divide-white/4">
						{issues.map((issue) => {
							const statusStyle = STATUS_BADGE[issue.status] ?? STATUS_BADGE.open;
							const StatusIcon = statusStyle.Icon;
							return (
								<div
									key={issue.id}
									data-testid="billing-issue-row"
									className="px-5 py-4 hover:bg-gray-50/80 dark:hover:bg-white/2.5 transition-colors duration-150"
								>
									<div className="flex items-start justify-between gap-4">
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-1.5 flex-wrap mb-2">
												<span
													className={cn(
														'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ring-inset',
														statusStyle.classes
													)}
												>
													<StatusIcon className="w-2.5 h-2.5" />
													{t(`STATUS_LABELS.${issue.status}`)}
												</span>
												<span
													className={cn(
														'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ring-inset',
														TYPE_BADGE[issue.type] ?? TYPE_BADGE.other
													)}
												>
													{t(`TYPES.${issue.type}`)}
												</span>
												<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ring-inset bg-gray-100 text-gray-600 ring-gray-200 dark:bg-white/6 dark:text-gray-400 dark:ring-white/8 capitalize">
													{issue.paymentProvider}
												</span>
											</div>
											<p className="text-sm font-medium text-gray-900 dark:text-white truncate mb-1">
												{formatAmount(issue.amount, issue.currency, locale)}
												{issue.planId ? ` · ${issue.planId}` : ''}
											</p>
											{issue.detectionReason && (
												<p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mb-2">
													{issue.detectionReason}
												</p>
											)}
											<div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500 flex-wrap">
												<span className="flex items-center gap-1 min-w-0">
													<User className="w-3 h-3 shrink-0" />
													<span className="truncate">{issue.userEmail || issue.userId}</span>
												</span>
												<span>·</span>
												<span className="flex items-center gap-1">
													<Calendar className="w-3 h-3" />
													{formatDate(issue.createdAt)}
												</span>
											</div>
										</div>
										<button
											type="button"
											data-testid="billing-issue-review"
											disabled={pendingId === issue.id}
											onClick={() => {
												setSelectedIssue(issue);
												setDialogOpen(true);
											}}
											className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 shadow-sm transition-all duration-200 shrink-0 disabled:opacity-50"
										>
											<Eye className="w-3.5 h-3.5" />
											{t('REVIEW')}
										</button>
									</div>
								</div>
							);
						})}
					</div>
				)}

				{totalPages > 1 && (
					<div className="p-4 border-t border-gray-100 dark:border-white/6">
						<UniversalPagination page={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
					</div>
				)}
			</div>

			{selectedIssue && (
				<BillingIssueActionDialog
					issue={selectedIssue}
					open={dialogOpen}
					onOpenChange={setDialogOpen}
					onUpdate={handleUpdate}
					onRefund={handleRefund}
					onClose={() => {
						setDialogOpen(false);
						setSelectedIssue(null);
					}}
					isPending={pendingId === selectedIssue.id}
				/>
			)}
		</Container>
	);
}
