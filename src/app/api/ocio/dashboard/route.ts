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

    console.log('[dashboard-perfil] status:', res.status, '| bytes:', text.length)

    try {
      return NextResponse.json(JSON.parse(text))
    } catch {
      return NextResponse.json({ error: 'Respuesta inválida del script', raw: text.slice(0, 300) }, { status: 502 })
    }
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
