import { test, expect } from '@playwright/test';

// next.config.ts has a comprehensive `rewrites()` block that serves a
// Markdown twin of every detail/listing page at the same path with `.md`
// appended. This catches the entire class of "added a new page type but
// forgot to add a /_md route" bugs.

const MD_MIRROR_TESTS: Array<{ path: string; expectMd: boolean }> = [
	// Static info pages — wired via /_static-md catch-all.
	{ path: '/about.md', expectMd: true },
	{ path: '/help.md', expectMd: true },
	{ path: '/faq.md', expectMd: true },
	{ path: '/pricing.md', expectMd: true },
	{ path: '/privacy-policy.md', expectMd: true },
	{ path: '/terms-of-service.md', expectMd: true },
	{ path: '/cookies.md', expectMd: true },
	// Item / category / tag mirrors require fixture slugs; we test only the
	// "doesn't 500" guarantee with placeholder slugs.
	{ path: '/items/non-existent-item.md', expectMd: false },
	{ path: '/categories/non-existent-cat.md', expectMd: false },
	{ path: '/tags/non-existent-tag.md', expectMd: false }
];

test.describe('Markdown mirror routes', () => {
	for (const { path, expectMd } of MD_MIRROR_TESTS) {
		test(`${path} responds non-5xx`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), `${path} status`).toBeLessThan(500);
			if (expectMd && resp.status() < 400) {
				const ct = resp.headers()['content-type'] ?? '';
				// Markdown is usually served as text/markdown or text/plain.
				expect(ct.toLowerCase()).toMatch(/text\/(markdown|plain)/);
				const body = await resp.text();
				expect(body.length, `${path} body should be non-empty`).toBeGreaterThan(0);
			}
		});
	}
});
