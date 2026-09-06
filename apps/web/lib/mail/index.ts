import { getCachedConfig } from '../content';
import { EmailProviderFactory } from './factory';
import { getPasswordChangeConfirmationTemplate } from './templates';
import { coreConfig, emailConfig as globalEmailConfig } from '@/lib/config/config-service';

export interface EmailMessage {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export interface EmailProvider {
  sendEmail(message: EmailMessage): Promise<any>;
  getName(): string;
}

export interface EmailNovuConfig {
  templateId?: string;
  backendUrl?: string;
}

export interface EmailSmtpConfig {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
}

export interface EmailServiceConfig {
  provider: string;
  defaultFrom: string;
  apiKeys: Record<string, string>;
  domain: string;
  novu?: EmailNovuConfig;
  smtp?: EmailSmtpConfig;
}

export class EmailService {
  private provider: EmailProvider | null = null;
  private domain: string;
  private defaultFrom: string;
  private isAvailable: boolean = false;

  constructor(config: EmailServiceConfig) {
    try {
      // Providers that generate their own credentials at runtime (no env key needed)
      const selfCredentialedProviders = ['ethereal'];
      const providerName = config.provider.toLowerCase();
      const hasApiKey =
        selfCredentialedProviders.includes(providerName) ||
        Object.values(config.apiKeys).some(key => key && key.trim() !== '');

      if (!hasApiKey) {
        console.warn('⚠️  Email service: No API keys configured. Email features will be disabled.');
        this.isAvailable = false;
      } else {
        this.provider = EmailProviderFactory.createProvider(config);
        this.isAvailable = true;
      }

      this.domain = config.domain;
      this.defaultFrom = config.defaultFrom;
    } catch (error) {
      console.warn('⚠️  Email service initialization failed:', error instanceof Error ? error.message : 'Unknown error');
      this.isAvailable = false;
      this.domain = config.domain;
      this.defaultFrom = config.defaultFrom;
    }
  }

  /**
   * Check if email service is available
   */
  public isServiceAvailable(): boolean {
    return this.isAvailable && this.provider !== null;
  }

  /**
   * Ensure email service is available before sending
   */
  private ensureAvailable(): void {
    if (!this.isServiceAvailable()) {
      throw new Error('Email service is not available. Please configure email provider API keys.');
    }
  }

  async sendVerificationEmail(email: string, token: string): Promise<any> {
    this.ensureAvailable();
    // Use the new professional template instead of the simple one
    return this.sendVerificationEmailWithTemplate(email, token);
  }

  async sendNewsletterSubscriptionEmail(email: string): Promise<any> {
    this.ensureAvailable();
    return this.provider!.sendEmail({
      from: this.defaultFrom,
      to: email,
      subject: "Welcome to the newsletter",
      html: `<p>Welcome to the newsletter.</p>`,
    });
  }

  async sendNewsletterUnsubscriptionEmail(email: string): Promise<any> {
    this.ensureAvailable();
    return this.provider!.sendEmail({
      from: this.defaultFrom,
      to: email,
      subject: "Unsubscribe from the newsletter",
      html: `<p>You have been unsubscribed from the newsletter.</p>`,
    });
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<any> {
    this.ensureAvailable();
    const resetLink = `${this.domain}/auth/new-password?token=${token}`;
    return this.provider!.sendEmail({
      from: this.defaultFrom,
      to: email,
      subject: "Reset your password",
      html: `<p>Click <a href="${resetLink}">here</a> to reset password.</p>`,
    });
  }

  /**
   * Send the one-time sign-in code for email two-factor authentication
   * (EW-138).
   *
   * Uses the branded `two-factor-code` template — code in a large
   * monospaced block, explicit expiry, and a "you didn't try to sign in"
   * warning — instead of the bare `<p>Your 2FA code</p>` this method sent
   * before. `options` is optional so the previous two-argument signature
   * keeps working.
   */
  async sendTwoFactorTokenEmail(
    email: string,
    token: string,
    options?: { expiresInMinutes?: number; userName?: string }
  ): Promise<any> {
    this.ensureAvailable();
    const { getTwoFactorCodeTemplate } = await import("./templates");
    const template = getTwoFactorCodeTemplate({
      code: token,
      customerEmail: email,
      userName: options?.userName,
      expiresInMinutes: options?.expiresInMinutes ?? 10,
      companyUrl: this.domain,
      securityUrl: `${this.domain}/client/settings/security`,
    });

    return this.provider!.sendEmail({
      from: this.defaultFrom,
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendPasswordChangeConfirmationEmail(email: string, userName?: string, ipAddress?: string, userAgent?: string): Promise<any> {
    console.log("🎨 Generating email template...");

    const templateData = {
      customerName: userName,
      customerEmail: email,
      changeDate: new Date().toLocaleString(),
      ipAddress,
      userAgent,
      companyUrl: this.domain,
    };

    console.log("📝 Template data:", templateData);

    const template = getPasswordChangeConfirmationTemplate(templateData);

    console.log("📧 Template generated:", {
      subject: template.subject,
      hasHtml: !!template.html,
      hasText: !!template.text,
      htmlLength: template.html?.length,
      textLength: template.text?.length
    });

    const emailMessage = {
      from: this.defaultFrom,
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    };

    this.ensureAvailable();

    console.log("📮 Sending email with provider:", this.provider!.getName());
    console.log("📬 Email message:", {
      from: emailMessage.from,
      to: emailMessage.to,
      subject: emailMessage.subject,
      hasHtml: !!emailMessage.html,
      hasText: !!emailMessage.text
    });

    try {
      const result = await this.provider!.sendEmail(emailMessage);
      console.log("✅ Provider send result:", result);
      return result;
    } catch (providerError) {
      console.error("❌ Provider send error:", providerError);
      throw providerError;
    }
  }

  async sendCustomEmail(message: EmailMessage): Promise<any> {
    this.ensureAvailable();
    return this.provider!.sendEmail(message);
  }

  async sendAccountCreatedEmail(
    userName: string,
    userEmail: string,
    companyName?: string
  ): Promise<any> {
    this.ensureAvailable();
    const { getAccountCreatedTemplate } = await import("./templates");
    const template = getAccountCreatedTemplate({
      userName,
      userEmail,
      companyName,
      companyUrl: this.domain,
    });

    return this.provider!.sendEmail({
      from: this.defaultFrom,
      to: userEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendVerificationEmailWithTemplate(
    email: string,
    token: string,
    userName?: string
  ): Promise<any> {
    this.ensureAvailable();
    const { getEmailVerificationTemplate } = await import("./templates");
    const verificationLink = `${this.domain}/auth/new-verification?token=${token}`;
    const template = getEmailVerificationTemplate({
      userEmail: email,
      verificationLink,
      companyUrl: this.domain,
      userName,
    });

    return this.provider!.sendEmail({
      from: this.defaultFrom,
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  getProviderName(): string {
    if (!this.isServiceAvailable()) {
      return 'none (not configured)';
    }
    return this.provider!.getName();
  }
}

const appUrl = coreConfig.APP_URL || 'https://demo.ever.works';

const emailConfig: EmailServiceConfig = {
	provider: globalEmailConfig.EMAIL_PROVIDER,
	defaultFrom: globalEmailConfig.EMAIL_FROM || 'info@ever.works',
	domain: appUrl,
	apiKeys: {
		resend: globalEmailConfig.resend.apiKey || '',
		novu: globalEmailConfig.novu.apiKey || '',
	},
	smtp: globalEmailConfig.smtp?.enabled
		? {
				host: globalEmailConfig.smtp.host,
				port: globalEmailConfig.smtp.port,
				user: globalEmailConfig.smtp.user,
				password: globalEmailConfig.smtp.password,
		  }
		: undefined,
};

async function mailService() {
  const config = await getCachedConfig();

  return new EmailService({
    ...emailConfig,
    provider: config.mail?.provider || emailConfig.provider,
    defaultFrom: config.mail?.default_from || emailConfig.defaultFrom,
    domain: config.app_url || emailConfig.domain,
    novu:
      config.mail?.provider === "novu"
        ? {
            templateId: config.mail?.template_id,
            backendUrl: config.mail?.backend_url,
          }
        : undefined,
  });
}

/**
 * Is a usable mail provider configured right now?
 *
 * Used by the 2FA enable route (spec 053): turning on a factor that is
 * delivered by email on a deployment with no mail provider would lock the
 * member out of their own account at the next sign-in, so the toggle
 * refuses rather than accepting a setting it cannot honour.
 *
 * `isServiceAvailable()` alone is not enough. The provider factory never
 * throws on a misconfiguration — it silently substitutes
 * `MockEmailProvider`, which accepts every send and delivers nothing, so a
 * deployment with (say) `EMAIL_PROVIDER=smtp` but only a Resend key set
 * reports "available" while nothing can ever arrive. The resolved provider
 * name is therefore checked too. Never throws — a failure to resolve
 * configuration answers `false`.
 */
export async function isEmailServiceConfigured(): Promise<boolean> {
  try {
    const service = await mailService();
    if (!service.isServiceAvailable()) return false;
    return service.getProviderName().toLowerCase() !== 'mock';
  } catch (error) {
    console.warn('[EMAIL] Could not determine mail service availability:', error);
    return false;
  }
}

// Result type for email operations when service is unavailable
interface EmailSkippedResult {
  skipped: true;
  reason: string;
}

// Helper to check if email service is available and handle gracefully
async function tryEmailOperation<T>(
  operation: (service: EmailService) => Promise<T>,
  operationName: string
): Promise<T | EmailSkippedResult> {
  try {
    const service = await mailService();
    
    if (!service.isServiceAvailable()) {
      console.warn(`[EMAIL] ${operationName}: Skipped - email service not configured`);
      return { skipped: true, reason: 'Email service not configured' };
    }
    
    return await operation(service);
  } catch (error) {
    // If it's an availability error, return skipped result instead of throwing
    if (error instanceof Error && error.message.includes('not available')) {
      console.warn(`[EMAIL] ${operationName}: Skipped - ${error.message}`);
      return { skipped: true, reason: error.message };
    }
    // For other errors, log and rethrow
    console.error(`[EMAIL] ${operationName}: Error -`, error);
    throw error;
  }
}

export const sendVerificationEmail = async (email: string, token: string) => {
  return tryEmailOperation(
    (service) => service.sendVerificationEmail(email, token),
    'sendVerificationEmail'
  );
};

export const sendPasswordResetEmail = async (email: string, token: string) => {
  return tryEmailOperation(
    (service) => service.sendPasswordResetEmail(email, token),
    'sendPasswordResetEmail'
  );
};

export const sendNewsletterSubscriptionEmail = async (email: string) => {
  return tryEmailOperation(
    (service) => service.sendNewsletterSubscriptionEmail(email),
    'sendNewsletterSubscriptionEmail'
  );
};

export const sendNewsletterUnsubscriptionEmail = async (email: string) => {
  return tryEmailOperation(
    (service) => service.sendNewsletterUnsubscriptionEmail(email),
    'sendNewsletterUnsubscriptionEmail'
  );
};

export const sendTwoFactorTokenEmail = async (
  email: string,
  token: string,
  options?: { expiresInMinutes?: number; userName?: string }
) => {
  return tryEmailOperation(
    (service) => service.sendTwoFactorTokenEmail(email, token, options),
    'sendTwoFactorTokenEmail'
  );
};

export const sendPasswordChangeConfirmationEmail = async (
  email: string,
  userName?: string,
  ipAddress?: string,
  userAgent?: string
) => {
  return tryEmailOperation(
    (service) => service.sendPasswordChangeConfirmationEmail(email, userName, ipAddress, userAgent),
    'sendPasswordChangeConfirmationEmail'
  );
};

export const sendAccountCreatedEmail = async (
  userName: string,
  userEmail: string,
  companyName?: string
) => {
  return tryEmailOperation(
    (service) => service.sendAccountCreatedEmail(userName, userEmail, companyName),
    'sendAccountCreatedEmail'
  );
};

export const sendVerificationEmailWithTemplate = async (
  email: string,
  token: string,
  userName?: string
) => {
  return tryEmailOperation(
    (service) => service.sendVerificationEmailWithTemplate(email, token, userName),
    'sendVerificationEmailWithTemplate'
  );
};
