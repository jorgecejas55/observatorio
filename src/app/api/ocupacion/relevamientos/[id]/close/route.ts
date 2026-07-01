/**
 * POST /api/ocupacion/relevamientos/[id]/close
 * Cierra un relevamiento y calcula OH final.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

const GAS_URL = process.env.OCUPACION_GAS_URL
const GAS_API_KEY = process.env.OCUPACION_GAS_API_KEY

export async function POST(
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

  try {
    if (!GAS_URL || GAS_URL.includes('PENDIENTE')) {
      return NextResponse.json({ error: 'GAS no configurado' }, { status: 503 })
    }

    const { id } = await params

    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: GAS_API_KEY,
        path: 'relevamientos/close',
        data: { id, usuarioEmail: session.user.email },
      }),
    })
    const json = await res.json()

    if (!json.success) {
      return NextResponse.json({ error: json.error }, { status: 400 })
    }

    return NextResponse.json(json)
  } catch (error) {
    console.error('[ocupacion/relevamientos/close]', error)
    return NextResponse.json({ error: 'Error al cerrar relevamiento' }, { status: 500 })
  }
}
