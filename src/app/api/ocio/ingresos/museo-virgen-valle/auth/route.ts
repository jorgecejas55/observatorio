import { NextResponse } from 'next/server'

const GAS = process.env.MUSEO_VIRGEN_VALLE_SCRIPT_URL ?? ''

// POST /api/museos/virgen-valle/auth - Login
export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()

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
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
