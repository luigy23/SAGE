import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { getPeriodoActivoConFechas } from "@/lib/utils/periodo-server"
import { AgendaWizardForm } from "@/components/agenda/AgendaWizardForm"
import { AgendaReadOnly } from "@/components/agenda/AgendaReadOnly"
import type { AgendaConRelaciones } from "@/lib/types/agenda"
import { DEFAULT_FORM_VALUES, type AgendaWizardFormData } from "@/lib/schemas/agenda-schema"
import { resolveGlobales, resolveAgendaLimits } from "@/lib/rules/resolver"
import { resolveFormulasCursosAction } from "@/lib/actions/formulas"
import { getAutoridadDeSesion } from "@/lib/auth/get-autoridad"
import { puedeGestionarFormulario, esModalidadNoPlanta } from "@/lib/auth/autoridad"
import { TerminosInvitadoForm } from "@/components/gestion/TerminosInvitadoForm"
import { PeriodosCubiertos } from "@/components/agenda/PeriodosCubiertos"
import { CohortesConsejeros } from "@/components/agenda/CohortesConsejeros"
import { CorregirAgendaButton } from "@/components/agenda/CorregirAgendaButton"
import { getConsejeriaArrastrada } from "@/lib/consejeria"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, AlertTriangle, CalendarDays, GraduationCap } from "lucide-react"
import { getModalidadLabel } from "@/lib/utils/modalidad"

/**
 * Creación / edición DELEGADA de la agenda (FO-19) de un docente No-Planta.
 * Solo accesible para la autoridad académica con scope sobre el docente objetivo
 * (Jefe de su programa, Decano de su facultad, o SUPERADMIN global).
 */
export default async function GestionNuevaAgendaPage({
  params,
}: {
  params: Promise<{ docenteId: string }>
}) {
  const { docenteId } = await params

  const sesion = await getAutoridadDeSesion()
  if (!sesion) redirect("/dashboard")

  const docente = await prisma.docente.findUnique({ where: { id: docenteId } })
  if (!docente) notFound()

  // Autorización: scope de ámbito + modalidad No-Planta.
  if (!puedeGestionarFormulario(sesion.autoridad, docente)) notFound()
  if (!esModalidadNoPlanta(docente.modalidad)) {
    return (
      <Mensaje
        titulo="Este docente diligencia su propia agenda"
        detalle={`${docente.nombre} es de planta. Solo puedes crear agendas de docentes No-Planta (cátedra, ocasional, visitante, invitado).`}
      />
    )
  }

  const periodoInfo = await getPeriodoActivoConFechas()
  if (!periodoInfo) {
    return (
      <Mensaje
        titulo="Período académico no disponible"
        detalle="No hay un período académico activo. No es posible crear agendas en este momento."
      />
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

  const agenda = await prisma.agendaSemestral.findUnique({
    where: { docenteId_periodo: { docenteId: docente.id, periodo } },
    include: {
      docente: true,
      cursos: { orderBy: { numeroCurso: "asc" } },
      otrasActividadesDocencia: { orderBy: { nombre: "asc" } },
      actividadesInvestigacion: { orderBy: { nombre: "asc" } },
      actividadesProyeccionSocial: { orderBy: { nombre: "asc" } },
      actividadesGestion: { orderBy: { nombre: "asc" } },
    },
  })

  // Ventana de entrega: misma regla que para el docente (no se relaja). Solo
  // bloquea cuando la agenda aún no existe o está en BORRADOR.
  const estadoBypassesWindow = ["ENVIADO", "APROBADO", "RECHAZADO"].includes(agenda?.estado ?? "")
  if (!estadoBypassesWindow) {
    const now = new Date()
    const { agendaDesde, agendaHasta } = periodoInfo
    if (!agendaDesde || !agendaHasta) {
      return (
        <Mensaje
          titulo="Ventana de entrega no configurada"
          detalle={`El administrador aún no definió la ventana de entrega de agendas para ${periodo}.`}
        />
      )
    }
    if (now < agendaDesde || now > agendaHasta) {
      return (
        <Mensaje
          titulo="Ventana de entrega fuera de fecha"
          detalle={`La ventana de entrega de agendas para ${periodo} no está abierta en este momento.`}
        />
      )
    }
  }

  // Si la agenda ya fue enviada/procesada, mostrar solo lectura (no re-crear).
  if (agenda && agenda.estado !== "BORRADOR") {
    return (
      <div className="space-y-4">
        <Encabezado docente={docente} periodo={periodo} estado={agenda.estado} />
        {agenda.estado === "RECHAZADO" && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950">
            <p className="text-xs font-medium text-red-900 dark:text-red-200">
              Agenda rechazada{agenda.observacionesAdmin ? " — motivo" : ""}
            </p>
            {agenda.observacionesAdmin && (
              <p className="mt-1 text-sm text-red-800 dark:text-red-300">
                {agenda.observacionesAdmin}
              </p>
            )}
            <p className="mt-2 text-xs text-red-700 dark:text-red-400">
              Como tú diligencias la agenda de este docente, podés corregirla y reenviarla.
            </p>
            <CorregirAgendaButton agendaId={agenda.id} />
          </div>
        )}
        <AgendaReadOnly
          agenda={agenda as AgendaConRelaciones}
          semanasPeriodo={semanasPeriodo}
          agendaLimits={agendaLimits}
        />
      </div>
    )
  }

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

  // Continuidad automática: si no hay agenda aún, arrastra la consejería vigente
  // de la agenda previa del docente para no reescribir las cohortes cada semestre.
  const arrastrada = agenda ? null : await getConsejeriaArrastrada(docente.id, periodo)

  // Si hay un BORRADOR delegado previo, pre-cargar sus datos al wizard.
  const defaultValues: AgendaWizardFormData | undefined = agenda
    ? {
        cursos: agenda.cursos.map((c) => ({
          cursoMaestroId: c.cursoMaestroId ?? null,
          tipoCurso: cursosMaestros.find((m) => m.id === c.cursoMaestroId)?.tipo ?? null,
          numeroCurso: c.numeroCurso,
          nombreCurso: c.nombreCurso,
          sede: c.sede || "",
          horasPresenciales: c.horasPresenciales,
          creditos: c.creditos,
          semanas: c.semanas,
          dedicacionPeriodo: c.dedicacionPeriodo,
        })),
        otrasActividadesDocencia: agenda.otrasActividadesDocencia.map((a) => ({
          nombre: a.nombre,
          descripcion: a.descripcion || "",
          horasSemanales: 0,
          semanas: 0,
          dedicacionPeriodo: a.dedicacionPeriodo,
          cantidadUnidades: a.cantidadUnidades ?? 0,
          sede: a.sede ?? null,
          cohortes: a.cohortes ?? [],
        })),
        actividadesInvestigacion: agenda.actividadesInvestigacion.map((a) => ({
          nombre: a.nombre,
          descripcion: a.descripcion || "",
          horasSemanales: 0,
          semanas: 0,
          dedicacionPeriodo: a.dedicacionPeriodo,
          cantidadUnidades: a.cantidadUnidades ?? 0,
          sede: a.sede ?? null,
          cohortes: [],
        })),
        actividadesProyeccionSocial: agenda.actividadesProyeccionSocial.map((a) => ({
          nombre: a.nombre,
          descripcion: a.descripcion || "",
          horasSemanales: 0,
          semanas: 0,
          dedicacionPeriodo: a.dedicacionPeriodo,
          cantidadUnidades: 0,
          sede: a.sede ?? null,
          cohortes: [],
        })),
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
    : arrastrada
      ? {
          ...DEFAULT_FORM_VALUES,
          otrasActividadesDocencia: [
            {
              nombre: arrastrada.nombre,
              descripcion: "",
              horasSemanales: 0,
              semanas: 0,
              dedicacionPeriodo: arrastrada.dedicacionPeriodo,
              cantidadUnidades: arrastrada.cantidadUnidades,
              sede: null,
              cohortes: arrastrada.cohortes,
            },
          ],
        }
      : undefined

  const toDateInput = (d: Date | null): string =>
    d ? d.toISOString().slice(0, 10) : ""

  return (
    <div className="space-y-6">
      <Encabezado docente={docente} periodo={periodo} estado={agenda?.estado ?? null} />
      <PeriodosCubiertos
        vinculacionDesde={docente.vinculacionDesde}
        vinculacionHasta={docente.vinculacionHasta}
      />
      <CohortesConsejeros programa={docente.programa} periodo={periodo} />
      {docente.modalidad === "INVITADO" && (
        <TerminosInvitadoForm
          docenteId={docente.id}
          invObjeto={docente.invObjeto ?? ""}
          invFechaDesde={toDateInput(docente.invFechaDesde)}
          invFechaHasta={toDateInput(docente.invFechaHasta)}
          invHorasContratadas={docente.invHorasContratadas ?? null}
          invAutorizadoCA={docente.invAutorizadoCA}
        />
      )}
      <AgendaWizardForm
        docente={docente}
        cursosMaestros={cursosMaestros}
        catalogoActividades={catalogoActividades}
        periodo={periodo}
        defaultValues={defaultValues}
        semanasPeriodo={semanasPeriodo}
        semanasMaximas={agendaLimits.semanasMaximas}
        defaultSemanasAgenda={agenda?.semanasAgenda}
        formulas={formulas}
        agendaLimits={agendaLimits}
        targetDocenteId={docente.id}
        redirectOnSuccess="/gestion/agendas"
      />
    </div>
  )
}

function Encabezado({
  docente,
  periodo,
  estado,
}: {
  docente: { nombre: string; modalidad: Parameters<typeof getModalidadLabel>[0]; programa: string }
  periodo: string
  estado: string | null
}) {
  return (
    <div className="space-y-3">
      <Button asChild variant="ghost" size="sm" className="w-fit gap-1.5">
        <Link href="/gestion/agendas">
          <ArrowLeft className="h-4 w-4" />
          Volver al listado
        </Link>
      </Button>
      <div className="flex items-center gap-2">
        <GraduationCap className="h-5 w-5 text-[#8F141B]" />
        <h1 className="text-xl font-bold">Agenda de {docente.nombre}</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Creación delegada (FO-19) ·{" "}
        <Badge variant="outline" className="text-xs">{getModalidadLabel(docente.modalidad)}</Badge>{" "}
        <Badge variant="secondary" className="text-xs">{periodo}</Badge>
        {estado && (
          <Badge variant="outline" className="ml-1 text-xs">{estado}</Badge>
        )}
        {" "}· {docente.programa}
      </p>
    </div>
  )
}

function Mensaje({ titulo, detalle }: { titulo: string; detalle: string }) {
  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm" className="w-fit gap-1.5">
        <Link href="/gestion/agendas">
          <ArrowLeft className="h-4 w-4" />
          Volver al listado
        </Link>
      </Button>
      <Card className="border-yellow-500/30 bg-yellow-50/50 dark:bg-yellow-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            {titulo}
          </CardTitle>
          <CardDescription>{detalle}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            La ventana de diligenciamiento la configura el administrador.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
