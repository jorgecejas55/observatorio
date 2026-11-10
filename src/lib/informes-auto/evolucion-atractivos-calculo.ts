/**
 * Cálculos puros de la evolución mensual de ingresos a atractivos del informe
 * MENSUAL. Sin fetch ni imports de runtime (la lectura vive en
 * evolucion-atractivos.ts).
 *
 * - Serie base = la del dashboard (`combinarSerie`: planilla + sistema, gana el mayor).
 * - Año calendario: ene → M del año A y el mismo tramo del año A-1; nunca meses > M.
 * - El mes M del año A toma la cifra de la card (`porAtractivo[].personas`):
 *   en la misma card no conviven dos números para el mismo mes.
 * - Casa SFVC no se incluye (no está en las cards del informe).
 */

import { numeroDeMes } from '../indicadores/periodos'
import type { FuentesAtractivos } from '../indicadores/atractivos-serie'
import type { IndicadorAtractivo } from '../indicadores/types'
import type { EvolucionAtractivo, EvolucionAtractivos, IngresoPorAtractivo, PuntoMensual } from './types'

export type ColumnaAtractivo = keyof FuentesAtractivos

/** id del informe → columna de `atractivos_mensual` (sin casa_sfvc). */
export const COLUMNA_POR_ATRACTIVO: Record<string, ColumnaAtractivo> = {
  'casa-la-puna': 'casa_puna',
  'pueblo-perdido': 'pueblo_perdido',
  'museo-adan-quiroga': 'museo_quiroga',
  'museo-virgen-valle': 'museo_virgen',
  'museo-casa-caravati': 'casa_caravati',
}

function filaDelMes(filas: IndicadorAtractivo[], anio: number, mes: number): IndicadorAtractivo | undefined {
  return filas.find(f => f.ano === anio && numeroDeMes(f.mes) === mes)
}

function serieDelAnio(serie: IndicadorAtractivo[], columna: ColumnaAtractivo, anio: number, mes: number): PuntoMensual[] {
  return Array.from({ length: mes }, (_, i) => ({
    mes: i + 1,
    valor: filaDelMes(serie, anio, i + 1)?.[columna] ?? null,
  }))
}

/** Ene → M del año A y del año A-1 de una columna de la serie combinada. */
export function recortarSerieAtractivo(
  serie: IndicadorAtractivo[],
  columna: ColumnaAtractivo,
  anio: number,
  mes: number,
): { serie: PuntoMensual[]; serieAnioAnterior: PuntoMensual[] } {
  return {
    serie: serieDelAnio(serie, columna, anio, mes),
    serieAnioAnterior: serieDelAnio(serie, columna, anio - 1, mes),
  }
}

/**
 * Evolución de cada atractivo del informe a partir de la serie combinada.
 * `valorPlanillaMes` guarda lo que dice la planilla para el mes M (solo para
 * avisar en la revisión si difiere de la cifra del informe).
 */
export function armarEvolucionAtractivos(
  serie: IndicadorAtractivo[],
  planilla: IndicadorAtractivo[],
  fuentes: FuentesAtractivos,
  anio: number,
  mes: number,
): EvolucionAtractivos {
  const filaPlanilla = filaDelMes(planilla, anio, mes)
  const porAtractivo = Object.entries(COLUMNA_POR_ATRACTIVO).map(([atractivo, columna]): EvolucionAtractivo => ({
    atractivo,
    ...recortarSerieAtractivo(serie, columna, anio, mes),
    valorPlanillaMes: filaPlanilla?.[columna] ?? null,
    ...(fuentes[columna] === null && { incompleto: true }),
  }))
  return { periodo: { anio, mes }, porAtractivo }
}

/** El mes del informe toma la cifra de la card de cada atractivo (idempotente). */
export function aplicarMesDelInforme(
  evolucion: EvolucionAtractivos,
  porAtractivo: IngresoPorAtractivo[],
): EvolucionAtractivos {
  return {
    ...evolucion,
    porAtractivo: evolucion.porAtractivo.map(e => {
      const ingreso = porAtractivo.find(a => a.atractivo === e.atractivo)
      if (!ingreso) return e
      const ultimo = e.serie.length - 1
      return { ...e, serie: e.serie.map((p, i) => (i === ultimo ? { ...p, valor: ingreso.personas } : p)) }
    }),
  }
}

export interface DiferenciaPlanilla {
  nombre: string
  informe: number
  planilla: number
}

/** Atractivos cuya cifra del informe difiere de la planilla histórica en el mes M. */
export function diferenciasConPlanilla(
  evolucion: EvolucionAtractivos,
  porAtractivo: IngresoPorAtractivo[],
): DiferenciaPlanilla[] {
  return porAtractivo.flatMap(ingreso => {
    const planilla = evolucion.porAtractivo.find(e => e.atractivo === ingreso.atractivo)?.valorPlanillaMes
    if (planilla === null || planilla === undefined || planilla === ingreso.personas) return []
    return [{ nombre: ingreso.nombre, informe: ingreso.personas, planilla }]
  })
}
