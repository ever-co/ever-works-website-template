/**
 * Business dispatch for Stripe webhook events.
 *
 * WHY THIS FILE EXISTS
 *
 * Two routes must run EXACTLY the same fulfilment logic, and they authenticate
 * differently:
 *
 *   - `POST /api/stripe/webhook`          — signed by Stripe (direct endpoint).
 *   - `POST /api/stripe/platform-webhook` — signed by the Ever Works platform,
 *                                            which verified Stripe's signature
 *                                            once centrally and relayed the event.
 *
 * Stripe caps an account at 16 live webhook endpoints, so per-site endpoints
 * cannot scale (see `EVER_WORKS_STRIPE_WEBHOOK_RELAY.md` in `ever-works/workspace`).
 * These handlers previously lived module-private inside the direct route, and Next
 * restricts what a `route.ts` may export, so the relay route could not reuse them.
 * Moving them here gives the fulfilment path exactly ONE definition — a subscription
 * activated via the relay is activated by the same code as a direct one.
 *
 * 🛑 This module performs NO authentication. Every caller must have established
 * authenticity before calling `dispatchWebhookEvent`.
 *
 * Moved verbatim from `app/api/stripe/webhook/route.ts`; behaviour is unchanged.
 */

import { WebhookEventType, type WebhookResult } from '@/lib/payment/types/payment-types';
import {
	paymentEmailService,
	extractCustomerInfo,
	formatAmount,
	formatPaymentMethod,
	formatBillingDate,
	getPlanName,
	getBillingPeriod
} from '@/lib/payment/services/payment-email.service';

// Import server configuration utility
import { getEmailConfig } from '@/lib/config/server-config';
import { coreConfig, emailConfig as globalEmailConfig } from '@/lib/config/config-service';
import { WebhookSubscriptionService } from '@/lib/services/webhook-subscription.service';
import { sponsorAdService } from '@/lib/services/sponsor-ad.service';
import { buildPaymentSucceededBaseEmailData } from '@/lib/payment/webhook-email-data';
import { assertRelayFulfilment } from '@/lib/payment/relay-fulfilment';
import { openBillingIssueFromFailedPaymentWebhook } from '@/lib/services/billing-issue.service';
import { PaymentProvider } from '@/lib/constants/payment';
const webhookSubscriptionService = new WebhookSubscriptionService();

const appUrl = coreConfig.APP_URL || 'https://demo.ever.works';

// Utility function to create email data with secure configuration
function createEmailData(baseData: any, emailConfig: Awaited<ReturnType<typeof getEmailConfig>>) {
	return {
		...baseData,
		companyName: emailConfig.companyName,
		companyUrl: emailConfig.companyUrl,
		supportEmail: emailConfig.supportEmail
	};
}

/**
 * @swagger
 * /api/stripe/webhook:
 *   post:
 *     tags: ["Stripe - Webhooks"]
 *     summary: "Handle Stripe webhooks"
 *     description: "Processes incoming Stripe webhook events including subscription lifecycle, payment events, and billing portal updates. Automatically handles email notifications, subscription management, and database updates. Requires valid Stripe signature for security."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: "Stripe webhook event payload"
 *             properties:
 *               id:
 *                 type: string
 *                 description: "Stripe event ID"
 *                 example: "evt_1234567890abcdef"
 *               type:
 *                 type: string
 *                 description: "Webhook event type"
 *                 enum: [
 *                   "customer.subscription.created",
 *                   "customer.subscription.updated",
 *                   "customer.subscription.deleted",
 *                   "invoice.payment_succeeded",
 *                   "invoice.payment_failed",
 *                   "payment_intent.succeeded",
 *                   "payment_intent.payment_failed",
 *                   "customer.subscription.trial_will_end",
 *                   "billing_portal.session.updated"
 *                 ]
 *                 example: "customer.subscription.created"
 *               data:
 *                 type: object
 *                 description: "Event data object"
 *                 properties:
 *                   object:
 *                     type: object
 *                     description: "The Stripe object (subscription, payment_intent, etc.)"
 *               created:
 *                 type: integer
 *                 description: "Unix timestamp of event creation"
 *                 example: 1640995200
 *               livemode:
 *                 type: boolean
 *                 description: "Whether event is from live mode"
 *                 example: false
 *             required: ["id", "type", "data", "created", "livemode"]
 *     parameters:
 *       - name: "stripe-signature"
 *         in: "header"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Stripe webhook signature for verification"
 *         example: "t=1640995200,v1=abc123def456..."
 *     responses:
 *       200:
 *         description: "Webhook processed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 received:
 *                   type: boolean
 *                   example: true
 *               required: ["received"]
 *             example:
 *               received: true
 *       400:
 *         description: "Bad request - Invalid signature or webhook processing failed"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   examples:
 *                     no_signature: "No signature provided"
 *                     not_processed: "Webhook not processed"
 *                     processing_failed: "Webhook processing failed"
 *             examples:
 *               no_signature:
 *                 summary: "Missing signature"
 *                 value:
 *                   error: "No signature provided"
 *               not_processed:
 *                 summary: "Webhook not processed"
 *                 value:
 *                   error: "Webhook not processed"
 *               processing_failed:
 *                 summary: "Processing failed"
 *                 value:
 *                   error: "Webhook processing failed"
 *     x-webhook-events:
 *       description: "Supported webhook events and their actions"
 *       events:
 *         customer.subscription.created:
 *           description: "Creates subscription record and sends welcome email"
 *           actions: ["database_update", "email_notification"]
 *         customer.subscription.updated:
 *           description: "Updates subscription record and sends update email"
 *           actions: ["database_update", "email_notification"]
 *         customer.subscription.deleted:
 *           description: "Marks subscription as cancelled and sends cancellation email"
 *           actions: ["database_update", "email_notification"]
 *         invoice.payment_succeeded:
 *           description: "Records successful payment and sends receipt email"
 *           actions: ["database_update", "email_notification"]
 *         invoice.payment_failed:
 *           description: "Records failed payment and sends retry email"
 *           actions: ["database_update", "email_notification"]
 *         payment_intent.succeeded:
 *           description: "Records successful one-time payment and sends confirmation"
 *           actions: ["database_update", "email_notification"]
 *         payment_intent.payment_failed:
 *           description: "Records failed payment and sends failure notification"
 *           actions: ["database_update", "email_notification"]
 *         customer.subscription.trial_will_end:
 *           description: "Sends trial ending notification email"
 *           actions: ["email_notification"]
 *         billing_portal.session.updated:
 *           description: "Logs billing portal session updates"
 *           actions: ["logging"]
 *     x-email-notifications:
 *       description: "Email notifications sent for different events"
 *       templates:
 *         welcome: "Sent when subscription is created"
 *         update: "Sent when subscription is updated"
 *         cancellation: "Sent when subscription is cancelled"
 *         payment_success: "Sent when payment succeeds"
 *         payment_failed: "Sent when payment fails"
 *         trial_ending: "Sent when trial is about to end"
 */
/**
 * Runs the fulfilment side-effects for one already-authenticated webhook event.
 *
 * Never throws. A false return tells the relay route to request a retry, while
 * the legacy direct route may preserve its existing acknowledgement behavior.
 */
export async function dispatchWebhookEvent(webhookResult: WebhookResult): Promise<boolean> {
	try {
		switch (webhookResult.type) {
			case WebhookEventType.SUBSCRIPTION_CREATED:
				await handleSubscriptionCreated(webhookResult.data);
				break;
			case WebhookEventType.SUBSCRIPTION_UPDATED:
				console.log('Subscription updated:', webhookResult.data);
				await handleSubscriptionUpdated(webhookResult.data);
				break;
			case WebhookEventType.SUBSCRIPTION_CANCELLED:
				await handleSubscriptionCancelled(webhookResult.data);
				break;
			case WebhookEventType.PAYMENT_SUCCEEDED:
				await handlePaymentSucceeded(webhookResult.data);
				break;
			case WebhookEventType.SUBSCRIPTION_PAYMENT_SUCCEEDED:
				await handleSubscriptionPaymentSucceeded(webhookResult.data);
				break;
			case WebhookEventType.SUBSCRIPTION_PAYMENT_FAILED:
				await handleSubscriptionPaymentFailed(webhookResult.data);
				break;
			case WebhookEventType.PAYMENT_FAILED:
				await handlePaymentFailed(webhookResult.data);
				break;
			case WebhookEventType.SUBSCRIPTION_TRIAL_ENDING:
				await handleSubscriptionTrialEnding(webhookResult.data);
				break;
			case WebhookEventType.BILLING_PORTAL_SESSION_UPDATED:
				console.log('Billing portal session updated:', webhookResult.data);
				break;
			default:
				console.log(`Unhandled webhook event: ${webhookResult.type}`);
		}
		return true;
	} catch (error) {
		console.error('Webhook fulfilment failed:', error);
		return false;
	}
}

async function handlePaymentSucceeded(data: any) {
	try {
		const emailConfig = await getEmailConfig();
		const baseEmailData = buildPaymentSucceededBaseEmailData(data);

		const emailData = createEmailData(baseEmailData, emailConfig);

		// Send confirmation email
		const emailResult = await paymentEmailService.sendPaymentSuccessEmail(emailData);

		if (emailResult.success) {
			console.log('✅ Payment success email sent successfully');
		} else {
			console.error('❌ Failed to send payment success email:', emailResult.error);
			assertRelayFulfilment(false, 'payment success email');
		}
	} catch (error) {
		console.error('❌ Error handling payment succeeded:', error);
		throw error;
	}
}

async function handlePaymentFailed(data: any) {
	console.log('Payment failed:', data.id);

	try {
		// Get secure email configuration
		const emailConfig = await getEmailConfig();

		// Extract customer information
		const customerInfo = extractCustomerInfo(data);

		// Extract payment information
		const amount = formatAmount(data.amount, data.currency);
		const paymentMethod = formatPaymentMethod(data.payment_method);

		// Prepare email data
		const baseEmailData = {
			customerName: customerInfo.customerName,
			customerEmail: customerInfo.customerEmail,
			amount: amount,
			currency: data.currency,
			paymentMethod: paymentMethod,
			transactionId: data.id,
			errorMessage: data.last_payment_error?.message || 'Payment declined',
			retryUrl: `${appUrl || ''}/payment/retry?payment_intent=${data.id}`,
			updatePaymentUrl: `${appUrl || ''}/settings/payment-methods`
		};

		const emailData = createEmailData(baseEmailData, emailConfig);

		// Send failure email
		const emailResult = await paymentEmailService.sendPaymentFailedEmail(emailData);

		if (emailResult.success) {
			console.log('✅ Payment failed email sent successfully');
		} else {
			console.error('❌ Failed to send payment failed email:', emailResult.error);
			assertRelayFulfilment(false, 'payment failed email');
		}
	} catch (error) {
		console.error('❌ Error handling payment failed:', error);
		throw error;
	}
}

async function handleSubscriptionCreated(data: any) {
	console.log('Subscription created:', data.id);

	// Check if this is a sponsor ad subscription
	if (isSponsorAdSubscription(data)) {
		console.log('📢 Sponsor ad subscription detected');
		await handleSponsorAdActivation(data);
		return;
	}

	try {
		await webhookSubscriptionService.handleSubscriptionCreated(data);

		const customerInfo = extractCustomerInfo(data);

		// Extract subscription information
		const priceId = data.items?.data?.[0]?.price?.id;
		const planName = getPlanName(priceId) || 'Premium Plan';
		const amount = formatAmount(data.items?.data?.[0]?.price?.unit_amount || 0, data.currency);
		const billingPeriod = getBillingPeriod(data.items?.data?.[0]?.price?.recurring?.interval);
		const emailConfig = await getEmailConfig();

		// Prepare email data
		const emailData = {
			customerName: customerInfo.customerName,
			customerEmail: customerInfo.customerEmail,
			planName: planName,
			amount: amount,
			currency: data.currency,
			billingPeriod: billingPeriod,
			nextBillingDate: data.current_period_end ? formatBillingDate(data.current_period_end) : undefined,
			subscriptionId: data.id,
			manageSubscriptionUrl: `${appUrl || ''}/settings/subscription`,
			companyName: emailConfig?.companyName,
			companyUrl: emailConfig?.companyUrl,
			supportEmail: globalEmailConfig.EMAIL_SUPPORT || 'support@ever.works',
			features: getSubscriptionFeatures(planName)
		};

		// Send welcome email
		const emailResult = await paymentEmailService.sendNewSubscriptionEmail(emailData);

		if (emailResult.success) {
			console.log('✅ New subscription email sent successfully');
		} else {
			console.error('❌ Failed to send new subscription email:', emailResult.error);
			assertRelayFulfilment(false, 'new subscription email');
		}
	} catch (error) {
		console.error('❌ Error handling subscription created:', error);
		throw error;
	}
}

async function handleSubscriptionUpdated(data: any) {
	console.log('Subscription updated:', data.id);

	try {
		await webhookSubscriptionService.handleSubscriptionUpdated(data);

		// Extract customer information
		const customerInfo = extractCustomerInfo(data);

		// Extract subscription information
		const priceId = data.items?.data?.[0]?.price?.id;
		const planName = getPlanName(priceId) || 'Premium Plan';
		const amount = formatAmount(data.items?.data?.[0]?.price?.unit_amount || 0, data.currency);
		const billingPeriod = getBillingPeriod(data.items?.data?.[0]?.price?.recurring?.interval);

		// Prepare email data
		const emailData = {
			customerName: customerInfo.customerName,
			customerEmail: customerInfo.customerEmail,
			planName: planName,
			amount: amount,
			currency: data.currency,
			billingPeriod: billingPeriod,
			nextBillingDate: data.current_period_end ? formatBillingDate(data.current_period_end) : undefined,
			subscriptionId: data.id,
			manageSubscriptionUrl: `${appUrl || ''}/settings/subscription`,
			companyName: 'Ever Works',
			companyUrl: coreConfig.SITE_URL || 'https://ever.works',
			supportEmail: globalEmailConfig.EMAIL_SUPPORT || 'support@ever.works',
			features: getSubscriptionFeatures(planName)
		};

		// Send update email
		const emailResult = await paymentEmailService.sendUpdatedSubscriptionEmail(emailData);

		if (emailResult.success) {
			console.log('✅ Updated subscription email sent successfully');
		} else {
			console.error('❌ Failed to send updated subscription email:', emailResult.error);
			assertRelayFulfilment(false, 'updated subscription email');
		}
	} catch (error) {
		console.error('❌ Error handling subscription updated:', error);
		throw error;
	}
}

async function handleSubscriptionCancelled(data: any) {
	console.log('Subscription cancelled:', data.id);

	// Check if this is a sponsor ad subscription
	if (isSponsorAdSubscription(data)) {
		console.log('📢 Sponsor ad subscription cancellation detected');
		await handleSponsorAdCancellation(data);
		return;
	}

	try {
		await webhookSubscriptionService.handleSubscriptionCancelled(data);
		const customerInfo = extractCustomerInfo(data);
		const priceId = data.items?.data?.[0]?.price?.id;
		const planName = getPlanName(priceId) || 'Premium Plan';
		const amount = formatAmount(data.items?.data?.[0]?.price?.unit_amount || 0, data.currency);
		const billingPeriod = getBillingPeriod(data.items?.data?.[0]?.price?.recurring?.interval);

		// Prepare email data
		const emailData = {
			customerName: customerInfo.customerName,
			customerEmail: customerInfo.customerEmail,
			planName: planName,
			amount: amount,
			currency: data.currency,
			billingPeriod: billingPeriod,
			subscriptionId: data.id,
			cancellationDate: data.canceled_at ? formatBillingDate(data.canceled_at) : undefined,
			cancellationReason: data.cancellation_details?.reason || 'Cancellation requested by user',
			reactivateUrl: `${appUrl || ''}/subscription/reactivate?subscription=${data.id}`,
			companyName: 'Ever Works',
			companyUrl: coreConfig.SITE_URL || 'https://ever.works',
			supportEmail: globalEmailConfig.EMAIL_SUPPORT || 'support@ever.works'
		};

		// Send cancellation email
		const emailResult = await paymentEmailService.sendCancelledSubscriptionEmail(emailData);

		if (emailResult.success) {
			console.log('✅ Cancelled subscription email sent successfully');
		} else {
			console.error('❌ Failed to send cancelled subscription email:', emailResult.error);
			assertRelayFulfilment(false, 'cancelled subscription email');
		}
	} catch (error) {
		console.error('❌ Error handling subscription cancelled:', error);
		throw error;
	}
}

async function handleSubscriptionPaymentSucceeded(data: any) {
	console.log('Subscription payment succeeded:', data.id);

	// Check if this is a sponsor ad subscription (for renewals)
	if (isSponsorAdSubscription(data)) {
		console.log('📢 Sponsor ad payment succeeded (renewal)');
		await handleSponsorAdRenewal(data);
		return;
	}

	try {
		await webhookSubscriptionService.handleSubscriptionPaymentSucceeded(data);
		// Extract customer information
		const customerInfo = extractCustomerInfo(data);

		// Extract payment information
		const amount = formatAmount(data.amount_paid, data.currency);
		const subscription = data.subscription;
		const planName = subscription
			? getPlanName(subscription.items?.data?.[0]?.price?.id) || 'Premium Plan'
			: 'Premium Plan';
		const billingPeriod = subscription
			? getBillingPeriod(subscription.items?.data?.[0]?.price?.recurring?.interval)
			: 'month';

		// Prepare email data
		const emailData = {
			customerName: customerInfo.customerName,
			customerEmail: customerInfo.customerEmail,
			amount: amount,
			currency: data.currency,
			paymentMethod: 'Credit Card',
			transactionId: data.id,
			planName: planName,
			billingPeriod: billingPeriod,
			nextBillingDate: subscription?.current_period_end
				? formatBillingDate(subscription.current_period_end)
				: undefined,
			receiptUrl: data.receipt_url,
			companyName: 'Ever Works',
			companyUrl: coreConfig.SITE_URL || 'https://ever.works',
			supportEmail: globalEmailConfig.EMAIL_SUPPORT || 'support@ever.works'
		};

		// Send confirmation email
		const emailResult = await paymentEmailService.sendSubscriptionPaymentSuccessEmail(emailData);

		if (emailResult.success) {
			console.log('✅ Subscription payment success email sent successfully');
		} else {
			console.error('❌ Failed to send subscription payment success email:', emailResult.error);
			assertRelayFulfilment(false, 'subscription payment success email');
		}
	} catch (error) {
		console.error('❌ Error handling subscription payment succeeded:', error);
		throw error;
	}
}

/**
 * Read one property off an unverified webhook payload.
 *
 * The payload arrives as JSON over the wire, so its shape is a claim, not a fact —
 * `unknown` plus these two guards keeps the Spec 046 extraction below honest
 * without an `any` (AGENTS.md §4) and without pulling a Stripe payload type into
 * a file that also serves the platform relay.
 */
function readField(source: unknown, key: string): unknown {
	return source && typeof source === 'object' ? (source as Record<string, unknown>)[key] : undefined;
}

/** A Stripe reference field is either a bare id or an object Stripe expanded. */
function readReferenceId(value: unknown): string | null {
	if (typeof value === 'string' && value) return value;

	const id = readField(value, 'id');
	return typeof id === 'string' && id ? id : null;
}

/**
 * Read the provider's own subscription id off a failed-invoice payload (Spec 046).
 *
 * Stripe moved the reference from `invoice.subscription` to
 * `invoice.parent.subscription_details.subscription` in the 2025 API versions and
 * both shapes reach this app depending on the account's pinned version, so both
 * are accepted. Each may be a bare id or an expanded object.
 */
function extractProviderSubscriptionId(data: unknown): string | null {
	const parentDetails = readField(readField(data, 'parent'), 'subscription_details');
	const candidates = [readField(data, 'subscription'), readField(parentDetails, 'subscription')];

	for (const candidate of candidates) {
		const id = readReferenceId(candidate);
		if (id) return id;
	}

	return null;
}

/**
 * Read the reference a refund would target off a failed-invoice payload (Spec 046).
 *
 * The invoice's `payment_intent` is what a refund actually needs — the template's
 * Stripe adapter passes whatever it is given as `payment_intent` to
 * `refunds.create`. The invoice's `charge` is deliberately NOT used as a fallback:
 * it is a `ch_…` id, and handing it to the adapter would produce a refund call
 * that always fails while looking like a valid reference to the admin. The invoice
 * id is the honest fallback — it records something traceable, and the refund
 * dialog lets an admin paste the real reference before confirming.
 */
function extractProviderPaymentId(data: unknown): string | null {
	const intent = readReferenceId(readField(data, 'payment_intent'));
	if (intent) return intent;

	const invoiceId = readField(data, 'id');
	return typeof invoiceId === 'string' && invoiceId ? invoiceId : null;
}

async function handleSubscriptionPaymentFailed(data: any) {
	console.log('Subscription payment failed:', data.id);

	try {
		await webhookSubscriptionService.handleSubscriptionPaymentFailed(data);

		// Spec 046: surface the failure in the admin Billing Issues queue as well as
		// in the customer email. Best-effort by design — see the helper's contract.
		//
		// `data` here is the Stripe invoice. Its subscription reference moved between
		// API versions (`invoice.subscription` on older ones, `invoice.parent
		// .subscription_details.subscription` on 2025+), so both shapes are read; a
		// miss simply means no issue is opened and the next re-scan picks it up.
		// The refund target is the invoice's payment intent when Stripe expanded one
		// — `refunds.create` takes a payment intent, not an invoice id — falling back
		// to the invoice id, which an admin can correct before refunding.
		await openBillingIssueFromFailedPaymentWebhook({
			providerSubscriptionId: extractProviderSubscriptionId(data),
			paymentProvider: PaymentProvider.STRIPE,
			providerPaymentId: extractProviderPaymentId(data),
			amount: typeof data.amount_due === 'number' ? data.amount_due : null,
			currency: data.currency ?? null,
			reason: data.last_payment_error?.message
				? `Payment failed: ${data.last_payment_error.message}`
				: 'Subscription payment failed (provider webhook)'
		});

		const customerInfo = extractCustomerInfo(data);

		// Extract payment information
		const amount = formatAmount(data.amount_due, data.currency);
		const subscription = data.subscription;
		const planName = subscription
			? getPlanName(subscription.items?.data?.[0]?.price?.id) || 'Premium Plan'
			: 'Premium Plan';
		const billingPeriod = subscription
			? getBillingPeriod(subscription.items?.data?.[0]?.price?.recurring?.interval)
			: 'month';

		// Prepare email data
		const emailData = {
			customerName: customerInfo.customerName,
			customerEmail: customerInfo.customerEmail,
			amount: amount,
			currency: data.currency,
			paymentMethod: 'Credit Card',
			transactionId: data.id,
			planName: planName,
			billingPeriod: billingPeriod,
			errorMessage: data.last_payment_error?.message || 'Payment declined',
			retryUrl: `${appUrl || ''}/subscription/retry?invoice=${data.id}`,
			updatePaymentUrl: `${appUrl || ''}/settings/payment-methods`,
			companyName: 'Ever Works',
			companyUrl: coreConfig.SITE_URL || 'https://ever.works',
			supportEmail: globalEmailConfig.EMAIL_SUPPORT || 'support@ever.works'
		};

		// Send failure email
		const emailResult = await paymentEmailService.sendSubscriptionPaymentFailedEmail(emailData);

		if (emailResult.success) {
			console.log('✅ Subscription payment failed email sent successfully');
		} else {
			console.error('❌ Failed to send subscription payment failed email:', emailResult.error);
			assertRelayFulfilment(false, 'subscription payment failed email');
		}
	} catch (error) {
		console.error('❌ Error handling subscription payment failed:', error);
		throw error;
	}
}

async function handleSubscriptionTrialEnding(data: any) {
	console.log('Subscription trial ending:', data.id);

	try {
		await webhookSubscriptionService.handleSubscriptionTrialEnding(data);

		// Extract customer information
		const customerInfo = extractCustomerInfo(data);

		// Extract subscription information
		const priceId = data.items?.data?.[0]?.price?.id;
		const planName = getPlanName(priceId) || 'Premium Plan';
		const amount = formatAmount(data.items?.data?.[0]?.price?.unit_amount || 0, data.currency);
		const billingPeriod = getBillingPeriod(data.items?.data?.[0]?.price?.recurring?.interval);

		// Prepare email data (uses updated subscription template)
		const emailData = {
			customerName: customerInfo.customerName,
			customerEmail: customerInfo.customerEmail,
			planName: planName,
			amount: amount,
			currency: data.currency,
			billingPeriod: billingPeriod,
			nextBillingDate: data.current_period_end ? formatBillingDate(data.current_period_end) : undefined,
			subscriptionId: data.id,
			manageSubscriptionUrl: `${appUrl || ''}/settings/subscription`,
			companyName: 'Ever Works',
			companyUrl: coreConfig.SITE_URL || 'https://ever.works',
			supportEmail: globalEmailConfig.EMAIL_SUPPORT || 'support@ever.works'
		};

		// Send trial ending notification email
		const emailResult = await paymentEmailService.sendUpdatedSubscriptionEmail(emailData);

		if (emailResult.success) {
			console.log('✅ Trial ending email sent successfully');
		} else {
			console.error('❌ Failed to send trial ending email:', emailResult.error);
			assertRelayFulfilment(false, 'trial ending email');
		}
	} catch (error) {
		console.error('❌ Error handling subscription trial ending:', error);
		throw error;
	}
}

/**
 * Get subscription features for a plan
 */
function getSubscriptionFeatures(planName: string): string[] {
	const features: Record<string, string[]> = {
		'Free Plan': ['Access to basic features', 'Email support', 'Limited storage'],
		'Standard Plan': [
			'All advanced features',
			'Priority support',
			'Unlimited storage',
			'Third-party integrations',
			'Advanced analytics'
		],
		'Premium Plan': [
			'All Pro features',
			'Dedicated support',
			'Custom features',
			'Full API integration',
			'Custom training'
		]
	};

	return features[planName] || features['Standard Plan'];
}

// ######################### Sponsor Ad Webhook Handlers #########################

/**
 * Check if subscription metadata indicates a sponsor ad
 * Handles both checkout.session.completed (subscription_data) and invoice.payment_succeeded (subscription) events
 */
function isSponsorAdSubscription(data: Record<string, unknown>): boolean {
	const metadata = data.metadata as Record<string, string> | undefined;
	const subscriptionDataMetadata = (data.subscription_data as Record<string, unknown>)?.metadata as
		| Record<string, string>
		| undefined;
	const subscriptionMetadata = (data.subscription as Record<string, unknown>)?.metadata as
		| Record<string, string>
		| undefined;

	return (
		metadata?.type === 'sponsor_ad' ||
		subscriptionDataMetadata?.type === 'sponsor_ad' ||
		subscriptionMetadata?.type === 'sponsor_ad'
	);
}

/**
 * Get sponsor ad ID from subscription metadata
 * Handles both checkout.session.completed (subscription_data) and invoice.payment_succeeded (subscription) events
 */
function getSponsorAdId(data: Record<string, unknown>): string | null {
	const metadata = data.metadata as Record<string, string> | undefined;
	const subscriptionDataMetadata = (data.subscription_data as Record<string, unknown>)?.metadata as
		| Record<string, string>
		| undefined;
	const subscriptionMetadata = (data.subscription as Record<string, unknown>)?.metadata as
		| Record<string, string>
		| undefined;

	return metadata?.sponsorAdId || subscriptionDataMetadata?.sponsorAdId || subscriptionMetadata?.sponsorAdId || null;
}

/**
 * Handle sponsor ad subscription created/payment succeeded
 * Activates the sponsor ad after successful payment
 */
async function handleSponsorAdActivation(data: Record<string, unknown>): Promise<void> {
	const sponsorAdId = getSponsorAdId(data);

	if (!sponsorAdId) {
		console.error('❌ Sponsor ad ID not found in subscription metadata');
		throw new Error('sponsor ad activation metadata missing');
	}

	try {
		const subscriptionId = data.id as string;
		const customerId = data.customer as string;

		console.log(`🔄 Confirming payment for sponsor ad: ${sponsorAdId}`);

		const confirmedAd = await sponsorAdService.confirmPayment(sponsorAdId, subscriptionId, customerId);

		if (confirmedAd) {
			console.log(`✅ Sponsor ad payment confirmed, now pending admin review: ${sponsorAdId}`);
		} else {
			console.error(`❌ Failed to confirm sponsor ad payment: ${sponsorAdId}`);
			assertRelayFulfilment(false, 'sponsor ad activation');
		}
	} catch (error) {
		console.error('❌ Error activating sponsor ad:', error);
		throw error;
	}
}

/**
 * Handle sponsor ad subscription cancelled
 * Cancels the sponsor ad
 */
async function handleSponsorAdCancellation(data: Record<string, unknown>): Promise<void> {
	const sponsorAdId = getSponsorAdId(data);

	if (!sponsorAdId) {
		console.error('❌ Sponsor ad ID not found in subscription metadata');
		throw new Error('sponsor ad cancellation metadata missing');
	}

	try {
		console.log(`🔄 Cancelling sponsor ad: ${sponsorAdId}`);

		const cancelledAd = await sponsorAdService.cancelSponsorAd(sponsorAdId, 'Subscription cancelled');

		if (cancelledAd) {
			console.log(`✅ Sponsor ad cancelled successfully: ${sponsorAdId}`);
		} else {
			console.error(`❌ Failed to cancel sponsor ad: ${sponsorAdId}`);
			assertRelayFulfilment(false, 'sponsor ad cancellation');
		}
	} catch (error) {
		console.error('❌ Error cancelling sponsor ad:', error);
		throw error;
	}
}

/**
 * Handle sponsor ad subscription renewal
 * Extends the sponsor ad end date
 */
async function handleSponsorAdRenewal(data: Record<string, unknown>): Promise<void> {
	const sponsorAdId = getSponsorAdId(data);

	if (!sponsorAdId) {
		console.error('❌ Sponsor ad ID not found in subscription metadata');
		throw new Error('sponsor ad renewal metadata missing');
	}

	try {
		console.log(`🔄 Renewing sponsor ad: ${sponsorAdId}`);

		const renewedAd = await sponsorAdService.renewSponsorAd(sponsorAdId);

		if (renewedAd) {
			console.log(`✅ Sponsor ad renewed successfully: ${sponsorAdId}`);
		} else {
			console.error(`❌ Failed to renew sponsor ad: ${sponsorAdId}`);
			assertRelayFulfilment(false, 'sponsor ad renewal');
		}
	} catch (error) {
		console.error('❌ Error renewing sponsor ad:', error);
		throw error;
	}
}
