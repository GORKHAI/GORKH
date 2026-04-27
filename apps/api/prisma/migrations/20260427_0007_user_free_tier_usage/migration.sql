CREATE TABLE "user_free_tier_usage" (
  "user_id" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "request_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "input_tokens" INTEGER NOT NULL DEFAULT 0,
  "output_tokens" INTEGER NOT NULL DEFAULT 0,
  "total_cost_usd" DECIMAL(10, 6) NOT NULL DEFAULT 0,
  "model" VARCHAR(64) NOT NULL,
  "status" VARCHAR(32) NOT NULL,
  PRIMARY KEY ("user_id", "request_id")
);

CREATE INDEX "idx_user_free_tier_usage_user_time" ON "user_free_tier_usage"("user_id", "created_at" DESC);
