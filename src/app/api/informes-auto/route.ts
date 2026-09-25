/**
 * GET /api/informes-auto — lista informes generados (más recientes primero).
 *
 * El guardado va por /confirmar y /[id]/recalcular, y la publicación por
 * PATCH /[id]: así ningún guardado puede marcar "publicado" sin actualizar
 * el dashboard.
 */

import { NextResponse } from 'next/server'
import { requireAcceso } from '@/lib/permisos'
import { listarInformes } from '@/lib/informes-auto/gas'

export async function GET() {
  const session = await requireAcceso('informes-auto')
  if (session instanceof NextResponse) return session

  try {
    return NextResponse.json({ success: true, data: await listarInformes() })
  } catch (error) {
    console.error('[informes-auto] listar:', error)
    return NextResponse.json({ error: 'No se pudo obtener la lista de informes' }, { status: 500 })
  }
}
