-- Migration: add_solicitud_cambio_perfil
-- Crea el modelo SolicitudCambioPerfil para el flujo de solicitud de cambios
-- de datos del perfil del docente (programa, modalidad, cargo, etc), con
-- aprobación del admin. También añade el valor SOLICITUD_PERFIL al enum
-- TipoEntidad para registrar acciones en AuditoriaLog.

ALTER TYPE "TipoEntidad" ADD VALUE IF NOT EXISTS 'SOLICITUD_PERFIL';

CREATE TABLE "solicitudes_cambio_perfil" (
  "id"                  TEXT NOT NULL,
  "docenteId"           TEXT NOT NULL,
  "estado"              "EstadoFormulario" NOT NULL DEFAULT 'ENVIADO',
  "camposAntes"         JSONB NOT NULL,
  "camposDespues"       JSONB NOT NULL,
  "motivoSolicitud"     TEXT,
  "observacionesAdmin"  TEXT,
  "revisadoPor"         TEXT,
  "revisadoEn"          TIMESTAMP(3),
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL,

  CONSTRAINT "solicitudes_cambio_perfil_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "solicitudes_cambio_perfil_docenteId_estado_idx"
  ON "solicitudes_cambio_perfil"("docenteId", "estado");

ALTER TABLE "solicitudes_cambio_perfil"
  ADD CONSTRAINT "solicitudes_cambio_perfil_docenteId_fkey"
  FOREIGN KEY ("docenteId") REFERENCES "docentes"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
