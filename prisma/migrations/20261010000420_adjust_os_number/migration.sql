-- AlterTable
ALTER TABLE "service_orders" ALTER COLUMN "number" DROP DEFAULT;
DROP SEQUENCE "service_orders_number_seq";
