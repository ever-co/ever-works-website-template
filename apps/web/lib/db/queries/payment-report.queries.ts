import { and, count, desc, eq, gte, ilike, lte, or, sql, type SQL } from 'drizzle-orm';
import { db } from '../drizzle';
import { subscriptions, users } from '../schema';
import { getTenantId } from '@/lib/auth/tenant';
import type { PaymentReportRecord, PaymentReportSummary } from './payment-report-summary';

/**
 * The record shape, the summary shape and the in-memory roll-up live in
 * `./payment-report-summary`, which imports nothing at runtime so it can be unit
 * tested. Re-exported here so every caller keeps importing them from the queries
 * module it already knows.
 */
export type { PaymentReportRecord, PaymentReportSummary } from './payment-report-summary';
export { summarizePaymentRecords } from './payment-report-summary';

/**
 * Payment-report queries (Spec 052).
 *
 * The report reads the payment records the template already stores — the
 * `subscriptions` table, which carries plan, provider, status, amount, currency
 * and invoice ids — rather than pulling from a provider API. That keeps the
 * report available for every configured provider at once (Stripe, Polar,
 * LemonSqueezy, Solidgate) and keeps the export deterministic and offline.
 */

export interface PaymentReportFilters {
	/** Inclusive lower bound on `subscriptions.created_at` (ISO date or datetime). */
	from?: string;
	/** Inclusive upper bound on `subscriptions.created_at` (ISO date or datetime). */
	to?: string;
	planId?: string;
	status?: string;
	provider?: string;
	search?: string;
}

export interface PaymentReportListParams extends PaymentReportFilters {
	page?: number;
	limit?: number;
}

export interface PaymentReportListResult {
	records: PaymentReportRecord[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

/**
 * Parse a caller-supplied date bound. Returns `null` for an absent value and
 * throws for a malformed one so the route can answer 400 rather than silently
 * dropping the filter (a dropped bound would widen the report, not narrow it).
 */
export function parseReportDate(value: string | undefined | null, boundary: 'from' | 'to'): Date | null {
	if (!value) return null;

	const trimmed = value.trim();
	if (!trimmed) return null;

	const parsed = new Date(trimmed);
	if (Number.isNaN(parsed.getTime())) {
		throw new Error(`Invalid ${boundary} date: ${value}`);
	}

	// A bare `YYYY-MM-DD` upper bound must include the whole day, otherwise a
	// report "to 2026-01-31" silently drops everything charged that day.
	if (boundary === 'to' && /^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
		parsed.setUTCHours(23, 59, 59, 999);
	}

	return parsed;
}

/**
 * Amount actually collected for a row, in MAJOR units — `subscriptions.amount*`
 * are written through `convertCentsToDecimal`, so they already are.
 *
 * `amount_paid = 0` is a real answer, not a missing one: a pending or failed
 * subscription has collected nothing. Falling back to the scheduled `amount`
 * there would book unpaid subscriptions as revenue and inflate every summary, so
 * the fallback fires only when `amount_paid` is genuinely NULL (a row written
 * before the column existed).
 */
/** Grouping key for every roll-up, so a NULL currency does not become its own bucket. */
const CURRENCY = sql<string>`coalesce(${subscriptions.currency}, 'usd')`;

const PAID_AMOUNT = sql<number>`coalesce(${subscriptions.amountPaid}, ${subscriptions.amount}, 0)`;

async function buildWhere(filters: PaymentReportFilters): Promise<SQL | undefined> {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');

	const conditions: SQL[] = [eq(subscriptions.tenantId, tenantId)];

	const from = parseReportDate(filters.from, 'from');
	if (from) conditions.push(gte(subscriptions.createdAt, from));

	const to = parseReportDate(filters.to, 'to');
	if (to) conditions.push(lte(subscriptions.createdAt, to));

	if (filters.planId) conditions.push(eq(subscriptions.planId, filters.planId));
	if (filters.status) conditions.push(eq(subscriptions.status, filters.status));
	if (filters.provider) conditions.push(eq(subscriptions.paymentProvider, filters.provider));

	const search = filters.search?.trim();
	if (search) {
		const term = `%${search}%`;
		const searchCondition = or(
			ilike(users.email, term),
			ilike(subscriptions.subscriptionId, term),
			ilike(subscriptions.invoiceId, term),
			ilike(subscriptions.customerId, term)
		);
		if (searchCondition) conditions.push(searchCondition);
	}

	return and(...conditions);
}

/** Columns the table and the export both project, so a CSV always matches the page. */
const RECORD_COLUMNS = {
	id: subscriptions.id,
	userId: subscriptions.userId,
	userEmail: users.email,
	planId: subscriptions.planId,
	status: subscriptions.status,
	paymentProvider: subscriptions.paymentProvider,
	subscriptionId: subscriptions.subscriptionId,
	invoiceId: subscriptions.invoiceId,
	amount: subscriptions.amount,
	amountPaid: subscriptions.amountPaid,
	amountDue: subscriptions.amountDue,
	currency: subscriptions.currency,
	interval: subscriptions.interval,
	startDate: subscriptions.startDate,
	endDate: subscriptions.endDate,
	cancelledAt: subscriptions.cancelledAt,
	createdAt: subscriptions.createdAt
} as const;

/** One page of records for an already-built `where`. */
function selectRecords(where: SQL | undefined, limit: number, offset: number): Promise<PaymentReportRecord[]> {
	return db
		.select(RECORD_COLUMNS)
		.from(subscriptions)
		.leftJoin(users, eq(subscriptions.userId, users.id))
		.where(where)
		.orderBy(desc(subscriptions.createdAt))
		.limit(limit)
		.offset(offset);
}

/** Paginated payment records matching the filters, newest first. */
export async function listPaymentRecords(params: PaymentReportListParams = {}): Promise<PaymentReportListResult> {
	const page = Math.max(1, params.page ?? 1);
	const limit = Math.min(200, Math.max(1, params.limit ?? 20));
	const offset = (page - 1) * limit;
	const where = await buildWhere(params);

	const records = await selectRecords(where, limit, offset);

	const [totalRow] = await db
		.select({ value: count() })
		.from(subscriptions)
		.leftJoin(users, eq(subscriptions.userId, users.id))
		.where(where);

	const total = totalRow?.value ?? 0;

	return {
		records,
		total,
		page,
		limit,
		totalPages: Math.max(1, Math.ceil(total / limit))
	};
}

/** How many records match the filters — used to refuse an over-cap export. */
export async function countPaymentRecords(filters: PaymentReportFilters = {}): Promise<number> {
	const where = await buildWhere(filters);

	const [row] = await db
		.select({ value: count() })
		.from(subscriptions)
		.leftJoin(users, eq(subscriptions.userId, users.id))
		.where(where);

	return row?.value ?? 0;
}

/**
 * Every record matching the filters, for the export path. Capped so a bad filter
 * can never stream an unbounded result set into memory; the export route checks
 * the count first and refuses rather than handing back a silently short file.
 */
export async function listAllPaymentRecords(
	filters: PaymentReportFilters,
	maxRows = 10_000
): Promise<PaymentReportRecord[]> {
	// One statement, not a paging loop: the cap belongs in the SQL `LIMIT`, so a
	// 10k-row export costs one round trip instead of fifty (each of which would
	// also have re-run the COUNT the paginated read needs and the export does not).
	// A cap of 0 means "no rows", not "one row": `Math.max(1, …)` here would break
	// the maximum-row contract the caller is relying on.
	if (maxRows <= 0) return [];

	const where = await buildWhere(filters);
	return await selectRecords(where, maxRows, 0);
}

/** Revenue roll-ups for the same filter set the list uses. */
export async function summarizePayments(filters: PaymentReportFilters = {}): Promise<PaymentReportSummary> {
	const where = await buildWhere(filters);

	const [byCurrency, byPlan, byProvider, byStatus] = await Promise.all([
		db
			.select({
				currency: CURRENCY,
				amount: sql<number>`coalesce(sum(${PAID_AMOUNT}), 0)`,
				transactions: count()
			})
			.from(subscriptions)
			.leftJoin(users, eq(subscriptions.userId, users.id))
			.where(where)
			.groupBy(CURRENCY),
		db
			.select({
				planId: subscriptions.planId,
				currency: CURRENCY,
				amount: sql<number>`coalesce(sum(${PAID_AMOUNT}), 0)`,
				transactions: count()
			})
			.from(subscriptions)
			.leftJoin(users, eq(subscriptions.userId, users.id))
			.where(where)
			.groupBy(subscriptions.planId, CURRENCY),
		db
			.select({
				provider: subscriptions.paymentProvider,
				currency: CURRENCY,
				amount: sql<number>`coalesce(sum(${PAID_AMOUNT}), 0)`,
				transactions: count()
			})
			.from(subscriptions)
			.leftJoin(users, eq(subscriptions.userId, users.id))
			.where(where)
			.groupBy(subscriptions.paymentProvider, CURRENCY),
		db
			.select({
				status: subscriptions.status,
				currency: CURRENCY,
				amount: sql<number>`coalesce(sum(${PAID_AMOUNT}), 0)`,
				transactions: count()
			})
			.from(subscriptions)
			.leftJoin(users, eq(subscriptions.userId, users.id))
			.where(where)
			.groupBy(subscriptions.status, CURRENCY)
	]);

	const toNumber = <T extends { amount: number; transactions: number }>(row: T): T => ({
		...row,
		amount: Number(row.amount ?? 0),
		transactions: Number(row.transactions ?? 0)
	});

	const totalsByCurrency = byCurrency.map(toNumber);

	return {
		transactions: totalsByCurrency.reduce((sum, row) => sum + row.transactions, 0),
		totalsByCurrency,
		byPlan: byPlan.map(toNumber),
		byProvider: byProvider.map(toNumber),
		byStatus: byStatus.map(toNumber)
	};
}
