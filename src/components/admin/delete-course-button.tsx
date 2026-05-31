"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { eliminarCursoMaestro } from "@/lib/actions/curso-maestro-actions"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Trash2, Loader2, Lock } from "lucide-react"
import { toast } from "sonner"

interface DeleteCourseButtonProps {
  cursoId: string
  cursoCodigo: string
  cursoNombre: string
  cursosAgendaCount: number
}

export function DeleteCourseButton({
  cursoId,
  cursoCodigo,
  cursoNombre,
  cursosAgendaCount,
}: DeleteCourseButtonProps) {
  // ── Variante BLOQUEADA ───────────────────────────────────────────────
  // Cuando el curso está referenciado por al menos una agenda FO-19,
  // sustituimos la papelera por un candado informativo. El server action
  // sigue siendo el guardián absoluto: la UI solo refleja la verdad.
  if (cursosAgendaCount > 0) {
    return <LockedDeleteButton count={cursosAgendaCount} />
  }

  // ── Variante ELIMINABLE ──────────────────────────────────────────────
  return <ActiveDeleteButton cursoId={cursoId} cursoCodigo={cursoCodigo} cursoNombre={cursoNombre} />
}

// =====================================================================
// Variante deshabilitada con candado + tooltip accesible
// =====================================================================
function LockedDeleteButton({ count }: { count: number }) {
  const isSingular = count === 1
  const palabraAgenda = isSingular ? "agenda" : "agendas"

  // Tooltip: 2 oraciones, concretas, sin tecnicismos.
  // - Qué pasa: cuántas agendas lo usan.
  // - Qué hacer: desactivar con el interruptor de la izquierda.
  // El candado (ícono) ya comunica "bloqueado"; el badge "N agendas" (tabla)
  // ya cuantifica. El tooltip cierra el bucle diciendo la acción exacta.
  const tooltipText = `En uso por ${count} ${palabraAgenda} FO-19. Para retirarlo del catálogo, desactívalo.`

  // Patrón de accesibilidad: NO usamos `<button disabled>` (no recibe
  // mouseenter ni focus, lo que ROMPE el tooltip). En su lugar, un
  // <span> focusable con aria-disabled actúa como trigger, y el botón
  // interior solo tiene rol visual.
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            tabIndex={0}
            role="button"
            aria-disabled="true"
            aria-label={`Curso bloqueado — ${count} ${palabraAgenda} FO-19 lo referencian. No se puede eliminar.`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2"
          >
            <Lock className="h-4 w-4" aria-hidden="true" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs leading-relaxed">
          {tooltipText}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// =====================================================================
// Variante activa con confirmación
// =====================================================================
function ActiveDeleteButton({
  cursoId,
  cursoCodigo,
  cursoNombre,
}: {
  cursoId: string
  cursoCodigo: string
  cursoNombre: string
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleConfirm(e: React.MouseEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await eliminarCursoMaestro(cursoId)
      if ("error" in result) {
        toast.error(result.error)
        setOpen(false)
        return
      }
      toast.success(`Curso "${cursoNombre}" eliminado.`)
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          aria-label={`Eliminar ${cursoNombre}`}
          title="Eliminar"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar este curso del catálogo?</AlertDialogTitle>
          <AlertDialogDescription>
            Vas a eliminar permanentemente{" "}
            <span className="font-mono font-medium">{cursoCodigo}</span> —{" "}
            <span className="font-medium">{cursoNombre}</span>. Esta acción no
            se puede deshacer.
            <br />
            <br />
            Si el curso ya está siendo usado en alguna agenda no podrá
            eliminarse; en ese caso, desactívalo en su lugar para que deje de
            aparecer en nuevas agendas.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Eliminando...
              </>
            ) : (
              "Sí, eliminar"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
