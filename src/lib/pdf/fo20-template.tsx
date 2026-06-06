import React from "react"
import { Document, Page, View, Text, StyleSheet, Image } from "@react-pdf/renderer"
import fs from "fs"
import path from "path"
import type { MonitoreoConRelaciones } from "@/lib/types/monitoreo"
import { compararEjecucion } from "@/lib/types/monitoreo"
import { Watermark } from "./shared/watermark"
import { getSedeLabel } from "@/lib/utils/sede"
import { getModalidadLabel } from "@/lib/utils/modalidad"
import type { Modalidad } from "@/generated/prisma/client"

const RED = "#9F1721"
// Mismo rojo que agenda (FO-19): paleta única en ambos formatos.
const RED_LIGHT = "#9F1721"
const BORDER = "#555"
const MUTED = "#555555"
// Gris claro del encabezado de tabla — igual al de agenda (FO-19).
const HEAD_GRAY = "#e2e2e2"
const HEAD_TEXT = "#333333"
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
      aspectos:
        'Se entiende por "Actividades Académicas Básicas" las labores desarrolladas por el docente en torno a la docencia, a la investigación, a la proyección social. Todos los docentes de la Universidad Surcolombiana: tiempo completo, medio tiempo y catedráticos, tienen como actividad primordial las inscritas en las "Actividades Académicas Básicas".\n' +
        'Se entiende por "Actividades Académicas Básicas" – Docencia el conjunto de actividades y procesos mediante los cuales los estudiantes adquieren, generan y desarrollan, con el apoyo de los docentes, los conocimientos, habilidades, destrezas y aptitudes previstas en el Proyecto Educativo y el Plan de Estudios del respectivo programa académico.',
      rows: basicas,
      observaciones: buildObservaciones(basicas),
    },
    {
      titulo: "II. ACTIVIDADES ACADÉMICAS COMPLEMENTARIAS",
      aspectos:
        'Se entiende por "Actividades Académicas Complementarias" las labores desarrolladas por el docente para soportar las Actividades Académicas Básicas tales como: Coordinación de Pasantías, Coordinación de Prácticas de Vacaciones, Comité de Autoevaluación y Acreditación, Coordinación de Currículo por Facultad, Currículo por Programa, Coordinación de Investigaciones por Facultad, Coordinación de Proyección Social por Facultad, Consejería Académica, Asesoría a Estudiantes. Diseño de nuevos Programas, Diseño de Módulos, Diseño de Ayudas Educativas Institucionales, Capacitación Intersemestral, Preparación y Ofrecimiento de Conferencias, Preparación de Examen ECAES, Representaciones Universitarias, Escritura de artículos para Revistas Indexadas, Escritura de artículos para Revistas no Indexadas, otras de similar naturaleza a juicio del Programa. Se entiende por Capacitación Intersemestral la formación académica diseñada por el Consejo Académico para toda la Universidad o por los Consejos de Facultad para sus Programas o Departamentos, con el fin de habilitarse en los conocimientos pertinentes e institucionales, durante el periodo lectivo comprendido entre el final de la actividad docente de un semestre y la iniciación de la actividad docente del semestre posterior.',
      rows: complementarias,
      observaciones: buildObservaciones(complementarias),
    },
    {
      titulo: "III. ACTIVIDADES ADMINISTRATIVAS",
      aspectos:
        'Se entiende por "Actividades Administrativas" las labores desarrolladas por un docente con fines exclusivamente de dirección universitaria a favor del desarrollo académico universitario tales como: reunión de Consejo de Programa o Departamento, Coordinación de Laboratorios, Dirección de Editorial Universitaria, representación de Facultad al Comité Editorial, Secretaría de Comité de Admisiones, Representación al Consejo de Facultad, representación al Consejo Superior, representación al Consejo Académico, representación al Comité de Admisiones, representación al Comité de Evaluación y Selección Docente, representación al Comité de Asignación de Puntaje, Comité Electoral, Coordinación de Área, representación a la Junta Directiva Sindical, Coordinación de Internado y Residencia, Coordinación de la Granja, Coordinación del Herbario y Museo Geológico, Coordinación de Programas de Postgrado, Jefaturas de Programas o Dirección de Departamentos, Secretaría Académica de Facultad, Dirección General de Currículo, Dirección General de Tecnologías, Coordinación Centro de Producción Audiovisual, Consultorio Jurídico, Consultorio Contable, Asesores de Rectores y Vicerrectores, Decanos, Vicerrectores.\n' +
        "Son funciones administrativas, las relacionadas con la planeación, organización, dirección y evaluación de una Unidad Académica, realizadas por el personal docente, al igual que otras labores como participación en reuniones, en Comités, Consejos y demás equipos de trabajo creados por la Universidad.",
      rows: administrativas,
      observaciones: buildObservaciones(administrativas),
    },
    {
      titulo: "IV. ACTIVIDADES DE DESARROLLO INSTITUCIONAL",
      aspectos:
        "Se entiende por Actividades de Desarrollo Institucional, las que tienen como objetivo formular y ejecutar proyectos que contribuyan al mejoramiento de la Calidad Institucional y al cumplimiento de las metas universitarias.\n" +
        "La asignación de horas para actividades de Desarrollo Institucional será aprobada por el Consejo Académico, previo concepto del Consejo de Facultad.",
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

// Las imágenes se leen como Buffer (no como path): en Windows, pasar un path
// absoluto con letra de unidad ("D:\\...") rompe a @react-pdf porque url.parse
// interpreta "D:" como protocolo y descarta el archivo. Un Buffer lo evita.
const logoUsco = fs.readFileSync(path.join(process.cwd(), "public/Img/Escudo_de_la_Universidad_Surcolombiana.svg.png"))
const logoCerts = fs.readFileSync(path.join(process.cwd(), "public/Img/iqnet.png"))

function FO20Header() {
  return (
    <View style={s.headerContainer}>
      <View style={s.headerTopRow}>
        <View style={s.headerLogoLeft}>
          <Image src={logoUsco} style={{ width: 45, height: 50, objectFit: "contain" }} />
        </View>
        <View style={s.headerCenterBlock}>
          <View style={s.headerTitleRed}>
            <Text style={s.headerUnivText}>UNIVERSIDAD SURCOLOMBIANA</Text>
            <Text style={s.headerFormacionText}>FORMACIÓN</Text>
          </View>
          <View style={s.headerTitleWhite}>
            <Text style={s.headerDocText}>MONITOREO AGENDA ACADÉMICA</Text>
          </View>
        </View>
        <View style={s.headerLogoRight}>
          <Image src={logoCerts} style={{ width: 110, height: 35, objectFit: "contain" }} />
        </View>
      </View>
      <View style={s.headerMetaRow}>
        <View style={[s.metaCellRed, { width: 60 }]}><Text style={s.metaTextWhite}>CÓDIGO</Text></View>
        <View style={[s.metaCellWhite, { width: 100 }]}><Text style={s.metaTextBlack}>MI-FOR-FO-20</Text></View>
        <View style={[s.metaCellRed, { width: 60 }]}><Text style={s.metaTextWhite}>VERSIÓN</Text></View>
        <View style={[s.metaCellWhite, { width: 60 }]}><Text style={s.metaTextBlack}>5</Text></View>
        <View style={[s.metaCellRed, { width: 70 }]}><Text style={s.metaTextWhite}>VIGENCIA</Text></View>
        <View style={[s.metaCellWhite, { width: 60 }]}><Text style={s.metaTextBlack}>2015</Text></View>
        <View style={[s.metaCellRed, { width: 60 }]}><Text style={s.metaTextWhite}>PÁGINA</Text></View>
        <View style={[s.metaCellWhite, { flex: 1 }]}>
          <Text style={s.metaTextBlack} render={({ pageNumber, totalPages }) => `${pageNumber} de ${totalPages}`} />
        </View>
      </View>
    </View>
  )
}

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
          <Text style={s.fieldLabel}>Modalidad: </Text>
          <Text style={s.fieldValue}>{getModalidadLabel(docente.modalidad as Modalidad)}</Text>
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
      <View style={[s.tableHeaderCell, { flex: 1, borderLeftWidth: 1, borderLeftColor: "#8a8a8a" }]}>
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

  return (
    <Document>
      {secciones.map((sec, i) => (
        <Page key={i} size="LETTER" orientation="landscape" style={s.page}>
          <Watermark estado={estado} />
          <FO20Header />
          {i === 0 && <DocenteInfo m={monitoreo} />}
          <SectionBand>{sec.titulo}</SectionBand>
          <AspectosBand text={sec.aspectos} />
          <TableHeader />
          {sec.rows.map((row, j) => (
            <ActivityRow key={j} row={row} periodo={monitoreo.periodo} />
          ))}
          {sec.rows.length === 0 && <EmptyRow />}
          <ObservacionesBlock text={sec.observaciones} />
          {i === secciones.length - 1 && <FirmasBlock nombreDocente={monitoreo.docente.nombre} />}
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
  headerContainer: { borderWidth: 1, borderColor: RED, marginBottom: 0 },
  headerTopRow: { flexDirection: "row", height: 60 },
  headerLogoLeft: { width: 70, justifyContent: "center", alignItems: "center", borderRightWidth: 1, borderRightColor: RED, backgroundColor: "white", padding: 2 },
  headerCenterBlock: { flex: 1, flexDirection: "column" },
  headerTitleRed: { flex: 1, backgroundColor: RED, justifyContent: "center", alignItems: "center", borderBottomWidth: 1, borderBottomColor: RED },
  headerUnivText: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "white" },
  headerFormacionText: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "white", marginTop: 2 },
  headerTitleWhite: { flex: 1, backgroundColor: "white", justifyContent: "center", alignItems: "center" },
  headerDocText: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "black" },
  headerLogoRight: { width: 140, justifyContent: "center", alignItems: "center", borderLeftWidth: 1, borderLeftColor: RED, backgroundColor: "white", padding: 2 },
  headerMetaRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: RED, height: 16 },
  metaCellRed: { backgroundColor: RED, justifyContent: "center", alignItems: "center", borderRightWidth: 1, borderRightColor: RED },
  metaTextWhite: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "white" },
  metaCellWhite: { backgroundColor: "white", justifyContent: "center", alignItems: "center", borderRightWidth: 1, borderRightColor: RED },
  metaTextBlack: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "black" },
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
    backgroundColor: HEAD_GRAY,
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
    color: HEAD_TEXT,
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
