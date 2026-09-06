import { MetadataRoute } from 'next';
import {
	getCachedAllPostSummaries,
	getCachedComparisons,
	getCachedItems,
	getCachedPostTaxonomies
} from '@/lib/content';
import type { PostSummary } from '@/types/post';
import { buildCategoryHref, buildPostHref, buildTagHref } from '@/lib/blog/urls';

// Types
interface RouteConfig {
	path: string;
	priority: number;
	changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
}

interface SitemapEntry {
	url: string;
	lastModified: Date;
	changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
	priority: number;
	images?: string[];
}

// Constants
const DEFAULT_PRIORITIES = {
	HOME: 1.0,
	MAIN: 0.9,
	SECONDARY: 0.8,
	TERTIARY: 0.7,
	LOW: 0.5
} as const;

const DEFAULT_CHANGE_FREQUENCIES = {
	DAILY: 'daily',
	WEEKLY: 'weekly',
	MONTHLY: 'monthly'
} as const;

const appUrl =
	process.env.NEXT_PUBLIC_APP_URL ??
	(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://demo.ever.works');

// Configuration
const STATIC_ROUTES: RouteConfig[] = [
	{
		path: '',
		priority: DEFAULT_PRIORITIES.HOME,
		changeFrequency: DEFAULT_CHANGE_FREQUENCIES.DAILY
	},
	{
		path: '/about',
		priority: DEFAULT_PRIORITIES.SECONDARY,
		changeFrequency: DEFAULT_CHANGE_FREQUENCIES.WEEKLY
	},
	{
		path: '/help',
		priority: DEFAULT_PRIORITIES.MAIN,
		changeFrequency: DEFAULT_CHANGE_FREQUENCIES.WEEKLY
	},
	{
		path: '/pricing',
		priority: DEFAULT_PRIORITIES.MAIN,
		changeFrequency: DEFAULT_CHANGE_FREQUENCIES.WEEKLY
	},
	{
		path: '/categories',
		priority: DEFAULT_PRIORITIES.MAIN,
		changeFrequency: DEFAULT_CHANGE_FREQUENCIES.DAILY
	},
	{
		path: '/tags',
		priority: DEFAULT_PRIORITIES.MAIN,
		changeFrequency: DEFAULT_CHANGE_FREQUENCIES.DAILY
	},
	{
		path: '/collections',
		priority: DEFAULT_PRIORITIES.MAIN,
		changeFrequency: DEFAULT_CHANGE_FREQUENCIES.WEEKLY
	},
	{
		path: '/comparisons',
		priority: DEFAULT_PRIORITIES.MAIN,
		changeFrequency: DEFAULT_CHANGE_FREQUENCIES.WEEKLY
	},
	{
		path: '/submit',
		priority: DEFAULT_PRIORITIES.TERTIARY,
		changeFrequency: DEFAULT_CHANGE_FREQUENCIES.WEEKLY
	},
	{
		path: '/privacy-policy',
		priority: DEFAULT_PRIORITIES.LOW,
		changeFrequency: DEFAULT_CHANGE_FREQUENCIES.MONTHLY
	},
	{
		path: '/terms-of-service',
		priority: DEFAULT_PRIORITIES.LOW,
		changeFrequency: DEFAULT_CHANGE_FREQUENCIES.MONTHLY
	},
	{
		path: '/cookies',
		priority: DEFAULT_PRIORITIES.LOW,
		changeFrequency: DEFAULT_CHANGE_FREQUENCIES.MONTHLY
	}
];

const PAGINATION_ROUTES = ['/tags/paging', '/collections/paging'];

// Helper functions
const getBaseUrl = (): string => {
	return appUrl.replace(/\/+$/, '');
};

const sanitizeSlug = (slug: string): string => {
	// Remove any potentially dangerous characters and ensure valid URL format
	return slug
		.replace(/[^a-zA-Z0-9\-_]/g, '-')
		.replace(/--+/g, '-')
		.replace(/^-|-$/g, '')
		.toLowerCase();
};

const validateSlug = (slug: string): boolean => {
	// Ensure slug is safe and not empty
	return Boolean(slug && slug.length > 0 && slug.length < 200 && /^[a-zA-Z0-9\-_]+$/.test(slug));
};

/** Unicode control characters, which cannot appear in a real post filename. */
const CONTROL_CHARACTERS = /\p{Cc}/u;

/**
 * Whether a blog post slug may be advertised in the sitemap.
 *
 * Deliberately NOT `validateSlug()`. Post slugs are filenames from the data
 * repository, and a filename may legally hold a space, an accent or a `?` —
 * `buildPostHref()` exists to percent-encode exactly that into one safe path
 * segment. Rejecting anything outside `[a-zA-Z0-9-_]` therefore dropped those
 * posts from the sitemap while the listing still linked to them and the feed
 * still announced them, making the one surface whose whole job is
 * discoverability the only one that hid them. Encoding is what makes the URL
 * safe here, so this rejects only what could not be a post at all.
 */
const validatePostSlug = (slug: string): boolean => {
	return Boolean(slug) && slug.length < 200 && !CONTROL_CHARACTERS.test(slug);
};

/**
 * Converts an icon URL to an absolute URL for sitemap image entries.
 * Uses the URL constructor for robust resolution of relative paths,
 * protocol-relative URLs, and already-absolute URLs.
 * @param iconUrl - The icon URL from the item data
 * @param baseUrl - The base URL of the site
 * @returns Absolute URL string or null if the URL is invalid
 */
const toAbsoluteImageUrl = (iconUrl: string | undefined, baseUrl: string): string | null => {
	if (!iconUrl || typeof iconUrl !== 'string' || iconUrl.trim() === '') {
		return null;
	}

	try {
		const url = new URL(iconUrl.trim(), baseUrl);
		if (url.protocol !== 'http:' && url.protocol !== 'https:') {
			return null;
		}
		return url.toString();
	} catch {
		return null;
	}
};

const generateStaticRoutes = (baseUrl: string): SitemapEntry[] => {
	return STATIC_ROUTES.map((route) => ({
		url: `${baseUrl}${route.path}`,
		lastModified: new Date(),
		changeFrequency: route.changeFrequency,
		priority: route.priority
	}));
};

/**
 * The blog listing route, in the default locale and every prefixed one.
 *
 * Deliberately NOT a `STATIC_ROUTES` entry: the blog only exists when the data
 * repository actually ships posts, and a sitemap that advertises `/blog` on a
 * directory with none sends crawlers to an empty-state page. Emitted only when
 * `generateDynamicRoutes()` found at least one post.
 */
const generateBlogListingRoutes = (baseUrl: string): SitemapEntry[] => [
	{
		url: `${baseUrl}/blog`,
		lastModified: new Date(),
		changeFrequency: DEFAULT_CHANGE_FREQUENCIES.WEEKLY,
		priority: DEFAULT_PRIORITIES.MAIN
	},
	...PREFIXED_LOCALES.map((locale) => ({
		url: `${baseUrl}/${locale}/blog`,
		lastModified: new Date(),
		changeFrequency: DEFAULT_CHANGE_FREQUENCIES.WEEKLY,
		priority: DEFAULT_PRIORITIES.MAIN
	}))
];

const generatePaginationRoutes = (baseUrl: string): SitemapEntry[] => {
	return PAGINATION_ROUTES.map((route) => ({
		url: `${baseUrl}${route}`,
		lastModified: new Date(),
		changeFrequency: DEFAULT_CHANGE_FREQUENCIES.WEEKLY,
		priority: DEFAULT_PRIORITIES.LOW
	}));
};

/** Locales that carry a URL prefix (the default locale is served unprefixed). */
const PREFIXED_LOCALES = ['fr', 'es', 'de', 'ar', 'zh'];

const generateLocaleRoutes = (baseUrl: string): SitemapEntry[] => {
	const locales = ['en', ...PREFIXED_LOCALES];
	const routes: SitemapEntry[] = [];

	locales.forEach((locale) => {
		STATIC_ROUTES.forEach((route) => {
			if (locale !== 'en') {
				// Skip default locale prefix
				routes.push({
					url: `${baseUrl}/${locale}${route.path}`,
					lastModified: new Date(),
					changeFrequency: route.changeFrequency,
					priority: route.priority
				});
			}
		});
	});

	return routes;
};

/**
 * Every published post.
 *
 * Uses the unpaginated loader rather than walking `getCachedPosts()` page by
 * page: that loader re-reads and re-parses the entire posts directory on every
 * call, so paging through it would cost O(posts x pages) and would also need
 * an arbitrary page cap that silently truncates a large blog. One pass, no cap,
 * every post.
 */
const fetchAllPostsForSitemap = async (): Promise<PostSummary[]> => {
	try {
		return await getCachedAllPostSummaries();
	} catch {
		// A directory without a posts folder simply contributes no blog URLs.
		return [];
	}
};

const generateDynamicRoutes = async (baseUrl: string): Promise<{ entries: SitemapEntry[]; hasPosts: boolean }> => {
	try {
		const [{ items, categories, tags, collections }, { comparisons }, posts, postTaxonomies] = await Promise.all([
			getCachedItems(),
			getCachedComparisons(),
			// The blog is optional: a data repository without a posts folder
			// resolves to an empty list rather than failing the sitemap.
			fetchAllPostsForSitemap(),
			getCachedPostTaxonomies().catch(() => ({ categories: [], tags: [] }))
		]);

		const entries: SitemapEntry[] = [
			// Items - validate and sanitize slugs, include images for items with icon_url
			...items
				.filter((item) => item.slug && validateSlug(item.slug))
				.map((item) => {
					const entry: SitemapEntry = {
						url: `${baseUrl}/items/${sanitizeSlug(item.slug)}`,
						lastModified: item.updatedAt,
						changeFrequency: DEFAULT_CHANGE_FREQUENCIES.WEEKLY,
						priority: item.featured ? DEFAULT_PRIORITIES.MAIN : DEFAULT_PRIORITIES.SECONDARY
					};

					const absoluteImageUrl = toAbsoluteImageUrl(item.icon_url, baseUrl);
					if (absoluteImageUrl) {
						entry.images = [absoluteImageUrl];
					}

					return entry;
				}),
			...categories
				.filter((category) => category.id && validateSlug(category.id))
				.map((category) => ({
					url: `${baseUrl}/categories/category/${sanitizeSlug(category.id)}`,
					lastModified: new Date(),
					changeFrequency: DEFAULT_CHANGE_FREQUENCIES.WEEKLY,
					priority: DEFAULT_PRIORITIES.SECONDARY
				})),
			...tags
				.filter((tag) => tag.id && validateSlug(tag.id))
				.map((tag) => ({
					url: `${baseUrl}/tags/${sanitizeSlug(tag.id)}`,
					lastModified: new Date(),
					changeFrequency: DEFAULT_CHANGE_FREQUENCIES.WEEKLY,
					priority: DEFAULT_PRIORITIES.TERTIARY
				})),
			...collections
				.filter((collection) => collection.isActive !== false && (collection.slug || collection.id))
				.map((collection) => ({
					url: `${baseUrl}/collections/${sanitizeSlug(collection.slug || collection.id)}`,
					lastModified: new Date(),
					changeFrequency: DEFAULT_CHANGE_FREQUENCIES.WEEKLY,
					priority: DEFAULT_PRIORITIES.SECONDARY
				})),
			...comparisons
				.filter((comparison) => comparison.slug && validateSlug(comparison.slug))
				.map((comparison) => ({
					url: `${baseUrl}/comparisons/${sanitizeSlug(comparison.slug)}`,
					lastModified: new Date(comparison.generated_at),
					changeFrequency: DEFAULT_CHANGE_FREQUENCIES.WEEKLY,
					priority: DEFAULT_PRIORITIES.SECONDARY
				})),
			// Blog posts (Spec 050)
			...posts
				.filter((post) => validatePostSlug(post.slug))
				.map((post) => {
					const lastModified = post.date ? new Date(post.date) : new Date();
					const entry: SitemapEntry = {
						// NOT `sanitizeSlug()`: it lowercases, and the post loader looks
						// slugs up against filenames case-sensitively, so a post file with
						// an uppercase letter would be advertised at a URL that 404s.
						// `buildPostHref()` is the same builder the in-app links use, so
						// the sitemap can never advertise a different URL than the site
						// links to.
						url: `${baseUrl}${buildPostHref(post.slug)}`,
						lastModified: Number.isNaN(lastModified.getTime()) ? new Date() : lastModified,
						changeFrequency: DEFAULT_CHANGE_FREQUENCIES.MONTHLY,
						priority: DEFAULT_PRIORITIES.SECONDARY
					};

					const absoluteImageUrl = toAbsoluteImageUrl(post.image, baseUrl);
					if (absoluteImageUrl) {
						entry.images = [absoluteImageUrl];
					}

					return entry;
				}),
			// Blog taxonomy archives — only terms that actually have posts, so
			// the sitemap never advertises an empty archive. As with post slugs,
			// the validated term id is used verbatim: the archive routes match it
			// exactly, so any rewriting here would advertise a URL that 404s.
			...postTaxonomies.categories
				.filter((category) => category.count > 0 && validateSlug(category.id))
				.map((category) => ({
					url: `${baseUrl}${buildCategoryHref(category.id)}`,
					lastModified: new Date(),
					changeFrequency: DEFAULT_CHANGE_FREQUENCIES.WEEKLY,
					priority: DEFAULT_PRIORITIES.TERTIARY
				})),
			...postTaxonomies.tags
				.filter((tag) => tag.count > 0 && validateSlug(tag.id))
				.map((tag) => ({
					url: `${baseUrl}${buildTagHref(tag.id)}`,
					lastModified: new Date(),
					changeFrequency: DEFAULT_CHANGE_FREQUENCIES.WEEKLY,
					priority: DEFAULT_PRIORITIES.TERTIARY
				}))
		];

		// The blog listing URL rides along here rather than in STATIC_ROUTES so
		// it is advertised only when the data repository actually ships posts.
		const hasPosts = posts.length > 0;
		return {
			entries: hasPosts ? [...entries, ...generateBlogListingRoutes(baseUrl)] : entries,
			hasPosts
		};
	} catch (error) {
		console.error('Failed to generate dynamic routes:', error);
		return { entries: [], hasPosts: false };
	}
};

// Main sitemap generator
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	try {
		const baseUrl = getBaseUrl();

		const [staticRoutes, paginationRoutes, localeRoutes, dynamicRoutes] = await Promise.all([
			Promise.resolve(generateStaticRoutes(baseUrl)),
			Promise.resolve(generatePaginationRoutes(baseUrl)),
			Promise.resolve(generateLocaleRoutes(baseUrl)),
			generateDynamicRoutes(baseUrl)
		]);

		return [...staticRoutes, ...dynamicRoutes.entries, ...paginationRoutes, ...localeRoutes];
	} catch (error) {
		console.error('Error generating sitemap:', error);
		// Return basic sitemap with static routes in case of error
		const baseUrl = getBaseUrl();
		return generateStaticRoutes(baseUrl);
	}
}
