/**
 * GET /api/ocupacion/alojamientos
 * Devuelve alojamientos desde Directus (published, Capital).
 * Acceso por módulo RBAC 'ocupacion'.
 */

import { NextResponse } from 'next/server'
import { requireAcceso } from '@/lib/permisos'
import { getAlojamientosParaRelevamiento } from '@/lib/ocupacion-service'

export async function GET() {
  const session = await requireAcceso('ocupacion')
  if (session instanceof NextResponse) return session

  try {
    const alojamientos = await getAlojamientosParaRelevamiento()
    return NextResponse.json({ success: true, data: alojamientos, count: alojamientos.length })
  } catch (error) {
    console.error('[ocupacion/alojamientos]', error)
    return NextResponse.json({ error: 'Error al obtener alojamientos' }, { status: 500 })
  }
}
