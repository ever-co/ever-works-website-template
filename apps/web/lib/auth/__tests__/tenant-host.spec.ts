import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { tenantHostFromHeaders } from '../tenant-host';

/**
 * Spec 047 / Q-047c — which host tenant resolution reads.
 *
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * `proxy.ts` injects `x-tenant-domain` (the request's own `Host`, copied
 * verbatim) for every route its matcher covers — and that matcher deliberately
 * excludes `/api`. So every session-free API route, `POST /api/auth/2fa/resend`
 * and NextAuth's own `/api/auth/callback/credentials` among them, saw no tenant
 * header at all and `getTenantId()` fell through to `TENANT_ID` / the first
 * active tenant. On a host-routed multi-tenant deployment that means looking an
 * account up in the wrong tenant, finding nothing, and silently issuing no code.
 */

/** Minimal stand-in for the `Headers` object `next/headers` returns. */
function headersOf(entries: Record<string, string>) {
	const lower = new Map(Object.entries(entries).map(([key, value]) => [key.toLowerCase(), value]));
	return { get: (name: string) => lower.get(name.toLowerCase()) ?? null };
}

describe('tenantHostFromHeaders', () => {
	it('CONTROL: prefers the proxy-injected header when the middleware ran', () => {
		assert.equal(
			tenantHostFromHeaders(headersOf({ 'x-tenant-domain': 'acme.example.com', host: 'internal:3000' })),
			'acme.example.com'
		);
	});

	it('🛑 falls back to the request host on /api, where no middleware runs', () => {
		assert.equal(tenantHostFromHeaders(headersOf({ host: 'acme.example.com' })), 'acme.example.com');
	});

	it('an empty or whitespace-only injected header does not mask the host', () => {
		assert.equal(
			tenantHostFromHeaders(headersOf({ 'x-tenant-domain': '', host: 'acme.example.com' })),
			'acme.example.com'
		);
		assert.equal(
			tenantHostFromHeaders(headersOf({ 'x-tenant-domain': '   ', host: 'acme.example.com' })),
			'acme.example.com'
		);
	});

	it('trims surrounding whitespace from either source', () => {
		assert.equal(tenantHostFromHeaders(headersOf({ 'x-tenant-domain': ' acme.example.com ' })), 'acme.example.com');
		assert.equal(tenantHostFromHeaders(headersOf({ host: '\tacme.example.com\n' })), 'acme.example.com');
	});

	it('keeps the port, which subdomain routing strips downstream', () => {
		assert.equal(tenantHostFromHeaders(headersOf({ host: 'acme.localhost:3000' })), 'acme.localhost:3000');
	});

	it('returns null when neither header is present, so the chain falls through', () => {
		// It can never invent a tenant: the value is only ever used to look up an
		// existing `tenant` row, and null resolves to the previous behaviour.
		assert.equal(tenantHostFromHeaders(headersOf({})), null);
		assert.equal(tenantHostFromHeaders(headersOf({ host: '' })), null);
		assert.equal(tenantHostFromHeaders({ get: () => undefined }), null);
	});
});
