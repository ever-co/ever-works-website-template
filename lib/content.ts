import git from 'isomorphic-git';
import yaml from 'yaml';
import { unstable_cache } from 'next/cache';
import * as http from 'isomorphic-git/http/node';
import * as fs from 'fs';
import * as path from 'path'
import * as os from 'os';

export function getContentPath() {
    const contentDir = '.content';
    if (process.env.VERCEL) {
        return path.join(os.tmpdir(), contentDir);
    }

    return path.join(process.cwd(), contentDir);
}

export function getPagePath(slug: string) {
    return `/items/${slug}`;
}

function getGitAuth(token?: string) {
    if (!token) {
        return {};
    }
    return { username: 'x-access-token', password: token };
}

async function fsExists(filepath: string): Promise<boolean> {
    try {
        await fs.promises.access(filepath);
        return true;
    } catch {
        return false;
    }
}

export async function tryFetchRepository() {
    const token = process.env.GITHUB_APIKEY;
    const url = process.env.DATA_REPOSITORY;
    if (!url) {
        throw new Error("'DATA_REPOSITORY' must be definied as environment variable.");
    }

    const dest = getContentPath();
    const auth = getGitAuth(token);

    const exists = await fsExists(path.join(dest, '.git'))
    if (exists) {
        console.log('Pulling repository data...');
        await git.pull({
            onAuth: () => auth,
            fs, http,
            url,
            dir: dest,
            singleBranch: true,
            author: { name: 'directory' },
        });
        return {};
    }

    console.log('Clonning repository...')
    await fs.promises.mkdir(dest, { recursive: true });
    await git.clone({ onAuth: () => auth, fs, http, url, dir: dest, singleBranch: true });

    return {};
}

export const tryFetchCachedRepository = unstable_cache(
    tryFetchRepository,
    ['repo:status'],
    { revalidate: 10 },
);

export interface ItemData {
    name: string;
    slug: string;
    description: string;
    source_url: string;
    category: string;
}

async function getMeta(base: string, filename: string) {
    const filepath = path.join(base, filename);
    const content = await fs.promises.readFile(filepath, { encoding: 'utf8' });
    const meta = yaml.parse(content) as ItemData;
    meta.slug = path.basename(filename, path.extname(filename));

    return meta;
}

export async function fetchItems() {
    //console.log('Fetching items...');
    const dest = path.join(getContentPath(), 'data');
    const files = await fs.promises.readdir(dest);

    const items = files.map(async (filename) => getMeta(dest, filename));

    return Promise.all(items);
}

export async function fetchItem(slug: string) {
    //console.log('Fetching item details...');
    const base = getContentPath();
    const metaPath = path.join(base, 'data');
    const mdxPath = path.join(base, 'details', `${slug}.mdx`);
    const mdPath = path.join(base, 'details', `${slug}.md`);

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
