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
		const { html } = render({ companyUrl: 'javascript:alert(1)' });

		assert.ok(!html.includes('javascript:'));
		assert.ok(html.includes('https://ever.works'));
	});
});
