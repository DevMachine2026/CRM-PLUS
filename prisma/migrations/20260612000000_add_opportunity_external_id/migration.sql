-- AlterTable
ALTER TABLE "opportunities" ADD COLUMN     "external_id" TEXT;

-- CreateIndex
CREATE INDEX "opportunities_tenant_id_external_id_idx" ON "opportunities"("tenant_id", "external_id");
