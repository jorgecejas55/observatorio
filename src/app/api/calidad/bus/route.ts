import { NextResponse } from 'next/server'

const GAS = process.env.ENCUESTA_BUS_SCRIPT_URL ?? ''

export async function POST(req: Request) {
  try {
    if (!GAS) {
      return NextResponse.json(
        { error: 'ENCUESTA_BUS_SCRIPT_URL no configurada' },
        { status: 500 },
      )
    }

    const data = await req.json()

    const res = await fetch(GAS, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(data),
      redirect: 'follow',
    })

    const text = await res.text()

    console.log('[calidad-bus] GAS status:', res.status)
    console.log('[calidad-bus] GAS response:', text.slice(0, 300))

    try {
      const result = JSON.parse(text)
      return NextResponse.json(result)
    } catch {
      return NextResponse.json(
        { error: 'Respuesta no válida del script', raw: text.slice(0, 300) },
        { status: 502 },
      )
    }
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
