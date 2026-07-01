import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { tieneAccesoCasaCatamarca } from '@/lib/casa-catamarca-acceso'

const GAS = process.env.CASA_CATAMARCA_DASHBOARD_SCRIPT_URL ?? ''
const API_KEY = process.env.CASA_CATAMARCA_API_KEY ?? ''

export async function GET(req: Request) {
  try {
    // Gate de autenticación (defensa en profundidad)
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

    const { searchParams } = new URL(req.url)
    const params = new URLSearchParams()
    params.set('path', 'export')
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

    // Detectar error
    if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
      console.error('[casa-catamarca-export] GAS devolvió HTML')
      return NextResponse.json(
        { error: 'Error al generar el archivo' },
        { status: 502 }
      )
    }

    try {
      const parsed = JSON.parse(text)
      if (parsed.error) {
        return NextResponse.json({ error: parsed.error }, { status: 400 })
      }

      // El GAS devuelve { base64: "..." } — lo convertimos a binario
      const base64 = parsed.base64 || parsed
      if (typeof base64 !== 'string') {
        return NextResponse.json({ error: 'Formato de export no reconocido' }, { status: 502 })
      }

      const buffer = Buffer.from(base64, 'base64')

      const hoy = new Date().toISOString().slice(0, 10)
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="casa-catamarca-${hoy}.xlsx"`,
          'Content-Length': String(buffer.length),
        },
      })
    } catch {
      console.error('[casa-catamarca-export] JSON inválido:', text.slice(0, 200))
      return NextResponse.json(
        { error: 'Error al procesar la exportación' },
        { status: 502 }
      )
    }
  } catch (err) {
    console.error('[casa-catamarca-export]', err)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
