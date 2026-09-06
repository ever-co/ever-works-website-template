import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getTwoFactorCodeTemplate, type TwoFactorCodeEmailData } from '../two-factor-code';

/**
 * Spec 047 / EW-138 — the one-time-code email.
 *
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * The subject line is the one part of this mail that leaks WITHOUT the mail
 * ever being opened: a lock-screen notification, the message list on a shared
 * screen, a push preview, and the `Subject:` header that every relay on the
 * path logs in the clear. A code sitting there is a second factor that anybody
 * who can glance at the screen — or read a mail log — already holds, which is
 * exactly the property the factor exists to provide. So the code belongs in the
 * body and nowhere else.
 */
const CODE = '482913';

function render(overrides: Partial<TwoFactorCodeEmailData> = {}) {
	return getTwoFactorCodeTemplate({
		code: CODE,
		customerEmail: 'member@example.com',
		expiresInMinutes: 10,
		...overrides
	});
}

describe('getTwoFactorCodeTemplate', () => {
	it('🛑 the subject never carries the code', () => {
		const { subject } = render();

		assert.ok(!subject.includes(CODE), `subject leaked the code: ${subject}`);
		// Nor any six-digit run a notification preview could be read as the code.
		assert.doesNotMatch(subject, /[0-9]{6}/);
		assert.ok(subject.length > 0);
	});

	it('the subject still identifies the site, so it does not read as spam', () => {
		const { subject } = render({ companyName: 'Acme Directory' });

		assert.ok(subject.includes('Acme Directory'), subject);
		assert.match(subject, /verification code/i);
	});

	it('CONTROL: the code IS in the body, in both the HTML and the text part', () => {
		const { html, text } = render();

		assert.ok(html.includes(CODE));
		assert.ok(text.includes(CODE));
	});

	it('the body states the expiry the user is racing', () => {
		const { html, text } = render({ expiresInMinutes: 10 });

		assert.ok(html.includes('10'));
		assert.ok(text.includes('10'));
	});

	it('a display name is escaped before it reaches the markup', () => {
		// Display names come straight from the database, so a member who sets
		// theirs to `<img onerror=…>` must not have it rendered by whichever
		// client opens the mail.
		const { html } = render({ userName: '<img src=x onerror=alert(1)>' });

		assert.ok(!html.includes('<img src=x'));
		assert.ok(html.includes('&lt;img src=x'));
	});

	it('a javascript: URL cannot reach an href', () => {
		// Asserted by extracting the href values and comparing them WHOLE rather
		// than by substring-matching the rendered HTML: a substring test against
		// a URL is exactly the incomplete-sanitization pattern CodeQL flags
		// (`js/incomplete-url-substring-sanitization`), because the fragment can
		// sit anywhere in the string with arbitrary hosts on either side.
		const { html } = render({ companyUrl: 'javascript:alert(1)' });
		const hrefs = [...html.matchAll(/href="([^"]*)"/g)].map((match) => match[1]);

		assert.ok(hrefs.length > 0, 'the template should render at least one link');
		for (const href of hrefs) {
			const scheme = href.slice(0, href.indexOf(':') + 1).toLowerCase();
			assert.ok(['https:', 'http:', 'mailto:'].includes(scheme), `unsafe href scheme: ${href}`);
		}
		// The hostile value is dropped for the safe default, not merely escaped.
		// (`mailto:` links carry no host, so only the web links are compared.)
		const webHosts = hrefs.filter((href) => href.startsWith('https:')).map((href) => new URL(href).host);
		assert.ok(webHosts.length > 0, 'the template should render at least one web link');
		for (const host of webHosts) {
			assert.equal(host, 'ever.works');
		}
	});
});
