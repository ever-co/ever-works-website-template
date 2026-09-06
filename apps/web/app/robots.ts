import { MetadataRoute } from 'next';
import { buildAiCrawlerRules, resolveAiCrawlerPolicy } from '@/lib/seo/ai-crawlers';

export default function robots(): MetadataRoute.Robots {
	const appUrl =
		process.env.NEXT_PUBLIC_APP_URL ??
		(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://demo.ever.works');

	const sharedAllow = [
		'/',
		'/items/*',
		'/categories/*',
		'/tags/*',
		'/collections/*',
		'/comparisons/*',
		'/pages/*',
		'/pricing',
		'/help',
		'/about',
		'/faq',
		'/llms.txt',
		'/llms-full.txt',
		'/items.json',
		// Feeds (RSS 2.0, Atom 1.0, JSON Feed 1.1).
		'/rss.xml',
		'/atom.xml',
		'/feed.json',
		// Markdown mirrors of every public page (per https://llmstxt.org and
		// the per-page .md mirror convention used by AI crawlers).
		'/*.md'
	];

	const sharedDisallow = ['/admin/*', '/api/*', '/client/settings/*', '/dashboard/*'];

	// Default rule for every other crawler (Googlebot, Bingbot, generic bots).
	const defaultRule = {
		userAgent: '*',
		allow: sharedAllow,
		disallow: sharedDisallow
	};

	// Explicit AI-crawler rules. Default policy is "allow" — the same access
	// as the * rule but spelled out per-bot so the operator's stance is
	// explicit. Override via the AI_CRAWLERS env var (see lib/seo/ai-crawlers.ts).
	const policy = resolveAiCrawlerPolicy(process.env.AI_CRAWLERS);
	const aiRules = buildAiCrawlerRules(policy, sharedDisallow);

	return {
		rules: [defaultRule, ...aiRules],
		sitemap: `${appUrl}/sitemap.xml`
	};
}
