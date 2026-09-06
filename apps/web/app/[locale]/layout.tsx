import type { Metadata } from 'next';
import { Providers } from './providers';
import { getCachedConfig } from '@/lib/content';
import { getCachedContentSignals } from '@/lib/content-signals';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import { Toaster } from 'sonner';
import { PHProvider } from './integration/posthog/provider';
import PostHogPageView from './integration/posthog/page-view';
import { Locale } from '@/lib/constants';
import { Suspense } from 'react';
import Script from 'next/script';
import { ConditionalLayout } from '@/components/layout/conditional-layout';
import { siteConfig } from '@/lib/config';
import { getSiteName, getSiteTagline, getSiteDescription } from '@/lib/seo/site-identity';
import { generateOrganizationSchema, generateWebSiteSchema } from '@/lib/seo/schema';
import { SpeedInsights } from './integration/speed-insights';
import { Analytics, ThirdPartyAnalytics } from './integration/analytics';
import { SettingsProvider } from '@/components/providers/settings-provider';
import { SettingsModalProvider } from '@/components/providers/settings-modal-provider';
import { SettingsModal } from '@/components/settings-modal';
import { AiChatMount } from '@/components/ai/AiChatMount';
import { NavigationLoadingBar } from '@/components/navigation-loading-bar';
import {
	getCategoriesEnabled,
	getTagsEnabled,
	getCompaniesEnabled,
	getSurveysEnabled,
	getHeaderSubmitEnabled,
	getHeaderPricingEnabled,
	getHeaderLayoutEnabled,
	getHeaderLanguageEnabled,
	getHeaderThemeEnabled,
	getHeaderMoreEnabled,
	getHeaderSettingsEnabled,
	getHeaderMapEnabled,
	getHeaderLayoutDefault,
	getHeaderPaginationDefault,
	getHeaderThemeDefault,
	getLocationSettings,
	getFooterSubscribeEnabled,
	getFooterVersionEnabled,
	getFooterThemeSelectorEnabled,
	getAnalyticsSettings,
	getLocaleDetection
} from '@/lib/utils/settings';
import { LocaleSuggestionBanner } from '@/components/i18n/locale-suggestion-banner';
import { getBaseUrl } from '@/lib/utils/url-cleaner';
import { generateHreflangAlternates } from '@/lib/seo/hreflang';
import { DEFAULT_LOCALE } from '@/lib/constants';
import { analyticsConfig } from '@/lib/config/config-service';

const appUrl = getBaseUrl();

export const dynamicParams = true;

export async function generateStaticParams() {
	return [{ locale: 'en' }];
}

/**
 * Generate metadata dynamically using siteConfig
 */
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
	const { locale } = await params;
	const siteName = await getSiteName();
	const siteTitle = `${siteName} | ${await getSiteTagline()}`;
	const siteDescription = await getSiteDescription();
	return {
		metadataBase: new URL(appUrl),
		title: siteTitle,
		description: siteDescription,
		keywords: siteConfig.keywords,
		// Override the root layout's `robots: 'noindex'` (which is
		// scoped to `not-found.tsx`) so public listing/detail pages
		// are indexable by default. Individual pages can still set
		// their own `robots` via their own `generateMetadata`.
		robots: { index: true, follow: true },
		openGraph: {
			title: siteTitle,
			description: siteDescription,
			type: 'website',
			siteName
		},
		alternates: {
			canonical: locale === DEFAULT_LOCALE ? '/' : `/${locale}`,
			languages: generateHreflangAlternates('/')
			// NOTE: feed autodiscovery <link rel="alternate"> tags are emitted
			// directly in JSX below — placing them in `alternates.types` here
			// would be replaced by any child page that defines its own
			// `alternates` (Next.js does not deep-merge `alternates`).
		}
	};
}

export default async function RootLayout({
	children,
	params
}: Readonly<{
	children: React.ReactNode;
	params: Promise<{ locale: string }>;
}>) {
	const { locale } = await params;

	if (!routing.locales.includes(locale as Locale)) {
		notFound();
	}

	// Ensure server-side i18n helpers use the current route locale
	// Next.js 16 / next-intl: unstable_setRequestLocale renamed to setRequestLocale
	setRequestLocale(locale);

	const config = await getCachedConfig();
	const messages = await getMessages();

	// Read settings server-side for instant availability
	const categoriesEnabled = getCategoriesEnabled();
	const tagsEnabled = getTagsEnabled();
	const companiesEnabled = getCompaniesEnabled();
	const surveysEnabled = getSurveysEnabled();

	const { hasCategories, hasTags, hasCollections, hasComparisons, hasPosts } =
		await getCachedContentSignals(locale);

	const hasGlobalSurveys = false;

	const headerSettings = {
		submitEnabled: getHeaderSubmitEnabled(),
		pricingEnabled: getHeaderPricingEnabled(),
		layoutEnabled: getHeaderLayoutEnabled(),
		languageEnabled: getHeaderLanguageEnabled(),
		themeEnabled: getHeaderThemeEnabled(),
		moreEnabled: getHeaderMoreEnabled(),
		settingsEnabled: getHeaderSettingsEnabled(),
		mapEnabled: getHeaderMapEnabled(),
		layoutDefault: getHeaderLayoutDefault(),
		paginationDefault: getHeaderPaginationDefault(),
		themeDefault: getHeaderThemeDefault()
	};

	const footerSettings = {
		subscribeEnabled: getFooterSubscribeEnabled(),
		versionEnabled: getFooterVersionEnabled(),
		themeSelectorEnabled: getFooterThemeSelectorEnabled()
	};

	// Read location settings server-side
	const locationSettings = getLocationSettings();

	// Locale-detection strategy. `client-banner` (default) shows a small
	// dismissible banner suggesting the visitor's browser language while
	// keeping `/` edge-cacheable. `none` disables auto-detection entirely.
	// `server-redirect` (Pattern C) is opted into via the `LOCALE_DETECTION_MODE`
	// env var, not this YAML setting. See `docs/performance/locale-detection.md`
	// and Spec 019.
	const localeDetection = getLocaleDetection();

	// Generate structured data schemas for SEO
	const organizationSchema = generateOrganizationSchema();
	const websiteSchema = generateWebSiteSchema(locale, { name: await getSiteName(), description: await getSiteDescription() });

	// Determine if the current locale is RTL
	return (
		<>
			{/*
				Feed autodiscovery. React + Next.js hoists these <link>
				tags into <head> automatically. Emitted in JSX (not via
				`alternates.types`) because Next.js replaces — never
				deep-merges — `alternates` when a child page defines it.
			*/}
			<link rel="alternate" type="application/rss+xml" href={`${appUrl}/rss.xml`} />
			<link rel="alternate" type="application/atom+xml" href={`${appUrl}/atom.xml`} />
			<link rel="alternate" type="application/feed+json" href={`${appUrl}/feed.json`} />
			{/* Organization and WebSite JSON-LD schemas for Knowledge Panel and search features */}
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(organizationSchema).replace(/</g, '\\u003c')
				}}
			/>
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(websiteSchema).replace(/</g, '\\u003c')
				}}
			/>
			<Script src="https://assets.lemonsqueezy.com/lemon.js" strategy="afterInteractive" />
			<PHProvider>
				<Suspense fallback={null}>
					<PostHogPageView />
				</Suspense>
				<NextIntlClientProvider messages={messages}>
					<Toaster position="bottom-right" richColors />
					<SettingsProvider
						categoriesEnabled={categoriesEnabled}
						tagsEnabled={tagsEnabled}
						companiesEnabled={companiesEnabled}
						surveysEnabled={surveysEnabled}
						hasCategories={hasCategories}
						hasTags={hasTags}
						hasCollections={hasCollections}
						hasComparisons={hasComparisons}
						hasPosts={hasPosts}
						hasGlobalSurveys={hasGlobalSurveys}
						headerSettings={headerSettings}
						footerSettings={footerSettings}
						locationSettings={locationSettings}
					>
						<SettingsModalProvider>
							<Providers config={config}>
								{/* Global navigation loading bar */}
								<NavigationLoadingBar />
								<ConditionalLayout>{children}</ConditionalLayout>
								{/* Settings Modal - Shared by header button */}
								<SettingsModal />
								{/* AI chat launcher (Spec 023). Returns null when `aiChat.enabled` is false. */}
								<AiChatMount locale={locale} />
								{/* Locale suggestion banner — Pattern A from Spec 019. */}
								{localeDetection === 'client-banner' && <LocaleSuggestionBanner />}
							</Providers>
						</SettingsModalProvider>
					</SettingsProvider>
				</NextIntlClientProvider>
			</PHProvider>
			{/*
				Vercel Speed Insights Integration
				- Automatically detects Vercel environment and Speed Insights availability
				- Gracefully degrades when not enabled or not on a paid plan
				- Supports environment variable configuration (NEXT_PUBLIC_SPEED_INSIGHTS_ENABLED, NEXT_PUBLIC_SPEED_INSIGHTS_SAMPLE_RATE)
				- See: app/[locale]/integration/speed-insights/
			*/}
			<Suspense fallback={null}>
				<SpeedInsights />
			</Suspense>
			{/*
				Vercel Analytics Integration
				- Automatically detects Vercel environment and Analytics availability
				- Gracefully degrades when not enabled or not on a paid plan
				- Supports environment variable configuration (NEXT_PUBLIC_ANALYTICS_ENABLED, NEXT_PUBLIC_ANALYTICS_SAMPLE_RATE)
				- See: app/[locale]/integration/analytics/
			*/}
			<Suspense fallback={null}>
				<Analytics />
			</Suspense>
			{/* Merge environment config with UI-based settings */}
			{(() => {
				const uiSettings = getAnalyticsSettings();
				const mergedConfig = { ...analyticsConfig };
				
				// Deep merge known providers to preserve env vars (like IDs) if only toggled in UI
				const providers = ['googleAnalytics', 'plausible', 'dataFast', 'jitsu', 'segment', 'posthog', 'sentry', 'recaptcha'];
				providers.forEach(p => {
					if ((uiSettings as any)[p]) {
						(mergedConfig as any)[p] = { 
							...((analyticsConfig as any)[p] || {}), 
							...(uiSettings as any)[p] 
						};
					}
				});

				return <ThirdPartyAnalytics config={mergedConfig} />;
			})()}
		</>
	);
}
