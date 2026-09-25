/**
 * Reglas puras para armar la serie mensual de atractivos del dashboard
 * combinando la planilla histórica `atractivos_mensual` con los registros del
 * sistema (ingresos de Casa de la Puna / Pueblo Perdido y visitas de museos).
 *
 * Regla de fuente de verdad (definida por la coordinación del Observatorio):
 * los registros del sistema son los verdaderos, salvo que den MENOS personas
 * que la planilla — ahí se conserva la planilla (registros faltantes).
 */

import { MESES, clavePeriodo, numeroDeMes } from './periodos'
import type { IndicadorAtractivo } from './types'

export interface MesCalendario {
  ano: number
  mes: number   // 1-12
}

/** 'YYYY-MM', misma forma que el prefijo de una fecha ISO. */
export function claveMes({ ano, mes }: MesCalendario): string {
  return `${ano}-${String(mes).padStart(2, '0')}`
}

/** Todos los meses entre `desde` y `hasta`, ambos inclusive. */
export function mesesEntre(desde: MesCalendario, hasta: MesCalendario): MesCalendario[] {
  const meses: MesCalendario[] = []
  for (let clave = desde.ano * 12 + desde.mes; clave <= hasta.ano * 12 + hasta.mes; clave++) {
    const mes = ((clave - 1) % 12) + 1
    meses.push({ ano: (clave - mes) / 12, mes })
  }
  return meses
}

/** Agrupa registros con fecha ISO por mes y suma personas: { 'YYYY-MM': total }. */
export function sumarPorMes(registros: { fecha: string; personas: number }[]): Record<string, number> {
  const totales: Record<string, number> = {}
  for (const { fecha, personas } of registros) {
    const clave = fecha.slice(0, 7)
    if (!/^\d{4}-\d{2}$/.test(clave)) continue
    totales[clave] = (totales[clave] ?? 0) + personas
  }
  return totales
}

/** Sistema manda, salvo que registre menos que la planilla o no haya respondido. */
export function elegirValor(planilla: number | null, sistema: number | null): number | null {
  if (sistema === null) return planilla
  if (planilla === null) return sistema
  return Math.max(planilla, sistema)
}

/** Totales mensuales por fuente del sistema; null = la fuente no respondió. */
export interface FuentesAtractivos {
  casa_puna: Record<string, number> | null
  pueblo_perdido: Record<string, number> | null
  casa_caravati: Record<string, number> | null
  museo_virgen: Record<string, number> | null
  museo_quiroga: Record<string, number> | null
}

const COLUMNAS_CON_SISTEMA = ['casa_puna', 'pueblo_perdido', 'casa_caravati', 'museo_virgen', 'museo_quiroga'] as const

/** Primer mes con dato en la planilla (la serie arranca ahí). */
export function primerMesPlanilla(planilla: IndicadorAtractivo[]): MesCalendario | null {
  const validos = planilla.filter(f => numeroDeMes(f.mes) > 0)
  if (validos.length === 0) return null
  const primero = validos.reduce((min, f) => (clavePeriodo(f) < clavePeriodo(min) ? f : min))
  return { ano: primero.ano, mes: numeroDeMes(primero.mes) }
}

/**
 * Serie completa, en orden cronológico, desde el primer mes de la planilla
 * hasta `hoy`. Meses con fila en planilla: cada atractivo según `elegirValor`.
 * Meses sin fila: solo sistema (`origen: 'vivo'`, incompleto si falló una fuente).
 */
export function combinarSerie(
  planilla: IndicadorAtractivo[],
  fuentes: FuentesAtractivos,
  hoy: MesCalendario,
): IndicadorAtractivo[] {
  const desde = primerMesPlanilla(planilla)
  if (!desde) return []

  const filasPlanilla = new Map(planilla.map(f => [clavePeriodo(f), f]))
  const algunaFuenteFallo = Object.values(fuentes).some(f => f === null)

  return mesesEntre(desde, hoy).map(m => {
    const clave = claveMes(m)
    const filaPlanilla = filasPlanilla.get(m.ano * 12 + m.mes)
    const fila: IndicadorAtractivo = {
      ano: m.ano,
      mes: MESES[m.mes - 1],
      casa_puna: null,
      pueblo_perdido: null,
      casa_sfvc: filaPlanilla?.casa_sfvc ?? null,   // sin registro digital
      casa_caravati: null,
      museo_virgen: null,
      museo_quiroga: null,
      origen: filaPlanilla ? 'planilla' : 'vivo',
    }
    for (const col of COLUMNAS_CON_SISTEMA) {
      const fuente = fuentes[col]
      const sistema = fuente === null ? null : fuente[clave] ?? 0
      fila[col] = filaPlanilla ? elegirValor(filaPlanilla[col], sistema) : sistema
    }
    if (m.ano === hoy.ano && m.mes === hoy.mes) fila.parcial = true
    if (!filaPlanilla && algunaFuenteFallo) fila.incompleto = true
    return fila
  })
}
