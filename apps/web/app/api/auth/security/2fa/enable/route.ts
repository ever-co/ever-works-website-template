import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getTenantId } from '@/lib/auth/tenant';
import { getTwoFactorAccountState, setTwoFactorEnabled } from '@/lib/auth/two-factor';
import { isEmailServiceConfigured } from '@/lib/mail';
import { logActivity } from '@/lib/db/queries/activity.queries';
import { ActivityType } from '@/lib/db/schema';

/**
 * Message shown to OAuth-only users, in the UI and here (EW-142).
 * Duplicated as the localised `settings.SECURITY_PAGE.TWO_FACTOR.OAUTH_BLOCKED`
 * key; this copy is the fallback for API consumers with no locale.
 */
export const OAUTH_ACCOUNT_MESSAGE = 'You cannot set up two-factor authentication because you signed up with OAuth.';

/**
 * @swagger
 * /api/auth/security/2fa/enable:
 *   post:
 *     tags: ["Authentication"]
 *     summary: "Enable email two-factor authentication"
 *     description: "Turns on email 2FA for the authenticated user. Allowed only for accounts registered with email and password; OAuth-only accounts are refused with 403 and code OAUTH_ACCOUNT."
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: "Two-factor authentication enabled"
 *       401:
 *         description: "Unauthorized"
 *       403:
 *         description: "Tenant not found, or the account signed up with OAuth"
 *       404:
 *         description: "Client profile not found"
 *       503:
 *         description: "Email delivery is not configured, so codes could never be sent"
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

		// EW-142: the backend half of the OAuth restriction. The UI greys the
		// toggle out, but the guard must hold for a hand-crafted request too —
		// an OAuth-only account has no password, so a second factor on top of
		// one would be unsatisfiable.
		if (!state.canEnableTwoFactor) {
			return NextResponse.json(
				{ success: false, error: OAUTH_ACCOUNT_MESSAGE, code: 'OAUTH_ACCOUNT' },
				{ status: 403 }
			);
		}

		// Guard against the most complete way to lock yourself out: turning on a
		// factor delivered by email on a deployment where no mail provider is
		// configured. Every future sign-in would then ask for a code that can
		// never arrive. Refuse the setting rather than accept one we cannot
		// honour.
		if (!(await isEmailServiceConfigured())) {
			return NextResponse.json(
				{
					success: false,
					error: 'Email delivery is not configured for this site, so two-factor codes cannot be sent.',
					code: 'EMAIL_NOT_CONFIGURED'
				},
				{ status: 503 }
			);
		}

		const updated = await setTwoFactorEnabled(userId, tenantId, true);
		if (!updated) {
			return NextResponse.json({ success: false, error: 'Client profile not found' }, { status: 404 });
		}

		void logActivity(ActivityType.TWO_FACTOR_ENABLED, userId, 'user', undefined, tenantId).catch(() => {});

		return NextResponse.json({ success: true, data: { twoFactorEnabled: true } });
	} catch (error) {
		console.error('Enable two-factor error:', error);
		return NextResponse.json(
			{ success: false, error: 'Internal server error. Please try again later.' },
			{ status: 500 }
		);
	}
}
