/**
 * GET  /api/ocupacion/relevamientos        — listar relevamientos
 * POST /api/ocupacion/relevamientos        — crear relevamiento
 * Acceso restringido: solo jorgecejas55@gmail.com + rol admin.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getRelevamientos } from '@/lib/ocupacion-service'

const GAS_URL = process.env.OCUPACION_GAS_URL
const GAS_API_KEY = process.env.OCUPACION_GAS_API_KEY

async function checkAuth() {
  const session = await auth()
  if (!session?.user) return false
  // @ts-expect-error
  if (session.user?.rol !== 'admin') return false
  if (session.user.email !== 'jorgecejas55@gmail.com') return false
  return session
}

async function gasPost(path: string, data: Record<string, unknown>) {
  const res = await fetch(GAS_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: GAS_API_KEY, path, data }),
  })
  return res.json()
}

// ── GET ────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await checkAuth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const relevamientos = await getRelevamientos({
      tipo: searchParams.get('tipo') || undefined,
      year: searchParams.get('year') ? Number(searchParams.get('year')) : undefined,
      estado: searchParams.get('estado') || undefined,
    })
    return NextResponse.json({ success: true, data: relevamientos })
  } catch (error) {
    console.error('[ocupacion/relevamientos GET]', error)
    return NextResponse.json({ error: 'Error al listar relevamientos' }, { status: 500 })
  }
}

// ── POST ───────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await checkAuth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    if (!GAS_URL || GAS_URL.includes('PENDIENTE')) {
      return NextResponse.json({ error: 'GAS no configurado' }, { status: 503 })
    }

    const body = await req.json()
    const data = {
      ...body,
      usuarioEmail: session.user!.email!,
    }

    const json = await gasPost('relevamientos', data)
    if (!json.success) {
      return NextResponse.json({ error: json.error }, { status: 400 })
    }

    return NextResponse.json(json)
  } catch (error) {
    console.error('[ocupacion/relevamientos POST]', error)
    return NextResponse.json({ error: 'Error al crear relevamiento' }, { status: 500 })
  }
}
