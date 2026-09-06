'use server';

import 'server-only';
import yaml from 'yaml';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import { unstable_cache } from 'next/cache';
import { CACHE_TAGS, CACHE_TTL as CONTENT_CACHE_TTL } from './cache-config';
import { dirExists, fsExists, getContentPath } from './lib';

export interface ContentSignals {
	hasCategories: boolean;
	hasTags: boolean;
	hasCollections: boolean;
	hasComparisons: boolean;
	hasPosts: boolean;
}

async function readCollectionExists(type: 'categories' | 'tags' | 'collections'): Promise<boolean> {
	const filePath = path.join(getContentPath(), `${type}.yml`);
	if (!(await fsExists(filePath))) {
		return false;
	}

	try {
		const raw = await fsp.readFile(filePath, 'utf8');
		const parsed = yaml.parse(raw);
		return Array.isArray(parsed) && parsed.length > 0;
	} catch (error) {
		console.error(`[CONTENT] Failed to read ${type} existence:`, error);
		return false;
	}
}

async function readComparisonsExists(): Promise<boolean> {
	const comparisonsDir = path.join(getContentPath(), 'comparisons');
	if (!(await dirExists(comparisonsDir))) {
		return false;
	}

	try {
		const entries = await fsp.readdir(comparisonsDir, { withFileTypes: true });
		return entries.some((entry) => entry.isDirectory());
	} catch (error) {
		console.error('[CONTENT] Failed to read comparisons existence:', error);
		return false;
	}
}

/**
 * True when the data repository ships at least one PUBLISHED post.
 *
 * Delegates to `lib/content.ts` rather than re-walking the filesystem here, so
 * this signal and the `/blog` listing can never disagree about which posts
 * directory is authoritative or about what counts as a post. Getting that
 * wrong shows a Blog nav entry that leads to an empty page.
 */
async function readPostsExists(locale: string): Promise<boolean> {
	try {
		const { hasPublishedPosts } = await import('./content');
		return await hasPublishedPosts(locale);
	} catch (error) {
		console.error('[CONTENT] Failed to read posts existence:', error);
		return false;
	}
}

async function fetchContentSignals(locale: string): Promise<ContentSignals> {
	const { ensureContentAvailable } = await import('./lib');
	await ensureContentAvailable();

	const [hasCategories, hasTags, hasCollections, hasComparisons, hasPosts] = await Promise.all([
		readCollectionExists('categories'),
		readCollectionExists('tags'),
		readCollectionExists('collections'),
		readComparisonsExists(),
		// Locale-scoped: a slug can be a draft in one locale and published in
		// another, and the nav gate must agree with the listing THIS visitor sees.
		readPostsExists(locale)
	]);

	return {
		hasCategories,
		hasTags,
		hasCollections,
		hasComparisons,
		hasPosts
	};
}

export const getCachedContentSignals = async (locale: string = 'en') => {
	return unstable_cache(
		async () => {
			return await fetchContentSignals(locale);
		},
		['content-signals', locale],
		{
			revalidate: CONTENT_CACHE_TTL.CONTENT,
			tags: [
				CACHE_TAGS.CONTENT,
				CACHE_TAGS.CATEGORIES,
				CACHE_TAGS.TAGS,
				CACHE_TAGS.COLLECTIONS,
				CACHE_TAGS.COMPARISONS,
				CACHE_TAGS.POSTS,
				CACHE_TAGS.ITEMS_LOCALE(locale),
				CACHE_TAGS.COMPARISONS_LOCALE(locale),
				CACHE_TAGS.POSTS_LOCALE(locale)
			]
		}
	)();
};
