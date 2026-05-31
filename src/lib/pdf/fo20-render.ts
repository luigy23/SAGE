import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer"
import React from "react"
import type { MonitoreoConRelaciones } from "@/lib/types/monitoreo"
import { FO20Document } from "./fo20-template"

export async function renderFo20Pdf(
  monitoreo: MonitoreoConRelaciones,
  estado: string,
): Promise<Buffer> {
  const el = React.createElement(FO20Document, { monitoreo, estado }) as React.ReactElement<DocumentProps>
  return renderToBuffer(el)
}
