import { NextResponse } from 'next/server'

const GAS = process.env.MUSEO_CASA_CARAVATI_SCRIPT_URL ?? ''

// Helper para POST al GAS
async function gasPost(body: object) {
  if (!GAS) {
    throw new Error('MUSEO_CASA_CARAVATI_SCRIPT_URL no está configurada en .env.local')
  }

  const res = await fetch(GAS, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    throw new Error(`Error en GAS: ${res.status} ${res.statusText}`)
  }

  const text = await res.text()
  if (!text) {
    throw new Error('GAS devolvió una respuesta vacía')
  }

  try {
    return JSON.parse(text)
  } catch (err) {
    throw new Error(`GAS devolvió respuesta inválida: ${text.substring(0, 100)}`)
  }
}

// GET /api/ocio/ingresos/museo-casa-caravati/institucionales/[id] - Obtener una visita institucional por ID
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!GAS) {
      return NextResponse.json({
        success: false,
        error: 'MUSEO_CASA_CARAVATI_SCRIPT_URL no está configurada. Verificá el archivo .env.local'
      }, { status: 500 })
    }

    const params = await context.params
    const url = new URL(GAS)
    url.searchParams.set('action', 'getInstitucionales')
    const res = await fetch(url.toString())
    const response = await res.json()

    if (response.success && Array.isArray(response.data)) {
      const visita = response.data.find((v: any) => v.id === params.id)
      if (visita) {
        return NextResponse.json({ success: true, data: visita })
      } else {
        return NextResponse.json({ success: false, message: 'Visita institucional no encontrada' }, { status: 404 })
      }
    }

    return NextResponse.json({ success: false, message: 'Error al obtener datos' }, { status: 500 })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}

// PUT /api/ocio/ingresos/museo-casa-caravati/institucionales/[id] - Actualizar visita institucional
export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const data = await req.json()
    const result = await gasPost({ action: 'updateInstitucional', id: params.id, data })
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}

// DELETE /api/ocio/ingresos/museo-casa-caravati/institucionales/[id] - Eliminar visita institucional
export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const result = await gasPost({ action: 'deleteInstitucional', id: params.id })
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
