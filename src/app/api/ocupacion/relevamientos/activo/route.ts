/**
 * GET /api/ocupacion/relevamientos/activo
 * Devuelve el relevamiento EN_CURSO más reciente.
 */

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getRelevamientoActivo } from '@/lib/ocupacion-service'
import { tieneAccesoOcupacion } from '@/lib/ocupacion-acceso'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  // @ts-expect-error
  if (session.user?.rol !== 'admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  if (!tieneAccesoOcupacion(session.user.email)) {
    return NextResponse.json({ error: 'Acceso restringido' }, { status: 403 })
  }

  try {
    const activo = await getRelevamientoActivo()
    if (!activo) {
      return NextResponse.json({ success: false, error: 'No hay relevamientos activos' })
    }
    return NextResponse.json({ success: true, data: activo })
  } catch (error) {
    console.error('[ocupacion/relevamientos/activo]', error)
    return NextResponse.json({ error: 'Error al obtener relevamiento activo' }, { status: 500 })
  }
}
