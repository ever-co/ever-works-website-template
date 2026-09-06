import { test, expect } from '@playwright/test';
import {
	getTwoFactorCodeTemplate,
	type TwoFactorCodeEmailData
} from '../../../web/lib/mail/templates/two-factor-code';

/**
 * Unit coverage for the one-time-code email (spec 047 — EW-138).
 *
 * The subject line is the one part of this mail that leaks WITHOUT the mail
 * ever being opened: a lock-screen notification, the message list on a shared
 * screen, a push preview, and the `Subject:` header every relay on the path
 * logs in the clear. A code sitting there is a second factor that anybody who
 * can glance at the screen — or read a mail log — already holds, which is
 * exactly the property the factor exists to provide. So the code belongs in
 * the body and nowhere else.
 *
 * The same assertions also live as a `node:test` spec beside the module
 * (`apps/web/lib/mail/templates/__tests__/two-factor-code.spec.ts`), which is the copy CI runs on every
 * PR via `pnpm --filter @ever-works/web test:unit`. This one runs with the
 * rest of the Playwright suite on stage/main.
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

test.describe('Email 2FA: the code email (EW-138)', () => {
	test('the subject never carries the code', () => {
		const { subject } = render();

		expect(subject).not.toContain(CODE);
		// Nor any six-digit run a notification preview could be read as the code.
		expect(subject).not.toMatch(/[0-9]{6}/);
		expect(subject.length).toBeGreaterThan(0);
	});

	test('the subject still identifies the site, so it does not read as spam', () => {
		const { subject } = render({ companyName: 'Acme Directory' });

		expect(subject).toContain('Acme Directory');
		expect(subject).toMatch(/verification code/i);
	});

	test('the code IS in the body, in both the HTML and the text part', () => {
		const { html, text } = render();

		expect(html).toContain(CODE);
		expect(text).toContain(CODE);
	});

	test('the body states the expiry the user is racing', () => {
		const { html, text } = render({ expiresInMinutes: 10 });

		expect(html).toContain('10');
		expect(text).toContain('10');
	});

	test('a display name is escaped before it reaches the markup', () => {
		const { html } = render({ userName: '<img src=x onerror=alert(1)>' });

		expect(html).not.toContain('<img src=x');
		expect(html).toContain('&lt;img src=x');
	});
});
