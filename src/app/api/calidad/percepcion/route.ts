import { NextResponse } from 'next/server'
import { PercepcionSocialSchema } from '@/lib/schemas'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

const GAS = process.env.PERCEPCION_SCRIPT_URL ?? ''

export async function POST(req: Request) {
  const ip = getClientIp(req)
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Intentá nuevamente en una hora.' },
      { status: 429 }
    )
  }

  try {
    if (!GAS) {
      return NextResponse.json({ error: 'Error de configuración del servidor' }, { status: 500 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Cuerpo de la solicitud inválido' }, { status: 400 })
    }

    const validacion = PercepcionSocialSchema.safeParse(body)
    if (!validacion.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    const params = new URLSearchParams()
    Object.entries(validacion.data).forEach(([key, value]) => {
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
      return NextResponse.json({ error: 'Respuesta no válida del servidor' }, { status: 502 })
    }
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
