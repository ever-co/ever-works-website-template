import { SubscriptionStatus } from '@/lib/db/schema';
import { PaymentPlan, PaymentProvider } from '@/lib/constants/payment';
import { parseReportDate, type PaymentReportFilters } from '@/lib/db/queries/payment-report.queries';

/**
 * Filter parsing shared by `GET /api/admin/payment-reports` and
 * `GET /api/admin/payment-reports/export` (Spec 052).
 *
 * It lives outside both route files on purpose: a Next.js `route.ts` may only
 * export route handlers and route config, and an exported and re-imported
 * validator is the only way the JSON view and the export can be guaranteed to
 * interpret the same query string identically. A divergence there would hand a
 * stakeholder a CSV that does not match the table it was exported from.
 */

export const VALID_REPORT_STATUSES = Object.values(SubscriptionStatus) as string[];
export const VALID_REPORT_PROVIDERS = Object.values(PaymentProvider) as string[];
export const VALID_REPORT_PLANS = Object.values(PaymentPlan) as string[];

/**
 * Accept a date only if it is real.
 *
 * `new Date('2026-02-30')` does NOT fail — it rolls over to 2 March — so a plain
 * `isNaN` check would silently shift the report window past the range the admin
 * asked for and hand them numbers for days they did not select. A date-only value
 * is therefore matched against the ISO shape and its calendar components are
 * compared back against the parsed date.
 */
export function isValidReportDate(value: string): boolean {
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return false;

	// The calendar triple is validated on its OWN, not by comparing the parsed date
	// back to the string. Comparing the parsed value would wrongly reject a legal
	// offset datetime like `2026-01-01T23:00:00-05:00`, which is genuinely 2 January
	// in UTC. Round-tripping the triple through `Date.UTC` catches exactly the case
	// that matters: `2026-02-30` becomes 2 March and no longer matches its own day.
	// A datetime is checked the same way, so the shift is not reachable by adding a
	// time component.
	const calendar = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
	if (calendar) {
		const [, year, month, day] = calendar;
		const probe = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
		return (
			probe.getUTCFullYear() === Number(year) &&
			probe.getUTCMonth() + 1 === Number(month) &&
			probe.getUTCDate() === Number(day)
		);
	}

	return true;
}

export type ParsedPaymentReportFilters = { filters: PaymentReportFilters } | { error: string };

export function parsePaymentReportFilters(searchParams: URLSearchParams): ParsedPaymentReportFilters {
	const from = (searchParams.get('from') || '').trim();
	const to = (searchParams.get('to') || '').trim();
	const planId = (searchParams.get('planId') || '').trim();
	const status = (searchParams.get('status') || '').trim();
	const provider = (searchParams.get('provider') || '').trim();
	const search = (searchParams.get('search') || '').trim();

	if (from && !isValidReportDate(from)) {
		return { error: 'Invalid from date. Use an ISO date such as 2026-01-01.' };
	}

	if (to && !isValidReportDate(to)) {
		return { error: 'Invalid to date. Use an ISO date such as 2026-01-31.' };
	}

	// Compare the bounds the QUERY will actually use. A bare `to` covers the whole
	// day, so `from=2026-01-01T10:00:00Z&to=2026-01-01` is a valid same-day range —
	// comparing the raw strings would reject it as inverted.
	if (from && to) {
		const fromBound = parseReportDate(from, 'from');
		const toBound = parseReportDate(to, 'to');
		if (fromBound && toBound && fromBound.getTime() > toBound.getTime()) {
			return { error: 'The from date must not be later than the to date.' };
		}
	}

	// `plan_id` is free-form on the subscriptions table (a Work may define its own
	// plans), so an unknown value stays a legitimate filter. A value that differs
	// from a known plan only by case is a typo worth rejecting, because it would
	// otherwise silently return an empty report.
	if (planId && !VALID_REPORT_PLANS.includes(planId) && VALID_REPORT_PLANS.includes(planId.toLowerCase())) {
		return { error: `Invalid plan. Must be one of: ${VALID_REPORT_PLANS.join(', ')}` };
	}

	if (status && !VALID_REPORT_STATUSES.includes(status)) {
		return { error: `Invalid status. Must be one of: ${VALID_REPORT_STATUSES.join(', ')}` };
	}

	if (provider && !VALID_REPORT_PROVIDERS.includes(provider)) {
		return { error: `Invalid provider. Must be one of: ${VALID_REPORT_PROVIDERS.join(', ')}` };
	}

	return {
		filters: {
			from: from || undefined,
			to: to || undefined,
			planId: planId || undefined,
			status: status || undefined,
			provider: provider || undefined,
			search: search || undefined
		}
	};
}
