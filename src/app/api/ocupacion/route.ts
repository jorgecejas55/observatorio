/**
 * Proxy al Sistema de Ocupación Hotelera.
 * Acceso por módulo RBAC 'ocupacion'.
 */

import { NextResponse } from 'next/server'
import { requireAcceso } from '@/lib/permisos'
import {
  loginOcupacion,
  getRelevamientosEspeciales,
  getRelevamientoPorId,
  getCargasDeRelevamiento,
  getAlojamientosActivos,
  getTotalPlazasDisponibles,
  getDashboardEspeciales,
} from '@/lib/ocupacion-api'

export async function GET() {
  const session = await requireAcceso('ocupacion')
  if (session instanceof NextResponse) return session

  // Ejecutar operaciones
  try {
    const token = await loginOcupacion()
    const currentYear = new Date().getFullYear()
    const relevamientos = await getRelevamientosEspeciales(currentYear)

    return NextResponse.json({
      success: true,
      data: {
        tokenStatus: 'activo',
        relevamientos2026: relevamientos.length,
        relevamientos,
      },
    })
  } catch (error) {
    console.error('Error en proxy OH:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    )
  }
}
