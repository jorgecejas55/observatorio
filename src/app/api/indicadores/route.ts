import { NextResponse } from 'next/server'
import { fetchGoogleSheet } from '@/lib/sheets-parser'

const SHEET_ID = '191cjZK9uQTPYARqAD9UYgvWjyZAJ_DDgAgip4ZkznGU'
const SHEET_NAME = 'indicadores_mensual'

interface IndicadorMensual {
  ano: number
  mes: string
  oh: number
  oh_var_mensual: number | null
  oh_var_anual: number | null
  estadia_prom: number
  estadia_var_mensual: number | null
  estadia_var_anual: number | null
}

function calcPromedio(lista: IndicadorMensual[]) {
  return {
    oh: lista.length > 0 ? lista.reduce((s, i) => s + i.oh, 0) / lista.length : 0,
    estadia: lista.length > 0 ? lista.reduce((s, i) => s + i.estadia_prom, 0) / lista.length : 0,
    meses: lista.length,
  }
}

export async function GET() {
  try {
    const data = await fetchGoogleSheet(SHEET_ID, SHEET_NAME, 300)

    const indicadores: IndicadorMensual[] = (data.table?.rows ?? []).map((row: any) => ({
      ano: row.c[0]?.v ?? 0,
      mes: row.c[1]?.v ?? '',
      oh: row.c[2]?.v ?? 0,
      oh_var_mensual: row.c[3]?.v ?? null,
      oh_var_anual: row.c[4]?.v ?? null,
      estadia_prom: row.c[5]?.v ?? 0,
      estadia_var_mensual: row.c[6]?.v ?? null,
      estadia_var_anual: row.c[7]?.v ?? null,
    })).filter((i: IndicadorMensual) => i.ano > 0)

    const ultimo = indicadores[indicadores.length - 1] ?? null

    return NextResponse.json({
      success: true,
      ultimo,
      promedios2024: calcPromedio(indicadores.filter(i => i.ano === 2024)),
      promedios2025: calcPromedio(indicadores.filter(i => i.ano === 2025)),
      promedios2026: calcPromedio(indicadores.filter(i => i.ano === 2026)),
      historico: indicadores,
      total_registros: indicadores.length,
    })
  } catch (error) {
    console.error('[indicadores]', error)
    return NextResponse.json({ success: false, error: 'Error al procesar los datos' }, { status: 500 })
  }
}
