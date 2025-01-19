import git from 'isomorphic-git';
import * as fs from 'fs';
import * as path from 'path'
import { getContentPath } from "./content";

export async function getCurrentHash() {
    const items = await git.log({
        fs,
        depth: 1,
        dir: getContentPath(),
    });

    if (items.length) {
        return items[0].oid;
    }
}

export async function getSlugsToRevalidate(ref1?: string, ref2?: string) {
    if (!ref1 || !ref2) {
        return [];
    }

    if (ref1 === ref2) {
        return [];
    }

    const slugs = new Set<string>();
    await git.walk({
        fs,
        dir:  getContentPath(),
        trees: [git.TREE({ ref: ref1 }), git.TREE({ ref: ref2 })],
        map: async function (filepath, [A, B]) {
            if (filepath === '.') {
                return
            }
            if (!A || !B) {
                return;
            }

            if ((await A.type()) === 'tree' || (await B.type()) === 'tree') {
                return
            }

            const Aoid = await A.oid()
            const Boid = await B.oid()

            const slug = path.basename(filepath, path.extname(filepath));
            if (Aoid !== Boid) {
                slugs.add(slug);
            }
            else if (Aoid === undefined) {
                slugs.add(slug);
            }
            else if (Boid === undefined) {
                slugs.add(slug);
            }
            return;
        },
    });

    return Array.from(slugs);
}
