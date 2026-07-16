/**
 * GET /api/ocupacion/cargas/since?relevamientoId=123&since=1700000000000
 * Devuelve solo cargas nuevas desde el timestamp dado (delta fetch).
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAcceso } from '@/lib/permisos'
import { getCargasSince } from '@/lib/ocupacion-service'

export async function GET(req: NextRequest) {
  const session = await requireAcceso('ocupacion')
  if (session instanceof NextResponse) return session

  try {
    const { searchParams } = new URL(req.url)
    const relevamientoId = searchParams.get('relevamientoId')
    const since = Number(searchParams.get('since')) || 0

    if (!relevamientoId) {
      return NextResponse.json({ error: 'relevamientoId requerido' }, { status: 400 })
    }

    const data = await getCargasSince(relevamientoId, since)
    return NextResponse.json(data)
  } catch (error) {
    console.error('[ocupacion/cargas/since]', error)
    return NextResponse.json({ error: 'Error en delta fetch de cargas' }, { status: 500 })
  }
}
