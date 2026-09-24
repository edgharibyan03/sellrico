-- AlterTable
ALTER TABLE "users" ADD COLUMN "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "users" ADD COLUMN "onboarding_completed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "onboarding_step" INTEGER NOT NULL DEFAULT 0;

-- Drop default on name after backfill (new rows must supply name)
ALTER TABLE "users" ALTER COLUMN "name" DROP DEFAULT;
