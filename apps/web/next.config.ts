import * as path from 'path';
import { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { withSentryConfig } from '@sentry/nextjs';
import { sentryWebpackPluginOptions } from './sentry.config';
import { generateImageRemotePatterns } from './lib/utils/image-domains';
const isDev = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
	turbopack: {
		root: path.join(__dirname, '../..')
	},
	// `standalone` produces a self-contained server bundle for Docker/k8s targets
	// (the project Dockerfile sets `STANDALONE_BUILD=true`). Vercel uses its own
	// serverless packaging and does not need `standalone`; leaving it on there
	// inflates the build with no benefit. See Spec 019.
	output: process.env.STANDALONE_BUILD === 'true' ? 'standalone' : undefined,
	outputFileTracingRoot: path.join(__dirname, '../..'),
	serverExternalPackages: ['postgres', 'bcryptjs', 'drizzle-orm'],
	experimental: {
		optimizePackageImports: ['@heroui/react', 'lucide-react']
	},
	trailingSlash: false,
	generateEtags: false,
	poweredByHeader: false,
	staticPageGenerationTimeout: 180,
	webpack: (config, { dev, isServer }) => {
		config.ignoreWarnings = [
			{ module: /@supabase\/realtime-js/ },
			{ module: /@supabase\/supabase-js/ },
			{ module: /bcryptjs/ },
			{ message: /bcryptjs/ },
			{ module: /postgres/ },
			{ message: /postgres/ },
			{ module: /stripe/ },
			{ message: /stripe/ }
		];

		// Suppress verbose output during build in CI
		if (process.env.CI || process.env.VERCEL) {
			config.infrastructureLogging = {
				level: 'error'
			};
		}

		// Exclude .content/ directory from webpack watching in development
		// Prevents rebuilds when content files change (220+ markdown files)
		if (dev) {
			config.watchOptions = {
				...config.watchOptions,
				ignored: ['**/node_modules/**', '**/.git/**', '**/.content/**']
			};
		}

		return config;
	},
	images: {
		remotePatterns: generateImageRemotePatterns(),
		// Allow SVG images
		dangerouslyAllowSVG: true,
		contentDispositionType: 'attachment',
		contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
		// Keep optimization enabled for better performance
		unoptimized: false
	},
	async rewrites() {
		// .md mirror rewrites: every public detail/listing page also serves a
		// Markdown twin at the same path with `.md` appended, so AI agents
		// (ChatGPT, Claude, Perplexity) can consume the canonical content
		// without parsing HTML. Internally each `<path>.md` is dispatched to
		// a `/_md` sibling route handler that renders Markdown from the same
		// data layer the HTML page uses.
		const mdMirrors = [
			// Items
			{ source: '/:locale([a-z]{2})/items/:slug.md', destination: '/:locale/items/:slug/_md' },
			{ source: '/items/:slug.md', destination: '/items/:slug/_md' },
			// Categories — single
			{ source: '/:locale([a-z]{2})/categories/:category.md', destination: '/:locale/categories/:category/_md' },
			{ source: '/categories/:category.md', destination: '/categories/:category/_md' },
			// Categories — paginated/multi-segment (no .md inside the catch-all to keep things simple)
			// Tags — single
			{ source: '/:locale([a-z]{2})/tags/:tag.md', destination: '/:locale/tags/:tag/_md' },
			{ source: '/tags/:tag.md', destination: '/tags/:tag/_md' },
			// Collections
			{ source: '/:locale([a-z]{2})/collections/:slug.md', destination: '/:locale/collections/:slug/_md' },
			{ source: '/collections/:slug.md', destination: '/collections/:slug/_md' },
			// Comparisons
			{ source: '/:locale([a-z]{2})/comparisons/:slug.md', destination: '/:locale/comparisons/:slug/_md' },
			{ source: '/comparisons/:slug.md', destination: '/comparisons/:slug/_md' },
			// Pages (about, privacy-policy, etc — anything under /pages and the static info pages too)
			{ source: '/:locale([a-z]{2})/pages/:slug.md', destination: '/:locale/pages/:slug/_md' },
			{ source: '/pages/:slug.md', destination: '/pages/:slug/_md' },
			// Static info pages — about, help, pricing, privacy-policy, terms-of-service, cookies, faq
			// served via a dedicated catch-all in /_static-md. Keep this list in
			// sync with ALLOWED_STATIC_SLUGS in app/[locale]/_static-md/[slug]/route.ts.
			{ source: '/:locale([a-z]{2})/:staticSlug(about|help|pricing|privacy-policy|terms-of-service|cookies|faq).md', destination: '/:locale/_static-md/:staticSlug' },
			{ source: '/:staticSlug(about|help|pricing|privacy-policy|terms-of-service|cookies|faq).md', destination: '/_static-md/:staticSlug' }
		];

		return [
			...mdMirrors,
			{
				source: '/:path',
				destination: '/:path/discover/1'
			},
			{
				source: '/:path/discover',
				destination: '/:path/discover/1'
			}
		];
	},
	async headers() {
		return [
			{
				source: '/(.*)',
				headers: [
					{
						key: 'X-Content-Type-Options',
						value: 'nosniff'
					},
					{
						key: 'X-Frame-Options',
						value: 'DENY'
					},
					{
						key: 'Referrer-Policy',
						value: 'strict-origin-when-cross-origin'
					},
					{
						key: 'X-DNS-Prefetch-Control',
						value: 'on'
					},
					{
						key: 'Strict-Transport-Security',
						value: 'max-age=63072000; includeSubDomains; preload'
					},
					{
						key: 'Content-Security-Policy',
						value: `default-src 'self'; script-src 'self' ${isDev ? "'unsafe-eval'" : ''} 'unsafe-inline' https://assets.lemonsqueezy.com https://js.stripe.com https://www.googletagmanager.com https://plausible.io https://cdn.datafast.io https://datafa.st https://t.jitsu.com https://*.d.jitsu.com https://cdn.segment.com https://us.i.posthog.com https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: https://www.google-analytics.com https://stats.g.doubleclick.net; font-src 'self'; connect-src 'self' https: https://www.google-analytics.com https://stats.g.doubleclick.net https://plausible.io https://datafa.st https://t.jitsu.com https://*.d.jitsu.com https://api.segment.io https://us.i.posthog.com https://*.i.posthog.com; frame-src 'self' https://assets.lemonsqueezy.com https://js.stripe.com https://hooks.stripe.com; frame-ancestors 'none';`
							.replace(/\s+/g, ' ')
							.trim()
					}
				]
			},
			{
				// Scalar API reference. `/docs` embeds it in a same-origin <iframe> and the
				// @scalar/nextjs-api-reference handler loads its browser bundle from jsDelivr.
				// The global policy above (X-Frame-Options: DENY, frame-ancestors 'none', no
				// CDN in script-src) blocked both, so /docs rendered an empty blocked frame and
				// /api/reference a blank page. Next.js applies matching entries in order and
				// the last value wins per header key, so this entry narrows the policy for
				// this one route only: same-origin framing + the Scalar CDN.
				source: '/api/reference',
				headers: [
					{
						key: 'X-Frame-Options',
						value: 'SAMEORIGIN'
					},
					{
						key: 'Content-Security-Policy',
						value: `default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' data: https://cdn.jsdelivr.net https://fonts.gstatic.com; connect-src 'self' https:; worker-src 'self' blob:; frame-ancestors 'self';`
							.replace(/\s+/g, ' ')
							.trim()
					}
				]
			}
		];
	}
} satisfies NextConfig;

// Next.js 16: Specify the path to the next-intl config file
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

// Apply plugins in the correct order
const configWithIntl = withNextIntl(nextConfig);

// Sentry configuration with type casting to avoid TypeScript errors
const finalConfig = withSentryConfig(configWithIntl, sentryWebpackPluginOptions) as NextConfig;

export default finalConfig;
