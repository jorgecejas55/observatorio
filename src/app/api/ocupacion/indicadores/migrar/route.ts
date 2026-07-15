/**
 * POST /api/ocupacion/indicadores/migrar
 * Migra indicadores de todos los relevamientos históricos CERRADOS.
 * Ruta admin temporal — eliminar después de usar.
 * Soporta batching con query param ?offset=N (máx 30 por corrida).
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import {
  getRelevamientos,
  getCargasDeRelevamiento,
  getAlojamientosParaRelevamiento,
  guardarIndicadoresOH,
} from '@/lib/ocupacion-service'
import { calcularIndicadoresRelevamiento } from '@/lib/informes-auto/calculos'
import { tieneAccesoOcupacion } from '@/lib/ocupacion-acceso'

const BATCH_SIZE = 30

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  // @ts-expect-error
  if (session.user?.rol !== 'admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  if (!tieneAccesoOcupacion(session.user.email)) {
    return NextResponse.json({ error: 'Acceso restringido' }, { status: 403 })
  }

  try {
    const offset = Number(req.nextUrl.searchParams.get('offset') || 0)

    // Obtener relevamientos CERRADOS
    const relevamientos = await getRelevamientos({ estado: 'CERRADO' })

    // Ordenar por fecha (los más recientes primero) y aplicar batch
    const cerrados = relevamientos
      .sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio))
      .slice(offset, offset + BATCH_SIZE)

    if (cerrados.length === 0) {
      return NextResponse.json({
        success: true,
        message: offset === 0 ? 'No hay relevamientos cerrados para migrar' : 'Migración completa — no hay más relevamientos',
        results: [],
        nextOffset: null,
      })
    }

    // Obtener alojamientos activos (para el cálculo de grupos por tipo)
    const alojamientos = await getAlojamientosParaRelevamiento()
    // NO pasamos totalActivos — cobertura = null en migrados históricos

    const results: Array<{ relevamientoId: string; nombre: string; estado: string; error?: string }> = []

    for (const rel of cerrados) {
      try {
        const cargas = await getCargasDeRelevamiento(rel.id)
        const indicadores = calcularIndicadoresRelevamiento(rel.id, cargas, alojamientos)

        await guardarIndicadoresOH({
          ...indicadores,
          usuarioEmail: 'migracion',
        })

        results.push({
          relevamientoId: rel.id,
          nombre: rel.nombre,
          estado: 'OK',
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        results.push({
          relevamientoId: rel.id,
          nombre: rel.nombre,
          estado: 'ERROR',
          error: msg.slice(0, 200),
        })
      }
    }

    const nextOffset = offset + BATCH_SIZE < relevamientos.length
      ? offset + BATCH_SIZE
      : null

    return NextResponse.json({
      success: true,
      total: relevamientos.length,
      processed: `${offset + 1}-${Math.min(offset + BATCH_SIZE, relevamientos.length)}`,
      results,
      nextOffset: nextOffset !== null ? `/api/ocupacion/indicadores/migrar?offset=${nextOffset}` : null,
    })
  } catch (err) {
    console.error('[migrar indicadores]', err)
    return NextResponse.json({ error: 'Error en migración' }, { status: 500 })
  }
}
