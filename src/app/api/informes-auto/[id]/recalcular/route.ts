/**
 * POST /api/informes-auto/[id]/recalcular
 *
 * Recalcula SOLO los datos derivados del período actual (OH por tipo, picos,
 * perfil del visitante, impacto económico, ingresos a atractivos y actividades
 * especiales) desde las fuentes en vivo (Sheets de Ocupación Hotelera, encuestas,
 * GAS de atractivos/museos).
 *
 * NO toca el dashboard: si el informe estaba publicado y sus valores cambian,
 * queda como "cambios sin publicar" hasta que se vuelva a publicar.
 *
 * NO toca: id, slug, idInformePublico, NI las comparativas
 * (comparativaUltimoFinde/comparativaAnioAnterior) — esas suelen resolverse
 * con una selección MANUAL al generar (la detección automática del "año
 * anterior" no siempre matchea por nombre) y no tenemos esa selección
 * guardada, así que recalcularlas puede pisar una comparativa buena con un
 * "no encontrado". Se preservan tal cual quedaron en la última generación.
 *
 * Uso: cuando se cargan datos nuevos directamente en el Sheet DESPUÉS de que
 * el informe ya fue generado (el informe es una foto fija, no se auto-actualiza).
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireEscritura } from '@/lib/permisos'
import {
  getRelevamientoPorId,
  getAlojamientosActivos,
  getCargasDeRelevamiento,
} from '@/lib/ocupacion-api'
import {
  calcularOHPorTipo,
  calcularPicosOcupacion,
  calcularImpactoEconomico,
  calcularDiasEntreFechas,
} from '@/lib/informes-auto/calculos'
import { guardarInforme, obtenerInforme } from '@/lib/informes-auto/gas'
import { estadoTrasCambio } from '@/lib/informes-auto/publicacion'
import { fetchIngresosAtractivos } from '@/lib/informes-auto/ingresos-atractivos'
import { fetchPerfil } from '@/lib/informes-auto/perfil'
import type { InformeFindeCompleto, InputsImpactoEconomico } from '@/lib/informes-auto/types'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireEscritura('informes-auto')
  if (session instanceof NextResponse) return session

  const { id } = await params

  try {
    const guardado = await obtenerInforme(id)
    if (!guardado) {
      return NextResponse.json({ error: 'Informe no encontrado' }, { status: 404 })
    }
    const existente = guardado.datos

    const relevamientoId = existente.relevamiento?.id
    if (!relevamientoId) {
      return NextResponse.json({ error: 'El informe no tiene relevamiento de origen asociado' }, { status: 400 })
    }

    const { fechaInicio, fechaFin } = existente

    const relevamiento = await getRelevamientoPorId(relevamientoId)
    if (!relevamiento) {
      return NextResponse.json({ error: 'El relevamiento de origen ya no existe en el sistema OH' }, { status: 404 })
    }

    const [alojamientos, perfil, ingresosAtractivos] = await Promise.all([
      getAlojamientosActivos(),
      fetchPerfil(fechaInicio, fechaFin),
      fetchIngresosAtractivos(fechaInicio, fechaFin),
    ])

    const cargas = await getCargasDeRelevamiento(relevamiento.id)

    const ohPorTipo = calcularOHPorTipo(cargas, alojamientos)
    const picos = calcularPicosOcupacion(cargas, alojamientos)

    const plazasDisponibles = alojamientos
      .filter(a => a.estadoRegistro === 'REGISTRADO' || a.estadoRegistro === 'EN_TRAMITE')
      .reduce((sum, a) => sum + a.capacidadPlazas, 0)
    const duracionPeriodo = calcularDiasEntreFechas(fechaInicio, fechaFin)
    const estadia = perfil?.estadiaSinOutliers?.estadiaPromedio ?? 0

    const inputsImpacto: InputsImpactoEconomico = {
      plazasDisponibles,
      duracionPeriodo,
      ohPorcentaje: relevamiento.ohTotal,
      estadiaPromedio: estadia,
      gastoDiarioTuristas: existente.gastoDiarioTuristas,
      gastoDiarioExcursionistas: existente.gastoDiarioExcursionistas,
      porcentajeExcursionistas: existente.porcentajeExcursionistas ?? 0,
    }
    const impacto = calcularImpactoEconomico(inputsImpacto)

    // Preserva todo lo editorial/identidad; solo pisa los datos derivados.
    const informe: InformeFindeCompleto = {
      ...existente,
      relevamiento,
      ohPorTipo,
      picos,
      perfil: perfil ?? existente.perfil,
      impacto,
      excursionistasManual: impacto.excursionistas,
      ingresosAtractivos,
    }

    informe.estado = estadoTrasCambio(guardado.meta.estado, existente.publicacion, informe)

    const persistencia = await guardarInforme(informe)
    if (!persistencia.success) {
      return NextResponse.json({ error: persistencia.error }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: informe })
  } catch (error) {
    console.error('[recalcular] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno al recalcular el informe' },
      { status: 500 }
    )
  }
}
