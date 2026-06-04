import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { getPeriodoActivoConFechas } from "@/lib/utils/periodo-server"
import { AgendaWizardForm } from "@/components/agenda/AgendaWizardForm"
import { NuevaAgendaView } from "@/components/agenda/NuevaAgendaView"
import { AgendaReadOnly } from "@/components/agenda/AgendaReadOnly"
import type { AgendaConRelaciones } from "@/lib/types/agenda"
import type { AgendaWizardFormData } from "@/lib/schemas/agenda-schema"
import { DiscardDraftButton } from "@/components/agenda/DiscardDraftButton"
import { resolveGlobales, resolveAgendaLimits } from "@/lib/rules/resolver"
import { esModalidadNoPlanta } from "@/lib/auth/autoridad"
import { PeriodosCubiertos } from "@/components/agenda/PeriodosCubiertos"
import { CorregirAgendaButton } from "@/components/agenda/CorregirAgendaButton"
import { DEFAULT_FORM_VALUES } from "@/lib/schemas/agenda-schema"
import {
  getConsejeriaInyectada,
  getCohortesDisponibles,
  inyectarConsejeriaEnActividades,
} from "@/lib/consejeria"
import { getProyectosAprobadosDocente } from "@/lib/actions/proyecto-actions"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, FileText, Pencil, AlertTriangle, CheckCircle2 } from "lucide-react"
import { resolveFormulasCursosAction } from "@/lib/actions/formulas"
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

  // No-Planta: el docente NO diligencia su propia agenda — su jefe de programa la
  // elabora (Art. 4 Par.1 / Art. 6). Aquí solo puede consultarla en solo lectura.
  const esNoPlanta = esModalidadNoPlanta(docente.modalidad)

  // ==========================================
  // 2. Periodo activo + parámetros globales (cascada DB → fallback)
  // ==========================================
  const periodoInfo = await getPeriodoActivoConFechas()

  if (!periodoInfo) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Agenda Semestral (FO-19)</h1>
        </div>
        <Card className="border-yellow-500/30 bg-yellow-50/50 dark:bg-yellow-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Período académico no disponible
            </CardTitle>
            <CardDescription>
              No hay un período académico activo en este momento. No es posible crear
              ni modificar agendas. Contacta al administrador para que active el período
              correspondiente al semestre actual.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const periodo = periodoInfo.nombre
  const periodoRow = await prisma.periodoAcademico.findUnique({
    where: { nombre: periodo },
    select: { id: true },
  })
  const [globales, formulas, agendaLimits] = await Promise.all([
    resolveGlobales(periodoRow?.id ?? null, periodoInfo.semanasCalculadas),
    resolveFormulasCursosAction(periodoRow?.id ?? null, docente.facultad ?? null),
    resolveAgendaLimits(
      {
        modalidad: docente.modalidad,
        sedeBase: docente.sedeBase,
        doctorado: docente.doctorado,
        cargoAdministrativo: docente.cargoAdministrativo,
        proyectosActivos: docente.proyectosActivos,
        tipoCargo: docente.tipoCargo ?? null,
        semanasVinculacion: docente.semanasVinculacion ?? null,
        vinculacionDesde: docente.vinculacionDesde ?? null,
        vinculacionHasta: docente.vinculacionHasta ?? null,
        invHorasContratadas: docente.invHorasContratadas ?? null,
      },
      periodoRow?.id ?? null
    ),
  ])
  const semanasPeriodo = globales.semanasPeriodo

  // ==========================================
  // 3. Quick agenda state check (to decide if window check is needed)
  // ENVIADO agendas bypass the submission window — docentes must always see their sent form.
  // ==========================================
  const agendaEstadoQuick = await prisma.agendaSemestral.findUnique({
    where: { docenteId_periodo: { docenteId: docente.id, periodo } },
    select: { estado: true },
  })

  // Window check — only gates BORRADOR and new agendas, not already-processed ones.
  // No-Planta nunca diligencia, así que la ventana de entrega no le aplica (solo lectura).
  const estadoBypassesWindow = ["ENVIADO", "APROBADO", "RECHAZADO"].includes(agendaEstadoQuick?.estado ?? "")
  if (!estadoBypassesWindow && !esNoPlanta) {
    const now = new Date()
    const { agendaDesde, agendaHasta } = periodoInfo

    if (!agendaDesde || !agendaHasta) {
      return (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Agenda Semestral (FO-19)</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Período actual:{" "}
              <Badge variant="secondary" className="ml-1 text-xs">{periodo}</Badge>
            </p>
          </div>
          {agendaEstadoQuick?.estado === "BORRADOR" && (
            <Card className="border-yellow-500/30 bg-yellow-50/50 dark:bg-yellow-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Pencil className="h-4 w-4" />
                  Tienes un borrador guardado para este período
                </CardTitle>
                <CardDescription>
                  Podrás continuar editando cuando el administrador configure la ventana de entrega.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
          <Card className="border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarDays className="h-5 w-5 text-blue-600" />
                Ventana de entrega no configurada
              </CardTitle>
              <CardDescription>
                El administrador aún no ha definido el período de entrega de agendas para el semestre{" "}
                <span className="font-mono font-medium">{periodo}</span>. Consulta con tu coordinador
                académico para conocer las fechas.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      )
    }

    if (now < agendaDesde) {
      return (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Agenda Semestral (FO-19)</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Período actual:{" "}
              <Badge variant="secondary" className="ml-1 text-xs">{periodo}</Badge>
            </p>
          </div>
          <Card className="border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarDays className="h-5 w-5 text-blue-600" />
                La ventana de entrega aún no está abierta
              </CardTitle>
              <CardDescription>
                Podrás diligenciar tu Agenda Semestral a partir del{" "}
                <span className="font-medium text-foreground">
                  {agendaDesde.toLocaleDateString("es-CO", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                . El sistema abrirá el acceso automáticamente en esa fecha.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      )
    }

    if (now > agendaHasta) {
      return (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Agenda Semestral (FO-19)</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Período actual:{" "}
              <Badge variant="secondary" className="ml-1 text-xs">{periodo}</Badge>
            </p>
          </div>
          {agendaEstadoQuick?.estado === "BORRADOR" && (
            <Card className="border-yellow-500/30 bg-yellow-50/50 dark:bg-yellow-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Pencil className="h-4 w-4" />
                  Tienes un borrador guardado para este período
                </CardTitle>
                <CardDescription>
                  La ventana de entrega ya cerró. Contacta al administrador si necesitas enviar tu agenda.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
          <Card className="border-orange-500/30 bg-orange-50/50 dark:bg-orange-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                La ventana de entrega está cerrada
              </CardTitle>
              <CardDescription>
                La ventana de entrega de agendas para el semestre{" "}
                <span className="font-mono font-medium">{periodo}</span> cerró el{" "}
                <span className="font-medium text-foreground">
                  {agendaHasta.toLocaleDateString("es-CO", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                . Contacta al administrador si necesitas habilitar el acceso.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      )
    }
  }

  // ==========================================
  // 4. Buscar agenda del periodo con relaciones
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
        orderBy: { numeroCurso: "asc" },
      },
      otrasActividadesDocencia: { orderBy: { nombre: "asc" } },
      actividadesInvestigacion: { orderBy: { nombre: "asc" } },
      actividadesProyeccionSocial: { orderBy: { nombre: "asc" } },
      actividadesGestion: { orderBy: { nombre: "asc" } },
    },
  })

  // ==========================================
  // 4. Catálogo Maestro (oficial, gestionado por SUPERADMIN)
  // ==========================================
  const cursosMaestros = await prisma.cursoMaestro.findMany({
    where: { estado: true },
    orderBy: [{ componente: "asc" }, { codigo: "asc" }],
    select: {
      id: true,
      codigo: true,
      nombre: true,
      creditos: true,
      tipo: true,
      facultad: true,
      componente: true,
      horasSemT: true,
      horasSemP: true,
      horasSemI: true,
    },
  })

  const catalogoActividades = await prisma.catalogoActividad.findMany({
    where: { activo: true },
    orderBy: [{ categoria: "asc" }, { nombre: "asc" }],
    select: {
      id: true,
      categoria: true,
      nombre: true,
      descripcion: true,
      topeSemestralH: true,
      topePorUnidad: true,
      unidadMax: true,
      topeSemanalHPorUnidad: true,
      cantidadMaxSimultaneos: true,
      restriccionTemporalAnos: true,
      aplicaUnoPorFacultad: true,
      aplicaUnoPorSede: true,
      aplicaUnoPorPrograma: true,
      requiereResolucionRector: true,
      requiereProyectoAprobado: true,
      articuloOrigen: true,
    },
  })

  // Proyectos aprobados del docente que abarcan este período (para Investigación/PS).
  const proyectosAprobados = await getProyectosAprobadosDocente(docente.id, periodo)

  // Consejería: compromisos amarrados (inyección forzosa) + cohortes disponibles.
  const consejeriaInyectada = await getConsejeriaInyectada(docente.id, periodo)
  const consejeria = {
    compromisos: consejeriaInyectada?.compromisos ?? [],
    disponibles: await getCohortesDisponibles(docente.programa, periodo),
  }

  // ==========================================
  // CASO A: No hay agenda → Vista de bienvenida
  // ==========================================
  if (!agenda) {
    // No-Planta: no hay vista de creación propia. La elabora el jefe de programa.
    if (esNoPlanta) {
      return (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Agenda Semestral (FO-19)</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Periodo actual:{" "}
              <Badge variant="secondary" className="ml-1 text-xs">{periodo}</Badge>
            </p>
          </div>
          <Card className="border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-blue-600" />
                Tu jefe de programa elaborará tu agenda
              </CardTitle>
              <CardDescription>
                Por tu modalidad de vinculación, la Agenda Semestral (FO-19) del período{" "}
                <span className="font-mono font-medium">{periodo}</span> la diligencia tu jefe de
                programa. Podrás consultarla aquí en cuanto esté lista.
              </CardDescription>
            </CardHeader>
          </Card>

          <PeriodosCubiertos
            vinculacionDesde={docente.vinculacionDesde}
            vinculacionHasta={docente.vinculacionHasta}
          />

          {/* Lista de agendas de periodos anteriores */}
          <PreviousAgendasList docenteId={docente.id} currentPeriodo={periodo} />
        </div>
      )
    }

    // Inyección forzosa: si el docente tiene cohortes amarradas, la tarjeta de
    // Consejería aparece pre-sembrada (bloqueada, horas vacías).
    const nuevaDefaults: AgendaWizardFormData | undefined = consejeriaInyectada
      ? {
          ...DEFAULT_FORM_VALUES,
          otrasActividadesDocencia: inyectarConsejeriaEnActividades([], consejeriaInyectada),
        }
      : undefined

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
          cursosMaestros={cursosMaestros}
          catalogoActividades={catalogoActividades}
          periodo={periodo}
          semanasPeriodo={semanasPeriodo}
          semanasMaximas={agendaLimits.semanasMaximas}
          defaultValues={nuevaDefaults}
          formulas={formulas}
          agendaLimits={agendaLimits}
          proyectosAprobados={proyectosAprobados}
          consejeria={consejeria}
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
    // No-Planta: el borrador lo está elaborando el jefe de programa. El docente
    // solo lo consulta en solo lectura (no puede editar ni descartar).
    if (esNoPlanta) {
      return (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-md border border-blue-200 bg-blue-50 p-4 text-sm dark:border-blue-900 dark:bg-blue-950">
            <FileText className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="font-semibold text-blue-900 dark:text-blue-200">
                Agenda en preparación por tu jefe de programa
              </p>
              <p className="mt-0.5 text-blue-800 dark:text-blue-300">
                Esta es una vista previa de solo lectura de tu Agenda Semestral (FO-19) para el
                período <span className="font-mono font-medium">{agenda.periodo}</span>. Tu jefe de
                programa la completará y enviará.
              </p>
            </div>
          </div>
          <PeriodosCubiertos
            vinculacionDesde={docente.vinculacionDesde}
            vinculacionHasta={docente.vinculacionHasta}
          />
          <AgendaReadOnly
            agenda={agenda as AgendaConRelaciones}
            semanasPeriodo={semanasPeriodo}
          />
        </div>
      )
    }

    // Transformar datos de Prisma → formato AgendaWizardFormData (RHF)
    const defaultValues: AgendaWizardFormData = {
      cursos: agenda.cursos.map((c) => ({
        cursoMaestroId: c.cursoMaestroId ?? null,
        // Recupera tipo desde catálogo maestro para usar la fórmula correcta
        tipoCurso: cursosMaestros.find((m) => m.id === c.cursoMaestroId)?.tipo ?? null,
        numeroCurso: c.numeroCurso,
        nombreCurso: c.nombreCurso,
        sede: c.sede || "",
        horasPresenciales: c.horasPresenciales,
        creditos: c.creditos,
        semanas: c.semanas,
        dedicacionPeriodo: c.dedicacionPeriodo,
      })),
      otrasActividadesDocencia: agenda.otrasActividadesDocencia.map(
        (a) => ({
          nombre: a.nombre,
          descripcion: a.descripcion || "",
          horasSemanales: 0,
          semanas: 0,
          dedicacionPeriodo: a.dedicacionPeriodo,
          cantidadUnidades: a.cantidadUnidades ?? 0,
          sede: a.sede ?? null,
          cohortes: a.cohortes ?? [],
        })
      ),
      actividadesInvestigacion: agenda.actividadesInvestigacion.map(
        (a) => ({
          nombre: a.nombre,
          descripcion: a.descripcion || "",
          horasSemanales: 0,
          semanas: 0,
          dedicacionPeriodo: a.dedicacionPeriodo,
          cantidadUnidades: a.cantidadUnidades ?? 0,
          sede: a.sede ?? null,
          cohortes: [],
          proyectoId: a.proyectoId ?? null,
        })
      ),
      actividadesProyeccionSocial: agenda.actividadesProyeccionSocial.map(
        (a) => ({
          nombre: a.nombre,
          descripcion: a.descripcion || "",
          horasSemanales: 0,
          semanas: 0,
          dedicacionPeriodo: a.dedicacionPeriodo,
          cantidadUnidades: 0,
          sede: a.sede ?? null,
          cohortes: [],
          proyectoId: a.proyectoId ?? null,
        })
      ),
      actividadesGestion: agenda.actividadesGestion.map((a) => ({
        nombre: a.nombre,
        descripcion: a.descripcion || "",
        horasSemanales: 0,
        semanas: 0,
        dedicacionPeriodo: a.dedicacionPeriodo,
        cantidadUnidades: 0,
        sede: a.sede ?? null,
        cohortes: [],
      })),
    }

    // Inyección forzosa de la consejería amarrada también en el borrador.
    defaultValues.otrasActividadesDocencia = inyectarConsejeriaEnActividades(
      defaultValues.otrasActividadesDocencia,
      consejeriaInyectada,
    )

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

        {/* Recomendaciones de la última revisión (si esta agenda fue rechazada antes) */}
        {agenda.observacionesAdmin && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950">
            <p className="text-xs font-medium text-amber-900 dark:text-amber-200">
              Recomendaciones de la última revisión
            </p>
            <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
              {agenda.observacionesAdmin}
            </p>
          </div>
        )}

        {/* Wizard con datos pre-cargados (Continuar Editando) */}
        <AgendaWizardForm
          docente={docente}
          cursosMaestros={cursosMaestros}
          catalogoActividades={catalogoActividades}
          periodo={periodo}
          defaultValues={defaultValues}
          semanasPeriodo={semanasPeriodo}
          semanasMaximas={agendaLimits.semanasMaximas}
          defaultSemanasAgenda={agenda.semanasAgenda}
          formulas={formulas}
          agendaLimits={agendaLimits}
          proyectosAprobados={proyectosAprobados}
          consejeria={consejeria}
        />

        {/* Botón Descartar — client component para manejar el server action */}
        <div className="flex justify-center border-t pt-4">
          <DiscardDraftButton periodo={periodo} />
        </div>
      </div>
    )
  }

  // ==========================================
  // CASO C: ENVIADO / APROBADO / RECHAZADO → Vista de solo lectura
  // ==========================================
  return (
    <div className="space-y-4">
      {agenda.estado === "APROBADO" && (
        <div className="flex items-start gap-3 rounded-md border border-green-200 bg-green-50 p-4 text-sm dark:border-green-900 dark:bg-green-950">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
          <div>
            <p className="font-semibold text-green-900 dark:text-green-200">Agenda aprobada</p>
            <p className="mt-0.5 text-green-800 dark:text-green-300">
              Tu Agenda Semestral (FO-19) para el período{" "}
              <span className="font-mono font-medium">{agenda.periodo}</span> ha sido aprobada.
              Ya podés crear tu Monitoreo (FO-20).
            </p>
          </div>
        </div>
      )}
      <AgendaReadOnly
        agenda={agenda as AgendaConRelaciones}
        semanasPeriodo={semanasPeriodo}
        slotPostDatosDocente={
          agenda.estado === "RECHAZADO" ? (
            <div className="overflow-hidden rounded-xl border border-red-200 bg-gradient-to-br from-red-50 to-red-50/60 shadow-sm dark:border-red-900/50 dark:from-red-950/40 dark:to-red-950/10">
              <div className="p-5">
                <div className="space-y-2">
                  <h3 className="text-base font-semibold leading-tight text-red-900 dark:text-red-200">
                    Agenda rechazada
                  </h3>
                  <p className="text-sm leading-relaxed text-red-800/90 dark:text-red-300/90">
                    Tu Agenda Semestral (FO-19) para el período{" "}
                    <span className="font-mono font-semibold">{agenda.periodo}</span> fue rechazada por el administrador.
                    {esNoPlanta
                      ? " Tu jefe de programa la corregirá."
                      : " Podés corregirla y reenviarla (respetando la ventana de entrega)."}
                  </p>
                  {agenda.observacionesAdmin && (
                    <div className="mt-3 rounded-lg border border-red-200/80 bg-white/70 px-4 py-3 dark:border-red-900/50 dark:bg-red-950/50">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-red-700 dark:text-red-400">
                        Motivo del rechazo
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-red-900 dark:text-red-200">
                        {agenda.observacionesAdmin}
                      </p>
                    </div>
                  )}
                  {!esNoPlanta && <CorregirAgendaButton agendaId={agenda.id} />}
                </div>
              </div>
            </div>
          ) : null
        }
      />
    </div>
  )
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
                className={
                  a.estado === "ENVIADO"
                    ? "bg-yellow-500 hover:bg-yellow-500"
                    : a.estado === "APROBADO"
                      ? "bg-green-600 hover:bg-green-600"
                      : a.estado === "RECHAZADO"
                        ? "bg-red-600 hover:bg-red-600"
                        : "border text-foreground"
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
