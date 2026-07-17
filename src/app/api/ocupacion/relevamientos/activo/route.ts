/**
 * GET /api/ocupacion/relevamientos/activo
 * Devuelve el relevamiento EN_CURSO más reciente.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAcceso } from '@/lib/permisos'
import { getRelevamientoActivo } from '@/lib/ocupacion-service'

export async function GET(req: NextRequest) {
  const session = await requireAcceso('ocupacion')
  if (session instanceof NextResponse) return session

  try {
    const { searchParams } = new URL(req.url)
    const tipo = searchParams.get('tipo') || undefined
    const activo = await getRelevamientoActivo(tipo)
    if (!activo) {
      return NextResponse.json({ success: false, error: 'No hay relevamientos activos' })
    }
    return NextResponse.json({ success: true, data: activo })
  } catch (error) {
    console.error('[ocupacion/relevamientos/activo]', error)
    return NextResponse.json({ error: 'Error al obtener relevamiento activo' }, { status: 500 })
  }
}
