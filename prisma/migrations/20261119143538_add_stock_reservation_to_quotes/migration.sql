-- AlterTable
ALTER TABLE "parts" ADD COLUMN     "reservedQuantity" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "quote_items" ADD COLUMN     "partId" TEXT;

-- CreateIndex
CREATE INDEX "quote_items_partId_idx" ON "quote_items"("partId");

-- AddForeignKey
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
