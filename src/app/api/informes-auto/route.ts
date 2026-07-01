/**
 * GET  /api/informes-auto       — lista informes generados
 * POST /api/informes-auto       — guarda un informe nuevo
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

async function gasGet(action: string, id?: string) {
  if (!GAS_URL || GAS_URL === 'PENDIENTE') {
    throw new Error('INFORMES_AUTO_SCRIPT_URL no configurada')
  }
  const url = new URL(GAS_URL)
  url.searchParams.set('action', action)
  if (id) url.searchParams.set('id', id)
  const res = await fetch(url.toString())
  return res.json()
}

// ── GET: listar informes ──────────────────────────────────────────────────────

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  // @ts-expect-error
  if (session.user?.rol !== 'admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  if (session.user.email !== 'jorgecejas55@gmail.com') {
    return NextResponse.json({ error: 'Acceso restringido' }, { status: 403 })
  }

  try {
    const json = await gasGet('listar')
    if (json.error) {
      return NextResponse.json({ error: json.error }, { status: 500 })
    }
    return NextResponse.json({ success: true, data: json.data ?? [] })
  } catch (error) {
    console.error('[informes-auto] listar:', error)
    // Fallback: devolver array vacío si GAS no configurado
    return NextResponse.json({ success: true, data: [] })
  }
}

// ── POST: guardar informe ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  // @ts-expect-error
  if (session.user?.rol !== 'admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  if (session.user.email !== 'jorgecejas55@gmail.com') {
    return NextResponse.json({ error: 'Acceso restringido' }, { status: 403 })
  }

  try {
    const data = await req.json()

    if (!data.id || !data.slug) {
      return NextResponse.json({ error: 'Faltan id o slug' }, { status: 400 })
    }

    const json = await gasPost({ action: 'guardar', data })
    if (json.error) {
      return NextResponse.json({ error: json.error }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: json.data })
  } catch (error) {
    console.error('[informes-auto] guardar:', error)
    return NextResponse.json({ error: 'Error al guardar el informe' }, { status: 500 })
  }
}
