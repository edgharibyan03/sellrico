-- AlterTable
ALTER TABLE "sites" ADD COLUMN "last_synced_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "products" ADD COLUMN "stock_status" VARCHAR(32);
ALTER TABLE "products" ADD COLUMN "category" TEXT;

-- CreateIndex
CREATE INDEX "products_site_id_name_idx" ON "products"("site_id", "name");
