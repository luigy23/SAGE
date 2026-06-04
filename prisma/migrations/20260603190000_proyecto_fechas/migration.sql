-- Migration: proyecto_fechas
-- Tiempo del proyecto (fecha de inicio/fin). De estas fechas se derivan los
-- períodos académicos (semestres) que abarca. Columnas nullables.

ALTER TABLE "proyectos" ADD COLUMN "fechaInicio" TIMESTAMP(3);
ALTER TABLE "proyectos" ADD COLUMN "fechaFin" TIMESTAMP(3);
