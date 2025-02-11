import git from 'isomorphic-git';
import * as http from 'isomorphic-git/http/node';
import * as path from 'path'
import * as fs from 'fs';
import { fsExists, getContentPath } from './lib';

function getGitAuth(token?: string) {
    if (!token) {
        return {};
    }
    return { username: 'x-access-token', password: token };
}

let lastSynced: number;
const syncInterval = 10 * 1000;

/* 
    Improve build time and development experience (in dev mode Next.js serves ISR pages dynamically).
*/
function shouldSync() {
    if (!lastSynced)
        return true;

    if ((Date.now() - lastSynced) >= syncInterval)
        return true;

    return false;
}

export async function trySyncRepository() {
    const token = process.env.GITHUB_APIKEY;
    const url = process.env.DATA_REPOSITORY;
    if (!url) {
        throw new Error("'DATA_REPOSITORY' must be definied as environment variable.");
    }

    const dest = getContentPath();
    const auth = getGitAuth(token);

    const exists = await fsExists(path.join(dest, '.git'));
    if (exists && !shouldSync()) {
        return;
    }
    
    if (exists) {
        console.log('Pulling repository data...');
        lastSynced = Date.now();
        await git.pull({
            onAuth: () => auth,
            fs, http,
            url,
            dir: dest,
            singleBranch: true,
            author: { name: 'directory' },  // for some reason git author name is required, but it doesn't matter
        });
        return;
    }

    console.log('Clonning repository...');
    await fs.promises.mkdir(dest, { recursive: true });
    await git.clone({ onAuth: () => auth, fs, http, url, dir: dest, singleBranch: true });

    return;
}
