import { NextResponse } from 'next/server'

const GAS = process.env.ALOJAMIENTOS_SCRIPT_URL ?? ''

async function gasGet(params: Record<string, string>) {
  const url = new URL(GAS)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
  })
  return res.json()
}

async function gasPost(body: object) {
  const res = await fetch(GAS, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
  })
  return res.json()
}

// GET /api/alojamientos?action=getAlojamientos|getMapData|getAlojamiento&id=...
export async function GET(req: Request) {
  try {
    if (!GAS) {
      return NextResponse.json({ success: false, error: 'ALOJAMIENTOS_SCRIPT_URL no configurada' }, { status: 500 })
    }

    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action') || 'getAlojamientos'
    const params: Record<string, string> = { action }

    const id = searchParams.get('id')
    if (id) params.id = id

    const result = await gasGet(params)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[alojamientos GET]', err)
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 })
  }
}

// POST /api/alojamientos — crear, actualizar o eliminar
export async function POST(req: Request) {
  try {
    if (!GAS) {
      return NextResponse.json({ success: false, error: 'ALOJAMIENTOS_SCRIPT_URL no configurada' }, { status: 500 })
    }

    const body = await req.json()
    const result = await gasPost(body)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[alojamientos POST]', err)
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 })
  }
}
