/**
 * GET /api/informes-auto/fuentes-digitales?anio=2026&mes=9
 *
 * Checklist previo de un informe MENSUAL: qué canales digitales tienen cargado
 * el mes y cuándo se sincronizó Catu por última vez.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAcceso } from '@/lib/permisos'
import { fetchCanalesDigitales, ultimaSyncCatu } from '@/lib/informes-auto/canales-digitales'

export async function GET(req: NextRequest) {
  const session = await requireAcceso('informes-auto')
  if (session instanceof NextResponse) return session

  const anio = Number(req.nextUrl.searchParams.get('anio'))
  const mes = Number(req.nextUrl.searchParams.get('mes'))
  if (!Number.isInteger(anio) || !Number.isInteger(mes) || mes < 1 || mes > 12) {
    return NextResponse.json({ error: 'Parámetros inválidos: anio y mes (1-12)' }, { status: 400 })
  }

  try {
    const finDeMes = new Date(Date.UTC(anio, mes, 0)).toISOString().slice(0, 10)
    const [canales, catuUltimaSync] = await Promise.all([
      fetchCanalesDigitales(anio, mes, finDeMes),
      ultimaSyncCatu(),
    ])
    return NextResponse.json({ success: true, data: { faltantes: canales.faltantes, catuUltimaSync } })
  } catch (error) {
    console.error('[fuentes-digitales]', error)
    return NextResponse.json({ error: 'No se pudieron consultar los canales digitales' }, { status: 500 })
  }
}
