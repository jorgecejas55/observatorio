import { NextResponse } from 'next/server'
import { VisitaOcasionalSchema } from '@/lib/schemas'

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

// GET /api/ocio/ingresos/museo-virgen-valle/ocasionales - Obtener todas las visitas ocasionales
export async function GET() {
  try {
    const url = new URL(GAS)
    url.searchParams.set('action', 'getOcasionales')
    // No usar caché de Next.js para evitar desincronización con el backend (GAS maneja su propio caché)
    const res = await fetch(url.toString(), { cache: 'no-store' })
    const response = await res.json()

    // Ordenar por fecha descendente (más recientes primero)
    if (response.success && Array.isArray(response.data)) {
      response.data.sort((a: any, b: any) => {
        const fechaA = a.Fecha || a.fecha_visita || ''
        const fechaB = b.Fecha || b.fecha_visita || ''
        return fechaB.localeCompare(fechaA)
      })
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error('[museo-virgen-valle/ocasionales GET]', err)
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 })
  }
}

// POST /api/museos/virgen-valle/ocasionales - Crear nueva visita ocasional
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = VisitaOcasionalSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Datos inválidos' }, { status: 400 })
    }
    const data = parsed.data

    // Agregar timestamp
    const now = new Date().toISOString()
    const dataWithTimestamp = {
      ...data,
      'Marca temporal': now,
      timestamp: now,
    }

    const result = await gasPost({ action: 'createOcasional', data: dataWithTimestamp })
    return NextResponse.json(result)
  } catch (err) {
    console.error('[museo-virgen-valle/ocasionales POST]', err)
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 })
  }
}
