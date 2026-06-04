"use client"

import { format, parse } from "date-fns"
import { es } from "date-fns/locale"
import { formatFechaInicio, cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"

/** Selector de fecha (`yyyy-MM-dd`) reutilizable, basado en Popover + Calendar. */
export function FechaPicker({
  label,
  value,
  onChange,
}: {
  label?: string
  value?: string
  onChange: (v: string | undefined) => void
}) {
  return (
    <div className="space-y-1">
      {label && (
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      )}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? formatFechaInicio(value) : "Seleccionar fecha"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value ? parse(value, "yyyy-MM-dd", new Date()) : undefined}
            onSelect={(date) => onChange(date ? format(date, "yyyy-MM-dd") : undefined)}
            locale={es}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
