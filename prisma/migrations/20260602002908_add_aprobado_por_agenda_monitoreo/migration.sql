-- AlterTable
ALTER TABLE "agendas_semestrales" ADD COLUMN     "aprobadoEn" TIMESTAMP(3),
ADD COLUMN     "aprobadoPorId" TEXT;

-- AlterTable
ALTER TABLE "monitoreos" ADD COLUMN     "aprobadoEn" TIMESTAMP(3),
ADD COLUMN     "aprobadoPorId" TEXT;

-- AddForeignKey
ALTER TABLE "agendas_semestrales" ADD CONSTRAINT "agendas_semestrales_aprobadoPorId_fkey" FOREIGN KEY ("aprobadoPorId") REFERENCES "docentes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoreos" ADD CONSTRAINT "monitoreos_aprobadoPorId_fkey" FOREIGN KEY ("aprobadoPorId") REFERENCES "docentes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
