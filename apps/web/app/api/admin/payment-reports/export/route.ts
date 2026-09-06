import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/admin-guard';
import { checkDatabaseAvailability } from '@/lib/utils/database-check';
import { safeErrorResponse } from '@/lib/utils/api-error';
import {
	countPaymentRecords,
	listAllPaymentRecords,
	summarizePaymentRecords
} from '@/lib/db/queries/payment-report.queries';
import { parsePaymentReportFilters } from '@/lib/services/payment-report-filters';
import {
	SUPPORTED_EXPORT_FORMATS,
	exportPaymentReport,
	isSupportedExportFormat
} from '@/lib/services/payment-report-export.service';
import { logActivity } from '@/lib/db/queries/activity.queries';
import { ActivityType } from '@/lib/db/schema';

export const runtime = 'nodejs';

/** Rows one export may contain. Matched by the query cap so the two cannot drift. */
const MAX_EXPORT_ROWS = 10_000;

/**
 * @swagger
 * /api/admin/payment-reports/export:
 *   get:
 *     tags: ["Admin - Payment Reports"]
 *     summary: "Export the payment report as a file"
 *     description: "Streams the filtered payment report as a CSV or XLSX attachment. The filters are parsed by exactly the same validator the JSON view uses, so the file always matches the table it was exported from. PDF is not offered: the repository carries no PDF generation dependency — see docs/questions.md. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "format"
 *         in: "query"
 *         schema: { type: string, enum: ["csv", "xlsx"], default: "csv" }
 *       - name: "from"
 *         in: "query"
 *         schema: { type: string, format: date }
 *       - name: "to"
 *         in: "query"
 *         schema: { type: string, format: date }
 *       - name: "planId"
 *         in: "query"
 *         schema: { type: string }
 *       - name: "status"
 *         in: "query"
 *         schema: { type: string, enum: ["active", "cancelled", "expired", "pending", "paused"] }
 *       - name: "provider"
 *         in: "query"
 *         schema: { type: string, enum: ["stripe", "solidgate", "lemonsqueezy", "polar"] }
 *       - name: "search"
 *         in: "query"
 *         schema: { type: string }
 *     responses:
 *       200: { description: "The report file" }
 *       400: { description: "Bad request - unsupported format, invalid filter, or more matching records than the export limit" }
 *       401: { description: "Unauthorized" }
 *       403: { description: "Forbidden - Admin access required" }
 *       500: { description: "Internal server error" }
 */
export async function GET(request: Request) {
	try {
		const dbCheck = checkDatabaseAvailability();
		if (dbCheck) return dbCheck;

		const authResult = await requireAdminSession();
		if (authResult instanceof NextResponse) return authResult;
		const { session } = authResult;

		const { searchParams } = new URL(request.url);

		const requestedFormat = (searchParams.get('format') || 'csv').trim().toLowerCase();
		if (!isSupportedExportFormat(requestedFormat)) {
			return NextResponse.json(
				{
					success: false,
					error: `Unsupported format "${requestedFormat}". Supported formats: ${SUPPORTED_EXPORT_FORMATS.join(', ')}.`
				},
				{ status: 400 }
			);
		}

		const parsed = parsePaymentReportFilters(searchParams);
		if ('error' in parsed) {
			return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
		}

		// ONE read decides everything this response contains: the rows, the summary
		// computed from those same rows, and whether the filter is over the cap.
		//
		// The earlier shape ran a COUNT, then a capped read, then a separate SQL
		// summary — three statements against a table that is still being written to.
		// A payment inserted after the COUNT could push the set past the cap, and the
		// caller received a file truncated at exactly 10,000 rows whose summary sheet
		// totalled every matching row, including the ones missing from the file. There
		// is nothing in that file to reveal the discrepancy.
		//
		// Reading `MAX_EXPORT_ROWS + 1` is what makes "more than the cap" observable
		// without a second statement: the extra row is never exported, it only proves
		// the overflow.
		const records = await listAllPaymentRecords(parsed.filters, MAX_EXPORT_ROWS + 1);

		if (records.length > MAX_EXPORT_ROWS) {
			// Refuse rather than truncate. A silently short file whose summary counts
			// rows it does not contain is the worst possible answer for a report a
			// stakeholder will act on, so an over-cap export is a 400 telling the admin
			// to narrow it. The exact number is worth one extra query on a path that
			// already refuses — it costs nothing on the successful path.
			const matching = await countPaymentRecords(parsed.filters);
			return NextResponse.json(
				{
					success: false,
					error: `This filter matches ${matching} records, more than the ${MAX_EXPORT_ROWS}-row export limit. Narrow the date range or add a filter.`
				},
				{ status: 400 }
			);
		}

		const summary = summarizePaymentRecords(records);

		const result = await exportPaymentReport(requestedFormat, records, summary);

		// Exports leave the site with customer data in them, so the download is
		// recorded like every other admin mutation. Never allowed to fail the export.
		try {
			await logActivity(ActivityType.ADMIN_PAYMENT_REPORT_EXPORTED, session.user.id, 'user');
		} catch (error) {
			console.error('[PaymentReportExport] Failed to write the admin activity log entry:', error);
		}

		const body = typeof result.data === 'string' ? result.data : new Uint8Array(result.data);

		return new NextResponse(body, {
			headers: {
				'Content-Type': result.contentType,
				'Content-Disposition': `attachment; filename="${result.filename}"`,
				'Cache-Control': 'no-store'
			}
		});
	} catch (error) {
		return safeErrorResponse(error, 'Failed to export the payment report');
	}
}
