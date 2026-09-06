/**
 * RSS 2.0 / Atom 1.0 / JSON Feed 1.1 generators.
 *
 * Thin wrapper around the [`feed`](https://www.npmjs.com/package/feed)
 * library — a single mature, well-tested implementation that emits all
 * three formats from one in-memory `Feed` instance. We map our
 * directory items into the shape the library expects, then call its
 * `.rss2()`, `.atom1()`, or `.json1()` serializer.
 *
 * Each feed format is exposed at a stable URL via the route handlers
 * in `app/rss.xml/`, `app/atom.xml/`, and `app/feed.json/`.
 */

import { Feed } from 'feed';
import type { ItemData } from '@/lib/content';
import type { PostSummary } from '@/types/post';
import { buildPostHref } from '@/lib/blog/urls';

/** A single feed entry, derived from an `ItemData`. */
export interface FeedEntry {
	title: string;
	/** Absolute URL to the canonical HTML page. */
	link: string;
	description: string;
	/** ISO-8601 publication / update date. */
	pubDate: string;
	/** Globally unique identifier (typically same as link). */
	guid: string;
	/** First category name, if any. */
	category?: string;
}

/** Resolved feed configuration shared by all three formats. */
export interface FeedConfig {
	title: string;
	description: string;
	siteUrl: string;
	/** Canonical HTML page this feed describes. Absolute URL. */
	feedLink: string;
	limit: number;
	/** Path of the RSS document, relative to `siteUrl` (no leading slash). */
	rssFilename: string;
	/**
	 * Path of the Atom document, relative to `siteUrl` (no leading slash).
	 * `undefined` when this feed is not also published as Atom.
	 */
	atomFilename?: string;
	/**
	 * Path of the JSON Feed document, relative to `siteUrl` (no leading slash).
	 * `undefined` when this feed is not also published as JSON Feed.
	 */
	jsonFeedFilename?: string;
}

const DEFAULTS = {
	limit: 50,
	rssFilename: 'rss.xml',
	atomFilename: 'atom.xml',
	jsonFeedFilename: 'feed.json'
} as const;

/** `null` means "this feed has no sibling in that format"; `undefined` takes the default. */
function normalizeFeedFilename(value: string | null | undefined, fallback: string): string | undefined {
	if (value === null) return undefined;
	return (value ?? fallback).replace(/^\/+/, '');
}

/**
 * Produce a `FeedConfig` filled with defaults from a partial input.
 *
 * The filename and `feedLink` overrides exist so a *section* feed (the blog
 * feed at `/blog/rss.xml`, Spec 050) can advertise its own self URL and its
 * own canonical page. Without them every feed would announce `/rss.xml` as
 * its `atom:link rel="self"`, and RSS clients would canonicalize subscribers
 * onto the site-wide directory feed instead of the one they asked for.
 * Omitting them reproduces the previous site-wide behaviour exactly.
 */
export function resolveFeedConfig(opts: {
	title: string;
	description: string;
	siteUrl: string;
	limit?: number;
	/** Canonical HTML page for this feed, relative to `siteUrl` (e.g. `blog`). */
	feedPath?: string;
	rssFilename?: string;
	/** Pass `null` when this feed has no Atom sibling (a section feed). */
	atomFilename?: string | null;
	/** Pass `null` when this feed has no JSON Feed sibling (a section feed). */
	jsonFeedFilename?: string | null;
}): FeedConfig {
	const siteUrl = opts.siteUrl.replace(/\/+$/, '');
	const feedPath = (opts.feedPath ?? '').replace(/^\/+|\/+$/g, '');

	return {
		title: opts.title,
		description: opts.description,
		siteUrl,
		feedLink: feedPath ? `${siteUrl}/${feedPath}` : `${siteUrl}/`,
		limit: opts.limit ?? DEFAULTS.limit,
		rssFilename: (opts.rssFilename ?? DEFAULTS.rssFilename).replace(/^\/+/, ''),
		atomFilename: normalizeFeedFilename(opts.atomFilename, DEFAULTS.atomFilename),
		jsonFeedFilename: normalizeFeedFilename(opts.jsonFeedFilename, DEFAULTS.jsonFeedFilename)
	};
}

function categoryName(cat: ItemData['category']): string | undefined {
	if (!cat) return undefined;
	if (Array.isArray(cat)) {
		const first = cat[0];
		if (!first) return undefined;
		return typeof first === 'string' ? first : (first.name ?? first.id);
	}
	return typeof cat === 'string' ? cat : (cat.name ?? cat.id);
}

/**
 * Convert items into normalized feed entries.
 *
 * Sorts by `updated_at` descending, caps at `config.limit`, and maps
 * each remaining item to a {@link FeedEntry} with absolute URLs.
 */
export function buildFeedEntries(items: ReadonlyArray<ItemData>, config: FeedConfig): FeedEntry[] {
	const sorted = [...items].sort(
		(a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
	);
	const limited = sorted.slice(0, config.limit);
	const siteUrl = config.siteUrl.replace(/\/+$/, '');

	return limited.map((item) => ({
		title: item.name,
		link: `${siteUrl}/items/${item.slug}`,
		description: item.description ?? '',
		pubDate: item.updated_at,
		guid: `${siteUrl}/items/${item.slug}`,
		category: categoryName(item.category)
	}));
}

/**
 * Convert blog posts into normalized feed entries (Spec 050).
 *
 * Posts arrive from `fetchPosts()` already sorted newest-first, so this only
 * caps the list at `config.limit` and maps to absolute `/blog/<slug>` URLs.
 *
 * Posts whose frontmatter carries no usable date are **skipped**. A feed item
 * needs a stable `pubDate`: stamping "now" on an undated post would give it a
 * new publication date on every regeneration, and readers would surface the
 * same post as freshly published over and over. Such posts still appear on
 * `/blog` and at their own URL — they are simply not announced to subscribers
 * until the author gives them a date.
 */
export function buildPostFeedEntries(posts: ReadonlyArray<PostSummary>, config: FeedConfig): FeedEntry[] {
	const siteUrl = config.siteUrl.replace(/\/+$/, '');

	return posts
		.filter((post) => {
			if (!post.date) return false;
			return !Number.isNaN(new Date(post.date).getTime());
		})
		.slice(0, config.limit)
		.map((post) => {
			// `buildPostHref()` is the builder the in-app links use, and it
			// percent-encodes the slug as one path segment. Interpolating the raw
			// slug here would let a filename containing `?` or `#` turn a feed
			// link into a query or fragment — and, because `guid` is how readers
			// identify an item, would also break deduplication for that post.
			const url = `${siteUrl}${buildPostHref(post.slug)}`;
			return {
				title: post.title,
				link: url,
				description: post.description,
				pubDate: post.date,
				guid: url,
				category: post.categories[0]?.name
			};
		});
}

/** Parse an ISO-ish string into a `Date`, falling back to `now`. */
function safeDate(iso: string): Date {
	const d = new Date(iso);
	return isNaN(d.getTime()) ? new Date() : d;
}

/**
 * Build a populated `Feed` instance shared by all three serializers.
 *
 * Centralizing this avoids three slightly-different feed configs and
 * guarantees `.rss2()`, `.atom1()`, and `.json1()` describe the same
 * underlying content.
 */
function buildFeed(entries: ReadonlyArray<FeedEntry>, config: FeedConfig): Feed {
	const siteUrl = config.siteUrl.replace(/\/+$/, '');
	const updated = entries[0] ? safeDate(entries[0].pubDate) : new Date();

	const feed = new Feed({
		title: config.title,
		description: config.description,
		// `feedLink` is the site root for the site-wide feeds and the section
		// page (e.g. `/blog`) for a section feed, so two feeds from one site
		// never share an identity. `id` keeps the trailing slash and `link`
		// drops it, which for a root feed reproduces the previous
		// `${siteUrl}/` + `siteUrl` pair exactly.
		id: config.feedLink,
		link: config.feedLink.replace(/\/+$/, '') || undefined,
		language: 'en',
		updated,
		generator: 'Ever Works',
		copyright: `© ${new Date().getFullYear()} ${config.title}`,
		// Only advertise the formats this feed actually publishes: a section
		// feed that ships RSS alone must not point readers at an Atom or JSON
		// URL that would 404.
		feedLinks: {
			rss: `${siteUrl}/${config.rssFilename}`,
			...(config.atomFilename ? { atom: `${siteUrl}/${config.atomFilename}` } : {}),
			...(config.jsonFeedFilename ? { json: `${siteUrl}/${config.jsonFeedFilename}` } : {})
		}
	});

	for (const entry of entries) {
		const date = safeDate(entry.pubDate);
		feed.addItem({
			title: entry.title,
			id: entry.guid,
			link: entry.link,
			description: entry.description,
			// Set both `date` (→ JSON Feed `date_modified`) and `published`
			// (→ JSON Feed `date_published`) so consumers can read either.
			// Our items expose only `updated_at`, so we use it for both.
			date,
			published: date,
			...(entry.category ? { category: [{ name: entry.category }] } : {})
		});
	}

	return feed;
}

/** Generate an RSS 2.0 XML feed via the `feed` library. */
export function generateRss(entries: ReadonlyArray<FeedEntry>, config: FeedConfig): string {
	return buildFeed(entries, config).rss2();
}

/** Generate an Atom 1.0 XML feed via the `feed` library. */
export function generateAtom(entries: ReadonlyArray<FeedEntry>, config: FeedConfig): string {
	return buildFeed(entries, config).atom1();
}

/**
 * Generate a JSON Feed 1.1 document via the `feed` library.
 *
 * The `feed` library currently emits the JSON Feed 1.0 version URL;
 * we post-process to the 1.1 URL and add the 1.1-only `language`
 * field. For the fields we emit, JSON Feed 1.0 and 1.1 are otherwise
 * byte-compatible.
 */
export function generateJsonFeed(entries: ReadonlyArray<FeedEntry>, config: FeedConfig): string {
	const json = buildFeed(entries, config).json1();
	const parsed = JSON.parse(json) as Record<string, unknown>;
	parsed['version'] = 'https://jsonfeed.org/version/1.1';
	if (!parsed['language']) parsed['language'] = 'en';
	return JSON.stringify(parsed, null, 2);
}
