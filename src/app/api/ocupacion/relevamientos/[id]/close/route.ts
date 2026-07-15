/**
 * POST /api/ocupacion/relevamientos/[id]/close
 * Cierra un relevamiento y calcula OH final.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getCargasDeRelevamiento, getAlojamientosParaRelevamiento, guardarIndicadoresOH } from '@/lib/ocupacion-service'
import { calcularIndicadoresRelevamiento } from '@/lib/informes-auto/calculos'
import { tieneAccesoOcupacion } from '@/lib/ocupacion-acceso'

const GAS_URL = process.env.OCUPACION_GAS_URL
const GAS_API_KEY = process.env.OCUPACION_GAS_API_KEY

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  // @ts-expect-error
  if (session.user?.rol !== 'admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  if (!tieneAccesoOcupacion(session.user.email)) {
    return NextResponse.json({ error: 'Acceso restringido' }, { status: 403 })
  }

  try {
    if (!GAS_URL || GAS_URL.includes('PENDIENTE')) {
      return NextResponse.json({ error: 'GAS no configurado' }, { status: 503 })
    }

    const { id } = await params

    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: GAS_API_KEY,
        path: 'relevamientos/close',
        data: { id, usuarioEmail: session.user.email },
      }),
    })
    const json = await res.json()

    if (!json.success) {
      return NextResponse.json({ error: json.error }, { status: 400 })
    }

    // Post-cierre: calcular y persistir indicadores
    let warning: string | undefined
    try {
      const cargas = await getCargasDeRelevamiento(id)
      const alojamientos = await getAlojamientosParaRelevamiento()
      const indicadores = calcularIndicadoresRelevamiento(
        id, cargas, alojamientos, alojamientos.length
      )
      await guardarIndicadoresOH({
        ...indicadores,
        usuarioEmail: session.user.email,
      })
    } catch (err) {
      console.error('[ocupacion/close] Indicadores pendientes:', err)
      warning = 'indicadores_pendientes'
    }

    return NextResponse.json({ ...json, warning })
  } catch (error) {
    console.error('[ocupacion/relevamientos/close]', error)
    return NextResponse.json({ error: 'Error al cerrar relevamiento' }, { status: 500 })
  }
}
