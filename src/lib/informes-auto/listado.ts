/**
 * Reglas puras del listado de informes-auto (sin fetch: usable en cliente).
 */

import type { EstadoInforme, RelevamientoOH, TipoInforme } from './types'

/** Metadatos de un informe tal como los devuelve `GET /api/informes-auto`. */
export interface ResumenInforme {
  id: string
  slug: string
  nombre: string
  fechaInicio: string
  fechaFin: string
  fechaGeneracion: string
  estado: EstadoInforme | string
}

export interface FiltrosListado {
  tipo: TipoInforme | ''
  anio: number | null
  estado: EstadoInforme | ''
}

/** El tipo sale del slug (ver generarSlug en pipeline.ts): la hoja de metadatos no lo guarda. */
export function tipoDesdeSlug(slug: string): TipoInforme {
  if (slug.startsWith('mensual-')) return 'MENSUAL'
  if (slug.startsWith('evento-')) return 'EVENTO'
  return 'FSL'
}

/**
 * yyyy-MM-dd de una fecha texto o ISO del GAS ("2026-09-01T03:00:00.000Z" es
 * la medianoche argentina del 1/9: la fecha UTC coincide).
 */
export function fechaIso(valor: string): string {
  return String(valor ?? '').slice(0, 10)
}

export function anioDe(informe: ResumenInforme): number {
  return Number(fechaIso(informe.fechaInicio).slice(0, 4))
}

/** Filtra y ordena por período, del más reciente al más viejo. */
export function filtrarInformes(informes: ResumenInforme[], filtros: FiltrosListado): ResumenInforme[] {
  return informes
    .filter(i => !filtros.tipo || tipoDesdeSlug(i.slug) === filtros.tipo)
    .filter(i => filtros.anio === null || anioDe(i) === filtros.anio)
    .filter(i => !filtros.estado || (i.estado || 'borrador') === filtros.estado)
    .sort((a, b) => fechaIso(b.fechaInicio).localeCompare(fechaIso(a.fechaInicio)))
}

/**
 * Relevamientos CERRADOS que todavía no tienen informe. Un informe toma sus
 * fechas del relevamiento, así que se asocian por período (la hoja de
 * metadatos no guarda el id del relevamiento).
 */
export function relevamientosSinInforme(
  relevamientos: RelevamientoOH[],
  informes: ResumenInforme[],
): RelevamientoOH[] {
  const periodos = new Set(informes.map(i => `${fechaIso(i.fechaInicio)}|${fechaIso(i.fechaFin)}`))
  return relevamientos.filter(r =>
    r.estado === 'CERRADO' && !periodos.has(`${fechaIso(r.fechaInicio)}|${fechaIso(r.fechaFin)}`))
}
