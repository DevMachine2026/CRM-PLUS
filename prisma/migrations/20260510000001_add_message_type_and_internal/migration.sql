-- AlterTable
ALTER TABLE "messages" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'text';
ALTER TABLE "messages" ADD COLUMN "is_internal" BOOLEAN NOT NULL DEFAULT false;
