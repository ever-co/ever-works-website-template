/**
 * Frontmatter value readers shared by every surface that renders a static
 * page's `pages/<slug>.<locale>.md` metadata.
 *
 * Three surfaces resolve the same two fields — the HTML `<head>`
 * (`lib/seo/static-page-metadata.ts`), the page body's `<h1>` and "last
 * updated" chip, and the `.md` mirror (`lib/seo/markdown-mirror.ts`). They used
 * three slightly different rules, so a Work could ship a `<title>` that
 * disagreed with its own heading. One rule lives here instead.
 *
 * This module is intentionally PURE (no I/O, no server-only imports) so the
 * mirror renderer can use it too.
 */

/**
 * Reads a non-empty string field out of parsed frontmatter.
 *
 * Frontmatter is author-supplied YAML, so a key can legitimately be absent,
 * blank, or a non-string — `title: 2026` parses to a number and `title:` with
 * an indented block parses to an object. Each of those falls back rather than
 * emitting `"undefined"`, an empty `<title>`, or — when the value reaches JSX —
 * a React "objects are not valid as a React child" crash.
 */
export function frontmatterString(metadata: Record<string, unknown> | undefined, key: string): string | undefined {
	const value = metadata?.[key];
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed ? trimmed : undefined;
}
