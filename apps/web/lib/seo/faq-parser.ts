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

/** A complete tag (`<b>`, `</b>`, `<img …>`, `<!doctype html>`) at a position. */
const TAG_AT = /<[/!?]?[a-zA-Z][^<>]*>/y;

/** Just the opener of a tag, used to recognise a malformed one (`<scr<b>`). */
const TAG_OPENER_AT = /<[/!?]?[a-zA-Z]/y;

/**
 * One pass of raw-HTML removal over a Markdown fragment.
 *
 * A `<` that opens neither a comment nor a tag is ordinary prose ("orders
 * under < 10 items", "<3") and is kept, so the schema reads the way the page
 * does. A `<` that opens something tag-shaped but never closes is a malformed
 * tag and is dropped, because keeping it is what would let two fragments
 * recombine into a working tag.
 */
function stripHtmlOnce(input: string): string {
	let out = '';
	let index = 0;

	while (index < input.length) {
		const open = input.indexOf('<', index);
		if (open === -1) {
			out += input.slice(index);
			break;
		}

		out += input.slice(index, open);

		if (input.startsWith('<!--', open)) {
			const end = input.indexOf('-->', open + 4);
			// An unterminated comment swallows the rest of the input, which is
			// what an HTML parser does with it too.
			index = end === -1 ? input.length : end + 3;
			continue;
		}

		TAG_AT.lastIndex = open;
		const tag = TAG_AT.exec(input);
		if (tag) {
			index = open + tag[0].length;
			continue;
		}

		TAG_OPENER_AT.lastIndex = open;
		if (!TAG_OPENER_AT.test(input)) out += '<';
		index = open + 1;
	}

	return out;
}

/**
 * Remove raw HTML from a Markdown fragment.
 *
 * Deliberately a scanner run to a fixpoint rather than a single
 * `.replace(/<[^>]*>/g, '')`: one global pass is an incomplete sanitiser,
 * because deleting the inner tag of `<scr<script>ipt>` splices the remainder
 * back together into a fresh `<script>` (CodeQL
 * `js/incomplete-multi-character-sanitization`). Repeating until a pass
 * changes nothing leaves no construct that could be reassembled; every pass
 * that changes anything strictly shortens the string, so the loop terminates.
 */
function stripHtml(input: string): string {
	let current = input;
	for (;;) {
		const next = stripHtmlOnce(current);
		if (next === current) return current;
		current = next;
	}
}

/**
 * Body of a multi-character span: starts and ends on a non-space character
 * and may run across single newlines but never across a blank line, so an
 * unclosed `**` cannot swallow the paragraphs after it.
 */
const SPAN_BODY = String.raw`(\S(?:(?:[^\n]|\n(?!\s*\n))*?\S)?)`;

/**
 * Emphasis / strong / strikethrough delimiters, removed only where they
 * actually wrap a span.
 *
 * Deleting every `*` and `_` unconditionally corrupts ordinary prose: the
 * rendered page shows `snake_case` and `5*3`, and the structured data has to
 * say the same thing rather than `snakecase` and `53`.
 *
 * The two single-character rules differ on purpose, following CommonMark:
 * `*` may open and close inside a word (`2*3*4` renders as 2<em>3</em>4, so
 * the schema must say `234`), while `_` may not (`snake_case` is literal).
 * Both still require the opener to be followed, and the closer preceded, by a
 * non-space character — which is what leaves an unpaired `5*3` or `a * b * c`
 * alone.
 */
const EMPHASIS_RULES: ReadonlyArray<readonly [RegExp, string]> = [
	[new RegExp(String.raw`\*\*\*${SPAN_BODY}\*\*\*`, 'g'), '$1'],
	[new RegExp(String.raw`___${SPAN_BODY}___`, 'g'), '$1'],
	[new RegExp(String.raw`\*\*${SPAN_BODY}\*\*`, 'g'), '$1'],
	[new RegExp(String.raw`__${SPAN_BODY}__`, 'g'), '$1'],
	[new RegExp(String.raw`~~${SPAN_BODY}~~`, 'g'), '$1'],
	[new RegExp(String.raw`\*${SPAN_BODY}\*`, 'g'), '$1'],
	[new RegExp(String.raw`(^|[^\w_])_${SPAN_BODY}_(?!\w)`, 'gm'), '$1$2']
];

/**
 * Apply the emphasis rules until they stop changing the text.
 *
 * One pass leaves nested spans behind — `**bold *nested* text**` came out as
 * `**bold nested text**`, delimiters and all, because the inner `*` blocks the
 * outer match on the first try. Every pass that changes anything removes at
 * least two characters, so the loop terminates.
 */
function stripEmphasis(input: string): string {
	let current = input;
	for (;;) {
		let next = current;
		for (const [pattern, replacement] of EMPHASIS_RULES) {
			next = next.replace(pattern, replacement);
		}
		if (next === current) return current;
		current = next;
	}
}

/**
 * Sentinel wrapped around a protected code span. U+0000 never occurs in
 * Markdown source, is not matched by `\s` or `\w`, and carries no meaning to
 * any rule below, so a placeholder passes through those rules untouched.
 */
const CODE_MARK = '\u0000';

/**
 * Pull code out of the text before any other rule can touch it, returning the
 * placeholder-bearing text and the code to put back afterwards.
 *
 * Code is the one place where Markdown punctuation is literal: a page that
 * renders `` `_setup_` `` must be marked up as `_setup_`, not `setup`. Running
 * the inline-code rule first and the emphasis rules afterwards — which is what
 * this replaces — quietly re-interpreted every code span's contents.
 */
function extractCode(input: string): { text: string; code: string[] } {
	const code: string[] = [];
	const hold = (value: string): string => `${CODE_MARK}${code.push(value) - 1}${CODE_MARK}`;

	const text = input
		// Fenced blocks: keep the code, drop the fences.
		.replace(/^```[^\n]*\n([\s\S]*?)^```[ \t]*$/gm, (_match, body: string) => hold(body))
		// Inline spans.
		.replace(/`([^`]*)`/g, (_match, body: string) => hold(body));

	return { text, code };
}

/** Put the protected code back, innermost placeholders included. */
function restoreCode(text: string, code: string[]): string {
	return text.replace(new RegExp(`${CODE_MARK}(\\d+)${CODE_MARK}`, 'g'), (match, index: string) => {
		const value = code[Number(index)];
		return value === undefined ? match : value;
	});
}

/**
 * Strip Markdown syntax down to readable plain text.
 *
 * `acceptedAnswer.text` may contain a limited HTML subset, but plain text is
 * always valid and avoids having to sanitise author-controlled HTML that ends
 * up inside a `<script type="application/ld+json">` block.
 *
 * The order is load-bearing:
 *
 * 1. Code comes out first, into placeholders — inside a code span Markdown
 *    punctuation is literal, and every rule below would otherwise re-interpret
 *    it.
 * 2. Line-level constructs (blockquotes, headings, rules, list markers) go
 *    before the inline ones, so a `***` thematic break is recognised as a rule
 *    rather than half-eaten as emphasis.
 * 3. Code goes back in last, after the table pipes, so a `|` inside code
 *    survives as the page shows it.
 */
export function stripMarkdown(input: string): string {
	const { text: held, code } = extractCode(input);

	let text = held
		// Images: drop entirely (alt text rarely reads as part of an answer).
		.replace(/!\[[^\]]*\]\([^)]*\)/g, '')
		// Links: keep the label, drop the target.
		.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
		// Reference-style links: keep the label.
		.replace(/\[([^\]]*)\]\[[^\]]*\]/g, '$1');

	// Raw HTML tags (including any stray `</script>`).
	text = stripHtml(text);

	text = text
		// Blockquote markers at line start.
		.replace(/^\s{0,3}>\s?/gm, '')
		// Leading heading hashes. Real headings are consumed by the block
		// splitter, so what reaches here is a `#` the author wrote in prose.
		.replace(/^\s{0,3}#{1,6}\s+/gm, '')
		// Horizontal rules.
		.replace(/^\s*([-*_])\s*(\1\s*){2,}$/gm, '')
		// Unordered list bullets at line start.
		.replace(/^\s*[-*+]\s+/gm, '')
		// Ordered list markers at line start.
		.replace(/^\s*\d+[.)]\s+/gm, '');

	text = stripEmphasis(text);

	// Table pipes — the cells still read as text.
	text = text.replace(/\|/g, ' ');

	return (
		restoreCode(text, code)
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
 *
 * A `faqs` array in the frontmatter is **authoritative** whenever it is
 * present — including when it is empty, or when every row failed validation.
 * Falling back to the headings in that case would publish questions the author
 * explicitly did not select, which is the opposite of what "explicit control"
 * should mean. `faqs: []` is therefore how a page opts out of the rich result
 * while keeping its prose.
 */
export function extractFaqEntries(content: string, metadata?: Record<string, unknown> | null): FaqEntry[] {
	if (Array.isArray(metadata?.faqs)) return extractFaqsFromMetadata(metadata);
	return extractFaqsFromMarkdown(content);
}
