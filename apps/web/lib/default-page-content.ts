/**
 * Built-in fallback bodies for static info pages.
 *
 * Static info pages read their content from the Work's data repository
 * (`pages/<slug>.<locale>.md`, see `lib/content.ts#fetchPageContent`). When a
 * repository ships no file for a slug the route renders a default instead, so
 * a freshly generated directory is never a blank page.
 *
 * The FAQ default lives here rather than inline in the route because two
 * surfaces must render the same words: the HTML page at `/faq` and its
 * Markdown mirror at `/faq.md` (`app/[locale]/_static-md/[slug]/route.ts`).
 * Duplicating the copy would let the mirror drift from the page it mirrors.
 *
 * Authored as heading-per-question Markdown so `lib/seo/faq-parser.ts`
 * extracts question/answer pairs from it and the page emits a valid
 * `FAQPage` rich result out of the box — the whole SEO point of an FAQ.
 *
 * Sharing the words is only half of it: the two surfaces must also agree on
 * *when* the default applies, which is what `resolveStaticPageBody` below is
 * for.
 */

/**
 * Decide which body a static info page should render: the one shipped by the
 * data repository, or the built-in default.
 *
 * A `pages/<slug>.<locale>.md` whose frontmatter is followed by nothing loads
 * with `content: ''`, and one followed by a blank line or two — which is what
 * a hand-written file actually looks like — loads with `content: '\n\n'`.
 * Both mean "this repository shipped no body", not "an intentionally empty
 * body", so blank content resolves to the default. Trimming rather than a
 * bare truthiness check is the whole point: `'\n\n'` is truthy.
 *
 * **Every representation of a page must call this.** `/faq` advertises
 * `/faq.md` to crawlers as `<link rel="alternate" type="text/markdown">`, so
 * the two disagreeing about emptiness ships a page and an alternate that say
 * different things — and in the FAQ's case the blank side also drops the
 * `FAQPage` rich result entirely while the other side keeps advertising ten
 * questions. Two hand-written fallback expressions (`content || DEFAULT` on
 * one side, `content?.trim() || DEFAULT` on the other) is exactly how that
 * divergence got shipped once already.
 *
 * @param content Raw body from `getCachedPageContent`, or nothing at all.
 * @param fallback Built-in default for the slug.
 */
export function resolveStaticPageBody(content: string | null | undefined, fallback: string): string {
	return content && content.trim().length > 0 ? content : fallback;
}

/**
 * Generic, directory-agnostic answers that hold for any site generated from
 * this template. Operators replace them by committing `pages/faq.en.md` (and
 * per-locale variants) to their data repository.
 */
export const DEFAULT_FAQ_CONTENT = `## What is this directory?

This is a curated directory. Every listing is reviewed before it is published, so you can browse a collection of relevant, working links instead of an unfiltered search result page.

## How do I find what I am looking for?

Use the search box in the header to search across every listing, or narrow things down by browsing the categories, tags and collections. Category and tag pages can be combined with the sort and filter controls to shortlist quickly.

## How do I submit a listing?

Open the Submit page from the header or footer and fill in the form. Tell us the name, the link and a short description, pick the category that fits best, and add tags so the listing is discoverable.

## How long does it take for a submission to appear?

Submissions are reviewed by a human before they go live. Most are handled within a few business days. If yours needs more information we will get in touch using the email address on the submission.

## Is it free to be listed?

Standard listings are free. Some directories also offer featured or sponsored placements, which appear higher in the listings and are marked as such. If those are available here, the Pricing page describes what each plan includes.

## Do I need an account to browse?

No. Browsing, searching and reading listings are open to everyone. An account is only needed to save favourites, manage a submission or take part in features that are tied to you.

## Something is out of date or incorrect. How do I report it?

Please get in touch and tell us which listing is affected and what should change. Corrections to links, descriptions and categories are welcome — accurate entries are what makes the directory useful.

## How do I claim a listing I own?

Contact us from an address at the listing's own domain and say which entry you would like to claim. Once ownership is confirmed you can keep the details current.

## How often is the directory updated?

New submissions are added as they are approved, and existing entries are revisited periodically so that dead links and stale descriptions are corrected.

## How do I get in touch?

Use the contact details in the footer. Questions, corrections and partnership enquiries are all welcome.
`;
