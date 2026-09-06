/**
 * Payment-report roll-ups (Spec 052).
 *
 * Deliberately its OWN module, with no runtime imports at all.
 *
 * `payment-report.queries.ts` reaches `@/lib/auth/tenant`, which pulls in
 * `server-only` through the config service, so importing it outside a Next server
 * context throws before a single assertion runs. A calculation over money that
 * leaves the site in a file a stakeholder acts on should not be untestable because
 * of what its neighbours import — so the pure part lives here and the queries
 * module re-exports it, leaving every existing import path unchanged.
 *
 * Covered by `__tests__/payment-report-summary.spec.ts`
 * (`pnpm --filter @ever-works/web test:unit`).
 */

export interface PaymentReportRecord {
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
	startDate: Date | null;
	endDate: Date | null;
	cancelledAt: Date | null;
	createdAt: Date;
}

/**
 * Revenue roll-ups. Every row carries its own currency and every amount is in
 * MAJOR units, matching what `subscriptions` stores.
 *
 * Currency is part of the grouping key, not a label chosen afterwards: a site
 * charging in more than one currency would otherwise get one number that adds
 * yen to dollars, and a UI with no honest way to label it.
 */
export interface PaymentReportSummary {
	transactions: number;
	totalsByCurrency: Array<{ currency: string; amount: number; transactions: number }>;
	byPlan: Array<{ planId: string; currency: string; transactions: number; amount: number }>;
	byProvider: Array<{ provider: string; currency: string; transactions: number; amount: number }>;
	byStatus: Array<{ status: string; currency: string; transactions: number; amount: number }>;
}

/**
 * The same revenue roll-ups as `summarizePayments`, computed from records already
 * in hand instead of from four more aggregate queries.
 *
 * This exists for the export path, where the rows and their summary MUST describe
 * the same set. Counting in SQL after reading the rows leaves a window in which a
 * payment written between the two statements lands in the summary but not in the
 * file — a stakeholder then receives totals that do not add up to the rows printed
 * beneath them, with nothing on the page to reveal it.
 *
 * The grouping is deliberately identical to the SQL above, coalesce for coalesce:
 * `coalesce(currency, 'usd')` for the key, `coalesce(amount_paid, amount, 0)` for
 * the money. `amount_paid = 0` stays a real answer — only a genuine NULL falls back
 * to the scheduled `amount` — so a pending subscription is not booked as revenue
 * here either. Group order follows first appearance in `records`, which is the
 * report's own newest-first order, so an export is byte-stable for a stable input.
 */
export function summarizePaymentRecords(records: PaymentReportRecord[]): PaymentReportSummary {
	interface Bucket {
		value: string;
		currency: string;
		transactions: number;
		amount: number;
	}

	/** Accumulate one `(value, currency)` group, preserving first-seen order. */
	const accumulate = (into: Map<string, Bucket>, value: string, currency: string, amount: number): void => {
		const id = `${value} ${currency}`;
		const row = into.get(id) ?? { value, currency, transactions: 0, amount: 0 };
		row.transactions += 1;
		row.amount += amount;
		into.set(id, row);
	};

	const currencies = new Map<string, Bucket>();
	const plans = new Map<string, Bucket>();
	const providers = new Map<string, Bucket>();
	const statuses = new Map<string, Bucket>();

	for (const record of records) {
		const currency = record.currency ?? 'usd';
		// `??`, not `||`: a collected amount of 0 is a real answer, and `||` would
		// fall through to the scheduled `amount` and book an unpaid row as revenue.
		const amount = record.amountPaid ?? record.amount ?? 0;

		accumulate(currencies, currency, currency, amount);
		accumulate(plans, record.planId, currency, amount);
		accumulate(providers, record.paymentProvider, currency, amount);
		accumulate(statuses, record.status, currency, amount);
	}

	return {
		transactions: records.length,
		totalsByCurrency: Array.from(currencies.values(), (row) => ({
			currency: row.currency,
			transactions: row.transactions,
			amount: row.amount
		})),
		byPlan: Array.from(plans.values(), (row) => ({
			planId: row.value,
			currency: row.currency,
			transactions: row.transactions,
			amount: row.amount
		})),
		byProvider: Array.from(providers.values(), (row) => ({
			provider: row.value,
			currency: row.currency,
			transactions: row.transactions,
			amount: row.amount
		})),
		byStatus: Array.from(statuses.values(), (row) => ({
			status: row.value,
			currency: row.currency,
			transactions: row.transactions,
			amount: row.amount
		}))
	};
}
