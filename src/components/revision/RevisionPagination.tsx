"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChevronLeft, ChevronRight } from "lucide-react"

export function RevisionPagination({
  page,
  perPage,
  total,
  totalPages,
}: {
  page: number
  perPage: number
  total: number
  totalPages: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  function go(p: number) {
    const params = new URLSearchParams(sp.toString())
    if (p <= 1) params.delete("page")
    else params.set("page", String(p))
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  function changePerPage(v: string) {
    const params = new URLSearchParams(sp.toString())
    params.delete("page")
    if (v === "20") params.delete("perPage")
    else params.set("perPage", v)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const from = total === 0 ? 0 : (page - 1) * perPage + 1
  const to = Math.min(page * perPage, total)

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t pt-3 text-sm sm:flex-row">
      <div className="text-muted-foreground">
        Mostrando <span className="font-medium text-foreground">{from}</span>–
        <span className="font-medium text-foreground">{to}</span> de{" "}
        <span className="font-medium text-foreground">{total}</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Por página</span>
        <Select value={String(perPage)} onValueChange={changePerPage}>
          <SelectTrigger className="h-8 w-[80px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-2 flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => go(page - 1)}
            disabled={page <= 1}
            className="h-8 px-2"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-2 tabular-nums">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => go(page + 1)}
            disabled={page >= totalPages}
            className="h-8 px-2"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
