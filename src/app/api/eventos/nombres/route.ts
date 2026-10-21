import { NextResponse } from 'next/server'
import { requireSesionApi } from '@/lib/permisos'

const GAS = process.env.EVENTOS_SCRIPT_URL ?? ''

export async function GET() {
  const session = await requireSesionApi()
  if (session instanceof NextResponse) return session

  try {
    const url = new URL(GAS)
    url.searchParams.set('action', 'getEventos')
    const res = await fetch(url.toString(), { next: { revalidate: 0 } })
    const response = await res.json()

    const lista: { denominacion?: string }[] = Array.isArray(response)
      ? response
      : (response.data ?? [])

    const nombres = [...new Set(
      lista.map((e) => e.denominacion ?? '').filter(Boolean)
    )]

    return NextResponse.json({ nombres })
  } catch (err) {
    console.error('[eventos/nombres GET]', err)
    return NextResponse.json({ nombres: [] })
  }
}
