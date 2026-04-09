import { NextResponse } from 'next/server'
import { fetchGoogleSheet } from '@/lib/sheets-parser'

const SHEET_ID = '191cjZK9uQTPYARqAD9UYgvWjyZAJ_DDgAgip4ZkznGU'
const SHEET_NAME = 'indicadores_findes'

export interface IndicadorFinde {
  ano: number
  mes: string
  evento: string
  oh: number
  estadia_prom: number
  visitantes: number
}

function resumen(lista: IndicadorFinde[]) {
  return {
    promedio_oh: lista.length > 0 ? lista.reduce((s, i) => s + i.oh, 0) / lista.length : 0,
    total_visitantes: lista.reduce((s, i) => s + i.visitantes, 0),
    cantidad_findes: lista.length,
  }
}

export async function GET() {
  try {
    const data = await fetchGoogleSheet(SHEET_ID, SHEET_NAME, 300)

    const indicadores: IndicadorFinde[] = (data.table?.rows ?? []).map((row: any) => ({
      ano: row.c[0]?.v ?? 0,
      mes: row.c[1]?.v ?? '',
      evento: row.c[2]?.v ?? '',
      oh: row.c[3]?.v ?? 0,
      estadia_prom: row.c[4]?.v ?? 0,
      visitantes: row.c[5]?.v ?? 0,
    })).filter((i: IndicadorFinde) => i.ano > 0)

    return NextResponse.json({
      success: true,
      historico: indicadores,
      resumen2024: resumen(indicadores.filter(i => i.ano === 2024)),
      resumen2025: resumen(indicadores.filter(i => i.ano === 2025)),
      resumen2026: resumen(indicadores.filter(i => i.ano === 2026)),
    })
  } catch (error) {
    console.error('[indicadores/findes]', error)
    return NextResponse.json({ success: false, error: 'Error al procesar los datos' }, { status: 500 })
  }
}
