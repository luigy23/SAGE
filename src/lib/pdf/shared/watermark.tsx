import React from "react"
import { View, Text, StyleSheet } from "@react-pdf/renderer"

const LABELS: Record<string, string | undefined> = {
  BORRADOR: "BORRADOR",
  ENVIADO: "EN REVISIÓN",
  EN_REVISION: "EN REVISIÓN",
  RECHAZADO: "RECHAZADO",
  REHABILITADO: "REHABILITADO",
}

export function Watermark({ estado }: { estado: string }) {
  const label = LABELS[estado]
  if (!label) return null
  return (
    <View style={s.wrap}>
      <Text style={s.text}>{label}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 72,
    color: "#cc0000",
    opacity: 0.12,
    transform: "rotate(-45deg)",
    fontFamily: "Helvetica-Bold",
  },
})
