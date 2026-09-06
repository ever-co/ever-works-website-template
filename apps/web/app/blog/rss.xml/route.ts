/**
 * Blog RSS 2.0 feed at /blog/rss.xml (Spec 050).
 *
 * The site-wide /rss.xml covers directory items; this sibling covers blog
 * posts so readers can subscribe to the blog alone. It reuses the same `feed`
 * library wrapper in `lib/seo/feeds.ts` rather than hand-rolling XML.
 */

import { NextResponse } from 'next/server';
import { getCachedAllPostSummaries, getCachedConfig } from '@/lib/content';
import { getBaseUrl } from '@/lib/utils/url-cleaner';
import { buildPostFeedEntries, generateRss, resolveFeedConfig } from '@/lib/seo/feeds';

export const revalidate = 600;

export async function GET(): Promise<NextResponse> {
	const [config, posts] = await Promise.all([
		getCachedConfig(),
		// The unpaginated loader, so the feed is capped by `config.limit` alone
		// rather than by whatever the listing's page size happens to be.
		getCachedAllPostSummaries().catch(() => [])
	]);

	const companyName = (config as { company_name?: string }).company_name ?? 'Ever Works';
	const description =
		(config as { description?: string; tagline?: string }).description ||
		(config as { tagline?: string }).tagline ||
		`Latest blog posts from ${companyName}.`;

	// A section feed must advertise its OWN self URL and canonical page.
	// Left on the defaults it would announce `/rss.xml` (the site-wide
	// directory feed) as `atom:link rel="self"`, and readers would silently
	// canonicalize blog subscribers onto that feed instead.
	const feedConfig = resolveFeedConfig({
		title: `${companyName} Blog`,
		description,
		siteUrl: getBaseUrl(),
		feedPath: 'blog',
		rssFilename: 'blog/rss.xml',
		// The blog ships RSS only; advertising Atom/JSON siblings would point
		// readers at URLs that do not exist.
		atomFilename: null,
		jsonFeedFilename: null
	});

	const xml = generateRss(buildPostFeedEntries(posts, feedConfig), feedConfig);

	return new NextResponse(xml, {
		status: 200,
		headers: {
			'Content-Type': 'application/rss+xml; charset=utf-8',
			'Cache-Control': 'public, max-age=600, s-maxage=3600'
		}
	});
}
