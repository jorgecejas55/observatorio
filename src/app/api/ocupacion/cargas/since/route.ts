/**
 * GET /api/ocupacion/cargas/since?relevamientoId=123&since=1700000000000
 * Devuelve solo cargas nuevas desde el timestamp dado (delta fetch).
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getCargasSince } from '@/lib/ocupacion-service'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  // @ts-expect-error
  if (session.user?.rol !== 'admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  if (session.user.email !== 'jorgecejas55@gmail.com') {
    return NextResponse.json({ error: 'Acceso restringido' }, { status: 403 })
  }

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
