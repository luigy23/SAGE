"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Upload, Download, AlertCircle, CheckCircle2, Loader2, FileSpreadsheet } from "lucide-react"
import { toast } from "sonner"
import {
  previewImportCursos,
  commitImportCursos,
  type ParsedRow,
  type RowError,
} from "@/lib/actions/curso-maestro-actions"

type Preview = {
  rows: ParsedRow[]
  errors: RowError[]
  totalFilas: number
}

const PLANTILLA_CSV = [
  "codigo,nombre,creditos,tipo,componente,facultad,creditosT,creditosP,horasSemT,horasSemP,horasSemI,acuerdoOrigen",
  "MAT101,Cálculo I,3,TEORICO,BASICO_FACULTAD,Ingeniería,3,,4,,5,Acuerdo XYZ Art. 1",
  "FIS101,Física I,3,TEORICO_PRACTICO,BASICO_FACULTAD,Ingeniería,2,1,3,2,4,Acuerdo XYZ Art. 1",
  "PRJ101,Proyecto Integrador,3,PRACTICO,BASICO_FACULTAD,Ingeniería,,3,,3,6,Acuerdo XYZ Art. 5",
].join("\n")

function downloadPlantilla() {
  const blob = new Blob([PLANTILLA_CSV], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "plantilla-cursos-sage.csv"
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function ImportCursosDialog() {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function handleClose() {
    setOpen(false)
    setFile(null)
    setPreview(null)
  }

  function handlePreview() {
    if (!file) return
    startTransition(async () => {
      const fd = new FormData()
      fd.append("file", file)
      const res = await previewImportCursos(fd)
      if ("error" in res) {
        toast.error(res.error)
        setPreview(null)
      } else {
        setPreview(res)
        if (res.errors.length > 0) {
          toast.warning(`${res.errors.length} fila(s) con errores. Corrige y vuelve a cargar.`)
        }
      }
    })
  }

  function handleCommit() {
    if (!preview || preview.rows.length === 0) return
    startTransition(async () => {
      const res = await commitImportCursos(preview.rows)
      if ("error" in res) {
        toast.error(res.error)
      } else {
        toast.success(
          `Importación completa: ${res.created} creados, ${res.updated} actualizados.`
        )
        router.refresh()
        handleClose()
      }
    })
  }

  const validas = preview?.rows.length ?? 0
  const conErrores = preview?.errors.length ?? 0

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Importar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Cursos desde Excel/CSV
          </DialogTitle>
          <DialogDescription>
            Sube un archivo .xlsx o .csv. Los cursos existentes (mismo código)
            se actualizan; los nuevos se crean. Máximo 500 filas, 5 MB.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Plantilla */}
          <div className="flex items-center justify-between rounded-md border bg-muted/30 p-3">
            <div className="text-sm">
              <p className="font-medium">¿No tienes archivo aún?</p>
              <p className="text-xs text-muted-foreground">
                Descarga la plantilla CSV con las columnas y ejemplos.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={downloadPlantilla} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              Plantilla
            </Button>
          </div>

          {/* File input */}
          <div className="space-y-2">
            <Label htmlFor="file">Archivo (.xlsx, .xls, .csv)</Label>
            <Input
              id="file"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null)
                setPreview(null)
              }}
            />
            <p className="text-xs text-muted-foreground">
              Cabeceras requeridas: <code>codigo</code>, <code>nombre</code>,{" "}
              <code>creditos</code>, <code>tipo</code> (TEORICO / TEORICO_PRACTICO / PRACTICO).
              Opcionales: componente, facultad, creditosT, creditosP, horasSemT, horasSemP, horasSemI, acuerdoOrigen.
            </p>
          </div>

          {file && !preview && (
            <Button onClick={handlePreview} disabled={pending} className="w-full">
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Validar archivo
            </Button>
          )}

          {/* Preview */}
          {preview && (
            <>
              <div className="grid grid-cols-3 gap-3 rounded-md border bg-muted/30 p-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Total filas</p>
                  <p className="text-lg font-bold tabular-nums">{preview.totalFilas}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Válidas</p>
                  <p className="text-lg font-bold tabular-nums text-green-600">{validas}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Con errores</p>
                  <p className={`text-lg font-bold tabular-nums ${conErrores > 0 ? "text-destructive" : ""}`}>
                    {conErrores}
                  </p>
                </div>
              </div>

              {preview.errors.length > 0 && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-destructive mb-2">
                    <AlertCircle className="h-4 w-4" />
                    Errores detectados ({preview.errors.length})
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1 text-xs">
                    {preview.errors.slice(0, 30).map((e, i) => (
                      <p key={i} className="text-destructive/90">
                        Fila <span className="font-mono">{e.fila}</span> — campo{" "}
                        <span className="font-mono">{e.campo}</span>: {e.mensaje}
                      </p>
                    ))}
                    {preview.errors.length > 30 && (
                      <p className="text-muted-foreground italic">
                        ...y {preview.errors.length - 30} errores más
                      </p>
                    )}
                  </div>
                </div>
              )}

              {preview.rows.length > 0 && (
                <div className="rounded-md border">
                  <div className="flex items-center gap-2 border-b px-3 py-2 text-sm font-medium">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Vista previa ({Math.min(preview.rows.length, 20)} de {preview.rows.length})
                  </div>
                  <div className="max-h-72 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Código</TableHead>
                          <TableHead>Nombre</TableHead>
                          <TableHead className="text-center">Cred.</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Componente</TableHead>
                          <TableHead>Facultad</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {preview.rows.slice(0, 20).map((r) => (
                          <TableRow key={r.codigo}>
                            <TableCell className="font-mono text-xs">{r.codigo}</TableCell>
                            <TableCell className="text-sm">{r.nombre}</TableCell>
                            <TableCell className="text-center tabular-nums">{r.creditos}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">{r.tipo}</Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {r.componente ?? "—"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {r.facultad ?? "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={pending}>
            Cancelar
          </Button>
          {preview && validas > 0 && (
            <Button onClick={handleCommit} disabled={pending}>
              {pending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Importar {validas} curso{validas !== 1 && "s"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
