import { test, expect, type Page } from '@playwright/test';
import { TEST_DATA } from '../../helpers/test-data';
import {
	clearTwoFactorLock,
	closeTwoFactorDb,
	expireTwoFactorCode,
	getTwoFactorLockState,
	hasDatabase,
	recoverTwoFactorCode,
	waitForTwoFactorCodeRow
} from '../../helpers/two-factor-db';

/**
 * End-to-end coverage for email two-factor authentication (spec 046):
 * enable it in the security settings, sign in and be stopped by the code
 * step, satisfy it with the real emailed code, then turn it off again.
 *
 * The plaintext code never reaches the database — only a keyed HMAC-SHA256
 * digest — so the helper recovers it by exhausting the six-digit space
 * against that digest under the same server secret. That is both how the
 * test gets a usable code without an inbox and a standing assertion that
 * the column is a hash (`recoverTwoFactorCode` returns `null` if it ever
 * stops being one).
 *
 * Requires `DATABASE_URL`; skipped without one, like the rest of the
 * database-dependent suite.
 */

const CLIENT_PASSWORD = TEST_DATA.CLIENT_PASSWORD;

async function registerClient(page: Page, email: string) {
	await page.goto('/auth/register', { waitUntil: 'domcontentloaded' });
	await page.locator('#name').fill('E2E 2FA Client');
	await page.locator('#email').fill(email);
	await page.locator('#password').fill(CLIENT_PASSWORD);
	await page.locator('#password').press('Enter');
	await page.waitForURL(/\/client\/dashboard/, { timeout: 120_000, waitUntil: 'domcontentloaded' });
}

async function openSecuritySettings(page: Page) {
	await page.goto('/client/settings/security', { waitUntil: 'domcontentloaded' });
	await expect(page.getByTestId('two-factor-card')).toBeVisible({ timeout: 60_000 });
}

async function setTwoFactor(page: Page, enabled: boolean) {
	await openSecuritySettings(page);
	const toggle = page.getByTestId('two-factor-toggle');
	await expect(toggle).toBeEnabled();
	if ((await toggle.getAttribute('aria-checked')) !== String(enabled)) {
		await toggle.click();
	}
	await expect(toggle).toHaveAttribute('aria-checked', String(enabled), { timeout: 30_000 });
}

async function submitPassword(page: Page, email: string) {
	await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' });
	await page.locator('#email').waitFor({ state: 'visible', timeout: 60_000 });
	await page.locator('#email').fill(email);
	await page.locator('#password').fill(CLIENT_PASSWORD);
	await page.getByRole('button', { name: /sign in/i }).click();
}

async function submitCode(page: Page, code: string) {
	const input = page.getByTestId('two-factor-code-input');
	await input.fill(code);
	await page.getByRole('button', { name: /sign in/i }).click();
}

test.describe('Email 2FA: enable, sign in with a code, disable', () => {
	test.skip(!hasDatabase(), 'DATABASE_URL is required to read the issued 2FA code');

	test.afterAll(async () => {
		await closeTwoFactorDb();
	});

	test('a credentials account can enable 2FA, is challenged at sign-in, and can disable it', async ({
		page,
		context
	}) => {
		test.setTimeout(240_000);
		const email = TEST_DATA.generateClientEmail();

		// ── EW-136 / EW-137: enable from the security settings card ───────────
		await registerClient(page, email);
		await openSecuritySettings(page);
		await expect(page.getByTestId('two-factor-status')).toHaveText(/disabled/i);
		// A password account must NOT see the OAuth notice (EW-142's negative).
		await expect(page.getByTestId('two-factor-oauth-notice')).toHaveCount(0);
		await setTwoFactor(page, true);
		await expect(page.getByTestId('two-factor-status')).toHaveText(/enabled/i);

		// ── EW-138 / EW-139: signing in now stops at the code step ────────────
		await context.clearCookies();
		await submitPassword(page, email);
		await expect(page.getByTestId('two-factor-step')).toBeVisible({ timeout: 60_000 });
		// The password alone did not produce a session.
		expect(page.url()).not.toContain('/client/dashboard');

		const row = await waitForTwoFactorCodeRow(email);
		expect(row, 'a 2FA code row should exist after the password step').not.toBeNull();
		expect(row!.codeHash).toMatch(/^[0-9a-f]{64}$/);
		expect(row!.consumedAt).toBeNull();

		const code = recoverTwoFactorCode(row!.codeHash);
		expect(code, 'the stored value should be a hash of a six-digit code').not.toBeNull();
		expect(row!.codeHash).not.toContain(code!);

		// ── EW-141: a wrong code is rejected and spends one attempt ───────────
		const wrongCode = code === '000000' ? '111111' : '000000';
		await submitCode(page, wrongCode);
		await expect(page.getByTestId('auth-error')).toBeVisible({ timeout: 60_000 });
		await expect(page.getByTestId('two-factor-step')).toBeVisible();

		const afterWrong = await getTwoFactorLockState(email);
		expect(afterWrong?.failedAttempts).toBeGreaterThan(0);

		// ── The real code completes the sign-in ───────────────────────────────
		await submitCode(page, code!);
		await page.waitForURL(/\/client\/dashboard/, { timeout: 120_000, waitUntil: 'domcontentloaded' });

		// Success resets the brute-force budget.
		const afterSuccess = await getTwoFactorLockState(email);
		expect(afterSuccess?.failedAttempts).toBe(0);
		expect(afterSuccess?.lockedUntil).toBeNull();

		// ── EW-136: turn it back off ──────────────────────────────────────────
		await setTwoFactor(page, false);
		await expect(page.getByTestId('two-factor-status')).toHaveText(/disabled/i);

		// And the next sign-in no longer asks for a code.
		await context.clearCookies();
		await submitPassword(page, email);
		await page.waitForURL(/\/client\/dashboard/, { timeout: 120_000, waitUntil: 'domcontentloaded' });
	});

	test('an expired code is refused and the user is asked for a new one (EW-140)', async ({ page, context }) => {
		test.setTimeout(240_000);
		const email = TEST_DATA.generateClientEmail();

		await registerClient(page, email);
		await setTwoFactor(page, true);

		await context.clearCookies();
		await submitPassword(page, email);
		await expect(page.getByTestId('two-factor-step')).toBeVisible({ timeout: 60_000 });

		const row = await waitForTwoFactorCodeRow(email);
		expect(row).not.toBeNull();
		const code = recoverTwoFactorCode(row!.codeHash);
		expect(code).not.toBeNull();

		// Backdate the row rather than waiting ten real minutes.
		await expireTwoFactorCode(email);

		await submitCode(page, code!);
		await expect(page.getByTestId('auth-error')).toBeVisible({ timeout: 60_000 });
		await expect(page.getByTestId('auth-error')).toContainText(/expired/i);
		expect(page.url()).not.toContain('/client/dashboard');
	});

	test('five wrong codes lock verification, and the lock survives a correct code (EW-141)', async ({
		page,
		context
	}) => {
		test.setTimeout(300_000);
		const email = TEST_DATA.generateClientEmail();

		await registerClient(page, email);
		await setTwoFactor(page, true);

		await context.clearCookies();
		await submitPassword(page, email);
		await expect(page.getByTestId('two-factor-step')).toBeVisible({ timeout: 60_000 });

		const row = await waitForTwoFactorCodeRow(email);
		expect(row).not.toBeNull();
		const code = recoverTwoFactorCode(row!.codeHash);
		expect(code).not.toBeNull();

		// Five distinct wrong guesses. Each must differ from the real code, so
		// build them from a base that is shifted away from it.
		const wrongCodes = ['100001', '200002', '300003', '400004', '500005'].map((candidate) =>
			candidate === code ? '600006' : candidate
		);

		for (const wrong of wrongCodes) {
			await submitCode(page, wrong);
			await expect(page.getByTestId('auth-error')).toBeVisible({ timeout: 60_000 });
		}

		const locked = await getTwoFactorLockState(email);
		expect(locked?.lockedUntil, 'the account should be locked after five failures').not.toBeNull();
		expect(locked!.lockedUntil!.getTime()).toBeGreaterThan(Date.now());

		// The fifth failure itself must report the LOCK, not another wrong code.
		await expect(page.getByTestId('auth-error')).toContainText(/temporarily blocked/i);

		// Even the RIGHT code is refused while the lock stands — and it must be
		// refused BY THE LOCK. Asserting only that "some error" appears would pass
		// on a build with no lockout at all: crossing the threshold also deletes
		// the code row, so a correct code would then come back as `not_found` →
		// TWO_FACTOR_EXPIRED → "This code has expired". Pinning the lock copy (and
		// ruling out the expiry copy) is what separates "verification is locked"
		// from "the code merely went missing", which is the whole of EW-141.
		await submitCode(page, code!);
		await expect(page.getByTestId('auth-error')).toBeVisible({ timeout: 60_000 });
		await expect(page.getByTestId('auth-error')).toContainText(/temporarily blocked/i);
		await expect(page.getByTestId('auth-error')).not.toContainText(/expired/i);
		expect(page.url()).not.toContain('/client/dashboard');

		// The lock is still standing afterwards: submitting the correct code did
		// not clear it, so a guesser cannot spend the lock by knowing the answer.
		const stillLocked = await getTwoFactorLockState(email);
		expect(stillLocked?.lockedUntil).not.toBeNull();
		expect(stillLocked!.lockedUntil!.getTime()).toBeGreaterThan(Date.now());

		// Housekeeping so a re-run of this generated account is not stuck.
		await clearTwoFactorLock(email);
	});
});
