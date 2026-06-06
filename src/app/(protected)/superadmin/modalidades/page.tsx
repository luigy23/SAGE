import { listParametrosModalidad } from "@/lib/actions/superadmin-actions"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EditModalidadDialog } from "@/components/superadmin/edit-modalidad-dialog"
import { getModalidadLabel } from "@/lib/utils/modalidad"

export default async function ParametrosModalidadPage() {
  const params = await listParametrosModalidad()

  return (
    <div className="container mx-auto py-10 max-w-7xl">
      <Card>
        <CardHeader className="space-y-1 pb-6">
          <CardTitle className="text-2xl font-bold">Parámetros por Modalidad</CardTitle>
          <CardDescription>
            Carga horaria, mínimos de docencia y restricciones especiales por tipo de
            vinculación docente. Acuerdo 048/2018 — Art. 3, Art. 4 y Art. 10.
            Cambios visibles tras 60 segundos (cache TTL).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Modalidad</TableHead>
                  <TableHead>Sede</TableHead>
                  <TableHead className="text-center whitespace-nowrap" title="Máximo de horas que puede laborar por semana">Máx h/sem</TableHead>
                  <TableHead className="text-center whitespace-nowrap" title="Tope total de horas en el semestre">Tope sem.</TableHead>
                  <TableHead className="text-center whitespace-nowrap" title="Si el tope semestral bloquea el envío (duro) o solo advierte">Estricto</TableHead>
                  <TableHead className="text-center whitespace-nowrap" title="Mínimo de horas de docencia en el semestre">Mín. doc.</TableHead>
                  <TableHead className="text-center whitespace-nowrap" title="Mínimo de docencia reducido si tiene proyectos activos (Art. 3 Par. 1)">Mín. doc. c/proy.</TableHead>
                  <TableHead className="text-center whitespace-nowrap" title="Máximo de horas/semana en Investigación + Proyección Social (solo cátedra, Art. 3 Par. 2)">Inv+PS/sem</TableHead>
                  <TableHead className="text-center">Activo</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {params.map((p) => (
                  <TableRow key={p.id} className={!p.activo ? "opacity-50" : ""}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{p.modalidad}</span>
                        <span className="text-xs text-muted-foreground">
                          {getModalidadLabel(p.modalidad)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {p.sedeAplicable ? (
                        <Badge variant="outline">{p.sedeAplicable}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Todas</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-mono">
                      {p.horasSemanalMax}
                    </TableCell>
                    <TableCell className="text-center font-mono">
                      {p.modalidad === "INVITADO" ? (
                        <span
                          className="text-xs text-muted-foreground"
                          title="El 100% del invitado son las HORAS CONTRATADAS que autoriza el Consejo Académico (se fijan por docente), no un valor de esta tabla."
                        >
                          según horas contratadas
                        </span>
                      ) : (
                        p.horasSemestralMax ?? (
                          <span
                            className="text-xs text-muted-foreground"
                            title="Se deriva automáticamente: máx h/semana × semanas del período de la modalidad"
                          >
                            {p.horasSemanalMax} × semanas
                          </span>
                        )
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {p.horasSemestralEstricto ? "✓" : "—"}
                    </TableCell>
                    <TableCell className="text-center font-mono">
                      {p.minDocencia ?? "—"}
                    </TableCell>
                    <TableCell className="text-center font-mono">
                      {p.minDocenciaConProyectos ?? "—"}
                    </TableCell>
                    <TableCell className="text-center font-mono">
                      {p.maxInvProySocSemanal ?? "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      {p.activo ? "✓" : "✗"}
                    </TableCell>
                    <TableCell className="text-right">
                      <EditModalidadDialog parametro={p} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Leyenda — para que ninguna columna quede abierta a interpretación */}
          <div className="mt-4 space-y-1.5 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Cómo leer esta tabla</p>
            <ul className="list-inside list-disc space-y-1">
              <li><span className="font-medium text-foreground/80">Máx h/semana</span>: tope de horas que puede trabajar por semana. Cambia según <span className="font-medium">tiempo completo (40) vs medio tiempo (20)</span> — por eso TC y MT son filas distintas y editables.</li>
              <li><span className="font-medium text-foreground/80">Tope semestral</span>: máximo de horas en el semestre. Planta lo tiene fijo (880/440); las demás lo <span className="font-medium">derivan</span> (máx h/sem × semanas). El <span className="font-medium">Invitado</span> no usa este valor: su 100% son las <span className="font-medium">horas contratadas</span> que se fijan por docente (Art. 4f).</li>
              <li><span className="font-medium text-foreground/80">Mín. docencia</span> / <span className="font-medium text-foreground/80">con proyecto</span>: piso de horas de docencia; baja si el docente tiene proyectos activos (Art. 3 Par. 1). Visitante no tiene piso fijo aquí: es 60% del total (parámetro global).</li>
              <li><span className="font-medium text-foreground/80">Máx Inv+PS (h/sem)</span>: solo aplica a <span className="font-medium">cátedra</span> (máx 4 h/sem en Investigación + Proyección Social, Art. 3 Par. 2).</li>
              <li><span className="font-medium text-foreground/80">Cátedra</span> tiene una fila por sede porque las horas/semana cambian: <span className="font-medium">16 en Neiva, 19 en regionales</span> (Art. 4d).</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
