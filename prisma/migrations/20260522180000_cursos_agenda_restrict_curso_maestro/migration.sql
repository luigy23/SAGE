-- Cambia ON DELETE de SET NULL a RESTRICT en cursos_agenda.cursoMaestroId.
-- Defensa en capa DB del safeguard de borrado de CursoMaestro:
-- si al menos un CursoAgenda referencia un CursoMaestro, la DB rechaza
-- el DELETE con error de FK constraint. La capa app (eliminarCursoMaestro)
-- sigue siendo la primera línea con mensaje legible para el usuario.

ALTER TABLE "cursos_agenda" DROP CONSTRAINT "cursos_agenda_cursoMaestroId_fkey";

ALTER TABLE "cursos_agenda" ADD CONSTRAINT "cursos_agenda_cursoMaestroId_fkey"
  FOREIGN KEY ("cursoMaestroId") REFERENCES "cursos_maestro"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
