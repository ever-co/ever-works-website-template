'use server'

import 'server-only';
import yaml from 'yaml';
import * as fs from 'fs';
import * as path from 'path';
import { trySyncRepository } from './repository';
import { fsExists, getContentPath } from './lib';

export interface Category {
    id: string;
    name: string;
    count?: number;
}

export interface ItemData {
    name: string;
    slug: string;
    description: string;
    source_url: string;
    category: string | Category | Category[] | string[];
    featured?: boolean;
    updated_at: string; // raw string timestamp
    updatedAt: number;  // timestamp
}

async function parseItem(base: string, filename: string) {
    const filepath = path.join(base, filename);
    const content = await fs.promises.readFile(filepath, { encoding: 'utf8' });
    const meta = yaml.parse(content) as ItemData;
    meta.slug = path.basename(filename, path.extname(filename));
    meta.updatedAt = Date.parse(meta.updated_at);

    return meta;
}

async function readCategories(): Promise<Map<string, Category>> {
    try {
        const raw = await fs.promises.readFile(path.join(getContentPath(), 'categories.yml'), 'utf-8');
        const list: Category[] = yaml.parse(raw);
        return new Map(list.map(cat => [cat.id, cat]));
    } catch (err) {
        if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
            return new Map();
        }
        throw err;
    }
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

export async function fetchItems() {
    await trySyncRepository();
    const dest = path.join(getContentPath(), 'data');
    const files = await fs.promises.readdir(dest);
    const categories = await readCategories();

    const items = await Promise.all(
        files
            .filter((filename) => path.extname(filename) === '.yml')
            .map(async (filename) => {
                const item = await parseItem(dest, filename);
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
            return b.updatedAt - a.updatedAt;
        }),
        categories: Array.from(categories.values()),
    };
}

export async function fetchItem(slug: string) {
    await trySyncRepository();
    const dataDir = 'data';
    const base = getContentPath();
    const metaPath = path.join(base, dataDir);
    const mdxPath = path.join(base, dataDir, `${slug}.mdx`);
    const mdPath = path.join(base, dataDir, `${slug}.md`);

    const categories = await readCategories();

    try {
        const meta = await parseItem(metaPath, `${slug}.yml`);
        const contentPath = await fsExists(mdxPath) ? mdxPath : (await fsExists(mdPath) ? mdPath : null);
        if (Array.isArray(meta.category)) {
            meta.category = meta.category.map(cat => populateCategory(cat, categories));
        } else {
            meta.category = populateCategory(meta.category, categories);
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

function eqCategory(category: string | Category, id: string) {
    if (typeof category === 'string') {
        return category === id;
    }

    return category.id === id;
}

export async function fetchByCategory(raw: string) {
    const category = decodeURI(raw);
    const { categories, items, total } = await fetchItems();
    return {
        categories,
        total,
        items: items.filter(item => {
            if (Array.isArray(item.category)) {
                return item.category.some(cat => eqCategory(cat, category));
            }
            return eqCategory(item.category, category);
        }),
    }
}
