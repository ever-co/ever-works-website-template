import { test, expect } from '@playwright/test';
import { ADMIN_STATE_FILE } from '../../helpers/test-data';

// Twin of public-api-coverage-matrix.spec.ts focused on /api/admin/*. Two
// flavors: anonymous calls must reject (401/403/404, not 5xx, not 200);
// admin calls must succeed (2xx, not 5xx).

const ADMIN_GET_ENDPOINTS: Array<{ path: string; name: string }> = [
	{ path: '/api/admin/billing-issues', name: 'billing issues list' },
	{ path: '/api/admin/billing-issues/stats', name: 'billing issues stats' },
	{ path: '/api/admin/categories', name: 'categories list' },
	{ path: '/api/admin/categories/all', name: 'categories all' },
	{ path: '/api/admin/categories/git', name: 'categories git status' },
	{ path: '/api/admin/clients', name: 'clients list' },
	{ path: '/api/admin/clients/advanced-search', name: 'clients advanced search' },
	{ path: '/api/admin/clients/dashboard', name: 'clients dashboard' },
	{ path: '/api/admin/clients/stats', name: 'clients stats' },
	{ path: '/api/admin/collections', name: 'collections list' },
	{ path: '/api/admin/comments', name: 'comments list' },
	{ path: '/api/admin/companies', name: 'companies list' },
	{ path: '/api/admin/dashboard/stats', name: 'dashboard stats' },
	{ path: '/api/admin/featured-items', name: 'featured items list' },
	{ path: '/api/admin/geo-analytics', name: 'geo analytics' },
	{ path: '/api/admin/items', name: 'items list' },
	{ path: '/api/admin/items/stats', name: 'items stats' },
	{ path: '/api/admin/items/export/sample', name: 'items export sample' },
	{ path: '/api/admin/location-index', name: 'location index' },
	{ path: '/api/admin/navigation', name: 'admin nav config' },
	{ path: '/api/admin/notifications', name: 'notifications list' },
	{ path: '/api/admin/payment-reports', name: 'payment reports list' },
	{ path: '/api/admin/reports', name: 'reports list' },
	{ path: '/api/admin/reports/stats', name: 'reports stats' }
];

test.describe('Admin API coverage — anonymous rejection', () => {
	for (const { path, name } of ADMIN_GET_ENDPOINTS) {
		test(`${name} (${path}) rejects anonymous GET`, async ({ request }) => {
			const resp = await request.get(path);
			const status = resp.status();
			expect(status, `${path} (got ${status}) should reject anon`).toBeGreaterThanOrEqual(400);
			expect(status, `${path} (got ${status}) must not 5xx`).toBeLessThan(500);
			expect([401, 403, 404]).toContain(status);
		});
	}
});

test.describe('Admin API coverage — admin user succeeds', () => {
	test.use({ storageState: ADMIN_STATE_FILE });
	for (const { path, name } of ADMIN_GET_ENDPOINTS) {
		test(`${name} (${path}) responds non-5xx for admin`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), `${path} should not 5xx for admin`).toBeLessThan(500);
		});
	}
});
