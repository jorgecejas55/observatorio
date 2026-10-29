/**
 * Reglas puras para combinar un recálculo con el informe guardado: un dato
 * leído a medias (GAS caído) nunca pisa a uno completo.
 */

import { faltantesDe } from './canales-digitales-calculo'
import type { CanalesDigitalesInforme, ResumenIngresosAtractivos } from './types'

export interface Combinado<T> {
  valor: T
  /** Nombres de lo que se conservó del informe previo (para avisar al usuario). */
  conservados: string[]
}

/**
 * Por atractivo: si el recálculo vino incompleto y el previo no, se conserva
 * el previo (ingresos y actividades especiales de ese atractivo).
 */
export function combinarIngresosAtractivos(
  nuevo: ResumenIngresosAtractivos,
  previo: ResumenIngresosAtractivos | undefined,
): Combinado<ResumenIngresosAtractivos> {
  if (!previo) return { valor: nuevo, conservados: [] }

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

  return {
    valor: {
      porAtractivo,
      totalPersonas: porAtractivo.reduce((sum, a) => sum + a.personas, 0),
      actividadesEspeciales,
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
