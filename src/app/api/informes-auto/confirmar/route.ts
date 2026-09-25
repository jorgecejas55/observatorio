/**
 * POST /api/informes-auto/confirmar
 *
 * Recibe el informe ya revisado por el usuario (calculado previamente vía
 * /api/informes-auto/calcular) y recién ahí lo guarda. NO toca el dashboard:
 * los valores llegan a la planilla maestra solo al publicar.
 *
 * Si ya existía un informe con el mismo slug (regeneración), conserva su
 * publicación: sigue "publicado" si los valores no cambiaron, o pasa a
 * "cambios sin publicar".
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireEscritura } from '@/lib/permisos'
import { guardarInforme, listarInformes, obtenerInforme } from '@/lib/informes-auto/gas'
import { estadoTrasCambio } from '@/lib/informes-auto/publicacion'
import type { InformeFindeCompleto } from '@/lib/informes-auto/types'

async function heredarPublicacion(informe: InformeFindeCompleto): Promise<void> {
  const previo = (await listarInformes()).find(m => m.slug === informe.slug)
  if (!previo) return
  const guardado = await obtenerInforme(previo.id)
  if (!guardado) return
  informe.publicacion = guardado.datos.publicacion
  informe.idInformePublico = guardado.meta.idInformePublico || guardado.datos.idInformePublico
  informe.estado = estadoTrasCambio(guardado.meta.estado, guardado.datos.publicacion, informe)
}

export async function POST(req: NextRequest) {
  const session = await requireEscritura('informes-auto')
  if (session instanceof NextResponse) return session

  let body: { informe?: InformeFindeCompleto }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo JSON inválido' }, { status: 400 })
  }

  const informe = body.informe
  if (!informe?.id || !informe.slug || !informe.relevamiento) {
    return NextResponse.json({ error: 'Falta el informe calculado a confirmar' }, { status: 400 })
  }

  try {
    informe.estado = 'borrador'
    await heredarPublicacion(informe)

    const persistencia = await guardarInforme(informe)
    if (!persistencia.success) {
      console.error('[confirmar] Error al persistir en GAS:', persistencia.error)
      return NextResponse.json({ error: `No se pudo guardar el informe: ${persistencia.error}` }, { status: 502 })
    }

    // En una regeneración el GAS preserva el id ORIGINAL: hay que adoptarlo,
    // si no el front redirige a un id que no está guardado en la hoja.
    if (persistencia.id) informe.id = persistencia.id

    return NextResponse.json({ success: true, data: informe, meta: { persistencia } })
  } catch (error) {
    console.error('[confirmar] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno al confirmar el informe' },
      { status: 500 }
    )
  }
}
