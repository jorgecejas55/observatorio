/**
 * Orquestador de generación de informes (FSL / EVENTO / MENSUAL).
 * POST — recibe inputs del formulario y devuelve el informe completo.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireEscritura } from '@/lib/permisos'
import {
  getRelevamientoEspecialPorFecha,
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
import {
  buscarPeriodoAnterior,
  buscarMismoPeriodoAnioAnterior,
  getRegistroMaestroPorId,
  registroAPeriodoComparativo,
  getTendenciaAnioEnCurso,
} from '@/lib/informes-auto/comparativas'
import { empujarAPlanillaMaestra } from '@/lib/informes-auto/empuje'
import { generarReporteConIA } from '@/lib/informes-auto/narrativa'
import { getActividadesVigentes } from '@/lib/informes-auto/actividades'
import { fetchPerfil } from '@/lib/informes-auto/perfil'
import {
  COMPARATIVA_NINGUNA,
  type GenerarInformePayload,
  type InformeFindeCompleto,
  type DatosPerfilVisitante,
  type InputsImpactoEconomico,
  type PeriodoComparativo,
  type TipoInforme,
} from '@/lib/informes-auto/types'

// ── Generar ID y slug ─────────────────────────────────────────────────────────

function generarId(): string {
  return 'if_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8)
}

function slugBase(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Slug por tipo: FSL `<nombre>-<año>` · EVENTO `evento-<nombre>-<año>` · MENSUAL `mensual-<año>-<mm>` */
function generarSlug(tipoInforme: TipoInforme, nombre: string, fechaInicio: string): string {
  const year = fechaInicio.slice(0, 4)
  const mm = fechaInicio.slice(5, 7)
  if (tipoInforme === 'MENSUAL') return `mensual-${year}-${mm}`
  if (tipoInforme === 'EVENTO') return `evento-${slugBase(nombre)}-${year}`
  return `${slugBase(nombre)}-${year}`
}

// ── Resolución de comparativas (manual vs. automática) ────────────────────────

async function resolverComparativa(
  manual: string | undefined,
  automatica: () => Promise<PeriodoComparativo>
): Promise<PeriodoComparativo> {
  if (manual === COMPARATIVA_NINGUNA) {
    return { relevamiento: null, impactoTotal: null, gastoDiarioTuristas: null }
  }
  if (manual) {
    const registro = await getRegistroMaestroPorId(manual)
    if (registro) return registroAPeriodoComparativo(registro)
    return {
      relevamiento: null,
      impactoTotal: null,
      gastoDiarioTuristas: null,
      advertencia: `No se encontró el registro "${manual}" en la planilla maestra`,
    }
  }
  return automatica()
}

// ── POST /api/informes-auto/generar ───────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Verificar acceso
  const session = await requireEscritura('informes-auto')
  if (session instanceof NextResponse) return session

  // 2. Parsear inputs
  let payload: GenerarInformePayload
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo JSON inválido' }, { status: 400 })
  }

  const {
    relevamientoId,
    nombre,
    fechaInicio,
    fechaFin,
    gastoDiarioTuristas,
    gastoDiarioExcursionistas,
    porcentajeExcursionistas,
    comparativaManualUltimoFinde,
    comparativaManualAnioAnterior,
  } = payload
  const tipoInforme: TipoInforme = payload.tipoInforme ?? 'FSL'

  if (!nombre || !fechaInicio || !fechaFin) {
    return NextResponse.json({ error: 'Faltan datos requeridos: nombre, fechaInicio, fechaFin' }, { status: 400 })
  }

  if (!gastoDiarioTuristas || !gastoDiarioExcursionistas || porcentajeExcursionistas == null) {
    return NextResponse.json({ error: 'Faltan datos manuales: gasto diario y % de excursionistas' }, { status: 400 })
  }

  try {
    // 3. Buscar relevamiento en sistema OH (por ID si viene; por fecha como fallback)
    const relevamiento = relevamientoId
      ? await getRelevamientoPorId(relevamientoId)
      : await getRelevamientoEspecialPorFecha(fechaInicio, fechaFin)
    if (!relevamiento) {
      return NextResponse.json({
        error: 'No se encontró el relevamiento en el sistema de Ocupación Hotelera',
        notFound: true,
      }, { status: 404 })
    }

    // 4. En paralelo: alojamientos, perfil, comparativas, tendencia, actividades
    const year = Number(fechaInicio.slice(0, 4))
    const mesNumero = Number(fechaInicio.slice(5, 7))
    const [
      alojamientos,
      perfil,
      comparativaUltimoFinde,
      comparativaAnioAnterior,
      tendencia,
      actividades,
    ] = await Promise.all([
      getAlojamientosActivos(),
      fetchPerfil(fechaInicio, fechaFin),
      resolverComparativa(comparativaManualUltimoFinde, () =>
        buscarPeriodoAnterior(tipoInforme, nombre, year, mesNumero)
      ),
      resolverComparativa(comparativaManualAnioAnterior, () =>
        buscarMismoPeriodoAnioAnterior(tipoInforme, nombre, year, mesNumero)
      ),
      // Tendencia del año en curso (sin incluir el período actual)
      getTendenciaAnioEnCurso(tipoInforme, year, nombre),
      // Actividades vigentes durante el período (Directus)
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

    // 7. Estadía del perfil (encuestas del período; o fallback si no hay)
    const estadia = perfil?.estadiaSinOutliers?.estadiaPromedio ?? 0
    const nEncuestas = perfil?.estadiaSinOutliers?.n ?? 0
    const nExcluidas = perfil?.estadiaSinOutliers?.nExcluidas ?? 0

    // 8. Calcular impacto económico (fórmulas canónicas, sin redondeos intermedios)
    const inputsImpacto: InputsImpactoEconomico = {
      plazasDisponibles,
      duracionPeriodo,
      ohPorcentaje: relevamiento.ohTotal,
      estadiaPromedio: estadia,
      gastoDiarioTuristas,
      gastoDiarioExcursionistas,
      porcentajeExcursionistas,
    }
    const impacto = calcularImpactoEconomico(inputsImpacto)

    // 9. Construir informe (sin narrativa aún)
    // Las comparativas ya traen visitantes/impacto reales de la planilla maestra.
    const id = generarId()
    const slug = generarSlug(tipoInforme, nombre, fechaInicio)
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
      tipoInforme,
      fechaInicio,
      fechaFin,
      fechaGeneracion: new Date().toISOString(),
      usuarioGenerador: session.user?.email || 'sistema',
      estado: 'borrador',
      relevamiento,
      ohPorTipo,
      picos,
      perfil: perfil ?? perfilDefault,
      impacto,
      gastoDiarioTuristas,
      gastoDiarioExcursionistas,
      porcentajeExcursionistas,
      excursionistasManual: impacto.excursionistas, // cantidad calculada (trazabilidad)
      comparativaUltimoFinde,
      comparativaAnioAnterior,
      tituloPrensa: '',
      bajadaPrensa: '',
      reportePrensa: '',
      actividades,
    }

    // 10. Generar reporte de prensa con IA (con datos de tendencia y actividades)
    const reporte = await generarReporteConIA(informePre, tendencia, actividades)

    const informe: InformeFindeCompleto = {
      ...informePre,
      tituloPrensa: reporte.titulo,
      bajadaPrensa: reporte.bajada,
      reportePrensa: reporte.reportePrensa,
    }

    // 11. Empuje a la planilla histórica maestra (no-bloqueante).
    // Solo si la IA generó contenido real: si falló, el informe no se persiste
    // y tampoco corresponde empujar.
    if (reporte.generadoConIA) {
      informe.empujeMaestra = await empujarAPlanillaMaestra(informe)
      if (!informe.empujeMaestra.ok) {
        console.warn('[generar] Empuje a planilla maestra falló:', informe.empujeMaestra.error)
      }
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

    // Si fue upsert (regeneración de un informe existente), GAS devuelve el id
    // ORIGINAL preservado — hay que adoptarlo, si no el front redirige a un id
    // que no está guardado en la hoja.
    if (persistenciaResult?.success && persistenciaResult.id) {
      informe.id = persistenciaResult.id
    }

    return NextResponse.json({
      success: true,
      data: informe,
      // Datos extra para el formulario
      meta: {
        estadia: { n: nEncuestas, nExcluidas },
        duracionPeriodo,
        plazasDisponibles,
        persistencia: persistenciaResult,
        empuje: informe.empujeMaestra ?? null,
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
