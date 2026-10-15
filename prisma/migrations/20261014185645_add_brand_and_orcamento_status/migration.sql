-- AlterEnum
ALTER TYPE "ServiceOrderStatus" ADD VALUE 'ORCAMENTO';

-- AlterTable
ALTER TABLE "equipment_models" ADD COLUMN     "brand" TEXT;
