import {
	claimBillingIssueForRefund,
	getBillingIssueById,
	getBillingIssueRow,
	updateBillingIssue,
	upsertBillingIssueForSubscription,
	type BillingIssueWithContext
} from '@/lib/db/queries/billing-issue.queries';
import { getSubscriptionByProviderSubscriptionId, logSubscriptionChange } from '@/lib/db/queries/subscription.queries';
import { logActivity } from '@/lib/db/queries/activity.queries';
import { getTenantId } from '@/lib/auth/tenant';
import { ActivityType, BillingIssueStatus, BillingIssueType, type BillingIssueStatusValues } from '@/lib/db/schema';
import { getOrCreateProvider } from '@/lib/payment/config/payment-provider-manager';
import type { PaymentProviderInterface } from '@/lib/payment/types/payment-types';
import { toMinorUnits } from '@/lib/utils/currency-format';

/**
 * Billing-issue actions (Spec 051).
 *
 * The refund is executed by whichever provider the underlying payment record
 * names — the template already builds those instances through
 * `getOrCreateProvider(name)` and every provider already implements
 * `refundPayment(paymentId, amount?)`. Nothing here talks to a provider SDK
 * directly, so a provider added to the factory later is refundable here for free.
 */

/** Thrown for a caller mistake; the route maps `status` straight onto the response. */
export class BillingIssueActionError extends Error {
	readonly status: number;

	constructor(message: string, status = 400) {
		super(message);
		this.name = 'BillingIssueActionError';
		this.status = status;
	}
}

/**
 * Providers whose refunds cannot be driven through the API the template holds.
 * LemonSqueezy's own `refundPayment()` throws with this instruction, so the
 * check is done up front to give the admin an actionable 409 instead of a 500.
 */
const DASHBOARD_ONLY_REFUND_PROVIDERS: Record<string, string> = {
	lemonsqueezy: 'LemonSqueezy refunds must be issued from the LemonSqueezy dashboard, then marked resolved here.'
};

/** Statuses an issue may be moved to by a plain status update (refund has its own route). */
const ASSIGNABLE_STATUSES: BillingIssueStatusValues[] = [
	BillingIssueStatus.OPEN,
	BillingIssueStatus.IN_REVIEW,
	BillingIssueStatus.RESOLVED,
	BillingIssueStatus.DISMISSED
];

export function isAssignableBillingIssueStatus(value: string): value is BillingIssueStatusValues {
	return (ASSIGNABLE_STATUSES as string[]).includes(value);
}

export interface RefundBillingIssueInput {
	issueId: string;
	/** Partial-refund amount in the smallest currency unit. Omit for a full refund. */
	amount?: number;
	/**
	 * Provider charge / payment reference to refund. Overrides the one stored on
	 * the issue, and is persisted when it succeeds. Detection can only ever fill
	 * this from the columns the template stores (`subscriptions.invoice_id`), so an
	 * admin holding the real charge id from the provider dashboard must be able to
	 * supply it rather than being told the issue is un-refundable.
	 */
	providerPaymentId?: string;
	/** Admin user id, for the audit trail. */
	adminId: string;
	note?: string;
}

export interface ResolveBillingIssueInput {
	issueId: string;
	status: BillingIssueStatusValues;
	adminId: string;
	note?: string;
}

/**
 * Record the admin action in the shared activity log, matching how every other
 * admin mutation in the template is tracked. Never allowed to fail the action —
 * a missing tenant or a full log must not undo a refund the provider already took.
 */
async function recordAdminActivity(type: ActivityType, adminId: string, tenantId: string | null): Promise<void> {
	try {
		await logActivity(type, adminId, 'user', undefined, tenantId ?? undefined);
	} catch (error) {
		console.error('[BillingIssueService] Failed to write the admin activity log entry:', error);
	}
}

/**
 * Unit boundary between this feature and the payment providers.
 *
 * Everything the template stores is in the smallest currency unit — `subscriptions.amount`,
 * `billing_issues.amount`, the API body and the DB column are all integer cents.
 * Every `PaymentProviderInterface.refundPayment` implementation, however, does its
 * own `Math.round(amount * 100)` before calling the provider SDK
 * (`stripe-provider.ts:631`, and the same in `polar-provider.ts` and
 * `solidgate-provider.ts`) and returns `refund.amount / 100` on the way back.
 * Passing cents straight through would refund 100x the intended amount.
 *
 * That factor in the adapters is a HARD-CODED 100, not a currency-aware one — so
 * the value this seam must hand them is "minor units ÷ 100" for EVERY currency,
 * including the zero-decimal ones. Making this conversion currency-aware would be
 * the intuitive move and would be wrong: for JPY it would pass ¥1000 unchanged,
 * the adapter would multiply by 100, and the customer would be refunded ¥100,000.
 * The currency-aware helpers are used for storage and display, never here.
 * Standardising the adapter interface on minor units is the real fix and belongs
 * in the payment-provider spec, not in this feature.
 */
const PROVIDER_AMOUNT_SCALE = 100;

function toProviderAmount(minorUnits: number): number {
	return minorUnits / PROVIDER_AMOUNT_SCALE;
}

function fromProviderAmount(providerAmount: number): number {
	return Math.round(providerAmount * PROVIDER_AMOUNT_SCALE);
}

/** Read the refund id out of whatever shape the provider returned. */
function extractRefundId(result: unknown): string | null {
	if (!result || typeof result !== 'object') return null;
	const record = result as Record<string, unknown>;
	for (const key of ['id', 'refundId', 'refund_id']) {
		const value = record[key];
		if (typeof value === 'string' && value) return value;
	}
	return null;
}

/**
 * Read the refunded amount out of whatever shape the provider returned, converted
 * back into the smallest currency unit this feature stores. Mirrors the adapters'
 * own `refund.amount / 100`, so it is the same fixed scale, not a currency one.
 */
function extractRefundAmount(result: unknown): number | null {
	if (!result || typeof result !== 'object') return null;
	const record = result as Record<string, unknown>;
	for (const key of ['amount', 'refundAmount', 'refunded_amount']) {
		const value = record[key];
		if (typeof value === 'number' && Number.isFinite(value)) return fromProviderAmount(value);
	}
	return null;
}

/**
 * Issue a refund for a billing issue through the provider that owns the payment,
 * then record the outcome on the issue and in the subscription history.
 *
 * The issue is only marked `refunded` after the provider call returns — a failed
 * provider call leaves the status untouched so the admin can retry.
 *
 * Ordering matters here. Every validation that can reject the request runs before
 * anything is written, and the LAST thing before the provider call is an atomic
 * claim: a single conditional UPDATE that exactly one concurrent request can win.
 * Without it, two admins pressing "refund" at the same moment would both read a
 * non-refunded row and both reach the provider — two real refunds for one charge.
 */
export async function refundBillingIssue(
	input: RefundBillingIssueInput,
	/** Seam for tests; defaults to the template's provider factory. */
	resolveProvider: (name: string) => PaymentProviderInterface = getOrCreateProvider
): Promise<BillingIssueWithContext> {
	const issue = await getBillingIssueRow(input.issueId);
	if (!issue) {
		throw new BillingIssueActionError('Billing issue not found', 404);
	}

	if (issue.status === BillingIssueStatus.REFUNDED) {
		throw new BillingIssueActionError('This billing issue has already been refunded', 409);
	}

	const providerPaymentId = input.providerPaymentId?.trim() || issue.providerPaymentId;
	if (!providerPaymentId) {
		throw new BillingIssueActionError(
			'This billing issue has no provider payment reference to refund. Resolve it manually instead.',
			409
		);
	}

	if (input.amount !== undefined) {
		if (!Number.isFinite(input.amount) || !Number.isInteger(input.amount) || input.amount <= 0) {
			throw new BillingIssueActionError('Refund amount must be a positive integer in the smallest currency unit');
		}
		// A zero / unknown charged amount cannot bound a partial refund, and a
		// truthiness check would have skipped the cap entirely and let an admin
		// refund an arbitrary sum. Full refunds stay available: the provider itself
		// knows the charge and is the right authority for that case.
		if (typeof issue.amount !== 'number' || issue.amount <= 0) {
			throw new BillingIssueActionError(
				'This billing issue has no recorded charge amount, so a partial refund cannot be bounded. Issue a full refund instead.',
				409
			);
		}
		if (input.amount > issue.amount) {
			throw new BillingIssueActionError('Refund amount cannot exceed the charged amount');
		}
	}

	const providerName = (issue.paymentProvider || '').toLowerCase();
	const dashboardOnly = DASHBOARD_ONLY_REFUND_PROVIDERS[providerName];
	if (dashboardOnly) {
		throw new BillingIssueActionError(dashboardOnly, 409);
	}

	let provider: PaymentProviderInterface;
	try {
		provider = resolveProvider(providerName);
	} catch {
		throw new BillingIssueActionError(`Payment provider "${issue.paymentProvider}" is not configured`, 409);
	}

	const claimed = await claimBillingIssueForRefund(issue.id);
	if (!claimed) {
		throw new BillingIssueActionError(
			'This billing issue is already being refunded, or has just been refunded. Reload the page to see its current state.',
			409
		);
	}

	const claimedAt = claimed.refundClaimedAt;

	let providerResult: unknown;
	try {
		providerResult = await provider.refundPayment(
			providerPaymentId,
			input.amount === undefined ? undefined : toProviderAmount(input.amount)
		);
	} catch (error) {
		// The claim is deliberately NOT handed back here.
		//
		// A thrown error does not tell us whether the provider took the money: a lost
		// response, a proxy timeout or a client-side abort all look identical to a
		// clean rejection. Releasing the claim would let an immediate retry submit a
		// SECOND refund for a charge that may already have been refunded. So the claim
		// is left to expire after `REFUND_CLAIM_TTL_MS`, which bounds the damage to a
		// short wait instead of a duplicate payout, and the message says so.
		const detail = error instanceof Error ? error.message : String(error);
		console.error('[BillingIssueService] Provider refund failed:', detail);
		throw new BillingIssueActionError(
			`The payment provider rejected the refund: ${detail}. Check the provider dashboard before retrying — the refund may still have gone through, so this issue stays locked for a few minutes.`,
			502
		);
	}

	const now = new Date();
	const updated = await updateBillingIssue(
		issue.id,
		{
			status: BillingIssueStatus.REFUNDED,
			// Persist the reference that actually worked, so a retry or an audit reads
			// the same id the provider was given.
			providerPaymentId,
			refundClaimedAt: null,
			refundId: extractRefundId(providerResult),
			refundAmount: input.amount ?? extractRefundAmount(providerResult) ?? issue.amount ?? null,
			refundedAt: now,
			resolutionNote: input.note === undefined ? issue.resolutionNote : input.note || null,
			resolvedBy: input.adminId,
			resolvedAt: now
		},
		// Only the request that still holds the claim may write the outcome. If the
		// claim expired and another request took it over, this write is refused
		// rather than stamping our result over theirs.
		claimedAt ? { onlyWithClaim: claimedAt } : {}
	);

	if (!updated) {
		console.error(
			'[BillingIssueService] Refund succeeded at the provider but the issue could not be finalised (claim lost):',
			issue.id
		);
		throw new BillingIssueActionError(
			'The refund was accepted by the provider, but this issue was picked up by another request in the meantime. Reload the page and check the provider dashboard before retrying.',
			409
		);
	}

	await recordAdminActivity(ActivityType.ADMIN_BILLING_REFUND, input.adminId, issue.tenantId);

	// Audit trail lives with the payment record, not only with the issue, so the
	// refund shows up in the subscription's own history like every other change.
	if (issue.subscriptionId) {
		try {
			await logSubscriptionChange(
				issue.subscriptionId,
				'admin_refund',
				issue.status,
				BillingIssueStatus.REFUNDED,
				undefined,
				undefined,
				input.note || 'Refund issued from the admin billing issues page',
				{
					billingIssueId: issue.id,
					provider: issue.paymentProvider,
					providerPaymentId,
					refundId: updated.refundId,
					refundAmount: updated.refundAmount,
					adminId: input.adminId
				}
			);
		} catch (error) {
			// A history write must never undo a refund that the provider already took.
			console.error('[BillingIssueService] Failed to log refund in subscription history:', error);
		}
	}

	const withContext = await getBillingIssueById(issue.id);
	if (!withContext) {
		throw new BillingIssueActionError('Billing issue not found', 404);
	}

	return withContext;
}

/**
 * Move an issue to a non-refund status (in review / resolved / dismissed / reopened),
 * stamping the acting admin and the note.
 */
export async function resolveBillingIssue(input: ResolveBillingIssueInput): Promise<BillingIssueWithContext> {
	if (!isAssignableBillingIssueStatus(input.status)) {
		throw new BillingIssueActionError(
			`Status must be one of: ${ASSIGNABLE_STATUSES.join(', ')}. Use the refund action to mark an issue refunded.`
		);
	}

	const issue = await getBillingIssueRow(input.issueId);
	if (!issue) {
		throw new BillingIssueActionError('Billing issue not found', 404);
	}

	if (issue.status === BillingIssueStatus.REFUNDED) {
		throw new BillingIssueActionError('A refunded billing issue cannot be moved to another status', 409);
	}

	const closing = input.status === BillingIssueStatus.RESOLVED || input.status === BillingIssueStatus.DISMISSED;

	const updated = await updateBillingIssue(
		issue.id,
		{
			status: input.status,
			// `undefined` means "the caller did not touch the note"; an empty string
			// means "the admin cleared it", and must survive as a real clear rather
			// than silently restoring the stale note.
			resolutionNote: input.note === undefined ? issue.resolutionNote : input.note || null,
			resolvedBy: closing ? input.adminId : null,
			resolvedAt: closing ? new Date() : null
		},
		// The status read above cannot bind a later write on its own: a refund may
		// commit in between, and this update would then overwrite `refunded` after
		// the provider already moved the money. The guard travels into the WHERE.
		{ skipIfRefunded: true }
	);

	if (!updated) {
		const current = await getBillingIssueRow(issue.id);
		if (current?.status === BillingIssueStatus.REFUNDED) {
			throw new BillingIssueActionError('A refunded billing issue cannot be moved to another status', 409);
		}
		throw new BillingIssueActionError('Billing issue not found', 404);
	}

	if (closing) {
		await recordAdminActivity(ActivityType.ADMIN_BILLING_ISSUE_RESOLVED, input.adminId, issue.tenantId);
	}

	if (closing && issue.subscriptionId) {
		try {
			await logSubscriptionChange(
				issue.subscriptionId,
				'admin_billing_issue_resolved',
				issue.status,
				input.status,
				undefined,
				undefined,
				input.note || 'Billing issue closed from the admin billing issues page',
				{ billingIssueId: issue.id, adminId: input.adminId }
			);
		} catch (error) {
			console.error('[BillingIssueService] Failed to log resolution in subscription history:', error);
		}
	}

	const withContext = await getBillingIssueById(issue.id);
	if (!withContext) {
		throw new BillingIssueActionError('Billing issue not found', 404);
	}

	return withContext;
}

/**
 * Open a billing issue from a payment-provider webhook that reported a failed
 * charge, so a live failure lands in the admin queue without waiting for the
 * next manual re-scan.
 *
 * Deliberately best-effort: a webhook's job is to fulfil the payment, and the
 * admin queue is a secondary consumer. Every failure path here logs and returns
 * `false` rather than throwing, because a throw would make the relay ask the
 * provider to retry an event that was already fulfilled correctly. A skipped
 * intake is recovered on the next re-scan, which reads the same subscription
 * columns.
 */
export async function openBillingIssueFromFailedPaymentWebhook(input: {
	/** The provider's own subscription id, as it appears on the webhook payload. */
	providerSubscriptionId?: string | null;
	paymentProvider: string;
	/** Provider charge / invoice id used later as the refund target. */
	providerPaymentId?: string | null;
	amount?: number | null;
	currency?: string | null;
	reason?: string | null;
}): Promise<boolean> {
	try {
		if (!input.providerSubscriptionId) return false;

		const subscription = await getSubscriptionByProviderSubscriptionId(
			input.paymentProvider,
			input.providerSubscriptionId
		);
		if (!subscription) return false;

		const tenantId = subscription.tenantId || (await getTenantId());
		if (!tenantId) return false;

		const currency = input.currency ?? subscription.currency ?? 'usd';

		await upsertBillingIssueForSubscription({
			subscriptionId: subscription.id,
			userId: subscription.userId,
			type: BillingIssueType.PAYMENT_FAILED,
			paymentProvider: subscription.paymentProvider || input.paymentProvider,
			providerPaymentId: input.providerPaymentId ?? subscription.invoiceId,
			// `input.amount` arrives from the provider payload already in the smallest
			// unit; the subscription fallback does NOT — `subscriptions.amount*` are
			// written through `convertCentsToDecimal`, so they are major units and have
			// to be converted, or a webhook-created issue and a re-scan-created issue
			// would disagree about what the same charge was worth.
			amount: input.amount ?? toMinorUnits(subscription.amountDue ?? subscription.amount ?? 0, currency),
			currency,
			detectionReason: input.reason || `Payment failed webhook for subscription ${input.providerSubscriptionId}`,
			tenantId
		});

		return true;
	} catch (error) {
		console.error('[BillingIssueService] Failed to open a billing issue from a webhook:', error);
		return false;
	}
}
