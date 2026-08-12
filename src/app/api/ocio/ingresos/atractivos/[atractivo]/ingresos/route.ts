/**
 * GET  /api/ocio/ingresos/atractivos/[atractivo]/ingresos?desde=&hasta=&limit= — listar
 * POST /api/ocio/ingresos/atractivos/[atractivo]/ingresos                        — crear
 * RBAC por módulo del atractivo. Las mutaciones aplican rate limit.
 */

import { NextRequest, NextResponse } from 'next/server'
import { gateAtractivo } from '../_helpers'
import { IngresoAtractivoSchema } from '@/lib/schemas'
import { listarIngresos, crearIngreso } from '@/lib/atractivos-service'
import { MOTIVOS_INGRESOS } from '@/lib/atractivos-config'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

export async function GET(req: NextRequest, context: { params: Promise<{ atractivo: string }> }) {
  const { atractivo } = await context.params
  const g = await gateAtractivo(atractivo, false)
  if ('error' in g) return g.error

  try {
    const { searchParams } = new URL(req.url)
    const ingresos = await listarIngresos(g.atractivo, {
      desde: searchParams.get('desde') || undefined,
      hasta: searchParams.get('hasta') || undefined,
      limit: searchParams.get('limit') || undefined,
    })
    return NextResponse.json({ success: true, data: ingresos, count: ingresos.length })
  } catch (error) {
    console.error(`[atractivos/${atractivo}/ingresos GET]`, error)
    return NextResponse.json({ error: 'Error al listar ingresos' }, { status: 500 })
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

  const parsed = IngresoAtractivoSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', detalle: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  // Motivo según config del atractivo (última verificación, además de Zod).
  if (!MOTIVOS_INGRESOS[g.atractivo].includes(parsed.data.motivo)) {
    return NextResponse.json({ error: 'Motivo inválido para este atractivo' }, { status: 400 })
  }

  try {
    const creado = await crearIngreso(g.atractivo, {
      ...parsed.data,
      usuario_registro: g.userEmail ?? '',
    })
    return NextResponse.json({ success: true, data: creado })
  } catch (error) {
    console.error(`[atractivos/${atractivo}/ingresos POST]`, error)
    return NextResponse.json({ error: 'Error al crear el ingreso' }, { status: 500 })
  }
}