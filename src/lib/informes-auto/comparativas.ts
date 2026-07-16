/**
 * Búsqueda de períodos comparativos para informes-auto (FSL / EVENTO / MENSUAL).
 *
 * Fuente ÚNICA: la planilla histórica maestra (191cjZK9..., hojas
 * `indicadores_findes` + `indicadores_mensual`), enriquecida con visitantes
 * e impacto económico. El sistema empuja sus resultados hacia esa planilla
 * en cada informe (ver empuje.ts), así que la serie siempre está al día.
 */

import type {
  RelevamientoOH,
  PeriodoComparativo,
  FindeTendencia,
  RegistroMaestro,
  TipoInforme,
} from '@/lib/informes-auto/types'
import { fetchGoogleSheet } from '@/lib/sheets-parser'

// ── Planilla maestra ───────────────────────────────────────────────────────────

const MAESTRA_SHEET_ID = '191cjZK9uQTPYARqAD9UYgvWjyZAJ_DDgAgip4ZkznGU'
const HOJA_FINDES = 'indicadores_findes'
const HOJA_MENSUAL = 'indicadores_mensual'

const MESES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
]

function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

export function slugRegistro(texto: string): string {
  return normalizarTexto(texto)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function mesANumero(mes: string): number | null {
  const idx = MESES.indexOf(normalizarTexto(mes).toUpperCase())
  return idx === -1 ? null : idx + 1
}

function capitalizarMes(mes: string): string {
  const limpio = mes.trim().toLowerCase()
  return limpio.charAt(0).toUpperCase() + limpio.slice(1)
}

function numeroONull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// ── Tokenización para Jaccard ──────────────────────────────────────────────────

function tokenizar(nombre: string): Set<string> {
  return new Set(
    normalizarTexto(nombre)
      .replace(/[^a-z0-9áéíóúüñ ]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 1)
  )
}

function jaccardSimilarity(a: string, b: string): number {
  const ta = tokenizar(a)
  const tb = tokenizar(b)
  if (ta.size === 0 && tb.size === 0) return 1
  const intersection = new Set([...ta].filter(t => tb.has(t)))
  const union = new Set([...ta, ...tb])
  return intersection.size / union.size
}

// ── Lectura de la planilla maestra (con caché) ─────────────────────────────────

let cacheMaestros: { data: RegistroMaestro[]; ts: number } | null = null
const CACHE_TTL = 5 * 60_000 // 5 minutos

/**
 * Lee ambas hojas de la planilla maestra y devuelve la serie completa.
 * IDs determinísticos: `finde-<año>-<slug del evento>` / `mensual-<año>-<mm>`.
 */
export async function getRegistrosMaestros(): Promise<RegistroMaestro[]> {
  if (cacheMaestros && Date.now() - cacheMaestros.ts < CACHE_TTL) {
    return cacheMaestros.data
  }

  const registros: RegistroMaestro[] = []

  // Hoja de findes/eventos: A AÑO | B MES | C EVENTO | D OH | E ESTADÍA | F VISITANTES | G IMPACTO
  try {
    const result = await fetchGoogleSheet(MAESTRA_SHEET_ID, HOJA_FINDES, 300)
    const rows: any[] = result.table?.rows ?? []
    const idsVistos = new Map<string, number>()
    rows.forEach((row: any, i: number) => {
      const anio = Number(row.c?.[0]?.v ?? 0)
      const evento = String(row.c?.[2]?.v ?? '').trim()
      if (!anio || !evento) return
      const mes = String(row.c?.[1]?.v ?? '').trim()
      let id = `finde-${anio}-${slugRegistro(evento)}`
      // Desambiguar eventos repetidos del mismo año (ej. semanas del receso)
      const repeticiones = idsVistos.get(id) ?? 0
      idsVistos.set(id, repeticiones + 1)
      if (repeticiones > 0) id = `${id}-${repeticiones + 1}`
      registros.push({
        id,
        tipoPeriodo: 'FSL',
        anio,
        mes,
        mesNumero: mesANumero(mes),
        nombre: evento,
        oh: numeroONull(row.c?.[3]?.v),
        estadiaProm: numeroONull(row.c?.[4]?.v),
        visitantes: numeroONull(row.c?.[5]?.v),
        impacto: numeroONull(row.c?.[6]?.v),
        fila: i,
      })
    })
  } catch (error) {
    console.error('Error leyendo indicadores_findes de la planilla maestra:', error)
  }

  // Hoja mensual: A AÑO | B MES | C OH | D-E var (fórmulas) | F ESTADÍA | G-H var | I VISITANTES | J IMPACTO
  try {
    const result = await fetchGoogleSheet(MAESTRA_SHEET_ID, HOJA_MENSUAL, 300)
    const rows: any[] = result.table?.rows ?? []
    rows.forEach((row: any, i: number) => {
      const anio = Number(row.c?.[0]?.v ?? 0)
      const mes = String(row.c?.[1]?.v ?? '').trim()
      if (!anio || !mes) return
      const mesNumero = mesANumero(mes)
      registros.push({
        id: `mensual-${anio}-${String(mesNumero ?? 0).padStart(2, '0')}`,
        tipoPeriodo: 'MENSUAL',
        anio,
        mes,
        mesNumero,
        nombre: `${capitalizarMes(mes)} ${anio}`,
        oh: numeroONull(row.c?.[2]?.v),
        estadiaProm: numeroONull(row.c?.[5]?.v),
        visitantes: numeroONull(row.c?.[8]?.v),
        impacto: numeroONull(row.c?.[9]?.v),
        fila: i,
      })
    })
  } catch (error) {
    console.error('Error leyendo indicadores_mensual de la planilla maestra:', error)
  }

  if (registros.length > 0) {
    cacheMaestros = { data: registros, ts: Date.now() }
  }
  return registros.length > 0 ? registros : (cacheMaestros?.data ?? [])
}

export async function getRegistroMaestroPorId(id: string): Promise<RegistroMaestro | null> {
  const registros = await getRegistrosMaestros()
  return registros.find(r => r.id === id) ?? null
}

// ── Conversión a PeriodoComparativo ────────────────────────────────────────────

function registroARelevamiento(r: RegistroMaestro): RelevamientoOH {
  return {
    id: r.id,
    nombre: r.nombre,
    tipo: r.tipoPeriodo === 'MENSUAL' ? 'Mensual' : 'Especial',
    estado: 'CERRADO',
    fechaInicio: `${r.anio}-01-01`, // placeholder (solo para ordenamiento/labels)
    fechaFin: `${r.anio}-12-31`,
    ohTotal: r.oh ?? 0,
    ohRegistrado: 0,
    ohNoRegistrado: 0,
    ohEnTramite: 0,
    ohMin: 0,
    ohMax: 0,
    cantidadRelevados: 0,
    cantidadRegistrados: 0,
  }
}

export function registroAPeriodoComparativo(r: RegistroMaestro): PeriodoComparativo {
  return {
    relevamiento: registroARelevamiento(r),
    impactoTotal: r.impacto,
    visitantes: r.visitantes,
    gastoDiarioTuristas: null,
    registroMaestroId: r.id,
  }
}

const SIN_COMPARATIVA: PeriodoComparativo = {
  relevamiento: null,
  impactoTotal: null,
  gastoDiarioTuristas: null,
}

// ── Comparativa A: período inmediatamente anterior ─────────────────────────────

/**
 * FSL/EVENTO: último finde del año en curso cargado en la planilla (excluyendo
 * el propio evento si ya fue empujado en una generación previa).
 * MENSUAL: el mes calendario anterior de `indicadores_mensual`.
 */
export async function buscarPeriodoAnterior(
  tipoInforme: TipoInforme,
  nombreActual: string,
  year: number,
  mesNumero: number
): Promise<PeriodoComparativo> {
  const registros = await getRegistrosMaestros()

  if (tipoInforme === 'MENSUAL') {
    const anioAnterior = mesNumero === 1 ? year - 1 : year
    const mesAnterior = mesNumero === 1 ? 12 : mesNumero - 1
    const registro = registros.find(
      r => r.tipoPeriodo === 'MENSUAL' && r.anio === anioAnterior && r.mesNumero === mesAnterior
    )
    if (!registro) {
      return {
        ...SIN_COMPARATIVA,
        advertencia: `No hay registro de ${MESES[mesAnterior - 1]} ${anioAnterior} en indicadores_mensual`,
      }
    }
    return registroAPeriodoComparativo(registro)
  }

  // FSL / EVENTO: findes del año, en orden de carga (cronológico), sin el actual
  const slugActual = slugRegistro(nombreActual)
  const delAnio = registros
    .filter(r => r.tipoPeriodo === 'FSL' && r.anio === year)
    .filter(r => slugRegistro(r.nombre) !== slugActual)
    .sort((a, b) => a.fila - b.fila)

  if (delAnio.length === 0) {
    return {
      ...SIN_COMPARATIVA,
      advertencia: `No hay otros findes de ${year} cargados en la planilla maestra`,
    }
  }
  return registroAPeriodoComparativo(delAnio[delAnio.length - 1])
}

// ── Comparativa B: mismo período del año anterior ──────────────────────────────

/**
 * FSL: mismo finde del año anterior (Jaccard sobre el nombre del evento).
 * EVENTO: misma edición del evento el año anterior (Jaccard por nombre).
 * MENSUAL: mismo mes calendario del año anterior.
 */
export async function buscarMismoPeriodoAnioAnterior(
  tipoInforme: TipoInforme,
  nombreActual: string,
  yearActual: number,
  mesNumero: number
): Promise<PeriodoComparativo> {
  const registros = await getRegistrosMaestros()

  if (tipoInforme === 'MENSUAL') {
    const registro = registros.find(
      r => r.tipoPeriodo === 'MENSUAL' && r.anio === yearActual - 1 && r.mesNumero === mesNumero
    )
    if (!registro) {
      return {
        ...SIN_COMPARATIVA,
        advertencia: `No hay registro de ${MESES[mesNumero - 1]} ${yearActual - 1} en indicadores_mensual`,
      }
    }
    return registroAPeriodoComparativo(registro)
  }

  const delAnioAnterior = registros.filter(
    r => r.tipoPeriodo === 'FSL' && r.anio === yearActual - 1 && r.nombre
  )

  if (delAnioAnterior.length === 0) {
    return {
      ...SIN_COMPARATIVA,
      advertencia: `No hay findes cargados para ${yearActual - 1} en la planilla maestra`,
    }
  }

  const matches = delAnioAnterior
    .map(r => ({ registro: r, score: jaccardSimilarity(nombreActual, r.nombre) }))
    .sort((a, b) => b.score - a.score)

  const best = matches[0]
  if (best.score < 0.4) {
    return {
      ...SIN_COMPARATIVA,
      advertencia: `No se encontró período similar en ${yearActual - 1} (mejor match: "${best.registro.nombre}" con ${Math.round(best.score * 100)}% similitud). Seleccionar manualmente.`,
    }
  }
  return registroAPeriodoComparativo(best.registro)
}

// ── Tendencia del año en curso ──────────────────────────────────────────────────

/**
 * Serie del año en curso para el bloque de tendencia del prompt.
 * FSL/EVENTO: findes del año (excluyendo el actual). MENSUAL: meses del año.
 */
export async function getTendenciaAnioEnCurso(
  tipoInforme: TipoInforme,
  year: number,
  excluirNombre?: string
): Promise<FindeTendencia[]> {
  const registros = await getRegistrosMaestros()
  const tipoPeriodo = tipoInforme === 'MENSUAL' ? 'MENSUAL' : 'FSL'
  const slugExcluir = excluirNombre ? slugRegistro(excluirNombre) : null

  return registros
    .filter(r => {
      if (r.tipoPeriodo !== tipoPeriodo || r.anio !== year) return false
      if (slugExcluir && slugRegistro(r.nombre) === slugExcluir) return false
      return (r.oh ?? 0) > 0 || (r.estadiaProm ?? 0) > 0 // solo con datos reales
    })
    .sort((a, b) => a.fila - b.fila)
    .map(r => ({
      evento: r.nombre,
      oh: r.oh ?? 0,
      estadia_prom: r.estadiaProm ?? 0,
      visitantes: r.visitantes ?? 0,
    }))
}
