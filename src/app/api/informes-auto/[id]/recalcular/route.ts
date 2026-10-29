/**
 * POST /api/informes-auto/[id]/recalcular
 *
 * Recalcula los datos derivados del período desde las fuentes en vivo (ver
 * lib/informes-auto/recalculo.ts). Uso: cuando se cargan datos nuevos en los
 * Sheets DESPUÉS de generar el informe (el informe es una foto fija).
 *
 * NO toca el dashboard: si el informe estaba publicado y cambia algo visible,
 * queda como "cambios sin publicar" hasta que se vuelva a publicar.
 *
 * Respuesta: { success, data: informe, avisos: string[] } — los avisos indican
 * fuentes que fallaron y cuyo dato previo se conservó.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireEscritura } from '@/lib/permisos'
import { guardarInforme, obtenerInforme } from '@/lib/informes-auto/gas'
import { estadoTrasCambio } from '@/lib/informes-auto/publicacion'
import { recalcularInforme, RecalculoError } from '@/lib/informes-auto/recalculo'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireEscritura('informes-auto')
  if (session instanceof NextResponse) return session

  const { id } = await params

  try {
    const guardado = await obtenerInforme(id)
    if (!guardado) {
      return NextResponse.json({ error: 'Informe no encontrado' }, { status: 404 })
    }

    const { informe, avisos } = await recalcularInforme(guardado.datos)
    informe.estado = estadoTrasCambio(guardado.meta.estado, guardado.datos.publicacion, informe)

    const persistencia = await guardarInforme(informe)
    if (!persistencia.success) {
      return NextResponse.json({ error: persistencia.error }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: informe, avisos })
  } catch (error) {
    if (error instanceof RecalculoError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[recalcular] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno al recalcular el informe' },
      { status: 500 }
    )
  }
}
