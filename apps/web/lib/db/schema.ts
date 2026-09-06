import {
	boolean,
	timestamp,
	pgTable,
	text,
	primaryKey,
	integer,
	serial,
	varchar,
	uniqueIndex,
	index,
	jsonb,
	check,
	doublePrecision
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import type { AdapterAccountType } from 'next-auth/adapters';
import { PaymentPlan, PaymentProvider } from '../constants/payment';

export const tenant = pgTable(
	'tenant',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		name: text('name').notNull(),
		website: text('website'),
		domain: text('domain'),
		slug: text('slug'),
		status: text('status', { enum: ['active', 'inactive'] })
			.notNull()
			.default('active'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow()
	},
	(table) => ({
		nameIndex: index('tenant_name_idx').on(table.name),
		statusIndex: index('tenant_status_idx').on(table.status),
		domainUniqueIndex: uniqueIndex('tenant_domain_unique_idx').on(table.domain),
		slugUniqueIndex: uniqueIndex('tenant_slug_unique_idx').on(table.slug)
	})
);

export const users = pgTable(
	'users',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		email: text('email').unique(),
		tenantId: text('tenant_id').references(() => tenant.id, { onDelete: 'cascade' }),
		image: text('image'),
		emailVerified: timestamp('emailVerified', { mode: 'date' }),
		passwordHash: text('password_hash'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow(),
		deletedAt: timestamp('deleted_at'),
		deactivatedAt: timestamp('deactivated_at')
	},
	(table) => ({
		createdAtIndex: index('users_created_at_idx').on(table.createdAt),
		tenantIdIdx: index('users_tenant_id_idx').on(table.tenantId)
	})
);

export const roles = pgTable(
	'roles',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull().unique(),
		tenantId: text('tenant_id').references(() => tenant.id, { onDelete: 'cascade' }),
		description: text('description'),
		isAdmin: boolean('is_admin').notNull().default(false),
		status: text('status', { enum: ['active', 'inactive'] }).default('active'),
		created_by: text('created_by').default('system'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow(),
		deletedAt: timestamp('deleted_at')
	},
	(table) => ({
		statusIndex: index('roles_status_idx').on(table.status),
		isAdminIndex: index('roles_is_admin_idx').on(table.isAdmin),
		createdAtIndex: index('roles_created_at_idx').on(table.createdAt),
		tenantIdIdx: index('roles_tenant_id_idx').on(table.tenantId)
	})
);

// ######################### Permissions Schema #########################
export const permissions = pgTable(
	'permissions',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		key: text('key').notNull().unique(),
		description: text('description'),
		tenantId: text('tenant_id').references(() => tenant.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow()
	},
	(table) => ({
		createdAtIndex: index('permissions_created_at_idx').on(table.createdAt),
		tenantIdIdx: index('permissions_tenant_id_idx').on(table.tenantId)
	})
);

// ######################### Role Permissions Schema #########################
export const rolePermissions = pgTable(
	'role_permissions',
	{
		roleId: text('role_id')
			.notNull()
			.references(() => roles.id, { onDelete: 'cascade' }),
		permissionId: text('permission_id')
			.notNull()
			.references(() => permissions.id, { onDelete: 'cascade' }),
		tenantId: text('tenant_id').references(() => tenant.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').notNull().defaultNow()
	},
	(table) => ({
		rolePermissionPk: primaryKey({ columns: [table.roleId, table.permissionId] }),
		roleIndex: index('role_permissions_role_idx').on(table.roleId),
		permissionIndex: index('role_permissions_permission_idx').on(table.permissionId),
		createdAtIndex: index('role_permissions_created_at_idx').on(table.createdAt),
		tenantIdIdx: index('role_permissions_tenant_id_idx').on(table.tenantId)
	})
);

// ######################### User Roles Schema #########################
export const userRoles = pgTable(
	'user_roles',
	{
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		roleId: text('role_id')
			.notNull()
			.references(() => roles.id, { onDelete: 'cascade' }),
		tenantId: text('tenant_id').references(() => tenant.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').notNull().defaultNow()
	},
	(table) => ({
		userRolePk: primaryKey({ columns: [table.userId, table.roleId] }),
		userIndex: index('user_roles_user_idx').on(table.userId),
		roleIndex: index('user_roles_role_idx').on(table.roleId),
		createdAtIndex: index('user_roles_created_at_idx').on(table.createdAt),
		tenantIdIdx: index('user_roles_tenant_id_idx').on(table.tenantId)
	})
);

export const accounts = pgTable(
	'accounts',
	{
		userId: text('userId')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }), // References users.id
		type: text('type').$type<AdapterAccountType>().notNull(),
		provider: text('provider').notNull(),
		providerAccountId: text('providerAccountId').notNull(),
		tenantId: text('tenant_id').references(() => tenant.id, { onDelete: 'cascade' }),
		// Client authentication fields
		email: text('email'),
		passwordHash: text('password_hash'),
		// OAuth fields
		refresh_token: text('refresh_token'),
		access_token: text('access_token'),
		expires_at: integer('expires_at'),
		token_type: text('token_type'),
		scope: text('scope'),
		id_token: text('id_token'),
		session_state: text('session_state')
	},
	(account) => [
		{
			compoundKey: primaryKey({
				columns: [account.provider, account.providerAccountId]
			})
		},
		index('accounts_email_idx').on(account.email),
		// Performance index for provider lookups
		index('accounts_provider_idx').on(account.provider),
		index('accounts_tenant_id_idx').on(account.tenantId)
	]
);

// ######################### Client Profiles Schema #########################
export const clientProfiles = pgTable(
	'client_profiles',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('userId')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		email: text('email').notNull(),
		tenantId: text('tenant_id').references(() => tenant.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		displayName: text('display_name'),
		username: text('username').unique(),
		bio: text('bio'),
		jobTitle: text('job_title'),
		company: text('company'),
		industry: text('industry'),
		phone: text('phone'),
		website: text('website'),
		location: text('location'),
		avatar: text('avatar'),
		coverColor: text('cover_color'),
		interests: text('interests'),
		skills: jsonb('skills').$type<Array<{ name: string; category: string; proficiency: number }>>(),
		accountType: text('account_type', {
			enum: ['individual', 'business', 'enterprise']
		}).default('individual'),
		status: text('status', {
			enum: ['active', 'inactive', 'suspended', 'banned', 'trial']
		}).default('active'),
		plan: text('plan', {
			enum: ['free', 'standard', 'premium']
		}).default('free'),
		timezone: text('timezone').default('UTC'),
		language: text('language').default('en'),
		country: text('country'),
		currency: text('currency').default('USD'),
		// Location preferences (for "Near Me" fallback)
		defaultLatitude: doublePrecision('default_latitude'),
		defaultLongitude: doublePrecision('default_longitude'),
		defaultCity: text('default_city'),
		defaultCountry: text('default_country'),
		locationPrivacy: text('location_privacy').default('private'),
		// Profile visibility — controls whether the public `/client/profile/<username>`
		// page is reachable by other users. Owner always sees their own profile.
		profileVisibility: text('profile_visibility', {
			enum: ['public', 'private']
		})
			.notNull()
			.default('public'),
		twoFactorEnabled: boolean('two_factor_enabled').default(false),
		// Rolling counter of consecutive failed 2FA code verifications. Survives
		// code rotation (a resend does NOT reset it) so an attacker cannot clear
		// the brute-force budget by asking for a fresh code. Reset to 0 on a
		// successful verification and when an expired lock is observed.
		twoFactorFailedAttempts: integer('two_factor_failed_attempts').default(0),
		// When set and in the future, 2FA code validation is refused outright.
		twoFactorLockedUntil: timestamp('two_factor_locked_until', { mode: 'date' }),
		emailVerified: boolean('email_verified').default(false),
		totalSubmissions: integer('total_submissions').default(0),
		notes: text('notes'),
		tags: text('tags'),
		// Moderation fields
		warningCount: integer('warning_count').default(0),
		suspendedAt: timestamp('suspended_at', { mode: 'date', withTimezone: true }),
		bannedAt: timestamp('banned_at', { mode: 'date', withTimezone: true }),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow()
	},
	(clientProfile) => [
		uniqueIndex('client_profile_user_id_unique_idx').on(clientProfile.userId),
		index('client_profile_email_idx').on(clientProfile.email),
		index('client_profile_status_idx').on(clientProfile.status),
		index('client_profile_plan_idx').on(clientProfile.plan),
		index('client_profile_account_type_idx').on(clientProfile.accountType),
		index('client_profile_username_idx').on(clientProfile.username),
		index('client_profile_created_at_idx').on(clientProfile.createdAt),
		index('client_profile_tenant_id_idx').on(clientProfile.tenantId)
	]
);

// ######################### Portfolio Projects Schema #########################
export const portfolioProjects = pgTable(
	'portfolio_projects',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		clientProfileId: text('client_profile_id')
			.notNull()
			.references(() => clientProfiles.id, { onDelete: 'cascade' }),
		tenantId: text('tenant_id')
			.notNull()
			.references(() => tenant.id, { onDelete: 'cascade' }),
		title: text('title').notNull(),
		description: text('description').notNull(),
		imageUrl: text('image_url').notNull(),
		externalUrl: text('external_url').notNull(),
		tags: jsonb('tags').$type<string[]>().default(sql`'[]'::jsonb`),
		isFeatured: boolean('is_featured').default(false),
		position: integer('position').default(0),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow()
	},
	(project) => [
		index('portfolio_projects_client_profile_id_idx').on(project.clientProfileId),
		index('portfolio_projects_tenant_id_idx').on(project.tenantId),
		index('portfolio_projects_is_featured_idx').on(project.isFeatured)
	]
);

// ######################### User Follows Schema #########################
export const userFollows = pgTable(
	'user_follows',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		followerId: text('follower_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		followingId: text('following_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		tenantId: text('tenant_id')
			.notNull()
			.references(() => tenant.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').notNull().defaultNow()
	},
	(follow) => [
		uniqueIndex('user_follows_unique_idx').on(follow.followerId, follow.followingId, follow.tenantId),
		index('user_follows_follower_id_idx').on(follow.followerId),
		index('user_follows_following_id_idx').on(follow.followingId),
		index('user_follows_tenant_id_idx').on(follow.tenantId),
		check('user_follows_no_self_follow', sql`${follow.followerId} <> ${follow.followingId}`)
	]
);

export const sessions = pgTable('sessions', {
	sessionToken: text('sessionToken').primaryKey(),
	userId: text('userId')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expires: timestamp('expires', { mode: 'date' }).notNull(),
	tenantId: text('tenant_id').references(() => tenant.id, { onDelete: 'cascade' })
});

export const verificationTokens = pgTable(
	'verificationTokens',
	{
		identifier: text('identifier').notNull(),
		email: text('email').notNull(),
		token: text('token').notNull(),
		tenantId: text('tenant_id').references(() => tenant.id, { onDelete: 'cascade' }),
		expires: timestamp('expires', { mode: 'date' }).notNull()
	},
	(table) => [
		{
			compositePK: primaryKey({
				columns: [table.identifier, table.token]
			})
		}
	]
);

export const authenticators = pgTable(
	'authenticators',
	{
		credentialID: text('credentialID').notNull().unique(),
		userId: text('userId')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		providerAccountId: text('providerAccountId').notNull(),
		credentialPublicKey: text('credentialPublicKey').notNull(),
		counter: integer('counter').notNull(),
		credentialDeviceType: text('credentialDeviceType').notNull(),
		credentialBackedUp: boolean('credentialBackedUp').notNull(),
		transports: text('transports'),
		tenantId: text('tenant_id').references(() => tenant.id, { onDelete: 'cascade' })
	},
	(authenticator) => [
		{
			compositePK: primaryKey({
				columns: [authenticator.userId, authenticator.credentialID]
			})
		},
		index('authenticators_tenant_id_idx').on(authenticator.tenantId)
	]
);

export const activityLogs = pgTable(
	'activityLogs',
	{
		id: serial('id').primaryKey(),
		userId: text('userId').references(() => users.id, { onDelete: 'cascade' }), // For user activities
		clientId: text('clientId').references(() => clientProfiles.id, { onDelete: 'cascade' }), // For client activities
		action: text('action').notNull(),
		timestamp: timestamp('timestamp').notNull().defaultNow(),
		ipAddress: varchar('ip_address', { length: 45 }),
		tenantId: text('tenant_id').references(() => tenant.id, { onDelete: 'cascade' })
	},
	(table) => [
		index('activity_logs_user_idx').on(table.userId),
		index('activity_logs_timestamp_idx').on(table.timestamp),
		index('activity_logs_action_idx').on(table.action),
		index('activity_logs_tenant_id_idx').on(table.tenantId)
	]
);

export const passwordResetTokens = pgTable('passwordResetTokens', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	email: text('email').notNull(),
	token: text('token').notNull().unique(),
	expires: timestamp('expires', { mode: 'date' }).notNull(),
	tenantId: text('tenant_id').references(() => tenant.id, { onDelete: 'cascade' })
}, (table) => [
	index('password_reset_tokens_tenant_id_idx').on(table.tenantId)
]);

/**
 * One-time email 2FA login codes (spec 047).
 *
 * **Only a hash of the code is stored** (`codeHash`, hex HMAC-SHA256 of
 * the plaintext under a server-only key). The plaintext exists solely
 * inside the request that mints it and inside the email that carries it,
 * and the key lives in the environment rather than the database — so a
 * dump alone never yields a usable code, even though the six-digit space
 * would be trivial to reverse against a bare digest. Verification
 * re-hashes the submitted code and compares the two digests in constant
 * time.
 *
 * Rotate-on-issue, like `verificationTokens` / `passwordResetTokens`:
 * issuing a code deletes every earlier unconsumed code for that user, so
 * at most one code is live at any moment and the newest email is always
 * the valid one.
 *
 * `attempts` counts failed verifications against THIS code. The
 * user-level brute-force budget lives on
 * `clientProfiles.twoFactorFailedAttempts` / `twoFactorLockedUntil`
 * because it must survive code rotation.
 */
export const twoFactorCodes = pgTable(
	'twoFactorCodes',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('userId')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		email: text('email').notNull(),
		// Hex HMAC-SHA256 digest of the 6-digit code, keyed by AUTH_SECRET (or
		// TWO_FACTOR_CODE_SECRET). Never the code itself, and not reversible
		// without that key.
		codeHash: text('code_hash').notNull(),
		expires: timestamp('expires', { mode: 'date' }).notNull(),
		attempts: integer('attempts').notNull().default(0),
		consumedAt: timestamp('consumed_at', { mode: 'date' }),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		tenantId: text('tenant_id').references(() => tenant.id, { onDelete: 'cascade' })
	},
	(table) => [
		index('two_factor_codes_user_id_idx').on(table.userId),
		index('two_factor_codes_expires_idx').on(table.expires),
		index('two_factor_codes_tenant_id_idx').on(table.tenantId),
		// "At most one live code per user" is not a convention here, it is the
		// invariant the whole verification path is written against:
		// `verifyTwoFactorCode` reads the NEWEST row with `consumed_at IS NULL`
		// and treats it as *the* code, so a second unconsumed row would leave a
		// stale code silently valid behind the one the user was just emailed.
		// `issueTwoFactorCode` upholds it by marking earlier rows consumed inside
		// a transaction guarded by a per-user advisory lock — but that is a
		// property of one function, and this is the same statement made where it
		// cannot be bypassed: any future insert that forgets the rotation, or a
		// race the lock does not cover, fails loudly instead of quietly leaving
		// two codes alive. PARTIAL, so consumed rows (kept because the issuance
		// budget counts them) stay unconstrained.
		uniqueIndex('two_factor_codes_active_user_idx')
			.on(table.userId)
			.where(sql`consumed_at IS NULL`)
	]
);

export const newsletterSubscriptions = pgTable('newsletterSubscriptions', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	email: text('email').notNull().unique(),
	// NOTE: Column name is "is_active" in database (from migration 0000)
	// Do not change to "is_subscribed" until migration is updated and deployed
	isActive: boolean('is_active').notNull().default(true),
	subscribedAt: timestamp('subscribed_at').notNull().defaultNow(),
	unsubscribedAt: timestamp('unsubscribed_at'),
	lastEmailSent: timestamp('last_email_sent'),
	source: text('source').default('footer'), // footer, popup, etc.
	tenantId: text('tenant_id').references(() => tenant.id, { onDelete: 'cascade' })
}, (table) => [
	index('newsletter_subscriptions_tenant_id_idx').on(table.tenantId)
]);

// ######################### Comment Schema #########################
export const comments = pgTable('comments', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	content: text('content').notNull(),
	userId: text('userId')
		.notNull()
		.references(() => clientProfiles.id, { onDelete: 'cascade' }),
	itemId: text('itemId').notNull(),
	rating: integer('rating').notNull().default(0),
	createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
	editedAt: timestamp('edited_at', { mode: 'date', withTimezone: true }),
	deletedAt: timestamp('deleted_at', { mode: 'date', withTimezone: true }),
	tenantId: text('tenant_id').references(() => tenant.id, { onDelete: 'cascade' })
}, (table) => [
	index('comments_tenant_id_idx').on(table.tenantId)
]);

export const VoteType = {
	UPVOTE: 'upvote',
	DOWNVOTE: 'downvote'
} as const;

export type VoteTypeValues = (typeof VoteType)[keyof typeof VoteType];

// ######################### Vote Schema #########################
export const votes = pgTable(
	'votes',
	{
		id: text('id')
			.notNull()
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('userid')
			.notNull()
			.references(() => clientProfiles.id, { onDelete: 'cascade' }),
		itemId: text('item_id').notNull(),
		voteType: text('vote_type', { enum: [VoteType.UPVOTE, VoteType.DOWNVOTE] })
			.notNull()
			.default(VoteType.UPVOTE),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow(),
		tenantId: text('tenant_id').references(() => tenant.id, { onDelete: 'cascade' })
	},
	(table) => ({
		uniqueUserItemVote: uniqueIndex('unique_user_item_vote_idx').on(table.userId, table.itemId),
		itemVotesIndex: index('item_votes_idx').on(table.itemId),
		createdAtIndex: index('votes_created_at_idx').on(table.createdAt),
		tenantIdIdx: index('votes_tenant_id_idx').on(table.tenantId)
	})
);

// ######################### Subscription Schema #########################
export const SubscriptionStatus = {
	ACTIVE: 'active',
	CANCELLED: 'cancelled',
	EXPIRED: 'expired',
	PENDING: 'pending',
	PAUSED: 'paused'
} as const;

export type SubscriptionStatusValues = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

export type PaymentProviderValues = (typeof PaymentProvider)[keyof typeof PaymentProvider];

export type PlanTypeValues = (typeof PaymentPlan)[keyof typeof PaymentPlan];

export const subscriptions = pgTable(
	'subscriptions',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('userId')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		planId: text('plan_id').notNull().default(PaymentPlan.FREE),
		status: text('status').notNull().default(SubscriptionStatus.PENDING),
		startDate: timestamp('start_date', { mode: 'date' }).notNull().defaultNow(),
		endDate: timestamp('end_date', { mode: 'date' }),
		paymentProvider: text('payment_provider').default(PaymentProvider.STRIPE).notNull(),
		subscriptionId: text('subscription_id'),
		invoiceId: text('invoice_id'),
		amountDue: integer('amount_due').default(0),
		amountPaid: integer('amount_paid').default(0),
		priceId: text('price_id'),
		customerId: text('customer_id'),
		currency: text('currency').default('usd'),
		amount: integer('amount').default(0),
		interval: text('interval').default('month'),
		intervalCount: integer('interval_count').default(1),
		trialStart: timestamp('trial_start', { mode: 'date' }),
		trialEnd: timestamp('trial_end', { mode: 'date' }),

		autoRenewal: boolean('auto_renewal').default(true),
		renewalReminderSent: boolean('renewal_reminder_sent').default(false),
		lastRenewalAttempt: timestamp('last_renewal_attempt', { mode: 'date', withTimezone: true }),
		failedPaymentCount: integer('failed_payment_count').default(0),

		cancelledAt: timestamp('cancelled_at', { mode: 'date' }),
		cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
		cancelReason: text('cancel_reason'),
		hostedInvoiceUrl: text('hosted_invoice_url'),
		invoicePdf: text('invoice_pdf'),
		metadata: text('metadata'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow(),
		tenantId: text('tenant_id').references(() => tenant.id, { onDelete: 'cascade' })
	},
	(table) => ({
		userSubscriptionIndex: index('user_subscription_idx').on(table.userId),
		statusIndex: index('subscription_status_idx').on(table.status),
		providerSubscriptionIndex: uniqueIndex('provider_subscription_idx').on(
			table.paymentProvider,
			table.subscriptionId
		),
		autoRenewalCheck: check('auto_renewal_check', sql`NOT (${table.autoRenewal} AND ${table.cancelAtPeriodEnd})`),
		planIndex: index('subscription_plan_idx').on(table.planId),
		createdAtIndex: index('subscription_created_at_idx').on(table.createdAt),
		tenantIdIdx: index('subscriptions_tenant_id_idx').on(table.tenantId)
	})
);

// ######################### Subscription History Schema #########################
export const subscriptionHistory = pgTable(
	'subscriptionHistory',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		subscriptionId: text('subscription_id')
			.notNull()
			.references(() => subscriptions.id, { onDelete: 'cascade' }),
		action: text('action').notNull(),
		previousStatus: text('previous_status'),
		newStatus: text('new_status'),
		previousPlan: text('previous_plan'),
		newPlan: text('new_plan'),
		reason: text('reason'),
		metadata: text('metadata'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		tenantId: text('tenant_id').references(() => tenant.id, { onDelete: 'cascade' })
	},
	(table) => ({
		subscriptionHistoryIndex: index('subscription_history_idx').on(table.subscriptionId),
		actionIndex: index('subscription_action_idx').on(table.action),
		createdAtIndex: index('subscription_history_created_at_idx').on(table.createdAt),
		tenantIdIdx: index('subscription_history_tenant_id_idx').on(table.tenantId)
	})
);

// ######################### Payment Provider Schema #########################
export const paymentProviders = pgTable(
	'paymentProviders',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		name: text('name').notNull().unique().default(PaymentProvider.STRIPE),
		isActive: boolean('is_active').notNull().default(true),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow(),
		tenantId: text('tenant_id').references(() => tenant.id, { onDelete: 'cascade' })
	},
	(table) => ({
		activeIndex: index('payment_provider_active_idx').on(table.isActive),
		createdAtIndex: index('payment_provider_created_at_idx').on(table.createdAt),
		tenantIdIdx: index('payment_providers_tenant_id_idx').on(table.tenantId)
	})
);

// ######################### Payment Account Schema #########################
export const paymentAccounts = pgTable(
	'paymentAccounts',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('userId')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		providerId: text('providerId')
			.notNull()
			.references(() => paymentProviders.id, { onDelete: 'cascade' }),
		customerId: text('customerId').notNull(),
		accountId: text('accountId'),
		lastUsed: timestamp('lastUsed', { mode: 'date' }),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow(),
		tenantId: text('tenant_id').references(() => tenant.id, { onDelete: 'cascade' })
	},
	(table) => ({
		userProviderIndex: uniqueIndex('user_provider_unique_idx').on(table.userId, table.providerId),
		customerProviderIndex: uniqueIndex('customer_provider_unique_idx').on(table.customerId, table.providerId),
		customerIdIndex: index('payment_account_customer_id_idx').on(table.customerId),
		providerIndex: index('payment_account_provider_idx').on(table.providerId),
		createdAtIndex: index('payment_account_created_at_idx').on(table.createdAt),
		tenantIdIdx: index('payment_accounts_tenant_id_idx').on(table.tenantId)
	})
);

// ######################### Notifications Schema #########################
export const notifications = pgTable(
	'notifications',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		type: text('type', {
			enum: [
				// Legacy values (admin) — preserved
				'item_submission',
				'comment_reported',
				'item_reported',
				'user_registered',
				'user_followed',
				'payment_failed',
				'system_alert',
				// Client lifecycle + billing
				'comment_received',
				'item_approved',
				'item_rejected',
				'payment_succeeded',
				'subscription_expiring',
				// Account & system
				'security_alert',
				'password_changed',
				'admin_announcement'
			]
		}).notNull(),
		title: text('title').notNull(),
		message: text('message').notNull(),
		data: text('data'),
		isRead: boolean('is_read').notNull().default(false),
		readAt: timestamp('read_at', { mode: 'date' }),
		// Added in spec 027 (client notifications)
		priority: text('priority', { enum: ['low', 'medium', 'high', 'critical'] })
			.notNull()
			.default('medium'),
		category: text('category', {
			enum: ['social', 'item', 'moderation', 'billing', 'sponsorship', 'account', 'system']
		})
			.notNull()
			.default('system'),
		actorId: text('actor_id').references(() => users.id, { onDelete: 'set null' }),
		groupKey: text('group_key'),
		archivedAt: timestamp('archived_at', { mode: 'date' }),
		deliveredChannels: text('delivered_channels').array(),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow(),
		tenantId: text('tenant_id').references(() => tenant.id, { onDelete: 'cascade' })
	},
	(table) => ({
		userIndex: index('notifications_user_idx').on(table.userId),
		typeIndex: index('notifications_type_idx').on(table.type),
		isReadIndex: index('notifications_is_read_idx').on(table.isRead),
		createdAtIndex: index('notifications_created_at_idx').on(table.createdAt),
		tenantIdIdx: index('notifications_tenant_id_idx').on(table.tenantId),
		// Hot-path partial index for "unread for this user" — drives bell badge + Unread tab
		userUnreadIdx: index('notifications_user_unread_idx')
			.on(table.userId, table.createdAt)
			.where(sql`is_read = false AND archived_at IS NULL`),
		groupKeyIdx: index('notifications_group_key_idx').on(table.userId, table.groupKey)
	})
);

// ######################### Notification Preferences (spec 027) #########################
export const notificationPreferences = pgTable('notification_preferences', {
	userId: text('user_id')
		.primaryKey()
		.references(() => users.id, { onDelete: 'cascade' }),
	// JSONB matrix: { 'user_mentioned': { in_app: true, email: true, push: true, sms: false }, ... }
	preferences: jsonb('preferences').notNull().default({}),
	emailDigest: text('email_digest', { enum: ['instant', 'daily', 'weekly', 'off'] })
		.notNull()
		.default('instant'),
	quietHoursStart: text('quiet_hours_start'),
	quietHoursEnd: text('quiet_hours_end'),
	timezone: text('timezone').notNull().default('UTC'),
	pushEnabled: boolean('push_enabled').notNull().default(false),
	pushTokens: jsonb('push_tokens').notNull().default([]),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
	tenantId: text('tenant_id').references(() => tenant.id, { onDelete: 'cascade' })
});

export type NotificationPreferences = typeof notificationPreferences.$inferSelect;
export type NewNotificationPreferences = typeof notificationPreferences.$inferInsert;

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
export type Vote = typeof votes.$inferSelect;
export type InsertVote = typeof votes.$inferInsert;
export type NewUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
export type NewsletterSubscription = typeof newsletterSubscriptions.$inferSelect;
export type NewNewsletterSubscription = typeof newsletterSubscriptions.$inferInsert;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type TwoFactorCode = typeof twoFactorCodes.$inferSelect;
export type NewTwoFactorCode = typeof twoFactorCodes.$inferInsert;
export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;

// ######################### Permission Types #########################
export type Permission = typeof permissions.$inferSelect;
export type NewPermission = typeof permissions.$inferInsert;
export type RolePermission = typeof rolePermissions.$inferSelect;
export type NewRolePermission = typeof rolePermissions.$inferInsert;
export type UserRole = typeof userRoles.$inferSelect;
export type NewUserRole = typeof userRoles.$inferInsert;

// ######################### Subscription Types #########################
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type SubscriptionHistory = typeof subscriptionHistory.$inferSelect;
export type NewSubscriptionHistory = typeof subscriptionHistory.$inferInsert;
export type SubscriptionWithUser = Subscription & {
	user: typeof users.$inferSelect;
};

export type OldPaymentProvider = typeof paymentProviders.$inferSelect;
export type NewPaymentProvider = typeof paymentProviders.$inferInsert;
export type PaymentAccount = typeof paymentAccounts.$inferSelect;
export type NewPaymentAccount = typeof paymentAccounts.$inferInsert;

// ######################### Notification Types #########################
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

export enum ActivityType {
	SIGN_UP = 'SIGN_UP',
	SIGN_IN = 'SIGN_IN',
	SIGN_OUT = 'SIGN_OUT',
	VERIFY_EMAIL = 'VERIFY_EMAIL',
	UPDATE_PASSWORD = 'UPDATE_PASSWORD',
	DELETE_ACCOUNT = 'DELETE_ACCOUNT',
	UPDATE_ACCOUNT = 'UPDATE_ACCOUNT',
	UPDATE_TWENTY_CRM_CONFIG = 'UPDATE_TWENTY_CRM_CONFIG',
	// Email two-factor authentication (spec 047)
	TWO_FACTOR_ENABLED = 'TWO_FACTOR_ENABLED',
	TWO_FACTOR_DISABLED = 'TWO_FACTOR_DISABLED',
	TWO_FACTOR_CHALLENGE_SENT = 'TWO_FACTOR_CHALLENGE_SENT',
	TWO_FACTOR_FAILED = 'TWO_FACTOR_FAILED',
	TWO_FACTOR_LOCKED = 'TWO_FACTOR_LOCKED'
}

// ######################### Client Profile Types #########################
// ######################### Favorites Schema #########################
export const favorites = pgTable(
	'favorites',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('userId')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		itemSlug: text('item_slug').notNull(),
		itemName: text('item_name').notNull(),
		itemIconUrl: text('item_icon_url'),
		itemCategory: text('item_category'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow(),
		tenantId: text('tenant_id').references(() => tenant.id, { onDelete: 'cascade' })
	},
	(table) => ({
		userItemIndex: uniqueIndex('user_item_favorite_unique_idx').on(table.userId, table.itemSlug),
		userIdIndex: index('favorites_user_id_idx').on(table.userId),
		itemSlugIndex: index('favorites_item_slug_idx').on(table.itemSlug),
		createdAtIndex: index('favorites_created_at_idx').on(table.createdAt),
		tenantIdIdx: index('favorites_tenant_id_idx').on(table.tenantId)
	})
);

export type ClientProfile = typeof clientProfiles.$inferSelect;

// ######################### Featured Items Schema #########################
export const featuredItems = pgTable(
	'featured_items',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		itemSlug: text('item_slug').notNull(),
		itemName: text('item_name').notNull(),
		itemIconUrl: text('item_icon_url'),
		itemCategory: text('item_category'),
		itemDescription: text('item_description'),
		featuredOrder: integer('featured_order').notNull().default(0), // Order for display
		featuredUntil: timestamp('featured_until'), // Optional expiration date
		isActive: boolean('is_active').notNull().default(true),
		featuredBy: text('featured_by').notNull(), // Admin user ID who featured it
		featuredAt: timestamp('featured_at').notNull().defaultNow(),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow(),
		tenantId: text('tenant_id').references(() => tenant.id, { onDelete: 'cascade' })
	},
	(table) => ({
		itemSlugIndex: index('featured_items_item_slug_idx').on(table.itemSlug),
		featuredOrderIndex: index('featured_items_featured_order_idx').on(table.featuredOrder),
		isActiveIndex: index('featured_items_is_active_idx').on(table.isActive),
		featuredAtIndex: index('featured_items_featured_at_idx').on(table.featuredAt),
		featuredUntilIndex: index('featured_items_featured_until_idx').on(table.featuredUntil),
		tenantIdIdx: index('featured_items_tenant_id_idx').on(table.tenantId)
	})
);

export type FeaturedItem = typeof featuredItems.$inferSelect;
export type NewFeaturedItem = typeof featuredItems.$inferInsert;

// ######################### Sponsor Ads Schema #########################
export const SponsorAdStatus = {
	PENDING_PAYMENT: 'pending_payment', // User submitted, waiting for payment
	PENDING: 'pending', // User paid, waiting for admin review
	REJECTED: 'rejected', // Admin rejected
	ACTIVE: 'active', // Admin approved, displaying on site
	EXPIRED: 'expired', // Subscription period ended
	CANCELLED: 'cancelled' // Cancelled by user or admin
} as const;

export type SponsorAdStatusValues = (typeof SponsorAdStatus)[keyof typeof SponsorAdStatus];

export const SponsorAdInterval = {
	WEEKLY: 'weekly',
	MONTHLY: 'monthly'
} as const;

export type SponsorAdIntervalValues = (typeof SponsorAdInterval)[keyof typeof SponsorAdInterval];

export const sponsorAds = pgTable(
	'sponsor_ads',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),

		// User/Submitter info
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),

		// Item being sponsored (only store identifier, fetch details from content)
		itemSlug: text('item_slug').notNull(),

		// Sponsorship details
		status: text('status', {
			enum: [
				SponsorAdStatus.PENDING_PAYMENT,
				SponsorAdStatus.PENDING,
				SponsorAdStatus.REJECTED,
				SponsorAdStatus.ACTIVE,
				SponsorAdStatus.EXPIRED,
				SponsorAdStatus.CANCELLED
			]
		})
			.notNull()
			.default(SponsorAdStatus.PENDING_PAYMENT),
		interval: text('interval', {
			enum: [SponsorAdInterval.WEEKLY, SponsorAdInterval.MONTHLY]
		}).notNull(),

		// Pricing (in dollars)
		amount: integer('amount').notNull(),
		currency: text('currency').notNull().default('usd'),
		tenantId: text('tenant_id').references(() => tenant.id, { onDelete: 'cascade' }),

		// Payment info
		paymentProvider: text('payment_provider').notNull(),
		subscriptionId: text('subscription_id'),
		customerId: text('customer_id'),

		// Subscription period
		startDate: timestamp('start_date', { mode: 'date' }),
		endDate: timestamp('end_date', { mode: 'date' }),

		// Admin review
		reviewedBy: text('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
		reviewedAt: timestamp('reviewed_at', { mode: 'date' }),
		rejectionReason: text('rejection_reason'),

		// Cancellation
		cancelledAt: timestamp('cancelled_at', { mode: 'date' }),
		cancelReason: text('cancel_reason'),

		// Timestamps
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow()
	},
	(table) => ({
		userIdIndex: index('sponsor_ads_user_id_idx').on(table.userId),
		itemSlugIndex: index('sponsor_ads_item_slug_idx').on(table.itemSlug),
		statusIndex: index('sponsor_ads_status_idx').on(table.status),
		intervalIndex: index('sponsor_ads_interval_idx').on(table.interval),
		providerSubscriptionIndex: uniqueIndex('sponsor_ads_provider_subscription_idx').on(
			table.paymentProvider,
			table.subscriptionId
		),
		startDateIndex: index('sponsor_ads_start_date_idx').on(table.startDate),
		endDateIndex: index('sponsor_ads_end_date_idx').on(table.endDate),
		createdAtIndex: index('sponsor_ads_created_at_idx').on(table.createdAt),
		tenantIdIdx: index('sponsor_ads_tenant_id_idx').on(table.tenantId)
	})
);

// ######################### Sponsor Ads Types #########################
export type SponsorAd = typeof sponsorAds.$inferSelect;
export type NewSponsorAd = typeof sponsorAds.$inferInsert;
export type NewClientProfile = typeof clientProfiles.$inferInsert;
export type ClientProfileWithUser = ClientProfile & {
	user: typeof users.$inferSelect;
};

// ######################### Portfolio Projects Types #########################
export type PortfolioProject = typeof portfolioProjects.$inferSelect;
export type NewPortfolioProject = typeof portfolioProjects.$inferInsert;

// ######################### User Follows Types #########################
export type UserFollow = typeof userFollows.$inferSelect;
export type NewUserFollow = typeof userFollows.$inferInsert;

// ######################### Favorites Types #########################
export type Favorite = typeof favorites.$inferSelect;
export type NewFavorite = typeof favorites.$inferInsert;
export type FavoriteWithUser = Favorite & {
	user: typeof users.$inferSelect;
};

// ######################### Twenty CRM Config Schema #########################
/**
 * Twenty CRM Configuration Table
 *
 * This table stores the Twenty CRM integration configuration.
 *
 * IMPORTANT: This table enforces a singleton pattern via a unique index on ((true)),
 * which ensures only ONE configuration row can exist. This is enforced by migration
 * 0006_add_twenty_crm_singleton_constraint.sql and prevents data inconsistencies.
 *
 * The singleton constraint is not visible in Drizzle schema definition as it uses
 * an expression-based index, but it is enforced at the database level.
 */
export const twentyCrmConfig = pgTable(
	'twenty_crm_config',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		baseUrl: text('base_url').notNull(),
		apiKey: text('api_key').notNull(),
		enabled: boolean('enabled').notNull().default(false),
		tenantId: text('tenant_id').references(() => tenant.id, { onDelete: 'cascade' }),
		syncMode: text('sync_mode', { enum: ['disabled', 'platform', 'direct_crm'] })
			.notNull()
			.default('disabled'),
		createdBy: text('created_by'),
		updatedBy: text('updated_by'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow()
	},
	(table) => ({
		enabledIndex: index('twenty_crm_config_enabled_idx').on(table.enabled),
		syncModeIndex: index('twenty_crm_config_sync_mode_idx').on(table.syncMode),
		updatedAtIndex: index('twenty_crm_config_updated_at_idx').on(table.updatedAt),
		tenantIdIdx: index('twenty_crm_config_tenant_id_idx').on(table.tenantId)
	})
);

export type TwentyCrmConfigRow = typeof twentyCrmConfig.$inferSelect;
export type NewTwentyCrmConfigRow = typeof twentyCrmConfig.$inferInsert;

// ######################### Integration Mappings Schema #########################
/**
 * Integration Mappings Table
 *
 * Stores persistent mappings between Ever system IDs and external CRM IDs.
 * Enables hybrid caching strategy (memory + database) for optimal performance.
 *
 * Key features:
 * - Unique constraint on (ever_id, object_type) ensures one mapping per entity
 * - version_hash tracks data changes for sync strategies
 * - Indexed for fast lookups by ever_id or crm_id
 */
export const integrationMappings = pgTable(
	'integration_mappings',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		everId: text('ever_id').notNull(),
		crmId: text('crm_id').notNull(),
		objectType: text('object_type', { enum: ['company', 'person'] }).notNull(),
		lastSyncedAt: timestamp('last_synced_at').notNull().defaultNow(),
		versionHash: text('version_hash'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow(),
		tenantId: text('tenant_id').references(() => tenant.id, { onDelete: 'cascade' })
	},
	(table) => ({
		everIdObjectTypeIdx: uniqueIndex('integration_mappings_ever_id_object_type_idx').on(
			table.everId,
			table.objectType,
			table.tenantId
		),
		crmIdIdx: index('integration_mappings_crm_id_idx').on(table.crmId),
		lastSyncedAtIdx: index('integration_mappings_last_synced_at_idx').on(table.lastSyncedAt),
		objectTypeIdx: index('integration_mappings_object_type_idx').on(table.objectType),
		tenantIdIdx: index('integration_mappings_tenant_id_idx').on(table.tenantId)
	})
);

export type IntegrationMapping = typeof integrationMappings.$inferSelect;
export type NewIntegrationMapping = typeof integrationMappings.$inferInsert;

// ######################### Companies Schema #########################
export const companies = pgTable(
	'companies',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		name: text('name').notNull(),
		website: text('website'),
		domain: text('domain'),
		slug: text('slug'),
		tenantId: text('tenant_id').references(() => tenant.id, { onDelete: 'cascade' }),
		status: text('status', { enum: ['active', 'inactive'] })
			.notNull()
			.default('active'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow()
	},
	(table) => ({
		nameIndex: index('companies_name_idx').on(table.name),
		statusIndex: index('companies_status_idx').on(table.status),
		domainUniqueIndex: uniqueIndex('companies_domain_unique_idx').on(table.domain),
		slugUniqueIndex: uniqueIndex('companies_slug_unique_idx').on(table.slug),
		tenantIdIdx: index('companies_tenant_id_idx').on(table.tenantId)
	})
);

// ######################### Companies Types #########################
export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;

// ######################### Items Companies Schema #########################
export const itemsCompanies = pgTable(
	'items_companies',
	{
		itemSlug: text('item_slug').notNull().unique(),
		companyId: text('company_id')
			.notNull()
			.references(() => companies.id, { onDelete: 'cascade' }),
		tenantId: text('tenant_id').references(() => tenant.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => ({
		companyIdIndex: index('items_companies_company_id_idx').on(table.companyId),
		tenantIdIdx: index('items_companies_tenant_id_idx').on(table.tenantId)
	})
);

// ######################### Items Companies Types #########################
export type ItemCompany = typeof itemsCompanies.$inferSelect;
export type NewItemCompany = typeof itemsCompanies.$inferInsert;

// ######################### Report Schema #########################
export const ReportContentType = {
	ITEM: 'item',
	COMMENT: 'comment'
} as const;

export type ReportContentTypeValues = (typeof ReportContentType)[keyof typeof ReportContentType];

export const ReportReason = {
	SPAM: 'spam',
	HARASSMENT: 'harassment',
	INAPPROPRIATE: 'inappropriate',
	OTHER: 'other'
} as const;

export type ReportReasonValues = (typeof ReportReason)[keyof typeof ReportReason];

export const ReportStatus = {
	PENDING: 'pending',
	REVIEWED: 'reviewed',
	RESOLVED: 'resolved',
	DISMISSED: 'dismissed'
} as const;

export type ReportStatusValues = (typeof ReportStatus)[keyof typeof ReportStatus];

export const ReportResolution = {
	CONTENT_REMOVED: 'content_removed',
	USER_WARNED: 'user_warned',
	USER_SUSPENDED: 'user_suspended',
	USER_BANNED: 'user_banned',
	NO_ACTION: 'no_action'
} as const;

export type ReportResolutionValues = (typeof ReportResolution)[keyof typeof ReportResolution];

export const reports = pgTable(
	'reports',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		contentType: text('content_type', { enum: [ReportContentType.ITEM, ReportContentType.COMMENT] }).notNull(),
		contentId: text('content_id').notNull(),
		reason: text('reason', {
			enum: [ReportReason.SPAM, ReportReason.HARASSMENT, ReportReason.INAPPROPRIATE, ReportReason.OTHER]
		}).notNull(),
		details: text('details'),
		status: text('status', {
			enum: [ReportStatus.PENDING, ReportStatus.REVIEWED, ReportStatus.RESOLVED, ReportStatus.DISMISSED]
		})
			.notNull()
			.default(ReportStatus.PENDING),
		resolution: text('resolution', {
			enum: [
				ReportResolution.CONTENT_REMOVED,
				ReportResolution.USER_WARNED,
				ReportResolution.USER_SUSPENDED,
				ReportResolution.USER_BANNED,
				ReportResolution.NO_ACTION
			]
		}),
		reportedBy: text('reported_by')
			.notNull()
			.references(() => clientProfiles.id, { onDelete: 'cascade' }),
		tenantId: text('tenant_id').references(() => tenant.id, { onDelete: 'cascade' }),
		reviewedBy: text('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
		reviewNote: text('review_note'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow(),
		reviewedAt: timestamp('reviewed_at'),
		resolvedAt: timestamp('resolved_at')
	},
	(table) => ({
		contentTypeIndex: index('reports_content_type_idx').on(table.contentType),
		contentIdIndex: index('reports_content_id_idx').on(table.contentId),
		statusIndex: index('reports_status_idx').on(table.status),
		reportedByIndex: index('reports_reported_by_idx').on(table.reportedBy),
		createdAtIndex: index('reports_created_at_idx').on(table.createdAt),
		contentTypeContentIdIndex: index('reports_content_type_content_id_idx').on(table.contentType, table.contentId),
		tenantIdIdx: index('reports_tenant_id_idx').on(table.tenantId)
	})
);

// ######################### Report Types #########################
export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;

// ######################### Moderation History Schema #########################
export const ModerationAction = {
	WARN: 'warn',
	SUSPEND: 'suspend',
	BAN: 'ban',
	UNSUSPEND: 'unsuspend',
	UNBAN: 'unban',
	CONTENT_REMOVED: 'content_removed'
} as const;

export type ModerationActionValues = (typeof ModerationAction)[keyof typeof ModerationAction];

export const moderationHistory = pgTable(
	'moderation_history',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('user_id')
			.notNull()
			.references(() => clientProfiles.id, { onDelete: 'cascade' }),
		action: text('action', {
			enum: [
				ModerationAction.WARN,
				ModerationAction.SUSPEND,
				ModerationAction.BAN,
				ModerationAction.UNSUSPEND,
				ModerationAction.UNBAN,
				ModerationAction.CONTENT_REMOVED
			]
		}).notNull(),
		reason: text('reason'),
		reportId: text('report_id').references(() => reports.id, { onDelete: 'set null' }),
		performedBy: text('performed_by').references(() => users.id, { onDelete: 'set null' }),
		contentType: text('content_type', { enum: [ReportContentType.ITEM, ReportContentType.COMMENT] }),
		contentId: text('content_id'),
		details: jsonb('details'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		tenantId: text('tenant_id').references(() => tenant.id, { onDelete: 'cascade' })
	},
	(table) => ({
		userIdIndex: index('moderation_history_user_id_idx').on(table.userId),
		actionIndex: index('moderation_history_action_idx').on(table.action),
		reportIdIndex: index('moderation_history_report_id_idx').on(table.reportId),
		performedByIndex: index('moderation_history_performed_by_idx').on(table.performedBy),
		createdAtIndex: index('moderation_history_created_at_idx').on(table.createdAt),
		tenantIdIdx: index('moderation_history_tenant_id_idx').on(table.tenantId)
	})
);

// ######################### Moderation History Types #########################
export type ModerationHistoryRecord = typeof moderationHistory.$inferSelect;
export type NewModerationHistoryRecord = typeof moderationHistory.$inferInsert;

// ######################### Survey Schema #########################

export const surveys = pgTable(
	'surveys',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		slug: text('slug').notNull().unique(),
		title: text('title').notNull(),
		description: text('description'),
		type: text('type', { enum: ['global', 'item'] }).notNull(),
		itemId: text('item_id'),
		status: text('status', { enum: ['draft', 'published', 'closed'] })
			.notNull()
			.default('draft'),
		surveyJson: jsonb('survey_json').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
		publishedAt: timestamp('published_at', { withTimezone: true }),
		closedAt: timestamp('closed_at', { withTimezone: true }),
		deletedAt: timestamp('deleted_at', { withTimezone: true }),
		tenantId: text('tenant_id').references(() => tenant.id, { onDelete: 'cascade' })
	},
	(table) => ({
		slugIndex: index('surveys_slug_idx').on(table.slug),
		typeIndex: index('surveys_type_idx').on(table.type),
		itemIdIndex: index('surveys_item_id_idx').on(table.itemId),
		statusIndex: index('surveys_status_idx').on(table.status),
		createdAtIndex: index('surveys_created_at_idx').on(table.createdAt),
		tenantIdIdx: index('surveys_tenant_id_idx').on(table.tenantId)
	})
);

export const surveyResponses = pgTable(
	'survey_responses',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		surveyId: text('survey_id')
			.notNull()
			.references(() => surveys.id, { onDelete: 'restrict' }),
		userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
		itemId: text('item_id'),
		data: jsonb('data').notNull(),
		completedAt: timestamp('completed_at', { withTimezone: true }).notNull(),
		ipAddress: text('ip_address'),
		userAgent: text('user_agent'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
		tenantId: text('tenant_id').references(() => tenant.id, { onDelete: 'cascade' })
	},
	(table) => ({
		surveyIdIndex: index('survey_responses_survey_id_idx').on(table.surveyId),
		userIdIndex: index('survey_responses_user_id_idx').on(table.userId),
		itemIdIndex: index('survey_responses_item_id_idx').on(table.itemId),
		completedAtIndex: index('survey_responses_completed_at_idx').on(table.completedAt),
		tenantIdIdx: index('survey_responses_tenant_id_idx').on(table.tenantId)
	})
);

// ######################### Item Views Schema #########################
/**
 * Item Views Table
 *
 * Tracks unique daily item views for analytics.
 * Uses cookie-based viewer identification with UTC date deduplication.
 *
 * Key features:
 * - Unique constraint on (item_id, viewer_id, viewed_date_utc) ensures one view per viewer per day
 * - No IP storage for privacy - uses anonymous cookie-based viewer_id only
 * - Excludes bots and item owners at API level
 */
export const itemViews = pgTable(
	'item_views',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		itemId: text('item_id').notNull(),
		viewerId: text('viewer_id').notNull(),
		viewedDateUtc: text('viewed_date_utc').notNull(), // YYYY-MM-DD format
		viewedAt: timestamp('viewed_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
		tenantId: text('tenant_id').references(() => tenant.id, { onDelete: 'cascade' })
	},
	(table) => ({
		uniqueDailyView: uniqueIndex('item_views_unique_daily_idx').on(
			table.itemId,
			table.viewerId,
			table.viewedDateUtc
		),
		itemDateIndex: index('item_views_item_date_idx').on(table.itemId, table.viewedDateUtc),
		tenantIdIdx: index('item_views_tenant_id_idx').on(table.tenantId)
	})
);

// ######################### Item Views Types #########################
export type ItemView = typeof itemViews.$inferSelect;
export type NewItemView = typeof itemViews.$inferInsert;

// ######################### Seed Status Schema #########################
// Singleton table to track database seeding status and prevent concurrent seed races
export const seedStatus = pgTable(
	'seed_status',
	{
		id: text('id').primaryKey().default('singleton'), // Only one row allowed
		status: text('status', { enum: ['seeding', 'completed', 'failed'] }).notNull(),
		startedAt: timestamp('started_at').notNull().defaultNow(),
		completedAt: timestamp('completed_at'),
		version: text('version'), // Optional: track seed version/hash
		error: text('error'), // Optional: store error message if failed
		tenantId: text('tenant_id').references(() => tenant.id, { onDelete: 'cascade' })
	},
	(table) => ({
		// Unique constraint ensures only one row can exist
		singletonConstraint: uniqueIndex('seed_status_singleton_idx').on(table.id),
		tenantIdIdx: index('seed_status_tenant_id_idx').on(table.tenantId)
	})
);

// Seed status types
export type SeedStatus = typeof seedStatus.$inferSelect;
export type NewSeedStatus = typeof seedStatus.$inferInsert;

// Survey types
export type Survey = typeof surveys.$inferSelect;
export type SurveyItem = Survey & {
	responseCount?: number;
	isCompletedByUser?: boolean;
};
export type NewSurvey = typeof surveys.$inferInsert;
export type SurveyResponse = typeof surveyResponses.$inferSelect;
export type NewSurveyResponse = typeof surveyResponses.$inferInsert;

// ######################### Item Audit Log Schema #########################
/**
 * Item Audit Action Enum
 * Tracks the type of action performed on an item
 */
export const ItemAuditAction = {
	CREATED: 'created',
	UPDATED: 'updated',
	STATUS_CHANGED: 'status_changed',
	REVIEWED: 'reviewed',
	DELETED: 'deleted',
	RESTORED: 'restored'
} as const;

export type ItemAuditActionValues = (typeof ItemAuditAction)[keyof typeof ItemAuditAction];

/**
 * Item Audit Logs Table
 *
 * Stores the complete history of changes for items in the admin panel.
 * Since items are stored in Git (not in the database), itemId is just
 * the slug, not a foreign key. User info is denormalized for display.
 */
export const itemAuditLogs = pgTable(
	'item_audit_logs',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		itemId: text('item_id').notNull(), // Item slug (not FK since items are in Git)
		itemName: text('item_name').notNull(), // Denormalized for display
		action: text('action', {
			enum: [
				ItemAuditAction.CREATED,
				ItemAuditAction.UPDATED,
				ItemAuditAction.STATUS_CHANGED,
				ItemAuditAction.REVIEWED,
				ItemAuditAction.DELETED,
				ItemAuditAction.RESTORED
			]
		}).notNull(),
		previousStatus: text('previous_status'), // For status changes
		newStatus: text('new_status'), // For status changes
		changes: jsonb('changes'), // Field-level changes: { field: { old, new } }
		performedBy: text('performed_by').references(() => users.id, { onDelete: 'set null' }),
		performedByName: text('performed_by_name'), // Denormalized for display
		notes: text('notes'), // Review notes or other context
		metadata: jsonb('metadata'), // Additional context (e.g., source IP, user agent)
		createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
		tenantId: text('tenant_id').references(() => tenant.id, { onDelete: 'cascade' })
	},
	(table) => ({
		itemIdIndex: index('item_audit_logs_item_id_idx').on(table.itemId),
		actionIndex: index('item_audit_logs_action_idx').on(table.action),
		performedByIndex: index('item_audit_logs_performed_by_idx').on(table.performedBy),
		createdAtIndex: index('item_audit_logs_created_at_idx').on(table.createdAt),
		itemIdActionIndex: index('item_audit_logs_item_id_action_idx').on(table.itemId, table.action),
		tenantIdIdx: index('item_audit_logs_tenant_id_idx').on(table.tenantId)
	})
);

// ######################### Item Audit Log Types #########################
export type ItemAuditLog = typeof itemAuditLogs.$inferSelect;
export type NewItemAuditLog = typeof itemAuditLogs.$inferInsert;

/** Type for field-level changes stored in the changes column */
export type ItemAuditChanges = Record<string, { old: unknown; new: unknown }>;

// ######################### Item Location Index Schema #########################
/**
 * Item Location Index Table
 *
 * Stores location data for items to enable geospatial queries.
 * This is an INDEX-ONLY table - the source of truth remains in the Git-based CMS.
 * Used for "Near Me" filtering and distance-based sorting.
 */
export const itemLocationIndex = pgTable(
	'item_location_index',
	{
		itemSlug: text('item_slug').primaryKey(),
		// Use doublePrecision for native JS number support (sufficient precision for coordinates)
		latitude: doublePrecision('latitude').notNull(),
		longitude: doublePrecision('longitude').notNull(),
		address: text('address'),
		city: text('city'),
		state: text('state'),
		country: text('country'),
		// Normalized columns for fast case-insensitive queries (lowercase, trimmed)
		cityNormalized: text('city_normalized'),
		countryNormalized: text('country_normalized'),
		postalCode: text('postal_code'),
		serviceArea: text('service_area'),
		isRemote: boolean('is_remote').notNull().default(false),
		indexedAt: timestamp('indexed_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
		tenantId: text('tenant_id').references(() => tenant.id, { onDelete: 'cascade' })
	},
	(table) => ({
		latitudeIndex: index('item_location_index_latitude_idx').on(table.latitude),
		longitudeIndex: index('item_location_index_longitude_idx').on(table.longitude),
		cityIndex: index('item_location_index_city_idx').on(table.city),
		countryIndex: index('item_location_index_country_idx').on(table.country),
		// Indexes on normalized columns for fast case-insensitive equality queries
		cityNormalizedIndex: index('item_location_index_city_normalized_idx').on(table.cityNormalized),
		countryNormalizedIndex: index('item_location_index_country_normalized_idx').on(table.countryNormalized),
		isRemoteIndex: index('item_location_index_is_remote_idx').on(table.isRemote),
		indexedAtIndex: index('item_location_index_indexed_at_idx').on(table.indexedAt),
		// Composite index for geospatial bounding box queries
		latLongIndex: index('item_location_index_lat_long_idx').on(table.latitude, table.longitude),
		tenantIdIdx: index('item_location_index_tenant_id_idx').on(table.tenantId)
	})
);

// ######################### Item Location Index Types #########################
export type ItemLocationIndex = typeof itemLocationIndex.$inferSelect;
export type NewItemLocationIndex = typeof itemLocationIndex.$inferInsert;

// ######################### Location Index Metadata #########################
/**
 * Singleton table to track location index metadata.
 * Stores persistent information about the index state across deployments.
 */
export const locationIndexMeta = pgTable(
	'location_index_meta',
	{
		id: text('id').primaryKey().default('singleton'), // Only one row allowed
		lastRebuildAt: timestamp('last_rebuild_at', { mode: 'date', withTimezone: true }),
		lastRebuildDurationMs: integer('last_rebuild_duration_ms'),
		lastRebuildItemCount: integer('last_rebuild_item_count'),
		updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
		tenantId: text('tenant_id').references(() => tenant.id, { onDelete: 'cascade' })
	},
	(table) => ({
		singletonConstraint: uniqueIndex('location_index_meta_singleton_idx').on(table.id),
		tenantIdIdx: index('location_index_meta_tenant_id_idx').on(table.tenantId)
	})
);

export type LocationIndexMeta = typeof locationIndexMeta.$inferSelect;
export type NewLocationIndexMeta = typeof locationIndexMeta.$inferInsert;

// ######################### AI Chat Conversations (Spec 023) #########################
/**
 * Conversation envelope for the optional AI-chat persistence layer.
 *
 * Created and populated only when `aiChat.persist === true` in `works.yml`
 * **and** the visitor is authenticated. Anonymous chats are never persisted
 * — they live in the client's `localStorage` only.
 *
 * Cascade-deleted with the parent user; messages cascade-delete with the
 * parent conversation.
 */
export const chatConversations = pgTable(
	'chat_conversations',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		title: text('title'),
		locale: text('locale').notNull(),
		scenario: text('scenario'),
		createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
		tenantId: text('tenant_id').references(() => tenant.id, { onDelete: 'cascade' })
	},
	(table) => ({
		userUpdatedIdx: index('chat_conversations_user_updated_idx').on(table.userId, table.updatedAt),
		tenantIdIdx: index('chat_conversations_tenant_id_idx').on(table.tenantId)
	})
);

export type ChatConversation = typeof chatConversations.$inferSelect;
export type NewChatConversation = typeof chatConversations.$inferInsert;

// ######################### AI Chat Messages (Spec 023) #########################
export const chatMessages = pgTable(
	'chat_messages',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		conversationId: text('conversation_id')
			.notNull()
			.references(() => chatConversations.id, { onDelete: 'cascade' }),
		role: text('role').notNull(), // 'user' | 'assistant' | 'tool' | 'system'
		parts: jsonb('parts').notNull(), // UIMessage.parts[] verbatim
		toolCalls: jsonb('tool_calls'),
		toolResults: jsonb('tool_results'),
		createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).notNull().defaultNow()
	},
	(table) => ({
		convCreatedIdx: index('chat_messages_conv_created_idx').on(table.conversationId, table.createdAt)
	})
);

export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
