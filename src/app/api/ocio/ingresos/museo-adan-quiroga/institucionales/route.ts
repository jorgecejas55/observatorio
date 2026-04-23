import { NextResponse } from 'next/server'
import { VisitaInstitucionalSchema } from '@/lib/schemas'

const GAS = process.env.MUSEO_ADAN_QUIROGA_SCRIPT_URL ?? ''

// Helper para POST al GAS
async function gasPost(body: object) {
  if (!GAS) {
    throw new Error('MUSEO_ADAN_QUIROGA_SCRIPT_URL no está configurada en .env.local')
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

// GET /api/ocio/ingresos/museo-adan-quiroga/institucionales - Obtener todas las visitas institucionales
export async function GET() {
  try {
    if (!GAS) {
      return NextResponse.json({
        success: false,
        error: 'MUSEO_ADAN_QUIROGA_SCRIPT_URL no está configurada. Verificá el archivo .env.local'
      }, { status: 500 })
    }

    const url = new URL(GAS)
    url.searchParams.set('action', 'getInstitucionales')
    // No usar caché de Next.js para evitar desincronización con el backend (GAS maneja su propio caché)
    const res = await fetch(url.toString(), { cache: 'no-store' })
    const response = await res.json()

    // Ordenar por fecha descendente (más recientes primero)
    if (response.success && Array.isArray(response.data)) {
      response.data.sort((a: any, b: any) => {
        const fechaA = a.fecha_visita || ''
        const fechaB = b.fecha_visita || ''
        return fechaB.localeCompare(fechaA)
      })
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error('[museo-adan-quiroga/institucionales GET]', err)
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 })
  }
}

// POST /api/ocio/ingresos/museo-adan-quiroga/institucionales - Crear nueva visita institucional
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = VisitaInstitucionalSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Datos inválidos' }, { status: 400 })
    }
    const result = await gasPost({ action: 'createInstitucional', data: parsed.data })
    return NextResponse.json(result)
  } catch (err) {
    console.error('[museo-adan-quiroga/institucionales POST]', err)
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 })
  }
}
