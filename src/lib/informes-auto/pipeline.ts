/**
 * Cálculo de datos e indicadores de un informe (OH por tipo, picos, perfil del
 * visitante, impacto económico, comparativas, actividades vigentes).
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
import { fetchIngresosAtractivos } from '@/lib/informes-auto/ingresos-atractivos'
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
    estadia: { n: number; nExcluidas: number }
    duracionPeriodo: number
    plazasDisponibles: number
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
  const [alojamientos, perfil, comparativaUltimoFinde, comparativaAnioAnterior, ingresosAtractivos] =
    await Promise.all([
      getAlojamientosActivos(),
      fetchPerfil(fechaInicio, fechaFin),
      resolverComparativa(comparativaManualUltimoFinde, () =>
        buscarPeriodoAnterior(tipoInforme, nombre, year, mesNumero)
      ),
      resolverComparativa(comparativaManualAnioAnterior, () =>
        buscarMismoPeriodoAnioAnterior(tipoInforme, nombre, year, mesNumero)
      ),
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
  const nEncuestas = perfil?.estadiaSinOutliers?.n ?? 0
  const nExcluidas = perfil?.estadiaSinOutliers?.nExcluidas ?? 0

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

  const informe: InformeFindeCompleto = {
    id,
    slug,
    nombre,
    tipoInforme,
    fechaInicio,
    fechaFin,
    fechaGeneracion: new Date().toISOString(),
    usuarioGenerador: usuarioEmail || 'sistema',
    estado: 'borrador',
    relevamiento,
    ohPorTipo,
    picos,
    perfil: perfil ?? perfilDefault,
    impacto,
    gastoDiarioTuristas,
    gastoDiarioExcursionistas,
    porcentajeExcursionistas,
    excursionistasManual: impacto.excursionistas,
    comparativaUltimoFinde,
    comparativaAnioAnterior,
    ingresosAtractivos,
  }

  return {
    informe,
    meta: {
      estadia: { n: nEncuestas, nExcluidas },
      duracionPeriodo,
      plazasDisponibles,
    },
  }
}
