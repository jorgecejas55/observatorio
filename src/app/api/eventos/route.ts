import { NextResponse } from 'next/server'
import { EventoSchema } from '@/lib/schemas'

const GAS = process.env.EVENTOS_SCRIPT_URL ?? ''

// Mismo workaround que el proyecto original: Content-Type text/plain para evitar CORS preflight
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

// GET /api/eventos — trae todos los eventos ordenados por fecha_inicio descendente
export async function GET() {
  try {
    const url = new URL(GAS)
    url.searchParams.set('action', 'getEventos')
    const res = await fetch(url.toString(), { next: { revalidate: 0 } })
    const response = await res.json()

    // Ordenar eventos por fecha_inicio descendente (más recientes primero)
    if (response.success && Array.isArray(response.data)) {
      response.data.sort((a: any, b: any) => {
        const fechaA = a.fecha_inicio || ''
        const fechaB = b.fecha_inicio || ''
        return fechaB.localeCompare(fechaA) // Descendente
      })
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error('[eventos GET]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// POST /api/eventos — crea un evento con campos de auditoría
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = EventoSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    // Extraer email del usuario
    const userEmail = extractUserEmail(parsed.data)

    // Eliminar campo temporal _userEmail
    const { _userEmail, ...cleanData } = parsed.data

    // Agregar campos de auditoría al crear
    const now = new Date().toISOString()

    const dataWithAudit = {
      ...cleanData,
      creado_por: userEmail,
      fecha_creacion: now,
      modificado_por: userEmail,
      fecha_modificacion: now,
    }

    const result = await gasPost({ action: 'createEvento', data: dataWithAudit })
    return NextResponse.json(result)
  } catch (err) {
    console.error('[eventos POST]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
