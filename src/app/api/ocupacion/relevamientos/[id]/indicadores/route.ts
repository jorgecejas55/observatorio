/**
 * GET /api/ocupacion/relevamientos/[id]/indicadores — devuelve indicadores persistidos
 * POST /api/ocupacion/relevamientos/[id]/indicadores — recalcula y persiste indicadores
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAcceso, requireEscritura } from '@/lib/permisos'
import { getIndicadoresOH, guardarIndicadoresOH, getCargasDeRelevamiento, getAlojamientosParaRelevamiento } from '@/lib/ocupacion-service'
import { calcularIndicadoresRelevamiento } from '@/lib/informes-auto/calculos'

async function checkAuth() {
  const session = await requireAcceso('ocupacion')
  if (session instanceof NextResponse) return session
  return session
}

async function checkAuthWrite() {
  const session = await requireEscritura('ocupacion')
  if (session instanceof NextResponse) return session
  return session
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await checkAuth()
  if (authResult instanceof NextResponse) return authResult

  try {
    const { id } = await params
    const result = await getIndicadoresOH(id)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[indicadores GET]', err)
    return NextResponse.json({ error: 'Error al obtener indicadores' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await checkAuthWrite()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult

  try {
    const { id } = await params

    // Leer datos frescos
    const cargas = await getCargasDeRelevamiento(id)
    const alojamientos = await getAlojamientosParaRelevamiento()
    const totalActivos = alojamientos.length

    // Calcular indicadores
    const indicadores = calcularIndicadoresRelevamiento(id, cargas, alojamientos, totalActivos)

    // Persistir
    const result = await guardarIndicadoresOH({
      ...indicadores,
      usuarioEmail: session.user?.email ?? 'sistema',
    })

    return NextResponse.json({
      success: true,
      data: indicadores,
      message: result.message || 'Indicadores calculados y guardados',
    })
  } catch (err) {
    console.error('[indicadores POST]', err)
    return NextResponse.json({ error: 'Error al calcular indicadores' }, { status: 500 })
  }
}
