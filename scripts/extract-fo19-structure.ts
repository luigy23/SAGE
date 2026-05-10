/**
 * Extrae texto y geometría del PDF FO-19 usando pdfjs-dist.
 * Salida JSON con:
 *   - texts: [{ str, x, y, width, height, fontName }]
 *   - lines/rects no se extraen aquí (son operators de bajo nivel)
 *
 * Uso: npx tsx scripts/extract-fo19-structure.ts > tmp/fo19-structure.json
 */
import { readFile, writeFile, mkdir } from "node:fs/promises"
import path from "node:path"

async function main() {
  const root = process.cwd()
  await mkdir(path.join(root, "tmp"), { recursive: true })

  // pdfjs-dist legacy build (CJS-friendly)
  // @ts-expect-error sin tipos para el legacy build
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")
  // Apunta al worker que trae pdfjs-dist
  pdfjs.GlobalWorkerOptions.workerSrc = path.join(
    root,
    "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"
  )

  const data = new Uint8Array(await readFile(path.join(root, "public/templates/fo19.pdf")))
  const doc = await pdfjs.getDocument({ data, isEvalSupported: false }).promise

  type Item = {
    page: number
    str: string
    x: number
    y: number
    width: number
    height: number
    fontName: string
  }

  const items: Item[] = []

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const viewport = page.getViewport({ scale: 1 })
    const content = await page.getTextContent()

    for (const it of content.items as Array<{
      str: string
      transform: number[]
      width: number
      height: number
      fontName: string
    }>) {
      // transform = [a, b, c, d, e, f] → e=x, f=y (en sistema PDF, y desde abajo)
      const [, , , , x, y] = it.transform
      items.push({
        page: p,
        str: it.str,
        x: Math.round(x * 100) / 100,
        y: Math.round(y * 100) / 100,
        width: Math.round(it.width * 100) / 100,
        height: Math.round(it.height * 100) / 100,
        fontName: it.fontName,
      })
    }

    console.error(
      `Página ${p}: ${viewport.width}×${viewport.height}, ${content.items.length} items`
    )
  }

  // Output JSON ordenado por página luego Y descendente luego X ascendente
  items.sort((a, b) => a.page - b.page || b.y - a.y || a.x - b.x)
  console.log(JSON.stringify(items, null, 2))
}

main().catch((e) => { console.error(e); process.exit(1) })
