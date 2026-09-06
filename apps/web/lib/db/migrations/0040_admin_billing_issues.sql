-- Admin Billing Issues (Spec 051)
--
-- Triage state for payment problems an admin has to act on. The row never holds
-- authoritative money state: amount / plan / provider live on the referenced
-- `subscriptions` row, and the refund is executed by the provider that row names.
-- The columns below only record what kind of problem it is, whether it is still
-- open, what the provider returned for a refund, and who closed it.
--
-- Additive, idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS "billing_issues" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "subscription_id" text,
  "type" text DEFAULT 'other' NOT NULL,
  "status" text DEFAULT 'open' NOT NULL,
  "payment_provider" text DEFAULT 'stripe' NOT NULL,
  "provider_payment_id" text,
  "amount" integer DEFAULT 0,
  "currency" text DEFAULT 'usd',
  "detection_reason" text,
  "source_key" text,
  "refund_claimed_at" timestamp,
  "refund_id" text,
  "refund_amount" integer,
  "refunded_at" timestamp,
  "resolution_note" text,
  "resolved_by" text,
  "resolved_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "tenant_id" text
);

DO $$ BEGIN
  ALTER TABLE "billing_issues"
    ADD CONSTRAINT "billing_issues_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "billing_issues"
    ADD CONSTRAINT "billing_issues_subscription_id_subscriptions_id_fk"
    FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "billing_issues"
    ADD CONSTRAINT "billing_issues_resolved_by_users_id_fk"
    FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "billing_issues"
    ADD CONSTRAINT "billing_issues_tenant_id_tenant_id_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "billing_issues_status_idx" ON "billing_issues" ("status");
CREATE INDEX IF NOT EXISTS "billing_issues_type_idx" ON "billing_issues" ("type");
CREATE INDEX IF NOT EXISTS "billing_issues_user_id_idx" ON "billing_issues" ("user_id");
CREATE INDEX IF NOT EXISTS "billing_issues_subscription_id_idx" ON "billing_issues" ("subscription_id");
CREATE INDEX IF NOT EXISTS "billing_issues_created_at_idx" ON "billing_issues" ("created_at");
CREATE INDEX IF NOT EXISTS "billing_issues_tenant_id_idx" ON "billing_issues" ("tenant_id");

-- Detection is idempotent: one row per (tenant, source key). The key is built from
-- the subscription id plus the issue type, so a subscription can carry a
-- failed-payment issue and a dispute at the same time without either being
-- re-created on the next sync.
CREATE UNIQUE INDEX IF NOT EXISTS "billing_issues_tenant_source_key_idx"
  ON "billing_issues" ("tenant_id", "source_key");
