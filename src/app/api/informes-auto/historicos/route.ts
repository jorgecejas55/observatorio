/**
 * GET /api/informes-auto/historicos
 * Registros de la planilla histórica maestra (indicadores_findes + indicadores_mensual)
 * para el selector manual de comparativas del formulario.
 */

import { NextResponse } from 'next/server'
import { requireAcceso } from '@/lib/permisos'
import { getRegistrosMaestros } from '@/lib/informes-auto/comparativas'

export async function GET() {
  const session = await requireAcceso('informes-auto')
  if (session instanceof NextResponse) return session

  try {
    const registros = await getRegistrosMaestros()
    return NextResponse.json({ success: true, data: registros })
  } catch (error) {
    console.error('[historicos] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al leer la planilla maestra' },
      { status: 500 }
    )
  }
}
