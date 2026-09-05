-- Email two-factor authentication (spec 046 — EW-135 … EW-142)
--
-- Adds:
--   * "twoFactorCodes" — one-time login codes. Only a KEYED HMAC-SHA256 of
--     the 6-digit code is stored ("code_hash"), under AUTH_SECRET (or
--     TWO_FACTOR_CODE_SECRET); the plaintext lives only in the issuing
--     request and in the email that carries it, and the key never reaches
--     the database.
--   * client_profiles.two_factor_failed_attempts / two_factor_locked_until —
--     the user-level brute-force budget, which deliberately survives code
--     rotation so a resend cannot reset it.
--
-- The users.deactivated_at line re-states migration 0039 (which was
-- hand-written without a drizzle snapshot, so the snapshot chain still
-- believed the column was missing). It is a no-op where 0039 already ran.
--
-- Additive and idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS "twoFactorCodes" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"email" text NOT NULL,
	"code_hash" text NOT NULL,
	"expires" timestamp NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"consumed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"tenant_id" text
);
--> statement-breakpoint
ALTER TABLE "client_profiles" ADD COLUMN IF NOT EXISTS "two_factor_failed_attempts" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "client_profiles" ADD COLUMN IF NOT EXISTS "two_factor_locked_until" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deactivated_at" timestamp;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "twoFactorCodes" ADD CONSTRAINT "twoFactorCodes_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "twoFactorCodes" ADD CONSTRAINT "twoFactorCodes_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "two_factor_codes_user_id_idx" ON "twoFactorCodes" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "two_factor_codes_expires_idx" ON "twoFactorCodes" USING btree ("expires");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "two_factor_codes_tenant_id_idx" ON "twoFactorCodes" USING btree ("tenant_id");--> statement-breakpoint
-- At most one LIVE code per user, enforced by the database rather than only
-- by `issueTwoFactorCode`'s rotate-inside-an-advisory-lock. Verification reads
-- the newest row with consumed_at IS NULL and treats it as *the* code, so a
-- second unconsumed row would leave a stale code quietly valid. PARTIAL:
-- consumed rows are kept (the issuance budget counts them) and stay
-- unconstrained. Idempotent like the rest of this file.
CREATE UNIQUE INDEX IF NOT EXISTS "two_factor_codes_active_user_idx" ON "twoFactorCodes" USING btree ("userId") WHERE consumed_at IS NULL;
