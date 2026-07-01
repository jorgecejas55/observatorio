/**
 * GET /api/informes-auto/relevamientos
 * Lista los relevamientos especiales del sistema OH.
 * Solo admin + jorgecejas55@gmail.com.
 */

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getRelevamientosEspeciales } from '@/lib/ocupacion-api'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  // @ts-expect-error
  if (session.user?.rol !== 'admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  if (session.user.email !== 'jorgecejas55@gmail.com') {
    return NextResponse.json({ error: 'Acceso restringido' }, { status: 403 })
  }

  try {
    const currentYear = new Date().getFullYear()
    const todos: unknown[] = []

    // Buscar en año actual y anterior (por si no hay del actual aún)
    for (const year of [currentYear, currentYear - 1]) {
      try {
        const relevamientos = await getRelevamientosEspeciales(year)
        todos.push(...relevamientos)
      } catch {
        // ignorar año sin datos
      }
    }

    // Ordenar por fecha descendente
    todos.sort((a: unknown, b: unknown) => {
      const fa = (a as Record<string, string>).fechaInicio ?? ''
      const fb = (b as Record<string, string>).fechaInicio ?? ''
      return fb.localeCompare(fa)
    })

    return NextResponse.json({ success: true, data: todos })
  } catch (error) {
    console.error('[relevamientos] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al obtener relevamientos' },
      { status: 500 }
    )
  }
}
