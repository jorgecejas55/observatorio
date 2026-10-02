import { NextResponse } from 'next/server'
import { EventoSchema } from '@/lib/schemas'
import { requireAcceso, requireEscritura } from '@/lib/permisos'

const GAS = process.env.EVENTOS_SCRIPT_URL ?? ''

function toSnake(obj: Record<string, unknown>): Record<string, unknown> {
  const map: Record<string, string> = {
    tipoSede: 'tipo_sede', fechaInicio: 'fecha_inicio', fechaFin: 'fecha_fin',
    aprobacionAgenda: 'aprobacion_agenda', solicitaAsistencia: 'solicita_asistencia',
    detallesAsistenciaSolicitada: 'detalles_asistencia_solicitada',
    detallesAsistenciaAsignada: 'detalles_asistencia_asignada',
    detallesDerivacion: 'detalles_derivacion', presenciaFisica: 'presencia_fisica',
    totalAsistentes: 'total_asistentes', totalResidentes: 'total_residentes',
    totalNoResidentes: 'total_no_residentes', inversionSTDE: 'inversion_stde',
    inversionGenerador: 'inversion_generador', creadoPor: 'creado_por',
    fechaCreacion: 'fecha_creacion', modificadoPor: 'modificado_por',
    fechaModificacion: 'fecha_modificacion',
  }
  const result: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    result[map[k] ?? k] = v
  }
  return result
}

async function gasPost(body: object) {
  const res = await fetch(GAS, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
  })
  return res.json()
}

export async function GET(req: Request) {
  const session = await requireAcceso('eventos')
  if (session instanceof NextResponse) return session

  try {
    const url = new URL(GAS)
    url.searchParams.set('action', 'getEventos')
    const res = await fetch(url.toString(), { next: { revalidate: 0 } })
    const response = await res.json()

    if (response.success && Array.isArray(response.data)) {
      response.data.sort((a: Record<string, string>, b: Record<string, string>) => {
        return (b.fecha_inicio || '').localeCompare(a.fecha_inicio || '')
      })
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error('[eventos GET]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await requireEscritura('eventos')
  if (session instanceof NextResponse) return session

  try {
    const body = await req.json()
    // Descartar _userEmail si el cliente lo manda por compatibilidad
    const { _userEmail: _, ...bodyClean } = body
    const parsed = EventoSchema.safeParse(bodyClean)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    const userEmail = session.user?.email ?? 'sistema'
    const now = new Date().toISOString()

    const dataWithAudit = toSnake({
      ...parsed.data,
      creadoPor: userEmail,
      fechaCreacion: now,
      modificadoPor: userEmail,
      fechaModificacion: now,
    })

    const result = await gasPost({ action: 'createEvento', data: dataWithAudit })
    if (result?.success === false) {
      return NextResponse.json(result, { status: 502 })
    }
    return NextResponse.json(result)
  } catch (err) {
    console.error('[eventos POST]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
