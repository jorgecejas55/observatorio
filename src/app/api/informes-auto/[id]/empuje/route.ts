/**
 * POST /api/informes-auto/[id]/empuje
 * Reintenta el empuje del informe a la planilla histórica maestra
 * (cuando falló durante la generación). Actualiza empujeMaestra en datosJSON.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireEscritura } from '@/lib/permisos'
import { empujarAPlanillaMaestra } from '@/lib/informes-auto/empuje'
import type { InformeFindeCompleto } from '@/lib/informes-auto/types'

const GAS_URL = process.env.INFORMES_AUTO_SCRIPT_URL
const GAS_SECRET = process.env.INFORMES_AUTO_SCRIPT_SECRET

async function gasGet(action: string, id: string) {
  if (!GAS_URL || GAS_URL === 'PENDIENTE') {
    throw new Error('INFORMES_AUTO_SCRIPT_URL no configurada')
  }
  const url = new URL(GAS_URL)
  url.searchParams.set('action', action)
  url.searchParams.set('id', id)
  const res = await fetch(url.toString())
  return res.json()
}

async function gasPost(body: Record<string, unknown>) {
  if (!GAS_URL || GAS_URL === 'PENDIENTE') {
    throw new Error('INFORMES_AUTO_SCRIPT_URL no configurada')
  }
  const res = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: GAS_SECRET, ...body }),
  })
  return res.json()
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireEscritura('informes-auto')
  if (session instanceof NextResponse) return session

  const { id } = await params

  try {
    // 1. Cargar el informe completo desde el GAS
    const json = await gasGet('obtener', id)
    const datos: InformeFindeCompleto | null = json?.data?.datos ?? null
    if (!datos) {
      return NextResponse.json({ error: 'Informe no encontrado' }, { status: 404 })
    }

    // 2. Reintentar el empuje
    const resultado = await empujarAPlanillaMaestra(datos)

    // 3. Persistir el resultado en datosJSON (upsert por slug, mismo informe)
    datos.empujeMaestra = resultado
    try {
      await gasPost({ action: 'guardar', data: datos })
    } catch (e) {
      // No bloquear: el empuje ya se hizo; solo falló registrar el resultado
      console.warn('[empuje] No se pudo actualizar empujeMaestra en datosJSON:', e)
    }

    if (!resultado.ok) {
      return NextResponse.json({ success: false, data: resultado }, { status: 502 })
    }
    return NextResponse.json({ success: true, data: resultado })
  } catch (error) {
    console.error('[empuje] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al reintentar el empuje' },
      { status: 500 }
    )
  }
}
