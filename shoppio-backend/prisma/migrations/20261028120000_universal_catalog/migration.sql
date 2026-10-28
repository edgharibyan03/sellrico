-- Optional catalog enrichment for universal search (backward-compatible).
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "sku" VARCHAR(128);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "tags" JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "attributes" JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS "products_site_id_sku_idx" ON "products"("site_id", "sku");

-- Per-site industry profile + optional extra AI instructions.
ALTER TABLE "assistant_settings" ADD COLUMN IF NOT EXISTS "industry" VARCHAR(32) NOT NULL DEFAULT 'auto';
ALTER TABLE "assistant_settings" ADD COLUMN IF NOT EXISTS "custom_instructions" TEXT NOT NULL DEFAULT '';
