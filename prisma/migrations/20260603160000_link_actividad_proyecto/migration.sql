-- Migration: link_actividad_proyecto
-- Vincula actividades de investigación / proyección social a un Proyecto aprobado,
-- para que las horas de la actividad salgan de las horas asignadas al docente en
-- ese proyecto. Columnas nullables + FK con SET NULL (si el proyecto se borra,
-- la actividad queda sin vínculo, no se pierde).

ALTER TABLE "actividades_investigacion" ADD COLUMN "proyectoId" TEXT;
ALTER TABLE "actividades_proyeccion_social" ADD COLUMN "proyectoId" TEXT;

ALTER TABLE "actividades_investigacion" ADD CONSTRAINT "actividades_investigacion_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyectos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "actividades_proyeccion_social" ADD CONSTRAINT "actividades_proyeccion_social_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyectos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
