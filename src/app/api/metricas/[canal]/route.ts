import { NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { requireEscritura, requireGestion } from '@/lib/permisos'
import {
  MetricaWebSchema,
  MetricaSocialSchema
} from '@/lib/schemas'
import { esCanalMetricas, getMetricasCacheadas, TAG_METRICAS } from '@/lib/metricas/lectura'

const GAS_URL = process.env.METRICAS_DIGITALES_SCRIPT_URL

function getSchema(canal: string) {
  if (canal === 'web') return MetricaWebSchema
  if (canal === 'facebook' || canal === 'instagram') return MetricaSocialSchema
  return null
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ canal: string }> }
) {
  const { canal } = await params
  if (!esCanalMetricas(canal)) {
    return NextResponse.json({ success: false, error: 'Canal inválido' }, { status: 400 })
  }
  try {
    const data = await getMetricasCacheadas(canal)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error(`[API GET /api/metricas/${canal}]`, error)
    return NextResponse.json(
      { success: false, data: [], error: 'No se pudieron leer las métricas desde Google' },
      { status: 502 },
    )
  }
}

/** Tras una escritura: el dashboard público y el admin ven el dato nuevo al instante. */
function invalidarMetricas() {
  revalidateTag(TAG_METRICAS)
  revalidatePath('/admin/metricas')
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ canal: string }> }
) {
  const session = await requireEscritura('metricas')
  if (session instanceof NextResponse) return session

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
      const resultado = JSON.parse(text)
      invalidarMetricas()
      return NextResponse.json(resultado)
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
  const session = await requireGestion('metricas')
  if (session instanceof NextResponse) return session

  try {
    const { canal } = await params
    if (!getSchema(canal)) return NextResponse.json({ error: 'Canal inválido' }, { status: 400 })
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    if (!GAS_URL) return NextResponse.json({ error: 'Servidor no configurado' }, { status: 500 })

    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'delete', canal, id })
    })

    const text = await res.text()
    try {
      const resultado = JSON.parse(text)
      invalidarMetricas()
      return NextResponse.json(resultado)
    } catch {
      return NextResponse.json({ error: 'Error en respuesta de Google' }, { status: 500 })
    }
  } catch (error) {
    console.error('[API DELETE]', error)
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ canal: string }> }
) {
  const session = await requireGestion('metricas')
  if (session instanceof NextResponse) return session

  try {
    const { canal } = await params
    const schema = getSchema(canal)
    if (!schema) return NextResponse.json({ error: 'Canal inválido' }, { status: 400 })

    const body = await request.json()
    const { id, ...rest } = body
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    const validacion = schema.safeParse(rest)
    if (!validacion.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    if (!GAS_URL) return NextResponse.json({ error: 'Servidor no configurado' }, { status: 500 })

    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'update', canal, id, data: validacion.data })
    })

    const text = await res.text()
    try {
      const resultado = JSON.parse(text)
      invalidarMetricas()
      return NextResponse.json(resultado)
    } catch {
      return NextResponse.json({ error: 'Error en respuesta de Google' }, { status: 500 })
    }
  } catch (error) {
    console.error('[API PUT]', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
