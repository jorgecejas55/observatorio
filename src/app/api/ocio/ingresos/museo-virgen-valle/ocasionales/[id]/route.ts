import { NextResponse } from 'next/server'

const GAS = process.env.MUSEO_VIRGEN_VALLE_SCRIPT_URL ?? ''

// Helper para POST al GAS
async function gasPost(body: object) {
  const res = await fetch(GAS, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
  })
  return res.json()
}

// GET /api/museos/virgen-valle/ocasionales/[id] - Obtener una visita ocasional por ID
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const url = new URL(GAS)
    url.searchParams.set('action', 'getOcasionales')
    const res = await fetch(url.toString())
    const response = await res.json()

    if (response.success && Array.isArray(response.data)) {
      const visita = response.data.find((v: any) => v.id === params.id)
      if (visita) {
        return NextResponse.json({ success: true, data: visita })
      } else {
        return NextResponse.json({ success: false, message: 'Visita no encontrada' }, { status: 404 })
      }
    }

    return NextResponse.json({ success: false, message: 'Error al obtener datos' }, { status: 500 })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}

// PUT /api/museos/virgen-valle/ocasionales/[id] - Actualizar visita ocasional
export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const data = await req.json()
    const result = await gasPost({ action: 'updateOcasional', id: params.id, data })
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}

// DELETE /api/museos/virgen-valle/ocasionales/[id] - Eliminar visita ocasional
export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const result = await gasPost({ action: 'deleteOcasional', id: params.id })
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
