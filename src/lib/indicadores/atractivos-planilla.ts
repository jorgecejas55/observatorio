/**
 * Lectura de la planilla histórica `atractivos_mensual` (planilla maestra
 * 191cjZK9…). La usan el dashboard (api/indicadores/atractivos) y la
 * evolución mensual de los informes MENSUAL.
 */

import { fetchGoogleSheet } from '@/lib/sheets-parser'
import type { IndicadorAtractivo } from './types'

const SHEET_ID = '191cjZK9uQTPYARqAD9UYgvWjyZAJ_DDgAgip4ZkznGU'
const SHEET_NAME = 'atractivos_mensual'

function numeroONulo(celda: { v?: unknown } | null | undefined): number | null {
  const v = celda?.v
  return v === null || v === undefined || v === '' ? null : Number(v)
}

export async function leerPlanillaAtractivos(): Promise<IndicadorAtractivo[]> {
  const data = await fetchGoogleSheet(SHEET_ID, SHEET_NAME, 300)
  return (data.table?.rows ?? []).map((row: any) => ({
    ano: row.c[0]?.v ?? 0,
    mes: row.c[1]?.v ?? '',
    casa_puna: numeroONulo(row.c[2]),
    pueblo_perdido: numeroONulo(row.c[3]),
    casa_sfvc: numeroONulo(row.c[4]),
    casa_caravati: numeroONulo(row.c[5]),
    museo_virgen: numeroONulo(row.c[6]),
    museo_quiroga: numeroONulo(row.c[7]),
    origen: 'planilla' as const,
  })).filter((a: IndicadorAtractivo) => a.ano > 0)
}
