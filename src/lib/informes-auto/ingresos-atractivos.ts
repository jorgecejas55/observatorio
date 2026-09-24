/**
 * Ingresos y actividades especiales de los atractivos (Casa de la Puna, Pueblo
 * Perdido, museos) durante el período de un informe.
 *
 * Casa de la Puna / Pueblo Perdido: vía el módulo propio (gas/atractivos),
 * que ya soporta filtro por fecha en el servidor.
 * Museos: cada uno tiene su propio GAS sin filtro de fecha — se trae todo y
 * se filtra acá por fecha_visita/Fecha dentro del rango del informe.
 */

import { listarIngresos, listarActividades } from '@/lib/atractivos-service'
import { ATRACTIVOS } from '@/lib/types'
import { ATRACTIVOS_CON_INGRESOS, type AtractivoConIngresos } from '@/lib/atractivos-config'
import type {
  IngresoPorAtractivo,
  ActividadEspecialResumen,
  ResumenIngresosAtractivos,
} from './types'

interface MuseoConfig {
  id: string
  envVar: string
}

const MUSEOS: MuseoConfig[] = [
  { id: 'museo-virgen-valle', envVar: 'MUSEO_VIRGEN_VALLE_SCRIPT_URL' },
  { id: 'museo-adan-quiroga', envVar: 'MUSEO_ADAN_QUIROGA_SCRIPT_URL' },
  { id: 'museo-casa-caravati', envVar: 'MUSEO_CASA_CARAVATI_SCRIPT_URL' },
]

/**
 * El GAS de atractivos tiene respuestas lentas y errores transitorios (HTML 404,
 * cold start de ~15 s). Un reintento evita informes con 0 falsos.
 */
async function conReintento<T>(operacion: () => Promise<T>): Promise<T> {
  try {
    return await operacion()
  } catch {
    return await operacion()
  }
}

function enRango(fecha: unknown, desde: string, hasta: string): boolean {
  const f = String(fecha ?? '').slice(0, 10)
  return !!f && f >= desde && f <= hasta
}

async function fetchMuseo(
  museo: MuseoConfig,
  fechaInicio: string,
  fechaFin: string,
): Promise<IngresoPorAtractivo> {
  const nombre = ATRACTIVOS[museo.id as keyof typeof ATRACTIVOS] ?? museo.id
  const url = process.env[museo.envVar]
  if (!url) return { atractivo: museo.id, nombre, personas: 0, registros: 0, incompleto: true }

  try {
    const [instRes, ocasRes] = await Promise.all([
      fetch(`${url}?action=getInstitucionales`, { cache: 'no-store' }).then(r => r.json()).catch(() => null),
      fetch(`${url}?action=getOcasionales`, { cache: 'no-store' }).then(r => r.json()).catch(() => null),
    ])

    let personas = 0
    let registros = 0
    const incompleto = !instRes?.success || !ocasRes?.success

    if (instRes?.success && Array.isArray(instRes.data)) {
      for (const v of instRes.data as Record<string, unknown>[]) {
        if (enRango(v.fecha_visita, fechaInicio, fechaFin)) {
          personas += Number(v.cantidad_asistentes) || 0
          registros++
        }
      }
    }
    if (ocasRes?.success && Array.isArray(ocasRes.data)) {
      for (const v of ocasRes.data as Record<string, unknown>[]) {
        const fecha = v.Fecha ?? v.fecha_visita
        if (enRango(fecha, fechaInicio, fechaFin)) {
          personas += Number(v['Total de personas']) || 0
          registros++
        }
      }
    }

    return { atractivo: museo.id, nombre, personas, registros, incompleto }
  } catch (error) {
    console.error(`[ingresos-atractivos] Error en ${museo.id}:`, error)
    return { atractivo: museo.id, nombre, personas: 0, registros: 0, incompleto: true }
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
