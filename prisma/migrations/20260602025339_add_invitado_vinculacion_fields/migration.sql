-- AlterTable
ALTER TABLE "docentes" ADD COLUMN     "invAutorizadoCA" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "invFechaDesde" TIMESTAMP(3),
ADD COLUMN     "invFechaHasta" TIMESTAMP(3),
ADD COLUMN     "invHorasContratadas" INTEGER,
ADD COLUMN     "invObjeto" TEXT;
