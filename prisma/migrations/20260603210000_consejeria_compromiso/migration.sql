-- Migration: consejeria_compromiso
-- Fuente de verdad del compromiso de consejería multi-semestre: el docente elige
-- por cuántos semestres asume una cohorte; el sistema la reserva (exclusiva por
-- programa+cohorte) al ENVIAR la agenda y la libera si se rechaza o al cumplirse.

CREATE TYPE "EstadoCompromiso" AS ENUM ('ACTIVO', 'LIBERADO');

CREATE TABLE "consejeria_compromisos" (
    "id" TEXT NOT NULL,
    "docenteId" TEXT NOT NULL,
    "programa" TEXT NOT NULL,
    "cohorte" TEXT NOT NULL,
    "periodoInicio" TEXT NOT NULL,
    "semestresCompromiso" INTEGER NOT NULL,
    "estado" "EstadoCompromiso" NOT NULL DEFAULT 'ACTIVO',
    "creadaEnPeriodo" TEXT NOT NULL,
    "liberadoPor" TEXT,
    "liberadoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consejeria_compromisos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "consejeria_compromisos_programa_cohorte_estado_idx" ON "consejeria_compromisos"("programa", "cohorte", "estado");
CREATE INDEX "consejeria_compromisos_docenteId_estado_idx" ON "consejeria_compromisos"("docenteId", "estado");

ALTER TABLE "consejeria_compromisos" ADD CONSTRAINT "consejeria_compromisos_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "docentes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
