/**
 * Ingresos y actividades especiales de los atractivos (Casa de la Puna, Pueblo
 * Perdido, museos) durante el período de un informe.
 *
 * Casa de la Puna / Pueblo Perdido: vía el módulo propio (gas/atractivos),
 * que ya soporta filtro por fecha en el servidor.
 * Museos: `lib/museos/visitas` trae todas las visitas; acá se filtra por el
 * rango del informe.
 */

import { listarIngresos, listarActividades } from '@/lib/atractivos-service'
import { ATRACTIVOS } from '@/lib/types'
import { ATRACTIVOS_CON_INGRESOS, type AtractivoConIngresos } from '@/lib/atractivos-config'
import { MUSEOS, fetchVisitasMuseo } from '@/lib/museos/visitas'
import { conReintento } from '@/lib/reintento'
import type {
  IngresoPorAtractivo,
  ActividadEspecialResumen,
  ResumenIngresosAtractivos,
} from './types'

async function fetchMuseo(
  museo: (typeof MUSEOS)[number],
  fechaInicio: string,
  fechaFin: string,
): Promise<IngresoPorAtractivo> {
  const nombre = ATRACTIVOS[museo.id] ?? museo.id
  const { visitas, incompleto } = await fetchVisitasMuseo(museo)
  const enPeriodo = visitas.filter(v => !!v.fecha && v.fecha >= fechaInicio && v.fecha <= fechaFin)

  return {
    atractivo: museo.id,
    nombre,
    personas: enPeriodo.reduce((sum, v) => sum + v.personas, 0),
    registros: enPeriodo.length,
    incompleto,
  }
}

async function fetchAtractivoConGas(
  atractivo: AtractivoConIngresos,
  fechaInicio: string,
  fechaFin: string,
): Promise<{ ingreso: IngresoPorAtractivo; actividades: ActividadEspecialResumen[] }> {
  const nombre = ATRACTIVOS[atractivo]
  const filtros = { desde: fechaInicio, hasta: fechaFin }

  // Cada consulta es independiente: si falla una, la otra se conserva.
  const [resIngresos, resActividades] = await Promise.allSettled([
    conReintento(() => listarIngresos(atractivo, filtros)),
    conReintento(() => listarActividades(atractivo, filtros)),
  ])
  if (resIngresos.status === 'rejected') {
    console.error(`[ingresos-atractivos] Ingresos de ${atractivo} fallaron:`, resIngresos.reason)
  }
  if (resActividades.status === 'rejected') {
    console.error(`[ingresos-atractivos] Actividades de ${atractivo} fallaron:`, resActividades.reason)
  }

  const ingresos = resIngresos.status === 'fulfilled' ? resIngresos.value : []
  const actividades = resActividades.status === 'fulfilled' ? resActividades.value : []
  const personasIngresos = ingresos.reduce((sum, i) => sum + i.cantidad_personas, 0)
  const personasActividades = actividades.reduce((sum, a) => sum + a.cantidad_total, 0)

  return {
    ingreso: {
      atractivo,
      nombre,
      personas: personasIngresos + personasActividades,
      registros: ingresos.length + actividades.length,
      incompleto: resIngresos.status === 'rejected' || resActividades.status === 'rejected',
    },
    actividades: actividades.map(a => ({
      atractivo,
      fecha: a.fecha_actividad,
      nombre: a.nombre_actividad,
      cantidadTotal: a.cantidad_total,
      cantidadTuristas: a.cantidad_turistas,
      cantidadResidentes: a.cantidad_residentes,
    })),
  }
}

/** Ingresos y actividades especiales de todos los atractivos para el período del informe. */
export async function fetchIngresosAtractivos(
  fechaInicio: string,
  fechaFin: string,
): Promise<ResumenIngresosAtractivos> {
  const resultadosConGas = await Promise.all(
    ATRACTIVOS_CON_INGRESOS.map(a => fetchAtractivoConGas(a, fechaInicio, fechaFin))
  )
  const museos = await Promise.all(MUSEOS.map(m => fetchMuseo(m, fechaInicio, fechaFin)))

  const porAtractivo = [...resultadosConGas.map(r => r.ingreso), ...museos]
  const actividadesEspeciales = resultadosConGas
    .flatMap(r => r.actividades)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))

  const totalPersonas = porAtractivo.reduce((sum, a) => sum + a.personas, 0)

  return { porAtractivo, totalPersonas, actividadesEspeciales }
}
