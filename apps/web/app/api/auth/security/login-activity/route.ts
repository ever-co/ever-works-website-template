import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { activityLogs, ActivityType } from '@/lib/db/schema';
import { eq, and, or, inArray, desc, count } from 'drizzle-orm';
import { getTenantId } from '@/lib/auth/tenant';

const SECURITY_ACTIONS: ActivityType[] = [
	ActivityType.SIGN_IN,
	ActivityType.SIGN_OUT,
	ActivityType.UPDATE_PASSWORD,
	ActivityType.VERIFY_EMAIL,
	// Spec 046: turning email 2FA on or off, and the brute-force lockout, are
	// security events the account owner must be able to see here — logging them
	// without listing them would leave an audit trail nobody can read.
	ActivityType.TWO_FACTOR_ENABLED,
	ActivityType.TWO_FACTOR_DISABLED,
	ActivityType.TWO_FACTOR_LOCKED,
];

/**
 * @swagger
 * /api/auth/security/login-activity:
 *   get:
 *     tags: ["Authentication"]
 *     summary: "Get login activity history"
 *     description: "Returns a paginated list of security-relevant activity logs for the authenticated user."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: "Activity list with pagination"
 *       401:
 *         description: "Unauthorized"
 */
export async function GET(req: NextRequest) {
	try {
		const session = await auth();
		if (!session?.user?.id) {
			return NextResponse.json({ success: false, error: 'Unauthorized. Please sign in.' }, { status: 401 });
		}

		const tenantId = await getTenantId();
		if (!tenantId) {
			return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 403 });
		}

		const { searchParams } = new URL(req.url);
		const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
		const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '10', 10)));
		const offset = (page - 1) * limit;

		const userId = session.user.id;
		const clientProfileId = (session as any).user?.clientProfileId as string | undefined;

		// Client sign-ins are logged against clientId, not userId — match both.
		const ownerFilter = clientProfileId
			? or(eq(activityLogs.userId, userId), eq(activityLogs.clientId, clientProfileId))
			: eq(activityLogs.userId, userId);

		const baseWhere = and(ownerFilter, eq(activityLogs.tenantId, tenantId), inArray(activityLogs.action, SECURITY_ACTIONS));

		const [rows, [{ total }]] = await Promise.all([
			db
				.select({
					id: activityLogs.id,
					action: activityLogs.action,
					timestamp: activityLogs.timestamp,
					ipAddress: activityLogs.ipAddress,
				})
				.from(activityLogs)
				.where(baseWhere)
				.orderBy(desc(activityLogs.timestamp))
				.limit(limit)
				.offset(offset),

			db
				.select({ total: count() })
				.from(activityLogs)
				.where(baseWhere),
		]);

		const activities = rows.map((row) => ({
			id: row.id,
			action: row.action,
			timestamp: row.timestamp instanceof Date ? row.timestamp.toISOString() : row.timestamp,
			ipAddress: row.ipAddress || null,
			success: true,
		}));

		return NextResponse.json({
			success: true,
			data: {
				activities,
				pagination: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
				},
			},
		});
	} catch (error) {
		console.error('Login activity error:', error);
		return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
	}
}
