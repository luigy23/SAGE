/**
 * Render del PDF FO-19: overlay de datos de agenda sobre la plantilla oficial.
 *
 * Estrategia: cargar `public/templates/fo19.pdf` y dibujar texto sobre las
 * coordenadas de FO19_COORDS usando pdf-lib. La plantilla NO se modifica;
 * solo se añade una capa de texto encima.
 */
import { readFile } from "node:fs/promises"
import path from "node:path"
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib"
import type { AgendaConRelaciones } from "@/lib/types/agenda"
import { FO19_COORDS } from "./fo19-coords"

type Modalidad =
  | "PLANTA_TC"
  | "PLANTA_MT"
  | "OCASIONAL_TC"
  | "OCASIONAL_MT"
  | "CATEDRA"
  | "VISITANTE"
  | "INVITADO"

const FONT_SIZE_DEFAULT = 8
const FONT_SIZE_SMALL = 7
const FONT_COLOR = rgb(0, 0, 0)

/**
 * Marca con "X" la casilla de modalidad correspondiente.
 * El PDF tiene 6 columnas: TC-Planta, TC-Ocasional, MT-Planta, MT-Catedra (sic), Catedra, Otra.
 */
function modalidadKey(m: Modalidad): keyof typeof FO19_COORDS.page1 {
  switch (m) {
    case "PLANTA_TC":    return "mod_TCP"
    case "OCASIONAL_TC": return "mod_TCO"
    case "PLANTA_MT":    return "mod_MTP"
    case "OCASIONAL_MT": return "mod_MTC"
    case "CATEDRA":      return "mod_CATEDRA"
    case "VISITANTE":
    case "INVITADO":     return "mod_OTRO"
  }
}

function drawText(
  page: PDFPage,
  text: string | number | null | undefined,
  x: number,
  y: number,
  font: PDFFont,
  size = FONT_SIZE_DEFAULT,
) {
  if (text === null || text === undefined || text === "") return
  page.drawText(String(text), { x, y, size, font, color: FONT_COLOR })
}

/**
 * Word-wraps text to fit within `maxWidth`. Respects explicit "\n" line breaks
 * in the source text. Caps at `maxLines`; if exceeded, truncates the last
 * visible line with an ellipsis. Returns an array of lines ready to render.
 */
function wrapText(
  text: string | null | undefined,
  maxWidth: number,
  font: PDFFont,
  size: number,
  maxLines: number,
): string[] {
  if (!text) return []
  const out: string[] = []
  const paragraphs = String(text).split(/\r?\n/)

  for (const paragraph of paragraphs) {
    if (out.length >= maxLines) break
    const words = paragraph.split(/\s+/).filter(Boolean)
    if (words.length === 0) {
      out.push("")
      continue
    }
    let current = ""
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate
      } else {
        if (current) {
          out.push(current)
          if (out.length >= maxLines) break
        }
        // Word itself exceeds width: hard-break per character.
        if (font.widthOfTextAtSize(word, size) > maxWidth) {
          let chunk = ""
          for (const ch of word) {
            if (font.widthOfTextAtSize(chunk + ch, size) > maxWidth) {
              if (chunk) {
                out.push(chunk)
                if (out.length >= maxLines) break
              }
              chunk = ch
            } else {
              chunk += ch
            }
          }
          current = chunk
        } else {
          current = word
        }
      }
    }
    if (current && out.length < maxLines) out.push(current)
  }

  // Truncate overflow with ellipsis on the last visible line.
  if (out.length > maxLines) {
    out.length = maxLines
    const overflowed = true
    if (overflowed) {
      let last = out[maxLines - 1]
      while (last.length > 0 && font.widthOfTextAtSize(last + "…", size) > maxWidth) {
        last = last.slice(0, -1)
      }
      out[maxLines - 1] = last + "…"
    }
  }
  return out
}

/**
 * Renders pre-wrapped lines stacking downward from `yTop`.
 */
function drawMultiline(
  page: PDFPage,
  lines: string[],
  x: number,
  yTop: number,
  font: PDFFont,
  size: number,
  lineHeight: number,
) {
  lines.forEach((line, i) => {
    if (!line) return
    page.drawText(line, { x, y: yTop - i * lineHeight, size, font, color: FONT_COLOR })
  })
}

function drawCentered(
  page: PDFPage,
  text: string | number | null | undefined,
  cx: number,
  width: number,
  y: number,
  font: PDFFont,
  size = FONT_SIZE_DEFAULT,
) {
  if (text === null || text === undefined || text === "") return
  const s = String(text)
  const tw = font.widthOfTextAtSize(s, size)
  page.drawText(s, { x: cx - tw / 2, y, size, font, color: FONT_COLOR })
}

function drawRight(
  page: PDFPage,
  text: string | number | null | undefined,
  rx: number,
  y: number,
  font: PDFFont,
  size = FONT_SIZE_DEFAULT,
) {
  if (text === null || text === undefined || text === "") return
  const s = String(text)
  const tw = font.widthOfTextAtSize(s, size)
  page.drawText(s, { x: rx - tw, y, size, font, color: FONT_COLOR })
}

export async function renderFo19Pdf(agenda: AgendaConRelaciones): Promise<Uint8Array> {
  const templatePath = path.join(process.cwd(), "public/templates/fo19.pdf")
  const tmplBytes = await readFile(templatePath)
  const pdf = await PDFDocument.load(tmplBytes)
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const [page1, page2] = pdf.getPages()

  const { docente } = agenda
  const p1 = FO19_COORDS.page1
  const p2 = FO19_COORDS.page2

  // ===== Página 1: identificación =====
  drawText(page1, docente.facultad, p1.facultad.x, p1.facultad.y, font)
  drawText(page1, docente.programa, p1.programa.x, p1.programa.y, font)
  drawText(page1, docente.nombre,   p1.nombre.x,   p1.nombre.y,   font)
  drawText(page1, docente.cedula,   p1.cedula.x,   p1.cedula.y,   font)
  drawText(
    page1,
    new Date(agenda.updatedAt).toLocaleDateString("es-CO"),
    p1.fecha.x, p1.fecha.y, font,
  )
  drawText(page1, agenda.periodo, p1.periodo.x, p1.periodo.y, font)

  // Modalidad: X centrada en la casilla
  const modKey = modalidadKey(docente.modalidad as Modalidad)
  const modPos = p1[modKey] as { x: number; y: number }
  drawCentered(page1, "X", modPos.x, 0, modPos.y, fontBold, 10)

  // ===== Tabla 1.0 Cursos =====
  const cursos = agenda.cursos.slice(0, p1.docencia.max_rows)
  let subtotalCursos = 0
  const PAD = 2 // padding interior horizontal en celdas con texto largo
  cursos.forEach((c, i) => {
    const y = p1.docencia.y_first_row - i * p1.docencia.row_height
    const cols = p1.docencia.cols
    drawCentered(page1, c.numeroCurso,    cols.numero.x,    cols.numero.width,    y, font, FONT_SIZE_SMALL)
    const nombreLines = wrapText(c.nombreCurso, cols.nombre.width - PAD * 2, font, FONT_SIZE_SMALL, 2)
    drawMultiline(page1, nombreLines, cols.nombre.x - cols.nombre.width / 2 + PAD, y, font, FONT_SIZE_SMALL, 7)
    drawCentered(page1, c.subgrupo ?? "", cols.subgrupo.x,  cols.subgrupo.width,  y, font, FONT_SIZE_SMALL)
    drawCentered(page1, c.sede ?? "",     cols.sede.x,      cols.sede.width,      y, font, FONT_SIZE_SMALL)
    drawCentered(page1, c.horasPresenciales, cols.horasPres.x, cols.horasPres.width, y, font, FONT_SIZE_SMALL)
    drawCentered(page1, c.creditos,       cols.creditos.x,  cols.creditos.width,  y, font, FONT_SIZE_SMALL)
    drawCentered(page1, c.semanas,        cols.semanas.x,   cols.semanas.width,   y, font, FONT_SIZE_SMALL)
    drawRight   (page1, c.dedicacionPeriodo, cols.dedicacion.x + cols.dedicacion.width / 2, y, font)
    subtotalCursos += c.dedicacionPeriodo
  })
  drawRight(page1, subtotalCursos, p1.docencia.subtotal.x + 20, p1.docencia.subtotal.y, fontBold)

  // ===== 1.1 Horarios =====
  const cursosConHorario = agenda.cursos
    .filter((c) => c.horarios.length > 0)
    .slice(0, p1.horario.max_rows)
  cursosConHorario.forEach((c, i) => {
    const h = c.horarios[0]
    const y = p1.horario.y_first_row - i * p1.horario.row_height
    const cols = p1.horario.cols
    drawCentered(page1, c.numeroCurso, cols.numero.x, cols.numero.width, y, font, FONT_SIZE_SMALL)
    const nombreLinesH = wrapText(c.nombreCurso, cols.nombre.width - PAD * 2, font, FONT_SIZE_SMALL, 2)
    drawMultiline(page1, nombreLinesH, cols.nombre.x - cols.nombre.width / 2 + PAD, y, font, FONT_SIZE_SMALL, 7)
    drawCentered(page1, h.lunes ?? "",     cols.lunes.x,     cols.lunes.width,     y, font, FONT_SIZE_SMALL)
    drawCentered(page1, h.martes ?? "",    cols.martes.x,    cols.martes.width,    y, font, FONT_SIZE_SMALL)
    drawCentered(page1, h.miercoles ?? "", cols.miercoles.x, cols.miercoles.width, y, font, FONT_SIZE_SMALL)
    drawCentered(page1, h.jueves ?? "",    cols.jueves.x,    cols.jueves.width,    y, font, FONT_SIZE_SMALL)
    drawCentered(page1, h.viernes ?? "",   cols.viernes.x,   cols.viernes.width,   y, font, FONT_SIZE_SMALL)
    drawCentered(page1, h.sabado ?? "",    cols.sabado.x,    cols.sabado.width,    y, font, FONT_SIZE_SMALL)
    drawCentered(page1, h.domingo ?? "",   cols.domingo.x,   cols.domingo.width,   y, font, FONT_SIZE_SMALL)
  })

  // ===== 1.2 Otras actividades de docencia =====
  const otras = agenda.otrasActividadesDocencia.slice(0, p1.otrasDocencia.max_rows)
  let subtotalOtras = 0
  otras.forEach((a, i) => {
    const y = p1.otrasDocencia.y_first_row - i * p1.otrasDocencia.row_height
    const cols = p1.otrasDocencia.cols
    // row_height=12 → solo 1 línea, truncar con elipsis
    const nombreLinesOD = wrapText(a.nombre, cols.nombre.width - PAD * 2, font, FONT_SIZE_SMALL, 1)
    const descLinesOD   = wrapText(a.descripcion ?? "", cols.descripcion.width - PAD * 2, font, FONT_SIZE_SMALL, 1)
    drawMultiline(page1, nombreLinesOD, cols.nombre.x - cols.nombre.width / 2 + PAD, y, font, FONT_SIZE_SMALL, 7)
    drawMultiline(page1, descLinesOD,   cols.descripcion.x - cols.descripcion.width / 2 + PAD, y, font, FONT_SIZE_SMALL, 7)
    drawRight(page1, a.dedicacionPeriodo, cols.dedicacion.x + cols.dedicacion.width / 2, y, font)
    subtotalOtras += a.dedicacionPeriodo
  })
  drawRight(page1, subtotalOtras,             p1.otrasDocencia.subtotal.x + 20, p1.otrasDocencia.subtotal.y, fontBold)
  drawRight(page1, subtotalCursos + subtotalOtras, p1.otrasDocencia.total1.x + 20, p1.otrasDocencia.total1.y, fontBold)

  // ===== Página 2: investigación / proyección / gestión =====
  type SectionShape = {
    y_first_row: number
    row_height: number
    max_rows: number
    cols: {
      nombre: { x: number; width: number }
      descripcion: { x: number; width: number }
      dedicacion: { x: number; width: number }
    }
  }
  function drawSection(
    items: { nombre: string; descripcion: string | null; dedicacionPeriodo: number }[],
    section: SectionShape,
    totalX: number,
    totalY: number,
  ): number {
    let total = 0
    items.slice(0, section.max_rows).forEach((a, i) => {
      const y = section.y_first_row - i * section.row_height
      const cols = section.cols
      // row_height=14 → permitir 2 líneas con lineHeight=6.5
      const nombreLines = wrapText(a.nombre, cols.nombre.width - PAD * 2, font, FONT_SIZE_SMALL, 2)
      const descLines   = wrapText(a.descripcion ?? "", cols.descripcion.width - PAD * 2, font, FONT_SIZE_SMALL, 2)
      drawMultiline(page2, nombreLines, cols.nombre.x - cols.nombre.width / 2 + PAD, y, font, FONT_SIZE_SMALL, 6.5)
      drawMultiline(page2, descLines,   cols.descripcion.x - cols.descripcion.width / 2 + PAD, y, font, FONT_SIZE_SMALL, 6.5)
      drawRight(page2, a.dedicacionPeriodo, cols.dedicacion.x + cols.dedicacion.width / 2, y, font)
      total += a.dedicacionPeriodo
    })
    drawRight(page2, total, totalX + 20, totalY, fontBold)
    return total
  }

  const t2 = drawSection(agenda.actividadesInvestigacion,    p2.investigacion, p2.investigacion.total2.x, p2.investigacion.total2.y)
  const t3 = drawSection(agenda.actividadesProyeccionSocial, p2.proyeccion,    p2.proyeccion.total3.x,    p2.proyeccion.total3.y)
  const t4 = drawSection(agenda.actividadesGestion,          p2.gestion,       p2.gestion.total4.x,       p2.gestion.total4.y)

  const granTotal = subtotalCursos + subtotalOtras + t2 + t3 + t4
  drawRight(page2, granTotal, p2.granTotal.x + 20, p2.granTotal.y, fontBold)

  // Nombres bajo las firmas (la firma física la pone el usuario al imprimir)
  drawText(page2, docente.nombre, p2.nombreDocenteFinal.x, p2.nombreDocenteFinal.y, font, FONT_SIZE_SMALL)

  return await pdf.save()
}
