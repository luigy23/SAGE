/**
 * Render del PDF FO-20 (Monitoreo Agenda Académica) desde cero.
 *
 * No usa overlay porque el contenido es 100% dinámico (longitud variable
 * por sección). Replica la estructura visual del PDF oficial USCO:
 * encabezado institucional, secciones I-IV, tabla de actividades con
 * columnas "Actividades Desarrolladas" y "Periodo de Ejecución", bloque
 * de observaciones, footer legal y firmas finales.
 *
 * Mapeo de secciones (según texto oficial del FO-20 v5):
 *   I.   Actividades Académicas Básicas       → Cursos + Investigación + Proyección Social
 *   II.  Actividades Académicas Complementarias → Otras Actividades de Docencia
 *   III. Actividades Administrativas          → Actividades de Gestión
 *   IV.  Actividades de Desarrollo Institucional → (vacío salvo extensión futura)
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib"
import type { MonitoreoConRelaciones } from "@/lib/types/monitoreo"
import { compararEjecucion } from "@/lib/types/monitoreo"

// ============================================================
// Constantes de layout
// ============================================================

const PAGE_W = 792 // Letter landscape
const PAGE_H = 612
const MARGIN = 28

const COLOR_RED = rgb(0.62, 0.09, 0.13) // ~#9F1721 institucional USCO
const COLOR_RED_LIGHT = rgb(0.85, 0.25, 0.3)
const COLOR_BORDER = rgb(0.2, 0.2, 0.2)
const COLOR_TEXT = rgb(0, 0, 0)
const COLOR_TEXT_WHITE = rgb(1, 1, 1)
const COLOR_MUTED = rgb(0.35, 0.35, 0.35)

const HEADER_H = 60
const FOOTER_H = 38

const SECTION_HEADER_H = 18
const SUBHEADER_H = 16
const ROW_PADDING = 4

// Columnas de la tabla principal
const TABLE_X = MARGIN
const TABLE_W = PAGE_W - MARGIN * 2
const COL_ACTIVIDADES_W = TABLE_W * 0.72
const COL_PERIODO_W = TABLE_W - COL_ACTIVIDADES_W

// ============================================================
// Tipos
// ============================================================

type Modalidad =
  | "PLANTA_TC"
  | "PLANTA_MT"
  | "OCASIONAL_TC"
  | "OCASIONAL_MT"
  | "CATEDRA"
  | "VISITANTE"
  | "INVITADO"

type ActividadRow = {
  titulo: string
  detalle?: string | null
  horasPlanificadas: number
  horasEjecutadas: number
  productos: string | null
}

type Seccion = {
  numero: string
  titulo: string
  aspectos: string
  rows: ActividadRow[]
  observaciones: string
}

// ============================================================
// Helpers de texto y rectángulos
// ============================================================

function modalidadLabel(m: Modalidad | string | null | undefined): {
  TCP: string; MTP: string; TCO: string; MTO: string
} {
  const mark = "X"
  const empty = "_"
  const map = { TCP: empty, MTP: empty, TCO: empty, MTO: empty }
  switch (m) {
    case "PLANTA_TC": map.TCP = mark; break
    case "PLANTA_MT": map.MTP = mark; break
    case "OCASIONAL_TC": map.TCO = mark; break
    case "OCASIONAL_MT": map.MTO = mark; break
    // CATEDRA y otros: no hay casilla específica en FO-20 v5
  }
  return map
}

function wrapText(
  text: string,
  maxWidth: number,
  font: PDFFont,
  size: number,
): string[] {
  if (!text) return []
  const lines: string[] = []
  for (const paragraph of text.split("\n")) {
    if (!paragraph) {
      lines.push("")
      continue
    }
    const words = paragraph.split(/\s+/)
    let current = ""
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word
      const width = font.widthOfTextAtSize(candidate, size)
      if (width <= maxWidth) {
        current = candidate
      } else {
        if (current) lines.push(current)
        // palabras muy largas: cortar por carácter
        if (font.widthOfTextAtSize(word, size) > maxWidth) {
          let chunk = ""
          for (const ch of word) {
            const w = font.widthOfTextAtSize(chunk + ch, size)
            if (w <= maxWidth) chunk += ch
            else {
              lines.push(chunk)
              chunk = ch
            }
          }
          current = chunk
        } else {
          current = word
        }
      }
    }
    if (current) lines.push(current)
  }
  return lines
}

function drawFilledRect(
  page: PDFPage,
  x: number,
  y: number,
  w: number,
  h: number,
  color: ReturnType<typeof rgb>,
) {
  page.drawRectangle({ x, y, width: w, height: h, color })
}

function drawBorderedRect(
  page: PDFPage,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  page.drawRectangle({
    x,
    y,
    width: w,
    height: h,
    borderColor: COLOR_BORDER,
    borderWidth: 0.6,
  })
}

function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size = 8,
  color = COLOR_TEXT,
) {
  page.drawText(text, { x, y, size, font, color })
}

function drawCenteredText(
  page: PDFPage,
  text: string,
  cx: number,
  y: number,
  font: PDFFont,
  size: number,
  color = COLOR_TEXT,
) {
  const w = font.widthOfTextAtSize(text, size)
  page.drawText(text, { x: cx - w / 2, y, size, font, color })
}

function drawMultiline(
  page: PDFPage,
  lines: string[],
  x: number,
  yTop: number,
  font: PDFFont,
  size: number,
  lineHeight: number,
  color = COLOR_TEXT,
) {
  for (let i = 0; i < lines.length; i++) {
    page.drawText(lines[i], {
      x,
      y: yTop - (i + 1) * lineHeight + (lineHeight - size) / 2,
      size,
      font,
      color,
    })
  }
}

// ============================================================
// Encabezado institucional (se dibuja en cada página)
// ============================================================

function drawHeader(
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont },
  pageNum: number,
  totalPages: number,
) {
  const x = MARGIN
  const y = PAGE_H - MARGIN - HEADER_H
  const w = PAGE_W - MARGIN * 2

  // Caja externa
  drawBorderedRect(page, x, y, w, HEADER_H)

  // Banda roja superior con título
  const titleBandH = HEADER_H * 0.55
  const titleBandY = y + HEADER_H - titleBandH
  drawFilledRect(page, x, titleBandY, w, titleBandH, COLOR_RED)

  // Logo placeholder (caja blanca a la izquierda)
  const logoW = 55
  drawFilledRect(page, x, y, logoW, HEADER_H, rgb(1, 1, 1))
  drawBorderedRect(page, x, y, logoW, HEADER_H)
  drawCenteredText(
    page,
    "USCO",
    x + logoW / 2,
    y + HEADER_H / 2 - 4,
    fonts.bold,
    11,
    COLOR_RED,
  )

  // Título centrado
  drawCenteredText(
    page,
    "UNIVERSIDAD SURCOLOMBIANA",
    x + w / 2,
    titleBandY + titleBandH * 0.62,
    fonts.bold,
    10,
    COLOR_TEXT_WHITE,
  )
  drawCenteredText(
    page,
    "FORMACIÓN",
    x + w / 2,
    titleBandY + titleBandH * 0.32,
    fonts.bold,
    8,
    COLOR_TEXT_WHITE,
  )

  // Subtítulo (banda blanca)
  const subBandH = HEADER_H - titleBandH
  drawCenteredText(
    page,
    "MONITOREO AGENDA ACADÉMICA",
    x + w / 2,
    y + subBandH / 2 - 3,
    fonts.bold,
    10,
    COLOR_TEXT,
  )

  // Fila de metadatos (CÓDIGO / VERSIÓN / VIGENCIA / PAGINA)
  const metaY = y - 16
  const metaH = 16
  drawFilledRect(page, x, metaY, w, metaH, COLOR_RED)
  drawBorderedRect(page, x, metaY, w, metaH)

  const cells = [
    { label: "CÓDIGO", value: "MI-FOR-FO-20" },
    { label: "VERSIÓN", value: "5" },
    { label: "VIGENCIA", value: "2015" },
    { label: "PAGINA", value: `${pageNum} DE ${totalPages}` },
  ]
  const cellW = w / cells.length
  for (let i = 0; i < cells.length; i++) {
    const cx = x + cellW * i + cellW / 2
    drawCenteredText(
      page,
      `${cells[i].label}: ${cells[i].value}`,
      cx,
      metaY + 4,
      fonts.bold,
      7.5,
      COLOR_TEXT_WHITE,
    )
    if (i > 0) {
      page.drawLine({
        start: { x: x + cellW * i, y: metaY },
        end: { x: x + cellW * i, y: metaY + metaH },
        color: rgb(1, 1, 1),
        thickness: 0.4,
      })
    }
  }
}

// ============================================================
// Bloque de info del docente (solo página 1)
// ============================================================

function drawDocenteInfo(
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont; italic: PDFFont },
  monitoreo: MonitoreoConRelaciones,
  yTop: number,
): number {
  const x = MARGIN
  const w = PAGE_W - MARGIN * 2
  const rowH = 16

  // Layout: 2 columnas
  const colW = w / 2

  const docente = monitoreo.docente
  const fechaEnvio = monitoreo.estado === "ENVIADO" ? monitoreo.updatedAt : new Date()
  const fechaStr = fechaEnvio.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })

  // Fila 1: Periodo (full width)
  drawBorderedRect(page, x, yTop - rowH, w, rowH)
  drawText(page, "Periodo:", x + 4, yTop - rowH + 5, fonts.italic, 8)
  drawText(page, monitoreo.periodo, x + 60, yTop - rowH + 5, fonts.bold, 9)

  let y = yTop - rowH

  // Fila 2: Nombre | Cédula
  y -= rowH
  drawBorderedRect(page, x, y, colW, rowH)
  drawBorderedRect(page, x + colW, y, colW, rowH)
  drawText(page, "Nombre:", x + 4, y + 5, fonts.italic, 8)
  drawText(page, docente.nombre, x + 56, y + 5, fonts.regular, 9)
  drawText(page, "Cédula:", x + colW + 4, y + 5, fonts.italic, 8)
  drawText(page, docente.cedula, x + colW + 50, y + 5, fonts.regular, 9)

  // Fila 3: Facultad | Programa
  y -= rowH
  drawBorderedRect(page, x, y, colW, rowH)
  drawBorderedRect(page, x + colW, y, colW, rowH)
  drawText(page, "Facultad:", x + 4, y + 5, fonts.italic, 8)
  drawText(page, docente.facultad, x + 56, y + 5, fonts.regular, 8)
  drawText(page, "Programa o Departamento:", x + colW + 4, y + 5, fonts.italic, 8)
  drawText(page, docente.programa, x + colW + 130, y + 5, fonts.regular, 8)

  // Fila 4: Celular | E-mail
  y -= rowH
  drawBorderedRect(page, x, y, colW, rowH)
  drawBorderedRect(page, x + colW, y, colW, rowH)
  drawText(page, "Celular:", x + 4, y + 5, fonts.italic, 8)
  drawText(page, docente.celular ?? "", x + 56, y + 5, fonts.regular, 8)
  drawText(page, "E-mail:", x + colW + 4, y + 5, fonts.italic, 8)
  drawText(page, docente.email, x + colW + 50, y + 5, fonts.regular, 8)

  // Fila 5: Modalidad (izq) | Fecha (der)
  y -= rowH
  drawBorderedRect(page, x, y, colW, rowH)
  drawBorderedRect(page, x + colW, y, colW, rowH)
  const mod = modalidadLabel(docente.modalidad as Modalidad)
  const modText = `Modalidad:   TCP ${mod.TCP}   MTP ${mod.MTP}   TCO ${mod.TCO}   MTO ${mod.MTO}   (marcar con una X)`
  drawText(page, modText, x + 4, y + 5, fonts.italic, 8)
  drawText(page, "Fecha:", x + colW + 4, y + 5, fonts.italic, 8)
  drawText(page, fechaStr, x + colW + 50, y + 5, fonts.regular, 9)

  return y // y inferior del bloque
}

// ============================================================
// Footer (en cada página)
// ============================================================

function drawFooter(
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont; italic: PDFFont },
) {
  const x = MARGIN
  const w = PAGE_W - MARGIN * 2
  const yBase = MARGIN

  drawCenteredText(
    page,
    "Vigilada Mineducación",
    x + w / 2,
    yBase + 22,
    fonts.italic,
    7,
    COLOR_MUTED,
  )

  const line1 =
    "La versión vigente y controlada de este documento, solo podrá ser consultada a través del sitio web Institucional www.usco.edu.co,"
  const line2 =
    "link Sistema Gestión de Calidad. La copia o impresión diferente a la publicada, será considerada como documento no controlado y su uso"
  const line3 = "indebido no es de responsabilidad de la Universidad Surcolombiana."

  drawCenteredText(page, line1, x + w / 2, yBase + 13, fonts.italic, 6.5, COLOR_MUTED)
  drawCenteredText(page, line2, x + w / 2, yBase + 6, fonts.italic, 6.5, COLOR_MUTED)
  drawCenteredText(page, line3, x + w / 2, yBase - 1, fonts.italic, 6.5, COLOR_MUTED)
}

// ============================================================
// Bandas de sección (encabezado / aspectos / table headers)
// ============================================================

function drawSectionTitle(
  page: PDFPage,
  fonts: { bold: PDFFont },
  text: string,
  yTop: number,
): number {
  const x = MARGIN
  const w = PAGE_W - MARGIN * 2
  const y = yTop - SECTION_HEADER_H
  drawFilledRect(page, x, y, w, SECTION_HEADER_H, COLOR_RED)
  drawBorderedRect(page, x, y, w, SECTION_HEADER_H)
  drawText(page, text, x + 6, y + 5, fonts.bold, 10, COLOR_TEXT_WHITE)
  return y
}

function drawSubBand(
  page: PDFPage,
  fonts: { bold: PDFFont },
  text: string,
  yTop: number,
  bg = COLOR_RED_LIGHT,
): number {
  const x = MARGIN
  const w = PAGE_W - MARGIN * 2
  const y = yTop - SUBHEADER_H
  drawFilledRect(page, x, y, w, SUBHEADER_H, bg)
  drawBorderedRect(page, x, y, w, SUBHEADER_H)
  drawCenteredText(page, text, x + w / 2, y + 4, fonts.bold, 9, COLOR_TEXT_WHITE)
  return y
}

function drawAspectos(
  page: PDFPage,
  fonts: { regular: PDFFont },
  text: string,
  yTop: number,
): number {
  const x = MARGIN
  const w = PAGE_W - MARGIN * 2
  const size = 7
  const lineH = 9
  const lines = wrapText(text, w - 8, fonts.regular, size)
  const boxH = lines.length * lineH + 6
  const y = yTop - boxH
  drawBorderedRect(page, x, y, w, boxH)
  drawMultiline(page, lines, x + 4, yTop - 2, fonts.regular, size, lineH)
  return y
}

function drawTableHeader(
  page: PDFPage,
  fonts: { bold: PDFFont },
  yTop: number,
): number {
  const y = yTop - SUBHEADER_H
  drawFilledRect(page, TABLE_X, y, COL_ACTIVIDADES_W, SUBHEADER_H, COLOR_RED_LIGHT)
  drawFilledRect(
    page,
    TABLE_X + COL_ACTIVIDADES_W,
    y,
    COL_PERIODO_W,
    SUBHEADER_H,
    COLOR_RED_LIGHT,
  )
  drawBorderedRect(page, TABLE_X, y, COL_ACTIVIDADES_W, SUBHEADER_H)
  drawBorderedRect(page, TABLE_X + COL_ACTIVIDADES_W, y, COL_PERIODO_W, SUBHEADER_H)
  drawCenteredText(
    page,
    "ACTIVIDADES DESARROLLADAS (Incluir soportes)",
    TABLE_X + COL_ACTIVIDADES_W / 2,
    y + 4,
    fonts.bold,
    9,
    COLOR_TEXT_WHITE,
  )
  drawCenteredText(
    page,
    "PERIODO DE EJECUCIÓN",
    TABLE_X + COL_ACTIVIDADES_W + COL_PERIODO_W / 2,
    y + 4,
    fonts.bold,
    9,
    COLOR_TEXT_WHITE,
  )
  return y
}

// ============================================================
// Filas de actividades
// ============================================================

function computeRowHeight(
  row: ActividadRow,
  fonts: { regular: PDFFont; bold: PDFFont },
): { totalH: number; tituloLines: string[]; detalleLines: string[]; horasText: string; productosLines: string[] } {
  const innerW = COL_ACTIVIDADES_W - 8
  const tituloLines = wrapText(row.titulo, innerW, fonts.bold, 9)

  const detalleLines = row.detalle
    ? wrapText(row.detalle, innerW, fonts.regular, 8)
    : []

  const estado = compararEjecucion(row.horasPlanificadas, row.horasEjecutadas)
  const estadoLabel =
    estado === "igual"
      ? "Cumplido"
      : estado === "menos"
        ? "Subejecutado"
        : "Sobreejecutado"
  const horasText = `Planificado: ${row.horasPlanificadas}h  ·  Ejecutado: ${row.horasEjecutadas}h  ·  ${estadoLabel}`

  const productosLines = row.productos
    ? wrapText(`Soportes/Productos: ${row.productos}`, innerW, fonts.regular, 7.5)
    : []

  const lineH = 10
  const totalH =
    ROW_PADDING * 2 +
    tituloLines.length * lineH +
    (detalleLines.length > 0 ? detalleLines.length * 9 + 2 : 0) +
    11 + // horasText
    (productosLines.length > 0 ? productosLines.length * 9 + 2 : 0)

  return { totalH, tituloLines, detalleLines, horasText, productosLines }
}

function drawRow(
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont },
  row: ActividadRow,
  periodoLabel: string,
  yTop: number,
): number {
  const computed = computeRowHeight(row, fonts)
  const h = computed.totalH
  const y = yTop - h

  // Bordes de las dos celdas
  drawBorderedRect(page, TABLE_X, y, COL_ACTIVIDADES_W, h)
  drawBorderedRect(page, TABLE_X + COL_ACTIVIDADES_W, y, COL_PERIODO_W, h)

  // Columna izquierda: contenido
  let cursorY = yTop - ROW_PADDING
  const innerX = TABLE_X + 4

  // Título (bold)
  for (const line of computed.tituloLines) {
    cursorY -= 10
    drawText(page, line, innerX, cursorY + 2, fonts.bold, 9)
  }

  // Detalle (gris)
  if (computed.detalleLines.length > 0) {
    cursorY -= 2
    for (const line of computed.detalleLines) {
      cursorY -= 9
      drawText(page, line, innerX, cursorY + 1, fonts.regular, 8, COLOR_MUTED)
    }
  }

  // Horas (texto con estado)
  cursorY -= 11
  drawText(page, computed.horasText, innerX, cursorY + 2, fonts.regular, 8)

  // Productos
  if (computed.productosLines.length > 0) {
    cursorY -= 2
    for (const line of computed.productosLines) {
      cursorY -= 9
      drawText(page, line, innerX, cursorY + 1, fonts.regular, 7.5, COLOR_MUTED)
    }
  }

  // Columna derecha: periodo de ejecución (centrado vertical)
  drawCenteredText(
    page,
    periodoLabel,
    TABLE_X + COL_ACTIVIDADES_W + COL_PERIODO_W / 2,
    y + h / 2 - 3,
    fonts.bold,
    10,
  )

  return y
}

function drawEmptyTableCell(
  page: PDFPage,
  fonts: { italic: PDFFont },
  yTop: number,
  height = 80,
): number {
  const y = yTop - height
  drawBorderedRect(page, TABLE_X, y, COL_ACTIVIDADES_W, height)
  drawBorderedRect(page, TABLE_X + COL_ACTIVIDADES_W, y, COL_PERIODO_W, height)
  drawCenteredText(
    page,
    "(Sin actividades registradas en esta sección)",
    TABLE_X + COL_ACTIVIDADES_W / 2,
    y + height / 2 - 3,
    fonts.italic,
    8,
    COLOR_MUTED,
  )
  return y
}

function drawObservaciones(
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont },
  text: string,
  yTop: number,
): number {
  const x = MARGIN
  const w = PAGE_W - MARGIN * 2

  // Banda "OBSERVACIONES"
  const bandY = yTop - SUBHEADER_H
  drawFilledRect(page, x, bandY, w, SUBHEADER_H, COLOR_RED_LIGHT)
  drawBorderedRect(page, x, bandY, w, SUBHEADER_H)
  drawCenteredText(page, "OBSERVACIONES", x + w / 2, bandY + 4, fonts.bold, 9, COLOR_TEXT_WHITE)

  // Caja de texto
  const lines = text ? wrapText(text, w - 8, fonts.regular, 8) : []
  const minBoxH = 38
  const lineH = 10
  const boxH = Math.max(minBoxH, lines.length * lineH + 8)
  const boxY = bandY - boxH
  drawBorderedRect(page, x, boxY, w, boxH)
  if (lines.length > 0) {
    drawMultiline(page, lines, x + 4, bandY - 2, fonts.regular, 8, lineH)
  }
  return boxY
}

function drawFirmas(
  page: PDFPage,
  fonts: { bold: PDFFont; italic: PDFFont },
  yTop: number,
  nombreDocente: string,
): number {
  const x = MARGIN
  const w = PAGE_W - MARGIN * 2
  const colW = w / 3

  // Líneas de firma
  const lineY = yTop - 30
  for (let i = 0; i < 3; i++) {
    const lx = x + colW * i + 30
    const lw = colW - 60
    page.drawLine({
      start: { x: lx, y: lineY },
      end: { x: lx + lw, y: lineY },
      color: COLOR_TEXT,
      thickness: 0.6,
    })
  }

  // Etiquetas
  const labels = ["Firma del Docente", "Firma del Jefe del Programa", "Firma del Decano"]
  for (let i = 0; i < 3; i++) {
    drawCenteredText(
      page,
      labels[i],
      x + colW * i + colW / 2,
      lineY - 11,
      fonts.italic,
      9,
    )
  }

  // Nombre del docente bajo la primera línea
  if (nombreDocente) {
    drawCenteredText(
      page,
      nombreDocente,
      x + colW / 2,
      lineY + 4,
      fonts.bold,
      9,
    )
  }

  return lineY - 16
}

// ============================================================
// Construcción de secciones desde el monitoreo
// ============================================================

function buildSecciones(m: MonitoreoConRelaciones): Seccion[] {
  // Indexar reportes por item id
  const reportesDocPorCurso = new Map(
    m.reportesDocencia.map((r) => [r.cursoAgendaId, r]),
  )
  const reportesActDocPorItem = new Map(
    m.reportesActividadDocencia.map((r) => [r.actividadDocenciaId, r]),
  )
  const reportesInvPorItem = new Map(
    m.reportesInvestigacion.map((r) => [r.actividadInvestigacionId, r]),
  )
  const reportesProyPorItem = new Map(
    m.reportesProyeccion.map((r) => [r.actividadProyeccionSocialId, r]),
  )
  const reportesGesPorItem = new Map(
    m.reportesGestion.map((r) => [r.actividadGestionId, r]),
  )

  // I. Académicas Básicas = Docencia + Investigación + Proyección Social
  const basicas: ActividadRow[] = []
  for (const c of m.agenda.cursos) {
    const r = reportesDocPorCurso.get(c.id)
    if (!r) continue
    const det: string[] = []
    if (c.subgrupo) det.push(`Subgrupo ${c.subgrupo}`)
    if (c.sede) det.push(c.sede)
    basicas.push({
      titulo: `Docencia · ${c.numeroCurso} — ${c.nombreCurso}`,
      detalle: det.join(" · ") || null,
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

  // II. Complementarias = otras actividades de docencia
  const complementarias: ActividadRow[] = m.agenda.otrasActividadesDocencia
    .map((a): ActividadRow | null => {
      const r = reportesActDocPorItem.get(a.id)
      if (!r) return null
      return {
        titulo: a.nombre,
        detalle: a.descripcion,
        horasPlanificadas: a.dedicacionPeriodo,
        horasEjecutadas: r.horasEjecutadas,
        productos: r.productosEntregados,
      }
    })
    .filter((r): r is ActividadRow => r !== null)

  // III. Administrativas = Gestión
  const administrativas: ActividadRow[] = m.agenda.actividadesGestion
    .map((a): ActividadRow | null => {
      const r = reportesGesPorItem.get(a.id)
      if (!r) return null
      return {
        titulo: a.nombre,
        detalle: a.descripcion,
        horasPlanificadas: a.dedicacionPeriodo,
        horasEjecutadas: r.horasEjecutadas,
        productos: r.productosEntregados,
      }
    })
    .filter((r): r is ActividadRow => r !== null)

  // IV. Desarrollo Institucional = vacío por defecto
  const desarrolloInst: ActividadRow[] = []

  return [
    {
      numero: "I",
      titulo: "I. ACTIVIDADES ACADÉMICAS BÁSICAS",
      aspectos:
        'Se entiende por "Actividades Académicas Básicas" las labores desarrolladas por el docente en torno a la docencia, a la investigación, a la proyección social. Todos los docentes de la Universidad Surcolombiana: tiempo completo, medio tiempo y catedráticos, tienen como actividad primordial las inscritas en las "Actividades Académicas Básicas".',
      rows: basicas,
      observaciones: buildObservacionesAuto(basicas),
    },
    {
      numero: "II",
      titulo: "II. ACTIVIDADES ACADÉMICAS COMPLEMENTARIAS",
      aspectos:
        'Se entiende por "Actividades Académicas Complementarias" las labores desarrolladas por el docente para soportar las Actividades Académicas Básicas tales como: coordinación de pasantías, comités de autoevaluación, consejería académica, asesoría a estudiantes, diseño de programas, preparación y ofrecimiento de conferencias, escritura de artículos, representaciones universitarias, entre otras de similar naturaleza a juicio del Programa.',
      rows: complementarias,
      observaciones: buildObservacionesAuto(complementarias),
    },
    {
      numero: "III",
      titulo: "III. ACTIVIDADES ADMINISTRATIVAS",
      aspectos:
        'Se entiende por "Actividades Administrativas" las labores desarrolladas por un docente con fines exclusivamente de dirección universitaria a favor del desarrollo académico, tales como: jefaturas de programa, coordinaciones, secretarías académicas, representaciones a consejos y comités, decanatos, vicerrectorías y demás funciones de planeación, organización, dirección y evaluación de unidades académicas.',
      rows: administrativas,
      observaciones: buildObservacionesAuto(administrativas),
    },
    {
      numero: "IV",
      titulo: "IV. ACTIVIDADES DE DESARROLLO INSTITUCIONAL",
      aspectos:
        "Se entiende por Actividades de Desarrollo Institucional, las que tienen como objetivo formular y ejecutar proyectos que contribuyan al mejoramiento de la Calidad Institucional y al cumplimiento de las metas universitarias. La asignación de horas para actividades de Desarrollo Institucional será aprobada por el Consejo Académico, previo concepto del Consejo de Facultad.",
      rows: desarrolloInst,
      observaciones: "",
    },
  ]
}

function buildObservacionesAuto(rows: ActividadRow[]): string {
  if (rows.length === 0) return ""
  const totalPlan = rows.reduce((s, r) => s + r.horasPlanificadas, 0)
  const totalReal = rows.reduce((s, r) => s + r.horasEjecutadas, 0)
  const diff = totalReal - totalPlan
  const signo = diff > 0 ? "+" : ""
  return `Resumen de sección — Planificado: ${totalPlan}h · Ejecutado: ${totalReal}h · Diferencia: ${signo}${diff}h.`
}

// ============================================================
// Render principal
// ============================================================

export async function renderFo20Pdf(
  monitoreo: MonitoreoConRelaciones,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const regular = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique)
  const fonts = { regular, bold, italic }

  const secciones = buildSecciones(monitoreo)
  const periodoLabel = monitoreo.periodo

  // Pre-calcular páginas necesarias. Estrategia: una sección por página
  // (igual que el PDF oficial); si los rows no caben, se continúa en
  // página extra preservando el orden.
  type PageContent =
    | { kind: "section-start"; seccion: Seccion; isFirst: boolean }
    | { kind: "section-continue"; seccion: Seccion; rowsFrom: number }

  // Para simplicidad: crear una página por sección y dejar que filas
  // largas se trunquen visualmente (caso raro: > 8 rows por sección).
  // Total páginas = secciones.length (4).
  const totalPages = secciones.length

  for (let i = 0; i < secciones.length; i++) {
    const seccion = secciones[i]
    const page = doc.addPage([PAGE_W, PAGE_H])

    drawHeader(page, fonts, i + 1, totalPages)
    drawFooter(page, fonts)

    // Punto de partida: justo debajo del encabezado (header + metadatos)
    let y = PAGE_H - MARGIN - HEADER_H - 16 - 6

    // Bloque del docente solo en página 1
    if (i === 0) {
      y = drawDocenteInfo(page, fonts, monitoreo, y) - 6
    }

    // Título de sección
    y = drawSectionTitle(page, fonts, seccion.titulo, y)

    // Aspectos a tener en cuenta
    y = drawSubBand(page, fonts, "ASPECTOS A TENER EN CUENTA", y)
    y = drawAspectos(page, fonts, seccion.aspectos, y)

    // Tabla
    y = drawTableHeader(page, fonts, y)

    if (seccion.rows.length === 0) {
      y = drawEmptyTableCell(page, fonts, y, 60)
    } else {
      // Calcular altura disponible para filas
      // Reservar espacio para observaciones (44pt mínimo + 16 banda) y, en pág 4, firmas (52pt)
      const reservedFooterFromY = MARGIN + FOOTER_H
      const reservedObsH = 16 + 44 + 6
      const reservedFirmas = i === secciones.length - 1 ? 56 : 0
      const yMinForRows = reservedFooterFromY + reservedObsH + reservedFirmas + 4

      let rowsDrawn = 0
      for (const row of seccion.rows) {
        const computed = computeRowHeight(row, fonts)
        if (y - computed.totalH < yMinForRows) {
          // No cabe más en esta página: avisar y truncar
          break
        }
        y = drawRow(page, fonts, row, periodoLabel, y)
        rowsDrawn++
      }

      // Si quedaron filas sin dibujar, añadir nota
      if (rowsDrawn < seccion.rows.length) {
        const remainingRows = seccion.rows.length - rowsDrawn
        const noteH = 14
        const ny = y - noteH
        drawBorderedRect(page, TABLE_X, ny, TABLE_W, noteH)
        drawCenteredText(
          page,
          `(+ ${remainingRows} actividad(es) adicional(es) no mostrada(s) por límite de página — consulte la versión web)`,
          TABLE_X + TABLE_W / 2,
          ny + 4,
          fonts.italic,
          7.5,
          COLOR_MUTED,
        )
        y = ny
      }
    }

    // Observaciones
    y -= 4
    y = drawObservaciones(page, fonts, seccion.observaciones, y)

    // Firmas en la última página
    if (i === secciones.length - 1) {
      y -= 8
      drawFirmas(page, fonts, y, monitoreo.docente.nombre)
    }
  }

  return await doc.save()
}
