import { NextResponse } from 'next/server'

const GAS = process.env.EVENTOS_SCRIPT_URL ?? ''

/**
 * GET /api/eventos/dashboard
 *
 * Query params:
 * - fechaDesde: YYYY-MM-DD (opcional)
 * - fechaHasta: YYYY-MM-DD (opcional)
 * - tipo: string (opcional)
 * - origen: string (opcional)
 *
 * Retorna estadísticas agregadas del dashboard de eventos
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)

    // Construir URL con parámetros
    const url = new URL(GAS)
    url.searchParams.set('action', 'getDashboardEventos')

    // Agregar filtros opcionales
    const fechaDesde = searchParams.get('fechaDesde')
    const fechaHasta = searchParams.get('fechaHasta')
    const tipo = searchParams.get('tipo')
    const origen = searchParams.get('origen')

    if (fechaDesde) url.searchParams.set('fechaDesde', fechaDesde)
    if (fechaHasta) url.searchParams.set('fechaHasta', fechaHasta)
    if (tipo) url.searchParams.set('tipo', tipo)
    if (origen) url.searchParams.set('origen', origen)

    // Fetch con cache de 5 minutos (igual que GAS)
    const res = await fetch(url.toString(), {
      next: { revalidate: 300 }
    })

    if (!res.ok) {
      throw new Error(`GAS respondió con status ${res.status}`)
    }

    const data = await res.json()

    if (!data.success) {
      return NextResponse.json(
        { error: data.error || 'Error al obtener estadísticas' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('Error en /api/eventos/dashboard:', err)
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    )
  }
}
