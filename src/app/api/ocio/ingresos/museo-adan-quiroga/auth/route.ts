import { NextResponse } from 'next/server'
import { MuseoAuthSchema } from '@/lib/schemas'

const GAS = process.env.MUSEO_ADAN_QUIROGA_SCRIPT_URL ?? ''

// POST /api/ocio/ingresos/museo-adan-quiroga/auth - Login
export async function POST(req: Request) {
  try {
    if (!GAS) {
      return NextResponse.json({
        success: false,
        error: 'MUSEO_ADAN_QUIROGA_SCRIPT_URL no está configurada. Verificá el archivo .env.local'
      }, { status: 500 })
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
    console.error('[museo-adan-quiroga/auth POST]', err)
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 })
  }
}
