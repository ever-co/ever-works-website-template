import { test, expect } from '@playwright/test';
import { ADMIN_STATE_FILE, CLIENT_STATE_FILE } from '../../helpers/test-data';

/**
 * Admin Payment Reports page (Spec 052, Jira EW-117).
 *
 * `/admin/payment-reports` filters the stored payment records by date range,
 * plan, provider and status, shows revenue roll-ups, and exports the same filter
 * set as CSV or XLSX. PDF is deliberately absent: the repository carries no PDF
 * generation dependency (see `docs/questions.md`), so the export surface is the
 * two formats `exceljs` + `papaparse` already cover.
 */
test.describe('Admin payment reports — admin user', () => {
	test.use({ storageState: ADMIN_STATE_FILE });

	test('page loads with its heading for an admin', async ({ page }) => {
		const response = await page.goto('/admin/payment-reports', { waitUntil: 'domcontentloaded' });

		expect(response).toBeTruthy();
		expect(response!.status(), '/admin/payment-reports should not 5xx').toBeLessThan(500);
		expect(page.url(), 'admin should not be bounced to signin').not.toMatch(/\/auth\/signin/);
		await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 30_000 });
	});

	test('exposes every documented filter control', async ({ page }) => {
		await page.goto('/admin/payment-reports', { waitUntil: 'domcontentloaded' });

		// The acceptance criteria name "filtered by date, plan, etc." — these five
		// controls are that contract, so each is pinned by its label.
		await expect(page.locator('#payment-report-from')).toBeVisible({ timeout: 30_000 });
		await expect(page.locator('#payment-report-to')).toBeVisible();
		await expect(page.locator('#payment-report-plan')).toBeVisible();
		await expect(page.locator('#payment-report-status')).toBeVisible();
		await expect(page.locator('#payment-report-provider')).toBeVisible();
	});

	test('exposes both export controls', async ({ page }) => {
		await page.goto('/admin/payment-reports', { waitUntil: 'domcontentloaded' });

		await expect(page.getByTestId('payment-report-export-csv')).toBeVisible({ timeout: 30_000 });
		await expect(page.getByTestId('payment-report-export-xlsx')).toBeVisible();
	});

	test('applying a filter re-renders the report, never an error state', async ({ page }) => {
		await page.goto('/admin/payment-reports', { waitUntil: 'domcontentloaded' });
		await expect(page.locator('#payment-report-status')).toBeVisible({ timeout: 30_000 });

		const response = page.waitForResponse(
			(res) => res.url().includes('/api/admin/payment-reports') && res.url().includes('status=active'),
			{ timeout: 30_000 }
		);
		await page.selectOption('#payment-report-status', 'active');
		// Wait for the FILTERED request itself. Asserting on the page before the
		// refetch lands would pass against the unfiltered render.
		expect((await response).status()).toBeLessThan(500);

		// Exactly one of the two legitimate outcomes must be on screen. The heading
		// is deliberately NOT part of this assertion: it renders unconditionally, so
		// including it would make the check pass even if the filtered query threw.
		await expect(page.getByTestId('payment-report-table').or(page.getByText(/no payment record/i))).toBeVisible({
			timeout: 30_000
		});
		await expect(page.getByTestId('payment-report-error')).toHaveCount(0);
	});

	test('the CSV export downloads a file', async ({ page }) => {
		await page.goto('/admin/payment-reports', { waitUntil: 'domcontentloaded' });
		await expect(page.getByTestId('payment-report-export-csv')).toBeVisible({ timeout: 30_000 });

		const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
		await page.getByTestId('payment-report-export-csv').click();

		const download = await downloadPromise;
		expect(download.suggestedFilename()).toMatch(/\.csv$/);
	});
});

test.describe('Admin payment reports — client user (denied)', () => {
	test.use({ storageState: CLIENT_STATE_FILE });

	test('rejects an authenticated non-admin', async ({ page }) => {
		const response = await page.goto('/admin/payment-reports', { waitUntil: 'domcontentloaded' });

		expect(response).toBeTruthy();
		expect(response!.status()).toBeLessThan(500);
		await expect(page).toHaveURL(/(auth\/signin|unauthorized|\/client\/|admin\/auth\/signin)/, {
			timeout: 30_000
		});
	});
});

test.describe('Admin payment reports — anonymous (signin gate)', () => {
	test('gates an anonymous visitor', async ({ browser }) => {
		const context = await browser.newContext();
		const page = await context.newPage();
		const response = await page.goto('/admin/payment-reports', { waitUntil: 'domcontentloaded' });

		expect(response).toBeTruthy();
		expect(response!.status()).toBeLessThan(500);
		await expect(page).toHaveURL(/auth\/signin/, { timeout: 30_000 });
		await context.close();
	});
});
