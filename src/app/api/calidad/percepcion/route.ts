import { NextResponse } from 'next/server'

const GAS = process.env.PERCEPCION_SCRIPT_URL ?? ''

export async function POST(req: Request) {
  try {
    if (!GAS) {
      return NextResponse.json({ error: 'PERCEPCION_SCRIPT_URL no configurada' }, { status: 500 })
    }

    const data = await req.json()

    // El GAS lee los datos con e.parameter, que solo funciona con form-urlencoded
    const params = new URLSearchParams()
    Object.entries(data).forEach(([key, value]) => {
      params.append(key, String(value ?? ''))
    })

    const res = await fetch(GAS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
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
