import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { 
  MetricaWebSchema, 
  MetricaSocialSchema, 
  MetricaCatuSchema 
} from '@/lib/schemas'

const GAS_URL = process.env.METRICAS_DIGITALES_SCRIPT_URL

function getSchema(canal: string) {
  if (canal === 'web') return MetricaWebSchema
  if (canal === 'facebook' || canal === 'instagram') return MetricaSocialSchema
  if (canal === 'catu') return MetricaCatuSchema
  return null
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ canal: string }> }
) {
  try {
    const { canal } = await params
    if (!GAS_URL) return NextResponse.json({ success: false, data: [], error: 'URL no configurada' })

    const url = `${GAS_URL}?action=getMetricas&canal=${canal}`
    const res = await fetch(url, { method: 'GET', next: { revalidate: 60 } })

    if (!res.ok) throw new Error(`Status ${res.status}`)
    const text = await res.text()
    try {
      return NextResponse.json(JSON.parse(text))
    } catch {
      return NextResponse.json({ success: false, data: [] })
    }
  } catch (error) {
    console.error('[API GET]', error)
    return NextResponse.json({ error: 'Error de conexión con Google' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ canal: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  try {
    const { canal } = await params
    const schema = getSchema(canal)
    if (!schema) return NextResponse.json({ error: 'Canal inválido' }, { status: 400 })

    const body = await request.json()
    const validacion = schema.safeParse(body)
    
    if (!validacion.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    if (!GAS_URL) return NextResponse.json({ error: 'Servidor no configurado' }, { status: 500 })

    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'create', canal, data: validacion.data })
    })

    const text = await res.text()
    try {
      return NextResponse.json(JSON.parse(text))
    } catch {
      return NextResponse.json({ error: 'Error en respuesta de Google' }, { status: 500 })
    }
  } catch (error) {
    console.error('[API POST]', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ canal: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  try {
    const { canal } = await params
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    const res = await fetch(GAS_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'delete', canal, id })
    })

    const text = await res.text()
    return NextResponse.json(JSON.parse(text))
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
