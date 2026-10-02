import { NextResponse } from 'next/server'
import { requireEscritura } from '@/lib/permisos'

const GAS = process.env.EVENTOS_SCRIPT_URL ?? ''

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
const TAMANO_MAX_MB = 10

async function gasPost(body: object) {
  const res = await fetch(GAS, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
  })
  return res.json()
}

// POST /api/eventos/[id]/upload — sube un archivo a Drive y retorna la URL
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireEscritura('eventos')
  if (session instanceof NextResponse) return session

  try {
    const { id: eventoId } = await params
    const formData = await req.formData()
    const file = formData.get('archivo') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 })
    }

    if (!TIPOS_PERMITIDOS.includes(file.type)) {
      return NextResponse.json(
        { error: `Tipo de archivo no permitido. Permitidos: JPG, PNG, WEBP, GIF, PDF` },
        { status: 400 }
      )
    }

    const tamanoMB = file.size / 1024 / 1024
    if (tamanoMB > TAMANO_MAX_MB) {
      return NextResponse.json(
        { error: `El archivo supera el límite de ${TAMANO_MAX_MB} MB` },
        { status: 400 }
      )
    }

    const buffer = await file.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')

    const result = await gasPost({
      action: 'subirArchivo',
      eventoId,
      base64,
      mimeType: file.type,
      nombre: file.name,
    })

    if (!result?.success) {
      return NextResponse.json({ error: result?.message ?? 'Error al subir el archivo' }, { status: 502 })
    }

    // result.data.archivos = lista completa actualizada
    return NextResponse.json(result.data)
  } catch (err) {
    console.error('[eventos upload POST]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// DELETE /api/eventos/[id]/upload?fileId=xxx — mueve el archivo a la papelera
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireEscritura('eventos')
  if (session instanceof NextResponse) return session

  try {
    const { searchParams } = new URL(req.url)
    const fileId = searchParams.get('fileId')

    if (!fileId) {
      return NextResponse.json({ error: 'fileId requerido' }, { status: 400 })
    }

    const { id: eventoId } = await params
    const result = await gasPost({ action: 'eliminarArchivo', eventoId, fileId })
    if (!result?.success) {
      return NextResponse.json({ error: result?.message ?? 'Error al eliminar el archivo' }, { status: 502 })
    }

    return NextResponse.json(result.data)
  } catch (err) {
    console.error('[eventos upload DELETE]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
