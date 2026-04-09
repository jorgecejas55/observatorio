import { NextResponse } from 'next/server'
import { fetchGoogleSheet } from '@/lib/sheets-parser'

const SHEET_ID = '191cjZK9uQTPYARqAD9UYgvWjyZAJ_DDgAgip4ZkznGU'
const SHEET_NAME = 'atractivos_mensual'

export interface IndicadorAtractivo {
  ano: number
  mes: string
  casa_puna: number
  pueblo_perdido: number
  casa_sfvc: number
  casa_caravati: number
  museo_virgen: number
  museo_quiroga: number
}

export async function GET() {
  try {
    const data = await fetchGoogleSheet(SHEET_ID, SHEET_NAME, 300)

    const atractivos: IndicadorAtractivo[] = (data.table?.rows ?? []).map((row: any) => ({
      ano: row.c[0]?.v ?? 0,
      mes: row.c[1]?.v ?? '',
      casa_puna: row.c[2]?.v ?? 0,
      pueblo_perdido: row.c[3]?.v ?? 0,
      casa_sfvc: row.c[4]?.v ?? 0,
      casa_caravati: row.c[5]?.v ?? 0,
      museo_virgen: row.c[6]?.v ?? 0,
      museo_quiroga: row.c[7]?.v ?? 0,
    })).filter((a: IndicadorAtractivo) => a.ano > 0)

    return NextResponse.json({ success: true, historico: atractivos })
  } catch (error) {
    console.error('[indicadores/atractivos]', error)
    return NextResponse.json({ success: false, error: 'Error al procesar los datos' }, { status: 500 })
  }
}
