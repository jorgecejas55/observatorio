/**
 * Lectura de métricas digitales (web / Facebook / Instagram) desde el GAS.
 *
 * - `leerMetricasGas`: lectura directa (la usa el informe automático, que necesita el dato al día).
 * - `getMetricasCacheadas`: caché de servidor de 30 min para el dashboard público. El GAS
 *   solo cachea 5 min y, en frío, reabrir la planilla tarda de 6 a 30 s.
 */

import { unstable_cache } from 'next/cache'
import { conReintento } from '@/lib/reintento'
import { parsearMesAnio } from '@/lib/informes-auto/canales-digitales-calculo'

export type CanalMetricas = 'web' | 'facebook' | 'instagram'

export const CANALES_METRICAS: readonly CanalMetricas[] = ['web', 'facebook', 'instagram']

/** Tag de caché: las escrituras desde /admin/metricas lo invalidan. */
export const TAG_METRICAS = 'metricas-digitales'

const REVALIDAR_SEG = 1800

export function esCanalMetricas(valor: string): valor is CanalMetricas {
  return (CANALES_METRICAS as readonly string[]).includes(valor)
}

/**
 * Sheets a veces convierte "04/2026" en fecha ISO; se devuelve siempre "MM/YYYY".
 * Si no se reconoce, queda el valor original para no perder el registro.
 */
function normalizarMesAnio(valor: unknown): string {
  const periodo = parsearMesAnio(valor)
  if (!periodo) return String(valor ?? '')
  return `${String(periodo.mes).padStart(2, '0')}/${periodo.anio}`
}

export async function leerMetricasGas<T extends { mes_anio: unknown }>(canal: CanalMetricas): Promise<T[]> {
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

  const registros = (json.data ?? []) as T[]
  return registros.map(r => ({ ...r, mes_anio: normalizarMesAnio(r.mes_anio) }))
}

/** Métricas de un canal cacheadas 30 min (solo respuestas exitosas: si falla, se lanza). */
export const getMetricasCacheadas = unstable_cache(
  (canal: CanalMetricas) => conReintento(() => leerMetricasGas<{ mes_anio: unknown }>(canal)),
  ['metricas-digitales-v1'],
  { revalidate: REVALIDAR_SEG, tags: [TAG_METRICAS] },
)
