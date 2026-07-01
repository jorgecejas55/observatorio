/**
 * Búsqueda de períodos comparativos para informes de fines de semana largos.
 * Fuente primaria: sistema OH (datos en vivo).
 * Fallback: dashboard de indicadores históricos (planilla 191cjZK9uQTPY...).
 */

import type { RelevamientoOH, PeriodoComparativo, FindeTendencia } from '@/lib/informes-auto/types'
import { getRelevamientosEspeciales, getRelevamientoPorId } from '@/lib/ocupacion-api'
import { fetchGoogleSheet } from '@/lib/sheets-parser'

// ── Tokenización para Jaccard ──────────────────────────────────────────────────

function tokenizar(nombre: string): Set<string> {
  return new Set(
    nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // quitar acentos
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

// ── Dashboard de findes históricos ─────────────────────────────────────────────

interface FindeHistorico {
  ano: number
  mes: string
  evento: string
  oh: number
  estadia_prom: number
  visitantes: number
}

const DASHBOARD_SHEET_ID = '191cjZK9uQTPYARqAD9UYgvWjyZAJ_DDgAgip4ZkznGU'
const DASHBOARD_SHEET_NAME = 'indicadores_findes'

let cacheFindes: { data: FindeHistorico[]; ts: number } | null = null
const CACHE_TTL = 5 * 60_000 // 5 minutos

async function getFindesHistoricos(): Promise<FindeHistorico[]> {
  if (cacheFindes && Date.now() - cacheFindes.ts < CACHE_TTL) {
    return cacheFindes.data
  }

  try {
    const result = await fetchGoogleSheet(DASHBOARD_SHEET_ID, DASHBOARD_SHEET_NAME, 300)
    const findes: FindeHistorico[] = (result.table?.rows ?? []).map((row: any) => ({
      ano: row.c[0]?.v ?? 0,
      mes: row.c[1]?.v ?? '',
      evento: row.c[2]?.v ?? '',
      oh: row.c[3]?.v ?? 0,
      estadia_prom: row.c[4]?.v ?? 0,
      visitantes: row.c[5]?.v ?? 0,
    })).filter((f: FindeHistorico) => f.ano > 0 && f.evento)

    cacheFindes = { data: findes, ts: Date.now() }
    return findes
  } catch (error) {
    console.error('Error obteniendo findes históricos:', error)
    return cacheFindes?.data ?? []
  }
}

function findeHistoricoARelevamiento(f: FindeHistorico): RelevamientoOH {
  return {
    id: `hist_${f.ano}_${f.evento.replace(/[^a-z0-9]/gi, '_')}`.slice(0, 40),
    nombre: f.evento,
    tipo: 'Especial',
    estado: 'CERRADO',
    fechaInicio: `${f.ano}-01-01`, // fecha placeholder (solo para ordenamiento)
    fechaFin: `${f.ano}-12-31`,
    ohTotal: f.oh,
    ohRegistrado: 0,
    ohNoRegistrado: 0,
    ohEnTramite: 0,
    ohMin: 0,
    ohMax: 0,
    cantidadRelevados: 0,
    cantidadRegistrados: 0,
  }
}

// ── Comparativa A: Último finde del año en curso ──────────────────────────────

export async function buscarUltimoFindeDelAnio(
  year: number,
  fechaLimite: string
): Promise<PeriodoComparativo> {
  // 1. Intentar con sistema OH
  try {
    const relevamientos = await getRelevamientosEspeciales(year)
    const candidatos = relevamientos.filter(
      r => r.estado === 'CERRADO' && r.fechaFin < fechaLimite
    )
    if (candidatos.length > 0) {
      candidatos.sort((a, b) => b.fechaFin.localeCompare(a.fechaFin))
      return { relevamiento: candidatos[0], impactoTotal: null, gastoDiarioTuristas: null }
    }
  } catch (error) {
    console.error('Error buscando último finde OH:', error)
  }

  // 2. Fallback: dashboard de findes históricos
  // Asumimos orden cronológico en la planilla. Buscar el finde anterior al actual.
  const findes = await getFindesHistoricos()
  const delAnio = findes.filter(f => f.ano === year && f.visitantes > 0)

  if (delAnio.length > 1) {
    // El último cargado es probablemente el más reciente (o el actual)
    // Devolver el penúltimo como "último finde del año antes de éste"
    const penultimo = delAnio[delAnio.length - 2]
    return {
      relevamiento: findeHistoricoARelevamiento(penultimo),
      impactoTotal: null,
      gastoDiarioTuristas: null,
    }
  }

  return { relevamiento: null, impactoTotal: null, gastoDiarioTuristas: null }
}

// ── Comparativa B: Mismo finde del año anterior ───────────────────────────────

export async function buscarMismoFindeAnioAnterior(
  nombreActual: string,
  yearActual: number
): Promise<PeriodoComparativo> {
  // 1. Intentar con sistema OH
  try {
    const relevamientos = await getRelevamientosEspeciales(yearActual - 1)
    if (relevamientos.length > 0) {
      const matches = relevamientos
        .map(r => ({ relevamiento: r, score: jaccardSimilarity(nombreActual, r.nombre) }))
        .sort((a, b) => b.score - a.score)
      const best = matches[0]
      if (best.score >= 0.4) {
        return { relevamiento: best.relevamiento, impactoTotal: null, gastoDiarioTuristas: null }
      }
    }
  } catch (error) {
    console.error('Error buscando finde año anterior OH:', error)
  }

  // 2. Fallback: dashboard de findes históricos (Jaccard sobre evento)
  const findes = await getFindesHistoricos()
  const delAnioAnterior = findes.filter(f => f.ano === yearActual - 1 && f.evento)

  if (delAnioAnterior.length === 0) {
    return {
      relevamiento: null,
      impactoTotal: null,
      gastoDiarioTuristas: null,
      advertencia: `No hay findes cargados para ${yearActual - 1} en el dashboard`,
    }
  }

  const matches = delAnioAnterior
    .map(f => ({ finde: f, score: jaccardSimilarity(nombreActual, f.evento) }))
    .sort((a, b) => b.score - a.score)

  const best = matches[0]

  if (best.score < 0.4) {
    return {
      relevamiento: null,
      impactoTotal: null,
      gastoDiarioTuristas: null,
      advertencia: `No se encontró finde similar en ${yearActual - 1} (mejor match: "${best.finde.evento}" con ${Math.round(best.score * 100)}% similitud). Seleccionar manualmente.`,
    }
  }

  return {
    relevamiento: findeHistoricoARelevamiento(best.finde),
    impactoTotal: null,
    gastoDiarioTuristas: null,
  }
}

// ── Búsqueda manual (cuando falla el automático) ──────────────────────────────

export async function getRelevamientosAnteriores(
  yearActual: number,
  fechaLimite: string
): Promise<RelevamientoOH[]> {
  try {
    const [actuales, anteriores] = await Promise.all([
      getRelevamientosEspeciales(yearActual),
      getRelevamientosEspeciales(yearActual - 1),
    ])

    return [...actuales, ...anteriores]
      .filter(r => r.estado === 'CERRADO' && r.fechaFin < fechaLimite)
      .sort((a, b) => b.fechaFin.localeCompare(a.fechaFin))
  } catch {
    return []
  }
}

export async function getRelevamientoParaComparativaManual(id: string): Promise<RelevamientoOH | null> {
  return getRelevamientoPorId(id)
}

// ── Tendencia del año en curso ──────────────────────────────────────────────────

/**
 * Obtiene todos los findes del año en curso registrados en el dashboard de findes,
 * ordenados por orden de carga (cronológico). Se excluye el finde actual si se
 * proporciona el nombre para no compararlo contra sí mismo.
 */
export async function getTendenciaAnioEnCurso(
  year: number,
  excluirEvento?: string
): Promise<FindeTendencia[]> {
  const findes = await getFindesHistoricos()

  return findes
    .filter(f => {
      if (f.ano !== year) return false
      if (excluirEvento && f.evento === excluirEvento) return false
      return f.oh > 0 || f.estadia_prom > 0 // solo con datos reales
    })
    .map(f => ({
      evento: f.evento,
      oh: f.oh,
      estadia_prom: f.estadia_prom,
      visitantes: f.visitantes,
    }))
}
