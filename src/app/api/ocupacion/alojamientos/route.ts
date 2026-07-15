/**
 * GET /api/ocupacion/alojamientos
 * Devuelve alojamientos desde Directus (published, Capital).
 * Acceso restringido: emails autorizados (ocupacion-acceso) + rol admin.
 */

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getAlojamientosParaRelevamiento } from '@/lib/ocupacion-service'
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
    const alojamientos = await getAlojamientosParaRelevamiento()
    return NextResponse.json({ success: true, data: alojamientos, count: alojamientos.length })
  } catch (error) {
    console.error('[ocupacion/alojamientos]', error)
    return NextResponse.json({ error: 'Error al obtener alojamientos' }, { status: 500 })
  }
}
