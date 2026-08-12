/**
 * GET  /api/ocio/ingresos/atractivos/[atractivo]/actividades — listar
 * POST /api/ocio/ingresos/atractivos/[atractivo]/actividades  — crear
 * RBAC por módulo del atractivo. Las mutaciones aplican rate limit.
 */

import { NextRequest, NextResponse } from 'next/server'
import { gateAtractivo } from '../_helpers'
import { ActividadEspecialAtractivoSchema } from '@/lib/schemas'
import { listarActividades, crearActividad } from '@/lib/atractivos-service'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

export async function GET(req: NextRequest, context: { params: Promise<{ atractivo: string }> }) {
  const { atractivo } = await context.params
  const g = await gateAtractivo(atractivo, false)
  if ('error' in g) return g.error

  try {
    const { searchParams } = new URL(req.url)
    const actividades = await listarActividades(g.atractivo, {
      desde: searchParams.get('desde') || undefined,
      hasta: searchParams.get('hasta') || undefined,
      limit: searchParams.get('limit') || undefined,
    })
    return NextResponse.json({ success: true, data: actividades, count: actividades.length })
  } catch (error) {
    console.error(`[atractivos/${atractivo}/actividades GET]`, error)
    return NextResponse.json({ error: 'Error al listar actividades' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ atractivo: string }> }) {
  const { atractivo } = await context.params
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

  const parsed = ActividadEspecialAtractivoSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', detalle: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  try {
    const creada = await crearActividad(g.atractivo, {
      ...parsed.data,
      usuario_registro: g.userEmail ?? '',
    })
    return NextResponse.json({ success: true, data: creada })
  } catch (error) {
    console.error(`[atractivos/${atractivo}/actividades POST]`, error)
    return NextResponse.json({ error: 'Error al crear la actividad' }, { status: 500 })
  }
}