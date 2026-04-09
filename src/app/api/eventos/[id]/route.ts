import { NextResponse } from 'next/server'

const GAS = process.env.EVENTOS_SCRIPT_URL ?? ''

async function gasPost(body: object) {
  const res = await fetch(GAS, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
  })
  return res.json()
}

// Helper: extraer email del usuario desde el body
function extractUserEmail(data: any): string {
  return data._userEmail || 'sistema'
}

// PUT /api/eventos/[id] — actualiza un evento con campos de auditoría
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const data = await req.json()

    // Extraer email del usuario
    const userEmail = extractUserEmail(data)

    // Eliminar campo temporal _userEmail
    const { _userEmail, ...cleanData } = data

    // Agregar campos de auditoría al actualizar
    const now = new Date().toISOString()

    const dataWithAudit = {
      ...cleanData,
      modificado_por: userEmail,
      fecha_modificacion: now,
      // NO incluir creado_por ni fecha_creacion aquí
      // el Apps Script los protege automáticamente
    }

    const result = await gasPost({ action: 'updateEvento', id, data: dataWithAudit })
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// DELETE /api/eventos/[id] — elimina un evento
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const result = await gasPost({ action: 'deleteEvento', id })
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
