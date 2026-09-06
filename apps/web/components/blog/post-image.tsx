import Image from 'next/image';
import { generateImageRemotePatterns } from '@/lib/utils/image-domains';

interface PostImageProps {
	src?: string;
	alt: string;
	/** `sizes` hint for the responsive srcset. */
	sizes: string;
	className?: string;
	/** Set on the first above-the-fold image (the detail page hero). */
	priority?: boolean;
}

/** Cached once — the pattern list is static for the life of the process. */
const REMOTE_PATTERNS = generateImageRemotePatterns();

/** Match a `remotePatterns` hostname entry, which may lead with a `*.` wildcard. */
function hostnameMatches(pattern: string, hostname: string): boolean {
	const p = pattern.toLowerCase();
	const h = hostname.toLowerCase();
	if (p.startsWith('*.')) return h.endsWith(p.slice(1));
	return p === h;
}

/**
 * Match a `remotePatterns` pathname glob (`/a/**`, `/**`, or a literal path).
 *
 * The `/**` prefix comparison keeps the pattern's trailing slash — `'/a/**'`
 * slices to `'/a/'`, not `'/a'` — so it matches on a path-segment boundary:
 * `/a/b` matches `/a/**` while `/abc` and `/ab/c` do not.
 */
function pathnameMatches(pattern: string, pathname: string): boolean {
	if (pattern.endsWith('/**')) return pathname.startsWith(pattern.slice(0, -2));
	if (pattern.endsWith('/*')) {
		const prefix = pattern.slice(0, -1);
		return pathname.startsWith(prefix) && !pathname.slice(prefix.length).includes('/');
	}
	return pattern === pathname;
}

/**
 * Whether `next/image` will actually accept this URL for optimization.
 *
 * `isAllowedImageDomain()` answers a looser question — it checks the hostname
 * only, and deliberately returns `true` for anything that is not `http(s)`.
 * Next's optimizer is stricter: it matches protocol, hostname AND pathname
 * against `remotePatterns`, and rejects anything else with a 400. So an
 * allow-listed host reached over `http://`, or on a path outside the
 * registered glob (`lh3.googleusercontent.com/x/y` against the `/a/**`
 * pattern), would break the image if we asked for optimization.
 *
 * Same-origin URLs (a leading `/`) are always optimizable and never consult
 * `remotePatterns`.
 */
function canOptimize(src: string): boolean {
	if (src.startsWith('/')) return true;
	if (src.startsWith('data:')) return false;

	let url: URL;
	try {
		url = new URL(src);
	} catch {
		return false;
	}

	return REMOTE_PATTERNS.some(
		(pattern) =>
			`${pattern.protocol}:` === url.protocol &&
			hostnameMatches(pattern.hostname, url.hostname) &&
			pathnameMatches(pattern.pathname, url.pathname)
	);
}

/**
 * Whether a frontmatter `image` value is something we can actually render.
 *
 * Exported so callers can decide whether to reserve layout space BEFORE
 * rendering: a card that wraps `PostImage` in a fixed 16:9 box would leave a
 * blank grey band when the value is unusable and the component renders null.
 */
export function hasRenderablePostImage(src?: string): src is string {
	if (!src || !src.trim()) return false;
	const value = src.trim();
	if (value.startsWith('/')) return true;
	if (value.startsWith('data:image/')) return true;

	try {
		const parsed = new URL(value);
		return parsed.protocol === 'http:' || parsed.protocol === 'https:';
	} catch {
		return false;
	}
}

/**
 * Featured image for a post.
 *
 * Data repositories can point `image` at any host, so the image is optimized
 * only when the URL genuinely matches `next.config.ts`'s `remotePatterns` and
 * falls back to `unoptimized` otherwise — the same tactic `components/item.tsx`
 * and `components/shared/site-logo` already use, but matched against the full
 * pattern rather than the hostname alone. Renders nothing when the frontmatter
 * has no usable image.
 */
export function PostImage({ src, alt, sizes, className, priority = false }: PostImageProps) {
	if (!hasRenderablePostImage(src)) return null;

	const url = src.trim();

	return (
		<Image
			src={url}
			alt={alt}
			fill
			sizes={sizes}
			priority={priority}
			unoptimized={!canOptimize(url)}
			className={className ?? 'object-cover'}
		/>
	);
}
