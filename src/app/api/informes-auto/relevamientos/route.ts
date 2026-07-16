/**
 * GET /api/informes-auto/relevamientos
 * Lista los relevamientos del sistema OH (Especiales + Mensuales) para el
 * formulario del agente: los Especiales generan informes FSL o EVENTO,
 * los Mensuales generan informes MENSUAL.
 * Acceso por módulo RBAC 'informes-auto'.
 */

import { NextResponse } from 'next/server'
import { requireAcceso } from '@/lib/permisos'
import { getRelevamientos } from '@/lib/ocupacion-service'
import type { RelevamientoOH } from '@/lib/informes-auto/types'

export async function GET() {
  const session = await requireAcceso('informes-auto')
  if (session instanceof NextResponse) return session

  try {
    const currentYear = new Date().getFullYear()
    const todos: RelevamientoOH[] = []

    // Buscar en año actual y anterior (por si no hay del actual aún)
    for (const year of [currentYear, currentYear - 1]) {
      try {
        const relevamientos = await getRelevamientos({ year })
        todos.push(...relevamientos)
      } catch {
        // ignorar año sin datos
      }
    }

    // Ordenar por fecha descendente
    todos.sort((a, b) => (b.fechaInicio ?? '').localeCompare(a.fechaInicio ?? ''))

    return NextResponse.json({ success: true, data: todos })
  } catch (error) {
    console.error('[relevamientos] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al obtener relevamientos' },
      { status: 500 }
    )
  }
}
