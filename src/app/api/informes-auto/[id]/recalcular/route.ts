/**
 * POST /api/informes-auto/[id]/recalcular
 *
 * Recalcula SOLO los datos derivados del período actual (OH por tipo, picos,
 * perfil del visitante, impacto económico, actividades vigentes) desde las
 * fuentes en vivo (Sheets de Ocupación Hotelera, encuestas, Directus).
 *
 * NO toca: id, slug, estado, idInformePublico, tituloPrensa/bajadaPrensa/
 * reportePrensa (no vuelve a llamar a la IA), NI las comparativas
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
import { empujarAPlanillaMaestra } from '@/lib/informes-auto/empuje'
import { getActividadesVigentes } from '@/lib/informes-auto/actividades'
import { fetchPerfil } from '@/lib/informes-auto/perfil'
import type { InformeFindeCompleto, InputsImpactoEconomico } from '@/lib/informes-auto/types'

const GAS_URL = process.env.INFORMES_AUTO_SCRIPT_URL
const GAS_SECRET = process.env.INFORMES_AUTO_SCRIPT_SECRET

async function gasGetInforme(id: string): Promise<InformeFindeCompleto | null> {
  if (!GAS_URL || GAS_URL === 'PENDIENTE') throw new Error('INFORMES_AUTO_SCRIPT_URL no configurada')
  const url = new URL(GAS_URL)
  url.searchParams.set('action', 'obtener')
  url.searchParams.set('id', id)
  const res = await fetch(url.toString())
  const json = await res.json()
  if (json.error || !json.data?.datos) return null
  return { ...json.data.datos } as InformeFindeCompleto
}

async function gasGuardar(data: InformeFindeCompleto) {
  if (!GAS_URL || GAS_URL === 'PENDIENTE' || !GAS_SECRET || GAS_SECRET === 'PENDIENTE') {
    throw new Error('INFORMES_AUTO_SCRIPT_URL/SECRET no configurada')
  }
  const res = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: GAS_SECRET, action: 'guardar', data }),
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
    const existente = await gasGetInforme(id)
    if (!existente) {
      return NextResponse.json({ error: 'Informe no encontrado' }, { status: 404 })
    }

    const relevamientoId = existente.relevamiento?.id
    if (!relevamientoId) {
      return NextResponse.json({ error: 'El informe no tiene relevamiento de origen asociado' }, { status: 400 })
    }

    const { fechaInicio, fechaFin } = existente

    const relevamiento = await getRelevamientoPorId(relevamientoId)
    if (!relevamiento) {
      return NextResponse.json({ error: 'El relevamiento de origen ya no existe en el sistema OH' }, { status: 404 })
    }

    const [alojamientos, perfil, actividades] = await Promise.all([
      getAlojamientosActivos(),
      fetchPerfil(fechaInicio, fechaFin),
      getActividadesVigentes(fechaInicio, fechaFin),
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
      actividades,
    }

    // Mantiene sincronizada la planilla histórica maestra (upsert, no duplica filas).
    informe.empujeMaestra = await empujarAPlanillaMaestra(informe)
    if (!informe.empujeMaestra.ok) {
      console.warn('[recalcular] Empuje a planilla maestra falló:', informe.empujeMaestra.error)
    }

    const gasJson = await gasGuardar(informe)
    if (gasJson.error) {
      return NextResponse.json({ error: gasJson.error }, { status: 500 })
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
