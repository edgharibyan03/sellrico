-- AlterTable
ALTER TABLE "sites" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "site_connect_codes" (
    "id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_connect_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "site_connect_codes_code_key" ON "site_connect_codes"("code");

-- CreateIndex
CREATE INDEX "site_connect_codes_site_id_idx" ON "site_connect_codes"("site_id");

-- AddForeignKey
ALTER TABLE "site_connect_codes" ADD CONSTRAINT "site_connect_codes_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
