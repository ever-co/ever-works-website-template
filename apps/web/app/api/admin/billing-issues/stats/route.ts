import { checkAdminAuth } from '@/lib/auth/admin-guard';
import { checkDatabaseAvailability } from '@/lib/utils/database-check';
import { safeErrorResponse } from '@/lib/utils/api-error';
import { getBillingIssueStats } from '@/lib/db/queries/billing-issue.queries';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * @swagger
 * /api/admin/billing-issues/stats:
 *   get:
 *     tags: ["Admin - Billing Issues"]
 *     summary: "Billing issue counters"
 *     description: "Counts by status / type / provider plus the total amount still at risk (open + in review), for the admin page's tabs and stat cards. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200: { description: "Stats retrieved successfully" }
 *       401: { description: "Unauthorized" }
 *       403: { description: "Forbidden - Admin access required" }
 *       500: { description: "Internal server error" }
 */
export async function GET() {
	try {
		const dbCheck = checkDatabaseAvailability();
		if (dbCheck) return dbCheck;

		const authError = await checkAdminAuth();
		if (authError) return authError;

		const stats = await getBillingIssueStats();
		return NextResponse.json({ success: true, data: stats });
	} catch (error) {
		return safeErrorResponse(error, 'Failed to load billing issue stats');
	}
}
