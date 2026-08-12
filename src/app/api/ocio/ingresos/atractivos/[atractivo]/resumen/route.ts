/**
 * GET /api/ocio/ingresos/atractivos/[atractivo]/resumen — KPIs del dashboard.
 * RBAC de lectura del módulo del atractivo. El GAS sirve la respuesta
 * cacheada (CacheService 300 s) y la invalida en cada mutación.
 */

import { NextRequest, NextResponse } from 'next/server'
import { gateAtractivo } from '../_helpers'
import { getResumen } from '@/lib/atractivos-service'

export async function GET(_req: NextRequest, context: { params: Promise<{ atractivo: string }> }) {
  const { atractivo } = await context.params
  const g = await gateAtractivo(atractivo, false)
  if ('error' in g) return g.error

  try {
    const resumen = await getResumen(g.atractivo)
    if (!resumen.success) {
      return NextResponse.json({ error: resumen.error || 'Error al obtener el resumen' }, { status: 500 })
    }
    return NextResponse.json({ success: true, data: resumen.data })
  } catch (error) {
    console.error(`[atractivos/${atractivo}/resumen GET]`, error)
    return NextResponse.json({ error: 'Error al obtener el resumen' }, { status: 500 })
  }
}