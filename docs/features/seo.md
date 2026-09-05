---
id: seo
title: SEO Configuration
sidebar_label: SEO
sidebar_position: 8
---

# SEO Configuration

The Ever Works template provides comprehensive SEO support including JSON-LD structured data, hreflang tags for multilingual content, OpenGraph metadata, automated sitemaps, and robots.txt configuration.

## JSON-LD Structured Data

Located at `lib/seo/schema.ts`, the schema utilities generate Schema.org structured data for various content types.

### Product Schema

Used on item detail pages:

```typescript
import { generateProductSchema } from '@/lib/seo/schema';

const schema = generateProductSchema({
  name: 'Product Name',
  description: 'Product description',
  image: 'https://example.com/image.jpg',
  url: 'https://example.com/product',
  category: 'Software',
  sourceUrl: 'https://product-website.com',
  brandName: 'Brand Name',
});
```

Generates:
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Product Name",
  "description": "Product description",
  "image": "https://example.com/image.jpg",
  "url": "https://example.com/product",
  "category": "Software",
  "brand": {
    "@type": "Brand",
    "name": "Brand Name"
  },
  "offers": {
    "@type": "Offer",
    "url": "https://product-website.com",
    "availability": "https://schema.org/InStock"
  }
}
```

### Organization Schema

Used for site-wide brand identity on the homepage and about pages.

### FAQPage Schema

`generateFaqPageSchema()` builds the `FAQPage` block rendered on `/faq` by
`components/seo/faq-json-ld.tsx`. Its question/answer pairs are extracted from
the page's own content by `lib/seo/faq-parser.ts`, so the rich result always
matches what a visitor reads:

- Every `##`--`######` heading in `pages/faq.<locale>.md` becomes a `Question`,
  and the prose beneath it becomes the `acceptedAnswer`. `#` (H1) is the
  document title and is ignored, and a heading immediately followed by another
  heading is treated as a section grouping rather than a question.
- A `faqs: [{ question, answer }]` array in the file's frontmatter is
  authoritative whenever it is present -- the headings are not consulted at
  all, so `faqs: []` opts a page out of the rich result while keeping its
  prose.
- Nothing is emitted when no question/answer pair can be extracted -- an
  `FAQPage` with an empty `mainEntity` is invalid structured data.

See [Spec 046](../spec/046-faq-page/spec.md) for the full content contract.

### Other Schema Types

The module provides generators for:
- **WebSite** -- Site-level metadata with search action
- **BreadcrumbList** -- Navigation breadcrumbs
- **ItemList** -- Category and collection listing pages

## Hreflang Tags

Located at `lib/seo/hreflang.ts`, the hreflang utility generates language alternate links for search engines.

### Supported Locales

The template supports 20+ locales:

```
en | fr | es | de | zh | ar | he | ru | uk | pt
it | ja | ko | nl | pl | tr | vi | th | hi | id | bg
```

### URL Generation

The hreflang utility follows the "as-needed" locale prefix pattern:
- Default locale (`en`) uses the root path: `https://example.com/page`
- Other locales use prefixed paths: `https://example.com/fr/page`

```typescript
import { generateHreflangTags } from '@/lib/seo/hreflang';

const alternates = generateHreflangTags('/items/product-slug');
// Returns language alternate links for all configured locales
```

### Locale-to-Hreflang Mapping

Each locale maps to its ISO 639-1 hreflang value. Most use the same code, but some require special handling for regional variants.

## Listing Metadata

Located at `lib/seo/listing-metadata.ts`, this module generates metadata for listing pages including category pages, search results, and filtered views with appropriate title templates, descriptions, and canonical URLs.

## OpenGraph & Twitter Cards

The template generates OpenGraph and Twitter Card metadata through Next.js Metadata API in page components:

```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  return {
    title: 'Page Title',
    description: 'Page description',
    openGraph: {
      title: 'Page Title',
      description: 'Page description',
      images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Page Title',
      description: 'Page description',
    },
    alternates: {
      languages: generateHreflangTags('/current-path'),
    },
  };
}
```

## Sitemap

Located at `app/sitemap.ts`, the sitemap is automatically generated using Next.js built-in sitemap support:

- **Static pages** -- Home, about, pricing, contact
- **Dynamic pages** -- All published items, categories, collections
- **Localized URLs** -- Each page generates entries for all active locales
- **Priority and frequency** -- Configured per page type

## Robots.txt

Located at `app/robots.ts`, the robots configuration:

- Allows all crawlers by default
- Points to the sitemap URL
- Optionally blocks admin and API routes from indexing
- Configurable via environment for staging/production differences
- **Explicit AI-crawler allow-list** — emits per-bot rules for GPTBot, ClaudeBot, PerplexityBot, Google-Extended, Applebot-Extended, CCBot, Meta-ExternalAgent, and other major AI training/retrieval bots so the operator's stance is unambiguous

### AI crawler policy

Every directory built from this template ships with an explicit allow-list for major AI crawlers. The default policy is **`allow`** — every listed bot gets `Allow: /` plus the same admin/dashboard `Disallow` block as the generic `User-agent: *` rule. Override via the `AI_CRAWLERS` env var:

```bash
AI_CRAWLERS=allow                              # default — same as omitting it
AI_CRAWLERS=disallow                           # explicit Disallow: / for every listed bot
AI_CRAWLERS=GPTBot,ClaudeBot,PerplexityBot     # selective: allow these, disallow the rest
AI_CRAWLERS=none                               # don't emit any AI-crawler rules at all
```

The bot list lives in `lib/seo/ai-crawlers.ts` and covers 18 bots: GPTBot, ChatGPT-User, OAI-SearchBot, ClaudeBot, Claude-User, Claude-SearchBot, anthropic-ai, PerplexityBot, Perplexity-User, Google-Extended, Applebot, Applebot-Extended, Bingbot, CCBot, Meta-ExternalAgent, Amazonbot, Bytespider, cohere-ai. The list is rendered in randomized order in robots.txt so no single operator appears clustered or "first".

## Feeds

The template ships three feed formats out of the box, each at a stable URL:

- **RSS 2.0** — `app/rss.xml/route.ts` → `/rss.xml`
- **Atom 1.0** — `app/atom.xml/route.ts` → `/atom.xml`
- **JSON Feed 1.1** — `app/feed.json/route.ts` → `/feed.json`

All three are generated by pure helpers in `lib/seo/feeds.ts` (`buildFeedEntries`, `generateRss`, `generateAtom`, `generateJsonFeed`) sharing the same `FeedConfig`. Items are sorted by `updated_at` descending and capped at 50 by default. Feed autodiscovery is wired into the locale layout's `generateMetadata` so every page's `<head>` contains:

```html
<link rel="alternate" type="application/rss+xml"  href="<site>/rss.xml" />
<link rel="alternate" type="application/atom+xml" href="<site>/atom.xml" />
<link rel="alternate" type="application/feed+json" href="<site>/feed.json" />
```

JSON Feed is the JSON-native alternative to RSS/Atom — useful for AI agents, dashboards, and any consumer that prefers JSON over XML. See [jsonfeed.org](https://www.jsonfeed.org/version/1.1/).

## LLM / AI agent discoverability

The template ships an opinionated set of endpoints designed for AI agents — separate from search-engine SEO — so directories built with Ever Works are first-class sources for ChatGPT, Claude, Perplexity, and other LLMs.

### `/llms.txt`

A short Markdown manifest at `app/llms.txt/route.ts`. Lists the site name, description, and pointers to the canonical data dumps and per-page mirrors. Per the [llms.txt convention](https://llmstxt.org/).

### `/llms-full.txt`

A long-form companion at `app/llms-full.txt/route.ts` that concatenates the entire directory into a single Markdown document: site preamble, every category and tag, every item with its full body content, and every comparison. Agents can ingest the whole directory in one fetch instead of crawling per-page HTML.

### Per-page `.md` mirrors

Every public page also serves a clean Markdown twin at the same path with `.md` appended:

- `/items/<slug>.md`
- `/categories/<id>.md`
- `/tags/<id>.md`
- `/collections/<slug>.md`
- `/comparisons/<slug>.md`
- `/pages/<slug>.md`
- `/about.md`, `/help.md`, `/pricing.md`, `/privacy-policy.md`, `/terms-of-service.md`, `/cookies.md`

Each HTML page advertises its mirror via `<link rel="alternate" type="text/markdown" href="…">`.

How it works:

- `lib/seo/markdown-mirror.ts` exports renderers (`renderItemMarkdown`, `renderCategoryMarkdown`, etc.) that take normalized data and return a Markdown string. They are pure functions with no I/O.
- `next.config.ts` contains `rewrites` that map every `/path.md` URL to an internal `/path/_md` route handler (one per page type, plus a catch-all under `_static-md` for the static info pages).
- The internal route handler reuses the same cached content layer (`getCachedItem`, `getCachedItems`, `getCachedComparisons`, `getCachedPageContent`) the HTML pages use, then delegates rendering to a helper from `lib/seo/markdown-mirror.ts`.
- Responses set `Content-Type: text/markdown` and `X-Robots-Tag: noindex` so search engines index the canonical HTML, not the mirror.

### `BreadcrumbList` JSON-LD on every page

A `<BreadcrumbJsonLd>` server component at `components/seo/breadcrumb-json-ld.tsx` emits Schema.org `BreadcrumbList` JSON-LD as a `<script type="application/ld+json">` block. It is wired into every public page that has a navigational trail — items, categories (single, multi-segment, list), tags (single, multi-segment, list), collections, comparisons, pages, and the static info pages. Detail pages with their own `generateBreadcrumbSchema` calls (e.g. items, comparison detail, collection detail) keep their existing emission unchanged.

## Best Practices

1. **Every page should have unique metadata** -- Use `generateMetadata()` in page components
2. **Include JSON-LD on detail pages** -- Product schema for items, Organization for homepage
3. **Set canonical URLs** -- Prevent duplicate content across localized versions
4. **Use the hreflang utility** -- Ensures search engines serve the correct language version
5. **Keep descriptions under 160 characters** -- Optimal for search result snippets
6. **Emit `BreadcrumbList` JSON-LD on every page** -- Use `<BreadcrumbJsonLd>` from `components/seo/`. Pair with the visible `<Breadcrumb>` UI; the JSON-LD is auxiliary
7. **Advertise Markdown mirrors** -- For listing pages, pass `hasMarkdownMirror: true` to `generateListingMetadata`. For detail pages, set `alternates.types['text/markdown']` directly. Agents consume the mirror without parsing HTML
8. **Verify the AI crawler policy matches the operator's intent** -- Default is "allow"; flip via `AI_CRAWLERS` env var if the directory is private/unfinished
