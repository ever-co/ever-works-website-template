/**
 * FAQ extraction from Git-CMS page content.
 *
 * The `/faq` route renders whatever `pages/faq.<locale>.md` the Work's data
 * repository ships (see `lib/content.ts#fetchPageContent`). To emit a
 * Schema.org `FAQPage` for that same content we need question/answer pairs,
 * which the Markdown body only expresses structurally. This module turns a
 * page's frontmatter + body into `FaqEntry[]` without any I/O so it can run in
 * a server component and stays trivially testable.
 *
 * Two shapes are supported, in priority order:
 *
 * 1. **Explicit frontmatter** — the most precise, and the escape hatch when a
 *    page's prose does not map cleanly onto headings:
 *
 *    ```yaml
 *    ---
 *    title: FAQ
 *    faqs:
 *      - question: How do I submit a listing?
 *        answer: Use the Submit button in the header.
 *    ---
 *    ```
 *
 * 2. **Heading-per-question Markdown** — the shape almost every hand-written
 *    FAQ already uses. Each `##`/`###`/`####` heading becomes a question and
 *    the prose beneath it becomes the answer:
 *
 *    ```md
 *    ## How do I submit a listing?
 *
 *    Use the Submit button in the header.
 *    ```
 *
 * `#` (H1) is ignored: it is the document title, not a question. A heading
 * immediately followed by another heading contributes no answer text and is
 * skipped, so grouping headings (`## Submissions` above a run of `###`
 * questions) do not leak into the schema as empty questions.
 */

import type { FaqEntry } from './schema';

/**
 * Upper bound on a single answer's serialised length. Google documents a
 * 10 000-character limit per answer for the FAQPage rich result; we truncate
 * well below it so a page that dumps an entire policy under one heading
 * cannot balloon the inline JSON-LD payload (which is parsed on every page
 * view and counts against the performance budget in AGENTS.md §5).
 */
const MAX_ANSWER_LENGTH = 1200;

/** Upper bound on how many questions we serialise, for the same reason. */
const MAX_ENTRIES = 50;

/** Longest string we accept as a question — anything longer is prose. */
const MAX_QUESTION_LENGTH = 300;

/**
 * Strip Markdown syntax down to readable plain text.
 *
 * `acceptedAnswer.text` may contain a limited HTML subset, but plain text is
 * always valid and avoids having to sanitise author-controlled HTML that ends
 * up inside a `<script type="application/ld+json">` block.
 */
export function stripMarkdown(input: string): string {
	return (
		input
			// Fenced code blocks: keep the code, drop the fences.
			.replace(/^```[^\n]*\n([\s\S]*?)^```\s*$/gm, '$1')
			// Images: drop entirely (alt text rarely reads as part of an answer).
			.replace(/!\[[^\]]*\]\([^)]*\)/g, '')
			// Links: keep the label, drop the target.
			.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
			// Reference-style links: keep the label.
			.replace(/\[([^\]]*)\]\[[^\]]*\]/g, '$1')
			// Raw HTML tags (including any stray `</script>`).
			.replace(/<[^>]*>/g, '')
			// Inline code.
			.replace(/`([^`]*)`/g, '$1')
			// Bold / italic / strikethrough markers.
			.replace(/(\*\*\*|\*\*|\*|___|__|_|~~)/g, '')
			// Blockquote markers at line start.
			.replace(/^\s{0,3}>\s?/gm, '')
			// Leading heading hashes. Real headings are consumed by the block
			// splitter, so what reaches here is `#` inside retained fenced-code
			// text — which should read as words, not as stray hashes.
			.replace(/^\s{0,3}#{1,6}\s+/gm, '')
			// Unordered list bullets at line start.
			.replace(/^\s*[-*+]\s+/gm, '')
			// Ordered list markers at line start.
			.replace(/^\s*\d+[.)]\s+/gm, '')
			// Horizontal rules.
			.replace(/^\s*([-*_])\s*(\1\s*){2,}$/gm, '')
			// Table pipes — the cells still read as text.
			.replace(/\|/g, ' ')
			// Collapse all whitespace runs into single spaces.
			.replace(/\s+/g, ' ')
			.trim()
	);
}

function truncate(text: string, max: number): string {
	if (text.length <= max) return text;
	const clipped = text.slice(0, max);
	const lastSpace = clipped.lastIndexOf(' ');
	return `${(lastSpace > max * 0.6 ? clipped.slice(0, lastSpace) : clipped).trimEnd()}…`;
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Read `faqs: [{ question, answer }]` out of a page's parsed frontmatter.
 *
 * Frontmatter is author-controlled YAML from the data repository, so every
 * field is validated rather than trusted; malformed rows are skipped instead
 * of failing the page render.
 */
export function extractFaqsFromMetadata(metadata: Record<string, unknown> | undefined | null): FaqEntry[] {
	const raw = metadata?.faqs;
	if (!Array.isArray(raw)) return [];

	const entries: FaqEntry[] = [];

	for (const row of raw) {
		if (!row || typeof row !== 'object') continue;
		const record = row as Record<string, unknown>;
		// Accept `q`/`a` as a shorthand — it shows up in hand-written YAML.
		const question = isNonEmptyString(record.question)
			? record.question
			: isNonEmptyString(record.q)
				? record.q
				: null;
		const answer = isNonEmptyString(record.answer) ? record.answer : isNonEmptyString(record.a) ? record.a : null;

		if (!question || !answer) continue;

		entries.push({
			question: truncate(stripMarkdown(question), MAX_QUESTION_LENGTH),
			answer: truncate(stripMarkdown(answer), MAX_ANSWER_LENGTH)
		});

		if (entries.length >= MAX_ENTRIES) break;
	}

	return entries;
}

interface HeadingBlock {
	level: number;
	heading: string;
	body: string[];
}

/**
 * Split a Markdown body into `{ level, heading, body }` blocks, ignoring `#`
 * characters that appear inside fenced code blocks.
 */
function toHeadingBlocks(markdown: string): HeadingBlock[] {
	const blocks: HeadingBlock[] = [];
	let current: HeadingBlock | null = null;
	let fence: string | null = null;

	for (const line of markdown.split(/\r?\n/)) {
		const fenceMatch = line.match(/^\s{0,3}(`{3,}|~{3,})/);
		if (fenceMatch) {
			const marker = fenceMatch[1][0];
			if (fence === null) {
				fence = marker;
			} else if (fence === marker) {
				fence = null;
			}
			if (current) current.body.push(line);
			continue;
		}

		if (fence !== null) {
			if (current) current.body.push(line);
			continue;
		}

		const headingMatch = line.match(/^\s{0,3}(#{1,6})\s+(.*)$/);
		if (headingMatch) {
			if (current) blocks.push(current);
			current = {
				level: headingMatch[1].length,
				// Drop optional closing hashes (`## Question ##`).
				heading: headingMatch[2].replace(/\s+#+\s*$/, '').trim(),
				body: []
			};
			continue;
		}

		if (current) current.body.push(line);
	}

	if (current) blocks.push(current);
	return blocks;
}

/**
 * Extract question/answer pairs from a Markdown body using the
 * heading-per-question convention.
 *
 * The answer for a heading is the prose directly under it, stopping at the
 * next heading of any level so a nested `###` question is never swallowed
 * into its parent `##` section's answer.
 */
export function extractFaqsFromMarkdown(markdown: string): FaqEntry[] {
	if (!markdown || markdown.trim().length === 0) return [];

	const entries: FaqEntry[] = [];

	for (const block of toHeadingBlocks(markdown)) {
		// H1 is the document title, not a question.
		if (block.level < 2) continue;

		const question = stripMarkdown(block.heading);
		if (question.length === 0 || question.length > MAX_QUESTION_LENGTH) continue;

		const answer = stripMarkdown(block.body.join('\n'));
		// A grouping heading (immediately followed by another heading) has no
		// body of its own — skip it rather than emitting an empty Answer.
		if (answer.length === 0) continue;

		entries.push({ question, answer: truncate(answer, MAX_ANSWER_LENGTH) });

		if (entries.length >= MAX_ENTRIES) break;
	}

	return entries;
}

/**
 * Resolve the FAQ entries for a page: explicit frontmatter wins, and the
 * Markdown headings are the fallback so an ordinary FAQ document needs no
 * extra authoring to earn its rich result.
 */
export function extractFaqEntries(content: string, metadata?: Record<string, unknown> | null): FaqEntry[] {
	const fromMetadata = extractFaqsFromMetadata(metadata);
	if (fromMetadata.length > 0) return fromMetadata;
	return extractFaqsFromMarkdown(content);
}
