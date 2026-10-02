import { NextResponse } from 'next/server'
import { EventoSchema } from '@/lib/schemas'
import { requireGestion } from '@/lib/permisos'

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

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireGestion('eventos')
  if (session instanceof NextResponse) return session

  try {
    const { id } = await params
    const body = await req.json()
    const { _userEmail: _, ...bodyClean } = body
    const parsed = EventoSchema.safeParse(bodyClean)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    const userEmail = session.user?.email ?? 'sistema'
    const now = new Date().toISOString()

    const dataWithAudit = toSnake({
      ...parsed.data,
      modificadoPor: userEmail,
      fechaModificacion: now,
    })

    const result = await gasPost({ action: 'updateEvento', id, data: dataWithAudit })
    if (result?.success === false) {
      return NextResponse.json(result, { status: 502 })
    }
    return NextResponse.json(result)
  } catch (err) {
    console.error('[eventos PUT]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireGestion('eventos')
  if (session instanceof NextResponse) return session

  try {
    const { id } = await params
    const result = await gasPost({ action: 'deleteEvento', id })
    if (result?.success === false) {
      return NextResponse.json(result, { status: 502 })
    }
    return NextResponse.json(result)
  } catch (err) {
    console.error('[eventos DELETE]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
