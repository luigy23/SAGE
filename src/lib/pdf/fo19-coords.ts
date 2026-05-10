/**
 * Coordenadas para overlay sobre la plantilla oficial FO-19 (USCO).
 * Sistema PDF: origen en esquina inferior izquierda. Página 612×792 (US Letter).
 *
 * Validado visualmente con `scripts/test-fo19-coords.ts` que genera
 * `tmp/fo19-test-marks.pdf` con dot markers en cada posición.
 */

export const FO19_COORDS = {
  page1: {
    facultad:    { x: 115, y: 673 },
    programa:    { x: 368, y: 673 },
    nombre:      { x: 180, y: 650 },
    cedula:      { x: 442, y: 650 },
    fecha:       { x: 100, y: 627 },
    periodo:     { x: 290, y: 627 },
    mod_TCP:     { x: 158, y: 604 },
    mod_TCO:     { x: 200, y: 604 },
    mod_MTP:     { x: 238, y: 604 },
    mod_MTC:     { x: 278, y: 604 },
    mod_CATEDRA: { x: 333, y: 604 },
    mod_OTRO:    { x: 408, y: 604 },

    docencia: {
      y_first_row: 537,
      row_height:  17.6,
      max_rows:    5,
      cols: {
        numero:     { x: 80,  width: 50 },
        nombre:     { x: 175, width: 95 },
        subgrupo:   { x: 256, width: 33 },
        sede:       { x: 304, width: 35 },
        horasPres:  { x: 360, width: 38 },
        creditos:   { x: 419, width: 35 },
        semanas:    { x: 466, width: 36 },
        dedicacion: { x: 521, width: 50 },
      },
      subtotal: { x: 521, y: 446 },
    },

    horario: {
      y_first_row: 380,
      row_height:  18,
      max_rows:    5,
      cols: {
        numero:    { x: 80,  width: 50 },
        nombre:    { x: 165, width: 90 },
        lunes:     { x: 240, width: 35 },
        martes:    { x: 287, width: 35 },
        miercoles: { x: 335, width: 38 },
        jueves:    { x: 382, width: 35 },
        viernes:   { x: 430, width: 35 },
        sabado:    { x: 478, width: 35 },
        domingo:   { x: 524, width: 40 },
      },
    },

    otrasDocencia: {
      y_first_row: 215,
      row_height:  12,
      max_rows:    5,
      cols: {
        nombre:     { x: 165, width: 165 },
        descripcion:{ x: 388, width: 130 },
        dedicacion: { x: 521, width: 50 },
      },
      subtotal: { x: 521, y: 142 },
      total1:   { x: 521, y: 124 },
    },
  },

  page2: {
    investigacion: {
      y_first_row: 624,
      row_height:  14,
      max_rows:    4,
      cols: {
        nombre:     { x: 165, width: 165 },
        descripcion:{ x: 388, width: 130 },
        dedicacion: { x: 521, width: 50 },
      },
      total2: { x: 521, y: 555 },
    },
    proyeccion: {
      y_first_row: 469,
      row_height:  14,
      max_rows:    4,
      cols: {
        nombre:     { x: 165, width: 165 },
        descripcion:{ x: 388, width: 130 },
        dedicacion: { x: 521, width: 50 },
      },
      total3: { x: 521, y: 401 },
    },
    gestion: {
      y_first_row: 314,
      row_height:  14,
      max_rows:    4,
      cols: {
        nombre:     { x: 165, width: 165 },
        descripcion:{ x: 388, width: 130 },
        dedicacion: { x: 521, width: 50 },
      },
      total4: { x: 521, y: 245 },
    },
    granTotal:  { x: 521, y: 207 },
    firmaDocente: { x: 75,  y: 158 },
    firmaJefe:    { x: 320, y: 158 },
    nombreDocenteFinal: { x: 105, y: 140 },
    nombreJefeFinal:    { x: 350, y: 140 },
  },
} as const
