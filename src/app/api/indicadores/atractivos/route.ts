import { NextResponse } from 'next/server'
import { fetchGoogleSheet } from '@/lib/sheets-parser'
import { combinarSerie, primerMesPlanilla } from '@/lib/indicadores/atractivos-serie'
import { obtenerFuentesAtractivos, mesActual } from '@/lib/indicadores/atractivos-en-vivo'
import type { IndicadorAtractivo } from '@/lib/indicadores/types'

const SHEET_ID = '191cjZK9uQTPYARqAD9UYgvWjyZAJ_DDgAgip4ZkznGU'
const SHEET_NAME = 'atractivos_mensual'

// La lectura del sistema consulta 5 GAS lentos (cold start de ~15 s c/u, en paralelo)
export const maxDuration = 60

function numeroONulo(celda: { v?: unknown } | null | undefined): number | null {
  const v = celda?.v
  return v === null || v === undefined || v === '' ? null : Number(v)
}

async function leerPlanilla(): Promise<IndicadorAtractivo[]> {
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

export async function GET() {
  try {
    const planilla = await leerPlanilla()
    const hoy = mesActual()
    const desde = primerMesPlanilla(planilla)
    const anios = desde ? Array.from({ length: hoy.ano - desde.ano + 1 }, (_, i) => desde.ano + i) : []
    const fuentes = await obtenerFuentesAtractivos(anios)

    // Orden cronológico ascendente (lo esperan los gráficos)
    return NextResponse.json({ success: true, historico: combinarSerie(planilla, fuentes, hoy) })
  } catch (error) {
    console.error('[indicadores/atractivos]', error)
    return NextResponse.json({ success: false, error: 'Error al procesar los datos' }, { status: 500 })
  }
}
