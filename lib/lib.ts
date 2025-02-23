import * as os from 'os';
import * as path from 'path'
import * as fs from 'fs/promises';

export function getContentPath() {
    const contentDir = '.content';
    if (process.env.VERCEL) {
        return path.join(os.tmpdir(), contentDir);
    }

    return path.join(process.cwd(), contentDir);
}

export async function fsExists(filepath: string): Promise<boolean> {
    try {
        await fs.access(filepath);
        return true;
    } catch {
        return false;
    }
}

export async function dirExists(dirpath: string) {
    try {
        const stat = await fs.stat(dirpath);
        return stat.isDirectory();
    } catch (err) {
        if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
            return false;
        }
        throw err;
    }
}
