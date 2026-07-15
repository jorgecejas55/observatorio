/**
 * GET /api/ocupacion/relevamientos/[id]/indicadores — devuelve indicadores persistidos
 * POST /api/ocupacion/relevamientos/[id]/indicadores — recalcula y persiste indicadores
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getIndicadoresOH, guardarIndicadoresOH, getCargasDeRelevamiento, getAlojamientosParaRelevamiento } from '@/lib/ocupacion-service'
import { calcularIndicadoresRelevamiento } from '@/lib/informes-auto/calculos'
import { tieneAccesoOcupacion } from '@/lib/ocupacion-acceso'

async function checkAuth() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  // @ts-expect-error
  if (session.user?.rol !== 'admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  if (!tieneAccesoOcupacion(session.user.email)) {
    return NextResponse.json({ error: 'Acceso restringido' }, { status: 403 })
  }
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
  const authResult = await checkAuth()
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
