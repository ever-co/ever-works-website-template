import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getTenantId } from '@/lib/auth/tenant';
import { getTwoFactorAccountState, setTwoFactorEnabled } from '@/lib/auth/two-factor';
import { logActivity } from '@/lib/db/queries/activity.queries';
import { ActivityType } from '@/lib/db/schema';

/**
 * @swagger
 * /api/auth/security/2fa/disable:
 *   post:
 *     tags: ["Authentication"]
 *     summary: "Disable email two-factor authentication"
 *     description: "Turns off email 2FA for the authenticated user and discards any pending verification code and lockout state."
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: "Two-factor authentication disabled"
 *       401:
 *         description: "Unauthorized"
 *       403:
 *         description: "Tenant not found"
 *       404:
 *         description: "Client profile not found"
 *       500:
 *         description: "Internal server error"
 */
export async function POST() {
	try {
		const session = await auth();
		if (!session?.user?.id) {
			return NextResponse.json({ success: false, error: 'Unauthorized. Please sign in.' }, { status: 401 });
		}

		const tenantId = await getTenantId();
		if (!tenantId) {
			return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 403 });
		}

		const userId = session.user.id;
		const state = await getTwoFactorAccountState(userId, tenantId);

		if (!state.clientProfileId) {
			return NextResponse.json({ success: false, error: 'Client profile not found' }, { status: 404 });
		}

		// Deliberately no OAuth guard here: turning a factor OFF must always be
		// possible for the account that owns it, whatever it signed up with.
		const updated = await setTwoFactorEnabled(userId, tenantId, false);
		if (!updated) {
			return NextResponse.json({ success: false, error: 'Client profile not found' }, { status: 404 });
		}

		void logActivity(ActivityType.TWO_FACTOR_DISABLED, userId, 'user', undefined, tenantId).catch(() => {});

		return NextResponse.json({ success: true, data: { twoFactorEnabled: false } });
	} catch (error) {
		console.error('Disable two-factor error:', error);
		return NextResponse.json(
			{ success: false, error: 'Internal server error. Please try again later.' },
			{ status: 500 }
		);
	}
}
