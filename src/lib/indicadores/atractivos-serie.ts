/**
 * Reglas puras para completar la serie mensual de atractivos del dashboard:
 * la planilla `atractivos_mensual` manda en los meses que tiene; los meses
 * posteriores a su último registro, hasta el mes en curso, se calculan en vivo.
 */

import { MESES, clavePeriodo, numeroDeMes, type ConPeriodo } from './periodos'
import type { IndicadorAtractivo } from './types'

export interface MesCalendario {
  ano: number
  mes: number   // 1-12
}

/** 'YYYY-MM', misma forma que el prefijo de una fecha ISO. */
export function claveMes({ ano, mes }: MesCalendario): string {
  return `${ano}-${String(mes).padStart(2, '0')}`
}

/** Meses posteriores a `ultimo` hasta `hoy` inclusive. Vacío si no hay último. */
export function mesesPendientes(ultimo: ConPeriodo | null, hoy: MesCalendario): MesCalendario[] {
  if (!ultimo || numeroDeMes(ultimo.mes) === 0) return []
  const desde = clavePeriodo(ultimo) + 1
  const hasta = hoy.ano * 12 + hoy.mes
  const meses: MesCalendario[] = []
  for (let clave = desde; clave <= hasta; clave++) {
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

/** Totales mensuales por fuente; null = la fuente no respondió. */
export interface FuentesAtractivos {
  casa_puna: Record<string, number> | null
  pueblo_perdido: Record<string, number> | null
  casa_caravati: Record<string, number> | null
  museo_virgen: Record<string, number> | null
  museo_quiroga: Record<string, number> | null
}

/** Arma las filas en vivo a partir de los totales por fuente. */
export function filasEnVivo(
  meses: MesCalendario[],
  fuentes: FuentesAtractivos,
  hoy: MesCalendario,
): IndicadorAtractivo[] {
  const valor = (fuente: Record<string, number> | null, clave: string) =>
    fuente === null ? null : fuente[clave] ?? 0

  return meses.map(m => {
    const clave = claveMes(m)
    const fila: IndicadorAtractivo = {
      ano: m.ano,
      mes: MESES[m.mes - 1],
      casa_puna: valor(fuentes.casa_puna, clave),
      pueblo_perdido: valor(fuentes.pueblo_perdido, clave),
      casa_sfvc: null,
      casa_caravati: valor(fuentes.casa_caravati, clave),
      museo_virgen: valor(fuentes.museo_virgen, clave),
      museo_quiroga: valor(fuentes.museo_quiroga, clave),
      origen: 'vivo',
    }
    if (m.ano === hoy.ano && m.mes === hoy.mes) fila.parcial = true
    if (Object.values(fuentes).some(f => f === null)) fila.incompleto = true
    return fila
  })
}
