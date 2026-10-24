-- CreateTable
CREATE TABLE "assistant_settings" (
    "id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL DEFAULT 'Shoppio Assistant',
    "welcome_message" TEXT NOT NULL,
    "language" VARCHAR(16) NOT NULL DEFAULT 'en',
    "tone" VARCHAR(32) NOT NULL DEFAULT 'friendly',
    "primary_color" VARCHAR(16) NOT NULL DEFAULT '#0F766E',
    "suggested_questions" JSONB NOT NULL DEFAULT '[]',
    "offset_right" INTEGER NOT NULL DEFAULT 20,
    "offset_bottom" INTEGER NOT NULL DEFAULT 20,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assistant_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assistant_settings_site_id_key" ON "assistant_settings"("site_id");

-- AddForeignKey
ALTER TABLE "assistant_settings" ADD CONSTRAINT "assistant_settings_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
