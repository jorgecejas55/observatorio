/**
 * Cálculo de datos e indicadores de un informe (OH por tipo, picos, perfil del
 * visitante, impacto económico, comparativas, ingresos a atractivos).
 *
 * Puramente de lectura/cálculo: no persiste nada. Se usa desde
 * /api/informes-auto/calcular para armar la vista previa que el usuario
 * revisa antes de confirmar y guardar el informe.
 */

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
} from '@/lib/informes-auto/comparativas'
import { fetchCanalesDigitales } from '@/lib/informes-auto/canales-digitales'
import { fetchIngresosAtractivos } from '@/lib/informes-auto/ingresos-atractivos'
import { fetchPerfil } from '@/lib/informes-auto/perfil'
import {
  COMPARATIVA_NINGUNA,
  type GenerarInformePayload,
  type InformeFindeCompleto,
  type InputsImpactoEconomico,
  type OHPorTipo,
  type PicosOcupacion,
  type PeriodoComparativo,
  type TipoInforme,
} from '@/lib/informes-auto/types'

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

export interface ResultadoCalculo {
  informe: InformeFindeCompleto
  meta: {
    estadia: { n: number }
    duracionPeriodo: number
    plazasDisponibles: number
  }
}

/** El GAS de perfil no respondió: sin estadía no se puede estimar visitantes ni impacto. */
export class PerfilNoDisponibleError extends Error {
  constructor() {
    super('No se pudo leer la encuesta de perfil del visitante; reintentá en unos segundos.')
    this.name = 'PerfilNoDisponibleError'
  }
}

export interface DatosOcupacion {
  ohPorTipo: OHPorTipo[]
  picos: PicosOcupacion
  plazasDisponibles: number
}

/** OH por tipo, picos y plazas en oferta (registrados + en trámite) de un relevamiento. */
export async function leerOcupacion(relevamientoId: string): Promise<DatosOcupacion> {
  const [alojamientos, cargas] = await Promise.all([
    getAlojamientosActivos(),
    getCargasDeRelevamiento(relevamientoId),
  ])
  const plazasDisponibles = alojamientos
    .filter(a => a.estadoRegistro === 'REGISTRADO' || a.estadoRegistro === 'EN_TRAMITE')
    .reduce((sum, a) => sum + a.capacidadPlazas, 0)
  return {
    ohPorTipo: calcularOHPorTipo(cargas, alojamientos),
    picos: calcularPicosOcupacion(cargas, alojamientos),
    plazasDisponibles,
  }
}

/** Busca el relevamiento, calcula todos los indicadores y arma el informe en estado 'borrador'. */
export async function calcularInforme(
  payload: GenerarInformePayload,
  usuarioEmail: string
): Promise<ResultadoCalculo> {
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

  const relevamiento = relevamientoId
    ? await getRelevamientoPorId(relevamientoId)
    : await getRelevamientoEspecialPorFecha(fechaInicio, fechaFin)
  if (!relevamiento) {
    throw new Error('No se encontró el relevamiento en el sistema de Ocupación Hotelera')
  }

  const year = Number(fechaInicio.slice(0, 4))
  const mesNumero = Number(fechaInicio.slice(5, 7))
  const [ocupacion, perfil, comparativaUltimoFinde, comparativaAnioAnterior, ingresosAtractivos, canalesDigitales] =
    await Promise.all([
      leerOcupacion(relevamiento.id),
      fetchPerfil(fechaInicio, fechaFin),
      resolverComparativa(comparativaManualUltimoFinde, () =>
        buscarPeriodoAnterior(tipoInforme, nombre, year, mesNumero)
      ),
      resolverComparativa(comparativaManualAnioAnterior, () =>
        buscarMismoPeriodoAnioAnterior(tipoInforme, nombre, year, mesNumero)
      ),
      fetchIngresosAtractivos(fechaInicio, fechaFin),
      // Web/IG/FB se cargan por mes: la sección solo existe en informes MENSUAL
      tipoInforme === 'MENSUAL' ? fetchCanalesDigitales(year, mesNumero, fechaFin) : Promise.resolve(undefined),
    ])

  // Sin perfil la estadía sería 0 y los visitantes/impacto saldrían en cero
  if (!perfil) throw new PerfilNoDisponibleError()

  const duracionPeriodo = calcularDiasEntreFechas(fechaInicio, fechaFin)
  const inputsImpacto: InputsImpactoEconomico = {
    plazasDisponibles: ocupacion.plazasDisponibles,
    duracionPeriodo,
    ohPorcentaje: relevamiento.ohTotal,
    estadiaPromedio: perfil.estadiaSinOutliers.estadiaPromedio,
    gastoDiarioTuristas,
    gastoDiarioExcursionistas,
    porcentajeExcursionistas,
  }
  const impacto = calcularImpactoEconomico(inputsImpacto)

  const informe: InformeFindeCompleto = {
    id: generarId(),
    slug: generarSlug(tipoInforme, nombre, fechaInicio),
    nombre,
    tipoInforme,
    fechaInicio,
    fechaFin,
    fechaGeneracion: new Date().toISOString(),
    usuarioGenerador: usuarioEmail || 'sistema',
    estado: 'borrador',
    relevamiento,
    ohPorTipo: ocupacion.ohPorTipo,
    picos: ocupacion.picos,
    perfil,
    impacto,
    gastoDiarioTuristas,
    gastoDiarioExcursionistas,
    porcentajeExcursionistas,
    excursionistasManual: impacto.excursionistas,
    comparativaUltimoFinde,
    comparativaAnioAnterior,
    ingresosAtractivos,
    ...(canalesDigitales && { canalesDigitales }),
  }

  return {
    informe,
    meta: {
      estadia: { n: perfil.estadiaSinOutliers.n },
      duracionPeriodo,
      plazasDisponibles: ocupacion.plazasDisponibles,
    },
  }
}
