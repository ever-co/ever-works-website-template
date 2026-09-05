import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { extractFaqEntries, extractFaqsFromMarkdown, extractFaqsFromMetadata, stripMarkdown } from '../faq-parser';

/**
 * The `/faq` page's structured data is generated from author-controlled
 * Markdown in the Work's data repository and is then serialised into an inline
 * `<script type="application/ld+json">` block. Two properties matter and are
 * asserted here:
 *
 * 1. **Fidelity** — the schema must say what the rendered page says. Search
 *    engines treat a mismatch between the visible answer and the marked-up
 *    answer as a structured-data violation, so silently mangling prose is a
 *    real defect, not a cosmetic one.
 * 2. **No reassembly** — the Markdown-to-text reduction must not leave behind
 *    fragments that can splice back into an HTML tag.
 *
 * Run with: `npx tsx --test apps/web/lib/seo/__tests__/faq-parser.spec.ts`
 */

describe('stripMarkdown', () => {
	it('removes emphasis, strong and strikethrough delimiters', () => {
		assert.equal(stripMarkdown('**Bold** and _italic_ and ~~gone~~.'), 'Bold and italic and gone.');
		assert.equal(stripMarkdown('***All three*** at once.'), 'All three at once.');
		assert.equal(stripMarkdown('__Strong__ with underscores.'), 'Strong with underscores.');
	});

	it('keeps underscores and asterisks that are not emphasis delimiters', () => {
		// Regression: a blanket `/(\*\*\*|\*\*|\*|___|__|_|~~)/g` removal turned
		// `snake_case` into `snakecase` and `5*3` into `53` in the schema while
		// the page itself still rendered them intact.
		assert.equal(stripMarkdown('Use snake_case for the slug.'), 'Use snake_case for the slug.');
		assert.equal(stripMarkdown('Calculate 5*3 per listing.'), 'Calculate 5*3 per listing.');
		assert.equal(stripMarkdown('Files named foo_bar_baz.md are fine.'), 'Files named foo_bar_baz.md are fine.');
		assert.equal(stripMarkdown('A single * on its own.'), 'A single * on its own.');
		assert.equal(stripMarkdown('a * b * c'), 'a * b * c');
	});

	it('strips intra-word `*` emphasis but never intra-word `_`', () => {
		// CommonMark allows `*` to open and close inside a word and does not
		// allow `_` to. The page renders 2<em>3</em>4 and a literal
		// `snake_case`, so the schema has to say `234` and `snake_case`.
		assert.equal(stripMarkdown('Calculate 2*3*4 here.'), 'Calculate 234 here.');
		assert.equal(stripMarkdown('Use snake_case_here for the slug.'), 'Use snake_case_here for the slug.');
	});

	it('unwraps nested emphasis completely', () => {
		// One pass left the outer delimiters behind (`**bold nested text**`)
		// because the inner `*` blocks the outer match on the first try.
		assert.equal(stripMarkdown('**bold *nested* text**'), 'bold nested text');
		assert.equal(stripMarkdown('*a **b** c*'), 'a b c');
	});

	it('keeps literal characters that come out of inline code', () => {
		assert.equal(stripMarkdown('Add `faq.en.md` using `snake_case`.'), 'Add faq.en.md using snake_case.');
		// Inside a code span Markdown punctuation is literal, so the schema
		// must repeat it rather than re-interpret it as formatting.
		assert.equal(stripMarkdown('Run `_setup_` now.'), 'Run _setup_ now.');
		assert.equal(stripMarkdown('Run `**literal**` now.'), 'Run **literal** now.');
		assert.equal(stripMarkdown('Pipe with `a|b` inside.'), 'Pipe with a|b inside.');
	});

	it('keeps a fenced block as written', () => {
		assert.equal(stripMarkdown('```js\nconst a = `x_y`;\n```'), 'const a = `x_y`;');
	});

	it('drops HTML tags and comments', () => {
		assert.equal(stripMarkdown('Email <a href="/x">support</a> today.'), 'Email support today.');
		assert.equal(stripMarkdown('Before <!-- hidden note --> after.'), 'Before after.');
	});

	it('cannot be tricked into re-forming a tag', () => {
		// A single global replace collapses this into a working `<script>`.
		const stripped = stripMarkdown('<scr<script>ipt>alert(1)</script>');
		assert.ok(!stripped.includes('<script'), `unexpected tag in: ${stripped}`);
		assert.ok(!/<[/!?]?[a-zA-Z]/.test(stripped), `unexpected tag opener in: ${stripped}`);
	});

	it('keeps a less-than sign that is ordinary prose', () => {
		assert.equal(stripMarkdown('Orders under < 10 items ship free.'), 'Orders under < 10 items ship free.');
	});

	it('reduces lists, quotes, rules and tables to their text', () => {
		const input = ['> A quote.', '', '- first', '- second', '', '***', '', '| a | b |'].join('\n');
		assert.equal(stripMarkdown(input), 'A quote. first second a b');
	});
});

describe('extractFaqsFromMarkdown', () => {
	const markdown = [
		'# Frequently Asked Questions',
		'',
		'Intro prose that belongs to no question.',
		'',
		'## How do I submit a listing?',
		'',
		'Use the **Submit** button in the header.',
		'',
		'## Submissions',
		'',
		'### How long does review take?',
		'',
		'Usually two business days.',
		''
	].join('\n');

	it('turns each heading below H1 into a question', () => {
		const entries = extractFaqsFromMarkdown(markdown);
		assert.deepEqual(entries, [
			{ question: 'How do I submit a listing?', answer: 'Use the Submit button in the header.' },
			{ question: 'How long does review take?', answer: 'Usually two business days.' }
		]);
	});

	it('ignores headings inside fenced code blocks', () => {
		const entries = extractFaqsFromMarkdown(
			['## What does the file look like?', '', '```md', '## Not a question', '```', ''].join('\n')
		);
		assert.equal(entries.length, 1);
		assert.equal(entries[0].question, 'What does the file look like?');
	});

	it('returns nothing for empty or heading-free content', () => {
		assert.deepEqual(extractFaqsFromMarkdown(''), []);
		assert.deepEqual(extractFaqsFromMarkdown('Just prose, no headings at all.'), []);
	});

	it('truncates an answer that runs past the serialisation cap', () => {
		const entries = extractFaqsFromMarkdown(`## Long?\n\n${'word '.repeat(600)}`);
		assert.equal(entries.length, 1);
		assert.ok(entries[0].answer.length <= 1201, `answer was ${entries[0].answer.length} chars`);
		assert.ok(entries[0].answer.endsWith('…'));
	});
});

describe('extractFaqsFromMetadata', () => {
	it('reads question/answer rows and the q/a shorthand', () => {
		const entries = extractFaqsFromMetadata({
			faqs: [
				{ question: 'One?', answer: 'Yes.' },
				{ q: 'Two?', a: 'Also yes.' }
			]
		});
		assert.deepEqual(entries, [
			{ question: 'One?', answer: 'Yes.' },
			{ question: 'Two?', answer: 'Also yes.' }
		]);
	});

	it('skips malformed rows instead of failing the render', () => {
		const entries = extractFaqsFromMetadata({
			faqs: [
				null,
				'nope',
				{ question: 'Missing answer?' },
				{ answer: 'Missing question.' },
				{ question: 'Ok?', answer: 'Yes.' }
			]
		});
		assert.deepEqual(entries, [{ question: 'Ok?', answer: 'Yes.' }]);
	});

	it('returns nothing when there is no faqs array', () => {
		assert.deepEqual(extractFaqsFromMetadata(undefined), []);
		assert.deepEqual(extractFaqsFromMetadata(null), []);
		assert.deepEqual(extractFaqsFromMetadata({ title: 'FAQ' }), []);
	});
});

describe('extractFaqEntries', () => {
	const markdown = '## Heading question?\n\nHeading answer.\n';

	it('prefers explicit frontmatter over the headings', () => {
		const entries = extractFaqEntries(markdown, { faqs: [{ question: 'Explicit?', answer: 'Yes.' }] });
		assert.deepEqual(entries, [{ question: 'Explicit?', answer: 'Yes.' }]);
	});

	it('falls back to the headings when no faqs key is present', () => {
		assert.deepEqual(extractFaqEntries(markdown, { title: 'FAQ' }), [
			{ question: 'Heading question?', answer: 'Heading answer.' }
		]);
		assert.deepEqual(extractFaqEntries(markdown), [{ question: 'Heading question?', answer: 'Heading answer.' }]);
	});

	it('treats a present faqs array as authoritative, so `faqs: []` opts out', () => {
		assert.deepEqual(extractFaqEntries(markdown, { faqs: [] }), []);
		assert.deepEqual(extractFaqEntries(markdown, { faqs: [{ question: 'no answer' }] }), []);
	});

	it('ignores a faqs key that is not an array', () => {
		assert.deepEqual(extractFaqEntries(markdown, { faqs: 'nope' }), [
			{ question: 'Heading question?', answer: 'Heading answer.' }
		]);
	});
});
