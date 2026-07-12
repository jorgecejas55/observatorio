import { NextResponse } from 'next/server'
import { EventoSchema } from '@/lib/schemas'

const GAS = process.env.EVENTOS_SCRIPT_URL ?? ''

// Conversión camelCase → snake_case para el backend GAS
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

// Helper: extraer email del usuario desde el body
function extractUserEmail(data: any): string {
  return data._userEmail || 'sistema'
}

// PUT /api/eventos/[id] — actualiza un evento con campos de auditoría
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const parsed = EventoSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    // Extraer email del usuario
    const userEmail = extractUserEmail(parsed.data)

    // Eliminar campo temporal _userEmail
    const { _userEmail, ...cleanData } = parsed.data

    // Agregar campos de auditoría al actualizar
    const now = new Date().toISOString()

    const dataWithAudit = toSnake({
      ...cleanData,
      modificadoPor: userEmail,
      fechaModificacion: now,
      // NO incluir creado_por ni fecha_creacion aquí
      // el Apps Script los protege automáticamente
    })

    const result = await gasPost({ action: 'updateEvento', id, data: dataWithAudit })
    return NextResponse.json(result)
  } catch (err) {
    console.error('[eventos PUT]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// DELETE /api/eventos/[id] — elimina un evento
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const result = await gasPost({ action: 'deleteEvento', id })
    return NextResponse.json(result)
  } catch (err) {
    console.error('[eventos DELETE]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
