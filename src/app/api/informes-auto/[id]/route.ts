/**
 * GET   /api/informes-auto/[id]  — obtener informe completo
 * PATCH /api/informes-auto/[id]  — publicar informe { accion: 'publicar' }
 *
 * Publicar = oficial: empuja los valores a la planilla maestra (dashboard),
 * marca el informe como publicado y refresca Informes Técnicos. Si el empuje
 * falla, el informe NO queda publicado.
 */

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireAcceso, requireEscritura } from '@/lib/permisos'
import { guardarInforme, obtenerInforme } from '@/lib/informes-auto/gas'
import { empujarAPlanillaMaestra } from '@/lib/informes-auto/empuje'
import { valoresParaMaestra } from '@/lib/informes-auto/publicacion'

// ── GET: obtener informe completo ─────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAcceso('informes-auto')
  if (session instanceof NextResponse) return session

  const { id } = await params

  try {
    const guardado = await obtenerInforme(id)
    if (!guardado) {
      return NextResponse.json({ error: 'Informe no encontrado' }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: { ...guardado.meta, datos: guardado.datos } })
  } catch (error) {
    console.error('[informes-auto] obtener:', error)
    return NextResponse.json({ error: 'Error al obtener el informe' }, { status: 500 })
  }
}

// ── PATCH: publicar informe ────────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireEscritura('informes-auto')
  if (session instanceof NextResponse) return session

  const { id } = await params

  let body: { accion?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo JSON inválido' }, { status: 400 })
  }
  if (body.accion !== 'publicar') {
    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
  }

  try {
    const guardado = await obtenerInforme(id)
    if (!guardado) {
      return NextResponse.json({ error: 'Informe no encontrado' }, { status: 404 })
    }
    const informe = guardado.datos

    const empuje = await empujarAPlanillaMaestra(informe)
    if (!empuje.ok) {
      return NextResponse.json(
        { error: `No se pudo actualizar el dashboard: ${empuje.error}. El informe no se publicó.` },
        { status: 502 }
      )
    }

    informe.empujeMaestra = empuje
    informe.estado = 'publicado'
    informe.publicacion = {
      fecha: empuje.fecha,
      usuario: session.user?.email ?? '',
      valores: valoresParaMaestra(informe),
    }

    const persistencia = await guardarInforme(informe)
    if (!persistencia.success) {
      // El dashboard ya tiene los valores nuevos; solo falló marcar el estado.
      console.error('[informes-auto] publicar: empuje OK pero no se guardó el estado:', persistencia.error)
      return NextResponse.json(
        { error: 'El dashboard se actualizó, pero no se pudo marcar el informe como publicado. Reintentá.' },
        { status: 502 }
      )
    }

    revalidatePath('/informes/ocio')
    return NextResponse.json({ success: true, data: informe })
  } catch (error) {
    console.error('[informes-auto] publicar:', error)
    return NextResponse.json({ error: 'Error al publicar el informe' }, { status: 500 })
  }
}
