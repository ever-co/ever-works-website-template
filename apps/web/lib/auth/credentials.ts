import Credentials from 'next-auth/providers/credentials';
import {
	getUserByEmail,
	logActivity,
	getClientAccountByEmail,
	verifyClientPassword,
	getClientProfileByUserId,
	isUserAdmin
} from '../db/queries';
import { ActivityType } from '../db/schema';
import { AuthErrorCode } from './auth-error-codes';
import { issueTwoFactorCode, verifyTwoFactorCode } from './two-factor';

// Re-export AuthErrorCode for backwards compatibility
export { AuthErrorCode } from './auth-error-codes';

const SALT_ROUNDS = 10;

// Dynamic import to avoid bundling bcryptjs in Edge Runtime
async function getBcrypt() {
	const bcryptjs = await import('bcryptjs');
	return bcryptjs;
}

export enum AuthProviders {
	CREDENTIALS = 'credentials',
	GOOGLE = 'google',
	FACEBOOK = 'facebook',
	GITHUB = 'github',
	TWITTER = 'twitter',
	X = 'x',
	MICROSOFT = 'microsoft'
}

export async function hashPassword(password: string) {
	const { hash } = await getBcrypt();
	return hash(password, SALT_ROUNDS);
}

export async function comparePasswords(plainTextPassword: string, hashedPassword: string | null) {
	if (!hashedPassword) {
		return false;
	}
	const { compare } = await getBcrypt();
	return compare(plainTextPassword, hashedPassword);
}

/**
 * NextAuth credentials provider for the email+password sign-in flow.
 *
 * Sign-in precedence: **admin account first, then client account.**
 * If the same email maps to both roles in the DB, admin login wins.
 *
 * **User-enumeration trade-off** worth flagging: the `authorize`
 * callback distinguishes three error cases (`ACCOUNT_NOT_FOUND`,
 * `INVALID_PASSWORD`, `PROFILE_NOT_FOUND`) instead of returning a
 * single generic "invalid credentials" error. This gives clearer UX
 * messages ("no account with this email" vs "wrong password") but
 * lets an attacker iterate emails through the sign-in form and
 * confirm which ones are registered. If user-enumeration resistance
 * matters more than the UX clarity, collapse all three into one
 * `INVALID_CREDENTIALS` error and harmonise the response timing too
 * (a constant-time check across both paths so the response delay
 * doesn't leak whether bcrypt was actually called).
 *
 * Dynamic `bcryptjs` import (see `getBcrypt` above) keeps the heavy
 * native-ish dep out of the Edge runtime bundle.
 *
 * Side-effect audit logging via `logActivity` is fire-and-forget
 * (`.catch(() => {})`) so a logging hiccup doesn't fail the
 * sign-in — at the cost of silently losing those audit rows.
 */
export const credentialsProvider = Credentials({
	name: AuthProviders.CREDENTIALS,
	credentials: {
		email: { type: 'email' },
		password: { type: 'password' },
		// Email 2FA second factor (EW-139). Absent on the first submit; the
		// sign-in form re-submits with it once the user has the emailed code.
		code: { type: 'text' }
	},
	authorize: async (credentials) => {
		try {
			const email = credentials.email as string;
			const password = credentials.password as string;
			const twoFactorCode = typeof credentials.code === 'string' ? credentials.code.trim() : '';

			// Check admin user first via role-based check
			const foundUser = await getUserByEmail(email);
			const isAdmin = foundUser ? await isUserAdmin(foundUser.id) : false;

			if (isAdmin && foundUser && foundUser.passwordHash) {
				const isPasswordValid = await comparePasswords(password, foundUser.passwordHash);

				if (isPasswordValid) {
					void logActivity(ActivityType.SIGN_IN, foundUser.id, 'user', undefined, foundUser.tenantId || undefined).catch(() => {});

					return {
						...foundUser,
						tenantId: foundUser.tenantId ?? undefined,
						isClient: false,
						isAdmin: true
					};
				}
				// Admin user found but password is invalid
				throw new Error(AuthErrorCode.INVALID_PASSWORD);
			}

			// Check client account
			const clientAccount = await getClientAccountByEmail(email);

			if (clientAccount) {
				const isClientPasswordValid = await verifyClientPassword(email, password);

				if (isClientPasswordValid) {
					const clientProfile = await getClientProfileByUserId(clientAccount.userId);
					if (!clientProfile) {
						throw new Error(AuthErrorCode.PROFILE_NOT_FOUND);
					}

					// ── Email two-factor gate (EW-139) ────────────────────────────
					// This is the AUTHORITATIVE check: `authorize` is the only place
					// a session is minted, so anything that skips the sign-in server
					// action (a direct `signIn('credentials', …)` call, a scripted
					// POST) still has to satisfy it. The password being correct is
					// explicitly not enough past this point.
					if (clientProfile.twoFactorEnabled) {
						if (!twoFactorCode) {
							// First leg: mint + email a code, then stop. No session.
							const issued = await issueTwoFactorCode({
								userId: clientProfile.userId,
								email: clientProfile.email,
								tenantId: clientProfile.tenantId,
								userName: clientProfile.displayName || clientProfile.name
							});
							throw new Error(
								issued.throttled
									? AuthErrorCode.RATE_LIMITED
									: issued.emailSent
										? AuthErrorCode.TWO_FACTOR_REQUIRED
										: AuthErrorCode.TWO_FACTOR_SEND_FAILED
							);
						}

						const verification = await verifyTwoFactorCode(clientProfile.userId, twoFactorCode, {
							tenantId: clientProfile.tenantId
						});

						if (!verification.ok) {
							switch (verification.reason) {
								case 'locked':
									throw new Error(AuthErrorCode.TWO_FACTOR_LOCKED);
								case 'expired':
									throw new Error(AuthErrorCode.TWO_FACTOR_EXPIRED);
								case 'not_found':
									// No live code (never issued, already consumed, or
									// rotated away) — same remedy as an expired one:
									// ask for a fresh code.
									throw new Error(AuthErrorCode.TWO_FACTOR_EXPIRED);
								default:
									throw new Error(AuthErrorCode.TWO_FACTOR_INVALID);
							}
						}
					}

					const clientUser = {
						id: clientProfile.userId,
						clientProfileId: clientProfile.id,
						name: clientProfile.name || clientProfile.displayName,
						email: clientProfile.email,
						image: null,
						isClient: true,
						isAdmin: false
					};
					void logActivity(ActivityType.SIGN_IN, clientProfile.id, 'client', undefined, clientProfile.tenantId || undefined).catch(() => {});
					return clientUser;
				}
				// Client account found but password is invalid
				throw new Error(AuthErrorCode.INVALID_PASSWORD);
			}

			// No account found with this email
			throw new Error(AuthErrorCode.ACCOUNT_NOT_FOUND);
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : AuthErrorCode.GENERIC_ERROR;
			console.error('Authentication error:', errorMessage);
			throw new Error(errorMessage);
		}
	}
});
