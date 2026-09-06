/**
 * Locale identifiers, in a module with **no imports of its own**.
 *
 * `next.config.ts` needs `DEFAULT_LOCALE` to build the `.md` mirror rewrite
 * destinations for the unprefixed URLs (`/about.md` → `/en/static-md/about`).
 * It is evaluated outside the app's module graph, where the `@/…` alias that
 * `lib/constants.ts` uses does not resolve — hence this dependency-free file.
 *
 * `lib/constants.ts` re-exports `DEFAULT_LOCALE`, `LOCALES` and `Locale`, so
 * application code keeps importing them from there and nothing has to know
 * this file exists.
 */

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
