import React from "react"
import { Document, Page, View, Text, StyleSheet, Image } from "@react-pdf/renderer"
import path from "path"
import type { AgendaConRelaciones } from "@/lib/types/agenda"
import type { Docente } from "@/generated/prisma/client"
import { Watermark } from "./shared/watermark"
import { getSedeLabel } from "@/lib/utils/sede"

const RED = "#9F1721"
const BORDER = "#999999"
const MUTED = "#555555"

type Col = { label: string; width: number; align?: "left" | "center" | "right" }

// Content width = 612 - 20*2 = 572pt
const CURSO_COLS: Col[] = [
  { label: "N°", width: 38, align: "center" },
  { label: "Nombre del Curso", width: 183, align: "left" },
  { label: "Sede", width: 45, align: "center" },
  { label: "H. Presenc.", width: 62, align: "center" },
  { label: "Créditos", width: 50, align: "center" },
  { label: "Semanas", width: 52, align: "center" },
  { label: "Ded. al Período", width: 142, align: "right" },
]

const ACT_COLS: Col[] = [
  { label: "Nombre / Actividad", width: 185, align: "left" },
  { label: "Descripción", width: 267, align: "left" },
  { label: "Horas Dedicación", width: 120, align: "right" },
]

// ---- Header institucional ----

function FO19Header() {
  const logoUsco = path.join(process.cwd(), "public/img/Escudo_de_la_Universidad_Surcolombiana.svg.png")
  const logoCerts = path.join(process.cwd(), "public/img/Certificaiones-ISO-IQnet.png")

  return (
    <View style={s.headerContainer}>
      {/* Primera fila: Logos y Títulos */}
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
            <Text style={s.headerDocText}>INFORMACION DE ACTIVIDADES AGENDA</Text>
            <Text style={s.headerDocText}>SEMESTRAL DOCENTES</Text>
          </View>
        </View>

        <View style={s.headerLogoRight}>
          <Image src={logoCerts} style={{ width: 110, height: 35, objectFit: "contain" }} />
        </View>
      </View>

      {/* Segunda fila: Metadatos */}
      <View style={s.headerMetaRow}>
        <View style={[s.metaCellRed, { width: 60 }]}><Text style={s.metaTextWhite}>CÓDIGO</Text></View>
        <View style={[s.metaCellWhite, { width: 100 }]}><Text style={s.metaTextBlack}>MI-FOR-FO-19</Text></View>
        <View style={[s.metaCellRed, { width: 60 }]}><Text style={s.metaTextWhite}>VERSIÓN</Text></View>
        <View style={[s.metaCellWhite, { width: 60 }]}><Text style={s.metaTextBlack}>8</Text></View>
        <View style={[s.metaCellRed, { width: 70 }]}><Text style={s.metaTextWhite}>VIGENCIA</Text></View>
        <View style={[s.metaCellWhite, { width: 60 }]}><Text style={s.metaTextBlack}>2019</Text></View>
        <View style={[s.metaCellRed, { width: 60 }]}><Text style={s.metaTextWhite}>PÁGINA</Text></View>
        <View style={[s.metaCellWhite, { flex: 1 }]}>
          <Text style={s.metaTextBlack} render={({ pageNumber, totalPages }) => `${pageNumber} de ${totalPages}`} />
        </View>
      </View>
    </View>
  )
}

// ---- Fila de campos info ----

type FieldDef = { label: string; value: string }

function FieldRow({ fields, topBorder }: { fields: FieldDef[]; topBorder?: boolean }) {
  return (
    <View style={topBorder ? [s.fieldRow, { borderTopWidth: 1 }] : s.fieldRow}>
      {fields.map((f, i) => (
        <View
          key={i}
          style={{ ...s.field, flex: 1, ...(i < fields.length - 1 ? { borderRightWidth: 1, borderRightColor: BORDER } : {}) }}
        >
          <Text style={s.fieldLabel}>{f.label}: </Text>
          <Text style={s.fieldValue}>{f.value}</Text>
        </View>
      ))}
    </View>
  )
}

// ---- Modalidad checkboxes ----

const MOD_OPTS = [
  { key: "PLANTA_TC", label: "TC Planta" },
  { key: "PLANTA_MT", label: "MT Planta" },
  { key: "OCASIONAL_TC", label: "TC Ocasional" },
  { key: "OCASIONAL_MT", label: "MT Catedra" },
  { key: "CATEDRA", label: "Catedrático" },
  { key: "_OTRO", label: "Otra" },
]

function ModalidadRow({ modalidad }: { modalidad: string }) {
  const isOtro = ["VISITANTE_TC", "VISITANTE_MT", "CATEDRA_VISITANTE_TC", "CATEDRA_VISITANTE_MT", "INVITADO"].includes(modalidad)
  return (
    <View style={s.modalidadRow}>
      <Text style={s.fieldLabel}>Modalidad/Dedicación: </Text>
      {MOD_OPTS.map((opt) => {
        const checked = opt.key === "_OTRO" ? isOtro : modalidad === opt.key
        return (
          <View key={opt.key} style={s.checkItem}>
            <View style={s.checkbox}>
              {checked && <Text style={s.checkX}>X</Text>}
            </View>
            <Text style={s.checkLabel}>{opt.label}</Text>
          </View>
        )
      })}
    </View>
  )
}

// ---- Banda de sección ----

function SectionBand({ children }: { children: string }) {
  return (
    <View style={s.sectionBand}>
      <Text style={s.sectionBandText}>{children}</Text>
    </View>
  )
}

// ---- Tabla: encabezado y filas ----

function THead({ cols }: { cols: Col[] }) {
  return (
    <View style={s.thead}>
      {cols.map((col, i) => (
        <View
          key={i}
          style={{ ...s.theadCell, width: col.width, ...(i < cols.length - 1 ? { borderRightWidth: 1, borderRightColor: "rgba(255,255,255,0.4)" } : {}) }}
        >
          <Text style={s.theadText}>{col.label}</Text>
        </View>
      ))}
    </View>
  )
}

function TRow({ cols, cells }: { cols: Col[]; cells: (string | number)[] }) {
  return (
    <View style={s.trow} wrap={false}>
      {cols.map((col, i) => (
        <View
          key={i}
          style={{ ...s.tcell, width: col.width, ...(i < cols.length - 1 ? { borderRightWidth: 1, borderRightColor: BORDER } : {}) }}
        >
          <Text style={[s.tcellText, { textAlign: col.align ?? "left" }]}>
            {String(cells[i] ?? "")}
          </Text>
        </View>
      ))}
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

function TotalRow({ label, value, extra }: {
  label: string
  value: number
  extra?: { label: string; value: number }
}) {
  return (
    <View style={s.totalRow}>
      <Text style={s.totalLabel}>{label}:</Text>
      <Text style={s.totalValue}>{value}h</Text>
      {extra && (
        <>
          <Text style={[s.totalLabel, { marginLeft: 24 }]}>{extra.label}:</Text>
          <Text style={s.totalValue}>{extra.value}h</Text>
        </>
      )}
    </View>
  )
}

// ---- Sección de actividad reutilizable ----

type ActivityItem = { id: string; nombre: string; descripcion: string | null; dedicacionPeriodo: number }

function ActivitySection({
  title,
  items,
  total,
  totalLabel,
}: {
  title: string
  items: ActivityItem[]
  total: number
  totalLabel: string
}) {
  return (
    <View>
      <SectionBand>{title}</SectionBand>
      <THead cols={ACT_COLS} />
      {items.map((a) => (
        <TRow key={a.id} cols={ACT_COLS} cells={[a.nombre, a.descripcion ?? "", a.dedicacionPeriodo]} />
      ))}
      {items.length === 0 && <EmptyRow />}
      <TotalRow label={totalLabel} value={total} />
    </View>
  )
}

// ---- Gran total ----

function GranTotal({ value }: { value: number }) {
  return (
    <View style={s.granTotal}>
      <Text style={s.granTotalLabel}>GRAN TOTAL DE HORAS DEL PERÍODO:</Text>
      <Text style={s.granTotalValue}>{value}h</Text>
    </View>
  )
}

// ---- Bloque de firmas ----

function Firmas({ docente }: { docente: Docente }) {
  const cols = [
    { label: "Firma del Docente", name: docente.nombre },
    { label: "Firma del Director del Programa", name: "" },
    { label: "Firma del Decano", name: "" },
  ]
  return (
    <View style={s.firmasRow}>
      {cols.map((c, i) => (
        <View key={i} style={s.firmaCol}>
          <View style={s.firmaLine} />
          {c.name ? <Text style={s.firmaNombre}>{c.name}</Text> : null}
          <Text style={s.firmaLabel}>{c.label}</Text>
        </View>
      ))}
    </View>
  )
}

// ---- Documento principal ----

export function FO19Document({ agenda, estado }: { agenda: AgendaConRelaciones; estado: string }) {
  const { docente } = agenda
  const fecha = new Date(agenda.updatedAt).toLocaleDateString("es-CO")

  const sumCursos = agenda.cursos.reduce((s, c) => s + c.dedicacionPeriodo, 0)
  const sumOtras  = agenda.otrasActividadesDocencia.reduce((s, a) => s + a.dedicacionPeriodo, 0)
  const sumInv    = agenda.actividadesInvestigacion.reduce((s, a) => s + a.dedicacionPeriodo, 0)
  const sumProy   = agenda.actividadesProyeccionSocial.reduce((s, a) => s + a.dedicacionPeriodo, 0)
  const sumGest   = agenda.actividadesGestion.reduce((s, a) => s + a.dedicacionPeriodo, 0)
  const granTotal = sumCursos + sumOtras + sumInv + sumProy + sumGest

  return (
    <Document>
      {/* === PÁGINA 1 === */}
      <Page size="LETTER" style={s.page}>
        <Watermark estado={estado} />
        <FO19Header />
        <FieldRow
          topBorder
          fields={[
            { label: "Facultad", value: docente.facultad },
            { label: "Programa", value: docente.programa },
          ]}
        />
        <FieldRow
          fields={[
            { label: "Docente", value: docente.nombre },
            { label: "Cédula", value: docente.cedula },
          ]}
        />
        <FieldRow
          fields={[
            { label: "Período", value: agenda.periodo },
            { label: "Fecha", value: fecha },
          ]}
        />
        <ModalidadRow modalidad={docente.modalidad} />

        <SectionBand>1.0 ACTIVIDADES DE DOCENCIA (DIRECTA)</SectionBand>
        <THead cols={CURSO_COLS} />
        {agenda.cursos.map((c) => (
          <TRow
            key={c.id}
            cols={CURSO_COLS}
            cells={[
              c.numeroCurso,
              c.nombreCurso,
              getSedeLabel(c.sede),
              c.horasPresenciales,
              c.creditos,
              c.semanas,
              c.dedicacionPeriodo,
            ]}
          />
        ))}
        {agenda.cursos.length === 0 && <EmptyRow />}
        <TotalRow label="Subtotal 1.0" value={sumCursos} />

        <SectionBand>1.2 OTRAS ACTIVIDADES DE DOCENCIA</SectionBand>
        <THead cols={ACT_COLS} />
        {agenda.otrasActividadesDocencia.map((a) => (
          <TRow key={a.id} cols={ACT_COLS} cells={[a.nombre, a.descripcion ?? "", a.dedicacionPeriodo]} />
        ))}
        {agenda.otrasActividadesDocencia.length === 0 && <EmptyRow />}
        <TotalRow
          label="Subtotal 1.2"
          value={sumOtras}
          extra={{ label: "Total 1", value: sumCursos + sumOtras }}
        />
      </Page>

      {/* === PÁGINA 2 === */}
      <Page size="LETTER" style={s.page}>
        <Watermark estado={estado} />
        <FO19Header />

        <ActivitySection
          title="2. ACTIVIDADES DE INVESTIGACIÓN"
          items={agenda.actividadesInvestigacion}
          total={sumInv}
          totalLabel="Total 2"
        />
        <ActivitySection
          title="3. ACTIVIDADES DE PROYECCIÓN SOCIAL"
          items={agenda.actividadesProyeccionSocial}
          total={sumProy}
          totalLabel="Total 3"
        />
        <ActivitySection
          title="4. ACTIVIDADES DE GESTIÓN"
          items={agenda.actividadesGestion}
          total={sumGest}
          totalLabel="Total 4"
        />

        <GranTotal value={granTotal} />
        <Firmas docente={docente} />
      </Page>
    </Document>
  )
}

// ---- Styles ----

const s = StyleSheet.create({
  page: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    fontSize: 8,
    fontFamily: "Helvetica",
    backgroundColor: "white",
  },
  // Header
  headerContainer: {
    borderWidth: 1,
    borderColor: RED,
    marginBottom: 0,
  },
  headerTopRow: {
    flexDirection: "row",
    height: 60,
  },
  headerLogoLeft: {
    width: 70,
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: RED,
    backgroundColor: "white",
    padding: 2,
  },
  headerCenterBlock: {
    flex: 1,
    flexDirection: "column",
  },
  headerTitleRed: {
    flex: 1,
    backgroundColor: RED,
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: RED,
  },
  headerUnivText: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "white",
  },
  headerFormacionText: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "white",
    marginTop: 2,
  },
  headerTitleWhite: {
    flex: 1,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
  headerDocText: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "black",
  },
  headerLogoRight: {
    width: 140,
    justifyContent: "center",
    alignItems: "center",
    borderLeftWidth: 1,
    borderLeftColor: RED,
    backgroundColor: "white",
    padding: 2,
  },
  headerMetaRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: RED,
    height: 16,
  },
  metaCellRed: {
    backgroundColor: RED,
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: RED,
  },
  metaTextWhite: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "white",
  },
  metaCellWhite: {
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: RED,
  },
  metaTextBlack: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "black",
  },
  // Info fields
  fieldRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: BORDER,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 5,
  },
  fieldLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Oblique",
    color: MUTED,
  },
  fieldValue: {
    fontSize: 8.5,
  },
  // Modalidad
  modalidadRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: BORDER,
    paddingVertical: 4,
    paddingHorizontal: 5,
    marginBottom: 4,
    flexWrap: "wrap",
  },
  checkItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 14,
    marginTop: 2,
  },
  checkbox: {
    width: 10,
    height: 10,
    borderWidth: 1,
    borderColor: "#444",
    marginRight: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  checkX: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1,
  },
  checkLabel: {
    fontSize: 7.5,
  },
  // Section band
  sectionBand: {
    backgroundColor: RED,
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginTop: 4,
  },
  sectionBandText: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "white",
  },
  // Table
  thead: {
    flexDirection: "row",
    backgroundColor: "#555",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER,
  },
  theadCell: {
    paddingVertical: 3,
    paddingHorizontal: 3,
    justifyContent: "center",
  },
  theadText: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "white",
    textAlign: "center",
  },
  trow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: BORDER,
    minHeight: 18,
  },
  tcell: {
    paddingVertical: 3,
    paddingHorizontal: 3,
    justifyContent: "center",
  },
  tcellText: {
    fontSize: 8,
  },
  emptyRow: {
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: BORDER,
    paddingVertical: 14,
    alignItems: "center",
  },
  emptyRowText: {
    fontSize: 8,
    color: MUTED,
    fontFamily: "Helvetica-Oblique",
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#f0f0f0",
  },
  totalLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: MUTED,
    marginRight: 4,
  },
  totalValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#222",
  },
  // Gran total
  granTotal: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingVertical: 7,
    paddingHorizontal: 10,
    backgroundColor: RED,
    marginTop: 8,
  },
  granTotalLabel: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "white",
    marginRight: 12,
  },
  granTotalValue: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "white",
  },
  // Firmas
  firmasRow: {
    flexDirection: "row",
    marginTop: 40,
  },
  firmaCol: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 15,
  },
  firmaLine: {
    borderTopWidth: 1,
    borderTopColor: "#333",
    width: "85%",
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
})
