/**
 * Lectura de fuentes de la sección "Canales digitales" del informe MENSUAL.
 *
 * Web / Instagram / Facebook: GAS de métricas digitales (lectura directa, no
 * vía /api/metricas que es para el cliente). Catu: tablero cacheado de
 * lib/catu. Los cálculos viven en canales-digitales-calculo.ts (puros).
 * Si una fuente falla, ese canal sale con `incompleto: true` (sin ceros falsos).
 */

import { fetchCatuDashboard } from '@/lib/catu/service'
import { calcularKpis, filtrarSerie, topicosDelPeriodo, type Periodo } from '@/lib/catu/periodo'
import type { CatuDiario } from '@/lib/catu/types'
import { conReintento } from '@/lib/reintento'
import {
  calcularRedSocial,
  calcularWeb,
  faltantesDe,
  type RegistroSocial,
  type RegistroWeb,
} from './canales-digitales-calculo'
import type { CanalesDigitalesInforme, CatuInforme, PuntoMensual } from './types'

type CanalMetricas = 'web' | 'instagram' | 'facebook'

async function leerMetricas<T>(canal: CanalMetricas): Promise<T[]> {
  const url = process.env.METRICAS_DIGITALES_SCRIPT_URL
  if (!url) throw new Error('METRICAS_DIGITALES_SCRIPT_URL no configurada')
  const destino = new URL(url)
  destino.searchParams.set('action', 'getMetricas')
  destino.searchParams.set('canal', canal)

  const res = await fetch(destino.toString(), { cache: 'no-store' })
  const texto = await res.text()
  if (texto.trimStart().startsWith('<')) throw new Error(`GAS de métricas devolvió HTML (${canal})`)
  if (!res.ok) throw new Error(`GAS de métricas respondió ${res.status} (${canal})`)
  const json = JSON.parse(texto)
  if (!json.success) throw new Error(json.error ?? `GAS de métricas sin éxito (${canal})`)
  return (json.data ?? []) as T[]
}

/** Lee un canal con un reintento; si falla, calcula sobre [] y lo marca incompleto. */
async function canalSeguro<R, T extends { incompleto?: boolean }>(canal: CanalMetricas, calcular: (registros: R[]) => T): Promise<T> {
  try {
    return calcular(await conReintento(() => leerMetricas<R>(canal)))
  } catch (error) {
    console.error(`[canales-digitales] ${canal}:`, error)
    return { ...calcular([]), incompleto: true }
  }
}

// ── Catu ──────────────────────────────────────────────────────────────────────

const ultimoDiaDelMes = (anio: number, mes: number) =>
  `${anio}-${String(mes).padStart(2, '0')}-${String(new Date(Date.UTC(anio, mes, 0)).getUTCDate()).padStart(2, '0')}`

function periodoDelMes(anio: number, mes: number, hasta?: string): Periodo {
  const mm = String(mes).padStart(2, '0')
  return { desde: `${anio}-${mm}-01`, hasta: hasta ?? ultimoDiaDelMes(anio, mes) }
}

/** Conversaciones por mes; null si ese mes no tiene ningún día registrado (antes de jul-2025). */
function serieCatu(serie: CatuDiario[], anio: number, hastaMes: number, hastaFecha: string): PuntoMensual[] {
  return Array.from({ length: hastaMes }, (_, i) => {
    const periodo = periodoDelMes(anio, i + 1)
    if (periodo.hasta > hastaFecha) periodo.hasta = hastaFecha
    const dias = filtrarSerie(serie, periodo)
    return { mes: i + 1, valor: dias.length > 0 ? calcularKpis(dias).conversaciones : null }
  })
}

const CATU_SIN_DATOS: CatuInforme = {
  conversaciones: null, resolucion: null, score: null, serie: [], serieAnioAnterior: [], topTemas: [], incompleto: true,
}

async function leerCatu(anio: number, mes: number, fechaFin: string): Promise<CatuInforme> {
  try {
    const { serie_diaria, topicos_diarios } = await fetchCatuDashboard()
    const periodo = periodoDelMes(anio, mes, fechaFin)
    const dias = filtrarSerie(serie_diaria, periodo)
    const kpis = calcularKpis(dias)
    const finAnioAnterior = ultimoDiaDelMes(anio - 1, mes)
    return {
      conversaciones: dias.length > 0 ? kpis.conversaciones : null,
      resolucion: kpis.resolucion,
      score: kpis.score,
      serie: serieCatu(serie_diaria, anio, mes, fechaFin),
      serieAnioAnterior: serieCatu(serie_diaria, anio - 1, mes, finAnioAnterior),
      topTemas: topicosDelPeriodo(topicos_diarios, periodo, null, 5).map(t => t.topico),
    }
  } catch (error) {
    console.error('[canales-digitales] catu:', error)
    return CATU_SIN_DATOS
  }
}

// ── Sección completa ──────────────────────────────────────────────────────────

/** Canales digitales del mes `mes` del año `anio` (Catu hasta `fechaFin`). */
export async function fetchCanalesDigitales(anio: number, mes: number, fechaFin: string): Promise<CanalesDigitalesInforme> {
  const [web, instagram, facebook, catu] = await Promise.all([
    canalSeguro<RegistroWeb, ReturnType<typeof calcularWeb>>('web', r => calcularWeb(r, anio, mes)),
    canalSeguro<RegistroSocial, ReturnType<typeof calcularRedSocial>>('instagram', r => calcularRedSocial(r, anio, mes)),
    canalSeguro<RegistroSocial, ReturnType<typeof calcularRedSocial>>('facebook', r => calcularRedSocial(r, anio, mes)),
    leerCatu(anio, mes, fechaFin),
  ])
  const canales = { periodo: { anio, mes }, web, instagram, facebook, catu }
  return { ...canales, faltantes: faltantesDe(canales) }
}

/** Fecha de la última sincronización de Catu (para el checklist de fuentes). */
export async function ultimaSyncCatu(): Promise<string | null> {
  try {
    return (await fetchCatuDashboard()).ultima_sync
  } catch (error) {
    console.error('[canales-digitales] catu ultima_sync:', error)
    return null
  }
}
