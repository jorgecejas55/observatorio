/**
 * GET /api/ocupacion/dashboard?year=2026
 * Devuelve resumen del dashboard: mensuales, especiales, promedio anual.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getDashboardStats } from '@/lib/ocupacion-service'

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
    const year = Number(searchParams.get('year')) || new Date().getFullYear()

    const data = await getDashboardStats(year)
    return NextResponse.json(data)
  } catch (error) {
    console.error('[ocupacion/dashboard]', error)
    return NextResponse.json({ error: 'Error al obtener dashboard' }, { status: 500 })
  }
}
