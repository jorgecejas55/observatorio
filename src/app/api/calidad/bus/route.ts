import { NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

const GAS = process.env.ENCUESTA_BUS_SCRIPT_URL ?? ''

export async function POST(req: Request) {
  try {
    if (!checkRateLimit(getClientIp(req))) {
      return NextResponse.json({ error: 'Demasiadas solicitudes. Intentá más tarde.' }, { status: 429 })
    }

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

    try {
      const result = JSON.parse(text)
      return NextResponse.json(result)
    } catch {
      console.error('[calidad-bus] respuesta no válida del script')
      return NextResponse.json(
        { error: 'Respuesta no válida del servidor' },
        { status: 502 },
      )
    }
  } catch (err) {
    console.error('[calidad-bus]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
