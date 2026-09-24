/**
 * POST /api/informes-auto/confirmar
 *
 * Recibe el informe ya revisado por el usuario (calculado previamente vía
 * /api/informes-auto/calcular) y recién ahí persiste: guarda en la planilla
 * de informes y empuja los indicadores a la serie histórica maestra.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireEscritura } from '@/lib/permisos'
import { empujarAPlanillaMaestra } from '@/lib/informes-auto/empuje'
import type { InformeFindeCompleto } from '@/lib/informes-auto/types'

export async function POST(req: NextRequest) {
  const session = await requireEscritura('informes-auto')
  if (session instanceof NextResponse) return session

  let body: { informe?: InformeFindeCompleto }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo JSON inválido' }, { status: 400 })
  }

  const informe = body.informe
  if (!informe?.id || !informe.slug || !informe.relevamiento) {
    return NextResponse.json({ error: 'Falta el informe calculado a confirmar' }, { status: 400 })
  }

  try {
    // 1. Empuje a la planilla histórica maestra (no bloqueante)
    informe.empujeMaestra = await empujarAPlanillaMaestra(informe)
    if (!informe.empujeMaestra.ok) {
      console.warn('[confirmar] Empuje a planilla maestra falló:', informe.empujeMaestra.error)
    }

    // 2. Persistir en GAS (upsert por slug)
    let persistenciaResult: { success: boolean; error?: string; id?: string; slug?: string; actualizado?: boolean } | null = null
    const gasUrl = process.env.INFORMES_AUTO_SCRIPT_URL
    const gasSecret = process.env.INFORMES_AUTO_SCRIPT_SECRET
    if (gasUrl && gasUrl !== 'PENDIENTE' && gasSecret && gasSecret !== 'PENDIENTE') {
      try {
        const gasRes = await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ secret: gasSecret, action: 'guardar', data: informe }),
        })
        const gasJson = await gasRes.json()
        if (gasJson.error) {
          console.error('[confirmar] Error al persistir en GAS:', gasJson.error)
          persistenciaResult = { success: false, error: gasJson.error }
        } else {
          persistenciaResult = { success: true, ...gasJson.data }
        }
      } catch (e) {
        console.error('[confirmar] No se pudo persistir en GAS:', e)
        persistenciaResult = { success: false, error: String(e) }
      }
    } else {
      persistenciaResult = { success: false, error: 'INFORMES_AUTO_SCRIPT_URL/SECRET no configurada' }
    }

    // Si fue upsert (regeneración de un informe existente), GAS devuelve el id
    // ORIGINAL preservado — hay que adoptarlo, si no el front redirige a un id
    // que no está guardado en la hoja.
    if (persistenciaResult?.success && persistenciaResult.id) {
      informe.id = persistenciaResult.id
    }

    return NextResponse.json({
      success: true,
      data: informe,
      meta: {
        persistencia: persistenciaResult,
        empuje: informe.empujeMaestra ?? null,
      },
    })
  } catch (error) {
    console.error('[confirmar] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno al confirmar el informe' },
      { status: 500 }
    )
  }
}
