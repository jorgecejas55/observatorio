/**
 * Orquestador de generación de informes de fines de semana largos.
 * POST — recibe inputs del formulario y devuelve el informe completo.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import {
  getRelevamientoEspecialPorFecha,
  getAlojamientosActivos,
  getCargasDeRelevamiento,
} from '@/lib/ocupacion-api'
import {
  calcularOHPorTipo,
  calcularPicosOcupacion,
  calcularImpactoEconomico,
  calcularDiasEntreFechas,
} from '@/lib/informes-auto/calculos'
import { buscarUltimoFindeDelAnio, buscarMismoFindeAnioAnterior, getRelevamientoParaComparativaManual, getTendenciaAnioEnCurso } from '@/lib/informes-auto/comparativas'
import { getUltimoGastoHistorial } from '@/lib/informes-auto/historial'
import { generarReporteConIA } from '@/lib/informes-auto/narrativa'
import { getActividadesVigentes } from '@/lib/informes-auto/actividades'
import type {
  GenerarInformePayload,
  InformeFindeCompleto,
  DatosPerfilVisitante,
  InputsImpactoEconomico,
  PeriodoComparativo,
} from '@/lib/informes-auto/types'

// ── Verificación de acceso ────────────────────────────────────────────────────

function verificarAcceso(session: unknown): Response | null {
  const s = session as { user?: { email?: string; rol?: string } } | null
  if (!s?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (s.user.rol !== 'admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  if (s.user.email !== 'jorgecejas55@gmail.com') {
    return NextResponse.json({ error: 'Acceso restringido' }, { status: 403 })
  }
  return null
}

// ── Obtener datos del perfil del visitante ─────────────────────────────────────

async function fetchPerfil(fechaDesde: string, fechaHasta: string): Promise<DatosPerfilVisitante | null> {
  try {
    const baseUrl = process.env.DASHBOARD_PERFIL_SCRIPT_URL
    if (!baseUrl) return null

    const url = new URL(baseUrl)
    url.searchParams.set('fechaDesde', fechaDesde)
    url.searchParams.set('fechaHasta', fechaHasta)

    const res = await fetch(url.toString())
    if (!res.ok) return null

    const json = await res.json()
    const d = json.data ?? json

    // Estadía: API devuelve estadiaPromedio pre-calculado (sin datos crudos para outliers)
    const estadiaPromedio = Number(d.estadiaPromedio ?? 0)
    const estadiaSinOutliers = {
      estadiaPromedio: Math.round(estadiaPromedio * 10) / 10,
      n: Number(d.total ?? 0),
      nExcluidas: 0, // sin datos crudos, no podemos contar exclusiones
    }

    // Procedencia: API devuelve array [{nombre, cantidad}], convertir a objeto
    const procArray: Array<{ nombre: string; cantidad: number }> = d.porProcedencia ?? d.procedencia ?? []
    const procMap: Record<string, number> = {}
    if (Array.isArray(procArray)) {
      for (const p of procArray) {
        procMap[String(p.nombre ?? '').toUpperCase()] = Number(p.cantidad ?? 0)
      }
    }

    // Normalizar claves de objetos Sí/No (API devuelve mayúsculas, a veces sin tilde: SÍ, SI, NO)
    const normalizarSiNo = (obj: Record<string, number> | undefined): Record<string, number> => {
      if (!obj) return {}
      const out: Record<string, number> = {}
      for (const [k, v] of Object.entries(obj)) {
        // Quitar tildes y normalizar a mayúsculas
        const key = String(k ?? '')
          .toUpperCase()
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, '') // quitar acentos
          .trim()
        out[key] = Number(v ?? 0)
      }
      return out
    }

    return {
      totalEncuestas: Number(d.total ?? 0),
      estadiaSinOutliers,
      procedencia: {
        NACIONAL: procMap['NACIONAL'] ?? 0,
        PROVINCIAL: procMap['PROVINCIAL'] ?? 0,
        INTERNACIONAL: procMap['INTERNACIONAL'] ?? 0,
      },
      provinciasFrecuentes: (d.provinciasFrecuentes ?? d.provincias ?? []).map(
        (p: { nombre: string; cantidad: number }) => ({
          nombre: String(p.nombre ?? ''),
          cantidad: Number(p.cantidad ?? 0),
        })
      ),
      motivosVisita: (d.motivosVisita ?? d.motivos ?? []).map(
        (m: { nombre: string; cantidad: number }) => ({
          nombre: String(m.nombre ?? ''),
          cantidad: Number(m.cantidad ?? 0),
        })
      ),
      gruposViaje: (d.gruposViaje ?? d.grupos ?? []).map(
        (g: { nombre: string; cantidad: number }) => ({
          nombre: String(g.nombre ?? ''),
          cantidad: Number(g.cantidad ?? 0),
        })
      ),
      mediosTransporte: (d.mediosTransporte ?? d.transporte ?? []).map(
        (t: { nombre: string; cantidad: number }) => ({
          nombre: String(t.nombre ?? ''),
          cantidad: Number(t.cantidad ?? 0),
        })
      ),
      tiposAlojamiento: (d.tiposAlojamiento ?? d.alojamiento ?? []).map(
        (a: { nombre: string; cantidad: number }) => ({
          nombre: String(a.nombre ?? ''),
          cantidad: Number(a.cantidad ?? 0),
        })
      ),
      primeraVez: normalizarSiNo(d.primeraVez),
      otrosDestinos: normalizarSiNo(d.otrosDestinos),
      recomendaria: normalizarSiNo(d.recomendaria),
      volveria: normalizarSiNo(d.volveria),
    }
  } catch {
    return null
  }
}

// ── Generar ID y slug ─────────────────────────────────────────────────────────

function generarId(): string {
  return 'if_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8)
}

function generarSlug(nombre: string, fechaInicio: string): string {
  const base = nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const year = fechaInicio.slice(0, 4)
  return `${base}-${year}`
}

// ── POST /api/informes-auto/generar ───────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Verificar acceso
  const session = await auth()
  const errorAcceso = verificarAcceso(session)
  if (errorAcceso) return errorAcceso

  // 2. Parsear inputs
  let payload: GenerarInformePayload
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo JSON inválido' }, { status: 400 })
  }

  const { nombre, fechaInicio, fechaFin, gastoDiarioTuristas, gastoDiarioExcursionistas, excursionistas, comparativaManualUltimoFinde, comparativaManualAnioAnterior } = payload

  if (!nombre || !fechaInicio || !fechaFin) {
    return NextResponse.json({ error: 'Faltan datos requeridos: nombre, fechaInicio, fechaFin' }, { status: 400 })
  }

  if (!gastoDiarioTuristas || !gastoDiarioExcursionistas || excursionistas == null) {
    return NextResponse.json({ error: 'Faltan datos manuales: gasto y excursionistas' }, { status: 400 })
  }

  try {
    // 3. Buscar relevamiento en sistema OH
    const relevamiento = await getRelevamientoEspecialPorFecha(fechaInicio, fechaFin)
    if (!relevamiento) {
      return NextResponse.json({
        error: 'No se encontró un relevamiento cerrado para ese período en el sistema de Ocupación Hotelera',
        notFound: true,
      }, { status: 404 })
    }

    // 4. En paralelo: alojamientos, cargas, perfil, historial, comparativas, tendencia
    const year = new Date(fechaInicio).getFullYear()
    const [
      alojamientos,
      perfil,
      historial,
      comparativaUltimoFinde,
      comparativaAnioAnteriorRaw,
      tendencia,
      actividades,
    ] = await Promise.all([
      getAlojamientosActivos(),
      fetchPerfil(fechaInicio, fechaFin),
      getUltimoGastoHistorial(),
      // Si hay ID manual para último finde, usarlo; si no, auto-detección
      comparativaManualUltimoFinde
        ? getRelevamientoParaComparativaManual(comparativaManualUltimoFinde).then(r => ({
            relevamiento: r,
            impactoTotal: null,
            gastoDiarioTuristas: null,
          }))
        : buscarUltimoFindeDelAnio(year, fechaInicio),
      // Si hay ID manual para año anterior, usarlo; si no, Jaccard
      comparativaManualAnioAnterior
        ? getRelevamientoParaComparativaManual(comparativaManualAnioAnterior).then(r => ({
            relevamiento: r,
            impactoTotal: null,
            gastoDiarioTuristas: null,
          }))
        : buscarMismoFindeAnioAnterior(nombre, year),
      // Tendencia del año en curso (sin incluir el finde actual)
      getTendenciaAnioEnCurso(year, nombre),
      // Actividades vigentes durante el finde (Directus)
      getActividadesVigentes(fechaInicio, fechaFin),
    ])

    const cargas = await getCargasDeRelevamiento(relevamiento.id)

    // 5. Calcular OH por tipo
    const ohPorTipo = calcularOHPorTipo(cargas, alojamientos)

    // 5b. Calcular picos de ocupación (máximos por establecimiento, sin nombres)
    const picos = calcularPicosOcupacion(cargas, alojamientos)

    // 6. Calcular plazas disponibles y duración
    const plazasDisponibles = alojamientos
      .filter(a => a.estadoRegistro === 'REGISTRADO' || a.estadoRegistro === 'EN_TRAMITE')
      .reduce((sum, a) => sum + a.capacidadPlazas, 0)
    const duracionPeriodo = calcularDiasEntreFechas(fechaInicio, fechaFin)

    // 7. Estadía del perfil (o fallback si no hay encuestas)
    const estadia = perfil?.estadiaSinOutliers?.estadiaPromedio ?? 0
    const nEncuestas = perfil?.estadiaSinOutliers?.n ?? 0
    const nExcluidas = perfil?.estadiaSinOutliers?.nExcluidas ?? 0

    // 8. Calcular impacto económico
    const inputsImpacto: InputsImpactoEconomico = {
      plazasDisponibles,
      duracionPeriodo,
      ohPorcentaje: relevamiento.ohTotal,
      estadiaPromedio: estadia,
      gastoDiarioTuristas,
      gastoDiarioExcursionistas,
      excursionistas,
    }
    const impacto = calcularImpactoEconomico(inputsImpacto)

    // 9. Calcular impacto para comparativas
    let comparativaUltimoFindeFinal: PeriodoComparativo = comparativaUltimoFinde
    if (comparativaUltimoFinde.relevamiento && gastoDiarioTuristas > 0) {
      const duracionComp = calcularDiasEntreFechas(
        comparativaUltimoFinde.relevamiento.fechaInicio,
        comparativaUltimoFinde.relevamiento.fechaFin
      )
      const impactoComp = calcularImpactoEconomico({
        plazasDisponibles,
        duracionPeriodo: duracionComp,
        ohPorcentaje: comparativaUltimoFinde.relevamiento.ohTotal,
        estadiaPromedio: estadia,
        gastoDiarioTuristas,
        gastoDiarioExcursionistas,
        excursionistas,
      })
      comparativaUltimoFindeFinal = {
        relevamiento: comparativaUltimoFinde.relevamiento,
        impactoTotal: impactoComp.impactoTotal,
        gastoDiarioTuristas: gastoDiarioTuristas,
      }
    }

    let comparativaAnioAnterior: PeriodoComparativo = comparativaAnioAnteriorRaw
    if (comparativaAnioAnterior.relevamiento && gastoDiarioTuristas > 0) {
      const duracionComp = calcularDiasEntreFechas(
        comparativaAnioAnterior.relevamiento.fechaInicio,
        comparativaAnioAnterior.relevamiento.fechaFin
      )
      const impactoComp = calcularImpactoEconomico({
        plazasDisponibles,
        duracionPeriodo: duracionComp,
        ohPorcentaje: comparativaAnioAnterior.relevamiento.ohTotal,
        estadiaPromedio: estadia,
        gastoDiarioTuristas,
        gastoDiarioExcursionistas,
        excursionistas,
      })
      comparativaAnioAnterior = {
        relevamiento: comparativaAnioAnterior.relevamiento,
        impactoTotal: impactoComp.impactoTotal,
        gastoDiarioTuristas: gastoDiarioTuristas,
      }
    }

    // 10. Construir informe (sin narrativa aún)
    const id = generarId()
    const slug = generarSlug(nombre, fechaInicio)
    const perfilDefault: DatosPerfilVisitante = {
      totalEncuestas: 0,
      estadiaSinOutliers: { estadiaPromedio: 0, n: 0, nExcluidas: 0 },
      procedencia: { NACIONAL: 0, PROVINCIAL: 0, INTERNACIONAL: 0 },
      provinciasFrecuentes: [],
      motivosVisita: [],
      gruposViaje: [],
      mediosTransporte: [],
      tiposAlojamiento: [],
      primeraVez: {},
      otrosDestinos: {},
      recomendaria: {},
      volveria: {},
    }

    const informePre: InformeFindeCompleto = {
      id,
      slug,
      nombre,
      fechaInicio,
      fechaFin,
      fechaGeneracion: new Date().toISOString(),
      usuarioGenerador: 'jorgecejas55@gmail.com',
      estado: 'borrador',
      relevamiento,
      ohPorTipo,
      picos,
      perfil: perfil ?? perfilDefault,
      impacto,
      gastoDiarioTuristas,
      gastoDiarioExcursionistas,
      excursionistasManual: excursionistas,
      comparativaUltimoFinde: comparativaUltimoFindeFinal,
      comparativaAnioAnterior,
      tituloPrensa: '',
      bajadaPrensa: '',
      reportePrensa: '',
      actividades,
    }

    // 11. Generar reporte de prensa con IA (con datos de tendencia y actividades)
    const reporte = await generarReporteConIA(informePre, tendencia, actividades)

    const informe: InformeFindeCompleto = {
      ...informePre,
      tituloPrensa: reporte.titulo,
      bajadaPrensa: reporte.bajada,
      reportePrensa: reporte.reportePrensa,
    }

    // 12. Persistir en GAS — SOLO si la IA generó contenido real.
    // (Con upsert por slug, guardar un placeholder sobrescribiría un informe previo bueno.)
    let persistenciaResult: { success: boolean; error?: string; id?: string; slug?: string; actualizado?: boolean } | null = null
    const gasUrl = process.env.INFORMES_AUTO_SCRIPT_URL
    const gasSecret = process.env.INFORMES_AUTO_SCRIPT_SECRET
    if (!reporte.generadoConIA) {
      console.warn('[generar] La IA no generó contenido (placeholder) — se omite la persistencia para no sobrescribir un informe previo.')
      persistenciaResult = { success: false, error: 'IA no disponible: no se guardó para no sobrescribir un informe previo.' }
    } else if (gasUrl && gasUrl !== 'PENDIENTE' && gasSecret && gasSecret !== 'PENDIENTE') {
      try {
        const gasRes = await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ secret: gasSecret, action: 'guardar', data: informe }),
        })
        const gasJson = await gasRes.json()
        if (gasJson.error) {
          console.error('[generar] Error al persistir en GAS:', gasJson.error)
          persistenciaResult = { success: false, error: gasJson.error }
        } else {
          persistenciaResult = { success: true, ...gasJson.data }
        }
      } catch (e) {
        console.error('[generar] No se pudo persistir en GAS:', e)
        persistenciaResult = { success: false, error: String(e) }
      }
    }

    return NextResponse.json({
      success: true,
      data: informe,
      // Datos extra para el formulario
      meta: {
        historial,
        estadia: { n: nEncuestas, nExcluidas },
        duracionPeriodo,
        plazasDisponibles,
        persistencia: persistenciaResult,
        iaOk: reporte.generadoConIA,
      },
    })
  } catch (error) {
    console.error('[generar] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno al generar el informe' },
      { status: 500 }
    )
  }
}
