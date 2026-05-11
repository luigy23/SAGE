-- CreateEnum
CREATE TYPE "TipoRecurso" AS ENUM ('AGENDA', 'MONITOREO');

-- CreateEnum
CREATE TYPE "AccionEdicion" AS ENUM ('ABRIR', 'CAMBIO', 'CERRAR');

-- AlterTable
ALTER TABLE "monitoreos" ADD COLUMN     "rehabilitada" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rehabilitadaCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ultimaRehabilitacion" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "rehabilitaciones_monitoreo" (
    "id" TEXT NOT NULL,
    "monitoreoId" TEXT NOT NULL,
    "rehabilitadoPor" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "estadoOriginal" "EstadoFormulario" NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observaciones" TEXT,

    CONSTRAINT "rehabilitaciones_monitoreo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ediciones_administrativas" (
    "id" TEXT NOT NULL,
    "tipo" "TipoRecurso" NOT NULL,
    "recursoId" TEXT NOT NULL,
    "editorId" TEXT NOT NULL,
    "accion" "AccionEdicion" NOT NULL,
    "campo" TEXT,
    "antes" JSONB,
    "despues" JSONB,
    "observaciones" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ediciones_administrativas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rehabilitaciones_monitoreo_monitoreoId_idx" ON "rehabilitaciones_monitoreo"("monitoreoId");

-- CreateIndex
CREATE INDEX "rehabilitaciones_monitoreo_rehabilitadoPor_idx" ON "rehabilitaciones_monitoreo"("rehabilitadoPor");

-- CreateIndex
CREATE INDEX "ediciones_administrativas_tipo_recursoId_idx" ON "ediciones_administrativas"("tipo", "recursoId");

-- CreateIndex
CREATE INDEX "ediciones_administrativas_editorId_idx" ON "ediciones_administrativas"("editorId");

-- AddForeignKey
ALTER TABLE "rehabilitaciones_monitoreo" ADD CONSTRAINT "rehabilitaciones_monitoreo_monitoreoId_fkey" FOREIGN KEY ("monitoreoId") REFERENCES "monitoreos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
