/**
 * PUT    /api/ocio/ingresos/atractivos/[atractivo]/ingresos/[id] — actualizar
 * DELETE /api/ocio/ingresos/atractivos/[atractivo]/ingresos/[id] — baja lógica
 * RBAC por módulo del atractivo + rate limit en mutaciones.
 */

import { NextRequest, NextResponse } from 'next/server'
import { gateAtractivo } from '../../_helpers'
import { IngresoAtractivoSchema } from '@/lib/schemas'
import { actualizarIngreso, eliminarIngreso } from '@/lib/atractivos-service'
import { MOTIVOS_INGRESOS } from '@/lib/atractivos-config'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ atractivo: string; id: string }> },
) {
  const { atractivo, id } = await context.params
  const g = await gateAtractivo(atractivo, true)
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

  const parsed = IngresoAtractivoSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', detalle: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  if (!MOTIVOS_INGRESOS[g.atractivo].includes(parsed.data.motivo)) {
    return NextResponse.json({ error: 'Motivo inválido para este atractivo' }, { status: 400 })
  }

  // fecha_hora_registro solo se actualiza si lo pide un admin: el resto de los
  // roles siempre reenvía el valor original sin tocar (form no editable para
  // ellos), pero igual lo sacamos acá — el server, no el cliente, es el límite
  // de confianza real.
  const datosActualizar: Record<string, unknown> = {
    ...parsed.data,
    usuario_modificacion: g.userEmail ?? '',
  }
  if (!g.esAdmin) {
    delete datosActualizar.fecha_hora_registro
  }

  try {
    await actualizarIngreso(g.atractivo, id, datosActualizar)
    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error(`[atractivos/${atractivo}/ingresos/${id} PUT]`, error)
    return NextResponse.json({ error: 'Error al actualizar el ingreso' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ atractivo: string; id: string }> },
) {
  const { atractivo, id } = await context.params
  const g = await gateAtractivo(atractivo, true)
  if ('error' in g) return g.error

  if (!checkRateLimit(getClientIp(req), 60, 60_000)) {
    return NextResponse.json({ error: 'Demasiadas solicitudes. Intentá de nuevo en un minuto.' }, { status: 429 })
  }

  try {
    await eliminarIngreso(g.atractivo, id, g.userEmail ?? '')
    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error(`[atractivos/${atractivo}/ingresos/${id} DELETE]`, error)
    return NextResponse.json({ error: 'Error al eliminar el ingreso' }, { status: 500 })
  }
}