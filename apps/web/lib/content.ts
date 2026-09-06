'use server';

import 'server-only';
import yaml from 'yaml';
import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import { parse } from 'date-fns';
import { dirExists, fsExists, getContentPath } from './lib';
import { getContentConfigPaths, mergeConfigObjects, PRIMARY_CONTENT_CONFIG_FILENAME } from './content-config-file';
import { parseWorksPricingConfig } from './config/schemas/works-pricing.schema';
import { unstable_cache } from 'next/cache';
import { PaymentInterval, type PricingProvider } from './constants';
import { CACHE_TAGS, CACHE_TTL as CONTENT_CACHE_TTL, DATA_CACHE_MAX_ITEMS } from './cache-config';
import { Collection } from '@/types/collection';
import type { ComparisonData, ComparisonDetail, ComparisonDimension } from '@/types/comparison';
import type { ItemLocationData } from '@/lib/types/item';
import { z } from 'zod';

// Security utility functions
function validateLanguageCode(lang: string): boolean {
	// Only allow alphanumeric characters, hyphens, and underscores
	const validLangPattern = /^[a-zA-Z0-9_-]+$/;
	return validLangPattern.test(lang) && lang.length <= 10;
}

function sanitizeFilename(filename: string): string {
	// Use only the basename to prevent directory traversal
	const sanitized = path.basename(filename);

	// Additional validation
	if (sanitized.includes('..') || sanitized.includes('/') || sanitized.includes('\\')) {
		throw new Error('Invalid filename: contains dangerous characters');
	}

	return sanitized;
}

function validatePath(filepath: string, basePath: string): void {
	const resolvedPath = path.resolve(filepath);
	const resolvedBase = path.resolve(basePath);

	if (!resolvedPath.startsWith(resolvedBase + path.sep) && resolvedPath !== resolvedBase) {
		throw new Error('Invalid file path: outside of allowed directory');
	}
}

function isNodeErrorWithCode(error: unknown, code: string): error is NodeJS.ErrnoException {
	return error instanceof Error && 'code' in error && error.code === code;
}

const missingItemWarnings = new Set<string>();
const missingPageWarnings = new Set<string>();

function ensureTrailingSeparator(p: string): string {
	return p.endsWith(path.sep) ? p : p + path.sep;
}

async function resolveItemDataFilename(base: string, preferredFilename: string): Promise<string | null> {
	if (await fsExists(path.join(base, preferredFilename))) {
		return preferredFilename;
	}

	try {
		const entries = await fsp.readdir(base, { withFileTypes: true });
		const yamlFiles = entries
			.filter((entry) => entry.isFile() && /\.(ya?ml)$/i.test(entry.name))
			.map((entry) => entry.name);

		const primaryYaml = yamlFiles.find((name) => !path.basename(name, path.extname(name)).includes('.'));
		return primaryYaml ?? yamlFiles[0] ?? null;
	} catch (error) {
		if (isNodeErrorWithCode(error, 'ENOENT')) {
			return null;
		}
		throw error;
	}
}

async function safeReadFile(filepath: string, basePath: string): Promise<string> {
	validatePath(filepath, basePath);
	const resolvedPath = path.resolve(basePath, filepath);
	const [realResolvedPath, realBasePath] = await Promise.all([
		fs.promises.realpath(resolvedPath),
		fs.promises.realpath(path.resolve(basePath))
	]);
	const baseWithSep = ensureTrailingSeparator(realBasePath);
	if (!realResolvedPath.startsWith(baseWithSep) && realResolvedPath !== realBasePath) {
		throw new Error('Invalid file path: outside of allowed directory');
	}
	return fs.promises.readFile(realResolvedPath, { encoding: 'utf8' });
}

/**
 * Validates a URL to ensure it's safe (http/https or relative path).
 * Blocks javascript:, data:, vbscript: and other dangerous protocols.
 */
function isValidUrl(url: string): boolean {
	const trimmed = url.trim();
	// Allow relative paths (starting with /)
	if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
		return true;
	}
	// Allow only http and https
	return trimmed.startsWith('http://') || trimmed.startsWith('https://');
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

// Cap concurrent file-reads to avoid EMFILE on serverless runtimes (Vercel/Lambda),
// which have far smaller fd budgets than typical local machines.
//
// 2026-05-10: lowered Vercel default 16 → 8 after observing repeated EMFILE
// in production under crawler load. The per-call cap is one half of the
// safety; the other half is the in-flight dedup in fetchItems below.
// See `docs/performance/content-loading.md`.
const FS_CONCURRENCY = (() => {
	const raw = Number.parseInt(process.env.CONTENT_FS_CONCURRENCY ?? '', 10);
	if (Number.isFinite(raw) && raw > 0) return raw;
	return process.env.VERCEL === '1' ? 8 : 64;
})();

/**
 * Threshold above which `fetchItems` refuses to return a partial listing
 * and throws instead. Default 10 %.
 *
 * Below the threshold: log loudly, return partial. The page renders
 * slightly shorter but the site stays up — important on serverless
 * runtimes where transient EMFILE on a single item under load shouldn't
 * 500 the whole listing.
 *
 * Above the threshold: hard fail. A 500 with a stack trace is much easier
 * to diagnose than "users are saying we have fewer items today".
 *
 * Tunable via `CONTENT_FAIL_THRESHOLD` env var (decimal, e.g. `0.10`).
 */
const FAIL_LOUD_THRESHOLD = (() => {
	const raw = Number.parseFloat(process.env.CONTENT_FAIL_THRESHOLD ?? '');
	if (Number.isFinite(raw) && raw > 0 && raw <= 1) return raw;
	return 0.1;
})();

async function mapWithConcurrency<T, R>(
	items: readonly T[],
	limit: number,
	worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
	if (items.length === 0) return [];
	const effectiveLimit = Math.max(1, Math.min(limit, items.length));
	const results = new Array<R>(items.length);
	let cursor = 0;
	const runners = Array.from({ length: effectiveLimit }, async () => {
		while (true) {
			const i = cursor++;
			if (i >= items.length) return;
			results[i] = await worker(items[i], i);
		}
	});
	await Promise.all(runners);
	return results;
}

function normalizeComparisonDimension(raw: unknown): ComparisonDimension | null {
	if (!isRecord(raw)) return null;

	const name = typeof raw.name === 'string' ? raw.name : '';
	const itemASummary = typeof raw.item_a_summary === 'string' ? raw.item_a_summary : '';
	const itemBSummary = typeof raw.item_b_summary === 'string' ? raw.item_b_summary : '';

	if (!name || !itemASummary || !itemBSummary) {
		return null;
	}

	const itemAScore =
		typeof raw.item_a_score === 'number' && Number.isFinite(raw.item_a_score) ? raw.item_a_score : undefined;
	const itemBScore =
		typeof raw.item_b_score === 'number' && Number.isFinite(raw.item_b_score) ? raw.item_b_score : undefined;
	const winner = raw.winner === 'item_a' || raw.winner === 'item_b' || raw.winner === 'tie' ? raw.winner : undefined;

	return {
		name,
		item_a_summary: itemASummary,
		item_b_summary: itemBSummary,
		item_a_score: itemAScore,
		item_b_score: itemBScore,
		winner
	};
}

function normalizeComparisonData(raw: unknown, fallbackSlug: string): ComparisonData | null {
	if (!isRecord(raw)) return null;

	const slug = typeof raw.slug === 'string' && raw.slug ? raw.slug : fallbackSlug;
	const id = typeof raw.id === 'string' && raw.id ? raw.id : slug;
	const title = typeof raw.title === 'string' ? raw.title : '';
	const itemASlug = typeof raw.item_a_slug === 'string' ? raw.item_a_slug : '';
	const itemBSlug = typeof raw.item_b_slug === 'string' ? raw.item_b_slug : '';
	const itemAName = typeof raw.item_a_name === 'string' ? raw.item_a_name : '';
	const itemBName = typeof raw.item_b_name === 'string' ? raw.item_b_name : '';
	const category = typeof raw.category === 'string' ? raw.category : '';
	const summary = typeof raw.summary === 'string' ? raw.summary : '';
	const verdict = typeof raw.verdict === 'string' ? raw.verdict : '';
	const verdictWinner =
		raw.verdict_winner === 'item_a' || raw.verdict_winner === 'item_b' || raw.verdict_winner === 'tie'
			? raw.verdict_winner
			: undefined;
	const generatedAt =
		typeof raw.generated_at === 'string' && raw.generated_at ? raw.generated_at : new Date(0).toISOString();
	const dimensions = Array.isArray(raw.dimensions)
		? raw.dimensions.map(normalizeComparisonDimension).filter((d): d is ComparisonDimension => d !== null)
		: [];
	const sources = Array.isArray(raw.sources)
		? raw.sources.filter((source): source is string => typeof source === 'string' && source.length > 0)
		: [];

	if (!slug || !title || !itemAName || !itemBName) {
		return null;
	}

	return {
		id,
		slug,
		title,
		item_a_slug: itemASlug,
		item_b_slug: itemBSlug,
		item_a_name: itemAName,
		item_b_name: itemBName,
		category,
		summary,
		verdict,
		verdict_winner: verdictWinner,
		dimensions,
		sources,
		generated_at: generatedAt
	};
}

/**
 * Validates CSS length/size values (e.g., "100px", "50vh", "auto")
 */
function isValidCssSize(value: string): boolean {
	const trimmed = value.trim();
	// Allow common keywords
	if (['auto', 'inherit', 'initial', 'unset'].includes(trimmed)) {
		return true;
	}
	// Allow numeric values with valid CSS units
	const cssPattern = /^\d+(\.\d+)?(px|em|rem|vh|vw|%|pt|cm|mm|in)?$/;
	return cssPattern.test(trimmed);
}

/**
 * Zod schema for validating CustomHeroFrontmatter from YAML
 */
const customHeroFrontmatterSchema = z
	.object({
		background_image: z
			.string()
			.refine(isValidUrl, {
				message: 'Invalid URL: must be http, https, or relative path'
			})
			.optional(),
		theme: z.enum(['light', 'dark', 'auto']).optional(),
		alignment: z.enum(['left', 'center', 'right']).optional(),
		min_height: z
			.string()
			.refine(isValidCssSize, {
				message: 'Invalid CSS size value'
			})
			.optional(),
		overlay_opacity: z.number().min(0).max(1).optional()
	})
	.partial();

interface PrUpdate {
	branch: string;
	title: string;
	body: string;
}

interface Identifiable {
	id: string;
	name: string;
	icon_url?: string;
}

interface TypePagination {
	type: 'standard' | 'infinite';
	itemsPerPage: number;
}

interface FetchComparisonsResult {
	total: number;
	comparisons: ComparisonData[];
}

export interface PricingConfig {
	id: string;
	name: string;
	description: string;
	price: number;
	stripeProductId?: string;
	stripePriceId?: string;
	annualPriceId?: string;
	lemonProductId?: string;
	features?: string[];
	popular?: boolean;
	annualDiscount: number;
	isPremium?: boolean;
	interval?: PaymentInterval;
	trialPeriodDays?: number;
	isActive?: boolean;
	isFeatured?: boolean;
	envKey?: string;
	disabled?: boolean;

	// Trial configuration
	trialAmountId?: string;
	trialAmount?: number;
	isAuthorizedTrialAmount?: boolean;

	// Polar configuration
	polarFreePlanId?: string;
	polarStandardPlanId?: string;
	polarPremiumPlanId?: string;
	polarProductId?: string;

	// LemonSqueezy configuration
	lemonVariantId?: string;
	lemonCheckoutUrl?: string;
}

export interface PricingPlans {
	FREE: PricingConfig;
	STANDARD: PricingConfig;
	PREMIUM: PricingConfig;
}

export interface PricingPlanConfig {
	/**
	 * Default checkout gateway, or `manual` when `works.yml` declares that
	 * payment is handled outside the template (spec 046, EW-131).
	 */
	provider?: PricingProvider;
	plans: PricingPlans;
	currency?: string;
	lemonCheckoutUrl?: string;
}

export interface Category extends Identifiable {
	count?: number;
	image_url?: string;
}

export interface Tag extends Identifiable {
	count?: number;
}

export interface PromoCode {
	code: string;
	description?: string;
	discount_type: 'percentage' | 'fixed' | 'free_shipping';
	discount_value?: number;
	expires_at?: string;
	terms?: string;
	url?: string; // Optional URL to redirect when using the code
}

export interface ItemData {
	name: string;
	slug: string;
	description: string;
	source_url: string;
	category: string | Category | Category[] | string[];
	tags: string[] | Tag[];
	collections?: string[] | Collection[];
	collection?: string;
	featured?: boolean;
	icon_url?: string;
	updated_at: string; // raw string timestamp
	updatedAt: Date; // timestamp
	promo_code?: PromoCode; // New field for promotional codes
	markdown?: string; // Optional markdown content from YAML
	is_source_url_active?: boolean;
	action?: 'visit-website' | 'start-survey' | 'buy'; // CTA action type
	showSurveys?: boolean; // Whether to show surveys section (default: true)
	publisher?: string; // Publisher name for display
	location?: ItemLocationData; // Location data from YAML
}

export interface AuthOptions {
	credentials?: boolean;
	google?: boolean;
	github?: boolean;
	microsoft?: boolean;
	fb?: boolean;
	x?: boolean;
}

export type NovuMail = {
	provider: 'novu';
	template_id?: string;
	default_from: string;
	backend_url?: string;
};

export type ResendMail = {
	provider: 'resend';
	default_from: string;
};

export type AuthProviderType = 'supabase' | 'next-auth' | 'both';

export interface AuthConfig {
	provider: AuthProviderType;

	/**
	 * Supabase configuration
	 */
	supabase?: {
		url: string;
		anonKey: string;
		redirectUrl?: string;
	};

	/**
	 * Next-Auth configuration
	 */
	nextAuth?: {
		enableCredentials?: boolean;
		enableOAuth?: boolean;
		providers?: any[];
	};
}

export interface HeaderSettings {
	submitEnabled: boolean;
	pricingEnabled: boolean;
	layoutEnabled: boolean;
	languageEnabled: boolean;
	themeEnabled: boolean;
	moreEnabled: boolean;
	settingsEnabled: boolean;
	mapEnabled: boolean;
	layoutDefault: string;
	paginationDefault: string;
	themeDefault: string;
}

export interface FooterSettings {
	subscribeEnabled: boolean;
	versionEnabled: boolean;
	themeSelectorEnabled: boolean;
}

export interface HomepageSettings {
	hero_enabled?: boolean;
	search_enabled?: boolean;
	default_view?: string;
	default_sort?: string;
	hero_badge_text?: string;
	hero_title?: string;
	hero_title_gradient?: string;
	hero_description?: string;
}

export interface HeaderConfigSettings {
	submit_enabled?: boolean;
	pricing_enabled?: boolean;
	layout_enabled?: boolean;
	language_enabled?: boolean;
	theme_enabled?: boolean;
	more_enabled?: boolean;
	map_enabled?: boolean;
	layout_default?: string;
	pagination_default?: string;
	theme_default?: string;
}

export interface FooterConfigSettings {
	subscribe_enabled?: boolean;
	version_enabled?: boolean;
	theme_selector_enabled?: boolean;
}

// Import and re-export from canonical location types module
import type { LocationConfigSettings as LocationConfigSettingsType } from '@/lib/types/location';
export type LocationConfigSettings = LocationConfigSettingsType;

export interface LogoSettings {
	logo_image?: string; // Path to logo image (e.g., "/logo.png")
	logo_image_dark?: string; // Optional dark mode variant
	favicon?: string; // Path to favicon/icon (e.g., "/favicon.svg")
}

export interface Settings {
	categories_enabled?: boolean;
	companies_enabled?: boolean;
	tags_enabled?: boolean;
	surveys_enabled?: boolean;
	header?: HeaderConfigSettings;
	homepage?: HomepageSettings;
	footer?: FooterConfigSettings;
	location?: LocationConfigSettings;
}

export interface CustomHeroConfig {
	enabled?: boolean;
	source?: string;
}

export interface CustomHeroFrontmatter {
	background_image?: string;
	theme?: 'light' | 'dark' | 'auto';
	alignment?: 'left' | 'center' | 'right';
	min_height?: string;
	overlay_opacity?: number;
}

export interface CustomHeroContent {
	content: string;
	frontmatter: CustomHeroFrontmatter;
}

export interface CustomNavigationItem {
	label: string;
	path: string;
}

export interface Config {
	company_name?: string;
	copyright_year?: number;
	content_table?: boolean;
	item_name?: string;
	items_name?: string;
	app_url?: string;
	auth?: false | AuthOptions;
	mail?: NovuMail | ResendMail;
	generation_method?: 'create-update' | string;
	max_search_queries?: number;
	max_results_per_query?: number;
	max_pages_to_process?: number;
	relevance_threshold_content?: number;
	min_content_length_for_extraction?: number;
	ai_first_generation_enabled?: boolean;
	prompt_comparison_confidence_threshold?: number;
	pr_update?: PrUpdate;
	authConfig?: AuthConfig;
	pricing?: PricingPlanConfig;
	pagination?: TypePagination;
	headerSettings?: HeaderSettings;
	categoriesEnabled?: boolean;
	settings?: Settings;
	logo?: LogoSettings;
	custom_hero?: CustomHeroConfig;
	custom_header?: CustomNavigationItem[];
	custom_footer?: CustomNavigationItem[];
}

interface FetchOptions {
	lang?: string;
	sortTags?: boolean;
}

async function getConfig() {
	try {
		// Ensure content is available (copies from build to runtime on Vercel)
		const { ensureContentAvailable } = await import('./lib');
		await ensureContentAvailable();

		const contentPath = getContentPath();
		let mergedConfig: Record<string, unknown> | null = null;

		for (const configPath of getContentConfigPaths(contentPath).reverse()) {
			try {
				const raw = await safeReadFile(configPath, contentPath);
				const parsed = yaml.parse(raw);

				if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
					throw new Error(`${path.basename(configPath)} must contain a YAML object at the root`);
				}

				mergedConfig = mergeConfigObjects(mergedConfig ?? {}, parsed as Record<string, unknown>);
			} catch (err) {
				if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
					continue;
				}
				throw err;
			}
		}

		return applyPricingValidation(mergedConfig ?? {}) as Config;
	} catch (err) {
		if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
			return {};
		}
		throw err;
	}
}

/**
 * Validates the optional `pricing:` block of `works.yml` (spec 046, EW-131).
 *
 * A config with no `pricing` key is returned untouched, so every existing
 * data repository keeps the built-in default plans. A malformed block is
 * reported field by field and then dropped, which leaves `config.pricing`
 * undefined — the same state as "no pricing configured", so `ConfigProvider`
 * falls back to `getDefaultPricingConfigWithCurrency()` instead of rendering
 * broken plan cards. Deliberately non-fatal: bad pricing metadata must not
 * take a whole directory offline.
 */
function applyPricingValidation(config: Record<string, unknown>): Record<string, unknown> {
	if (config.pricing === undefined || config.pricing === null) {
		return config;
	}

	const { pricing, errors, warnings } = parseWorksPricingConfig(config.pricing);

	for (const warning of warnings) {
		console.warn(`[CONTENT] ${warning}`);
	}

	if (!pricing) {
		console.error(
			`[CONTENT] Invalid "pricing" section in ${PRIMARY_CONTENT_CONFIG_FILENAME}; ` +
				`falling back to the built-in pricing plans:\n  - ${errors.join('\n  - ')}`
		);

		const sanitized = { ...config };
		delete sanitized.pricing;

		return sanitized;
	}

	return { ...config, pricing };
}

export const getCachedConfig = unstable_cache(
	async () => {
		return await getConfig();
	},
	['config'],
	{ revalidate: 60 }
);

async function parseItem(base: string, filename: string, slugOverride?: string): Promise<ItemData | null> {
	try {
		// Sanitize filename to prevent path traversal attacks
		const sanitizedFilename = sanitizeFilename(filename);

		const filepath = path.join(base, sanitizedFilename);

		// Use secure file reading function
		const content = await safeReadFile(filepath, base);
		const meta = yaml.parse(content) as ItemData;
		meta.slug = slugOverride ?? path.basename(sanitizedFilename, path.extname(sanitizedFilename));
		meta.updatedAt = parse(meta.updated_at, 'yyyy-MM-dd HH:mm', new Date());
		delete meta.markdown;

		return meta;
	} catch (error) {
		if (isNodeErrorWithCode(error, 'ENOENT')) {
			if (!missingItemWarnings.has(filename)) {
				missingItemWarnings.add(filename);
				console.warn(`[CONTENT] Skipping item with missing YAML file: ${filename}`);
			}
			return null;
		}
		console.error(`Failed to parse item ${filename}:`, error);
		return null;
	}
}

async function parseTranslation(base: string, filename: string) {
	try {
		// Sanitize filename to prevent path traversal attacks
		const sanitizedFilename = sanitizeFilename(filename);

		const filepath = path.join(base, sanitizedFilename);

		// Use secure file reading function
		const content = await safeReadFile(filepath, base);
		return yaml.parse(content);
	} catch {
		return null;
	}
}

async function readCollection<T extends Identifiable>(
	type: 'categories' | 'tags' | 'collections',
	options: FetchOptions = {}
): Promise<Map<string, T>> {
	try {
		// Ensure content is available (copies from build to runtime on Vercel)
		const { ensureContentAvailable } = await import('./lib');
		await ensureContentAvailable();

		const contentPath = getContentPath();
		const collectionDir = path.join(contentPath, type);

		const useDir = await dirExists(collectionDir);
		const collectionPath = useDir ? path.join(collectionDir, `${type}.yml`) : path.join(contentPath, `${type}.yml`);

		const raw = await safeReadFile(collectionPath, contentPath);
		const parsed = yaml.parse(raw);
		// Handle empty YAML files or null content
		const list: T[] = Array.isArray(parsed) ? parsed : [];
		const collection = new Map(list.map((item) => [item.id, item]));

		if (useDir && options.lang && options.lang !== 'en') {
			// Validate language code to prevent path traversal
			if (!validateLanguageCode(options.lang)) {
				console.warn(`[CONTENT] Invalid language code "${options.lang}" (ignoring translations).`);
			} else {
				const translations = await parseTranslation(collectionDir, `${type}.${options.lang}.yml`);
				if (translations) {
					for (const translation of translations) {
						const item = collection.get(translation.id);
						if (item) {
							collection.set(translation.id, { ...item, ...translation });
						}
					}
				}
			}
		}

		return collection;
	} catch (err) {
		if (isNodeErrorWithCode(err, 'ENOENT')) {
			// Bootstrap missing collection files, so first read creates the YAML on disk
			try {
				const contentPath = getContentPath();
				const collectionDir = path.join(contentPath, type);
				const useDir = await dirExists(collectionDir);

				const collectionPath = useDir
					? path.join(collectionDir, `${type}.yml`)
					: path.join(contentPath, `${type}.yml`);

				await fsp.mkdir(path.dirname(collectionPath), { recursive: true });
				await fsp.writeFile(collectionPath, '[]\n', 'utf-8');
			} catch (createErr) {
				console.error(`[CONTENT] Failed to bootstrap missing ${type}.yml:`, createErr);
			}

			return new Map();
		}
		throw err;
	}
}

async function readCategories(options: FetchOptions): Promise<Map<string, Category>> {
	return readCollection<Category>('categories', options);
}

async function readTags(options: FetchOptions): Promise<Map<string, Tag>> {
	return readCollection<Tag>('tags', options);
}

async function readCollections(options: FetchOptions): Promise<Map<string, Collection>> {
	const collections = await readCollection<Collection>('collections', options);

	return new Map(
		Array.from(collections.entries()).map(([id, collection]) => [
			id,
			{
				...collection,
				slug: collection.slug || id,
				description: collection.description || '',
				item_count: collection.item_count || 0,
				items: Array.isArray(collection.items) ? collection.items : [],
				isActive: collection.isActive !== false
			}
		])
	);
}

function toSlug(text: string): string {
	return text
		.toLowerCase()
		.replace(/[&]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '');
}

function populate<T extends Identifiable>(item: string | T, collection: Map<string, T & { count?: number }>): T {
	const id = typeof item === 'string' ? item : item.id;
	const name = typeof item === 'string' ? item : item.name;

	// Direct lookup first, then try slug-based lookup.
	// Items often reference categories by display name (e.g. "Communication Tools")
	// while categories.yml uses slug IDs (e.g. "communication-tools").
	let populated = collection.get(id);
	let resolvedId = id;

	if (!populated) {
		const slugId = toSlug(id);
		populated = collection.get(slugId);
		if (populated) {
			resolvedId = slugId;
		}
	}

	const result = { id: resolvedId, name } as T;

	if (populated) {
		result.name = populated.name;
		populated.count = (populated.count || 0) + 1;
	} else {
		collection.set(resolvedId, { ...result, count: 1 });
	}

	return result;
}

function populateCategory(category: string | Category, categories: Map<string, Category>) {
	return populate<Category>(category, categories);
}

function populateTag(tag: string | Tag, tags: Map<string, Tag>) {
	return populate<Tag>(tag, tags);
}

function populateCollection(
	collection: string | Collection,
	collections: Map<string, Collection>,
	itemSlug?: string
): Collection {
	const id = typeof collection === 'string' ? collection : collection.id;
	const name = typeof collection === 'string' ? collection : collection.name;

	const populated = collections.get(id);
	if (populated) {
		populated.slug = populated.slug || populated.id;
		populated.items = Array.isArray(populated.items) ? populated.items : [];
		if (itemSlug && !populated.items.includes(itemSlug)) {
			populated.items.push(itemSlug);
		}
		populated.item_count = populated.items.length;
		return populated;
	} else {
		const items = itemSlug ? [itemSlug] : [];
		const newCollection = {
			id,
			name,
			slug: id,
			description: '',
			item_count: items.length,
			items,
			isActive: true
		};
		collections.set(id, newCollection);
		return newCollection;
	}
}

function getLegacyCollectionValue(item: ItemData): string | undefined {
	const legacyCollection = (item as ItemData & { collection?: string }).collection;
	return typeof legacyCollection === 'string' && legacyCollection.length > 0 ? legacyCollection : undefined;
}

function normalizeItemCollections(item: ItemData): string[] {
	if (Array.isArray(item.collections)) {
		return item.collections
			.map((collection) => (typeof collection === 'string' ? collection : collection?.id))
			.filter(
				(collectionId): collectionId is string => typeof collectionId === 'string' && collectionId.length > 0
			);
	}

	const legacyCollection = getLegacyCollectionValue(item);
	return legacyCollection ? [legacyCollection] : [];
}

function attachItemToCollections(item: ItemData, collections: Map<string, Collection>): ItemData {
	const normalizedCollections = normalizeItemCollections(item);
	if (normalizedCollections.length === 0) {
		item.collections = [];
		return item;
	}

	item.collections = normalizedCollections.map((collectionId) => {
		const populated = populateCollection(collectionId, collections);
		const items = Array.isArray(populated.items) ? populated.items : [];
		if (!items.includes(item.slug)) {
			items.push(item.slug);
		}
		populated.items = items;
		populated.item_count = items.length;
		return populated;
	});

	return item;
}

// Return type for fetchItems function
interface FetchItemsResult {
	total: number;
	items: ItemData[];
	categories: Category[];
	tags: Tag[];
	collections: Collection[];
}

function sanitizeComparisonMarkdownForMdx(markdown: string): string {
	// AI-generated comparison markdown occasionally includes raw HTML-like tags that break MDX compilation.
	// Comparisons do not rely on HTML, so escape tag-shaped fragments before rendering.
	return markdown.replace(/<[^>\n]+>/g, (match) => match.replace(/</g, '&lt;').replace(/>/g, '&gt;'));
}

async function fetchComparisons(): Promise<FetchComparisonsResult> {
	const { ensureContentAvailable } = await import('./lib');
	await ensureContentAvailable();

	const contentPath = getContentPath();
	const comparisonsDir = path.join(contentPath, 'comparisons');

	if (!(await dirExists(comparisonsDir))) {
		return { total: 0, comparisons: [] };
	}

	try {
		const entries = await fsp.readdir(comparisonsDir, { withFileTypes: true });
		const directoryEntries = entries.filter((entry) => entry.isDirectory());
		const comparisons = (
			await mapWithConcurrency(directoryEntries, FS_CONCURRENCY, async (entry) => {
				const slug = sanitizeFilename(entry.name);
				const ymlPath = path.join(comparisonsDir, slug, `${slug}.yml`);
				try {
					const raw = await safeReadFile(ymlPath, comparisonsDir);
					return normalizeComparisonData(yaml.parse(raw), slug);
				} catch (error) {
					console.error(`Failed to load comparison ${slug}:`, error);
					return null;
				}
			})
		).filter((comparison): comparison is ComparisonData => comparison !== null);

		comparisons.sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime());

		return { total: comparisons.length, comparisons };
	} catch (error) {
		console.error('Failed to load comparisons:', error);
		return { total: 0, comparisons: [] };
	}
}

export async function fetchComparison(slug: string): Promise<ComparisonDetail | null> {
	const { ensureContentAvailable } = await import('./lib');
	await ensureContentAvailable();

	const contentPath = getContentPath();
	const sanitizedSlug = sanitizeFilename(slug);
	const comparisonDir = path.join(contentPath, 'comparisons', sanitizedSlug);

	if (!(await dirExists(comparisonDir))) {
		return null;
	}

	const ymlPath = path.join(comparisonDir, `${sanitizedSlug}.yml`);
	const mdPath = path.join(comparisonDir, `${sanitizedSlug}.md`);
	const extendedPath = path.join(comparisonDir, `${sanitizedSlug}-extended.md`);

	try {
		const raw = await safeReadFile(ymlPath, comparisonDir);
		const comparison = normalizeComparisonData(yaml.parse(raw), sanitizedSlug);
		if (!comparison) {
			return null;
		}
		let markdown: string | undefined;
		let extendedAnalysisMarkdown: string | undefined;

		if (await fsExists(mdPath)) {
			markdown = sanitizeComparisonMarkdownForMdx(await safeReadFile(mdPath, comparisonDir));
		}

		if (await fsExists(extendedPath)) {
			extendedAnalysisMarkdown = await safeReadFile(extendedPath, comparisonDir);
		}

		return { comparison, markdown, extendedAnalysisMarkdown };
	} catch (error) {
		console.error(`Failed to load comparison ${sanitizedSlug}:`, error);
		return null;
	}
}

// IN-MEMORY CACHE INFRASTRUCTURE
// These caches avoid repeated filesystem reads and are invalidated on Git sync

// In-memory cache for fetchItems to avoid repeated filesystem reads
// Cache is invalidated intelligently based on directory modification time
const fetchItemsCache = new Map<string, { data: FetchItemsResult; timestamp: number }>();

const FETCH_ITEMS_CACHE_TTL = 600000; // 10 minutes in milliseconds
const CONTENT_CACHE_ENABLED = process.env.NODE_ENV !== 'development';

// Directory metadata cache to avoid repeated readdir() calls
// Stores: { files: string[], mtime: number, categories, tags, collections }
type DirectoryCache = {
	files: string[];
	mtime: number;
	categories: Map<string, Category>;
	tags: Map<string, Tag>;
	collections: Map<string, Collection>;
	timestamp: number;
};

const directoryCache = new Map<string, DirectoryCache>();
const DIRECTORY_CACHE_TTL = 600000; // 10 minutes in milliseconds

// Separate caches for categories and tags (used by fetchItem)
const categoriesCache = new Map<string, { data: Map<string, Category>; timestamp: number }>();
const tagsCache = new Map<string, { data: Map<string, Tag>; timestamp: number }>();
const METADATA_CACHE_TTL = 600000; // 10 minutes in milliseconds
let fetchItemsRepairPromise: Promise<void> | null = null;

async function getContentRevision(): Promise<string> {
	const { ensureContentAvailable } = await import('./lib');
	await ensureContentAvailable();

	const contentPath = getContentPath();
	const gitHeadPath = path.join(contentPath, '.git', 'HEAD');

	try {
		const head = (await fsp.readFile(gitHeadPath, 'utf8')).trim();
		if (head.startsWith('ref:')) {
			const ref = head.slice(5).trim();
			return (await fsp.readFile(path.join(contentPath, '.git', ref), 'utf8')).trim();
		}
		if (head) {
			return head;
		}
	} catch {
		// Fall through to filesystem metadata for non-git fallback content.
	}

	try {
		const [dataStat, configStat] = await Promise.all([
			fsp.stat(path.join(contentPath, 'data')).catch(() => null),
			Promise.all(getContentConfigPaths(contentPath).map((configPath) => fsp.stat(configPath).catch(() => null)))
		]);
		const configMtime = configStat.reduce((latest, stat) => Math.max(latest, stat?.mtimeMs ?? 0), 0);
		return `fs:${dataStat?.mtimeMs ?? 0}:${configMtime}`;
	} catch {
		return 'missing';
	}
}

/**
 * Clear the in-memory fetchItems cache
 * Called when content is synced from Git repository
 * Now uses smart invalidation: only clears if directory actually changed
 */
export async function clearFetchItemsCache() {
	// Clear the results cache
	fetchItemsCache.clear();

	// Clear directory metadata cache to force re-check on next access
	// This allows detecting if Git sync actually changed files
	directoryCache.clear();

	// Clear categories and tags caches
	categoriesCache.clear();
	tagsCache.clear();

	// Also clear single-flight in-flight map. Otherwise a sync that overlaps
	// an already-running `fetchItemsImpl` would let the next post-sync
	// request join that pre-sync promise and receive stale data — defeating
	// cache-invalidation semantics in exactly the window users care about
	// (right after a content push). Clearing here doesn't cancel the
	// in-flight promise itself; it just means new requests start a fresh
	// fetch that sees the post-sync filesystem state.
	// Caught by Codex review on PR #773.
	inFlightFetches.clear();

	console.log('[CACHE] In-memory fetchItems, directory, categories, in-flight, and tags caches cleared');
}

async function repairContentRepositoryAfterMissingItems(): Promise<void> {
	if (!process.env.DATA_REPOSITORY) {
		return;
	}

	if (!fetchItemsRepairPromise) {
		fetchItemsRepairPromise = (async () => {
			console.warn('[CONTENT] Missing item YAML files detected; attempting repository repair before returning listings.');
			const { trySyncRepository } = await import('./repository');
			await trySyncRepository();
			await clearFetchItemsCache();
		})().finally(() => {
			fetchItemsRepairPromise = null;
		});
	}

	await fetchItemsRepairPromise;
}

/**
 * In-flight `fetchItems` calls keyed by serialized options. When multiple
 * concurrent renders ask for the same listing (typical under crawler load
 * on a multi-locale demo: 50+ requests for `/<locale>/...` arriving within
 * a second), only the first one performs the ~1000-item filesystem walk.
 * The others share its promise and return as soon as it resolves.
 *
 * Without this, every concurrent render runs its own walk; even with
 * `FS_CONCURRENCY=8` per call, 50 concurrent calls = 400 in-flight fd
 * reads → guaranteed EMFILE on serverless runtimes. With it, the global
 * concurrent fd budget is bounded by `FS_CONCURRENCY × 1` regardless of
 * burst size.
 *
 * The map is never larger than the number of distinct cache keys that
 * happen to be in flight at once — typically 1 per locale, freed in
 * `finally` blocks below — so it doesn't grow unboundedly.
 */
const inFlightFetches = new Map<string, Promise<FetchItemsResult>>();

export async function fetchItems(options: FetchOptions = {}, repairAttempted = false): Promise<FetchItemsResult> {
	// Create cache key from options
	const cacheKey = JSON.stringify(options);

	// Check in-memory cache first
	if (CONTENT_CACHE_ENABLED) {
		const cached = fetchItemsCache.get(cacheKey);

		if (cached && Date.now() - cached.timestamp < FETCH_ITEMS_CACHE_TTL) {
			console.log('[CACHE] Returning cached fetchItems result for:', cacheKey);
			return cached.data;
		}

		// Single-flight: if a fetch is already running for this key, share it.
		// Critical for serverless fd-budget survival under crawler bursts —
		// see the comment on `inFlightFetches` above.
		const inFlight = inFlightFetches.get(cacheKey);
		if (inFlight) {
			console.log('[CACHE] Joining in-flight fetchItems for:', cacheKey);
			return inFlight;
		}
	}

	const fetchPromise = fetchItemsImpl(options, repairAttempted);
	// Register before the first await so concurrent callers see it. The
	// register/cleanup happens regardless of `CONTENT_CACHE_ENABLED` to
	// prevent stampedes in dev too — the safety value is independent of
	// result caching.
	inFlightFetches.set(cacheKey, fetchPromise);
	try {
		return await fetchPromise;
	} finally {
		inFlightFetches.delete(cacheKey);
	}
}

async function fetchItemsImpl(options: FetchOptions = {}, repairAttempted = false): Promise<FetchItemsResult> {
	// Cache key is recomputed here for the post-fetch cache write below.
	const cacheKey = JSON.stringify(options);

	// Ensure content is available (copies from build to runtime on Vercel)
	const { ensureContentAvailable, dirExists } = await import('./lib');
	await ensureContentAvailable();

	// Repository sync now handled by background sync manager (lib/services/sync-service.ts)
	const dest = path.join(getContentPath(), 'data');

	// Check if the data directory exists before trying to read it
	// This prevents ENOENT errors when DATA_REPOSITORY is not configured
	if (!(await dirExists(dest))) {
		console.warn('[CONTENT] Data directory does not exist:', dest);
		return {
			total: 0,
			items: [],
			categories: [],
			tags: [],
			collections: []
		};
	}

	/// Smart directory caching
	// Instead of reading the directory on every call, cache the file list and metadata
	// Only re-read if directory modification time changed

	const dirCacheKey = `${dest}:${options.lang || 'en'}`;
	let files: string[];
	let categories: Map<string, Category>;
	let tags: Map<string, Tag>;
	let collections: Map<string, Collection>;

	// Check if we have cached directory metadata
	const cachedDir = directoryCache.get(dirCacheKey);

	// Get current directory modification time
	const dirStat = await fsp.stat(dest);
	const currentMtime = dirStat.mtimeMs;

	// Use cached directory data if:
	// 1. Cache exists
	// 2. Directory hasn't been modified (mtime unchanged)
	// 3. Cache is still fresh (within TTL)
	if (
		CONTENT_CACHE_ENABLED &&
		cachedDir &&
		cachedDir.mtime === currentMtime &&
		Date.now() - cachedDir.timestamp < DIRECTORY_CACHE_TTL
	) {
		console.log('[CACHE] Using cached directory metadata for:', dirCacheKey);
		files = cachedDir.files;
		// Deep clone Maps to prevent mutation of cached data by populate() functions
		categories = new Map(Array.from(cachedDir.categories.entries()).map(([k, v]) => [k, { ...v }]));
		tags = new Map(Array.from(cachedDir.tags.entries()).map(([k, v]) => [k, { ...v }]));
		collections = new Map(Array.from(cachedDir.collections.entries()).map(([k, v]) => [k, { ...v }]));
	} else {
		// Directory changed, or cache expired - read from filesystem
		console.log('[CACHE] Reading directory metadata from filesystem:', dirCacheKey);
		const entries = await fsp.readdir(dest, { withFileTypes: true });
		files = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
		categories = await readCategories(options);
		tags = await readTags(options);
		collections = await readCollections(options);

		// Store in directory cache
		if (CONTENT_CACHE_ENABLED) {
			directoryCache.set(dirCacheKey, {
				files,
				mtime: currentMtime,
				categories,
				tags,
				collections,
				timestamp: Date.now()
			});
			console.log('[CACHE] Stored directory metadata in cache for:', dirCacheKey);
		}
	}

	let missingItemDataCount = 0;
	// IO errors (EMFILE, ENOMEM, EACCES, etc.) used to silently drop items, which
	// produced "few items rendered" symptoms during fd-pressure incidents. Track
	// them separately so we can fail loud and refuse to serve a partial listing.
	// See Spec 019, `docs/performance/content-loading.md`.
	const ioErrors: Array<{ slug: string; error: unknown }> = [];
	const itemsResults = await mapWithConcurrency(files, FS_CONCURRENCY, async (slug) => {
		try {
			// Sanitize slug even though it comes from the filesystem
			const sanitizedSlug = sanitizeFilename(slug);

			const base = path.join(dest, sanitizedSlug);
			// Validate that the constructed path is safe
			validatePath(base, dest);

			const itemFilename = await resolveItemDataFilename(base, `${sanitizedSlug}.yml`);
			if (!itemFilename) {
				missingItemDataCount += 1;
				if (!missingItemWarnings.has(sanitizedSlug)) {
					missingItemWarnings.add(sanitizedSlug);
					console.warn(`[CONTENT] Skipping item directory with no YAML file: ${sanitizedSlug}`);
				}
				return null;
			}

			const item = await parseItem(base, itemFilename, sanitizedSlug);
			if (!item) {
				return null;
			}

			if (options.lang && options.lang !== 'en') {
				// Validate language code to prevent path traversal
				if (!validateLanguageCode(options.lang)) {
					console.warn(`[CONTENT] Invalid language code "${options.lang}" for item ${slug}.`);
				} else {
					const translation = await parseTranslation(base, `${sanitizedSlug}.${options.lang}.yml`);
					if (translation) Object.assign(item, translation);
				}
			}

			if (Array.isArray(item.tags)) {
				item.tags = item.tags.map((tag) => populateTag(tag, tags));
			}

			attachItemToCollections(item, collections);

			if (Array.isArray(item.category)) {
				item.category = item.category.map((cat) => populateCategory(cat, categories));
			} else {
				item.category = populateCategory(item.category, categories);
			}

			return item;
		} catch (error) {
			ioErrors.push({ slug, error });
			console.error(`Failed to load item ${slug}:`, error);
			return null;
		}
	});
	const items = itemsResults.filter((item): item is NonNullable<typeof item> => item !== null);

	// Threshold-based partial-listing handling. The Spec 019 first cut threw
	// on *any* IO error, which under steady fd pressure produced a
	// cascading-500 death spiral (every render that hit a single transient
	// EMFILE 500'd, the lambda kept the broken instance for retries, and
	// demo.ever.works hung entirely).
	//
	// New behaviour:
	//   - failure rate >= FAIL_LOUD_THRESHOLD: hard fail (loud, alertable).
	//   - failure rate <  FAIL_LOUD_THRESHOLD: log loudly, return partial.
	//
	// Combined with the in-flight dedup above, single-item EMFILE during
	// load can no longer sink the whole listing — the listing renders
	// slightly shorter but the site stays up, and the error log still
	// surfaces the problem.
	if (ioErrors.length > 0) {
		const failRate = files.length > 0 ? ioErrors.length / files.length : 0;
		const sample = ioErrors.slice(0, 3).map((e) => {
			const msg = e.error instanceof Error ? e.error.message : String(e.error);
			return `${e.slug}: ${msg}`;
		});
		const pct = (failRate * 100).toFixed(1);
		const threshPct = (FAIL_LOUD_THRESHOLD * 100).toFixed(0);
		if (failRate >= FAIL_LOUD_THRESHOLD) {
			throw new Error(
				`[CONTENT] fetchItems failed for ${ioErrors.length} of ${files.length} item(s) ` +
					`(${pct}%, at or above ${threshPct}% threshold); ` +
					`refusing to return partial listing. Samples: ${sample.join('; ')}`
			);
		}
		console.error(
			`[CONTENT] fetchItems: ${ioErrors.length} of ${files.length} item(s) failed ` +
				`(${pct}%, below ${threshPct}% threshold); returning partial listing. ` +
				`Samples: ${sample.join('; ')}`
		);
	}

	if (missingItemDataCount > 0 && !repairAttempted) {
		await repairContentRepositoryAfterMissingItems();
		// Recurse into the impl directly. Calling the public `fetchItems`
		// here would deadlock — the single-flight map still has our own
		// promise registered for this key, so we'd `await` ourselves.
		return fetchItemsImpl(options, true);
	}

	const tagsArray = Array.from(tags.values());
	const sortedTags = options.sortTags ? tagsArray.sort((a, b) => a.name.localeCompare(b.name)) : tagsArray;

	const result = {
		total: items.length,
		items: items.sort((a, b) => {
			if (a.featured && !b.featured) return -1;
			if (!a.featured && b.featured) return 1;
			// updatedAt is supposed to be a Date but cache rehydration
			// (and items not loaded through safeReadFile) can leave it
			// as a string or undefined. Coerce defensively.
			const aTime = a.updatedAt instanceof Date ? a.updatedAt.getTime() : new Date(a.updatedAt ?? 0).getTime();
			const bTime = b.updatedAt instanceof Date ? b.updatedAt.getTime() : new Date(b.updatedAt ?? 0).getTime();
			return bTime - aTime;
		}),
		categories: Array.from(categories.values()),
		tags: sortedTags,
		collections: Array.from(collections.values())
	};

	// Store in cache
	if (CONTENT_CACHE_ENABLED) {
		fetchItemsCache.set(cacheKey, { data: result, timestamp: Date.now() });
		console.log('[CACHE] Stored fetchItems result in cache for:', cacheKey);
	}

	return result;
}

// Cache for similarity calculations to avoid recomputing
const similarityCache = new Map<string, { data: SimilarItem[]; timestamp: number; ttl: number }>();

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Generates cache key for similarity calculations
 * @param currentItem - Current item data
 * @param maxResults - Maximum results
 * @param options - Fetch options
 * @returns string - Cache key
 */
function generateCacheKey(currentItem: ItemData, maxResults: number, options: FetchOptions): string {
	const optionsHash = JSON.stringify(options);
	return `${currentItem.slug}_${maxResults}_${optionsHash}`;
}

/**
 * Checks if cached data is still valid
 * @param timestamp - Cache timestamp
 * @param ttl - Time to live
 * @returns boolean - True if cache is valid
 */
function isCacheValid(timestamp: number, ttl: number): boolean {
	return Date.now() - timestamp < ttl;
}

/**
 * Cleans expired cache entries
 */
function cleanExpiredCache(): void {
	for (const [key, value] of similarityCache.entries()) {
		if (!isCacheValid(value.timestamp, value.ttl)) {
			similarityCache.delete(key);
		}
	}
}

/**
 * Fetches similar items by slug with caching and advanced optimizations
 * @param currentItem - The current item to find similarities for
 * @param maxResults - Maximum number of similar items to return
 * @param options - Fetch options for filtering
 * @param useCache - Whether to use caching (default: true)
 * @returns Promise<SimilarItem[]> - Array of similar items with scores
 */
export async function fetchSimilarItems(
	currentItem: ItemData,
	maxResults: number = 6,
	options: FetchOptions = {},
	useCache: boolean = true
): Promise<SimilarItem[]> {
	const startTime = performance.now();

	// Clean expired cache entries periodically
	if (Math.random() < 0.1) {
		// 10% chance to clean cache
		cleanExpiredCache();
	}

	if (!currentItem.tags?.length && !currentItem.category) {
		return [];
	}

	// Validate input parameters
	if (!currentItem.slug) {
		return [];
	}

	if (maxResults <= 0) {
		maxResults = 6;
	}

	// Check cache if enabled
	if (useCache) {
		const cacheKey = generateCacheKey(currentItem, maxResults, options);
		const cached = similarityCache.get(cacheKey);

		if (cached && isCacheValid(cached.timestamp, cached.ttl)) {
			const cacheDuration = performance.now() - startTime;
			updatePerformanceMetrics(cacheDuration, true);
			return cached.data;
		}
	}

	let items: ItemData[];
	try {
		const result = await fetchItems(options);
		items = result.items;
	} catch {
		const errorDuration = performance.now() - startTime;
		updatePerformanceMetrics(errorDuration, false);
		return [];
	}

	if (!items || items.length === 0) {
		const emptyDuration = performance.now() - startTime;
		updatePerformanceMetrics(emptyDuration, false);
		return [];
	}

	const currentTags = normalizeTags(currentItem.tags);
	const currentCategories = normalizeCategories(currentItem.category);

	// Calculate similarity scores efficiently with performance monitoring
	const similarItems = items
		.filter((item) => {
			// Filter out current item and invalid slugs
			return item.slug && item.slug !== currentItem.slug;
		})
		.map((item) => {
			const itemTags = normalizeTags(item.tags);
			const itemCategories = normalizeCategories(item.category);

			const commonTags = calculateCommonElements(currentTags, itemTags);
			const commonCategories = calculateCommonElements(currentCategories, itemCategories);

			const score = calculateSimilarityScore(
				commonTags,
				commonCategories,
				currentTags.length,
				currentCategories.length
			);

			return {
				item,
				score,
				commonTags,
				commonCategories,
				similarityPercentage: Math.round(score * 100),
				metadata: {
					itemTagsCount: itemTags.length,
					itemCategoriesCount: itemCategories.length,
					hasCommonTags: commonTags > 0,
					hasCommonCategories: commonCategories > 0
				}
			};
		})
		.filter((result) => result.score > 0) // Only include items with positive similarity
		.sort((a, b) => {
			// Primary sort by score, secondary by common elements count
			if (Math.abs(a.score - b.score) < 0.001) {
				const aTotal = a.commonTags + a.commonCategories;
				const bTotal = b.commonTags + b.commonCategories;
				return bTotal - aTotal;
			}
			return b.score - a.score;
		})
		.slice(0, maxResults); // Limit results

	const totalDuration = performance.now() - startTime;

	// Cache the results if caching is enabled
	if (useCache && similarItems.length > 0) {
		const cacheKey = generateCacheKey(currentItem, maxResults, options);
		similarityCache.set(cacheKey, {
			data: similarItems,
			timestamp: Date.now(),
			ttl: CACHE_TTL
		});
	}

	// Update performance metrics
	updatePerformanceMetrics(totalDuration, false);

	return similarItems;
}

/**
 * Normalizes tags to an array of strings for consistent comparison
 * @param tags - Tags in various formats
 * @returns string[] - Normalized array of tag names
 */
function normalizeTags(tags: any): string[] {
	if (!tags) return [];

	if (Array.isArray(tags)) {
		return tags
			.filter((tag) => tag) // Remove null/undefined
			.map((tag) => (typeof tag === 'string' ? tag : tag?.name))
			.filter(Boolean) // Remove empty strings
			.map((tag) => tag.toLowerCase().trim()); // Normalize case and trim
	}

	// Single tag
	const tagName = typeof tags === 'string' ? tags : tags?.name;
	return tagName ? [tagName.toLowerCase().trim()] : [];
}

/**
 * Normalizes categories to an array of strings for consistent comparison
 * @param category - Category in various formats
 * @returns string[] - Normalized array of category names
 */
function normalizeCategories(category: any): string[] {
	if (!category) return [];

	if (Array.isArray(category)) {
		return category
			.filter((cat) => cat) // Remove null/undefined
			.map((cat) => (typeof cat === 'string' ? cat : cat?.name))
			.filter(Boolean) // Remove empty strings
			.map((cat) => cat.toLowerCase().trim()); // Normalize case and trim
	}

	// Single category
	const catName = typeof category === 'string' ? category : category?.name;
	return catName ? [catName.toLowerCase().trim()] : [];
}

/**
 * Calculates the number of common elements between two arrays
 * Uses Set for O(1) lookup performance
 * @param array1 - First array
 * @param array2 - Second array
 * @returns number - Count of common elements
 */
function calculateCommonElements(array1: string[], array2: string[]): number {
	if (!array1.length || !array2.length) return 0;

	// Use Set for O(1) lookup performance
	const set1 = new Set(array1);
	return array2.filter((item) => set1.has(item)).length;
}

/**
 * Calculates weighted similarity score with advanced normalization
 * @param commonTags - Number of common tags
 * @param commonCategories - Number of common categories
 * @param totalTags - Total tags in current item
 * @param totalCategories - Total categories in current item
 * @returns number - Similarity score between 0 and 1
 */
function calculateSimilarityScore(
	commonTags: number,
	commonCategories: number,
	totalTags: number,
	totalCategories: number
): number {
	const tagWeight = 0.6;
	const categoryWeight = 0.4;

	// Normalize by the maximum of tags or categories to avoid division by zero
	const maxTotal = Math.max(totalTags, totalCategories, 1);

	// Calculate individual scores
	const tagScore = (commonTags * tagWeight) / maxTotal;
	const categoryScore = (commonCategories * categoryWeight) / maxTotal;

	// Combine scores and ensure they don't exceed 1
	const combinedScore = tagScore + categoryScore;

	// Apply logarithmic scaling for better distribution of scores
	const scaledScore = Math.log1p(combinedScore * 9) / Math.log(10);

	return Math.min(scaledScore, 1);
}

// CACHED METADATA HELPERS
// These helpers provide cached access to categories and tags for individual
// item fetching, avoiding repeated filesystem reads

/**
 * Get categories with in-memory caching
 * Used by fetchItem() to avoid repeated filesystem reads
 */
async function getCachedCategoriesInternal(options: FetchOptions = {}): Promise<Map<string, Category>> {
	const locale = options.lang || 'en';
	const cacheKey = `categories:${locale}`;

	// Check cache
	const cached = categoriesCache.get(cacheKey);
	if (cached && Date.now() - cached.timestamp < METADATA_CACHE_TTL) {
		console.log('[CACHE] Using cached categories for:', locale);
		// Deep clone to prevent mutation of cached data by populate() functions
		return new Map(Array.from(cached.data.entries()).map(([k, v]) => [k, { ...v }]));
	}

	// Cache miss - read from filesystem
	console.log('[CACHE] Reading categories from filesystem for:', locale);
	const categories = await readCategories(options);

	// Store in cache
	categoriesCache.set(cacheKey, {
		data: categories,
		timestamp: Date.now()
	});

	return categories;
}

/**
 * Get tags with in-memory caching
 * Used by fetchItem() to avoid repeated filesystem reads
 */
async function getCachedTagsInternal(options: FetchOptions = {}): Promise<Map<string, Tag>> {
	const locale = options.lang || 'en';
	const cacheKey = `tags:${locale}`;

	// Check cache
	const cached = tagsCache.get(cacheKey);
	if (cached && Date.now() - cached.timestamp < METADATA_CACHE_TTL) {
		console.log('[CACHE] Using cached tags for:', locale);
		// Deep clone to prevent mutation of cached data by populate() functions
		return new Map(Array.from(cached.data.entries()).map(([k, v]) => [k, { ...v }]));
	}

	// Cache miss - read from filesystem
	console.log('[CACHE] Reading tags from filesystem for:', locale);
	const tags = await readTags(options);

	// Store in cache
	tagsCache.set(cacheKey, {
		data: tags,
		timestamp: Date.now()
	});

	return tags;
}

export async function fetchItem(slug: string, options: FetchOptions = {}) {
	// Ensure content is available (copies from build to runtime on Vercel)
	const { ensureContentAvailable } = await import('./lib');
	await ensureContentAvailable();

	// Sanitize slug to prevent path traversal attacks
	const sanitizedSlug = sanitizeFilename(slug);

	// Additional validation for slug format (alphanumeric, hyphens, underscores only)
	if (!/^[a-zA-Z0-9_-]+$/.test(sanitizedSlug)) {
		throw new Error(`Invalid slug format: ${slug}`);
	}

	const dataDir = path.join('data', sanitizedSlug);
	const base = getContentPath();
	const metaPath = path.join(base, dataDir);

	// Validate that the constructed paths are safe
	validatePath(metaPath, base);
	const mdxPath = path.join(base, dataDir, `${sanitizedSlug}.mdx`);
	const mdPath = path.join(base, dataDir, `${sanitizedSlug}.md`);

	// Validate that the constructed paths are safe
	validatePath(mdxPath, path.join(base, dataDir));
	validatePath(mdPath, path.join(base, dataDir));

	// Use cached categories and tags to avoid repeated filesystem reads
	const categories = await getCachedCategoriesInternal(options);
	const tags = await getCachedTagsInternal(options);

	try {
		const meta = await parseItem(metaPath, `${sanitizedSlug}.yml`);
		if (!meta) {
			return null;
		}
		if (options.lang && options.lang !== 'en') {
			// Validate language code to prevent path traversal
			if (!validateLanguageCode(options.lang)) {
				throw new Error(`Invalid language code: ${options.lang}`);
			}
			console.log('fetching translation', sanitizedSlug, options.lang);
			const translation = await parseTranslation(metaPath, `${sanitizedSlug}.${options.lang}.yml`);
			if (translation) Object.assign(meta, translation);
		}

		if (Array.isArray(meta.tags)) {
			meta.tags = meta.tags.map((tag) => populateTag(tag, tags));
		}

		if (Array.isArray(meta.category)) {
			meta.category = meta.category.map((cat) => populateCategory(cat, categories));
		} else {
			meta.category = populateCategory(meta.category, categories);
		}

		let langMdxPath = null;
		let langMdPath = null;

		if (options.lang) {
			// Validate language code to prevent path traversal
			if (!validateLanguageCode(options.lang)) {
				throw new Error(`Invalid language code: ${options.lang}`);
			}
			langMdxPath = path.join(base, dataDir, `${sanitizedSlug}.${options.lang}.mdx`);
			langMdPath = path.join(base, dataDir, `${sanitizedSlug}.${options.lang}.md`);

			// Validate that the constructed paths are safe
			validatePath(langMdxPath, path.join(base, dataDir));
			validatePath(langMdPath, path.join(base, dataDir));
		}

		let contentPath = null;
		if (langMdxPath && (await fsExists(langMdxPath))) {
			contentPath = langMdxPath;
		} else if (langMdPath && (await fsExists(langMdPath))) {
			contentPath = langMdPath;
		} else if (await fsExists(mdxPath)) {
			contentPath = mdxPath;
		} else if (await fsExists(mdPath)) {
			contentPath = mdPath;
		}

		if (!contentPath) {
			return { meta };
		}

		// Use secure file reading function that validates path and prevents traversal
		try {
			const content = await safeReadFile(contentPath, base);
			return { meta, content };
		} catch (contentError) {
			console.warn(`Failed to load content file for ${sanitizedSlug}:`, contentError);

			// Fallback: try to use markdown field from YAML if available
			if (meta.markdown) {
				console.log(`Using markdown field from YAML for ${sanitizedSlug}`);
				return { meta, content: meta.markdown };
			}

			// Return item with meta but no content, so the page can still render
			return { meta, content: null };
		}
	} catch (error) {
		console.error(`Failed to load item ${sanitizedSlug}:`, error);
		return null;
	}
}

function eqID(value: string | { id: string }, id: string) {
	const valueId = typeof value === 'string' ? value : value?.id;
	if (!valueId || !id) {
		return false;
	}
	// Case-insensitive comparison to match URL encoding behavior
	return valueId.toLowerCase() === id.toLowerCase();
}

export async function fetchByCategory(raw: string, options: FetchOptions = {}) {
	const category = decodeURI(raw);
	const { categories, items, tags } = await fetchItems(options);

	const filteredItems = items.filter((item) => {
		if (Array.isArray(item.category)) {
			return item.category.some((c) => eqID(c, category));
		}
		return eqID(item.category, category);
	});

	const tagCountMap = new Map();
	for (const item of filteredItems) {
		if (Array.isArray(item.tags)) {
			for (const tag of item.tags) {
				const tagId = typeof tag === 'string' ? tag : tag.id;
				tagCountMap.set(tagId, (tagCountMap.get(tagId) || 0) + 1);
			}
		}
	}
	// Only include tags present in filtered items, with correct counts
	const filteredTags = Array.from(tags.values())
		.filter((tag) => tagCountMap.has(tag.id))
		.map((tag) => ({ ...tag, count: tagCountMap.get(tag.id) }));

	return {
		categories,
		tags: filteredTags,
		total: filteredItems.length,
		items: filteredItems
	};
}

export async function fetchByTag(raw: string, options: FetchOptions = {}) {
	const tag = decodeURI(raw);
	const { categories, items, total, tags } = await fetchItems(options);
	return {
		categories,
		tags,
		total,
		items: items.filter((item) => {
			if (Array.isArray(item.tags)) {
				return item.tags.some((t) => eqID(t, tag));
			}
			return false;
		})
	};
}

export async function fetchByCategoryAndTag(category: string, tag: string, options: FetchOptions = {}) {
	const { categories, items, tags } = await fetchItems(options);

	const filteredItems = items.filter((item) => {
		const belongsToCategory = Array.isArray(item.category)
			? item.category.some((c) => eqID(c, category))
			: eqID(item.category, category);

		if (!belongsToCategory) return false;

		return Array.isArray(item.tags) ? item.tags.some((t) => eqID(t, tag)) : eqID(item.tags, tag);
	});

	const originalTags = tags.map((tag) => ({
		...tag,
		count: tag.count ?? 0
	}));

	return {
		categories,
		tags: originalTags,
		total: filteredItems.length,
		items: filteredItems
	};
}

// Types for similar items
export interface SimilarItem {
	item: ItemData;
	score: number;
	commonTags: number;
	commonCategories: number;
}

// Performance metrics collection
const performanceMetrics = {
	totalCalls: 0,
	cacheHits: 0,
	averageResponseTime: 0,
	totalResponseTime: 0,
	lastCallTime: 0
};

/**
 * Updates performance metrics
 * @param responseTime - Response time in milliseconds
 * @param isCacheHit - Whether this was a cache hit
 */
function updatePerformanceMetrics(responseTime: number, isCacheHit: boolean = false): void {
	performanceMetrics.totalCalls++;
	performanceMetrics.totalResponseTime += responseTime;
	performanceMetrics.averageResponseTime = performanceMetrics.totalResponseTime / performanceMetrics.totalCalls;
	performanceMetrics.lastCallTime = Date.now();

	if (isCacheHit) {
		performanceMetrics.cacheHits++;
	}
}

/**
 * Gets performance metrics for monitoring
 * @returns Promise<object> - Performance statistics
 */
export async function getSimilarityPerformanceMetrics() {
	const cacheHitRate =
		performanceMetrics.totalCalls > 0 ? (performanceMetrics.cacheHits / performanceMetrics.totalCalls) * 100 : 0;

	return {
		totalCalls: performanceMetrics.totalCalls,
		cacheHits: performanceMetrics.cacheHits,
		cacheHitRate: cacheHitRate.toFixed(2) + '%',
		averageResponseTime: performanceMetrics.averageResponseTime.toFixed(2) + 'ms',
		totalResponseTime: performanceMetrics.totalResponseTime.toFixed(2) + 'ms',
		lastCallTime: new Date(performanceMetrics.lastCallTime).toISOString(),
		cacheSize: similarityCache.size
	};
}

/**
 * Clears performance metrics (useful for testing)
 */
export async function clearSimilarityPerformanceMetrics(): Promise<void> {
	performanceMetrics.totalCalls = 0;
	performanceMetrics.cacheHits = 0;
	performanceMetrics.averageResponseTime = 0;
	performanceMetrics.totalResponseTime = 0;
	performanceMetrics.lastCallTime = 0;
}

/**
 * Clears similarity cache (useful for testing or memory management)
 */
export async function clearSimilarityCache(): Promise<void> {
	similarityCache.clear();
	console.log('[Similarity] Cache cleared');
}

/**
 * Gets cache statistics
 * @returns Promise<object> - Cache information
 */
export async function getSimilarityCacheStats() {
	let validEntries = 0;
	let expiredEntries = 0;

	for (const [, value] of similarityCache.entries()) {
		if (isCacheValid(value.timestamp, value.ttl)) {
			validEntries++;
		} else {
			expiredEntries++;
		}
	}

	return {
		totalEntries: similarityCache.size,
		validEntries,
		expiredEntries,
		cacheTTL: CACHE_TTL / 1000 + 's'
	};
}

/**
 * Fetches static page content from .content/pages/ directory
 * @param slug - Page slug (e.g., 'privacy-policy', 'terms-of-service', 'about')
 * @param locale - Optional locale code (e.g., 'en', 'de', 'fr'). Defaults to 'en'
 * @returns Promise<{content: string, metadata: Record<string, unknown>} | null>
 */
export async function fetchPageContent(
	slug: string,
	locale: string = 'en'
): Promise<{ content: string; metadata: Record<string, unknown> } | null> {
	try {
		// Ensure content is available (copies from build to runtime on Vercel)
		const { ensureContentAvailable } = await import('./lib');
		await ensureContentAvailable();

		const base = getContentPath();
		const pagesDir = path.join(base, 'pages');

		// Sanitize inputs to prevent path traversal
		const sanitizedSlug = sanitizeFilename(slug);
		if (!validateLanguageCode(locale)) {
			throw new Error(`Invalid language code: ${locale}`);
		}

		// Check if pages directory exists
		if (!(await dirExists(pagesDir))) {
			console.warn(`Pages directory does not exist: ${pagesDir}`);
			return null;
		}

		// Try to load localized version first, then fall back to English
		const localizedPath = path.join(pagesDir, `${sanitizedSlug}.${locale}.md`);
		const defaultPath = path.join(pagesDir, `${sanitizedSlug}.en.md`);

		// Validate paths
		validatePath(localizedPath, pagesDir);
		validatePath(defaultPath, pagesDir);

		let contentPath: string | null = null;

		// Try localized version first
		if (locale !== 'en' && (await fsExists(localizedPath))) {
			contentPath = localizedPath;
		} else if (await fsExists(defaultPath)) {
			contentPath = defaultPath;
		}

		if (!contentPath) {
			const warningKey = `${sanitizedSlug}:${locale}`;
			if (!missingPageWarnings.has(warningKey) && process.env.NODE_ENV !== 'production') {
				missingPageWarnings.add(warningKey);
				console.warn(`[CONTENT] Page content not found; using route fallback: ${sanitizedSlug} (locale: ${locale})`);
			}
			return null;
		}

		// Read file content securely
		const rawContent = await safeReadFile(contentPath, base);

		// Parse frontmatter if present
		const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
		const match = rawContent.match(frontmatterRegex);

		let metadata: Record<string, unknown> = {};
		let content: string = rawContent;

		if (match) {
			try {
				metadata = yaml.parse(match[1]) || {};
				content = match[2];
			} catch (yamlError) {
				console.warn(`Failed to parse frontmatter for ${sanitizedSlug}:`, yamlError);
				// If frontmatter parsing fails, use the entire content
				content = rawContent;
			}
		}

		return { content, metadata };
	} catch (error) {
		console.error(`Failed to fetch page content for ${slug}:`, error);
		return null;
	}
}

/**
 * Fetch custom hero content from a markdown file
 * Supports locale-specific files (hero.en.md, hero.fr.md) with fallback
 * Parses frontmatter for theme, alignment, and background settings
 */
export async function fetchHeroContent(source: string, locale: string = 'en'): Promise<CustomHeroContent | null> {
	try {
		// Ensure content is available (copies from build to runtime on Vercel)
		const { ensureContentAvailable } = await import('./lib');
		await ensureContentAvailable();

		const base = getContentPath();

		// Normalize source path (remove leading slash if present)
		const normalizedSource = source.startsWith('/') ? source.slice(1) : source;

		// Extract directory and filename parts
		const sourceDir = path.dirname(normalizedSource);
		const sourceFile = path.basename(normalizedSource, '.md');

		// Sanitize inputs to prevent path traversal
		if (!validateLanguageCode(locale)) {
			console.warn(`[CONTENT] Invalid language code "${locale}" for fetchHeroContent()`);
			locale = 'en'; // fallback
		}

		const blocksDir = path.join(base, sourceDir);

		// Check if blocks directory exists
		if (!(await dirExists(blocksDir))) {
			console.warn(`Hero content directory does not exist: ${blocksDir}`);
			return null;
		}

		// Try locale-specific version first, then default, then base file
		const localizedPath = path.join(blocksDir, `${sourceFile}.${locale}.md`);
		const defaultPath = path.join(blocksDir, `${sourceFile}.en.md`);
		const basePath = path.join(blocksDir, `${sourceFile}.md`);

		// Validate paths
		validatePath(localizedPath, base);
		validatePath(defaultPath, base);
		validatePath(basePath, base);

		let contentPath: string | null = null;

		// Try localized version first
		if (locale !== 'en' && (await fsExists(localizedPath))) {
			contentPath = localizedPath;
		} else if (await fsExists(defaultPath)) {
			contentPath = defaultPath;
		} else if (await fsExists(basePath)) {
			contentPath = basePath;
		}

		if (!contentPath) {
			console.warn(`Hero content not found: ${source} (locale: ${locale})`);
			return null;
		}

		// Read file content securely
		const rawContent = await safeReadFile(contentPath, base);

		// Parse frontmatter if present
		const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
		const match = rawContent.match(frontmatterRegex);

		let frontmatter: CustomHeroFrontmatter = {};
		let content: string = rawContent;

		if (match) {
			try {
				const parsed = yaml.parse(match[1]) || {};

				// Validate frontmatter with Zod schema
				const validationResult = customHeroFrontmatterSchema.safeParse({
					background_image: parsed.background_image,
					theme: parsed.theme,
					alignment: parsed.alignment,
					min_height: parsed.min_height,
					overlay_opacity: typeof parsed.overlay_opacity === 'number' ? parsed.overlay_opacity : undefined
				});

				if (validationResult.success) {
					frontmatter = validationResult.data;
				} else {
					// Log validation errors but continue with empty frontmatter
					console.warn(
						'Invalid hero frontmatter for %s: %s',
						source,
						validationResult.error.issues.map((i) => i.message).join(', ')
					);
				}

				content = match[2];
			} catch (yamlError) {
				console.warn('Failed to parse hero frontmatter for %s:', source, yamlError);
				content = rawContent;
			}
		}

		return { content, frontmatter };
	} catch (error) {
		console.error('Failed to fetch hero content for %s:', source, error);
		return null;
	}
}

// ============================================================================
// CACHED WRAPPERS
// ============================================================================
// Listings: short-TTL unstable_cache keyed by content revision so cold starts
// don't re-walk the YAML tree. Single-item / page reads keep the longer TTL.

/**
 * A listing may only be persisted in Next's Data Cache (`unstable_cache`) if it fits the 2MB
 * per-entry ceiling. Beyond it, `unstable_cache` silently discards the entry and recomputes +
 * re-serializes the whole payload on EVERY request (`items over 2MB can not be cached`), which
 * pegs CPU on large directories. When a listing is too big we skip the persistent layer and let
 * the in-memory `fetchItemsCache` (10-min TTL, cleared on content sync) serve it instead.
 * See {@link DATA_CACHE_MAX_ITEMS}.
 */
const canPersistListing = (itemCount: number): boolean => itemCount <= DATA_CACHE_MAX_ITEMS;

export const getCachedItems = async (options: FetchOptions = {}) => {
	if (!CONTENT_CACHE_ENABLED) {
		return fetchItems(options);
	}

	// `fetchItems` is in-memory cached, so this is cheap on the hot path and lets us size-gate
	// the (2MB-capped) Data Cache layer before paying to serialize an oversized catalogue.
	const result = await fetchItems(options);
	if (!canPersistListing(result.items.length)) {
		return result;
	}

	const locale = options.lang || 'en';
	const revision = await getContentRevision();
	const optionsKey = JSON.stringify(options);
	return unstable_cache(
		async (_revision: string, _optionsKey: string) => fetchItems(options),
		['items', locale],
		{
			revalidate: CONTENT_CACHE_TTL.LISTING,
			tags: [
				CACHE_TAGS.CONTENT,
				CACHE_TAGS.ITEMS,
				CACHE_TAGS.CATEGORIES,
				CACHE_TAGS.TAGS,
				CACHE_TAGS.COLLECTIONS,
				CACHE_TAGS.ITEMS_LOCALE(locale)
			]
		}
	)(revision, optionsKey);
};

export const getCachedComparisons = async (options: FetchOptions = {}) => {
	const locale = options.lang || 'en';
	return unstable_cache(
		async () => {
			return await fetchComparisons();
		},
		['comparisons', locale],
		{
			revalidate: CONTENT_CACHE_TTL.CONTENT,
			tags: [CACHE_TAGS.CONTENT, CACHE_TAGS.COMPARISONS, CACHE_TAGS.COMPARISONS_LOCALE(locale)]
		}
	)();
};

export const getCachedComparison = async (slug: string, options: FetchOptions = {}) => {
	const locale = options.lang || 'en';
	return unstable_cache(
		async () => {
			return await fetchComparison(slug);
		},
		['comparison', slug, locale],
		{
			revalidate: CONTENT_CACHE_TTL.ITEM,
			tags: [CACHE_TAGS.CONTENT, CACHE_TAGS.COMPARISONS]
		}
	)();
};

/**
 * Cached version of fetchItem()
 * Cache key includes slug and locale
 * Tagged with CONTENT and specific ITEM tag for granular invalidation
 */
export const getCachedItem = async (slug: string, options: FetchOptions = {}) => {
	if (!CONTENT_CACHE_ENABLED) {
		return fetchItem(slug, options);
	}

	const locale = options.lang || 'en';
	const revision = await getContentRevision();
	const optionsKey = JSON.stringify(options);
	return unstable_cache(
		async (_revision: string, _optionsKey: string) => {
			return await fetchItem(slug, options);
		},
		['item', slug, locale],
		{
			revalidate: CONTENT_CACHE_TTL.ITEM,
			tags: [CACHE_TAGS.CONTENT, CACHE_TAGS.ITEMS, CACHE_TAGS.ITEM(slug)]
		}
	)(revision, optionsKey);
};

/**
 * Cached version of {@link fetchSimilarItems}.
 *
 * `fetchSimilarItems` is expensive on a cold path: it loads *every* item's
 * metadata via `fetchItems` and scores the whole catalogue. Its only built-in
 * cache is a per-process in-memory `Map`, which is lost on every serverless
 * cold start and is not shared across pods — so the item-detail page paid the
 * full all-items scan on each fresh instance.
 *
 * This wrapper layers Next's `unstable_cache` (the persisted Data Cache,
 * shared across instances and survivable across cold starts) on top, keyed by
 * slug + locale + maxResults and pinned to the content revision so a repo sync
 * invalidates it. We disable the inner in-memory cache (`useCache = false`)
 * here so the two layers don't double-store the same payload — `unstable_cache`
 * owns persistence and request de-duplication on this path.
 *
 * Tagged identically to {@link getCachedItem} (`CONTENT` / `ITEMS` /
 * `ITEM(slug)`) so existing revalidation hooks invalidate it for free.
 */
export const getCachedSimilarItems = async (
	currentItem: ItemData,
	maxResults: number = 6,
	options: FetchOptions = {}
): Promise<SimilarItem[]> => {
	if (!CONTENT_CACHE_ENABLED || !currentItem.slug) {
		return fetchSimilarItems(currentItem, maxResults, options);
	}

	const locale = options.lang || 'en';
	const revision = await getContentRevision();
	return unstable_cache(
		async (_revision: string) => fetchSimilarItems(currentItem, maxResults, options, false),
		['similar-items', currentItem.slug, locale, String(maxResults)],
		{
			revalidate: CONTENT_CACHE_TTL.ITEM,
			tags: [CACHE_TAGS.CONTENT, CACHE_TAGS.ITEMS, CACHE_TAGS.ITEM(currentItem.slug)]
		}
	)(revision);
};

/**
 * Cached version of fetchPageContent()
 * Cache key includes slug and locale
 * Tagged with CONTENT and PAGES for cache invalidation
 */
export const getCachedPageContent = async (slug: string, locale: string = 'en') => {
	return unstable_cache(
		async () => {
			return await fetchPageContent(slug, locale);
		},
		['page', slug, locale],
		{
			revalidate: CONTENT_CACHE_TTL.PAGES,
			tags: [CACHE_TAGS.CONTENT, CACHE_TAGS.PAGES, CACHE_TAGS.PAGE(slug)]
		}
	)();
};

/**
 * Cached version of fetchHeroContent()
 * Cache key includes source path and locale
 * Tagged with CONTENT for cache invalidation on repository sync
 */
export const getCachedHeroContent = async (source: string, locale: string = 'en') => {
	return unstable_cache(
		async () => {
			return await fetchHeroContent(source, locale);
		},
		['hero', source, locale],
		{
			revalidate: CONTENT_CACHE_TTL.PAGES,
			tags: [CACHE_TAGS.CONTENT, CACHE_TAGS.PAGES]
		}
	)();
};

export const getCachedItemsByCategory = async (raw: string, options: FetchOptions = {}) => {
	if (!CONTENT_CACHE_ENABLED) {
		return fetchByCategory(raw, options);
	}

	const result = await fetchByCategory(raw, options);
	if (!canPersistListing(result.items.length)) {
		return result;
	}

	const locale = options.lang || 'en';
	const revision = await getContentRevision();
	const optionsKey = JSON.stringify(options);
	return unstable_cache(
		async (_revision: string, _optionsKey: string) => fetchByCategory(raw, options),
		['items-by-category', raw, locale],
		{
			revalidate: CONTENT_CACHE_TTL.LISTING,
			tags: [CACHE_TAGS.CONTENT, CACHE_TAGS.ITEMS, CACHE_TAGS.CATEGORIES]
		}
	)(revision, optionsKey);
};

export const getCachedItemsByTag = async (raw: string, options: FetchOptions = {}) => {
	if (!CONTENT_CACHE_ENABLED) {
		return fetchByTag(raw, options);
	}

	const result = await fetchByTag(raw, options);
	if (!canPersistListing(result.items.length)) {
		return result;
	}

	const locale = options.lang || 'en';
	const revision = await getContentRevision();
	const optionsKey = JSON.stringify(options);
	return unstable_cache(
		async (_revision: string, _optionsKey: string) => fetchByTag(raw, options),
		['items-by-tag', raw, locale],
		{
			revalidate: CONTENT_CACHE_TTL.LISTING,
			tags: [CACHE_TAGS.CONTENT, CACHE_TAGS.ITEMS, CACHE_TAGS.TAGS]
		}
	)(revision, optionsKey);
};

export const getCachedItemsByCategoryAndTag = async (category: string, tag: string, options: FetchOptions = {}) => {
	if (!CONTENT_CACHE_ENABLED) {
		return fetchByCategoryAndTag(category, tag, options);
	}

	const result = await fetchByCategoryAndTag(category, tag, options);
	if (!canPersistListing(result.items.length)) {
		return result;
	}

	const locale = options.lang || 'en';
	const revision = await getContentRevision();
	const optionsKey = JSON.stringify(options);
	return unstable_cache(
		async (_revision: string, _optionsKey: string) => fetchByCategoryAndTag(category, tag, options),
		['items-by-category-tag', category, tag, locale],
		{
			revalidate: CONTENT_CACHE_TTL.LISTING,
			tags: [CACHE_TAGS.CONTENT, CACHE_TAGS.ITEMS, CACHE_TAGS.CATEGORIES, CACHE_TAGS.TAGS]
		}
	)(revision, optionsKey);
};
