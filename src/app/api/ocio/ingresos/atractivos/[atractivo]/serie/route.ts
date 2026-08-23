/**
 * GET /api/ocio/ingresos/atractivos/[atractivo]/serie?anio=YYYY[&mes=M]
 * Drill-down bajo demanda del dashboard: sin `mes`, personas por mes de ese
 * año; con `mes`, personas por día de ese mes. RBAC de lectura del módulo.
 */

import { NextRequest, NextResponse } from 'next/server'
import { gateAtractivo } from '../_helpers'
import { getSerie } from '@/lib/atractivos-service'

export async function GET(req: NextRequest, context: { params: Promise<{ atractivo: string }> }) {
  const { atractivo } = await context.params
  const g = await gateAtractivo(atractivo, false)
  if ('error' in g) return g.error

  const anio = parseInt(req.nextUrl.searchParams.get('anio') || '', 10)
  if (isNaN(anio)) {
    return NextResponse.json({ error: 'Parámetro anio inválido' }, { status: 400 })
  }
  const mesParam = req.nextUrl.searchParams.get('mes')
  const mes = mesParam ? parseInt(mesParam, 10) : undefined
  if (mes !== undefined && (isNaN(mes) || mes < 1 || mes > 12)) {
    return NextResponse.json({ error: 'Parámetro mes inválido' }, { status: 400 })
  }

  try {
    const serie = await getSerie(g.atractivo, anio, mes)
    if (!serie.success) {
      return NextResponse.json({ error: serie.error || 'Error al obtener la serie' }, { status: 500 })
    }
    return NextResponse.json({ success: true, data: serie.data })
  } catch (error) {
    console.error(`[atractivos/${atractivo}/serie GET]`, error)
    return NextResponse.json({ error: 'Error al obtener la serie' }, { status: 500 })
  }
}
