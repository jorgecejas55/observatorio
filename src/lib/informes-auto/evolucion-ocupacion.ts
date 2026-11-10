/**
 * Evolución mensual de ocupación hotelera y estadía promedio para el informe
 * MENSUAL (puro, sin fetch). Fuente: hoja `indicadores_mensual` de la planilla
 * maestra, ya leída por `getRegistrosMaestros()`.
 *
 * - Año calendario: ene → M del año A y el mismo tramo del año A-1.
 * - Sin dato → null (hueco). OH o estadía 0 en la maestra = celda sin cargar.
 * - El mes M del año A sale del propio informe: la maestra se actualiza recién
 *   al publicar, así que puede no tenerlo (o tener un valor viejo).
 */

import type { EvolucionOcupacion, PuntoMensual, RegistroMaestro } from './types'

type CampoMaestra = 'oh' | 'estadiaProm'

/** Serie ene → `mes` del año dado; null donde la maestra no tiene el mes o el valor es 0. */
export function serieMaestra(
  registros: RegistroMaestro[],
  campo: CampoMaestra,
  anio: number,
  mes: number,
): PuntoMensual[] {
  const delAnio = registros.filter(r => r.tipoPeriodo === 'MENSUAL' && r.anio === anio)
  return Array.from({ length: mes }, (_, i) => {
    const valor = delAnio.find(r => r.mesNumero === i + 1)?.[campo] ?? null
    return { mes: i + 1, valor: valor ? valor : null }
  })
}

/** Reemplaza el valor del último punto (mes del informe); 0 = sin dato. */
export function conMesDelInforme(serie: PuntoMensual[], valor: number): PuntoMensual[] {
  return serie.map((p, i) => (i === serie.length - 1 ? { ...p, valor: valor || null } : p))
}

/**
 * Evolución completa; undefined si la maestra no respondió (sin registros):
 * mejor no mostrar la sección que mostrarla vacía.
 */
export function armarEvolucionOcupacion(
  registros: RegistroMaestro[],
  anio: number,
  mes: number,
  delInforme: { oh: number; estadia: number },
): EvolucionOcupacion | undefined {
  if (registros.length === 0) return undefined
  return {
    periodo: { anio, mes },
    oh: {
      serie: conMesDelInforme(serieMaestra(registros, 'oh', anio, mes), delInforme.oh),
      serieAnioAnterior: serieMaestra(registros, 'oh', anio - 1, mes),
    },
    estadia: {
      serie: conMesDelInforme(serieMaestra(registros, 'estadiaProm', anio, mes), delInforme.estadia),
      serieAnioAnterior: serieMaestra(registros, 'estadiaProm', anio - 1, mes),
    },
  }
}
