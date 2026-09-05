import { and, count, desc, eq, gt, ilike, inArray, isNull, lt, ne, or, sql, type SQL } from 'drizzle-orm';
import { db } from '../drizzle';
import {
	billingIssues,
	subscriptions,
	users,
	BillingIssueStatus,
	BillingIssueType,
	OPEN_BILLING_ISSUE_STATUSES,
	REFUND_CLAIM_TTL_MS,
	SubscriptionStatus,
	type BillingIssue,
	type BillingIssueStatusValues,
	type BillingIssueTypeValues,
	type NewBillingIssue
} from '../schema';
import { PaymentProvider } from '@/lib/constants/payment';
import { getTenantId } from '@/lib/auth/tenant';
import { toMinorUnits } from '@/lib/utils/currency-format';

/**
 * Billing-issue queries (Spec 046).
 *
 * A billing issue is an admin-workflow record layered on the payment data the
 * template already stores — it is deliberately NOT a second source of truth for
 * money. Every read joins back to `subscriptions` (plan, provider, amount) and
 * `users` (who to contact), and the refund action resolves the provider from
 * `subscriptions.payment_provider`.
 */

/** A related id the caller supplied does not exist inside the caller's tenant. */
export class BillingIssueReferenceError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'BillingIssueReferenceError';
	}
}

/** A billing issue plus the subscription / user context an admin needs to act. */
export interface BillingIssueWithContext {
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
	refundedAt: Date | null;
	resolutionNote: string | null;
	resolvedBy: string | null;
	resolvedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
	userEmail: string | null;
	planId: string | null;
	subscriptionStatus: string | null;
	failedPaymentCount: number | null;
	providerSubscriptionId: string | null;
	invoiceId: string | null;
	hostedInvoiceUrl: string | null;
}

export interface ListBillingIssuesParams {
	page?: number;
	limit?: number;
	search?: string;
	status?: BillingIssueStatusValues;
	type?: BillingIssueTypeValues;
	provider?: string;
}

export interface ListBillingIssuesResult {
	issues: BillingIssueWithContext[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

export interface BillingIssueStats {
	total: number;
	openCount: number;
	refundedCount: number;
	resolvedCount: number;
	byStatus: Record<string, number>;
	byType: Record<string, number>;
	byProvider: Record<string, number>;
	/**
	 * Sum of `amount` over issues that are still open, PER CURRENCY, in the
	 * smallest currency unit. Deliberately not one scalar: adding 100 JPY to 100
	 * USD produces a number that means nothing, and the page would have to invent
	 * a currency label for it.
	 */
	amountAtRisk: Array<{ currency: string; amount: number }>;
}

/** Columns every list / detail read projects, so both stay in lockstep. */
const ISSUE_COLUMNS = {
	id: billingIssues.id,
	userId: billingIssues.userId,
	subscriptionId: billingIssues.subscriptionId,
	type: billingIssues.type,
	status: billingIssues.status,
	paymentProvider: billingIssues.paymentProvider,
	providerPaymentId: billingIssues.providerPaymentId,
	amount: billingIssues.amount,
	currency: billingIssues.currency,
	detectionReason: billingIssues.detectionReason,
	refundId: billingIssues.refundId,
	refundAmount: billingIssues.refundAmount,
	refundedAt: billingIssues.refundedAt,
	resolutionNote: billingIssues.resolutionNote,
	resolvedBy: billingIssues.resolvedBy,
	resolvedAt: billingIssues.resolvedAt,
	createdAt: billingIssues.createdAt,
	updatedAt: billingIssues.updatedAt,
	userEmail: users.email,
	planId: subscriptions.planId,
	subscriptionStatus: subscriptions.status,
	failedPaymentCount: subscriptions.failedPaymentCount,
	providerSubscriptionId: subscriptions.subscriptionId,
	invoiceId: subscriptions.invoiceId,
	hostedInvoiceUrl: subscriptions.hostedInvoiceUrl
} as const;

/**
 * Build the dedupe key detection uses. Keyed on the subscription plus the issue
 * type so one subscription can carry a failed-payment issue and a dispute at the
 * same time, while a re-run of detection updates rather than duplicates.
 */
export function buildBillingIssueSourceKey(subscriptionId: string, type: BillingIssueTypeValues): string {
	return `${type}:${subscriptionId}`;
}

/**
 * List billing issues, newest first, with the subscription and user context an
 * admin needs. Filters are all optional and combine with AND.
 */
export async function listBillingIssues(params: ListBillingIssuesParams = {}): Promise<ListBillingIssuesResult> {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');

	const page = Math.max(1, params.page ?? 1);
	const limit = Math.min(100, Math.max(1, params.limit ?? 10));
	const offset = (page - 1) * limit;

	const conditions: SQL[] = [eq(billingIssues.tenantId, tenantId)];
	if (params.status) conditions.push(eq(billingIssues.status, params.status));
	if (params.type) conditions.push(eq(billingIssues.type, params.type));
	if (params.provider) conditions.push(eq(billingIssues.paymentProvider, params.provider));

	const search = params.search?.trim();
	if (search) {
		const term = `%${search}%`;
		const searchCondition = or(
			ilike(users.email, term),
			ilike(billingIssues.providerPaymentId, term),
			ilike(billingIssues.detectionReason, term),
			ilike(billingIssues.resolutionNote, term),
			ilike(subscriptions.subscriptionId, term)
		);
		if (searchCondition) conditions.push(searchCondition);
	}

	const where = and(...conditions);

	const rows = await db
		.select(ISSUE_COLUMNS)
		.from(billingIssues)
		.leftJoin(users, eq(billingIssues.userId, users.id))
		.leftJoin(subscriptions, eq(billingIssues.subscriptionId, subscriptions.id))
		.where(where)
		.orderBy(desc(billingIssues.createdAt))
		.limit(limit)
		.offset(offset);

	const [totalRow] = await db
		.select({ value: count() })
		.from(billingIssues)
		.leftJoin(users, eq(billingIssues.userId, users.id))
		.leftJoin(subscriptions, eq(billingIssues.subscriptionId, subscriptions.id))
		.where(where);

	const total = totalRow?.value ?? 0;

	return {
		issues: rows as BillingIssueWithContext[],
		total,
		page,
		limit,
		totalPages: Math.max(1, Math.ceil(total / limit))
	};
}

/** Fetch one billing issue with its subscription / user context. */
export async function getBillingIssueById(id: string): Promise<BillingIssueWithContext | null> {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');

	const [row] = await db
		.select(ISSUE_COLUMNS)
		.from(billingIssues)
		.leftJoin(users, eq(billingIssues.userId, users.id))
		.leftJoin(subscriptions, eq(billingIssues.subscriptionId, subscriptions.id))
		.where(and(eq(billingIssues.id, id), eq(billingIssues.tenantId, tenantId)))
		.limit(1);

	return (row as BillingIssueWithContext) ?? null;
}

/** Raw row read used by the service before it mutates an issue. */
export async function getBillingIssueRow(id: string): Promise<BillingIssue | null> {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');

	const [row] = await db
		.select()
		.from(billingIssues)
		.where(and(eq(billingIssues.id, id), eq(billingIssues.tenantId, tenantId)))
		.limit(1);

	return row ?? null;
}

/**
 * Create a billing issue from the manual-create route.
 *
 * The tenant is always resolved from the request — it is deliberately NOT a
 * parameter, so a caller can never aim an insert at another tenant. The `userId`
 * and `subscriptionId` the admin supplied are checked against that same tenant
 * before the insert, because an unchecked id here would let an admin of one
 * tenant attach a refundable issue to another tenant's customer and payment.
 */
export async function createBillingIssue(data: Omit<NewBillingIssue, 'tenantId'>): Promise<BillingIssue> {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');

	const [user] = await db
		.select({ id: users.id })
		.from(users)
		.where(and(eq(users.id, data.userId), eq(users.tenantId, tenantId)))
		.limit(1);
	if (!user) throw new BillingIssueReferenceError('The user does not exist in this tenant');

	if (data.subscriptionId) {
		// Same tenant is not enough: the subscription must belong to the SAME user, or
		// the issue would show one customer while pointing the refund at another
		// customer's payment.
		const [subscription] = await db
			.select({ id: subscriptions.id })
			.from(subscriptions)
			.where(
				and(
					eq(subscriptions.id, data.subscriptionId),
					eq(subscriptions.tenantId, tenantId),
					eq(subscriptions.userId, data.userId)
				)
			)
			.limit(1);
		if (!subscription) {
			throw new BillingIssueReferenceError(
				'The subscription does not exist in this tenant, or belongs to another user'
			);
		}
	}

	const [row] = await db
		.insert(billingIssues)
		.values({ ...data, tenantId })
		.returning();

	return row;
}

export interface UpdateBillingIssueData {
	status?: BillingIssueStatusValues;
	/** Corrected provider charge reference, when an admin supplied one at refund time. */
	providerPaymentId?: string | null;
	resolutionNote?: string | null;
	resolvedBy?: string | null;
	resolvedAt?: Date | null;
	refundId?: string | null;
	refundAmount?: number | null;
	refundedAt?: Date | null;
	/** Cleared when a refund is finalised, so the row is not left holding a claim. */
	refundClaimedAt?: Date | null;
}

export interface UpdateBillingIssueOptions {
	/**
	 * Refuse the write if the row has meanwhile become `refunded`. The status check
	 * in the service reads the row first, so without this guard a status change
	 * racing a refund could overwrite `refunded` AFTER the provider took the money.
	 * The condition therefore has to travel into the UPDATE's own WHERE clause.
	 */
	skipIfRefunded?: boolean;
	/**
	 * Refuse the write unless the row still carries exactly this refund claim — the
	 * claim timestamp doubles as an ownership token. A request whose claim was taken
	 * over after the TTL must not be able to write its outcome over the request that
	 * now owns the issue.
	 */
	onlyWithClaim?: Date;
}

/**
 * Patch a billing issue in place. Returns null when the row is not in the tenant
 * — or, with `skipIfRefunded`, when it has already been refunded.
 */
export async function updateBillingIssue(
	id: string,
	data: UpdateBillingIssueData,
	options: UpdateBillingIssueOptions = {}
): Promise<BillingIssue | null> {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');

	const conditions: SQL[] = [eq(billingIssues.id, id), eq(billingIssues.tenantId, tenantId)];
	if (options.skipIfRefunded) conditions.push(ne(billingIssues.status, BillingIssueStatus.REFUNDED));
	if (options.onlyWithClaim) conditions.push(eq(billingIssues.refundClaimedAt, options.onlyWithClaim));

	const [row] = await db
		.update(billingIssues)
		.set({ ...data, updatedAt: new Date() })
		.where(and(...conditions))
		.returning();

	return row ?? null;
}

/**
 * Take exclusive ownership of an issue's refund before any provider call.
 *
 * Two admins pressing "refund" at the same moment would otherwise both pass the
 * `status !== 'refunded'` read and both reach the provider — two real refunds for
 * one charge. This is a single conditional UPDATE, so exactly one of them wins:
 * the row is claimable only while it is not already refunded and either
 * unclaimed or claimed longer ago than `REFUND_CLAIM_TTL_MS` (so a crashed
 * request cannot strand it forever).
 *
 * Returns the claimed row, or null if another request holds the claim.
 */
export async function claimBillingIssueForRefund(id: string): Promise<BillingIssue | null> {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');

	const now = new Date();
	const staleBefore = new Date(now.getTime() - REFUND_CLAIM_TTL_MS);
	const claimable = or(isNull(billingIssues.refundClaimedAt), lt(billingIssues.refundClaimedAt, staleBefore));

	const [row] = await db
		.update(billingIssues)
		.set({ refundClaimedAt: now, updatedAt: now })
		.where(
			and(
				eq(billingIssues.id, id),
				eq(billingIssues.tenantId, tenantId),
				ne(billingIssues.status, BillingIssueStatus.REFUNDED),
				claimable
			)
		)
		.returning();

	return row ?? null;
}

/** Counts and totals for the page header tabs and stat cards. */
export async function getBillingIssueStats(): Promise<BillingIssueStats> {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');

	const scope = eq(billingIssues.tenantId, tenantId);

	const [byStatusRows, byTypeRows, byProviderRows, atRiskRows] = await Promise.all([
		db
			.select({ status: billingIssues.status, value: count() })
			.from(billingIssues)
			.where(scope)
			.groupBy(billingIssues.status),
		db
			.select({ type: billingIssues.type, value: count() })
			.from(billingIssues)
			.where(scope)
			.groupBy(billingIssues.type),
		db
			.select({ provider: billingIssues.paymentProvider, value: count() })
			.from(billingIssues)
			.where(scope)
			.groupBy(billingIssues.paymentProvider),
		db
			.select({
				currency: sql<string>`coalesce(${billingIssues.currency}, 'usd')`,
				total: sql<number>`coalesce(sum(${billingIssues.amount}), 0)`
			})
			.from(billingIssues)
			.where(and(scope, inArray(billingIssues.status, OPEN_BILLING_ISSUE_STATUSES)))
			.groupBy(sql`coalesce(${billingIssues.currency}, 'usd')`)
	]);

	const byStatus: Record<string, number> = {};
	for (const row of byStatusRows) byStatus[row.status] = Number(row.value);

	const byType: Record<string, number> = {};
	for (const row of byTypeRows) byType[row.type] = Number(row.value);

	const byProvider: Record<string, number> = {};
	for (const row of byProviderRows) byProvider[row.provider] = Number(row.value);

	const total = Object.values(byStatus).reduce((sum, value) => sum + value, 0);

	return {
		total,
		openCount: (byStatus[BillingIssueStatus.OPEN] ?? 0) + (byStatus[BillingIssueStatus.IN_REVIEW] ?? 0),
		refundedCount: byStatus[BillingIssueStatus.REFUNDED] ?? 0,
		resolvedCount: byStatus[BillingIssueStatus.RESOLVED] ?? 0,
		byStatus,
		byType,
		byProvider,
		amountAtRisk: atRiskRows.map((row) => ({ currency: row.currency, amount: Number(row.total ?? 0) }))
	};
}

/** One problem detected on an existing subscription row. */
interface DetectedIssue {
	subscriptionId: string;
	userId: string;
	type: BillingIssueTypeValues;
	paymentProvider: string;
	providerPaymentId: string | null;
	amount: number;
	currency: string;
	detectionReason: string;
}

export interface SyncBillingIssuesResult {
	created: number;
	skipped: number;
	scanned: number;
}

/**
 * Derive open billing issues from the subscription records the template already
 * stores, so the admin list is populated without inventing a parallel payment
 * store or waiting for a webhook to fire.
 *
 * Two detectors, both reading columns that already exist:
 *   - `failed_payment_count > 0` — a renewal charge the provider could not take.
 *   - a subscription stuck in `pending` or flipped to `expired` while
 *     `auto_renewal` is still on — the "subscription in a bad state" case.
 *
 * Idempotent: rows are keyed by `(tenant_id, source_key)` and inserted with
 * `ON CONFLICT DO NOTHING`, so a re-run never doubles an issue and never
 * re-opens one an admin already closed.
 */
export async function syncBillingIssuesFromSubscriptions(): Promise<SyncBillingIssuesResult> {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');

	const candidates = await db
		.select({
			id: subscriptions.id,
			userId: subscriptions.userId,
			status: subscriptions.status,
			planId: subscriptions.planId,
			paymentProvider: subscriptions.paymentProvider,
			invoiceId: subscriptions.invoiceId,
			amount: subscriptions.amount,
			amountDue: subscriptions.amountDue,
			currency: subscriptions.currency,
			failedPaymentCount: subscriptions.failedPaymentCount,
			autoRenewal: subscriptions.autoRenewal
		})
		.from(subscriptions)
		.where(
			and(
				eq(subscriptions.tenantId, tenantId),
				or(
					gt(subscriptions.failedPaymentCount, 0),
					eq(subscriptions.status, SubscriptionStatus.PENDING),
					eq(subscriptions.status, SubscriptionStatus.EXPIRED)
				)
			)
		);

	const detected: DetectedIssue[] = [];

	for (const subscription of candidates) {
		const currency = subscription.currency || 'usd';
		const base = {
			subscriptionId: subscription.id,
			userId: subscription.userId,
			paymentProvider: subscription.paymentProvider || PaymentProvider.STRIPE,
			providerPaymentId: subscription.invoiceId,
			// `subscriptions.amount*` hold MAJOR units — the webhook writer stores
			// `convertCentsToDecimal(...)` into them — while a billing issue holds the
			// smallest unit so a partial refund can carry cents. Convert, never copy.
			amount: toMinorUnits(subscription.amountDue || subscription.amount || 0, currency),
			currency
		};

		const failures = subscription.failedPaymentCount ?? 0;
		if (failures > 0) {
			detected.push({
				...base,
				type: BillingIssueType.PAYMENT_FAILED,
				detectionReason: `${failures} failed payment attempt${failures === 1 ? '' : 's'} on subscription ${subscription.id}`
			});
		}

		const stuckPending = subscription.status === SubscriptionStatus.PENDING;
		const expiredWhileRenewing =
			subscription.status === SubscriptionStatus.EXPIRED && subscription.autoRenewal === true;
		if (stuckPending || expiredWhileRenewing) {
			detected.push({
				...base,
				type: BillingIssueType.SUBSCRIPTION_STATE,
				detectionReason: stuckPending
					? `Subscription ${subscription.id} is still pending activation`
					: `Subscription ${subscription.id} expired while auto-renewal was enabled`
			});
		}
	}

	if (detected.length === 0) {
		return { created: 0, skipped: 0, scanned: candidates.length };
	}

	const inserted = await db
		.insert(billingIssues)
		.values(
			detected.map((issue) => ({
				userId: issue.userId,
				subscriptionId: issue.subscriptionId,
				type: issue.type,
				status: BillingIssueStatus.OPEN,
				paymentProvider: issue.paymentProvider,
				providerPaymentId: issue.providerPaymentId,
				amount: issue.amount,
				currency: issue.currency,
				detectionReason: issue.detectionReason,
				sourceKey: buildBillingIssueSourceKey(issue.subscriptionId, issue.type),
				tenantId
			}))
		)
		// The unique index is on (tenant_id, source_key); an issue that already
		// exists — open OR closed — is left exactly as the admin left it.
		.onConflictDoNothing({ target: [billingIssues.tenantId, billingIssues.sourceKey] })
		.returning({ id: billingIssues.id });

	return {
		created: inserted.length,
		skipped: detected.length - inserted.length,
		scanned: candidates.length
	};
}

/**
 * Open (or refresh) an issue for a subscription from a webhook. Used by the
 * payment webhook dispatch when a provider reports a failed charge, so a live
 * failure lands in the admin queue without waiting for the next manual sync.
 *
 * Never re-opens a closed issue: the conflict target is the same
 * `(tenant_id, source_key)` pair detection uses.
 */
export async function upsertBillingIssueForSubscription(input: {
	subscriptionId: string;
	userId: string;
	type: BillingIssueTypeValues;
	paymentProvider: string;
	providerPaymentId?: string | null;
	amount?: number | null;
	currency?: string | null;
	detectionReason: string;
	tenantId: string;
}): Promise<BillingIssue | null> {
	const [row] = await db
		.insert(billingIssues)
		.values({
			userId: input.userId,
			subscriptionId: input.subscriptionId,
			type: input.type,
			status: BillingIssueStatus.OPEN,
			paymentProvider: input.paymentProvider || PaymentProvider.STRIPE,
			providerPaymentId: input.providerPaymentId ?? null,
			amount: input.amount ?? 0,
			currency: input.currency ?? 'usd',
			detectionReason: input.detectionReason,
			sourceKey: buildBillingIssueSourceKey(input.subscriptionId, input.type),
			tenantId: input.tenantId
		})
		.onConflictDoNothing({ target: [billingIssues.tenantId, billingIssues.sourceKey] })
		.returning();

	if (row) return row;

	// The issue already existed — created by the re-scan, which can only ever know
	// the invoice id. A webhook usually carries the payment intent, which is what a
	// refund actually needs, so adopt it. Scoped to issues that are still OPEN so a
	// closed or refunded issue is never touched, and to rows whose reference differs,
	// so this is a no-op on a repeat delivery.
	//
	// The NULL arm is not defensive padding — it is the main case. The re-scan fills
	// `provider_payment_id` from `subscriptions.invoice_id`, which is nullable, so an
	// issue detected before any invoice was recorded stores NULL. In SQL,
	// `NULL <> 'pi_123'` is NULL, not TRUE, so a bare `ne(...)` matches no row and the
	// webhook's payment intent is silently dropped — leaving exactly the issues that
	// have no reference as the ones that can never acquire one, with the refund
	// control disabled forever.
	if (input.providerPaymentId) {
		const [updated] = await db
			.update(billingIssues)
			.set({ providerPaymentId: input.providerPaymentId, updatedAt: new Date() })
			.where(
				and(
					eq(billingIssues.tenantId, input.tenantId),
					eq(billingIssues.sourceKey, buildBillingIssueSourceKey(input.subscriptionId, input.type)),
					inArray(billingIssues.status, OPEN_BILLING_ISSUE_STATUSES),
					or(
						isNull(billingIssues.providerPaymentId),
						ne(billingIssues.providerPaymentId, input.providerPaymentId)
					)
				)
			)
			.returning();

		return updated ?? null;
	}

	return null;
}
