'use server'

import 'server-only';
import yaml from 'yaml';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'date-fns'
import { trySyncRepository } from './repository';
import { dirExists, fsExists, getContentPath } from './lib';
import { unstable_cache } from 'next/cache';

interface Identifiable {
    id: string;
    name: string;
}

export interface Category extends Identifiable {
    count?: number;
}

export interface Tag extends Identifiable {
    count?: number;
}

export interface ItemData {
    name: string;
    slug: string;
    description: string;
    source_url: string;
    category: string | Category | Category[] | string[];
    tags: string[] | Tag[];
    featured?: boolean;
    updated_at: string; // raw string timestamp
    updatedAt: Date;  // timestamp
}

export interface Config {
    company_name?: string;
    content_table?: boolean;
    item_name?: string;
    items_name?: string;
}

interface FetchOptions {
    lang?: string;
}

async function getConfig() {
    console.log('Fetching config');
    try {
        const raw = await fs.promises.readFile(path.join(getContentPath(), 'config.yml'), 'utf-8');
        return yaml.parse(raw) as Config;
    } catch (err) {
        if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
            return {};
        }
        throw err;
    }
}

export const getCachedConfig = unstable_cache(async () => {
    return await getConfig();
}, ['config'], { revalidate: 60 });

async function parseItem(base: string, filename: string) {
    const filepath = path.join(base, filename);
    const content = await fs.promises.readFile(filepath, { encoding: 'utf8' });
    const meta = yaml.parse(content) as ItemData;
    meta.slug = path.basename(filename, path.extname(filename));
    meta.updatedAt = parse(meta.updated_at, "yyyy-MM-dd HH:mm", new Date());

    return meta;
}

async function parseTranslation(base: string, filename: string) {
    try {
        const filepath = path.join(base, filename);
        const content = await fs.promises.readFile(filepath, { encoding: 'utf8' });
        return yaml.parse(content);
    } catch {
        return null;
    }
}

async function readCollection<T extends Identifiable>(
    type: 'categories' | 'tags',
    options: FetchOptions = {}
): Promise<Map<string, T>> {
    try {
        const contentPath = getContentPath();
        const collectionDir = path.join(contentPath, type);
        
        const useDir = await dirExists(collectionDir);
        const collectionPath = useDir
            ? path.join(collectionDir, `${type}.yml`)
            : path.join(contentPath, `${type}.yml`);

        const raw = await fs.promises.readFile(collectionPath, 'utf-8');
        const list: T[] = yaml.parse(raw);
        const collection = new Map(list.map(item => [item.id, item]));

        if (useDir && options.lang && options.lang !== 'en') {
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

        return collection;
    } catch (err) {
        if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
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

function populateCategory(category: string | Category, categories: Map<string, Category>) {
    const id = typeof category === 'string' ? category : category.id;
    const name = typeof category === 'string' ? category : category.name;
    const result: Category = { id, name };

    const populated = categories.get(id);
    if (populated) {
        result.name = populated.name;
        populated.count = (populated.count || 0) + 1;
    } else {
        categories.set(id, { ...result, count: 1 });
    }

    return result;
}

function populateTag(tag: string | Tag, tags: Map<string, Tag>) {
    const id = typeof tag === 'string' ? tag : tag.id;
    const name = typeof tag === 'string' ? tag : tag.name;
    const result: Tag = { id, name };

    const populated = tags.get(id);
    if (populated) {
        result.name = populated.name;
        populated.count = (populated.count || 0) + 1;
    } else {
        tags.set(id, { ...result, count: 1 });
    }

    return result;
}

export async function fetchItems(options: FetchOptions = {}) {
    await trySyncRepository();
    const dest = path.join(getContentPath(), 'data');
    const files = await fs.promises.readdir(dest);
    const categories = await readCategories(options);
    const tags = await readTags(options);

    const items = await Promise.all(
        files.map(async (slug) => {
            const base = path.join(dest, slug);
            const item = await parseItem(base, `${slug}.yml`);
            if (options.lang && options.lang !== 'en') {
                const translation = await parseTranslation(base, `${slug}.${options.lang}.yml`);
                if (translation) Object.assign(item, translation);
            }

            if (Array.isArray(item.tags)) {
                item.tags = item.tags.map(tag => populateTag(tag, tags));
            }

            if (Array.isArray(item.category)) {
                item.category = item.category.map(cat => populateCategory(cat, categories));
            } else {
                item.category = populateCategory(item.category, categories);
            }

            return item;
        })
    );

    return {
        total: items.length,
        items: items.sort((a, b) => {
            if (a.featured && !b.featured) return -1;
            if (!a.featured && b.featured) return 1;
            return b.updatedAt.getDate() - a.updatedAt.getDate();
        }),
        categories: Array.from(categories.values()),
        tags: Array.from(tags.values()),
    };
}

export async function fetchItem(slug: string, options: FetchOptions = {}) {
    await trySyncRepository();
    const dataDir = path.join('data', slug);
    const base = getContentPath();
    const metaPath = path.join(base, dataDir);
    const mdxPath = path.join(base, dataDir, `${slug}.mdx`);
    const mdPath = path.join(base, dataDir, `${slug}.md`);

    const categories = await readCategories(options);
    const tags = await readTags(options);

    try {
        const meta = await parseItem(metaPath, `${slug}.yml`);
        if (options.lang && options.lang !== 'en') {
            console.log('fetching translation', slug, options.lang);
            const translation = await parseTranslation(metaPath, `${slug}.${options.lang}.yml`);
            if (translation) Object.assign(meta, translation);
        }

        if (Array.isArray(meta.tags)) {
            meta.tags = meta.tags.map(tag => populateTag(tag, tags));
        }

        if (Array.isArray(meta.category)) {
            meta.category = meta.category.map(cat => populateCategory(cat, categories));
        } else {
            meta.category = populateCategory(meta.category, categories);
        }

        const langMdxPath = options.lang ? path.join(base, dataDir, `${slug}.${options.lang}.mdx`) : null;
        const langMdPath = options.lang ? path.join(base, dataDir, `${slug}.${options.lang}.md`) : null;

        let contentPath = null;
        if (langMdxPath && await fsExists(langMdxPath)) {
            contentPath = langMdxPath;
        } else if (langMdPath && await fsExists(langMdPath)) {
            contentPath = langMdPath;
        } else if (await fsExists(mdxPath)) {
            contentPath = mdxPath;
        } else if (await fsExists(mdPath)) {
            contentPath = mdPath;
        }

        if (!contentPath) {
            return { meta };
        }

        const content = await fs.promises.readFile(contentPath, { encoding: 'utf8' });
        return { meta, content };
    } catch {
        return;
    }
}

function eqID(value: string | { id: string }, id: string) {
    if (typeof value === 'string') {
        return value === id;
    }

    return value.id === id;
}

export async function fetchByCategory(raw: string) {
    const category = decodeURI(raw);
    const { categories, items, total, tags } = await fetchItems();
    return {
        categories,
        tags,
        total,
        items: items.filter(item => {
            if (Array.isArray(item.category)) {
                return item.category.some(c => eqID(c, category));
            }
            return eqID(item.category, category);
        }),
    }
}

export async function fetchByTag(raw: string) {
    const tag = decodeURI(raw);
    const { categories, items, total, tags } = await fetchItems();
    return {
        categories,
        tags,
        total,
        items: items.filter(item => {
            if (Array.isArray(item.tags)) {
                return item.tags.some(t => eqID(t, tag));
            }
        }),
    }
}
