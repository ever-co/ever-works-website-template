/**
 * FaqJsonLd — server component that emits a Schema.org `FAQPage` as a
 * `<script type="application/ld+json">` block.
 *
 * An FAQ page's whole SEO value is the rich result: without this block a
 * directory's answers are just prose, with it they can surface directly in
 * search and be ingested by AI crawlers. Pair it with the visible Markdown
 * rendering; this component intentionally renders nothing visible.
 *
 * Renders `null` when no usable question/answer pair could be extracted, so a
 * site running on the built-in fallback copy — or on a `faq.en.md` written as
 * unstructured prose — never emits an empty, invalid `FAQPage`.
 *
 * @example
 * ```tsx
 * <FaqJsonLd
 *     entries={extractFaqEntries(content, metadata)}
 *     url="https://example.com/faq"
 *     name="FAQ"
 * />
 * ```
 */

import { generateFaqPageSchema, type FaqEntry } from '@/lib/seo/schema';

interface FaqJsonLdProps {
	/** Question/answer pairs, typically from `lib/seo/faq-parser.ts`. */
	entries: ReadonlyArray<FaqEntry>;
	/** Absolute canonical URL of the FAQ page. */
	url?: string;
	/** Page name, e.g. the resolved `FAQ` heading. */
	name?: string;
	/** Short summary used as the schema's `description`. */
	description?: string;
}

export function FaqJsonLd({ entries, url, name, description }: FaqJsonLdProps) {
	if (entries.length === 0) return null;

	const schema = generateFaqPageSchema({ entries, url, name, description });
	if (!schema) return null;

	return (
		<script
			type="application/ld+json"
			dangerouslySetInnerHTML={{
				// Why: escape every '<' as the < JSON escape so a stray
				// '</script>' inside a question or answer — both come from the
				// Work's data repository, i.e. author-controlled text — cannot
				// terminate this inline <script> block and inject HTML. The
				// browser still decodes it to the literal character, so the
				// parsed schema round-trips losslessly. Same guard as
				// components/seo/breadcrumb-json-ld.tsx.
				__html: JSON.stringify(schema).replace(/</g, '\\u003c')
			}}
		/>
	);
}
