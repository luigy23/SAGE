import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { renderFo20Pdf } from "@/lib/pdf/fo20-render"
import type { MonitoreoConRelaciones } from "@/lib/types/monitoreo"

export const runtime = "nodejs"

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const monitoreo = await prisma.monitoreo.findUnique({
    where: { id },
    include: {
      docente: true,
      agenda: {
        include: {
          docente: true,
          cursos: {
            include: { horarios: true },
            orderBy: { numeroCurso: "asc" },
          },
          otrasActividadesDocencia: { orderBy: { nombre: "asc" } },
          actividadesInvestigacion: { orderBy: { nombre: "asc" } },
          actividadesProyeccionSocial: { orderBy: { nombre: "asc" } },
          actividadesGestion: { orderBy: { nombre: "asc" } },
        },
      },
      reportesDocencia: true,
      reportesActividadDocencia: true,
      reportesInvestigacion: true,
      reportesProyeccion: true,
      reportesGestion: true,
    },
  })

  if (!monitoreo || monitoreo.docenteId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const bytes = await renderFo20Pdf(monitoreo as MonitoreoConRelaciones)

  const safePeriodo = monitoreo.periodo.replace(/[^a-zA-Z0-9._-]/g, "_")
  const safeNombre = monitoreo.docente.nombre.replace(/[^a-zA-Z0-9._-]/g, "_")
  const filename = `FO-20_${safePeriodo}_${safeNombre}.pdf`

  return new NextResponse(new Uint8Array(bytes) as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
