-- AlterTable
ALTER TABLE "tenants" ADD COLUMN "maxConcurrentUsers" INTEGER NOT NULL DEFAULT 3;
