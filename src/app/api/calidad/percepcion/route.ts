import { NextResponse } from 'next/server'

const GAS = process.env.PERCEPCION_SCRIPT_URL ?? ''

export async function POST(req: Request) {
  try {
    if (!GAS) {
      return NextResponse.json({ error: 'PERCEPCION_SCRIPT_URL no configurada' }, { status: 500 })
    }

    const data = await req.json()

    const res = await fetch(GAS, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(data),
      redirect: 'follow',
    })

    const text = await res.text()
    try {
      return NextResponse.json(JSON.parse(text))
    } catch {
      console.error('[calidad/percepcion] respuesta no válida del script')
      return NextResponse.json({ error: 'Respuesta no válida del servidor' }, { status: 502 })
    }
  } catch (err) {
    console.error('[calidad/percepcion]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
