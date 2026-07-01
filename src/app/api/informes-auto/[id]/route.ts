/**
 * GET   /api/informes-auto/[id]  — obtener informe completo
 * PATCH /api/informes-auto/[id]  — actualizar narrativa/gacetilla
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

const GAS_URL = process.env.INFORMES_AUTO_SCRIPT_URL
const GAS_SECRET = process.env.INFORMES_AUTO_SCRIPT_SECRET

async function gasPost(body: Record<string, unknown>) {
  if (!GAS_URL || GAS_URL === 'PENDIENTE') {
    throw new Error('INFORMES_AUTO_SCRIPT_URL no configurada')
  }
  const res = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: GAS_SECRET, ...body }),
  })
  return res.json()
}

async function gasGet(action: string, id: string) {
  if (!GAS_URL || GAS_URL === 'PENDIENTE') {
    throw new Error('INFORMES_AUTO_SCRIPT_URL no configurada')
  }
  const url = new URL(GAS_URL)
  url.searchParams.set('action', action)
  url.searchParams.set('id', id)
  const res = await fetch(url.toString())
  return res.json()
}

// ── GET: obtener informe completo ─────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  // @ts-expect-error
  if (session.user?.rol !== 'admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  if (session.user.email !== 'jorgecejas55@gmail.com') {
    return NextResponse.json({ error: 'Acceso restringido' }, { status: 403 })
  }

  const { id } = await params

  try {
    const json = await gasGet('obtener', id)
    if (json.error) {
      return NextResponse.json({ error: json.error }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: json.data })
  } catch (error) {
    console.error('[informes-auto] obtener:', error)
    return NextResponse.json({ error: 'Error al obtener el informe' }, { status: 500 })
  }
}

// ── PATCH: actualizar reporte de prensa o publicar ────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  // @ts-expect-error
  if (session.user?.rol !== 'admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  if (session.user.email !== 'jorgecejas55@gmail.com') {
    return NextResponse.json({ error: 'Acceso restringido' }, { status: 403 })
  }

  const { id } = await params

  try {
    const body = await req.json()

    if (body.accion === 'publicar') {
      // Publicar: integra con módulo de informes
      const json = await gasPost({
        action: 'publicar',
        id,
        idInformePublico: body.idInformePublico ?? '',
      })
      if (json.error) {
        return NextResponse.json({ error: json.error }, { status: 500 })
      }
      return NextResponse.json({ success: true })
    }

    // Actualizar reporte de prensa
    const json = await gasPost({
      action: 'actualizarReporte',
      id,
      tituloPrensa: body.tituloPrensa,
      bajadaPrensa: body.bajadaPrensa,
      reportePrensa: body.reportePrensa,
    })
    if (json.error) {
      return NextResponse.json({ error: json.error }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[informes-auto] patch:', error)
    return NextResponse.json({ error: 'Error al actualizar el informe' }, { status: 500 })
  }
}
