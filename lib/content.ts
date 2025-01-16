import git from 'isomorphic-git';
import yaml from 'yaml';
import * as http from 'isomorphic-git/http/node';
import * as fs from 'fs';
import * as path from 'path'

function getContentPath() {
    return path.join(process.cwd(), '.content');
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

export async function tryFetchRepository(): Promise<void> {
    const token = process.env.GITHUB_APIKEY;
    const url = process.env.GITHUB_REPOSITORY;
    if (!url) {
        throw new Error("'GITHUB_REPOSITORY' must be definied as environment variable.");
    }

    const dest = getContentPath();
    const auth = getGitAuth(token);

    const exists = await fsExists(path.join(dest, '.git'))
    if (exists) {
        console.log('Git repository already exists.');
        /*console.log('Pulling data...');
        await git.pull({ 
            onAuth: () => auth,
            fs, http,
            url: options.cloneUrl,
            dir: dest, 
            singleBranch: true,
            author: { name: 'directory' }, 
        });*/

        return;
    }

    console.log('Fetching data...')
    await fs.promises.mkdir(dest, { recursive: true });
    await git.clone({ onAuth: () => auth, fs, http, url, dir: dest, singleBranch: true });
}

export interface ItemData {
    name: string;
    slug: string;
    filename: string;
    description: string;
    source_url: string;
    category: string;
}

async function getMeta(base: string, filename: string) {
    const filepath = path.join(base, filename);
    const content = await fs.promises.readFile(filepath, { encoding: 'utf8' });
    const meta = yaml.parse(content) as ItemData;
    meta.slug = path.basename(filename, path.extname(filename));
    meta.filename = filename;

    return meta;
}

export async function fetchItems() {
    const dest = path.join(getContentPath(), 'data');
    const files = await fs.promises.readdir(dest);

    const items = files.map(async (filename) => getMeta(dest, filename));

    return Promise.all(items);
}

export async function fetchItem(slug: string) {
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
