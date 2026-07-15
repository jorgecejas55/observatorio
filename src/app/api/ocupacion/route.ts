/**
 * Proxy al Sistema de Ocupación Hotelera.
 * Solo accesible con sesión NextAuth + rol admin + email autorizado (ocupacion-acceso).
 */

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { tieneAccesoOcupacion } from '@/lib/ocupacion-acceso'
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
  // 1. Verificar sesión NextAuth
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // 2. Solo admin
  // @ts-expect-error — rol extendido en la sesión
  if (session.user?.rol !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  // 3. Solo emails autorizados para Ocupación Hotelera
  if (!tieneAccesoOcupacion(session.user.email)) {
    return NextResponse.json({ error: 'Acceso restringido' }, { status: 403 })
  }

  // 4. Ejecutar operaciones
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
