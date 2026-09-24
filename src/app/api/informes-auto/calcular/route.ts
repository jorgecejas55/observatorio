/**
 * POST /api/informes-auto/calcular
 *
 * Calcula todos los datos e indicadores de un informe (OH, picos, perfil,
 * impacto, comparativas, actividades) SIN persistir nada. El resultado se
 * muestra en pantalla para revisión antes de confirmar el guardado.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireEscritura } from '@/lib/permisos'
import { calcularInforme } from '@/lib/informes-auto/pipeline'
import type { GenerarInformePayload } from '@/lib/informes-auto/types'

export async function POST(req: NextRequest) {
  const session = await requireEscritura('informes-auto')
  if (session instanceof NextResponse) return session

  let payload: GenerarInformePayload
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo JSON inválido' }, { status: 400 })
  }

  const { nombre, fechaInicio, fechaFin, gastoDiarioTuristas, gastoDiarioExcursionistas, porcentajeExcursionistas } = payload

  if (!nombre || !fechaInicio || !fechaFin) {
    return NextResponse.json({ error: 'Faltan datos requeridos: nombre, fechaInicio, fechaFin' }, { status: 400 })
  }
  if (!gastoDiarioTuristas || !gastoDiarioExcursionistas || porcentajeExcursionistas == null) {
    return NextResponse.json({ error: 'Faltan datos manuales: gasto diario y % de excursionistas' }, { status: 400 })
  }

  try {
    const { informe, meta } = await calcularInforme(payload, session.user?.email || 'sistema')
    return NextResponse.json({ success: true, data: informe, meta })
  } catch (error) {
    console.error('[calcular] Error:', error)
    const notFound = error instanceof Error && error.message.includes('No se encontró el relevamiento')
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno al calcular el informe', notFound },
      { status: notFound ? 404 : 500 }
    )
  }
}
