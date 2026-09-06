'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Calendar, CreditCard, Loader2, RotateCcw, User, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { BillingIssueStatus, type BillingIssueStatusValues } from '@/lib/db/schema';
import type {
	AdminBillingIssue,
	RefundBillingIssueInput,
	UpdateBillingIssueInput
} from '@/hooks/use-admin-billing-issues';
import { cn } from '@/lib/utils';
import { currencyMinorUnitFactor, formatCurrency } from '@/lib/utils/currency-format';

const INPUT_BASE = cn(
	'w-full h-10 px-3 text-sm rounded-xl',
	'bg-white dark:bg-white/5',
	'border border-gray-200 dark:border-white/8',
	'text-gray-900 dark:text-white',
	'focus:outline-none focus:ring-2 focus:ring-gray-900/20 dark:focus:ring-white/20 focus:border-gray-400 dark:focus:border-white/20',
	'transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed appearance-none'
);

/** Statuses an admin may assign from this dialog. `refunded` is set by the refund action only. */
const STATUS_OPTIONS: BillingIssueStatusValues[] = [
	BillingIssueStatus.OPEN,
	BillingIssueStatus.IN_REVIEW,
	BillingIssueStatus.RESOLVED,
	BillingIssueStatus.DISMISSED
];

export interface BillingIssueActionDialogProps {
	issue: AdminBillingIssue;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onUpdate: (id: string, input: UpdateBillingIssueInput) => Promise<boolean>;
	onRefund: (id: string, input: RefundBillingIssueInput) => Promise<boolean>;
	onClose: () => void;
	isPending: boolean;
}

/**
 * Render an amount held in the smallest currency unit, through the template's
 * shared formatter — it already handles the zero-decimal currencies (JPY, KRW, …)
 * that a hard-coded `/ 100` would render a hundred times too small.
 */
function formatAmount(amount: number | null, currency: string | null, locale: string): string {
	return formatCurrency(amount ?? 0, (currency || 'usd').toUpperCase(), locale);
}

export default function BillingIssueActionDialog({
	issue,
	open,
	onOpenChange,
	onUpdate,
	onRefund,
	onClose,
	isPending
}: BillingIssueActionDialogProps) {
	const t = useTranslations('admin.ADMIN_BILLING_ISSUES_PAGE');
	const locale = useLocale();
	const [status, setStatus] = useState<BillingIssueStatusValues>(
		issue.status === BillingIssueStatus.REFUNDED ? BillingIssueStatus.RESOLVED : issue.status
	);
	const [note, setNote] = useState(issue.resolutionNote || '');
	const [partialAmount, setPartialAmount] = useState('');
	const [paymentReference, setPaymentReference] = useState(issue.providerPaymentId || '');
	const [confirmingRefund, setConfirmingRefund] = useState(false);

	useEffect(() => {
		setStatus(issue.status === BillingIssueStatus.REFUNDED ? BillingIssueStatus.RESOLVED : issue.status);
		setNote(issue.resolutionNote || '');
		setPartialAmount('');
		setPaymentReference(issue.providerPaymentId || '');
		setConfirmingRefund(false);
		// `open` is a dependency on purpose: without it, cancelling and reopening the
		// same row restores the previous draft — including a typed partial amount and
		// an armed refund confirmation. A dialog that reopens one click away from
		// moving money is not an acceptable default.
	}, [open, issue.id, issue.status, issue.resolutionNote, issue.providerPaymentId]);

	if (!open) return null;

	const alreadyRefunded = issue.status === BillingIssueStatus.REFUNDED;
	// The refund section is offered for every open issue. Detection can only fill
	// the reference from the invoice id the site stores, so the admin may have to
	// paste the real charge id from the provider dashboard before confirming.
	const trimmedReference = paymentReference.trim();
	const canRefund = !alreadyRefunded;
	const refundReady = canRefund && trimmedReference.length > 0;

	// The admin types major units ("12.34"); the API speaks the smallest unit. The
	// factor is per-currency — for JPY the two are the same, and multiplying by 100
	// there would submit a refund a hundred times too large.
	const minorUnitFactor = currencyMinorUnitFactor(issue.currency || 'usd');
	const maxFractionDigits = minorUnitFactor === 1 ? 0 : 2;
	const trimmedPartial = partialAmount.trim();

	/*
	 * The typed amount must be a decimal the charge's currency can actually express.
	 *
	 * `Math.round(Number(input) * factor)` on its own silently CHANGED the number:
	 * "1.5" in a zero-decimal currency became 2 minor units, and "12.345" became
	 * 1235. A dialog whose next button moves real money must never submit a
	 * different amount from the one on screen — so excess precision is rejected
	 * rather than rounded away, and the entry is flagged like any other invalid one.
	 *
	 * The pattern also pins the shape: `Number()` happily accepts "1e3", "0x10" and
	 * "Infinity", none of which is an amount a person meant to type into a refund
	 * box. `Math.round` stays because it is still needed — 12.34 * 100 is
	 * 1233.9999999999998 in binary floating point, and only the rounding turns that
	 * back into the integer 1234 the API expects.
	 *
	 * The test is what the value MEANS, not how it was typed: `.50` is accepted like
	 * `0.50`, and trailing zeros are stripped before the digits are counted, so `1.0`
	 * is a valid ¥1 and `12.340` a valid $12.34. Only a value the currency genuinely
	 * cannot hold — `1.5` in yen, `12.345` in dollars — is refused. A leading zero or
	 * a trailing one is a typing habit, not a different amount, and rejecting either
	 * would be pedantry on an input an admin uses under pressure.
	 */
	const partialMatch = /^(?:\d+(?:\.(\d+))?|\.(\d+))$/.exec(trimmedPartial);
	const partialFractionDigits = (partialMatch?.[1] ?? partialMatch?.[2] ?? '').replace(/0+$/, '').length;
	const partialPrecisionOk = partialMatch !== null && partialFractionDigits <= maxFractionDigits;
	const parsedPartial =
		trimmedPartial && partialPrecisionOk ? Math.round(Number(trimmedPartial) * minorUnitFactor) : undefined;
	const partialIsInvalid =
		trimmedPartial !== '' &&
		(!partialPrecisionOk ||
			!Number.isFinite(parsedPartial) ||
			(parsedPartial ?? 0) <= 0 ||
			Boolean(issue.amount && (parsedPartial ?? 0) > issue.amount));

	const handleSaveStatus = async () => {
		// Always send the field, even empty: `undefined` means "leave the note as it
		// is", so collapsing a cleared textarea onto it would make a stale note
		// impossible to remove.
		const ok = await onUpdate(issue.id, { status, resolutionNote: note.trim() });
		if (ok) onClose();
	};

	const handleRefund = async () => {
		if (partialIsInvalid || !refundReady) return;
		const ok = await onRefund(issue.id, {
			amount: parsedPartial,
			providerPaymentId: trimmedReference,
			note: note.trim()
		});
		if (ok) onClose();
	};

	const formatDate = (value: string | null) =>
		value
			? new Date(value).toLocaleDateString(undefined, {
					month: 'short',
					day: 'numeric',
					year: 'numeric',
					hour: '2-digit',
					minute: '2-digit'
				})
			: '—';

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-4"
			onClick={(event) => event.target === event.currentTarget && !isPending && onOpenChange(false)}
			role="presentation"
		>
			<div
				role="dialog"
				aria-modal="true"
				aria-label={t('DIALOG_TITLE')}
				data-testid="billing-issue-dialog"
				className="bg-white dark:bg-[#121212] border border-gray-100 dark:border-white/8 rounded-2xl overflow-hidden shadow-2xl shadow-black/20 w-full max-w-lg my-8"
			>
				<div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-gray-100 dark:border-white/8">
					<div className="flex items-center gap-3 min-w-0">
						<div className="w-9 h-9 rounded-xl bg-gray-900 dark:bg-gray-800 flex items-center justify-center shrink-0">
							<AlertTriangle className="w-4 h-4 text-white" />
						</div>
						<div className="min-w-0">
							<h2 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
								{t('DIALOG_TITLE')}
							</h2>
							<p className="text-xs text-gray-500 dark:text-gray-400 truncate">
								{t(`TYPES.${issue.type}`)}
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={() => onOpenChange(false)}
						disabled={isPending}
						aria-label={t('CLOSE')}
						className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors disabled:opacity-50"
					>
						<X className="w-4 h-4" />
					</button>
				</div>

				<div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
					<dl className="grid grid-cols-2 gap-3 text-xs">
						<div className="col-span-2 flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
							<User className="w-3 h-3 shrink-0" />
							<dt className="sr-only">{t('CUSTOMER')}</dt>
							<dd className="truncate text-gray-900 dark:text-white">
								{issue.userEmail || issue.userId}
							</dd>
						</div>
						<div>
							<dt className="text-gray-400 dark:text-gray-500 uppercase tracking-wide text-[10px] font-semibold">
								{t('AMOUNT')}
							</dt>
							<dd className="text-gray-900 dark:text-white font-medium">
								{formatAmount(issue.amount, issue.currency, locale)}
							</dd>
						</div>
						<div>
							<dt className="text-gray-400 dark:text-gray-500 uppercase tracking-wide text-[10px] font-semibold">
								{t('PROVIDER')}
							</dt>
							<dd className="text-gray-900 dark:text-white font-medium capitalize">
								{issue.paymentProvider}
							</dd>
						</div>
						<div>
							<dt className="text-gray-400 dark:text-gray-500 uppercase tracking-wide text-[10px] font-semibold">
								{t('PLAN')}
							</dt>
							<dd className="text-gray-900 dark:text-white font-medium capitalize">
								{issue.planId || '—'}
							</dd>
						</div>
						<div>
							<dt className="text-gray-400 dark:text-gray-500 uppercase tracking-wide text-[10px] font-semibold">
								{t('STATUS')}
							</dt>
							<dd className="text-gray-900 dark:text-white font-medium">
								{t(`STATUS_LABELS.${issue.status}`)}
							</dd>
						</div>
						<div className="col-span-2 flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
							<Calendar className="w-3 h-3 shrink-0" />
							<dd>{formatDate(issue.createdAt)}</dd>
						</div>
						{issue.detectionReason && (
							<div className="col-span-2">
								<dt className="text-gray-400 dark:text-gray-500 uppercase tracking-wide text-[10px] font-semibold">
									{t('DETECTION_REASON')}
								</dt>
								<dd className="text-gray-700 dark:text-gray-300">{issue.detectionReason}</dd>
							</div>
						)}
						{alreadyRefunded && issue.providerPaymentId && (
							<div className="col-span-2">
								<dt className="text-gray-400 dark:text-gray-500 uppercase tracking-wide text-[10px] font-semibold">
									{t('PROVIDER_PAYMENT_ID')}
								</dt>
								<dd className="text-gray-700 dark:text-gray-300 break-all font-mono text-[11px]">
									{issue.providerPaymentId}
								</dd>
							</div>
						)}
						{alreadyRefunded && (
							<div className="col-span-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2">
								<dt className="text-emerald-700 dark:text-emerald-400 uppercase tracking-wide text-[10px] font-semibold">
									{t('REFUNDED_ON', { date: formatDate(issue.refundedAt) })}
								</dt>
								<dd className="text-emerald-800 dark:text-emerald-300 text-[11px] break-all">
									{formatAmount(issue.refundAmount, issue.currency, locale)}
									{issue.refundId ? ` · ${issue.refundId}` : ''}
								</dd>
							</div>
						)}
					</dl>

					<div>
						<label
							htmlFor="billing-issue-note"
							className="block text-[11px] uppercase tracking-wide font-semibold text-gray-400 dark:text-gray-500 mb-1.5"
						>
							{t('RESOLUTION_NOTE')}
						</label>
						<textarea
							id="billing-issue-note"
							value={note}
							onChange={(event) => setNote(event.target.value)}
							disabled={isPending}
							rows={3}
							placeholder={t('RESOLUTION_NOTE_PLACEHOLDER')}
							className={cn(INPUT_BASE, 'h-auto py-2 resize-y')}
						/>
					</div>

					{!alreadyRefunded && (
						<div>
							<label
								htmlFor="billing-issue-status"
								className="block text-[11px] uppercase tracking-wide font-semibold text-gray-400 dark:text-gray-500 mb-1.5"
							>
								{t('SET_STATUS')}
							</label>
							<select
								id="billing-issue-status"
								value={status}
								onChange={(event) => setStatus(event.target.value as BillingIssueStatusValues)}
								disabled={isPending}
								className={INPUT_BASE}
							>
								{STATUS_OPTIONS.map((option) => (
									<option key={option} value={option}>
										{t(`STATUS_LABELS.${option}`)}
									</option>
								))}
							</select>
						</div>
					)}

					{canRefund && (
						<div className="rounded-xl border border-gray-200 dark:border-white/8 p-3 space-y-2">
							<div className="flex items-center gap-2">
								<CreditCard className="w-3.5 h-3.5 text-gray-400" />
								<p className="text-xs font-semibold text-gray-900 dark:text-white">
									{t('REFUND_SECTION_TITLE')}
								</p>
							</div>
							<p className="text-[11px] text-gray-500 dark:text-gray-400">
								{t('REFUND_SECTION_HINT', { provider: issue.paymentProvider })}
							</p>
							<label
								htmlFor="billing-issue-payment-reference"
								className="block text-[10px] uppercase tracking-wide font-semibold text-gray-400 dark:text-gray-500"
							>
								{t('PROVIDER_PAYMENT_ID')}
							</label>
							<input
								id="billing-issue-payment-reference"
								type="text"
								value={paymentReference}
								onChange={(event) => {
									setPaymentReference(event.target.value);
									setConfirmingRefund(false);
								}}
								disabled={isPending}
								placeholder={t('PROVIDER_PAYMENT_ID')}
								className={cn(INPUT_BASE, 'font-mono text-[11px]')}
							/>
							<label htmlFor="billing-issue-refund-amount" className="sr-only">
								{t('PARTIAL_AMOUNT')}
							</label>
							<input
								id="billing-issue-refund-amount"
								type="number"
								min="0"
								step={minorUnitFactor === 1 ? '1' : '0.01'}
								inputMode="decimal"
								value={partialAmount}
								onChange={(event) => setPartialAmount(event.target.value)}
								disabled={isPending}
								placeholder={t('PARTIAL_AMOUNT_PLACEHOLDER')}
								className={INPUT_BASE}
							/>
							{partialIsInvalid && (
								<p className="text-[11px] text-red-600 dark:text-red-400">
									{/*
									 * Name the actual problem. "greater than 0 and no larger than
									 * the charged amount" does not describe "1.5 in a currency with
									 * no subunit", and an admin reading it would keep re-typing a
									 * value that can never be accepted.
									 */}
									{partialPrecisionOk ? t('PARTIAL_AMOUNT_INVALID') : t('PARTIAL_AMOUNT_PRECISION')}
								</p>
							)}
						</div>
					)}

					{canRefund && !refundReady && (
						<p className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 rounded-xl px-3 py-2">
							{t('NO_PAYMENT_REFERENCE')}
						</p>
					)}
				</div>

				<div className="flex flex-wrap items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-white/8">
					<button
						type="button"
						onClick={() => onOpenChange(false)}
						disabled={isPending}
						className="px-3 py-2 text-xs font-medium rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors disabled:opacity-50"
					>
						{t('CANCEL')}
					</button>

					{canRefund && !confirmingRefund && (
						<button
							type="button"
							data-testid="billing-issue-refund-start"
							onClick={() => setConfirmingRefund(true)}
							disabled={isPending || partialIsInvalid || !refundReady}
							className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-white/8 transition-colors disabled:opacity-50"
						>
							<RotateCcw className="w-3.5 h-3.5" />
							{t('ISSUE_REFUND')}
						</button>
					)}

					{canRefund && confirmingRefund && (
						<button
							type="button"
							data-testid="billing-issue-refund-confirm"
							onClick={handleRefund}
							disabled={isPending || partialIsInvalid || !refundReady}
							className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors disabled:opacity-50"
						>
							{isPending ? (
								<Loader2 className="w-3.5 h-3.5 animate-spin" />
							) : (
								<RotateCcw className="w-3.5 h-3.5" />
							)}
							{t('CONFIRM_REFUND', {
								amount: formatAmount(parsedPartial ?? issue.amount, issue.currency, locale)
							})}
						</button>
					)}

					{!alreadyRefunded && (
						<button
							type="button"
							data-testid="billing-issue-save-status"
							onClick={handleSaveStatus}
							disabled={isPending}
							className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50"
						>
							{isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
							{t('SAVE')}
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
