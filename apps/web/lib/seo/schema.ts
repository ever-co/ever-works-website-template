/**
 * SEO Schema.org Structured Data Utilities
 * Generates JSON-LD schemas for various content types
 */

import { siteConfig } from '@/lib/config/client';
import { DEFAULT_LOCALE } from '@/lib/constants';

export interface ProductSchemaInput {
	name: string;
	description: string;
	image?: string;
	url: string;
	category?: string;
	sourceUrl?: string;
	brandName?: string;
}

export interface CollectionSchemaInput {
	name: string;
	description?: string;
	url: string;
	image?: string;
	itemCount?: number;
}

export interface ComparisonSchemaInput {
	title: string;
	description?: string;
	url: string;
	datePublished?: string;
	itemAName?: string;
	itemBName?: string;
	category?: string;
}

/**
 * Generate Product schema for item detail pages
 */
export function generateProductSchema(input: ProductSchemaInput) {
	const schema: Record<string, any> = {
		'@context': 'https://schema.org',
		'@type': 'Product',
		name: input.name,
		description: input.description,
		url: input.url
	};

	// Add optional fields
	if (input.image) {
		schema.image = input.image;
	}

	if (input.category) {
		schema.category = input.category;
	}

	if (input.brandName) {
		schema.brand = {
			'@type': 'Brand',
			name: input.brandName
		};
	}

	// Add offer if source URL is available
	if (input.sourceUrl) {
		schema.offers = {
			'@type': 'Offer',
			url: input.sourceUrl,
			availability: 'https://schema.org/InStock'
		};
	}

	return schema;
}

/**
 * Generate CollectionPage schema for curated collection detail pages
 */
export function generateCollectionSchema(input: CollectionSchemaInput) {
	const schema: Record<string, any> = {
		'@context': 'https://schema.org',
		'@type': 'CollectionPage',
		name: input.name,
		url: input.url
	};

	if (input.description) {
		schema.description = input.description;
	}

	if (input.image) {
		schema.image = input.image;
	}

	if (typeof input.itemCount === 'number') {
		schema.mainEntity = {
			'@type': 'ItemList',
			numberOfItems: input.itemCount
		};
	}

	return schema;
}

/**
 * Generate Article-like schema for comparison detail pages
 */
export function generateComparisonSchema(input: ComparisonSchemaInput) {
	const schema: Record<string, any> = {
		'@context': 'https://schema.org',
		'@type': 'Article',
		headline: input.title,
		url: input.url
	};

	if (input.description) {
		schema.description = input.description;
	}

	if (input.datePublished) {
		schema.datePublished = input.datePublished;
	}

	if (input.category) {
		schema.articleSection = input.category;
	}

	if (input.itemAName || input.itemBName) {
		schema.about = [input.itemAName, input.itemBName].filter(Boolean).map((name) => ({
			'@type': 'Thing',
			name
		}));
	}

	return schema;
}

/**
 * Generate Organization schema for brand identity
 * Includes social profiles (sameAs) and contact point for Knowledge Panel visibility
 */
export function generateOrganizationSchema() {
	// Build sameAs array from social profiles, filtering out empty values
	const sameAs = [
		siteConfig.social.github,
		siteConfig.social.x,
		siteConfig.social.linkedin,
		siteConfig.social.facebook,
		siteConfig.social.blog
	].filter(Boolean);

	const schema: Record<string, unknown> = {
		'@context': 'https://schema.org',
		'@type': 'Organization',
		name: siteConfig.brandName,
		url: siteConfig.url,
		logo: `${siteConfig.url}${siteConfig.logo}`,
		description: siteConfig.description
	};

	// Only add sameAs if there are valid social profiles
	if (sameAs.length > 0) {
		schema.sameAs = sameAs;
	}

	// Add contact point if email is configured
	if (siteConfig.social.email) {
		schema.contactPoint = {
			'@type': 'ContactPoint',
			email: siteConfig.social.email,
			contactType: 'customer service'
		};
	}

	return schema;
}

/**
 * Generate WebSite schema with search action
 */
/**
 * @param overrides - optional site identity resolved server-side (see lib/seo/site-identity.ts);
 *                    defaults to the build-time `siteConfig` values so client callers keep working.
 */
export function generateWebSiteSchema(locale: string, overrides?: { name?: string; description?: string }) {
	const localePrefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
	return {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name: overrides?.name ?? siteConfig.name,
		description: overrides?.description ?? siteConfig.description,
		url: `${siteConfig.url}${localePrefix}`,
		potentialAction: {
			'@type': 'SearchAction',
			target: {
				'@type': 'EntryPoint',
				urlTemplate: `${siteConfig.url}${localePrefix}?q={search_term_string}`
			},
			'query-input': 'required name=search_term_string'
		}
	};
}

export interface FaqEntry {
	question: string;
	answer: string;
}

export interface FaqPageSchemaInput {
	entries: ReadonlyArray<FaqEntry>;
	url?: string;
	name?: string;
	description?: string;
}

/**
 * Generate FAQPage schema for pages that answer a list of common questions.
 *
 * Google's FAQPage rich result requires at least one `Question` whose
 * `acceptedAnswer` carries non-empty text, so entries missing either half
 * are dropped and `null` is returned when nothing usable survives. Callers
 * must therefore null-check before serialising.
 *
 * @see https://developers.google.com/search/docs/appearance/structured-data/faqpage
 */
export function generateFaqPageSchema(input: FaqPageSchemaInput) {
	const entries = input.entries.filter((entry) => entry.question.trim().length > 0 && entry.answer.trim().length > 0);

	if (entries.length === 0) {
		return null;
	}

	const schema: Record<string, unknown> = {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: entries.map((entry) => ({
			'@type': 'Question',
			name: entry.question.trim(),
			acceptedAnswer: {
				'@type': 'Answer',
				text: entry.answer.trim()
			}
		}))
	};

	if (input.name) {
		schema.name = input.name;
	}

	if (input.description) {
		schema.description = input.description;
	}

	if (input.url) {
		schema.url = input.url;
	}

	return schema;
}

export interface BreadcrumbItem {
	name: string;
	url: string;
}

/**
 * Generate BreadcrumbList schema for navigation
 */
export function generateBreadcrumbSchema(items: BreadcrumbItem[]) {
	return {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: items.map((item, index) => ({
			'@type': 'ListItem',
			position: index + 1,
			name: item.name,
			item: item.url
		}))
	};
}
