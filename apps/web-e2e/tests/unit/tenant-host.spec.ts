import { test, expect } from '@playwright/test';
import { tenantHostFromHeaders } from '../../../web/lib/auth/tenant-host';

/**
 * Unit coverage for tenant host selection.
 *
 * `proxy.ts` injects `x-tenant-domain` (the request's own `Host`, copied
 * verbatim) for every route its matcher covers — and that matcher
 * deliberately excludes `/api`. So every session-free API route, including
 * `POST /api/auth/2fa/resend` and NextAuth's own
 * `/api/auth/callback/credentials`, saw NO tenant header at all and fell
 * through to `TENANT_ID` / the first active tenant. On a host-routed
 * multi-tenant deployment that means looking an account up in the wrong
 * tenant, finding nothing, and silently issuing no code.
 *
 * The `host` fallback is what closes that. These tests pin it, and pin that
 * it never overrides the injected header.
 */

/** Minimal stand-in for the `Headers` object `next/headers` returns. */
function headersOf(entries: Record<string, string>) {
	const lower = new Map(Object.entries(entries).map(([key, value]) => [key.toLowerCase(), value]));
	return { get: (name: string) => lower.get(name.toLowerCase()) ?? null };
}

test.describe('Tenant host resolution', () => {
	test('prefers the proxy-injected header when the middleware ran', () => {
		expect(
			tenantHostFromHeaders(headersOf({ 'x-tenant-domain': 'acme.example.com', host: 'internal:3000' }))
		).toBe('acme.example.com');
	});

	test('falls back to the request host on /api, where no middleware runs', () => {
		// The regression this exists for: with only `x-tenant-domain` consulted
		// this returned null, tenant resolution fell through to the default
		// tenant, and a resend for a member of `acme` found no account at all.
		expect(tenantHostFromHeaders(headersOf({ host: 'acme.example.com' }))).toBe('acme.example.com');
	});

	test('an empty or whitespace-only injected header does not mask the host', () => {
		expect(tenantHostFromHeaders(headersOf({ 'x-tenant-domain': '', host: 'acme.example.com' }))).toBe(
			'acme.example.com'
		);
		expect(tenantHostFromHeaders(headersOf({ 'x-tenant-domain': '   ', host: 'acme.example.com' }))).toBe(
			'acme.example.com'
		);
	});

	test('trims surrounding whitespace from either source', () => {
		expect(tenantHostFromHeaders(headersOf({ 'x-tenant-domain': ' acme.example.com ' }))).toBe('acme.example.com');
		expect(tenantHostFromHeaders(headersOf({ host: '\tacme.example.com\n' }))).toBe('acme.example.com');
	});

	test('keeps the port, which subdomain routing strips downstream', () => {
		expect(tenantHostFromHeaders(headersOf({ host: 'acme.localhost:3000' }))).toBe('acme.localhost:3000');
	});

	test('returns null when neither header is present, so the chain falls through', () => {
		expect(tenantHostFromHeaders(headersOf({}))).toBeNull();
		expect(tenantHostFromHeaders(headersOf({ host: '' }))).toBeNull();
		expect(tenantHostFromHeaders({ get: () => undefined })).toBeNull();
	});
});
