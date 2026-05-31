/**
 * Genera un PDF con marcadores en TODAS las posiciones donde se escribirán
 * datos. Sirve para validar visualmente que el mapa de coordenadas es correcto.
 *
 * Salida: tmp/fo19-test-marks.pdf
 */
import { readFile, writeFile, mkdir } from "node:fs/promises"
import path from "node:path"
import { PDFDocument, rgb, StandardFonts } from "pdf-lib"

// ============================================================
// MAPA DE COORDENADAS (derivado de tmp/fo19-structure.json)
// Sistema PDF: origen en esquina inferior izquierda. Página 612×792.
// ============================================================

const COORDS = {
  page1: {
    // Identificación (encima de las líneas; los labels están a y=671/648/625/602)
    facultad:    { x: 90,  y: 673 }, // después de "ACULTAD"
    programa:    { x: 348, y: 673 }, // después de "PROGRAMA/DPTO"
    nombre:      { x: 144, y: 650 }, // después de "NOMBRE DEL DOCENTE"
    cedula:      { x: 442, y: 650 }, // después de "CÉDULA"
    fecha:       { x: 100, y: 627 }, // después de "FECHA"
    periodo:     { x: 290, y: 627 }, // después de "PERÍODO"
    // Modalidad: marca X encima de cada línea ___
    mod_TCP:     { x: 142, y: 604 },
    mod_TCO:     { x: 184, y: 604 },
    mod_MTP:     { x: 222, y: 604 },
    mod_MTC:     { x: 263, y: 604 },
    mod_CATEDRA: { x: 313, y: 604 },
    mod_OTRO:    { x: 388, y: 604 },

    // Tabla 1. DOCENCIA
    // Headers en y~552/562. Las filas de datos van en orden descendente desde y=540.
    // Altura de fila ~17pt (datos ~5 filas + subtotal).
    docencia: {
      y_first_row: 537,         // centro Y de la 1a fila
      row_height:  17.6,
      max_rows:    5,
      cols: {
        numero:        { x: 80,  width: 50 },   // Nº curso
        nombre:        { x: 175, width: 95 },   // Nombre del Curso
        sede:          { x: 304, width: 35 },   // Sede
        horasPres:     { x: 360, width: 38 },   // Nro. Horas Presenciales
        creditos:      { x: 419, width: 35 },   // Nro. de Créditos
        semanas:       { x: 466, width: 36 },   // Número de Semanas
        dedicacion:    { x: 521, width: 50 },   // Dedicación por Periodo
      },
      subtotal: { x: 521, y: 446 }, // celda SUBTOTAL — fila final de la tabla
    },

    // 1.2 OTRAS ACTIVIDADES DE DOCENCIA — header y~235
    otrasDocencia: {
      y_first_row: 215,
      row_height:  12,
      max_rows:    5,
      cols: {
        nombre:     { x: 165, width: 165 },
        descripcion:{ x: 388, width: 130 },
        dedicacion: { x: 521, width: 50 },
      },
      subtotal: { x: 521, y: 142 },
      total1:   { x: 521, y: 124 },
    },
  },

  page2: {
    // Las 3 tablas (Investigación, Proyección, Gestión) tienen estructura idéntica:
    // Nombre / Descripción / Dedicación. Igual que "otrasDocencia".
    investigacion: {
      y_first_row: 614,
      row_height:  14,
      max_rows:    4,
      cols: {
        nombre:     { x: 165, width: 165 },
        descripcion:{ x: 388, width: 130 },
        dedicacion: { x: 521, width: 50 },
      },
      total2: { x: 521, y: 555 },
    },
    proyeccion: {
      y_first_row: 459,
      row_height:  14,
      max_rows:    4,
      cols: {
        nombre:     { x: 165, width: 165 },
        descripcion:{ x: 388, width: 130 },
        dedicacion: { x: 521, width: 50 },
      },
      total3: { x: 521, y: 401 },
    },
    gestion: {
      y_first_row: 304,
      row_height:  14,
      max_rows:    4,
      cols: {
        nombre:     { x: 165, width: 165 },
        descripcion:{ x: 388, width: 130 },
        dedicacion: { x: 521, width: 50 },
      },
      total4: { x: 521, y: 245 },
    },
    granTotal:  { x: 521, y: 207 },
    // Firmas: sobre las líneas que están encima de "FIRMA"/"NOMBRE".
    firmaDocente: { x: 75,  y: 158 },
    firmaJefe:    { x: 320, y: 158 },
    nombreDocenteFinal: { x: 105, y: 140 },
    nombreJefeFinal:    { x: 350, y: 140 },
  },
} as const

async function main() {
  const root = process.cwd()
  await mkdir(path.join(root, "tmp"), { recursive: true })

  const tmpl = await readFile(path.join(root, "public/templates/fo19.pdf"))
  const pdf = await PDFDocument.load(tmpl)
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const [page1, page2] = pdf.getPages()

  function dot(page: typeof page1, x: number, y: number, label = "") {
    page.drawCircle({ x, y, size: 2, color: rgb(1, 0, 0), opacity: 0.8 })
    if (label) {
      page.drawText(label, { x: x + 3, y: y + 3, size: 5, font, color: rgb(0, 0, 0.8) })
    }
  }

  // === Página 1 ===
  const p1 = COORDS.page1
  dot(page1, p1.facultad.x, p1.facultad.y, "FAC")
  dot(page1, p1.programa.x, p1.programa.y, "PRG")
  dot(page1, p1.nombre.x,   p1.nombre.y,   "NOM")
  dot(page1, p1.cedula.x,   p1.cedula.y,   "CED")
  dot(page1, p1.fecha.x,    p1.fecha.y,    "FE")
  dot(page1, p1.periodo.x,  p1.periodo.y,  "PR")
  dot(page1, p1.mod_TCP.x,     p1.mod_TCP.y,     "TCP")
  dot(page1, p1.mod_TCO.x,     p1.mod_TCO.y,     "TCO")
  dot(page1, p1.mod_MTP.x,     p1.mod_MTP.y,     "MTP")
  dot(page1, p1.mod_MTC.x,     p1.mod_MTC.y,     "MTC")
  dot(page1, p1.mod_CATEDRA.x, p1.mod_CATEDRA.y, "CAT")
  dot(page1, p1.mod_OTRO.x,    p1.mod_OTRO.y,    "OTR")

  // Tabla docencia (5 filas)
  for (let r = 0; r < p1.docencia.max_rows; r++) {
    const y = p1.docencia.y_first_row - r * p1.docencia.row_height
    for (const [colName, col] of Object.entries(p1.docencia.cols)) {
      dot(page1, col.x, y, r === 0 ? colName.slice(0, 3) : "")
    }
  }
  dot(page1, p1.docencia.subtotal.x, p1.docencia.subtotal.y, "SUB1")

  // Otras docencia
  for (let r = 0; r < p1.otrasDocencia.max_rows; r++) {
    const y = p1.otrasDocencia.y_first_row - r * p1.otrasDocencia.row_height
    for (const [colName, col] of Object.entries(p1.otrasDocencia.cols)) {
      dot(page1, col.x, y, r === 0 ? colName.slice(0, 3) : "")
    }
  }
  dot(page1, p1.otrasDocencia.subtotal.x, p1.otrasDocencia.subtotal.y, "SUB12")
  dot(page1, p1.otrasDocencia.total1.x, p1.otrasDocencia.total1.y, "TOT1")

  // === Página 2 ===
  const p2 = COORDS.page2
  function drawSection(section: { y_first_row: number; row_height: number; max_rows: number; cols: Record<string, { x: number; width: number }> }, label: string) {
    for (let r = 0; r < section.max_rows; r++) {
      const y = section.y_first_row - r * section.row_height
      for (const [colName, col] of Object.entries(section.cols)) {
        dot(page2, col.x, y, r === 0 ? `${label}-${colName.slice(0, 3)}` : "")
      }
    }
  }
  drawSection(p2.investigacion, "INV")
  dot(page2, p2.investigacion.total2.x, p2.investigacion.total2.y, "TOT2")
  drawSection(p2.proyeccion, "PRY")
  dot(page2, p2.proyeccion.total3.x, p2.proyeccion.total3.y, "TOT3")
  drawSection(p2.gestion, "GES")
  dot(page2, p2.gestion.total4.x, p2.gestion.total4.y, "TOT4")
  dot(page2, p2.granTotal.x, p2.granTotal.y, "GRAN")
  dot(page2, p2.firmaDocente.x, p2.firmaDocente.y, "FIRMA-DOC")
  dot(page2, p2.firmaJefe.x, p2.firmaJefe.y, "FIRMA-JEF")
  dot(page2, p2.nombreDocenteFinal.x, p2.nombreDocenteFinal.y, "NOM-DOC")
  dot(page2, p2.nombreJefeFinal.x, p2.nombreJefeFinal.y, "NOM-JEF")

  await writeFile(path.join(root, "tmp/fo19-test-marks.pdf"), await pdf.save())
  console.log("✓ tmp/fo19-test-marks.pdf")
}

main().catch((e) => { console.error(e); process.exit(1) })
