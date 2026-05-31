import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { renderFo19Pdf } from "@/lib/pdf/fo19-render"
import type { AgendaConRelaciones } from "@/lib/types/agenda"

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

  const agenda = await prisma.agendaSemestral.findUnique({
    where: { id },
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
  })

  if (!agenda || agenda.docenteId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const bytes = await renderFo19Pdf(agenda as AgendaConRelaciones, agenda.estado)

  const safePeriodo = agenda.periodo.replace(/[^a-zA-Z0-9._-]/g, "_")
  const safeNombre = agenda.docente.nombre.replace(/[^a-zA-Z0-9._-]/g, "_")
  const filename = `FO-19_${safePeriodo}_${safeNombre}.pdf`

  return new NextResponse(bytes as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
