# Reglas Parametrizables — SAGE / FO-19

> Documento maestro de reglas, valores de horas y restricciones extraídas de los acuerdos vigentes de la Universidad Surcolombiana (USCO), para soportar el refactor a un sistema **parametrizable** administrable por el rol **SUPERADMIN**.

**Generado:** 2026-04-29
**Fuentes consultadas:**
- `Acuerdo 048 de 2018` — Reglamento de Labor Académica de los Profesores (deroga Acuerdo 020 de 2005). **Norma principal.**
- `Acuerdo 033 de 2024` — Política Curricular USCO (créditos, modalidades, naturaleza de cursos).
- `Acuerdo CA 009 de 2026` — Componente Básico de la Facultad de Ingeniería (catálogo de 18 cursos).

---

## 0. Índice

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Inventario de "números mágicos" hardcoded en el código actual](#2-inventario-de-n%C3%BAmeros-m%C3%A1gicos-hardcoded-en-el-c%C3%B3digo-actual)
3. [Acuerdo 048 de 2018 — Labor Académica (norma principal)](#3-acuerdo-048-de-2018--labor-acad%C3%A9mica-norma-principal)
4. [Acuerdo 033 de 2024 — Política Curricular](#4-acuerdo-033-de-2024--pol%C3%ADtica-curricular)
5. [Acuerdo CA 009 de 2026 — Componente Básico Ing.](#5-acuerdo-ca-009-de-2026--componente-b%C3%A1sico-de-ingenier%C3%ADa)
6. [Catálogo unificado de parámetros para refactor](#6-cat%C3%A1logo-unificado-de-par%C3%A1metros-para-refactor)
7. [Modelo de datos propuesto (Prisma)](#7-modelo-de-datos-propuesto-prisma)
8. [Bugs / inconsistencias detectadas en el código actual](#8-bugs--inconsistencias-detectadas-en-el-c%C3%B3digo-actual)

---

## 1. Resumen ejecutivo

La aplicación SAGE actualmente **codifica directamente** en el schema Prisma, en `src/lib/validations/agenda-rules.ts`, en `src/lib/schemas/agenda-schema.ts` y en `src/lib/utils/periodo.ts` los valores numéricos del Acuerdo 048 de 2018. Cualquier cambio normativo (un nuevo acuerdo, una resolución, una excepción de Consejo Académico) requiere actualizar el código fuente, hacer un deploy y migrar la DB.

El refactor consiste en mover esas reglas a una **tabla `ReglaConfiguracion`** (con histórico por período académico) administrada por un nuevo rol **SUPERADMIN**, que también podrá:
- Crear, editar y desactivar reglas.
- Definir valores por modalidad / sede / facultad / período.
- **Rehabilitar agendas en estado `ENVIADO`** devolviéndolas a `BORRADOR` (con auditoría obligatoria).

El Acuerdo 048 sigue siendo la **norma base por defecto**, pero la USCO podrá configurar en producción las cuatro fuentes de variabilidad típicas:
1. Topes y mínimos de horas por **modalidad de vinculación** (Art. 4 / Art. 3).
2. **Tope de gestión administrativa** y excepciones por cargo (Art. 10).
3. Coeficientes de **fórmulas por tipo de curso** (Art. 3 Par. 4).
4. **Topes por actividad específica** del Art. 11 (consejería, dirección de tesis, jurado, comités, etc.).

---

## 2. Inventario de "números mágicos" hardcoded en el código actual

| Concepto | Valor | Archivo / línea | Artículo de origen |
|---|---|---|---|
| Factor preparación docencia | `1.5` | `src/lib/schemas/agenda-schema.ts:75` | Art. 3 Par. 4 (1.5 / 2 según tipo) |
| Horas tutoría | `1` | `src/lib/schemas/agenda-schema.ts:76` | Art. 3 Par. 4 (`+1` constante) |
| Semanas por semestre | `22` | `src/lib/validations/agenda-rules.ts:52`, `src/lib/utils/periodo.ts` | Art. 4 a/b |
| Máx horas curso | `40` | `src/lib/schemas/agenda-schema.ts:51` | Art. 4 a |
| Máx créditos curso | `15` | `src/lib/schemas/agenda-schema.ts:56` | (no normativo, heurístico) |
| Tolerancia semanal | `0.5` | `src/lib/schemas/agenda-schema.ts:142` | (no normativo) |
| Límite gestión | `20%` | `src/lib/schemas/agenda-schema.ts:166` | Art. 10 |
| Mín docencia TC | `432` | `agenda-rules.ts:125` | Art. 3 |
| Mín docencia TC con proyectos | `288` | `agenda-rules.ts:125` | Art. 3 Par. 1 |
| Mín docencia MT | `240` | `agenda-rules.ts:127` | Art. 3 |
| Mín docencia MT con proyectos | `144` | `agenda-rules.ts:127` | Art. 3 Par. 1 |
| Máx inv+proy cátedra | `88` (4 h × 22) | `agenda-rules.ts:152` | Art. 3 Par. 2 |
| Total PLANTA_TC | `880` | `agenda-rules.ts:76` | Art. 4 a |
| Total PLANTA_MT | `440` | `agenda-rules.ts:77` | Art. 4 b |
| Total CATEDRA Neiva | `352` (16 × 22) | `agenda-rules.ts:88` | Art. 4 d |
| Total CATEDRA regional | `418` (19 × 22) | `agenda-rules.ts:86` | Art. 4 d |
| Sedes regionales cátedra | `["Pitalito","Garzón","La Plata"]` | `agenda-rules.ts:53`, `periodo.ts` | Art. 4 d |
| Hora-clase diurna | `60 min` (6am–5pm) | (no implementado) | Art. 5 Par. 2 |
| Hora-clase nocturna | `45 min` (5pm–10:30pm) | (no implementado) | Art. 5 Par. 2 |
| Mín. estudiantes subgrupo | `10` (excepción `<20`) | (no implementado) | Art. 7 |
| Mín. visitante en docencia | `60%` | (no implementado) | Art. 3 Par. 3 |

> **Total: 21 valores hardcoded** que deben pasar a configuración. Adicionalmente hay **45+ topes del Art. 11** que ni siquiera están implementados todavía y deberían cargarse como catálogo de actividades.

---

## 3. Acuerdo 048 de 2018 — Labor Académica (norma principal)

### 3.1 Carga total y mínimos por modalidad (Art. 3 / Art. 4)

| Modalidad | Carga semanal | Carga semestral | Mín. docencia | Mín. docencia (con proy.) | Notas |
|---|---|---|---|---|---|
| **PLANTA_TC** | 40 h | 880 h (22 sem) | 432 h | 288 h | Art. 4a / Art. 3 Par. 1 |
| **PLANTA_MT** | 20 h | 440 h (22 sem) | 240 h | 144 h | Art. 4b |
| **OCASIONAL_TC** | 40 h | proporcional | 432 h | 288 h | Art. 4c |
| **OCASIONAL_MT** | 20 h | proporcional | 240 h | 144 h | Art. 4c |
| **CATEDRA (Neiva)** | hasta 16 h | hasta 352 h | — | — (hasta 4 h/sem inv/PS) | Art. 4d, Art. 3 Par. 2 |
| **CATEDRA (Pitalito/Garzón/La Plata)** | hasta 19 h | hasta 418 h | — | — (hasta 4 h/sem inv/PS) | Art. 4d |
| **VISITANTE** | según contrato | según contrato | ≥ 60 % de la agenda | — | Art. 4e, Art. 3 Par. 3 |
| **INVITADO** | según contrato | hasta 100 % | — | — | Art. 4f, requiere autorización CA |

> "Proyectos activos" = investigador principal, coinvestigador, coordinador o cogestor de proyección social, con proyecto aprobado en convocatoria interna o externa (Art. 3 Par. 1).

### 3.2 Tope de gestión académico-administrativa (Art. 10)

- **Por defecto:** `gestion ≤ 20 % * carga_total_periodo`.
- **Excepción (sin tope):** cargos de **Jefe de Programa, Jefe de Departamento, Asesor de Vicerrectoría, Asesor de Rectoría**.
- Decanos / Vicerrectores / Rector: `880 h` completas en gestión (cargos con dedicación total).

### 3.3 Subgrupos (Art. 7)

- `subgrupo.estudiantes ≥ 10` por defecto.
- Excepción: cursos con `total_estudiantes < 20`.
- Excepción: Ciencias Clínicas Salud y prácticas profesionales.

### 3.4 Jornadas y duración de hora-clase (Art. 5)

| Jornada | Días | Horario | Hora-clase |
|---|---|---|---|
| A — Diurna | Lun–Sáb | 6:00 am – 6:30 pm | 60 min |
| B — Nocturna | Lun–Sáb | 6:30 pm – 10:30 pm | 45 min |
| C — Diurna fin de semana | Sáb 6am-6pm; Dom 6am-12m | — | 60/45 según tramo |
| D — Especial | Vie 6pm-10pm; Sáb 6am-10pm; Dom 6am-6pm | — | 60/45 según tramo |

> Regla operativa: hora-clase 6:00 am–5:00 pm = **60 min**; 5:00 pm–10:30 pm = **45 min** (Art. 5 Par. 2).
> Jornadas mixtas requieren aprobación del Consejo de Facultad (Art. 5 Par. 1).

### 3.5 Fórmulas especiales — Salud, Ciencias Naturales, Educación Ambiental (Art. 3 Par. 4)

```text
curso TEÓRICO          → horas_programadas = (h_pres_sem * 2  + 1) × n_semanas
curso TEÓRICO-PRÁCTICO → horas_programadas = (h_pres_sem * 1.5 + 1) × n_semanas
trabajo independiente  → solo se reconoce si créditos ≤ 3
```

### 3.6 Tabla maestra del Art. 11 — topes por actividad

#### Docencia

| Actividad | Tope semestral | Restricción |
|---|---|---|
| Consejería Académica | **48 h por cohorte** | máx. 2 cohortes; hasta sexto sem. |
| Asesoría Práctica Profesional / Docente | **2 h/sem por estudiante** | — |
| Asesoría modalidades de grado (no tesis/monografías) | **2 h/sem por estudiante o proyecto** | — |
| Comité Autoevaluación y Acreditación del Programa | **600 h** | por período y por programa |
| Comité Acreditación Institucional | **64 h** | 1 delegado por Facultad |
| Representación Comité Currículo Facultad | **64 h** | — |
| Coordinación Currículo Facultad / Comité Central | **80 h** | — |
| Reuniones de Programa / Departamento | **88 h** | — |
| Coordinación Postgrados subsidiados | **220 h** | — |
| Coordinación Escuela Formación Pedagógica | **220 h** | — |
| Participación Escuela Formación Pedagógica | **88 h** | — |
| Coordinación Laboratorios de Docencia | **44 h** | — |

#### Investigación

| Actividad | Tope semestral | Restricción |
|---|---|---|
| Coord. Investigación Facultad / COCEIN | **220 h** | 1 docente por Facultad |
| Coord. Investigación en Sedes | **88 h** | 1 por Sede Regional |
| Dirección grupo investigación categorizado | **32 h** | — |
| Investigador Principal | **220 h** | proyecto aprobado |
| Coinvestigador | **176 h** | proyecto aprobado |
| Coord. Centros Investigación / Emprendimiento | **220 h** | máx. 2 años; ≥ 3 grupos adscritos |
| Dirección trabajos grado **pregrado** | **2 h/sem por trabajo** | máx. 3 simultáneos; máx. 2 períodos |
| Dirección trabajos grado **postgrado no autofinanciado** | **4 h/sem por trabajo** | máx. 3 simultáneos; máx. 2 períodos |
| Tutor Semilleros Investigación | **44 h** | — |
| Jurado Evaluador trabajo de Investigación | **12 h fijo** | — |
| Estudios de Doctorado | **220 h** | — |
| Comisiones de estudio | **880 h** | — |
| Editor Revistas Científico-Académicas | **110 h** | 1 por Facultad |
| Comité Editorial USCO | **44 h** | 1 por Facultad |
| Coord. Editorial Surcolombiana | **220 h** | — |

#### Proyección Social

| Actividad | Tope semestral | Restricción |
|---|---|---|
| Coord. Proyección/Internacionalización Facultad | **220 h** | 1 docente por Facultad |
| Coord. proyectos convocatoria institucional | Coord. **220 h** / Cogestor **110 h** | — |
| Coord. Proyectos Institucionales | Coord. **220 h** / Cogestor **110 h** | — |
| Coord. prácticas/pasantías programas profesionales | **90 h** | — |
| Coord. prácticas/pasantías Licenciatura | **132 h** + 44 h adic. coord. fac. | — |
| Coord. internado rotatorio Medicina | **220 h** | — |
| Coord. Laboratorio Audiovisuales | **110 h** | — |
| Coord. Herbario y Museos | **110 h** | — |
| Coord. Consultorios y Centros de Prácticas | **220 h** | — |

#### Gestión Académico-Administrativa

| Cargo | Tope semestral |
|---|---|
| Rector / Decanos / Vicerrectores | **880 h** (dedicación completa) |
| Asesor de Vicerrectores | **440 h** (uno por dependencia) |
| Asesor del Rector | resolución del Rector |
| Jefatura de Programa | **660 h** |
| Coord. programas en Sedes | **132 h** |
| Coord. Granja Experimental USCO | **440 h** |
| Jefatura de Departamento | **330 h** |
| Representación Consejo Académico | **132 h** |
| Representación Consejo Superior Universitario | **132 h** |
| Representación Consejo Facultad / CSED / CAP | **64 h** cada uno |

### 3.7 Reglas adicionales

| Regla | Valor / condición | Artículo |
|---|---|---|
| Catedráticos: investigación/extensión | hasta 4 h/sem (88 h sem.) con proyecto aprobado | Art. 3 Par. 2 |
| Catedráticos: salario mínimo | programación ≥ 1 SMMLV (excepciones por CA) | Art. 4 Par. 1 |
| Doctores: vinculación obligatoria | a grupo de investigación avalado/categorizado | Art. 4 Par. 3 |
| Jefe de Programa: docencia | mínimo 1 curso de pregrado | Art. 3 Par. 1 |
| Coord. Centros (Inv./Empr.) | máx. 2 años; luego autofinanciado | Art. 12 Par. 2 |
| Pensionados / docentes especiales | catedráticos sin concurso, aprobación CA | Art. 3 Par. 5 |
| Postgrados subsidiados | en agenda previa aprobación CA | Art. 4 Par. 4 |

### 3.8 Procedimiento de la agenda (Art. 6 / Art. 12)

1. Docente diligencia FO-19.
2. Revisa Jefe de Programa/Departamento.
3. Aprueba **Consejo de Facultad** mediante acto administrativo.
4. Casos especiales (ocasionales, visitantes, invitados, catedráticos): los propone el Jefe y aprueba el Consejo de Facultad; casos excepcionales → Consejo Académico.
5. Al final del período, docente entrega **informe digital de cumplimiento** (FO-20).
6. Coordinadores: plan de trabajo al inicio + informe al final para reconocer horas.
7. Auditoría: Decanos. Seguimiento: Vicerrectoría Académica.

---

## 4. Acuerdo 033 de 2024 — Política Curricular

### 4.1 Constantes globales

| Parámetro | Valor |
|---|---|
| Horas por crédito académico | **48** (Art. 15) |
| Horas semanales totales del estudiante | **40 – 51** (Art. 16 Par. 2) |
| Período de transición política | 2 años (Art. 33) |

### 4.2 Naturaleza del curso → relación T.D : T.I (Art. 17)

| Tipo de curso | Relación T.D : T.I |
|---|---|
| Teórico (T) / núcleo básico | **1 : 1** |
| Teórico-Práctico (T-P) / núcleo de profundización | **1 : 2** |
| T-P en Facultad de Salud | **2 : 1** ⚠ excepción |
| Práctico (P), núcleo investigación, posgrado, virtual | **1 : 3** o superior |

> Cualquier desviación requiere aprobación del Consejo Académico (Art. 17 Par. 1).

### 4.3 Estructura curricular — porcentajes

| Componente | Rango |
|---|---|
| Componente Básico del programa | **70–85 %** del total de créditos |
| Componente Básico de Facultad | **≥ 20 %** del plan (Art. 19 num. 2) |
| Componente Complementario | **15–30 %** |
| Componente Complementario Flexible Fac. y Programa | **60–80 %** del complementario |

### 4.4 Componente Básico Institucional (Art. 19)

| Curso | Créditos | T.D. | T.I. | T.T. | Suma al plan |
|---|---|---|---|---|---|
| Constitución Política y Cultura de Paz | 2 | 48 | 48 | 96 | sí |
| Ética y Bioética | 1 | 32 | 16 | 48 | sí |
| Medio Ambiente | 1 | 32 | 16 | 48 | sí |
| Comunicación Lingüística | 2 | 48 | 48 | 96 | sí |
| Cátedra Surcolombiana | 1 | 32 | 16 | 48 | **no** (requisito grado) |
| Inglés I-IV (cada uno) | 4 | 64 | 128 | 192 | **no** (requisito grado) |
| Componente Complementario Flexible Inst. | 2 | (2 h sem) | — | — | sí |

### 4.5 Rangos de créditos por nivel

| Nivel | Créditos |
|---|---|
| Técnico profesional | 53–72 |
| Tecnológico | 80–100 |
| Universitario / Profesional | 120–170 |
| Medicina | 216–230 |
| Especialización | 26–36 |
| Especialización médico-quirúrgica | 120–220 |
| Maestría | 40–60 |
| Doctorado | 70–130 |
| Educación continua | hasta 160 horas (sin créditos) |

### 4.6 Modalidades educativas

| Modalidad | Sincrónico | Asincrónico |
|---|---|---|
| Presencial | 100 % | 0 % |
| A distancia | ≤ 20 % | ≥ 80 % |
| b-Learning | 20 % | 80 % |
| e-Learning | 0 % | 100 % |
| Dual | mixta universidad/empresa | — |
| Híbrida | combinación libre | — |

### 4.7 Cadena de cálculo SAGE (créditos → horas docente)

```text
curso (microdiseño)
  → créditos académicos (CA)
  → horas totales estudiante = CA × 48
  → según naturaleza (T/T-P/P) y relación T.D:T.I → horas T.D. del curso
  → horas semanales docencia = T.D. / n_semanas
```

> El **033 de 2024 no regula la labor docente**; define la base aritmética para derivar horas T.D. desde los créditos. La labor sigue regulada por el **048 de 2018**.

---

## 5. Acuerdo CA 009 de 2026 — Componente Básico de Ingeniería

Aprueba **18 cursos** del Componente Básico de Facultad de Ingeniería, aplicables a Sistemas, Civil, Electrónica, Agrícola y Petróleos. Total: **51 créditos** y **1.280 horas independientes** + horas presenciales.

### 5.1 Catálogo de 18 cursos

| # | Curso | Créditos | Naturaleza | Horas/sem (T) | Horas/sem (T-P:T+P) | Horas/sem (P) | Horas/sem (I) |
|---|---|---|---|---|---|---|---|
| 1 | Fundamentos de Matemáticas | 3 | T | 4 | — | — | 5 |
| 2 | Cálculo Diferencial | 3 | T | 4 | — | — | 5 |
| 3 | Cálculo Integral | 3 | T | 4 | — | — | 5 |
| 4 | Física Mecánica | 3 | T-P | — | 3+2 | — | 4 |
| 5 | Oscilaciones y Ondas | 3 | T-P | — | 3+2 | — | 4 |
| 6 | Física Electromagnética | 3 | T-P | — | 3+2 | — | 4 |
| 7 | Álgebra Lineal | 3 | T | 4 | — | — | 5 |
| 8 | Cálculo Vectorial | 3 | T | 4 | — | — | 5 |
| 9 | Ecuaciones Diferenciales | 3 | T | 4 | — | — | 5 |
| 10 | Métodos Numéricos | 3 | T | 4 | — | — | 5 |
| 11 | Biología General | 3 | T-P | — | 3+2 | — | 4 |
| 12 | Química General | 3 | T-P | — | 3+2 | — | 4 |
| 13 | Probabilidad y Estadística | 3 | T | 4 | — | — | 5 |
| 14 | Pensamiento Algorítmico | 3 | T-P | — | 2+2 | — | 5 |
| 15 | Fund. Administración y Economía | 2 | T | 3 | — | — | 3 |
| 16 | Formulación y Eval. Proyectos | 2 | T | 3 | — | — | 3 |
| 17 | Proyecto Interdisciplinario CDIO | 3 | P | — | — | 3 | 6 |
| 18 | Diseño Experimental | 2 | T | 3 | — | — | 3 |
| **TOTAL** | | **51** | | | | | |

### 5.2 Reglas operativas

- **Componente Básico de Facultad ≥ 20 %** del total de créditos del plan (Art. 4 / coherente con 033/2024).
- **Programación semestral**: responsabilidad de los Programas, no de la Facultad (Art. 7).
- **Microdiseños**: actualización a cargo de los Programas que dictan el curso (Art. 8) → genera horas de gestión curricular.
- **Evaluación unificada inter-programa** (Art. 6) → genera horas de coordinación docente.
- **Enfoque CDIO** (Concebir, Diseñar, Implementar, Operar) como referente pedagógico.

> Ningún valor de horas docentes proviene de este acuerdo. Su valor para SAGE es **un catálogo prepoblado** que evita que los docentes ingresen manualmente intensidad horaria errónea para estos 18 cursos.

---

## 6. Catálogo unificado de parámetros para refactor

A continuación, el **listado canónico** de parámetros que el rol SUPERADMIN podrá configurar:

### 6.1 Parámetros globales por período

| Clave | Tipo | Default | Fuente |
|---|---|---|---|
| `semanas_periodo` | int | 22 | Art. 4 048/2018 |
| `horas_por_credito` | int | 48 | Art. 15 033/2024 |
| `horas_semanales_estudiante_min` | int | 40 | Art. 16 033/2024 |
| `horas_semanales_estudiante_max` | int | 51 | Art. 16 033/2024 |
| `tolerancia_validacion_semanal` | float | 0.5 | (interno) |
| `limite_gestion_porcentaje` | float | 0.20 | Art. 10 048/2018 |
| `min_visitante_docencia_porcentaje` | float | 0.60 | Art. 3 Par. 3 |
| `min_estudiantes_subgrupo` | int | 10 | Art. 7 |
| `umbral_excepcion_subgrupo` | int | 20 | Art. 7 |
| `factor_preparacion_default` | float | 1.5 | Art. 3 Par. 4 |
| `horas_tutoria_default` | float | 1 | Art. 3 Par. 4 |

### 6.2 Parámetros por modalidad

Tabla `ParametrosModalidad`:

| Campo | Tipo | Ejemplo PLANTA_TC | Ejemplo CATEDRA Neiva |
|---|---|---|---|
| `modalidad` | enum | PLANTA_TC | CATEDRA |
| `sede_aplicable` | enum nullable | NULL (todas) | NEIVA |
| `horas_semanal_max` | int | 40 | 16 |
| `horas_semestral_max` | int | 880 | 352 |
| `horas_semestral_estricto` | bool | true | false |
| `min_docencia_h` | int nullable | 432 | NULL |
| `min_docencia_h_con_proyectos` | int nullable | 288 | NULL |
| `max_inv_proysoc_semanal` | int nullable | NULL | 4 |
| `requiere_aprobacion_ca` | bool | false | false |

### 6.3 Coeficientes de fórmula por tipo de curso × facultad

Tabla `FormulaCurso`:

| Campo | Default Estándar | Salud / Ciencias Nat. / Educ. Amb. |
|---|---|---|
| `tipo_curso` | TEORICO | TEORICO_PRACTICO |
| `facultad_id` | NULL (default) | "Salud" |
| `factor_horas` | 1.5 | 1.5 (T-P) / 2 (T) |
| `constante_suma` | 1 | 1 |
| `aplica_trabajo_independiente_max_creditos` | sin límite | 3 |

Fórmula: `horas_periodo = (h_pres_sem × factor_horas + constante_suma) × n_semanas`.

### 6.4 Catálogo de actividades (Art. 11) — `CatalogoActividad`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | string | — |
| `categoria` | enum (DOCENCIA, INVESTIGACION, PROYECCION_SOCIAL, GESTION) | — |
| `nombre` | string | "Consejería Académica" |
| `tope_semestral_h` | int nullable | 48 |
| `tope_por_unidad` | enum (NINGUNA, COHORTE, ESTUDIANTE, PROYECTO, FACULTAD, SEDE) | — |
| `unidad_max` | int nullable | 2 (cohortes) |
| `tope_semanal_h_por_unidad` | float nullable | 2 (h/sem por estudiante) |
| `cantidad_max_simultaneos` | int nullable | 3 (trabajos de grado) |
| `aplica_uno_por_facultad` | bool | true (Comité Acreditación) |
| `aplica_uno_por_sede` | bool | true (Coord. Inv. Sedes) |
| `requiere_resolucion_rector` | bool | true (Asesor Rector) |
| `restriccion_temporal_anos` | int nullable | 2 (Centros) |
| `requiere_proyecto_aprobado` | bool | true (Inv. Principal) |
| `aplica_solo_a_modalidades` | enum[] | [PLANTA_TC, PLANTA_MT] |
| `aplica_a_postgrado` | bool | — |
| `aplica_a_pregrado` | bool | — |
| `articulo_origen` | string | "Art. 11" |
| `activo` | bool | toggle SUPERADMIN |

### 6.5 Cargos administrativos — `CargoAdministrativo`

| Campo | Tipo |
|---|---|
| `codigo` | string ("RECTOR", "DECANO", "JEFE_PROGRAMA"...) |
| `nombre` | string |
| `horas_asignadas_h` | int |
| `excluye_tope_gestion_20` | bool |
| `requiere_resolucion_rector` | bool |
| `activo` | bool |

### 6.6 Sedes con tope extendido para cátedra

Sustituir el array hardcoded `["Pitalito","Garzón","La Plata"]` por **flag `permite_catedra_extendida` en la tabla `Sede`** (o entidad equivalente).

### 6.7 Catálogo de cursos institucionales

| Tabla | Origen | Filas iniciales |
|---|---|---|
| `CursoMaestro` (extendida) | Acuerdo 033/2024 + CA 009/2026 | 5 cursos básico institucional + 18 ingeniería |

Agregar campos: `naturaleza` (T / T-P / P), `creditos_t`, `creditos_p`, `horas_sem_t`, `horas_sem_p`, `horas_sem_i`, `componente` (BASICO_INSTITUCIONAL, BASICO_FACULTAD, COMPLEMENTARIO).

---

## 7. Modelo de datos propuesto (Prisma)

### 7.1 Nuevos enums

```prisma
enum Rol {
  DOCENTE
  ADMIN       // gestiona períodos, docentes, catálogos básicos
  SUPERADMIN  // + reglas paramétricas + rehabilitación de agendas
}

enum CategoriaActividad {
  DOCENCIA
  INVESTIGACION
  PROYECCION_SOCIAL
  GESTION
}

enum UnidadTope {
  NINGUNA
  COHORTE
  ESTUDIANTE
  PROYECTO
  FACULTAD
  SEDE
}

enum NaturalezaCurso {
  TEORICO              // T
  TEORICO_PRACTICO     // T-P
  PRACTICO             // P
}

enum ComponenteCurricular {
  BASICO_INSTITUCIONAL
  BASICO_FACULTAD
  COMPLEMENTARIO_INSTITUCIONAL
  COMPLEMENTARIO_FACULTAD
  COMPLEMENTARIO_PROGRAMA
  POSGRADO
}
```

### 7.2 Nuevas tablas

```prisma
model ParametroGlobal {
  id          String  @id @default(cuid())
  periodoId   String?              // null = aplica a todos los períodos
  clave       String                // "semanas_periodo"
  valor       String                // serializado (number, json, bool)
  tipo        String                // "int" | "float" | "bool" | "json"
  descripcion String?
  articuloOrigen String?
  activo      Boolean @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  createdBy   String                // SUPERADMIN id

  periodo PeriodoAcademico? @relation(fields: [periodoId], references: [id])

  @@unique([periodoId, clave])
  @@map("parametros_globales")
}

model ParametrosModalidad {
  id                            String     @id @default(cuid())
  periodoId                     String?    // null = default permanente
  modalidad                     Modalidad
  sedeAplicable                 Sede?      // null = todas las sedes
  horasSemanalMax               Int
  horasSemestralMax             Int
  horasSemestralEstricto        Boolean    @default(true)
  minDocencia                   Int?
  minDocenciaConProyectos       Int?
  maxInvProySocSemanal          Int?
  requiereAprobacionCA          Boolean    @default(false)
  activo                        Boolean    @default(true)
  createdAt                     DateTime   @default(now())
  updatedAt                     DateTime   @updatedAt

  periodo PeriodoAcademico? @relation(fields: [periodoId], references: [id])

  @@unique([periodoId, modalidad, sedeAplicable])
  @@map("parametros_modalidad")
}

model FormulaCurso {
  id                       String          @id @default(cuid())
  periodoId                String?
  tipoCurso                NaturalezaCurso
  facultad                 String?         // null = aplica a todas
  factorHoras              Float           @default(1.5)
  constanteSuma            Float           @default(1)
  maxCreditosTrabajoIndep  Int?            // null = sin límite
  articuloOrigen           String?
  activo                   Boolean         @default(true)
  createdAt                DateTime        @default(now())
  updatedAt                DateTime        @updatedAt

  periodo PeriodoAcademico? @relation(fields: [periodoId], references: [id])

  @@map("formulas_curso")
}

model CatalogoActividad {
  id                          String              @id @default(cuid())
  categoria                   CategoriaActividad
  nombre                      String
  descripcion                 String?
  topeSemestralH              Int?
  topePorUnidad               UnidadTope          @default(NINGUNA)
  unidadMax                   Int?
  topeSemanalHPorUnidad       Float?
  cantidadMaxSimultaneos      Int?
  aplicaUnoPorFacultad        Boolean             @default(false)
  aplicaUnoPorSede            Boolean             @default(false)
  requiereResolucionRector    Boolean             @default(false)
  restriccionTemporalAnos     Int?
  requiereProyectoAprobado    Boolean             @default(false)
  aplicaSoloAModalidades      Modalidad[]         // postgres array
  aplicaAPregrado             Boolean             @default(true)
  aplicaAPosgrado             Boolean             @default(true)
  articuloOrigen              String?
  activo                      Boolean             @default(true)
  createdAt                   DateTime            @default(now())
  updatedAt                   DateTime            @updatedAt

  @@unique([categoria, nombre])
  @@map("catalogo_actividades")
}

model CargoAdministrativo {
  id                        String   @id @default(cuid())
  codigo                    String   @unique  // "RECTOR", "JEFE_PROGRAMA"
  nombre                    String
  horasAsignadas            Int
  excluyeTopeGestion20       Boolean  @default(false)
  requiereResolucionRector   Boolean  @default(false)
  articuloOrigen             String?
  activo                     Boolean  @default(true)
  createdAt                  DateTime @default(now())
  updatedAt                  DateTime @updatedAt

  @@map("cargos_administrativos")
}

/// Auditoría de rehabilitación de agendas enviadas
model RehabilitacionAgenda {
  id                    String   @id @default(cuid())
  agendaId              String
  rehabilitadoPor       String   // ID del SUPERADMIN
  motivo                String   // obligatorio
  estadoOriginal        EstadoFormulario
  fecha                 DateTime @default(now())
  observaciones         String?

  agenda                AgendaSemestral @relation(fields: [agendaId], references: [id], onDelete: Cascade)

  @@index([agendaId])
  @@map("rehabilitaciones_agenda")
}
```

### 7.3 Cambios a tablas existentes

```prisma
// CursoMaestro: añadir naturaleza y componente
model CursoMaestro {
  // ...existing fields...
  naturaleza       NaturalezaCurso       @default(TEORICO)
  componente       ComponenteCurricular?
  creditosT        Int?
  creditosP        Int?
  horasSemT        Int?
  horasSemP        Int?
  horasSemI        Int?
  acuerdoOrigen    String?               // "CA 009/2026 Art. 5"
}

// AgendaSemestral: agregar campos para rehabilitación
model AgendaSemestral {
  // ...existing fields...
  rehabilitada       Boolean   @default(false)
  rehabilitadaCount  Int       @default(0)
  ultimaRehabilitacion DateTime?

  rehabilitaciones   RehabilitacionAgenda[]
}

// PeriodoAcademico: relación inversa
model PeriodoAcademico {
  // ...existing fields...
  parametrosGlobales   ParametroGlobal[]
  parametrosModalidad  ParametrosModalidad[]
  formulasCurso        FormulaCurso[]
}
```

### 7.4 Resolución de parámetros (precedencia)

Al validar una agenda en período `P`, sede `S`, modalidad `M`, facultad `F`:

```text
1. Buscar `ParametrosModalidad` WHERE periodoId=P, modalidad=M, sedeAplicable=S
2. Si no existe → buscar WHERE periodoId=P, modalidad=M, sedeAplicable=NULL
3. Si no existe → buscar WHERE periodoId=NULL, modalidad=M, sedeAplicable=S
4. Si no existe → buscar WHERE periodoId=NULL, modalidad=M, sedeAplicable=NULL  (default global)
5. Si no existe → fallback hardcoded (Acuerdo 048).
```

> Ventajas: el SUPERADMIN puede ajustar reglas para un período concreto sin afectar el histórico, ni los defaults.

---

## 8. Bugs / inconsistencias detectadas en el código actual

> Detectados durante la auditoría previa al refactor.

### 8.1 ⚠️ Desincronización enum `Modalidad` (BLOQUEANTE)

**Archivo:** `src/lib/validations/agenda-rules.ts` (líneas 73-89, 94-108, 122-128, 295-301)

El schema Prisma usa `PLANTA_TC | PLANTA_MT | OCASIONAL_TC | OCASIONAL_MT | CATEDRA | VISITANTE | INVITADO`, pero `agenda-rules.ts` y `formatModalidad()` usan los códigos antiguos `TCP | TCO | MTP | MTC | CATEDRA`. Esto **rompe en runtime** al validar y al renderizar, salvo si existe una capa de mapeo no detectada.

**Acción:** alinear todos los `case` y la tabla `labels` al enum del schema.

### 8.2 Sedes regionales como string array

**Archivo:** `src/lib/validations/agenda-rules.ts:53` y `src/lib/utils/periodo.ts:14`

```ts
const SEDES_CATEDRA_EXTENDIDA = ["Pitalito", "Garzón", "La Plata"]    // un archivo
const SEDES_REGIONALES_19H    = ["PITALITO", "GARZON", "LA_PLATA"]   // otro archivo
```

Mismo concepto, dos representaciones distintas (case + tildes). Migrar a un único flag en la tabla de sedes (o al enum `Sede` + parámetro).

### 8.3 Ruta `/admin/*` no protege en layout

**Archivo:** `src/app/(protected)/layout.tsx`

Solo verifica sesión, no rol. Las rutas de admin dependen únicamente de checks en server actions. **Riesgo:** un docente autenticado podría navegar a la URL admin y cargar la UI (aunque las acciones servidor fallarían).

**Acción:** middleware o layout-by-role en `(protected)/admin/*` y futuro `(protected)/superadmin/*`.

### 8.4 Período activo hardcoded por mes

**Archivo:** `src/lib/utils/periodo.ts:1-7`

Calcula `2026-1` ó `2026-2` por mes ≤ 6 / > 6. No respeta `PeriodoAcademico.estado=ABIERTO`. Si la USCO atrasa o adelanta el calendario, SAGE muestra un período inexistente.

**Acción:** consultar `PeriodoAcademico.findFirst({ where: { estado: 'ABIERTO' } })`.

### 8.5 Falta validación de `min visitante 60% docencia`

**Archivo:** `src/lib/validations/agenda-rules.ts`

Art. 3 Par. 3 del Acuerdo 048 establece que los visitantes dedican mínimo 60 % a docencia. La rama `case "VISITANTE"` no existe en `getHorasTotalesPeriodo()` ni en `getMaxHorasSemanales()`.

### 8.6 Falta validación de duración hora-clase

Art. 5 Par. 2 distingue 60 / 45 minutos por jornada. El modelo `HorarioCurso` solo guarda strings `"HH:MM-HH:MM"` por día. No hay validación que cruce horas-reloj con horas-clase normativas.

---

## 9. Próximos pasos sugeridos

1. **Validar este documento con el equipo** y agregar/ajustar reglas que falten.
2. **Migración de schema** para introducir las 6 tablas paramétricas + enum `SUPERADMIN` + `RehabilitacionAgenda`.
3. **Seed inicial** que cargue todos los valores actuales del Acuerdo 048 y los catálogos del 033/2024 y CA 009/2026.
4. **Refactor de `agenda-rules.ts`** y `agenda-schema.ts` para resolver parámetros desde DB en lugar de constantes.
5. **UI de SUPERADMIN** (`/superadmin/reglas`, `/superadmin/actividades`, `/superadmin/cargos`) con CRUD versionado.
6. **Acción de rehabilitación**: server action + modal con motivo obligatorio + audit trail.
7. **Tests de regresión**: snapshot del comportamiento actual antes de mover constantes a DB.
8. **Corregir los bugs** del §8 antes o durante el refactor.

---

## 10. Decisiones interpretativas adoptadas

### 10.1 Art. 4d — Regla mixta de sede para catedráticos (16 vs 19 h/sem)

El Art. 4d permite **19 h/sem** a catedráticos "vinculados para orientar cursos en las sedes de Pitalito, Garzón y La Plata", contra **16 h/sem** en sede principal. La norma es ambigua: ¿"vinculado" significa contrato (sedeBase) o ejecución (sede del curso)?

**Interpretación adoptada en SAGE:** combinación OR.

- `sedeBase ∈ {PITALITO, GARZON, LA_PLATA}` → **19 h/sem** (piso por contrato/concurso, alineado con Art. 4 Par. 1).
- `>50% de las horas presenciales del semestre en sedes regionales` → **19 h/sem** (override permisivo: refleja "vinculado para orientar cursos en…").
- Si no se cumple ninguna → **16 h/sem**.

**Implementación:** `esCatedraConTopeRegional()` en `src/lib/validations/agenda-rules.ts`. Reutilizado por `getCargaSemestralCopy()` en `src/lib/utils/modalidad.ts`. Cuando la regla mixta eleva el tope por cursos (y no por sedeBase), `validateAgenda()` emite un `ValidationItem` informativo para que el docente entienda por qué se autorizan más horas.

### 10.2 Sede de actividades no-curso (Art. 11)

Tras la migración `20260524000000_sede_en_actividades`, los modelos `ActividadDocencia`, `ActividadInvestigacion`, `ActividadProyeccionSocial` y `ActividadGestion` tienen columna `sede Sede?` (nullable).

- **Sede obligatoria al ENVIAR** solo cuando el catálogo dice `aplicaUnoPorSede=true` o `topePorUnidad=SEDE`. En otros casos queda `null` y no participa en validaciones de sede.
- El blindaje DB pasó de `@@unique([agendaId, nombre])` a `@@unique([agendaId, nombre, sede])`. Como PostgreSQL considera `NULL ≠ NULL` para unique constraints, **el blindaje anti-clonación para actividades sin sede vive ahora en código** (regla "duplicados internos" en `validateAgenda()` + refine del schema Zod).
- El cross-agenda check del Art. 11 (otros docentes ya tienen la actividad para la misma sede) usa primero `act.sede`; si está ausente (datos pre-migración), cae a `docente.sedeBase`.

---

## 11. Flags del catálogo SIN enforcement actual (deuda técnica)

Los siguientes flags del modelo `CatalogoActividad` se renderizan como badges informativos en el wizard pero **no se validan**. Cada uno es candidato para un PR posterior.

| Flag | Hoy | Falta |
|------|-----|-------|
| `restriccionTemporalAnos` | Badge "Máx X año(s)" en `ActividadCatalogoSelector` | Tracker histórico entre períodos: registrar año de inicio de la actividad por docente y rechazar al superar el límite. Requiere nueva tabla `AsignacionActividadHistorica` o campo en `ActividadX`. |
| `aplicaSoloAModalidades` (Modalidad[]) | Array ignorado | Validador simple: rechazar actividad si la modalidad del docente no está en el array. Una línea en `validateAgenda()` + el refine de envío. |
| `aplicaAPregrado` / `aplicaAPosgrado` | Booleans ignorados | Requiere que `CursoMaestro` (o algún campo derivado) clasifique cada curso como pregrado o posgrado. Hoy no existe ese flag y el FO-19 no lo solicita explícitamente. |
| `requiereResolucionRector` | Badge "Requiere resolución del Rector" | Captura de número/PDF de resolución por actividad. Validación admin (no autoservicio). Requiere extender el modelo de actividad con `numeroResolucion: String?` y `archivoResolucion: String?` (o referencia a S3). |

**Prioridad sugerida:**
1. `aplicaSoloAModalidades` — esfuerzo mínimo, beneficio claro.
2. `requiereResolucionRector` — alto impacto regulatorio.
3. `aplicaAPregrado/aplicaAPosgrado` — bajo, hasta que el catálogo maestro de cursos lo soporte.
4. `restriccionTemporalAnos` — requiere modelo histórico, mayor inversión.
