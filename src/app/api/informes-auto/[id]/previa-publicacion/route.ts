/**
 * GET /api/informes-auto/[id]/previa-publicacion
 *
 * Qué va a cambiar en el dashboard si se publica el informe: valores que hoy
 * muestra la planilla maestra vs los del informe, y filas del mismo año con
 * nombre parecido (posible duplicado si el evento se renombró).
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireEscritura } from '@/lib/permisos'
import { obtenerInforme } from '@/lib/informes-auto/gas'
import { getRegistrosMaestros } from '@/lib/informes-auto/comparativas'
import { compararConMaestra, valoresParaMaestra } from '@/lib/informes-auto/publicacion'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireEscritura('informes-auto')
  if (session instanceof NextResponse) return session

  const { id } = await params

  try {
    const guardado = await obtenerInforme(id)
    if (!guardado) {
      return NextResponse.json({ error: 'Informe no encontrado' }, { status: 404 })
    }

    const registros = await getRegistrosMaestros()
    const { actual, posiblesDuplicados } = compararConMaestra(guardado.datos, registros)

    return NextResponse.json({
      success: true,
      data: {
        nuevos: valoresParaMaestra(guardado.datos),
        actual,
        posiblesDuplicados,
        maestraDisponible: registros.length > 0,
      },
    })
  } catch (error) {
    console.error('[previa-publicacion]', error)
    return NextResponse.json({ error: 'No se pudo armar la vista previa' }, { status: 500 })
  }
}
