import React from "react"
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer"
import type { MonitoreoConRelaciones } from "@/lib/types/monitoreo"
import { compararEjecucion } from "@/lib/types/monitoreo"
import { Watermark } from "./shared/watermark"
import { getSedeLabel } from "@/lib/utils/sede"

const RED = "#9F1721"
const RED_LIGHT = "#C0272F"
const BORDER = "#555"
const MUTED = "#555555"
const MARGIN = 28

// ---- Tipos ----

type ActividadRow = {
  titulo: string
  detalle?: string | null
  horasPlanificadas: number
  horasEjecutadas: number
  productos: string | null
}

type Seccion = {
  titulo: string
  aspectos: string
  rows: ActividadRow[]
  observaciones: string
}

// ---- Construcción de secciones (lógica de datos pura) ----

function buildSecciones(m: MonitoreoConRelaciones): Seccion[] {
  const reportesDocPorCurso = new Map(m.reportesDocencia.map((r) => [r.cursoAgendaId, r]))
  const reportesActDocPorItem = new Map(m.reportesActividadDocencia.map((r) => [r.actividadDocenciaId, r]))
  const reportesInvPorItem = new Map(m.reportesInvestigacion.map((r) => [r.actividadInvestigacionId, r]))
  const reportesProyPorItem = new Map(m.reportesProyeccion.map((r) => [r.actividadProyeccionSocialId, r]))
  const reportesGesPorItem = new Map(m.reportesGestion.map((r) => [r.actividadGestionId, r]))

  const basicas: ActividadRow[] = []
  for (const c of m.agenda.cursos) {
    const r = reportesDocPorCurso.get(c.id)
    if (!r) continue
    basicas.push({
      titulo: `Docencia · ${c.numeroCurso} — ${c.nombreCurso}`,
      detalle: c.sede ? getSedeLabel(c.sede) : null,
      horasPlanificadas: c.dedicacionPeriodo,
      horasEjecutadas: r.horasEjecutadas,
      productos: r.productosEntregados,
    })
  }
  for (const a of m.agenda.actividadesInvestigacion) {
    const r = reportesInvPorItem.get(a.id)
    if (!r) continue
    basicas.push({
      titulo: `Investigación · ${a.nombre}`,
      detalle: a.descripcion,
      horasPlanificadas: a.dedicacionPeriodo,
      horasEjecutadas: r.horasEjecutadas,
      productos: r.productosEntregados,
    })
  }
  for (const a of m.agenda.actividadesProyeccionSocial) {
    const r = reportesProyPorItem.get(a.id)
    if (!r) continue
    basicas.push({
      titulo: `Proyección Social · ${a.nombre}`,
      detalle: a.descripcion,
      horasPlanificadas: a.dedicacionPeriodo,
      horasEjecutadas: r.horasEjecutadas,
      productos: r.productosEntregados,
    })
  }

  const complementarias: ActividadRow[] = m.agenda.otrasActividadesDocencia
    .flatMap((a) => {
      const r = reportesActDocPorItem.get(a.id)
      if (!r) return []
      return [{ titulo: a.nombre, detalle: a.descripcion, horasPlanificadas: a.dedicacionPeriodo, horasEjecutadas: r.horasEjecutadas, productos: r.productosEntregados }]
    })

  const administrativas: ActividadRow[] = m.agenda.actividadesGestion
    .flatMap((a) => {
      const r = reportesGesPorItem.get(a.id)
      if (!r) return []
      return [{ titulo: a.nombre, detalle: a.descripcion, horasPlanificadas: a.dedicacionPeriodo, horasEjecutadas: r.horasEjecutadas, productos: r.productosEntregados }]
    })

  return [
    {
      titulo: "I. ACTIVIDADES ACADÉMICAS BÁSICAS",
      aspectos: 'Se entiende por "Actividades Académicas Básicas" las labores desarrolladas por el docente en torno a la docencia, a la investigación, a la proyección social.',
      rows: basicas,
      observaciones: buildObservaciones(basicas),
    },
    {
      titulo: "II. ACTIVIDADES ACADÉMICAS COMPLEMENTARIAS",
      aspectos: 'Se entiende por "Actividades Académicas Complementarias" las labores desarrolladas por el docente para soportar las Actividades Académicas Básicas tales como: coordinación de pasantías, comités de autoevaluación, consejería académica, asesoría a estudiantes, entre otras.',
      rows: complementarias,
      observaciones: buildObservaciones(complementarias),
    },
    {
      titulo: "III. ACTIVIDADES ADMINISTRATIVAS",
      aspectos: 'Se entiende por "Actividades Administrativas" las labores desarrolladas por un docente con fines exclusivamente de dirección universitaria a favor del desarrollo académico, tales como: jefaturas de programa, coordinaciones, secretarías académicas, decanatos, etc.',
      rows: administrativas,
      observaciones: buildObservaciones(administrativas),
    },
    {
      titulo: "IV. ACTIVIDADES DE DESARROLLO INSTITUCIONAL",
      aspectos: "Se entiende por Actividades de Desarrollo Institucional, las que tienen como objetivo formular y ejecutar proyectos que contribuyan al mejoramiento de la Calidad Institucional y al cumplimiento de las metas universitarias.",
      rows: [],
      observaciones: "",
    },
  ]
}

function buildObservaciones(rows: ActividadRow[]): string {
  if (rows.length === 0) return ""
  const totalPlan = rows.reduce((s, r) => s + r.horasPlanificadas, 0)
  const totalReal = rows.reduce((s, r) => s + r.horasEjecutadas, 0)
  const diff = totalReal - totalPlan
  const signo = diff > 0 ? "+" : ""
  return `Resumen — Planificado: ${totalPlan}h · Ejecutado: ${totalReal}h · Diferencia: ${signo}${diff}h`
}

// ---- Componentes de UI ----

function FO20Header({ pageNum, total }: { pageNum: number; total: number }) {
  return (
    <View style={s.header}>
      <View style={s.headerLogo}>
        <Text style={s.headerLogoText}>USCO</Text>
      </View>
      <View style={s.headerCenter}>
        <Text style={s.headerUniv}>UNIVERSIDAD SURCOLOMBIANA</Text>
        <Text style={s.headerArea}>FORMACIÓN</Text>
        <Text style={s.headerTitle}>MONITOREO AGENDA ACADÉMICA</Text>
      </View>
      <View style={s.headerMeta}>
        <Text style={s.headerMetaLine}>CÓDIGO: MI-FOR-FO-20</Text>
        <Text style={s.headerMetaLine}>VERSIÓN: 5</Text>
        <Text style={s.headerMetaLine}>VIGENCIA: 2015</Text>
        <Text style={s.headerMetaLine}>PÁGINA: {pageNum} DE {total}</Text>
      </View>
    </View>
  )
}

type Modalidad = "PLANTA_TC" | "PLANTA_MT" | "OCASIONAL_TC" | "OCASIONAL_MT" | "CATEDRA" | string

const MOD_OPTS = [
  { key: "PLANTA_TC", label: "TC Planta" },
  { key: "PLANTA_MT", label: "MT Planta" },
  { key: "OCASIONAL_TC", label: "TC Ocasional" },
  { key: "OCASIONAL_MT", label: "MT Catedra" },
  { key: "CATEDRA", label: "Catedrático" },
]

function DocenteInfo({ m }: { m: MonitoreoConRelaciones }) {
  const docente = m.docente
  const fecha = (m.estado === "ENVIADO" ? m.updatedAt : new Date()).toLocaleDateString("es-CO", {
    day: "2-digit", month: "2-digit", year: "numeric",
  })
  return (
    <View style={s.docenteBlock}>
      <View style={s.docenteRow}>
        <Text style={s.fieldLabel}>Período: </Text>
        <Text style={s.fieldValue}>{m.periodo}</Text>
      </View>
      <View style={s.docenteRow2}>
        <View style={[s.docenteCell, { flex: 2 }]}>
          <Text style={s.fieldLabel}>Nombre: </Text>
          <Text style={s.fieldValue}>{docente.nombre}</Text>
        </View>
        <View style={[s.docenteCell, { flex: 1 }]}>
          <Text style={s.fieldLabel}>Cédula: </Text>
          <Text style={s.fieldValue}>{docente.cedula}</Text>
        </View>
      </View>
      <View style={s.docenteRow2}>
        <View style={[s.docenteCell, { flex: 1 }]}>
          <Text style={s.fieldLabel}>Facultad: </Text>
          <Text style={s.fieldValue}>{docente.facultad}</Text>
        </View>
        <View style={[s.docenteCell, { flex: 1 }]}>
          <Text style={s.fieldLabel}>Programa: </Text>
          <Text style={s.fieldValue}>{docente.programa}</Text>
        </View>
      </View>
      <View style={s.docenteRow2}>
        <View style={[s.docenteCell, { flex: 1 }]}>
          <Text style={s.fieldLabel}>Celular: </Text>
          <Text style={s.fieldValue}>{docente.celular ?? ""}</Text>
        </View>
        <View style={[s.docenteCell, { flex: 1 }]}>
          <Text style={s.fieldLabel}>E-mail: </Text>
          <Text style={s.fieldValue}>{docente.email}</Text>
        </View>
      </View>
      <View style={s.docenteRow2}>
        <View style={[s.docenteCell, { flex: 2 }]}>
          <Text style={[s.fieldLabel, { marginRight: 6 }]}>Modalidad: </Text>
          {MOD_OPTS.map((opt) => (
            <View key={opt.key} style={s.checkItem}>
              <View style={s.checkbox}>
                {docente.modalidad === opt.key && <Text style={s.checkX}>X</Text>}
              </View>
              <Text style={s.checkLabel}>{opt.label}</Text>
            </View>
          ))}
        </View>
        <View style={[s.docenteCell, { flex: 1 }]}>
          <Text style={s.fieldLabel}>Fecha: </Text>
          <Text style={s.fieldValue}>{fecha}</Text>
        </View>
      </View>
    </View>
  )
}

function SectionBand({ children }: { children: string }) {
  return (
    <View style={s.sectionBand}>
      <Text style={s.sectionBandText}>{children}</Text>
    </View>
  )
}

function AspectosBand({ text }: { text: string }) {
  return (
    <View>
      <View style={s.subBand}>
        <Text style={s.subBandText}>ASPECTOS A TENER EN CUENTA</Text>
      </View>
      <View style={s.aspectosBox}>
        <Text style={s.aspectosText}>{text}</Text>
      </View>
    </View>
  )
}

function TableHeader() {
  return (
    <View style={s.tableHeader}>
      <View style={[s.tableHeaderCell, { flex: 3 }]}>
        <Text style={s.tableHeaderText}>ACTIVIDADES DESARROLLADAS (Incluir soportes)</Text>
      </View>
      <View style={[s.tableHeaderCell, { flex: 1, borderLeftWidth: 1, borderLeftColor: "rgba(255,255,255,0.4)" }]}>
        <Text style={s.tableHeaderText}>PERIODO DE EJECUCIÓN</Text>
      </View>
    </View>
  )
}

function ActivityRow({ row, periodo }: { row: ActividadRow; periodo: string }) {
  const estado = compararEjecucion(row.horasPlanificadas, row.horasEjecutadas)
  const estadoLabel = estado === "igual" ? "Cumplido" : estado === "menos" ? "Subejecutado" : "Sobreejecutado"
  const horasText = `Planificado: ${row.horasPlanificadas}h  ·  Ejecutado: ${row.horasEjecutadas}h  ·  ${estadoLabel}`

  return (
    <View style={s.actRow} wrap={false}>
      <View style={[s.actCellLeft, { flex: 3 }]}>
        <Text style={s.actTitle}>{row.titulo}</Text>
        {row.detalle ? <Text style={s.actDetail}>{row.detalle}</Text> : null}
        <Text style={s.actHoras}>{horasText}</Text>
        {row.productos ? <Text style={s.actProductos}>Soportes: {row.productos}</Text> : null}
      </View>
      <View style={[s.actCellRight, { flex: 1 }]}>
        <Text style={s.actPeriodo}>{periodo}</Text>
      </View>
    </View>
  )
}

function EmptyRow() {
  return (
    <View style={s.emptyRow}>
      <Text style={s.emptyRowText}>(Sin actividades registradas)</Text>
    </View>
  )
}

function ObservacionesBlock({ text }: { text: string }) {
  return (
    <View>
      <View style={s.subBand}>
        <Text style={s.subBandText}>OBSERVACIONES</Text>
      </View>
      <View style={s.obsBox}>
        {text ? <Text style={s.obsText}>{text}</Text> : null}
      </View>
    </View>
  )
}

function FirmasBlock({ nombreDocente }: { nombreDocente: string }) {
  return (
    <View style={s.firmasRow}>
      {[
        { label: "Firma del Docente", name: nombreDocente },
        { label: "Firma del Jefe del Programa", name: "" },
        { label: "Firma del Decano", name: "" },
      ].map((f, i) => (
        <View key={i} style={s.firmaCol}>
          <View style={s.firmaLine} />
          {f.name ? <Text style={s.firmaNombre}>{f.name}</Text> : null}
          <Text style={s.firmaLabel}>{f.label}</Text>
        </View>
      ))}
    </View>
  )
}

function Footer() {
  return (
    <View style={s.footer}>
      <Text style={s.footerText}>Vigilada Mineducación</Text>
      <Text style={s.footerText}>
        La versión vigente y controlada de este documento, solo podrá ser consultada a través del sitio web Institucional www.usco.edu.co
      </Text>
    </View>
  )
}

// ---- Documento principal ----

export function FO20Document({ monitoreo, estado }: { monitoreo: MonitoreoConRelaciones; estado: string }) {
  const secciones = buildSecciones(monitoreo)
  const total = secciones.length

  return (
    <Document>
      {secciones.map((sec, i) => (
        <Page key={i} size="LETTER" orientation="landscape" style={s.page}>
          <Watermark estado={estado} />
          <FO20Header pageNum={i + 1} total={total} />
          {i === 0 && <DocenteInfo m={monitoreo} />}
          <SectionBand>{sec.titulo}</SectionBand>
          <AspectosBand text={sec.aspectos} />
          <TableHeader />
          {sec.rows.map((row, j) => (
            <ActivityRow key={j} row={row} periodo={monitoreo.periodo} />
          ))}
          {sec.rows.length === 0 && <EmptyRow />}
          <ObservacionesBlock text={sec.observaciones} />
          {i === total - 1 && <FirmasBlock nombreDocente={monitoreo.docente.nombre} />}
          <Footer />
        </Page>
      ))}
    </Document>
  )
}

// ---- Styles ----

const s = StyleSheet.create({
  page: {
    paddingHorizontal: MARGIN,
    paddingVertical: MARGIN,
    fontSize: 8,
    fontFamily: "Helvetica",
    backgroundColor: "white",
  },
  // Header
  header: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#777",
    height: 55,
    marginBottom: 2,
  },
  headerLogo: {
    width: 60,
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: "#777",
    backgroundColor: "white",
  },
  headerLogoText: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: RED,
  },
  headerCenter: {
    flex: 1,
    backgroundColor: RED,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  headerUniv: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "white",
  },
  headerArea: {
    fontSize: 8,
    color: "white",
    marginTop: 2,
  },
  headerTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "white",
    marginTop: 3,
  },
  headerMeta: {
    width: 155,
    justifyContent: "center",
    paddingHorizontal: 6,
    borderLeftWidth: 1,
    borderLeftColor: "#777",
    backgroundColor: "white",
  },
  headerMetaLine: {
    fontSize: 7.5,
    color: "#333",
    marginBottom: 2,
  },
  // Docente info
  docenteBlock: {
    borderWidth: 1,
    borderColor: "#777",
    marginBottom: 3,
  },
  docenteRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#aaa",
  },
  docenteRow2: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#aaa",
  },
  docenteCell: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3,
    paddingHorizontal: 5,
    borderRightWidth: 1,
    borderRightColor: "#aaa",
  },
  fieldLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Oblique",
    color: MUTED,
  },
  fieldValue: {
    fontSize: 8.5,
  },
  // Modalidad in docente block
  checkItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
  },
  checkbox: {
    width: 9,
    height: 9,
    borderWidth: 1,
    borderColor: "#444",
    marginRight: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  checkX: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1,
  },
  checkLabel: {
    fontSize: 7,
  },
  // Section band
  sectionBand: {
    backgroundColor: RED,
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginTop: 3,
  },
  sectionBandText: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "white",
  },
  // Sub-band
  subBand: {
    backgroundColor: RED_LIGHT,
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  subBandText: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "white",
    textAlign: "center",
  },
  // Aspectos
  aspectosBox: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: BORDER,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  aspectosText: {
    fontSize: 7.5,
    color: MUTED,
    fontFamily: "Helvetica-Oblique",
  },
  // Table
  tableHeader: {
    flexDirection: "row",
    backgroundColor: RED_LIGHT,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: BORDER,
  },
  tableHeaderCell: {
    paddingVertical: 4,
    paddingHorizontal: 5,
    justifyContent: "center",
    alignItems: "center",
  },
  tableHeaderText: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "white",
    textAlign: "center",
  },
  // Activity rows
  actRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: BORDER,
    minHeight: 28,
  },
  actCellLeft: {
    paddingVertical: 4,
    paddingHorizontal: 5,
    borderRightWidth: 1,
    borderRightColor: BORDER,
  },
  actCellRight: {
    paddingVertical: 4,
    paddingHorizontal: 5,
    justifyContent: "center",
    alignItems: "center",
  },
  actTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    marginBottom: 1,
  },
  actDetail: {
    fontSize: 8,
    color: MUTED,
    marginBottom: 2,
  },
  actHoras: {
    fontSize: 8,
    marginBottom: 1,
  },
  actProductos: {
    fontSize: 7.5,
    color: MUTED,
    fontFamily: "Helvetica-Oblique",
  },
  actPeriodo: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },
  emptyRow: {
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: BORDER,
    paddingVertical: 16,
    alignItems: "center",
  },
  emptyRowText: {
    fontSize: 8,
    color: MUTED,
    fontFamily: "Helvetica-Oblique",
  },
  // Observaciones
  obsBox: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: BORDER,
    minHeight: 32,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  obsText: {
    fontSize: 8,
    color: MUTED,
  },
  // Firmas
  firmasRow: {
    flexDirection: "row",
    marginTop: 30,
  },
  firmaCol: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  firmaLine: {
    borderTopWidth: 1,
    borderTopColor: "#333",
    width: "80%",
    marginBottom: 4,
  },
  firmaNombre: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginBottom: 2,
  },
  firmaLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Oblique",
    textAlign: "center",
    color: MUTED,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 12,
    left: MARGIN,
    right: MARGIN,
    alignItems: "center",
  },
  footerText: {
    fontSize: 6.5,
    color: "#888",
    fontFamily: "Helvetica-Oblique",
    textAlign: "center",
  },
})
