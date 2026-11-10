/**
 * Recalcula SOLO los datos derivados del período de un informe guardado (OH por
 * tipo, picos, perfil, impacto, ingresos a atractivos y, en MENSUAL, canales
 * digitales y evoluciones mensuales) desde las fuentes en vivo. Los canales digitales releen las mismas
 * ventanas del mes del informe: completan un mes cargado tarde, nunca agregan
 * meses posteriores.
 *
 * Preserva identidad y lo editorial (id, slug, nombre, gastos, comparativas:
 * éstas suelen elegirse a mano al generar y no se guarda esa selección). A las
 * comparativas solo se les completa la estadía si se guardaron sin ella.
 * Si una fuente falla, se conserva el dato previo y se avisa: un recálculo
 * nunca pisa un dato bueno con uno roto.
 */

import { getRelevamientoPorId } from '@/lib/ocupacion-api'
import { calcularImpactoEconomico, calcularDiasEntreFechas } from './calculos'
import { fetchCanalesDigitales } from './canales-digitales'
import { combinarCanalesDigitales, combinarEvolucionOcupacion, combinarIngresosAtractivos } from './combinar'
import { completarEstadiaComparativa, getRegistrosMaestros } from './comparativas'
import { fetchEvolucionAtractivos } from './evolucion-atractivos'
import { armarEvolucionOcupacion } from './evolucion-ocupacion'
import { fetchIngresosAtractivos } from './ingresos-atractivos'
import { fetchPerfil } from './perfil'
import { leerOcupacion } from './pipeline'
import type { InformeFindeCompleto } from './types'

export class RecalculoError extends Error {
  constructor(mensaje: string, readonly status: number) {
    super(mensaje)
    this.name = 'RecalculoError'
  }
}

export interface ResultadoRecalculo {
  informe: InformeFindeCompleto
  avisos: string[]
}

export async function recalcularInforme(existente: InformeFindeCompleto): Promise<ResultadoRecalculo> {
  const relevamientoId = existente.relevamiento?.id
  if (!relevamientoId) throw new RecalculoError('El informe no tiene relevamiento de origen asociado', 400)

  const { fechaInicio, fechaFin } = existente
  const mensual = existente.tipoInforme === 'MENSUAL'
  const anio = Number(fechaInicio.slice(0, 4))
  const mes = Number(fechaInicio.slice(5, 7))
  const [relevamiento, ocupacion, perfilNuevo, ingresosNuevos, canalesNuevos, evolucionAtractivos, registrosMaestros] =
    await Promise.all([
      getRelevamientoPorId(relevamientoId),
      leerOcupacion(relevamientoId),
      fetchPerfil(fechaInicio, fechaFin),
      fetchIngresosAtractivos(fechaInicio, fechaFin),
      mensual ? fetchCanalesDigitales(anio, mes, fechaFin) : Promise.resolve(undefined),
      mensual ? fetchEvolucionAtractivos(anio, mes) : Promise.resolve(undefined),
      getRegistrosMaestros(), // con caché: evolución (MENSUAL) y estadía de las comparativas
    ])
  if (!relevamiento) throw new RecalculoError('El relevamiento de origen ya no existe en el sistema OH', 404)

  const avisos: string[] = []
  if (!perfilNuevo) avisos.push('No se pudo leer la encuesta de perfil: se conservó el perfil y la estadía anteriores.')
  const perfil = perfilNuevo ?? existente.perfil

  // combinarIngresosAtractivos alinea el mes del informe de la evolución con la cifra final
  const ingresos = combinarIngresosAtractivos(
    { ...ingresosNuevos, ...(evolucionAtractivos && { evolucion: evolucionAtractivos }) },
    existente.ingresosAtractivos,
  )
  if (ingresos.conservados.length > 0) {
    avisos.push(`No se pudo leer ${ingresos.conservados.join(', ')}: se conservaron sus datos anteriores.`)
  }

  const canales = canalesNuevos && combinarCanalesDigitales(canalesNuevos, existente.canalesDigitales)
  if (canales && canales.conservados.length > 0) {
    avisos.push(`No se pudo leer ${canales.conservados.join(', ')}: se conservaron sus datos anteriores.`)
  }

  const delInforme = { oh: relevamiento.ohTotal, estadia: perfil.estadiaSinOutliers.estadiaPromedio }
  const evolucionOcupacion = mensual
    ? combinarEvolucionOcupacion(
        armarEvolucionOcupacion(registrosMaestros, anio, mes, delInforme),
        existente.evolucionOcupacion,
        delInforme,
      )
    : undefined
  if (evolucionOcupacion && evolucionOcupacion.conservados.length > 0) {
    avisos.push('No se pudo leer la planilla maestra: se conservó la evolución de ocupación y estadía anterior.')
  }

  const impacto = calcularImpactoEconomico({
    plazasDisponibles: ocupacion.plazasDisponibles,
    duracionPeriodo: calcularDiasEntreFechas(fechaInicio, fechaFin),
    ohPorcentaje: relevamiento.ohTotal,
    estadiaPromedio: perfil.estadiaSinOutliers.estadiaPromedio,
    gastoDiarioTuristas: existente.gastoDiarioTuristas,
    gastoDiarioExcursionistas: existente.gastoDiarioExcursionistas,
    porcentajeExcursionistas: existente.porcentajeExcursionistas ?? 0,
  })

  const informe: InformeFindeCompleto = {
    ...existente,
    relevamiento,
    ohPorTipo: ocupacion.ohPorTipo,
    picos: ocupacion.picos,
    perfil,
    impacto,
    excursionistasManual: impacto.excursionistas,
    ingresosAtractivos: ingresos.valor,
    ...(canales && { canalesDigitales: canales.valor }),
    ...(evolucionOcupacion?.valor && { evolucionOcupacion: evolucionOcupacion.valor }),
    comparativaUltimoFinde: completarEstadiaComparativa(existente.comparativaUltimoFinde, registrosMaestros),
    comparativaAnioAnterior: completarEstadiaComparativa(existente.comparativaAnioAnterior, registrosMaestros),
  }
  return { informe, avisos }
}
