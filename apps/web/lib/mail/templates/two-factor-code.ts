export interface TwoFactorCodeEmailData {
	/** The plaintext one-time code. Only ever exists in this email. */
	code: string;
	/** Recipient address, echoed in the footer like the sibling templates. */
	customerEmail: string;
	/** Optional display name for the greeting. */
	userName?: string;
	/** Minutes the code stays valid — shown so the user knows to hurry. */
	expiresInMinutes: number;
	companyName?: string;
	companyUrl?: string;
	supportEmail?: string;
	securityUrl?: string;
}

/**
 * Same helper the payment templates use. Display names and email
 * addresses reach this template straight from the database, so they are
 * escaped before being interpolated into markup — a member who sets
 * their display name to `<img onerror=…>` must not have it rendered by
 * whichever client opens the mail.
 */
function escapeHtml(unsafe: string): string {
	return unsafe
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

/**
 * Keep only `http:` / `https:` values out of the `href` attributes, and
 * fall back to the safe default otherwise. Same guard the payment
 * templates apply — the URLs are configuration-derived, so a misconfigured
 * `NEXT_PUBLIC_APP_URL` must not be able to plant a `javascript:` link in
 * an email this template tells the reader to trust.
 */
const DEFAULT_COMPANY_URL = 'https://ever.works';

function safeUrl(url: string, fallback: string): string {
	try {
		const parsed = new URL(url);
		return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? url : fallback;
	} catch {
		return fallback;
	}
}

/**
 * Branded sign-in verification email for email two-factor authentication
 * (EW-138).
 *
 * Modelled on `password-change-confirmation.ts` so the whole security
 * mail family looks alike: same 600px shell, same header / content /
 * footer rhythm, same inline styles (email clients ignore `<style>`
 * blocks and external CSS). The code itself is rendered in a large
 * monospaced block that survives a client stripping colours, and the
 * expiry window plus the "you did not try to sign in" warning are
 * spelled out because this mail is the one an attacker's victim sees
 * first.
 */
export const getTwoFactorCodeTemplate = (data: TwoFactorCodeEmailData) => {
	const {
		code: rawCode,
		customerEmail: rawCustomerEmail,
		userName: rawUserName,
		expiresInMinutes,
		companyName: rawCompanyName = 'Ever Works',
		companyUrl: rawCompanyUrl = DEFAULT_COMPANY_URL,
		supportEmail: rawSupportEmail = 'support@ever.works',
		securityUrl: rawSecurityUrl = `${rawCompanyUrl}/client/settings/security`
	} = data;

	// Validated for the plain-text body; escaped again for the href attributes.
	const companyUrl = safeUrl(rawCompanyUrl, DEFAULT_COMPANY_URL);
	const securityUrl = safeUrl(rawSecurityUrl, `${DEFAULT_COMPANY_URL}/client/settings/security`);
	const companyUrlAttr = escapeHtml(companyUrl);
	const securityUrlAttr = escapeHtml(securityUrl);
	const code = escapeHtml(rawCode);
	const customerEmail = escapeHtml(rawCustomerEmail);
	const userName = rawUserName ? escapeHtml(rawUserName) : rawUserName;
	const companyName = escapeHtml(rawCompanyName);
	const supportEmail = escapeHtml(rawSupportEmail);

	// The subject is plain text, so it uses the unescaped values.
	//
	// The CODE IS DELIBERATELY NOT IN THE SUBJECT. A subject line is the one
	// part of this mail that leaks without the mail ever being opened: it shows
	// up in a lock-screen notification, in the mail app's message list over a
	// colleague's shoulder, in push previews, and in the `Subject:` header that
	// every relay on the path logs in the clear. Anyone who can see the screen
	// or the mail metadata would then hold the second factor without holding the
	// mailbox, which is exactly the property the factor exists to provide. The
	// code lives in the body, where it takes a deliberate act to read it.
	const subject = `Your ${rawCompanyName} verification code`;

	const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your verification code</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #ffffff; margin: 0; padding: 20px;">

      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #ddd; padding: 0;">

        <!-- Header -->
        <div style="padding: 30px; text-align: center; border-bottom: 1px solid #ddd;">
          <h1 style="margin: 0; font-size: 24px; color: #333;">Your verification code</h1>
          <p style="margin: 10px 0 0 0; color: #666;">Two-factor authentication for your ${companyName} account</p>
        </div>

        <!-- Content -->
        <div style="padding: 30px;">

          <p style="margin: 0 0 20px 0; font-size: 16px;">
            Hello${userName ? ` ${userName}` : ''},
          </p>

          <p style="margin: 0 0 25px 0; font-size: 16px; color: #666;">
            Enter this code to finish signing in to your ${companyName} account.
          </p>

          <!-- Code -->
          <div style="border: 1px solid #ddd; padding: 24px; margin: 25px 0; text-align: center;">
            <p style="margin: 0 0 8px 0; font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px;">
              Verification code
            </p>
            <p style="margin: 0; font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: bold; letter-spacing: 8px; color: #111;">
              ${code}
            </p>
            <p style="margin: 12px 0 0 0; font-size: 14px; color: #666;">
              This code expires in ${expiresInMinutes} minutes and can be used once.
            </p>
          </div>

          <!-- Security Notice -->
          <div style="border: 1px solid #ddd; padding: 20px; margin: 25px 0;">
            <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #333;">Didn't try to sign in?</h3>
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">
              Someone may have your password. Do not share this code with anyone — ${companyName} will never ask you
              for it. Change your password and review your security settings right away.
            </p>
            <p style="margin: 0; font-size: 14px; color: #666;">
              Need help? Contact us at
              <a href="mailto:${supportEmail}" style="color: #333; text-decoration: underline;">${supportEmail}</a>
            </p>
          </div>

          <!-- Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${securityUrlAttr}" style="display: inline-block; background-color: #333; color: white; text-decoration: none; padding: 12px 24px; border: 1px solid #333;">
              Review Security Settings
            </a>
          </div>

        </div>

        <!-- Footer -->
        <div style="padding: 20px; text-align: center; border-top: 1px solid #ddd;">
          <p style="margin: 0 0 10px 0; font-size: 12px; color: #666;">
            This email was sent to <strong>${customerEmail}</strong>
          </p>
          <p style="margin: 0; font-size: 12px; color: #666;">
            &copy; ${new Date().getFullYear()} <a href="${companyUrlAttr}" style="color: #333; text-decoration: underline;">${companyName}</a>. All rights reserved.
          </p>
        </div>

      </div>

    </body>
    </html>
  `;

	// The plain-text alternative is not markup, so it carries the RAW values —
	// escaping here would show a member called "O'Neill" their own name as
	// "O&#039;Neill".
	const text = `
Your ${rawCompanyName} verification code

Hello${rawUserName ? ` ${rawUserName}` : ''},

Enter this code to finish signing in to your ${rawCompanyName} account:

    ${rawCode}

This code expires in ${expiresInMinutes} minutes and can be used once.

DIDN'T TRY TO SIGN IN? Someone may have your password. Do not share this code with
anyone — ${rawCompanyName} will never ask you for it. Change your password and review
your security settings right away: ${securityUrl}

Need help? Contact us at ${rawSupportEmail}

© ${new Date().getFullYear()} ${rawCompanyName}. All rights reserved.
${companyUrl}
  `;

	return {
		subject,
		html,
		text
	};
};
