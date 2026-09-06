import { test, expect } from '@playwright/test';

const LOCALES = ['en', 'fr', 'es', 'de'];
const PATHS = [
	'/about',
	'/help',
	'/faq',
	'/docs',
	'/privacy-policy',
	'/terms-of-service',
	'/cookies'
];

test.describe('Static info pages locale prefix', () => {
	for (const loc of LOCALES) {
		for (const p of PATHS) {
			test(`/${loc}${p} non-5xx`, async ({ request }) => {
				const resp = await request.get(`/${loc}${p}`);
				expect(resp.status(), `/${loc}${p}`).toBeLessThan(500);
			});
		}
	}
});
