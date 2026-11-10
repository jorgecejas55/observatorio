/**
 * Reglas puras para combinar un recálculo con el informe guardado: un dato
 * leído a medias (GAS caído) nunca pisa a uno completo.
 */

import { faltantesDe } from './canales-digitales-calculo'
import { aplicarMesDelInforme } from './evolucion-atractivos-calculo'
import { conMesDelInforme } from './evolucion-ocupacion'
import type {
  CanalesDigitalesInforme,
  EvolucionAtractivos,
  EvolucionOcupacion,
  ResumenIngresosAtractivos,
} from './types'

export interface Combinado<T> {
  valor: T
  /** Nombres de lo que se conservó del informe previo (para avisar al usuario). */
  conservados: string[]
}

/**
 * Evolución mensual por atractivo: si la nueva no se pudo leer se conserva la
 * previa; si un atractivo vino incompleto y el previo no, se conserva el previo.
 */
function combinarEvolucionAtractivos(
  nueva: EvolucionAtractivos | undefined,
  previa: EvolucionAtractivos | undefined,
): EvolucionAtractivos | undefined {
  if (!nueva || !previa) return nueva ?? previa
  return {
    ...nueva,
    porAtractivo: nueva.porAtractivo.map(evolucion => {
      const anterior = previa.porAtractivo.find(p => p.atractivo === evolucion.atractivo)
      return evolucion.incompleto && anterior && !anterior.incompleto ? anterior : evolucion
    }),
  }
}

/**
 * Por atractivo: si el recálculo vino incompleto y el previo no, se conserva
 * el previo (ingresos, actividades especiales y evolución de ese atractivo).
 * El mes del informe de la evolución se vuelve a alinear con la cifra final.
 */
export function combinarIngresosAtractivos(
  nuevo: ResumenIngresosAtractivos,
  previo: ResumenIngresosAtractivos | undefined,
): Combinado<ResumenIngresosAtractivos> {
  if (!previo) {
    const valor = nuevo.evolucion
      ? { ...nuevo, evolucion: aplicarMesDelInforme(nuevo.evolucion, nuevo.porAtractivo) }
      : nuevo
    return { valor, conservados: [] }
  }

  const conservados: string[] = []
  const porAtractivo = nuevo.porAtractivo.map(ingreso => {
    const anterior = previo.porAtractivo.find(p => p.atractivo === ingreso.atractivo)
    if (!ingreso.incompleto || !anterior || anterior.incompleto) return ingreso
    conservados.push(ingreso.atractivo)
    return anterior
  })

  const actividadesEspeciales = [
    ...nuevo.actividadesEspeciales.filter(a => !conservados.includes(a.atractivo)),
    ...previo.actividadesEspeciales.filter(a => conservados.includes(a.atractivo)),
  ].sort((a, b) => a.fecha.localeCompare(b.fecha))

  const evolucion = combinarEvolucionAtractivos(nuevo.evolucion, previo.evolucion)

  return {
    valor: {
      porAtractivo,
      totalPersonas: porAtractivo.reduce((sum, a) => sum + a.personas, 0),
      actividadesEspeciales,
      ...(evolucion && { evolucion: aplicarMesDelInforme(evolucion, porAtractivo) }),
    },
    conservados: porAtractivo.filter(a => conservados.includes(a.atractivo)).map(a => a.nombre),
  }
}

const CANALES = ['web', 'instagram', 'facebook', 'catu'] as const
const NOMBRES_CANAL: Record<(typeof CANALES)[number], string> = {
  web: 'Sitio web', instagram: 'Instagram', facebook: 'Facebook', catu: 'Catu',
}

/** Por canal: si el recálculo vino incompleto y el previo no, se conserva el previo. */
export function combinarCanalesDigitales(
  nuevo: CanalesDigitalesInforme,
  previo: CanalesDigitalesInforme | undefined,
): Combinado<CanalesDigitalesInforme> {
  if (!previo) return { valor: nuevo, conservados: [] }

  const combinado = { ...nuevo }
  const conservados: string[] = []
  for (const canal of CANALES) {
    const anterior = previo[canal]
    if (nuevo[canal]?.incompleto && anterior && !anterior.incompleto) {
      Object.assign(combinado, { [canal]: anterior })
      conservados.push(NOMBRES_CANAL[canal])
    }
  }
  return { valor: { ...combinado, faltantes: faltantesDe(combinado) }, conservados }
}

/**
 * Evolución de OH y estadía: si la planilla maestra no respondió se conserva
 * la previa, con el mes del informe actualizado a los valores recalculados.
 */
export function combinarEvolucionOcupacion(
  nueva: EvolucionOcupacion | undefined,
  previa: EvolucionOcupacion | undefined,
  delInforme: { oh: number; estadia: number },
): Combinado<EvolucionOcupacion | undefined> {
  if (nueva || !previa) return { valor: nueva, conservados: [] }
  return {
    valor: {
      ...previa,
      oh: { ...previa.oh, serie: conMesDelInforme(previa.oh.serie, delInforme.oh) },
      estadia: { ...previa.estadia, serie: conMesDelInforme(previa.estadia.serie, delInforme.estadia) },
    },
    conservados: ['Evolución de ocupación y estadía (planilla maestra)'],
  }
}
