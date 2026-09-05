/**
 * Which host a request is addressed to, for tenant routing.
 *
 * Its own module — with **no imports at all** — so the rule can be unit
 * tested (`apps/web-e2e/tests/unit/tenant-host.spec.ts`) without dragging
 * in `next/headers`, the database or the config service that
 * `lib/auth/tenant.ts` needs.
 */

/** The header a `Headers`-like object must answer. */
export interface HeaderReader {
	get(name: string): string | null | undefined;
}

/**
 * `x-tenant-domain` first — that is what `proxy.ts` injects (from the
 * request's own `host`) for every route the middleware matcher covers.
 *
 * `host` second, and this fallback is load-bearing rather than defensive:
 * the matcher deliberately EXCLUDES `/api`, so no `/api` route ever sees
 * the injected header. Without it every session-free API route — `POST
 * /api/auth/2fa/resend` and NextAuth's own
 * `/api/auth/callback/credentials` among them — fell straight through to
 * `TENANT_ID` or the first active tenant, so on a host-routed multi-tenant
 * deployment it looked the account up in the wrong tenant and (correctly,
 * per the enumeration-safe envelope) reported nothing at all.
 *
 * This trusts no header the proxy did not already trust: `x-tenant-domain`
 * IS the client's `Host`, copied verbatim by `proxy.ts`. And it cannot
 * invent a tenant — the value is only ever used to look up an EXISTING
 * `tenant` row, so an unrecognised host resolves to nothing and the
 * resolution chain falls through exactly as it did before.
 */
export function tenantHostFromHeaders(headers: HeaderReader): string | null {
	const injected = headers.get('x-tenant-domain')?.trim();
	if (injected) return injected;

	const host = headers.get('host')?.trim();
	return host || null;
}
