/**
 * PUT    /api/ocio/ingresos/atractivos/[atractivo]/actividades/[id] — actualizar
 * DELETE /api/ocio/ingresos/atractivos/[atractivo]/actividades/[id] — baja lógica
 * RBAC por módulo del atractivo + rate limit en mutaciones.
 */

import { NextRequest, NextResponse } from 'next/server'
import { gateAtractivoGestion } from '../../_helpers'
import { ActividadEspecialAtractivoSchema } from '@/lib/schemas'
import { actualizarActividad, eliminarActividad } from '@/lib/atractivos-service'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ atractivo: string; id: string }> },
) {
  const { atractivo, id } = await context.params
  const g = await gateAtractivoGestion(atractivo)
  if ('error' in g) return g.error

  if (!checkRateLimit(getClientIp(req), 60, 60_000)) {
    return NextResponse.json({ error: 'Demasiadas solicitudes. Intentá de nuevo en un minuto.' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la solicitud inválido' }, { status: 400 })
  }

  const parsed = ActividadEspecialAtractivoSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', detalle: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  try {
    await actualizarActividad(g.atractivo, id, {
      ...parsed.data,
      usuario_modificacion: g.userEmail ?? '',
    })
    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error(`[atractivos/${atractivo}/actividades/${id} PUT]`, error)
    return NextResponse.json({ error: 'Error al actualizar la actividad' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ atractivo: string; id: string }> },
) {
  const { atractivo, id } = await context.params
  const g = await gateAtractivoGestion(atractivo)
  if ('error' in g) return g.error

  if (!checkRateLimit(getClientIp(req), 60, 60_000)) {
    return NextResponse.json({ error: 'Demasiadas solicitudes. Intentá de nuevo en un minuto.' }, { status: 429 })
  }

  try {
    await eliminarActividad(g.atractivo, id, g.userEmail ?? '')
    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error(`[atractivos/${atractivo}/actividades/${id} DELETE]`, error)
    return NextResponse.json({ error: 'Error al eliminar la actividad' }, { status: 500 })
  }
}