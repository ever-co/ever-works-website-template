import { and, desc, eq, gt, isNull, lt, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { ActivityType, accounts, clientProfiles, twoFactorCodes } from '@/lib/db/schema';
import { logActivity } from '@/lib/db/queries/activity.queries';
import { sendTwoFactorTokenEmail } from '@/lib/mail';
import {
	TWO_FACTOR_CODE_TTL_MINUTES,
	TWO_FACTOR_MAX_ATTEMPTS,
	generateTwoFactorCode,
	hashTwoFactorCode,
	isTwoFactorCodeExpired,
	isTwoFactorLocked,
	isWellFormedTwoFactorCode,
	registerFailedAttempt,
	remainingTwoFactorAttempts,
	twoFactorCodeExpiry,
	twoFactorLockRetryAfterSeconds,
	verifyTwoFactorCodeHash
} from './two-factor-code';

/**
 * Stateful half of email two-factor authentication (spec 047 —
 * EW-135 … EW-142): reading and writing `twoFactorCodes` and the
 * `client_profiles` 2FA columns, and dispatching the code email.
 *
 * The pure primitives (code generation, hashing, constant-time compare,
 * expiry and lockout arithmetic) live in `./two-factor-code` and are
 * unit-tested there.
 *
 * **Scope.** 2FA is a *client account* feature: the status column and
 * the brute-force budget live on `client_profiles`, and the security
 * settings surface it owns is `/client/settings/security`. Admin users
 * (a `users` row with an admin role and no client profile) are out of
 * scope for this spec — see `docs/questions.md` Q-047a.
 */

/** How a user authenticates today. Drives the OAuth gate in EW-142. */
export type TwoFactorAuthMethod = 'credentials' | 'oauth' | 'unknown';

export interface TwoFactorAccountState {
	/** Client profile id, when the user has one. */
	clientProfileId: string | null;
	/** Tenant that owns the profile row. */
	tenantId: string | null;
	/** Email the code is sent to. */
	email: string | null;
	/** Persisted `client_profiles.two_factor_enabled`. */
	twoFactorEnabled: boolean;
	/** A credentials account with a password hash exists. */
	hasPasswordAccount: boolean;
	/** At least one OAuth account is linked. */
	hasOAuthAccount: boolean;
	/** `'credentials'` when a password exists, else `'oauth'` when only OAuth is linked. */
	authMethod: TwoFactorAuthMethod;
	/** Enabling 2FA is permitted (email/password accounts only). */
	canEnableTwoFactor: boolean;
	/** Rolling failed-verification counter. */
	failedAttempts: number;
	/** Lock expiry, when a lockout is recorded. */
	lockedUntil: Date | null;
	/** `true` while the lockout is still in force. */
	locked: boolean;
}

/**
 * Read everything the 2FA surfaces need about a user in one pass.
 *
 * Profile lookup is tenant-scoped when a tenant resolves and falls back
 * to a bare `userId` match — `client_profile_user_id_unique_idx` makes
 * `userId` globally unique, and this mirrors
 * `getClientProfileByUserId`, so a request whose tenant does not
 * resolve still sees the right row rather than silently reporting
 * "2FA off".
 */
export async function getTwoFactorAccountState(
	userId: string,
	tenantId?: string | null
): Promise<TwoFactorAccountState> {
	const profileWhere = tenantId
		? and(eq(clientProfiles.userId, userId), eq(clientProfiles.tenantId, tenantId))
		: eq(clientProfiles.userId, userId);

	const [profile] = await db
		.select({
			id: clientProfiles.id,
			email: clientProfiles.email,
			tenantId: clientProfiles.tenantId,
			twoFactorEnabled: clientProfiles.twoFactorEnabled,
			failedAttempts: clientProfiles.twoFactorFailedAttempts,
			lockedUntil: clientProfiles.twoFactorLockedUntil
		})
		.from(clientProfiles)
		.where(profileWhere)
		.limit(1);

	// Tenant-scoped like the connected-accounts route's `hasPassword`: without a
	// scope, a credentials account belonging to ANOTHER tenant would satisfy the
	// OAuth gate for an OAuth-only profile in this one. Rows with a NULL tenant
	// are included deliberately — both credentials inserts set `tenant_id`, but
	// a row predating that column belongs to no tenant rather than to a
	// different one, and excluding it would tell a legitimate password account
	// that it signed up with OAuth.
	const linkedAccounts = await db
		.select({ type: accounts.type, provider: accounts.provider, passwordHash: accounts.passwordHash })
		.from(accounts)
		.where(
			tenantId
				? and(eq(accounts.userId, userId), or(eq(accounts.tenantId, tenantId), isNull(accounts.tenantId)))
				: eq(accounts.userId, userId)
		);

	// Client passwords live on `accounts` rows whose PROVIDER is 'credentials'
	// — that is the column `verifyClientPassword` matches on, so it is the
	// authority on "can this account sign in with a password". `type` is
	// checked too because the connected-accounts card keys off it, but relying
	// on `type` alone would miss legacy rows written as `type: 'email'` and
	// wrongly report those password accounts as OAuth-only. Both values sit
	// outside next-auth's `AdapterAccountType` union, hence the casts.
	const hasPasswordAccount = linkedAccounts.some(
		(a) => ((a.type as string) === 'credentials' || a.provider === 'credentials') && !!a.passwordHash
	);
	const hasOAuthAccount = linkedAccounts.some((a) => (a.type as string) === 'oauth');

	const authMethod: TwoFactorAuthMethod = hasPasswordAccount ? 'credentials' : hasOAuthAccount ? 'oauth' : 'unknown';

	// A lock that has already run out is reported as gone, and its counter as
	// spent-and-reset, rather than as "5 failed attempts" forever: the row is
	// only rewritten by the next verification, and until then the security
	// overview would keep showing an at-risk account whose lock expired hours
	// ago. This mirrors what `verifyTwoFactorCode` writes when it next runs.
	const storedLockedUntil = profile?.lockedUntil ?? null;
	const lockExpired = !!storedLockedUntil && !isTwoFactorLocked(storedLockedUntil);
	const lockedUntil = lockExpired ? null : storedLockedUntil;

	return {
		clientProfileId: profile?.id ?? null,
		tenantId: profile?.tenantId ?? tenantId ?? null,
		email: profile?.email ?? null,
		twoFactorEnabled: !!profile?.twoFactorEnabled,
		hasPasswordAccount,
		hasOAuthAccount,
		authMethod,
		// EW-142: only email/password accounts may turn 2FA on. A profile must
		// also exist, because the flag is stored on it.
		canEnableTwoFactor: hasPasswordAccount && !!profile,
		failedAttempts: lockExpired ? 0 : (profile?.failedAttempts ?? 0),
		lockedUntil,
		locked: isTwoFactorLocked(lockedUntil)
	};
}

/**
 * EW-137 / EW-142 backend guard: may this user enable email 2FA?
 *
 * `true` only for accounts that registered with email + password.
 * OAuth-only users are refused here as well as in the UI, so a hand
 * crafted request cannot turn on a factor they could never satisfy.
 */
export async function canEnableTwoFactor(userId: string, tenantId?: string | null): Promise<boolean> {
	const state = await getTwoFactorAccountState(userId, tenantId);
	return state.canEnableTwoFactor;
}

/**
 * Persist `client_profiles.two_factor_enabled` (EW-137).
 *
 * Disabling also clears any pending code and the brute-force budget, so
 * a user who turns 2FA off and on again starts from a clean slate.
 */
export async function setTwoFactorEnabled(
	userId: string,
	tenantId: string | null | undefined,
	enabled: boolean
): Promise<boolean> {
	const where = tenantId
		? and(eq(clientProfiles.userId, userId), eq(clientProfiles.tenantId, tenantId))
		: eq(clientProfiles.userId, userId);

	const updated = await db
		.update(clientProfiles)
		.set({
			twoFactorEnabled: enabled,
			twoFactorFailedAttempts: 0,
			twoFactorLockedUntil: null,
			updatedAt: new Date()
		})
		.where(where)
		.returning({ id: clientProfiles.id });

	if (updated.length === 0) return false;

	// Purge pending codes on BOTH transitions. Disabling obviously discards
	// them; enabling must too, because a code minted before the factor was
	// last turned off would otherwise still satisfy the very next sign-in —
	// including one that survived a failed cleanup on the way out.
	await db.delete(twoFactorCodes).where(eq(twoFactorCodes.userId, userId));

	return true;
}

export interface IssuedTwoFactorCode {
	/** When the freshly minted code stops being valid. */
	expiresAt: Date;
	/** Minutes of validity, for display. */
	expiresInMinutes: number;
	/**
	 * `false` when the mail service is not configured, so the caller can
	 * surface "we could not send the code" instead of stranding the user
	 * on a code step no email will ever satisfy.
	 */
	emailSent: boolean;
	/**
	 * `true` when the per-account issuance budget was already spent, so no
	 * new code was minted and no mail was sent. Callers surface this as
	 * `AuthErrorCode.RATE_LIMITED`.
	 */
	throttled?: boolean;
}

/**
 * How many codes one account may be sent inside {@link ISSUE_WINDOW_MS}.
 *
 * This is the choke point for **every** issuance path — the sign-in server
 * action, the NextAuth `authorize` callback, and the resend route — which
 * matters because `authorize` is reachable by posting straight to
 * `/api/auth/callback/credentials`, bypassing the server action's own
 * per-email limiter. Without it, somebody holding a leaked password could
 * not sign in (that is the point of the second factor) but could still use
 * the endpoint to bomb the victim's inbox. Deliberately looser than the
 * resend route's 3-per-10-minutes so a legitimate user who retries never
 * meets it first.
 *
 * Counted **in the database**, not in `ratelimit()`'s in-memory map: this
 * one is a security control, and a process-local counter would let a
 * multi-instance deployment issue `ISSUE_LIMIT × instances` codes per
 * window. Counting `twoFactorCodes` rows in the window is exact and shared,
 * which is why issuing marks earlier codes CONSUMED rather than deleting
 * them — a deleted row cannot be counted.
 */
const ISSUE_LIMIT = 6;
const ISSUE_WINDOW_MS = 10 * 60 * 1000;

/**
 * Stable 32-bit key for `pg_advisory_xact_lock`, derived from a user id.
 *
 * Computed here rather than with Postgres' `hashtext()` so the value does not
 * depend on an undocumented internal function, and as a 32-bit signed int
 * rather than a BigInt because this package targets ES2017 (no BigInt
 * literals). Collisions are harmless: two different users sharing a key merely
 * serialize against each other, which costs a little concurrency and changes
 * no outcome.
 */
function advisoryLockKey(userId: string): number {
	// FNV-1a, 32-bit. `Math.imul` keeps the multiply in 32-bit space.
	let hash = 0x811c9dc5;
	for (let i = 0; i < userId.length; i++) {
		hash ^= userId.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193);
	}
	return hash | 0;
}

/**
 * Mint a one-time code, store only its hash, and email the plaintext
 * (EW-138 / EW-140).
 *
 * Rotate-on-issue: every earlier code for the user is deleted first, so
 * only the newest email works. The user-level failure budget is
 * deliberately **not** reset here — otherwise an attacker could clear it
 * by requesting a resend (EW-141).
 */
export async function issueTwoFactorCode(params: {
	userId: string;
	email: string;
	tenantId?: string | null;
	userName?: string | null;
}): Promise<IssuedTwoFactorCode> {
	const { userId, email, tenantId, userName } = params;

	const code = generateTwoFactorCode();
	const codeHash = hashTwoFactorCode(code);
	const expiresAt = twoFactorCodeExpiry();

	// Count-then-insert is a read-modify-write, so it runs inside a transaction
	// that first takes a per-user advisory lock. Without it, concurrent issues
	// would every one of them read the same under-limit count and every one of
	// them insert — the inbox-bombing cap this exists to enforce would simply
	// not hold, and several live codes could be left behind. The lock is
	// transaction-scoped, so it is released on commit or rollback either way.
	const throttled = await db.transaction(async (tx) => {
		await tx.execute(sql`SELECT pg_advisory_xact_lock(${advisoryLockKey(userId)})`);

		const windowStart = new Date(Date.now() - ISSUE_WINDOW_MS);
		const [{ issued } = { issued: 0 }] = await tx
			.select({ issued: sql<number>`count(*)::int` })
			.from(twoFactorCodes)
			.where(and(eq(twoFactorCodes.userId, userId), gt(twoFactorCodes.createdAt, windowStart)));

		if (issued >= ISSUE_LIMIT) return true;

		// Rotate: any previous code for this user becomes inert immediately.
		// Marked consumed rather than deleted so it still counts towards the
		// issuance budget above; `verifyTwoFactorCode` only ever looks at rows
		// where `consumedAt IS NULL`, so a consumed row can never be satisfied.
		await tx
			.update(twoFactorCodes)
			.set({ consumedAt: new Date() })
			.where(and(eq(twoFactorCodes.userId, userId), isNull(twoFactorCodes.consumedAt)));

		await tx.insert(twoFactorCodes).values({
			userId,
			email: email.toLowerCase().trim(),
			codeHash,
			expires: expiresAt,
			attempts: 0,
			tenantId: tenantId ?? null
		});

		return false;
	});

	if (throttled) {
		return {
			expiresAt: twoFactorCodeExpiry(),
			expiresInMinutes: TWO_FACTOR_CODE_TTL_MINUTES,
			emailSent: false,
			throttled: true
		};
	}

	// Opportunistic housekeeping so the table cannot grow without bound on a
	// busy directory: drop anything that expired more than a day ago. Outside
	// the transaction on purpose — it must never widen the lock's scope, and a
	// failure here is cosmetic.
	await db
		.delete(twoFactorCodes)
		.where(lt(twoFactorCodes.expires, new Date(Date.now() - 24 * 60 * 60 * 1000)))
		.catch(() => {});

	// `sendTwoFactorTokenEmail` returns `{ skipped: true }` when the mail
	// service is unconfigured but RETHROWS transport errors (a dead SMTP host,
	// a rejected Resend key). Both mean the same thing to the person waiting on
	// a code, and neither should surface as an unhandled rejection inside a
	// NextAuth `authorize` call — so the throw is folded into the same
	// `emailSent: false` signal the caller already handles.
	let emailSent: boolean;
	try {
		const result = await sendTwoFactorTokenEmail(email, code, {
			expiresInMinutes: TWO_FACTOR_CODE_TTL_MINUTES,
			userName: userName ?? undefined
		});
		emailSent = !(result && typeof result === 'object' && 'skipped' in result);
	} catch (error) {
		console.error('[2FA] Failed to send verification code email:', error);
		emailSent = false;
	}

	if (tenantId) {
		void logActivity(ActivityType.TWO_FACTOR_CHALLENGE_SENT, userId, 'user', undefined, tenantId).catch(() => {});
	}

	return { expiresAt, expiresInMinutes: TWO_FACTOR_CODE_TTL_MINUTES, emailSent };
}

/** Why a verification failed. Mapped to `AuthErrorCode.TWO_FACTOR_*` by callers. */
export type TwoFactorFailureReason = 'locked' | 'expired' | 'invalid' | 'not_found';

export interface TwoFactorVerificationResult {
	ok: boolean;
	reason?: TwoFactorFailureReason;
	/** Seconds until a lockout lifts, when `reason === 'locked'`. */
	retryAfterSeconds?: number;
	/** Attempts left before the account locks, when `reason === 'invalid'`. */
	remainingAttempts?: number;
}

export interface VerifyTwoFactorCodeOptions {
	/**
	 * Mark the code consumed on success. The sign-in *pre-check* in the
	 * server action verifies without consuming so that the authoritative
	 * check inside the NextAuth `authorize` callback — the only place a
	 * session is actually minted — can consume it a moment later.
	 * Defaults to `true`.
	 */
	consume?: boolean;
	tenantId?: string | null;
}

/**
 * Validate a submitted code against the stored hash (EW-139 / EW-140 / EW-141).
 *
 * Order of checks matters:
 *   1. an active lockout short-circuits everything (no oracle while locked);
 *   2. an expired lockout is cleared and the budget reset;
 *   3. malformed input is rejected *without* spending the budget — it can
 *      never match a digest, so counting it would only let a clumsy user
 *      lock themselves out;
 *   4. an expired code is deleted and reported as `expired`, and the budget
 *      is reset (the ticket's "reset on success or code expiration");
 *   5. a mismatch spends one attempt and locks the account on the fifth.
 */
export async function verifyTwoFactorCode(
	userId: string,
	code: string,
	options: VerifyTwoFactorCodeOptions = {}
): Promise<TwoFactorVerificationResult> {
	const { consume = true, tenantId } = options;
	const now = new Date();

	const profileWhere = tenantId
		? and(eq(clientProfiles.userId, userId), eq(clientProfiles.tenantId, tenantId))
		: eq(clientProfiles.userId, userId);

	const [profile] = await db
		.select({
			id: clientProfiles.id,
			tenantId: clientProfiles.tenantId,
			failedAttempts: clientProfiles.twoFactorFailedAttempts,
			lockedUntil: clientProfiles.twoFactorLockedUntil
		})
		.from(clientProfiles)
		.where(profileWhere)
		.limit(1);

	if (!profile) {
		return { ok: false, reason: 'not_found' };
	}

	// 1. Locked: refuse before touching the code table so a locked account
	//    leaks nothing about whether a code exists or matches.
	if (isTwoFactorLocked(profile.lockedUntil, now)) {
		return {
			ok: false,
			reason: 'locked',
			retryAfterSeconds: twoFactorLockRetryAfterSeconds(profile.lockedUntil, now)
		};
	}

	// 2. A lock that has run out clears itself on next use.
	let failedAttempts = profile.failedAttempts ?? 0;
	if (profile.lockedUntil) {
		await db
			.update(clientProfiles)
			.set({ twoFactorFailedAttempts: 0, twoFactorLockedUntil: null })
			.where(eq(clientProfiles.id, profile.id));
		failedAttempts = 0;
	}

	// 3. Malformed input never matches a digest, so it costs no budget.
	if (!isWellFormedTwoFactorCode(code)) {
		return {
			ok: false,
			reason: 'invalid',
			remainingAttempts: remainingTwoFactorAttempts(failedAttempts)
		};
	}

	const [record] = await db
		.select()
		.from(twoFactorCodes)
		.where(and(eq(twoFactorCodes.userId, userId), isNull(twoFactorCodes.consumedAt)))
		.orderBy(desc(twoFactorCodes.createdAt))
		.limit(1);

	if (!record) {
		return { ok: false, reason: 'not_found' };
	}

	// 4. Expired: drop the row and reset the budget, then ask for a new code.
	if (isTwoFactorCodeExpired(record.expires, now)) {
		await db.delete(twoFactorCodes).where(eq(twoFactorCodes.id, record.id));
		await db
			.update(clientProfiles)
			.set({ twoFactorFailedAttempts: 0, twoFactorLockedUntil: null })
			.where(eq(clientProfiles.id, profile.id));
		return { ok: false, reason: 'expired' };
	}

	// Constant-time digest comparison — never a plaintext equality check.
	if (!verifyTwoFactorCodeHash(code, record.codeHash)) {
		await db
			.update(twoFactorCodes)
			.set({ attempts: sql`${twoFactorCodes.attempts} + 1` })
			.where(eq(twoFactorCodes.id, record.id));

		// Increment IN THE DATABASE and read the serialized result back, rather
		// than writing a count derived from the snapshot read at the top of this
		// function: two guesses arriving together would otherwise both compute
		// "1" from a stale 0 and one of the two failures would be forgotten,
		// which is exactly the race a brute-forcer would exploit to buy extra
		// attempts. `registerFailedAttempt` then decides the lock transition
		// from the authoritative count.
		const [counted] = await db
			.update(clientProfiles)
			.set({ twoFactorFailedAttempts: sql`COALESCE(${clientProfiles.twoFactorFailedAttempts}, 0) + 1` })
			.where(eq(clientProfiles.id, profile.id))
			.returning({ failedAttempts: clientProfiles.twoFactorFailedAttempts });

		const outcome = registerFailedAttempt((counted?.failedAttempts ?? failedAttempts + 1) - 1, now);

		if (outcome.locked) {
			await db
				.update(clientProfiles)
				.set({ twoFactorLockedUntil: outcome.lockedUntil })
				.where(eq(clientProfiles.id, profile.id));

			// Burn the code alongside the lock: whoever was guessing must wait
			// AND request a fresh one.
			await db.delete(twoFactorCodes).where(eq(twoFactorCodes.userId, userId));
			if (profile.tenantId) {
				void logActivity(ActivityType.TWO_FACTOR_LOCKED, userId, 'user', undefined, profile.tenantId).catch(
					() => {}
				);
			}
			return {
				ok: false,
				reason: 'locked',
				retryAfterSeconds: twoFactorLockRetryAfterSeconds(outcome.lockedUntil, now)
			};
		}

		if (profile.tenantId) {
			void logActivity(ActivityType.TWO_FACTOR_FAILED, userId, 'user', undefined, profile.tenantId).catch(
				() => {}
			);
		}

		return {
			ok: false,
			reason: 'invalid',
			remainingAttempts: remainingTwoFactorAttempts(outcome.failedAttempts)
		};
	}

	// 5. Success: consume the code when this is the authoritative check, then
	//    reset the budget.
	if (consume) {
		// Conditional on the row still being unconsumed, so the "one-time" in
		// one-time code holds under concurrency: two requests carrying the same
		// valid code race here, and the UPDATE ... WHERE consumed_at IS NULL is
		// serialized by the database so exactly one of them changes a row. The
		// loser sees zero rows and is answered as if the code were already gone.
		const consumed = await db
			.update(twoFactorCodes)
			.set({ consumedAt: now })
			.where(and(eq(twoFactorCodes.id, record.id), isNull(twoFactorCodes.consumedAt)))
			.returning({ id: twoFactorCodes.id });

		if (consumed.length === 0) {
			return { ok: false, reason: 'not_found' };
		}
	}

	await db
		.update(clientProfiles)
		.set({ twoFactorFailedAttempts: 0, twoFactorLockedUntil: null })
		.where(eq(clientProfiles.id, profile.id));

	return { ok: true };
}

/** Threshold re-exported so routes and UI copy stay in step with the guard. */
export { TWO_FACTOR_MAX_ATTEMPTS, TWO_FACTOR_CODE_TTL_MINUTES };
