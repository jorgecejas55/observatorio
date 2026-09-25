/**
 * Variaciones porcentuales de la serie mensual de OH y estadía.
 *
 * Se calculan en código y no se leen de la planilla: las columnas de variación
 * de `indicadores_mensual` son fórmulas que no se copian cuando el empuje
 * agrega una fila nueva (appendRow), así que los meses nuevos quedaban vacíos.
 */

import { clavePeriodo, type ConPeriodo } from './periodos'

export interface ValoresMensuales extends ConPeriodo {
  oh: number
  estadia_prom: number
}

export interface Variaciones {
  oh_var_mensual: number | null
  oh_var_anual: number | null
  estadia_var_mensual: number | null
  estadia_var_anual: number | null
}

const MESES_POR_ANIO = 12

/** (actual − referencia) / referencia × 100, redondeado a 1 decimal. */
export function variacionPorcentual(actual: number, referencia: number | undefined): number | null {
  if (referencia === undefined || referencia === 0) return null
  return Math.round(((actual - referencia) / referencia) * 1000) / 10
}

/**
 * Agrega a cada mes su variación contra el mes calendario anterior y contra el
 * mismo mes del año anterior. Si el mes de referencia no está en la serie, la
 * variación es null (no se compara contra un mes salteado).
 */
export function calcularVariaciones<T extends ValoresMensuales>(serie: T[]): (T & Variaciones)[] {
  const porClave = new Map(serie.map(item => [clavePeriodo(item), item]))

  return serie.map(item => {
    const clave = clavePeriodo(item)
    const mesAnterior = porClave.get(clave - 1)
    const anioAnterior = porClave.get(clave - MESES_POR_ANIO)
    return {
      ...item,
      oh_var_mensual: variacionPorcentual(item.oh, mesAnterior?.oh),
      oh_var_anual: variacionPorcentual(item.oh, anioAnterior?.oh),
      estadia_var_mensual: variacionPorcentual(item.estadia_prom, mesAnterior?.estadia_prom),
      estadia_var_anual: variacionPorcentual(item.estadia_prom, anioAnterior?.estadia_prom),
    }
  })
}
