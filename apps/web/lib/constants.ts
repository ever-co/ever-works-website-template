import { getNextPublicEnv } from '@/env-config';
import { clientEnv } from '@/lib/config/client';

// ============================================
// LOCALIZATION
// ============================================
export const DEFAULT_LOCALE = 'en';
export const LOCALES = [
	'en',
	'fr',
	'es',
	'de',
	'zh',
	'ar',
	'he',
	'ru',
	'uk',
	'pt',
	'it',
	'ja',
	'ko',
	'nl',
	'pl',
	'tr',
	'vi',
	'th',
	'hi',
	'id',
	'bg'
] as const;
export type Locale = (typeof LOCALES)[number];

/** Locales that use right-to-left text direction */
export const RTL_LOCALES: readonly Locale[] = ['ar', 'he'] as const;

// ============================================
// BRANDING & UI
// ============================================
export const LOGO_URL = '/logo-ever-work-3.png';

// ============================================
// API & BACKEND
// ============================================
// API_BASE_URL: Base URL for internal website API (Next.js API routes)
// Note: For Ever Works Platform API integration, use PLATFORM_API_URL and PLATFORM_API_SECRET_TOKEN
// environment variables (see app/api/extract/route.ts and lib/api/server-api-client.ts)
export const API_BASE_URL = getNextPublicEnv('NEXT_PUBLIC_API_BASE_URL');

// ============================================
// AUTHENTICATION & SECURITY
// ============================================
export const COOKIE_SECRET = getNextPublicEnv('COOKIE_SECRET');
export const JWT_ACCESS_TOKEN_EXPIRES_IN = getNextPublicEnv('JWT_ACCESS_TOKEN_EXPIRES_IN');
export const JWT_REFRESH_TOKEN_EXPIRES_IN = getNextPublicEnv('JWT_REFRESH_TOKEN_EXPIRES_IN');

// ============================================
// ANALYTICS - POSTHOG
// ============================================
export const POSTHOG_KEY = getNextPublicEnv('NEXT_PUBLIC_POSTHOG_KEY', process.env.NEXT_PUBLIC_POSTHOG_KEY);
export const POSTHOG_HOST = getNextPublicEnv('NEXT_PUBLIC_POSTHOG_HOST', process.env.NEXT_PUBLIC_POSTHOG_HOST);
export const POSTHOG_ENABLED = POSTHOG_KEY?.value && POSTHOG_HOST?.value;
export const POSTHOG_DEBUG = getNextPublicEnv('POSTHOG_DEBUG');

// PostHog Features
export const POSTHOG_SESSION_RECORDING_ENABLED = getNextPublicEnv('POSTHOG_SESSION_RECORDING_ENABLED', process.env.POSTHOG_SESSION_RECORDING_ENABLED || 'true');
export const POSTHOG_AUTO_CAPTURE = getNextPublicEnv('POSTHOG_AUTO_CAPTURE', process.env.POSTHOG_AUTO_CAPTURE || 'false');

// PostHog Sampling
export const POSTHOG_SAMPLE_RATE = clientEnv.isProduction ? 0.1 : 1.0;
export const POSTHOG_SESSION_RECORDING_SAMPLE_RATE = clientEnv.isProduction ? 0.1 : 1.0;

// ============================================
// ERROR TRACKING - SENTRY
// ============================================
export const SENTRY_DSN = getNextPublicEnv('NEXT_PUBLIC_SENTRY_DSN', process.env.NEXT_PUBLIC_SENTRY_DSN);
export const SENTRY_ENABLE_DEV = getNextPublicEnv('SENTRY_ENABLE_DEV', process.env.SENTRY_ENABLE_DEV);
export const SENTRY_DEBUG = getNextPublicEnv('SENTRY_DEBUG', process.env.SENTRY_DEBUG);
export const SENTRY_ENABLED =
	SENTRY_DSN?.value && (SENTRY_ENABLE_DEV?.value === 'true' || clientEnv.isProduction);

// ============================================
// EXCEPTION TRACKING - UNIFIED
// ============================================
export const EXCEPTION_TRACKING_PROVIDER = getNextPublicEnv('EXCEPTION_TRACKING_PROVIDER', process.env.EXCEPTION_TRACKING_PROVIDER || 'both');
export const POSTHOG_EXCEPTION_TRACKING = getNextPublicEnv('POSTHOG_EXCEPTION_TRACKING', process.env.POSTHOG_EXCEPTION_TRACKING || 'true');
export const SENTRY_EXCEPTION_TRACKING = getNextPublicEnv('SENTRY_EXCEPTION_TRACKING', process.env.SENTRY_EXCEPTION_TRACKING || 'true');

// ============================================
// RECAPTCHA
// ============================================
export const RECAPTCHA_SITE_KEY = getNextPublicEnv('NEXT_PUBLIC_RECAPTCHA_SITE_KEY');
export const RECAPTCHA_SECRET_KEY = getNextPublicEnv('RECAPTCHA_SECRET_KEY');

// ============================================
// PAYMENT & SUBMISSION (re-exported from constants/payment for backwards compatibility)
// ============================================
export {
	PaymentFlow,
	PaymentStatus,
	PaymentInterval,
	PaymentPlan,
	PaymentMethod,
	PaymentCurrency,
	PaymentProvider,
	MANUAL_PAYMENT_PROVIDER,
	SubmissionStatus,
	PAYMENT_PLAN_NAMES,
	SponsorAdPricing,
	type ExceptionTrackingProvider,
	type PricingProvider,
} from './constants/payment';

// ============================================
// ANALYTICS (re-exported from constants/analytics)
// ============================================
export {
	VIEWER_COOKIE_NAME,
	VIEWER_COOKIE_MAX_AGE,
} from './constants/analytics';
