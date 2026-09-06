import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { summarizePaymentRecords, type PaymentReportRecord } from '../payment-report-summary';

/**
 * Spec 052 / EW-117 — the export's in-memory revenue roll-up.
 *
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * `GET /api/admin/payment-reports/export` reads its rows ONCE and computes the
 * file's summary from that same array, so the file can never total rows it does
 * not contain. That moved the roll-up out of SQL and into TypeScript, and these
 * cases pin the two things the SQL was carrying implicitly:
 *
 *   - `coalesce(amount_paid, amount, 0)` — a COLLECTED amount of 0 is a real
 *     answer for a pending or failed subscription. `||` instead of `??` here
 *     would fall through to the scheduled `amount` and book money nobody paid.
 *   - `coalesce(currency, 'usd')` as part of every grouping key — the roll-ups
 *     are per (value, currency), never one bucket per plan, because adding yen
 *     to dollars produces a number with no honest label.
 *
 * `payment-report-summary.ts` has no runtime imports at all, which is what makes
 * this file possible: the queries module next to it reaches `server-only` through
 * the config service and throws on import outside a Next server context.
 */

const BASE: PaymentReportRecord = {
	id: 'sub_1',
	userId: 'user_1',
	userEmail: 'a@example.com',
	planId: 'pro',
	status: 'active',
	paymentProvider: 'stripe',
	subscriptionId: 'sub_provider_1',
	invoiceId: 'in_1',
	amount: 10,
	amountPaid: 10,
	amountDue: 0,
	currency: 'usd',
	interval: 'month',
	startDate: null,
	endDate: null,
	cancelledAt: null,
	createdAt: new Date('2026-01-01T00:00:00.000Z')
};

const record = (overrides: Partial<PaymentReportRecord>): PaymentReportRecord => ({ ...BASE, ...overrides });

describe('summarizePaymentRecords', () => {
	it('CONTROL: an empty report has no rows and no transactions', () => {
		const summary = summarizePaymentRecords([]);

		assert.equal(summary.transactions, 0);
		assert.deepEqual(summary.totalsByCurrency, []);
		assert.deepEqual(summary.byPlan, []);
		assert.deepEqual(summary.byProvider, []);
		assert.deepEqual(summary.byStatus, []);
	});

	it('CONTROL: counts every record once and totals what was collected', () => {
		const summary = summarizePaymentRecords([
			record({ id: 'a', amountPaid: 10 }),
			record({ id: 'b', amountPaid: 15 })
		]);

		assert.equal(summary.transactions, 2);
		assert.deepEqual(summary.totalsByCurrency, [{ currency: 'usd', transactions: 2, amount: 25 }]);
	});

	it('does NOT book an unpaid subscription as revenue when amountPaid is 0', () => {
		// The regression this guards: `record.amountPaid || record.amount` reads a
		// collected 0 as "missing" and falls through to the SCHEDULED amount, so a
		// pending subscription that has paid nothing lands in the report as 99.
		const summary = summarizePaymentRecords([
			record({ id: 'paid', amountPaid: 10, amount: 10 }),
			record({ id: 'pending', status: 'pending', amountPaid: 0, amount: 99 })
		]);

		assert.deepEqual(summary.totalsByCurrency, [{ currency: 'usd', transactions: 2, amount: 10 }]);
		assert.deepEqual(
			summary.byStatus.find((row) => row.status === 'pending'),
			{ status: 'pending', currency: 'usd', transactions: 1, amount: 0 }
		);
	});

	it('falls back to the scheduled amount only when amountPaid is genuinely NULL', () => {
		// A row written before `amount_paid` existed. Distinct from the case above:
		// here there is no collected figure at all, so `amount` is the best answer.
		const summary = summarizePaymentRecords([record({ amountPaid: null, amount: 7 })]);

		assert.deepEqual(summary.totalsByCurrency, [{ currency: 'usd', transactions: 1, amount: 7 }]);
	});

	it('treats a NULL currency as usd rather than its own bucket', () => {
		const summary = summarizePaymentRecords([
			record({ id: 'a', currency: 'usd', amountPaid: 4 }),
			record({ id: 'b', currency: null, amountPaid: 6 })
		]);

		assert.deepEqual(summary.totalsByCurrency, [{ currency: 'usd', transactions: 2, amount: 10 }]);
	});

	it('groups by (value, currency), so one plan sold in two currencies is two rows', () => {
		// This is why the Plans / Providers cards on the report page count a Set of
		// plan ids rather than `byPlan.length` — the row count is not the plan count.
		const summary = summarizePaymentRecords([
			record({ id: 'a', planId: 'pro', currency: 'usd', amountPaid: 10 }),
			record({ id: 'b', planId: 'pro', currency: 'eur', amountPaid: 20 })
		]);

		assert.deepEqual(summary.byPlan, [
			{ planId: 'pro', currency: 'usd', transactions: 1, amount: 10 },
			{ planId: 'pro', currency: 'eur', transactions: 1, amount: 20 }
		]);
		assert.equal(new Set(summary.byPlan.map((row) => row.planId)).size, 1);
	});

	it('splits providers and statuses per currency too', () => {
		const summary = summarizePaymentRecords([
			record({ id: 'a', paymentProvider: 'stripe', status: 'active', currency: 'usd', amountPaid: 10 }),
			record({ id: 'b', paymentProvider: 'polar', status: 'active', currency: 'usd', amountPaid: 5 }),
			record({ id: 'c', paymentProvider: 'stripe', status: 'cancelled', currency: 'eur', amountPaid: 3 })
		]);

		assert.deepEqual(summary.byProvider, [
			{ provider: 'stripe', currency: 'usd', transactions: 1, amount: 10 },
			{ provider: 'polar', currency: 'usd', transactions: 1, amount: 5 },
			{ provider: 'stripe', currency: 'eur', transactions: 1, amount: 3 }
		]);
		assert.deepEqual(summary.byStatus, [
			{ status: 'active', currency: 'usd', transactions: 2, amount: 15 },
			{ status: 'cancelled', currency: 'eur', transactions: 1, amount: 3 }
		]);
	});

	it('keeps the transaction count equal to the number of exported rows', () => {
		// The whole point of computing the summary from the exported array: the two
		// can never describe different sets.
		const records = [
			record({ id: 'a', currency: 'usd' }),
			record({ id: 'b', currency: 'eur' }),
			record({ id: 'c', currency: 'jpy' })
		];
		const summary = summarizePaymentRecords(records);

		assert.equal(summary.transactions, records.length);
		assert.equal(
			summary.totalsByCurrency.reduce((sum, row) => sum + row.transactions, 0),
			records.length
		);
	});
});
