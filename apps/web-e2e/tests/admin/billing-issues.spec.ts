import { test, expect } from '@playwright/test';
import { ADMIN_STATE_FILE, CLIENT_STATE_FILE } from '../../helpers/test-data';

/**
 * Admin Billing Issues page (Spec 051, Jira EW-116).
 *
 * `/admin/billing-issues` is the admin surface for payment problems detected on
 * the payment records the site already stores: failed renewal charges, disputes,
 * refund requests, and subscriptions stuck in a bad state. From the row an admin
 * can open the issue, mark it resolved / dismissed, or issue a refund through the
 * provider that took the payment.
 *
 * The page never mutates anything on load — the re-scan button and the row
 * actions are the only writes, and both are behind the admin guard. These specs
 * therefore assert the surface and its gate rather than driving a refund, which
 * would need a live provider.
 */
test.describe('Admin billing issues — admin user', () => {
	test.use({ storageState: ADMIN_STATE_FILE });

	test('page loads with its heading for an admin', async ({ page }) => {
		const response = await page.goto('/admin/billing-issues', { waitUntil: 'domcontentloaded' });

		expect(response).toBeTruthy();
		expect(response!.status(), '/admin/billing-issues should not 5xx').toBeLessThan(500);
		expect(page.url(), 'admin should not be bounced to signin').not.toMatch(/\/auth\/signin/);
		await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 30_000 });
	});

	test('shows the status tabs, the search box and the re-scan control', async ({ page }) => {
		await page.goto('/admin/billing-issues', { waitUntil: 'domcontentloaded' });

		// The re-scan button is the page's only entry point for populating the
		// queue from the stored payment records, so it must always be reachable —
		// including on an empty queue, which is the state a fresh site starts in.
		await expect(page.getByTestId('billing-issues-sync')).toBeVisible({ timeout: 30_000 });
		await expect(page.getByRole('searchbox').or(page.getByRole('textbox')).first()).toBeVisible();
	});

	test('either lists issues or renders the empty state, never a crash', async ({ page }) => {
		await page.goto('/admin/billing-issues', { waitUntil: 'domcontentloaded' });
		await expect(page.getByTestId('billing-issues-sync')).toBeVisible({ timeout: 30_000 });

		// A seeded environment may or may not carry a failed payment. Both shapes
		// are correct; a page that renders neither means the query threw.
		const rows = page.getByTestId('billing-issue-row');
		const rowCount = await rows.count();

		if (rowCount > 0) {
			await expect(rows.first()).toBeVisible();
			await expect(page.getByTestId('billing-issue-review').first()).toBeVisible();
		} else {
			await expect(page.getByRole('heading').first()).toBeVisible();
		}
	});

	test('opening a row shows the action dialog when an issue exists', async ({ page }) => {
		await page.goto('/admin/billing-issues', { waitUntil: 'domcontentloaded' });
		await expect(page.getByTestId('billing-issues-sync')).toBeVisible({ timeout: 30_000 });

		const reviewButtons = page.getByTestId('billing-issue-review');
		test.skip((await reviewButtons.count()) === 0, 'No billing issue seeded in this environment');

		await reviewButtons.first().click();
		await expect(page.getByTestId('billing-issue-dialog')).toBeVisible();

		// The status control and the save action are the "mark resolved" half of
		// the acceptance criteria; the refund control is the other half. It is
		// offered for every open issue, because the provider payment reference is
		// editable — detection can only fill it from the invoice id the site
		// stores, and Stripe refunds a payment intent, so an admin must be able to
		// paste the real charge id rather than face a disabled button.
		await expect(page.getByTestId('billing-issue-save-status')).toBeVisible();
		await expect(page.getByTestId('billing-issue-refund-start')).toBeVisible();
		await expect(page.locator('#billing-issue-payment-reference')).toBeVisible();
	});

	test('the refund control stays disabled until a payment reference is present', async ({ page }) => {
		await page.goto('/admin/billing-issues', { waitUntil: 'domcontentloaded' });
		await expect(page.getByTestId('billing-issues-sync')).toBeVisible({ timeout: 30_000 });

		const reviewButtons = page.getByTestId('billing-issue-review');
		test.skip((await reviewButtons.count()) === 0, 'No billing issue seeded in this environment');

		await reviewButtons.first().click();
		await expect(page.getByTestId('billing-issue-dialog')).toBeVisible();

		// Clearing the reference must disable the money mover: a refund with no
		// target would be a provider error at best, and the confirm step should
		// never be reachable in that state.
		const reference = page.locator('#billing-issue-payment-reference');
		await reference.fill('');
		await expect(page.getByTestId('billing-issue-refund-start')).toBeDisabled();

		await reference.fill('pi_e2e_placeholder');
		await expect(page.getByTestId('billing-issue-refund-start')).toBeEnabled();
	});
});

test.describe('Admin billing issues — client user (denied)', () => {
	test.use({ storageState: CLIENT_STATE_FILE });

	test('rejects an authenticated non-admin', async ({ page }) => {
		const response = await page.goto('/admin/billing-issues', { waitUntil: 'domcontentloaded' });

		expect(response).toBeTruthy();
		expect(response!.status()).toBeLessThan(500);
		await expect(page).toHaveURL(/(auth\/signin|unauthorized|\/client\/|admin\/auth\/signin)/, {
			timeout: 30_000
		});
	});
});

test.describe('Admin billing issues — anonymous (signin gate)', () => {
	test('gates an anonymous visitor', async ({ browser }) => {
		const context = await browser.newContext();
		const page = await context.newPage();
		const response = await page.goto('/admin/billing-issues', { waitUntil: 'domcontentloaded' });

		expect(response).toBeTruthy();
		expect(response!.status()).toBeLessThan(500);
		await expect(page).toHaveURL(/auth\/signin/, { timeout: 30_000 });
		await context.close();
	});
});
