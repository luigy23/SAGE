import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { getPeriodoActivo } from "@/lib/utils/periodo"
import { AgendaWizardForm } from "@/components/agenda/AgendaWizardForm"
import { NuevaAgendaView } from "@/components/agenda/NuevaAgendaView"
import { AgendaReadOnly } from "@/components/agenda/AgendaReadOnly"
import type { AgendaConRelaciones } from "@/lib/types/agenda"
import type { AgendaWizardFormData } from "@/lib/schemas/agenda-schema"
import { DiscardDraftButton } from "@/components/agenda/DiscardDraftButton"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, FileText, Pencil } from "lucide-react"
import Link from "next/link"

/**
 * Página principal de Agenda Semestral (FO-19)
 *
 * Server Component (RSC) puro — actúa como controlador de flujo condicional:
 *
 * 1. Obtiene el Docente desde la sesión autenticada
 * 2. Calcula el periodo activo con getPeriodoActivo()
 * 3. Busca la AgendaSemestral del docente para ese periodo
 * 4. Renderiza condicionalmente:
 *    - !agenda       → Vista de bienvenida + <AgendaWizardForm>
 *    - BORRADOR      → Resumen del borrador + Continuar Editando / Descartar
 *    - ENVIADO       → <AgendaReadOnly>
 */
export default async function AgendaPage() {
  // ==========================================
  // 1. Autenticación
  // ==========================================
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const docente = await prisma.docente.findUnique({
    where: { id: session.user.id },
  })

  if (!docente) redirect("/auth/login")

  // ==========================================
  // 2. Periodo activo
  // ==========================================
  const periodo = getPeriodoActivo()

  // ==========================================
  // 3. Buscar agenda del periodo con relaciones
  // ==========================================
  const agenda = await prisma.agendaSemestral.findUnique({
    where: {
      docenteId_periodo: {
        docenteId: docente.id,
        periodo,
      },
    },
    include: {
      docente: true,
      cursos: {
        include: { horarios: true },
        orderBy: { numeroCurso: "asc" },
      },
      otrasActividadesDocencia: { orderBy: { nombre: "asc" } },
      actividadesInvestigacion: { orderBy: { nombre: "asc" } },
      actividadesProyeccionSocial: { orderBy: { nombre: "asc" } },
      actividadesGestion: { orderBy: { nombre: "asc" } },
    },
  })

  // ==========================================
  // 4. Cursos guardados (para el Combobox del Wizard)
  // ==========================================
  const cursosGuardados = await prisma.cursoGuardado.findMany({
    where: { docenteId: docente.id },
    orderBy: { nombreCurso: "asc" },
  })

  // ==========================================
  // CASO A: No hay agenda → Vista de bienvenida
  // ==========================================
  if (!agenda) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">
            Agenda Semestral (FO-19)
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Periodo actual:{" "}
            <Badge variant="secondary" className="ml-1 text-xs">
              {periodo}
            </Badge>
          </p>
        </div>

        <NuevaAgendaView
          docente={docente}
          cursosGuardados={cursosGuardados}
          periodo={periodo}
        />

        {/* Lista de agendas de periodos anteriores */}
        <PreviousAgendasList
          docenteId={docente.id}
          currentPeriodo={periodo}
        />
      </div>
    )
  }

  // ==========================================
  // CASO B: BORRADOR → Resumen + Continuar Editando / Descartar
  // ==========================================
  if (agenda.estado === "BORRADOR") {
    // Transformar datos de Prisma → formato AgendaWizardFormData (RHF)
    const defaultValues: AgendaWizardFormData = {
      cursos: agenda.cursos.map((c) => ({
        numeroCurso: c.numeroCurso,
        nombreCurso: c.nombreCurso,
        subgrupo: c.subgrupo || "",
        sede: c.sede || "",
        horasPresenciales: c.horasPresenciales,
        creditos: c.creditos,
        semanas: c.semanas,
        dedicacionPeriodo: c.dedicacionPeriodo,
        horarios: {
          lunes: c.horarios[0]?.lunes ?? null,
          martes: c.horarios[0]?.martes ?? null,
          miercoles: c.horarios[0]?.miercoles ?? null,
          jueves: c.horarios[0]?.jueves ?? null,
          viernes: c.horarios[0]?.viernes ?? null,
          sabado: c.horarios[0]?.sabado ?? null,
          domingo: c.horarios[0]?.domingo ?? null,
        },
      })),
      otrasActividadesDocencia: agenda.otrasActividadesDocencia.map(
        (a) => ({
          nombre: a.nombre,
          descripcion: a.descripcion || "",
          dedicacionPeriodo: a.dedicacionPeriodo,
        })
      ),
      actividadesInvestigacion: agenda.actividadesInvestigacion.map(
        (a) => ({
          nombre: a.nombre,
          descripcion: a.descripcion || "",
          dedicacionPeriodo: a.dedicacionPeriodo,
        })
      ),
      actividadesProyeccionSocial: agenda.actividadesProyeccionSocial.map(
        (a) => ({
          nombre: a.nombre,
          descripcion: a.descripcion || "",
          dedicacionPeriodo: a.dedicacionPeriodo,
        })
      ),
      actividadesGestion: agenda.actividadesGestion.map((a) => ({
        nombre: a.nombre,
        descripcion: a.descripcion || "",
        dedicacionPeriodo: a.dedicacionPeriodo,
      })),
    }

    // Calcular total de horas del borrador para el resumen
    const totalHorasBorrador =
      defaultValues.cursos.reduce(
        (s, c) => s + (Number(c.dedicacionPeriodo) || 0),
        0
      ) +
      defaultValues.otrasActividadesDocencia.reduce(
        (s, a) => s + (Number(a.dedicacionPeriodo) || 0),
        0
      ) +
      defaultValues.actividadesInvestigacion.reduce(
        (s, a) => s + (Number(a.dedicacionPeriodo) || 0),
        0
      ) +
      defaultValues.actividadesProyeccionSocial.reduce(
        (s, a) => s + (Number(a.dedicacionPeriodo) || 0),
        0
      ) +
      defaultValues.actividadesGestion.reduce(
        (s, a) => s + (Number(a.dedicacionPeriodo) || 0),
        0
      )

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">
              Agenda Semestral (FO-19)
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Periodo:{" "}
              <Badge variant="secondary" className="ml-1 text-xs">
                {periodo}
              </Badge>
              <Badge
                variant="outline"
                className="ml-2 border-yellow-500 text-xs text-yellow-600"
              >
                BORRADOR
              </Badge>
            </p>
          </div>
        </div>

        {/* Resumen del borrador */}
        <Card className="border-yellow-500/30 bg-yellow-50/50 dark:bg-yellow-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Pencil className="h-5 w-5" />
              Borrador en Progreso
            </CardTitle>
            <CardDescription>
              Última actualización:{" "}
              {new Date(agenda.updatedAt).toLocaleDateString("es-CO", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-lg border bg-background p-3 text-center">
                <p className="text-2xl font-bold tabular-nums">
                  {defaultValues.cursos.length}
                </p>
                <p className="text-xs text-muted-foreground">Cursos</p>
              </div>
              <div className="rounded-lg border bg-background p-3 text-center">
                <p className="text-2xl font-bold tabular-nums">
                  {defaultValues.actividadesInvestigacion.length +
                    defaultValues.actividadesProyeccionSocial.length +
                    defaultValues.actividadesGestion.length +
                    defaultValues.otrasActividadesDocencia.length}
                </p>
                <p className="text-xs text-muted-foreground">Actividades</p>
              </div>
              <div className="rounded-lg border bg-background p-3 text-center">
                <p className="text-2xl font-bold tabular-nums">
                  {totalHorasBorrador}h
                </p>
                <p className="text-xs text-muted-foreground">
                  Horas Registradas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Wizard con datos pre-cargados (Continuar Editando) */}
        <AgendaWizardForm
          docente={docente}
          cursosGuardados={cursosGuardados}
          periodo={periodo}
          defaultValues={defaultValues}
        />

        {/* Botón Descartar — client component para manejar el server action */}
        <div className="flex justify-center border-t pt-4">
          <DiscardDraftButton periodo={periodo} />
        </div>
      </div>
    )
  }

  // ==========================================
  // CASO C: ENVIADO → Vista de solo lectura
  // ==========================================
  return <AgendaReadOnly agenda={agenda as AgendaConRelaciones} />
}

// ==========================================
// Sub-componente: Lista de agendas anteriores (RSC)
// ==========================================

async function PreviousAgendasList({
  docenteId,
  currentPeriodo,
}: {
  docenteId: string
  currentPeriodo: string
}) {
  const previousAgendas = await prisma.agendaSemestral.findMany({
    where: {
      docenteId,
      periodo: { not: currentPeriodo },
    },
    orderBy: { periodo: "desc" },
    take: 5,
    select: {
      id: true,
      periodo: true,
      estado: true,
      updatedAt: true,
    },
  })

  if (previousAgendas.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5" />
          Agendas Anteriores
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {previousAgendas.map((a) => (
            <Link
              key={a.id}
              href={`/agenda/${a.id}`}
              className="flex items-center justify-between rounded-lg border p-3 text-sm transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <Badge variant="secondary">{a.periodo}</Badge>
                <span className="text-muted-foreground">
                  {new Date(a.updatedAt).toLocaleDateString("es-CO", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              <Badge
                variant={a.estado === "ENVIADO" ? "default" : "outline"}
                className={
                  a.estado === "ENVIADO"
                    ? "bg-green-600 hover:bg-green-600"
                    : ""
                }
              >
                {a.estado}
              </Badge>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
