/**
 * GET /api/ocupacion/dashboard?year=2026
 * Devuelve resumen del dashboard: mensuales, especiales, promedio anual.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAcceso } from '@/lib/permisos'
import { getDashboardStats } from '@/lib/ocupacion-service'

export async function GET(req: NextRequest) {
  const session = await requireAcceso('ocupacion')
  if (session instanceof NextResponse) return session

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
