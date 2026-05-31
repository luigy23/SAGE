import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer"
import React from "react"
import type { AgendaConRelaciones } from "@/lib/types/agenda"
import { FO19Document } from "./fo19-template"

export async function renderFo19Pdf(
  agenda: AgendaConRelaciones,
  estado: string,
): Promise<Buffer> {
  const el = React.createElement(FO19Document, { agenda, estado }) as React.ReactElement<DocumentProps>
  return renderToBuffer(el)
}
