/**
 * GET  /api/ocupacion/cargas?relevamientoId=123      — listar cargas
 * POST /api/ocupacion/cargas                          — crear carga (con snapshot)
 * Acceso restringido: solo jorgecejas55@gmail.com + rol admin.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getCargasDeRelevamiento } from '@/lib/ocupacion-service'

const GAS_URL = process.env.OCUPACION_GAS_URL
const GAS_API_KEY = process.env.OCUPACION_GAS_API_KEY

// ── GET ────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  // @ts-expect-error
  if (session.user?.rol !== 'admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  if (session.user.email !== 'jorgecejas55@gmail.com') {
    return NextResponse.json({ error: 'Acceso restringido' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const relevamientoId = searchParams.get('relevamientoId')
    if (!relevamientoId) {
      return NextResponse.json({ error: 'relevamientoId requerido' }, { status: 400 })
    }

    const cargas = await getCargasDeRelevamiento(relevamientoId)
    return NextResponse.json({ success: true, data: cargas, count: cargas.length })
  } catch (error) {
    console.error('[ocupacion/cargas GET]', error)
    return NextResponse.json({ error: 'Error al listar cargas' }, { status: 500 })
  }
}

// ── POST ───────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  // @ts-expect-error
  if (session.user?.rol !== 'admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  if (session.user.email !== 'jorgecejas55@gmail.com') {
    return NextResponse.json({ error: 'Acceso restringido' }, { status: 403 })
  }

  try {
    if (!GAS_URL || GAS_URL.includes('PENDIENTE')) {
      return NextResponse.json({ error: 'GAS no configurado' }, { status: 503 })
    }

    const body = await req.json()

    // Validar datos requeridos
    if (!body.relevamientoId || !body.alojamientoId || body.porcentajeOH === undefined) {
      return NextResponse.json({ error: 'relevamientoId, alojamientoId y porcentajeOH son requeridos' }, { status: 400 })
    }

    // El payload incluye el snapshot completo del alojamiento
    const data = {
      ...body,
      usuarioEmail: session.user.email,
    }

    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: GAS_API_KEY,
        path: 'cargas/create',
        data,
      }),
    })
    const json = await res.json()

    if (!json.success) {
      return NextResponse.json({ error: json.error, cargaExistente: json.cargaExistente }, { status: 400 })
    }

    return NextResponse.json(json)
  } catch (error) {
    console.error('[ocupacion/cargas POST]', error)
    return NextResponse.json({ error: 'Error al crear carga' }, { status: 500 })
  }
}
