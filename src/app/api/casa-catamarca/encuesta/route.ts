import { NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { esObjectoValido } from '@/lib/schemas'

const GAS = process.env.CASA_CATAMARCA_SCRIPT_URL ?? ''
const API_KEY = process.env.CASA_CATAMARCA_API_KEY ?? ''

export async function POST(req: Request) {
  try {
    // Rate limit por IP (mismo patrón que ocio/encuesta)
    if (!checkRateLimit(getClientIp(req))) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Intentá más tarde.' },
        { status: 429 }
      )
    }

    if (!GAS) {
      return NextResponse.json(
        { error: 'CASA_CATAMARCA_SCRIPT_URL no configurada' },
        { status: 500 }
      )
    }

    if (!API_KEY) {
      return NextResponse.json(
        { error: 'CASA_CATAMARCA_API_KEY no configurada' },
        { status: 500 }
      )
    }

    const data = await req.json()
    if (!esObjectoValido(data)) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    // Inyectar API key en el payload antes de enviar al GAS
    const payload = { ...data, apiKey: API_KEY }

    const res = await fetch(GAS, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    })

    const text = await res.text()

    // Detectar respuesta HTML del GAS (error conocido de Apps Script)
    if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
      console.error('[casa-catamarca-encuesta] GAS devolvió HTML en vez de JSON')
      return NextResponse.json(
        { error: 'Respuesta no válida del servidor (HTML)' },
        { status: 502 }
      )
    }

    try {
      const result = JSON.parse(text)
      return NextResponse.json(result)
    } catch {
      console.error('[casa-catamarca-encuesta] respuesta no válida del script:', text.slice(0, 200))
      return NextResponse.json(
        { error: 'Respuesta no válida del servidor' },
        { status: 502 }
      )
    }
  } catch (err) {
    console.error('[casa-catamarca-encuesta]', err)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
