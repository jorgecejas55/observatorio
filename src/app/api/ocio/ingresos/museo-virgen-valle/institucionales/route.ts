import { NextResponse } from 'next/server'
import { VisitaInstitucionalSchema } from '@/lib/schemas'

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

// GET /api/ocio/ingresos/museo-virgen-valle/institucionales - Obtener todas las visitas institucionales
export async function GET() {
  try {
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
    console.error('[museo-virgen-valle/institucionales GET]', err)
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 })
  }
}

// POST /api/ocio/ingresos/museo-virgen-valle/institucionales - Crear nueva visita institucional
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
    console.error('[museo-virgen-valle/institucionales POST]', err)
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 })
  }
}
