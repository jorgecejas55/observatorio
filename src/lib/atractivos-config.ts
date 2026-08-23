/**
 * Configuración canónica del módulo de Ingresos a Atractivos.
 * Única fuente de verdad: lista de atractivos con ingresos, mapeo a módulo RBAC
 * y motivos de ingreso por atractivo (extensible sin cambio de esquema).
 */

import type { ModuloKey } from '@/lib/permisos/modulos'

export const ATRACTIVOS_CON_INGRESOS = ['casa-la-puna', 'pueblo-perdido'] as const
export type AtractivoConIngresos = typeof ATRACTIVOS_CON_INGRESOS[number]

export const MODULO_DE_ATRACTIVO: Record<AtractivoConIngresos, ModuloKey> = {
  'casa-la-puna': 'atractivos-casa-puna',
  'pueblo-perdido': 'atractivos-pueblo-perdido',
}

// 'Histórico' es el motivo que asigna la consolidación (gas/atractivos/Migracion.gs)
// a las visitas volcadas desde la hoja Histórico; no aparece en las hojas legacy.
export const MOTIVOS_INGRESOS: Record<AtractivoConIngresos, readonly string[]> = {
  'casa-la-puna': ['Visita guiada', 'Peña', 'Feria', 'Histórico'],
  'pueblo-perdido': ['Visita guiada', 'Actividad especial', 'Histórico'],
}

// 'Sin especificar' cubre los registros históricos consolidados: el Form legacy
// no capturaba tipo de visitante.
export const TIPOS_VISITANTE = ['Residente', 'Turista', 'Institución', 'Sin especificar'] as const
export type TipoVisitante = typeof TIPOS_VISITANTE[number]

export const PROCEDENCIAS_INGRESO = ['Internacional', 'Nacional', 'Provincial'] as const
export type ProcedenciaIngreso = typeof PROCEDENCIAS_INGRESO[number]

/** Type guard: permite usar `atractivo` como AtractivoConIngresos tras validar. */
export function esAtractivoConIngresos(v: string): v is AtractivoConIngresos {
  return ATRACTIVOS_CON_INGRESOS.includes(v as AtractivoConIngresos)
}