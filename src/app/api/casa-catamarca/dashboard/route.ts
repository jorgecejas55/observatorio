import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { tieneAccesoCasaCatamarca } from '@/lib/casa-catamarca-acceso'

const GAS = process.env.CASA_CATAMARCA_DASHBOARD_SCRIPT_URL ?? ''
const API_KEY = process.env.CASA_CATAMARCA_API_KEY ?? ''

export async function GET(req: Request) {
  try {
    // Gate de autenticación
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    if (!tieneAccesoCasaCatamarca(session.user.email)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    if (!GAS) {
      return NextResponse.json(
        { error: 'CASA_CATAMARCA_DASHBOARD_SCRIPT_URL no configurada' },
        { status: 500 }
      )
    }

    // Construir URL con query params
    const { searchParams } = new URL(req.url)
    const params = new URLSearchParams()
    params.set('path', 'stats')
    params.set('apiKey', API_KEY)

    const fechaDesde = searchParams.get('fechaDesde')
    const fechaHasta = searchParams.get('fechaHasta')

    if (fechaDesde) params.set('fechaDesde', fechaDesde)
    if (fechaHasta) params.set('fechaHasta', fechaHasta)

    const url = `${GAS}?${params.toString()}`

    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    })

    const text = await res.text()

    // Detectar HTML (error de GAS)
    if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
      console.error('[casa-catamarca-dashboard] GAS devolvió HTML')
      return NextResponse.json(
        { error: 'Respuesta no válida del servidor' },
        { status: 502 }
      )
    }

    try {
      const result = JSON.parse(text)
      return NextResponse.json(result)
    } catch {
      console.error('[casa-catamarca-dashboard] JSON inválido:', text.slice(0, 200))
      return NextResponse.json(
        { error: 'Respuesta no válida del servidor' },
        { status: 502 }
      )
    }
  } catch (err) {
    console.error('[casa-catamarca-dashboard]', err)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
