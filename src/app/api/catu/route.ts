import { NextResponse } from 'next/server'
import { fetchCatuDashboard } from '@/lib/catu/service'

// Dashboard público (sin auth): solo agregados, sin textos de conversaciones
export async function GET() {
  try {
    const data = await fetchCatuDashboard()
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[API /api/catu]', error)
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ success: false, error: msg }, { status: 502 })
  }
}
