import { NextResponse } from 'next/server'

const GAS = process.env.DASHBOARD_PERFIL_SCRIPT_URL ?? ''

export async function GET(req: Request) {
  try {
    if (!GAS) {
      return NextResponse.json({ error: 'DASHBOARD_PERFIL_SCRIPT_URL no configurada' }, { status: 500 })
    }

    const { searchParams } = new URL(req.url)
    const gasUrl = new URL(GAS)
    searchParams.forEach((v, k) => gasUrl.searchParams.set(k, v))

    const res  = await fetch(gasUrl.toString(), { redirect: 'follow' })
    const text = await res.text()

    try {
      return NextResponse.json(JSON.parse(text))
    } catch {
      console.error('[dashboard-perfil] respuesta inválida del script')
      return NextResponse.json({ error: 'Respuesta no válida del servidor' }, { status: 502 })
    }
  } catch (err) {
    console.error('[dashboard-perfil]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
