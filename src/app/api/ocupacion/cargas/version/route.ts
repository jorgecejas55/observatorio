/**
 * GET /api/ocupacion/cargas/version?relevamientoId=123
 * Devuelve {count, lastModified} para polling adaptativo.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAcceso } from '@/lib/permisos'
import { getCargasVersion } from '@/lib/ocupacion-service'

export async function GET(req: NextRequest) {
  const session = await requireAcceso('ocupacion')
  if (session instanceof NextResponse) return session

  try {
    const { searchParams } = new URL(req.url)
    const relevamientoId = searchParams.get('relevamientoId')
    if (!relevamientoId) {
      return NextResponse.json({ error: 'relevamientoId requerido' }, { status: 400 })
    }

    const data = await getCargasVersion(relevamientoId)
    return NextResponse.json(data)
  } catch (error) {
    console.error('[ocupacion/cargas/version]', error)
    return NextResponse.json({ error: 'Error al obtener versión de cargas' }, { status: 500 })
  }
}
