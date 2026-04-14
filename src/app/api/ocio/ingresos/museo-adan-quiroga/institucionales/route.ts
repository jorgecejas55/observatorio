import { NextResponse } from 'next/server'

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
    // Cachear por 60 segundos para mejorar rendimiento
    const res = await fetch(url.toString(), { next: { revalidate: 60 } })
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
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}

// POST /api/ocio/ingresos/museo-adan-quiroga/institucionales - Crear nueva visita institucional
export async function POST(req: Request) {
  try {
    const data = await req.json()

    const result = await gasPost({ action: 'createInstitucional', data })
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
