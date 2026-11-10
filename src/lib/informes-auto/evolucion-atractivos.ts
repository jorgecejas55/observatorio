/**
 * Lectura de la evolución mensual de ingresos a atractivos para el informe
 * MENSUAL: misma serie que el dashboard (planilla `atractivos_mensual` +
 * registros del sistema, ver lib/indicadores/atractivos-*). Los cálculos
 * viven en evolucion-atractivos-calculo.ts (puros).
 */

import { combinarSerie } from '@/lib/indicadores/atractivos-serie'
import { obtenerFuentesAtractivos } from '@/lib/indicadores/atractivos-en-vivo'
import { leerPlanillaAtractivos } from '@/lib/indicadores/atractivos-planilla'
import { armarEvolucionAtractivos } from './evolucion-atractivos-calculo'
import type { EvolucionAtractivos } from './types'

/**
 * Evolución ene → `mes` de `anio` y del año anterior, SIN aplicar todavía la
 * cifra del informe al mes M (ver `aplicarMesDelInforme`).
 * undefined si la planilla no se pudo leer: la card se ve sin gráfico.
 */
export async function fetchEvolucionAtractivos(anio: number, mes: number): Promise<EvolucionAtractivos | undefined> {
  try {
    const [planilla, fuentes] = await Promise.all([
      leerPlanillaAtractivos(),
      obtenerFuentesAtractivos([anio - 1, anio]),
    ])
    if (planilla.length === 0) return undefined
    // Serie cortada en el mes del informe: nunca entran meses posteriores
    const serie = combinarSerie(planilla, fuentes, { ano: anio, mes })
    return armarEvolucionAtractivos(serie, planilla, fuentes, anio, mes)
  } catch (error) {
    console.error('[evolucion-atractivos] No se pudo leer la planilla de atractivos:', error)
    return undefined
  }
}
