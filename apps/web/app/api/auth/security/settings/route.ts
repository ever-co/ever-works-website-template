import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { users, sessions, clientProfiles } from '@/lib/db/schema';
import { eq, and, count, gt } from 'drizzle-orm';
import { getTenantId } from '@/lib/auth/tenant';
import { getTwoFactorAccountState } from '@/lib/auth/two-factor';

/**
 * @swagger
 * /api/auth/security/settings:
 *   get:
 *     tags: ["Authentication"]
 *     summary: "Get security settings"
 *     description: "Returns the authenticated user's security overview including 2FA status, password age, and active session count."
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: "Security settings"
 *       401:
 *         description: "Unauthorized"
 *       404:
 *         description: "User not found"
 *       500:
 *         description: "Internal server error"
 */
export async function GET() {
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

		const [user] = await db
			.select({ updatedAt: users.updatedAt, passwordHash: users.passwordHash, emailVerified: users.emailVerified })
			.from(users)
			.where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
			.limit(1);

		if (!user) {
			return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
		}

		const [profile] = await db
			.select({ twoFactorEnabled: clientProfiles.twoFactorEnabled })
			.from(clientProfiles)
			.where(and(eq(clientProfiles.userId, userId), eq(clientProfiles.tenantId, tenantId)))
			.limit(1);

		const [{ activeSessionsCount }] = await db
			.select({ activeSessionsCount: count() })
			.from(sessions)
			.where(and(eq(sessions.userId, userId), gt(sessions.expires, new Date())));

		// Spec 046: the 2FA card needs to know whether the toggle may be used at
		// all (EW-142), and `loginAttemptsCount` / `accountLocked` — previously
		// hardcoded to 0 / false while the overview rendered them as if real —
		// now carry the actual 2FA brute-force state (EW-141).
		const twoFactor = await getTwoFactorAccountState(userId, tenantId);

		return NextResponse.json({
			success: true,
			data: {
				emailVerified: !!user.emailVerified,
				twoFactorEnabled: profile?.twoFactorEnabled ?? false,
				lastPasswordChange: user.passwordHash ? user.updatedAt?.toISOString() ?? null : null,
				activeSessionsCount,
				loginAttemptsCount: twoFactor.failedAttempts,
				accountLocked: twoFactor.locked,
				accountLockedUntil: twoFactor.lockedUntil?.toISOString() ?? null,
				canEnableTwoFactor: twoFactor.canEnableTwoFactor,
				authMethod: twoFactor.authMethod,
				passwordExpiresAt: null
			}
		});
	} catch (error) {
		console.error('Security settings error:', error);
		return NextResponse.json(
			{ success: false, error: 'Internal server error. Please try again later.' },
			{ status: 500 }
		);
	}
}
