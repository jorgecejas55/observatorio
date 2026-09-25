import type { InformeFindeCompleto } from './types'

/** Completa campos que no existían en informes guardados con versiones anteriores. */
export function normalizarInforme(datos: InformeFindeCompleto): InformeFindeCompleto {
  return {
    ...datos,
    ingresosAtractivos: datos.ingresosAtractivos ?? { porAtractivo: [], totalPersonas: 0, actividadesEspeciales: [] },
    picos: datos.picos ?? { picoMaximo: null, porTipo: [] },
  }
}
