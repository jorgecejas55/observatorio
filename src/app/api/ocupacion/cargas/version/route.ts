/**
 * GET /api/ocupacion/cargas/version?relevamientoId=123
 * Devuelve {count, lastModified} para polling adaptativo.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getCargasVersion } from '@/lib/ocupacion-service'

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
