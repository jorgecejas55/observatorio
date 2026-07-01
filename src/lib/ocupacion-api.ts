/**
 * Cliente del Sistema de Ocupación Hotelera para el agente de informes.
 *
 * FASE 5 (migración 18/06/2026): este módulo dejó de hablar con el backend viejo
 * (GEOIDEAS, OCUPACION_API_URL + login por token). Ahora **delega en
 * `ocupacion-service.ts`** — el backend nuevo del Observatorio:
 *   - Alojamientos: Directus (published, Capital)
 *   - Relevamientos / Cargas: GAS "Ocupacion" sobre el sheet nuevo
 *
 * Se conservan las mismas firmas para no tocar a los consumidores
 * (informes-auto: generar/route, relevamientos/route, comparativas.ts).
 *
 * Las variables OCUPACION_API_URL / _USER / _PASSWORD quedaron obsoletas;
 * el backend nuevo usa OCUPACION_GAS_URL / OCUPACION_GAS_API_KEY.
 */

import type { RelevamientoOH, CargaOH, AlojamientoOH } from '@/lib/informes-auto/types'
import {
  getRelevamientosEspeciales as svcGetRelevamientosEspeciales,
  getRelevamientoPorId as svcGetRelevamientoPorId,
  getCargasDeRelevamiento as svcGetCargasDeRelevamiento,
  getAlojamientosParaRelevamiento,
  getDashboardStats,
} from '@/lib/ocupacion-service'

// ── Compatibilidad ──────────────────────────────────────────────────────────────

/**
 * @deprecated El backend nuevo no usa login por token (autoriza con apiKey
 * server-side). Se mantiene como no-op por compatibilidad de firma.
 */
export async function loginOcupacion(): Promise<string> {
  return ''
}

// ── Relevamientos ─────────────────────────────────────────────────────────────

export async function getRelevamientosEspeciales(year: number): Promise<RelevamientoOH[]> {
  return svcGetRelevamientosEspeciales(year)
}

export async function getRelevamientoEspecialPorFecha(
  fechaInicio: string,
  fechaFin: string,
): Promise<RelevamientoOH | null> {
  const year = new Date(fechaInicio).getFullYear()
  const relevamientos = await svcGetRelevamientosEspeciales(year)

  // Coincidencia exacta de rango
  const exacto = relevamientos.find(
    (r) => r.fechaInicio === fechaInicio && r.fechaFin === fechaFin,
  )
  if (exacto) return exacto

  // Fallback: por contención de fechas
  const porContencion = relevamientos.find(
    (r) => r.fechaInicio <= fechaInicio && r.fechaFin >= fechaFin,
  )
  return porContencion ?? null
}

export async function getRelevamientoPorId(id: string): Promise<RelevamientoOH | null> {
  return svcGetRelevamientoPorId(id)
}

// ── Cargas ────────────────────────────────────────────────────────────────────

export async function getCargasDeRelevamiento(id: string): Promise<CargaOH[]> {
  // El servicio devuelve CargaDetalle (superset de CargaOH: incluye tipo/categoria).
  return svcGetCargasDeRelevamiento(id)
}

// ── Alojamientos ──────────────────────────────────────────────────────────────

export async function getAlojamientosActivos(): Promise<AlojamientoOH[]> {
  // Directus (published, Capital). Todos vienen con estado 'Activo' y
  // estadoRegistro 'REGISTRADO' (compatibilidad con el contrato viejo).
  return getAlojamientosParaRelevamiento()
}

export async function getTotalPlazasDisponibles(): Promise<number> {
  const alojamientos = await getAlojamientosParaRelevamiento()
  // En el modelo nuevo solo hay alojamientos activos de Directus (todos REGISTRADO).
  return alojamientos.reduce((sum, a) => sum + a.capacidadPlazas, 0)
}

// ── Dashboard resumido ───────────────────────────────────────────────────────

/**
 * @deprecated Conservado por compatibilidad. Delega en el dashboard del backend
 * nuevo (`dashboard/stats`). Las comparativas históricas del agente usan la
 * planilla de findes (ver comparativas.ts), no esta función.
 */
export async function getDashboardEspeciales(year: number): Promise<Record<string, unknown>> {
  try {
    const stats = await getDashboardStats(year)
    return (stats?.data ?? stats ?? {}) as Record<string, unknown>
  } catch {
    return {}
  }
}
