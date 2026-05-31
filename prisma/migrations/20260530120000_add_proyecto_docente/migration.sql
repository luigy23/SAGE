-- CreateEnum
CREATE TYPE "TipoProyecto" AS ENUM ('INVESTIGACION', 'PROYECCION_SOCIAL');

-- CreateEnum
CREATE TYPE "RolEnProyecto" AS ENUM ('INVESTIGADOR_PRINCIPAL', 'COINVESTIGADOR', 'COORDINADOR', 'COGESTOR');

-- AlterEnum
ALTER TYPE "TipoEntidad" ADD VALUE 'PROYECTO_DOCENTE';

-- CreateTable
CREATE TABLE "proyectos_docente" (
    "id" TEXT NOT NULL,
    "docenteId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "tipo" "TipoProyecto" NOT NULL,
    "rolDocente" "RolEnProyecto" NOT NULL,
    "entidadConvocatoria" TEXT,
    "periodoInicio" TEXT,
    "estado" "EstadoFormulario" NOT NULL DEFAULT 'BORRADOR',
    "observacionesAdmin" TEXT,
    "revisadoPor" TEXT,
    "revisadoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proyectos_docente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "proyectos_docente_docenteId_estado_idx" ON "proyectos_docente"("docenteId", "estado");

-- AddForeignKey
ALTER TABLE "proyectos_docente" ADD CONSTRAINT "proyectos_docente_docenteId_fkey"
    FOREIGN KEY ("docenteId") REFERENCES "docentes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
