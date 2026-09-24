/**
 * GET /api/informes-auto/datos-base?fechaInicio=&fechaFin=
 *
 * Datos reales que no dependen de los inputs manuales (gasto/% excursionistas):
 * plazas disponibles (sistema OH) y estadía promedio (encuestas del período).
 * Se usa para que la estimación de impacto en pantalla, apenas se elige el
 * relevamiento, ya muestre números reales en vez de valores fallback.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireEscritura } from '@/lib/permisos'
import { getAlojamientosActivos } from '@/lib/ocupacion-api'
import { fetchPerfil } from '@/lib/informes-auto/perfil'

export async function GET(req: NextRequest) {
  const session = await requireEscritura('informes-auto')
  if (session instanceof NextResponse) return session

  const { searchParams } = new URL(req.url)
  const fechaInicio = searchParams.get('fechaInicio')
  const fechaFin = searchParams.get('fechaFin')

  if (!fechaInicio || !fechaFin) {
    return NextResponse.json({ error: 'Faltan fechaInicio/fechaFin' }, { status: 400 })
  }

  try {
    const [alojamientos, perfil] = await Promise.all([
      getAlojamientosActivos(),
      fetchPerfil(fechaInicio, fechaFin),
    ])

    const plazasDisponibles = alojamientos
      .filter(a => a.estadoRegistro === 'REGISTRADO' || a.estadoRegistro === 'EN_TRAMITE')
      .reduce((sum, a) => sum + a.capacidadPlazas, 0)

    return NextResponse.json({
      success: true,
      data: {
        plazasDisponibles,
        estadiaPromedio: perfil?.estadiaSinOutliers?.estadiaPromedio ?? 0,
        nEncuestas: perfil?.estadiaSinOutliers?.n ?? 0,
        nExcluidas: perfil?.estadiaSinOutliers?.nExcluidas ?? 0,
      },
    })
  } catch (error) {
    console.error('[datos-base] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al obtener datos base' },
      { status: 500 }
    )
  }
}
