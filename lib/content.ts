'use server'

import 'server-only';
import yaml from 'yaml';
import * as fs from 'fs';
import * as path from 'path';
import { trySyncRepository } from './repository';
import { fsExists, getContentPath } from './lib';

export interface ItemData {
    name: string;
    slug: string;
    description: string;
    source_url: string;
    category: string;
    featured?: boolean;
    updated_at: string; // raw string timestamp
    updatedAt: number;  // timestamp
}

async function getMeta(base: string, filename: string) {
    const filepath = path.join(base, filename);
    const content = await fs.promises.readFile(filepath, { encoding: 'utf8' });
    const meta = yaml.parse(content) as ItemData;
    meta.slug = path.basename(filename, path.extname(filename));
    meta.updatedAt = Date.parse(meta.updated_at);

    return meta;
}

export async function fetchItems() {
    await trySyncRepository();
    const dest = path.join(getContentPath(), 'data');
    const files = await fs.promises.readdir(dest);
    const categoryCounts: Record<string, number> = {};

    const items = await Promise.all(
        files
            .filter((filename) => path.extname(filename) === '.yml')
            .map(async (filename) => {
                const meta = await getMeta(dest, filename);
                if (meta.category) {
                    categoryCounts[meta.category] = (categoryCounts[meta.category] || 0) + 1;
                }
                return meta;
            })
    );

    return {
        total: items.length,
        items: items.sort((a, b) => {
            if (a.featured && !b.featured) return -1;
            if (!a.featured && b.featured) return 1;
            return b.updatedAt - a.updatedAt;
        }),
        categories: categoryCounts,
    };
}

export async function fetchItem(slug: string) {
    await trySyncRepository();
    const dataDir = 'data';
    const base = getContentPath();
    const metaPath = path.join(base, dataDir);
    const mdxPath = path.join(base, dataDir, `${slug}.mdx`);
    const mdPath = path.join(base, dataDir, `${slug}.md`);

    try {
        const meta = await getMeta(metaPath, `${slug}.yml`);
        const contentPath = await fsExists(mdxPath) ? mdxPath : (await fsExists(mdPath) ? mdPath : null);
        if (!contentPath) {
            return { meta };
        }

        const content = await fs.promises.readFile(contentPath, { encoding: 'utf8' });
        return { meta, content };
    } catch {
        return;
    }
}

export async function fetchByCategory(raw: string) {
    const category = decodeURI(raw);
    const { categories, items, total } = await fetchItems();
    return {
        categories,
        total,
        items: items.filter(item => item.category === category),
    }
}
