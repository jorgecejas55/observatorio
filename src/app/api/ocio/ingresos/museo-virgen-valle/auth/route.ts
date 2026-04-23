import { NextResponse } from 'next/server'
import { MuseoAuthSchema } from '@/lib/schemas'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

const GAS = process.env.MUSEO_VIRGEN_VALLE_SCRIPT_URL ?? ''

// POST /api/museos/virgen-valle/auth - Login
export async function POST(req: Request) {
  try {
    if (!checkRateLimit(getClientIp(req), 5, 15 * 60 * 1000)) {
      return NextResponse.json({ success: false, error: 'Demasiados intentos. Esperá 15 minutos.' }, { status: 429 })
    }

    const body = await req.json()
    const parsed = MuseoAuthSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Datos inválidos' }, { status: 400 })
    }
    const { email, password } = parsed.data

    const url = new URL(GAS)
    url.searchParams.set('action', 'login')
    url.searchParams.set('email', email)
    url.searchParams.set('password', password)

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    })

    const result = await res.json()
    return NextResponse.json(result)
  } catch (err) {
    console.error('[museo-virgen-valle/auth POST]', err)
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 })
  }
}
