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

// GET /api/ocio/ingresos/museo-virgen-valle/ocasionales - Obtener todas las visitas ocasionales
export async function GET() {
  try {
    const url = new URL(GAS)
    url.searchParams.set('action', 'getOcasionales')
    // Cachear por 60 segundos para mejorar rendimiento
    const res = await fetch(url.toString(), { next: { revalidate: 60 } })
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
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}

// POST /api/museos/virgen-valle/ocasionales - Crear nueva visita ocasional
export async function POST(req: Request) {
  try {
    const data = await req.json()

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
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
