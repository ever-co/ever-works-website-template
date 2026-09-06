import postgres from 'postgres';
import { hashTwoFactorCode, twoFactorCodeSecret } from '../../web/lib/auth/two-factor-code';

/**
 * Test-only access to the `twoFactorCodes` table (spec 053).
 *
 * The application stores **only a keyed HMAC-SHA256** of each one-time code,
 * so there is no column to read the plaintext out of —
 * {@link recoverTwoFactorCode} therefore recovers it by hashing every value
 * in the six-digit space under the SAME server key until one digest
 * matches. That is ~10^6 HMAC operations (about a second in Node) and it
 * doubles as a live assertion that the column really is a digest of a short
 * numeric code and not the code itself. The key comes from
 * `AUTH_SECRET` / `TWO_FACTOR_CODE_SECRET`, which `playwright.config.ts`
 * loads out of `apps/web/.env.local` — a test run without it cannot
 * recover a code, which is exactly the property the keying buys.
 *
 * `postgres` is not a declared dependency of this package; it is the driver
 * `apps/web` uses and the repo's `shamefully-hoist=true` puts it in the
 * workspace-root `node_modules`, so it resolves without adding a dep.
 */

let sql: postgres.Sql | null = null;

/** `true` when a database is configured for this run. */
export function hasDatabase(): boolean {
	return !!process.env.DATABASE_URL;
}

function client(): postgres.Sql {
	if (!process.env.DATABASE_URL) {
		throw new Error('DATABASE_URL is required for two-factor database helpers');
	}
	if (!sql) {
		sql = postgres(process.env.DATABASE_URL, { max: 1, idle_timeout: 5, connect_timeout: 15, prepare: false });
	}
	return sql;
}

/** Close the pooled connection. Call from `test.afterAll`. */
export async function closeTwoFactorDb(): Promise<void> {
	if (sql) {
		await sql.end({ timeout: 5 });
		sql = null;
	}
}

export interface StoredTwoFactorCode {
	id: string;
	userId: string;
	email: string;
	codeHash: string;
	expires: Date;
	attempts: number;
	consumedAt: Date | null;
}

/** Newest unconsumed code row for an email address, or `null`. */
export async function getLatestTwoFactorCode(email: string): Promise<StoredTwoFactorCode | null> {
	const rows = await client()<
		{
			id: string;
			userId: string;
			email: string;
			code_hash: string;
			expires: Date;
			attempts: number;
			consumed_at: Date | null;
		}[]
	>`
		SELECT "id", "userId", "email", "code_hash", "expires", "attempts", "consumed_at"
		FROM "twoFactorCodes"
		WHERE lower("email") = lower(${email})
		ORDER BY "created_at" DESC
		LIMIT 1
	`;

	const row = rows[0];
	if (!row) return null;

	return {
		id: row.id,
		userId: row.userId,
		email: row.email,
		codeHash: row.code_hash,
		expires: new Date(row.expires),
		attempts: row.attempts,
		consumedAt: row.consumed_at ? new Date(row.consumed_at) : null
	};
}

/**
 * Poll until a code row exists for `email` (the sign-in request mints it
 * asynchronously relative to the browser navigation).
 */
export async function waitForTwoFactorCodeRow(email: string, timeoutMs = 20_000): Promise<StoredTwoFactorCode | null> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const row = await getLatestTwoFactorCode(email);
		if (row) return row;
		await new Promise((resolve) => setTimeout(resolve, 500));
	}
	return null;
}

/**
 * Recover the plaintext code behind a stored digest by exhausting the
 * six-digit space. Returns `null` if nothing matches — which would mean the
 * column is not a hash of a 6-digit code.
 */
export function recoverTwoFactorCode(codeHash: string): string | null {
	// Resolve the key once: it is the same for every candidate, and resolving
	// it up front fails loudly when the runner has no AUTH_SECRET rather than
	// silently exhausting the space and reporting "not a hash".
	const secret = twoFactorCodeSecret();
	for (let value = 0; value < 1_000_000; value++) {
		const candidate = String(value).padStart(6, '0');
		if (hashTwoFactorCode(candidate, secret) === codeHash) return candidate;
	}
	return null;
}

/** Force the current code for an email to look expired (EW-140). */
export async function expireTwoFactorCode(email: string): Promise<void> {
	await client()`
		UPDATE "twoFactorCodes"
		SET "expires" = now() - interval '1 minute'
		WHERE lower("email") = lower(${email})
	`;
}

/** Read the account-level brute-force state for an email (EW-141). */
export async function getTwoFactorLockState(
	email: string
): Promise<{ failedAttempts: number; lockedUntil: Date | null } | null> {
	const rows = await client()<{ two_factor_failed_attempts: number | null; two_factor_locked_until: Date | null }[]>`
		SELECT "two_factor_failed_attempts", "two_factor_locked_until"
		FROM "client_profiles"
		WHERE lower("email") = lower(${email})
		LIMIT 1
	`;

	const row = rows[0];
	if (!row) return null;
	return {
		failedAttempts: row.two_factor_failed_attempts ?? 0,
		lockedUntil: row.two_factor_locked_until ? new Date(row.two_factor_locked_until) : null
	};
}

/** Clear any lockout so a test can continue after deliberately tripping one. */
export async function clearTwoFactorLock(email: string): Promise<void> {
	await client()`
		UPDATE "client_profiles"
		SET "two_factor_failed_attempts" = 0, "two_factor_locked_until" = NULL
		WHERE lower("email") = lower(${email})
	`;
}
