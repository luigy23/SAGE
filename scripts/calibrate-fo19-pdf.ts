/**
 * Genera una grilla fina (cada 5pt) sobre la plantilla FO-19 para calibrar.
 * Salida: tmp/fo19-grid-fine.pdf
 */
import { readFile, writeFile, mkdir } from "node:fs/promises"
import { PDFDocument, rgb, StandardFonts } from "pdf-lib"
import path from "node:path"

async function main() {
  const root = process.cwd()
  const tmpl = await readFile(path.join(root, "public/templates/fo19.pdf"))
  const pdf = await PDFDocument.load(tmpl)
  const font = await pdf.embedFont(StandardFonts.Helvetica)

  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize()

    // Cada 5pt línea muy tenue
    for (let x = 0; x <= width; x += 5) {
      page.drawLine({
        start: { x, y: 0 }, end: { x, y: height },
        thickness: 0.15, color: rgb(0, 0.5, 1), opacity: 0.15,
      })
    }
    for (let y = 0; y <= height; y += 5) {
      page.drawLine({
        start: { x: 0, y }, end: { x: width, y },
        thickness: 0.15, color: rgb(1, 0.3, 0), opacity: 0.15,
      })
    }
    // Cada 25pt línea más visible
    for (let x = 0; x <= width; x += 25) {
      page.drawLine({
        start: { x, y: 0 }, end: { x, y: height },
        thickness: 0.3, color: rgb(0, 0.5, 1), opacity: 0.4,
      })
      page.drawText(`${x}`, { x: x + 1, y: height - 9, size: 5, font, color: rgb(0, 0.3, 0.8) })
    }
    for (let y = 0; y <= height; y += 25) {
      page.drawLine({
        start: { x: 0, y }, end: { x: width, y },
        thickness: 0.3, color: rgb(1, 0.3, 0), opacity: 0.4,
      })
      page.drawText(`${y}`, { x: 2, y: y + 1, size: 5, font, color: rgb(0.8, 0.2, 0) })
    }
  }

  await writeFile(path.join(root, "tmp/fo19-grid-fine.pdf"), await pdf.save())
  console.log("✓ tmp/fo19-grid-fine.pdf")
}

main().catch((e) => { console.error(e); process.exit(1) })
