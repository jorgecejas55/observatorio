import { NextResponse } from 'next/server'
import { combinarSerie, primerMesPlanilla } from '@/lib/indicadores/atractivos-serie'
import { obtenerFuentesAtractivos, mesActual } from '@/lib/indicadores/atractivos-en-vivo'
import { leerPlanillaAtractivos } from '@/lib/indicadores/atractivos-planilla'

// La lectura del sistema consulta 5 GAS lentos (cold start de ~15 s c/u, en paralelo)
export const maxDuration = 60

export async function GET() {
  try {
    const planilla = await leerPlanillaAtractivos()
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
