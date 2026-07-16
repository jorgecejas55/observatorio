/**
 * GET /api/informes-auto/sugerencias?tipo=FSL|EVENTO|MENSUAL
 * Sugerencia de gasto diario y % de excursionistas: último informe guardado
 * del mismo tipo (hoja DatosInformes). Reemplaza al circuito HISTORIAL_IMPACTO.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAcceso } from '@/lib/permisos'
import { getSugerenciaUltimoInforme } from '@/lib/informes-auto/historial'
import type { TipoInforme } from '@/lib/informes-auto/types'

export async function GET(req: NextRequest) {
  const session = await requireAcceso('informes-auto')
  if (session instanceof NextResponse) return session

  const tipoParam = req.nextUrl.searchParams.get('tipo') ?? 'FSL'
  const tipo: TipoInforme = ['FSL', 'EVENTO', 'MENSUAL'].includes(tipoParam)
    ? (tipoParam as TipoInforme)
    : 'FSL'

  try {
    const sugerencia = await getSugerenciaUltimoInforme(tipo)
    return NextResponse.json({ success: true, data: sugerencia })
  } catch (error) {
    console.error('[sugerencias] Error:', error)
    return NextResponse.json({ success: true, data: null })
  }
}
