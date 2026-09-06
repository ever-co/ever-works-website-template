-- Refund claim column for admin billing issues (Spec 051)
--
-- Split out of 0040 rather than edited into it: Drizzle records applied
-- migrations by tag, so a database that already ran 0040 would never see an
-- ALTER added there afterwards. A migration that has shipped is immutable.
--
-- `refund_claimed_at` is taken by the single request that owns an in-flight
-- refund, so two admins pressing "Refund" at the same moment cannot both reach
-- the payment provider. It doubles as the ownership token: the request that
-- finalises the refund must still match the timestamp it claimed with.

ALTER TABLE "billing_issues" ADD COLUMN IF NOT EXISTS "refund_claimed_at" timestamp;
