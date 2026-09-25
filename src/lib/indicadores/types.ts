/** Tipos de las series del dashboard principal (planilla maestra 191cjZK9…). */

import type { Variaciones } from './variaciones'

export interface IndicadorMensual extends Variaciones {
  ano: number
  mes: string
  oh: number
  estadia_prom: number
}

export interface PromedioAnual {
  oh: number
  estadia: number
  meses: number
}

export interface DatosIndicadoresMensuales {
  success: boolean
  ultimo: IndicadorMensual | null
  promedios2024: PromedioAnual
  promedios2025: PromedioAnual
  promedios2026: PromedioAnual
  historico: IndicadorMensual[]
  total_registros: number
}

export interface IndicadorFinde {
  ano: number
  mes: string
  evento: string
  oh: number
  estadia_prom: number
  visitantes: number
}

export interface ResumenFindes {
  promedio_oh: number
  total_visitantes: number
  cantidad_findes: number
}

export interface DatosIndicadoresFindes {
  success: boolean
  historico: IndicadorFinde[]
  resumen2024: ResumenFindes
  resumen2025: ResumenFindes
  resumen2026: ResumenFindes
}

/** Origen del mes: fila de la planilla o calculado en vivo desde los registros. */
export type OrigenAtractivo = 'planilla' | 'vivo'

export interface IndicadorAtractivo {
  ano: number
  mes: string
  casa_puna: number | null
  pueblo_perdido: number | null
  casa_sfvc: number | null         // sin fuente digital: null en meses en vivo
  casa_caravati: number | null
  museo_virgen: number | null
  museo_quiroga: number | null
  origen: OrigenAtractivo
  parcial?: boolean                // mes en curso
  incompleto?: boolean             // alguna fuente falló al calcular en vivo
}

export interface DatosIndicadoresAtractivos {
  success: boolean
  historico: IndicadorAtractivo[]
}
