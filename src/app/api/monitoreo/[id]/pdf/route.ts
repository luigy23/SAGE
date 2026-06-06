import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { renderFo20Pdf } from "@/lib/pdf/fo20-render"
import type { MonitoreoConRelaciones } from "@/lib/types/monitoreo"
import { getAutoridadDeSesion } from "@/lib/auth/get-autoridad"
import { puedeGestionarFormulario } from "@/lib/auth/autoridad"

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

  if (!monitoreo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Autorización: el dueño siempre; o una autoridad académica (Jefe/Decano/SUPERADMIN)
  // dentro de su ámbito, para la supervisión global y la revisión de monitoreos.
  let autorizado = monitoreo.docenteId === session.user.id
  if (!autorizado) {
    const sesion = await getAutoridadDeSesion()
    if (sesion && puedeGestionarFormulario(sesion.autoridad, monitoreo.docente)) {
      autorizado = true
    }
  }
  if (!autorizado) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const bytes = await renderFo20Pdf(monitoreo as MonitoreoConRelaciones, monitoreo.estado)

  const safePeriodo = monitoreo.periodo.replace(/[^a-zA-Z0-9._-]/g, "_")
  const safeNombre = monitoreo.docente.nombre.replace(/[^a-zA-Z0-9._-]/g, "_")
  const filename = `FO-20_${safePeriodo}_${safeNombre}.pdf`

  return new NextResponse(bytes as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
