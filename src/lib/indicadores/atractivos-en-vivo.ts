/**
 * Lectura de los totales mensuales de atractivos desde los registros del
 * sistema, para combinarlos con la planilla histórica (ver atractivos-serie).
 *
 * - Casa de la Puna / Pueblo Perdido: endpoint `serie` del GAS de atractivos
 *   (agrega por mes, sin tope de filas) → ingresos + personas de actividades.
 * - Museos: todas las visitas (institucionales + ocasionales) agrupadas por mes.
 *
 * Caché de 1 h solo para respuestas exitosas: si una fuente falla se lanza el
 * error dentro de la función cacheada (unstable_cache no guarda excepciones),
 * así el próximo request reintenta en lugar de servir ceros por una hora.
 */

import { unstable_cache } from 'next/cache'
import { getSerie } from '@/lib/atractivos-service'
import type { AtractivoConIngresos } from '@/lib/atractivos-config'
import { MUSEOS, fetchVisitasMuseo, type MuseoId } from '@/lib/museos/visitas'
import { conReintento } from '@/lib/reintento'
import { claveMes, sumarPorMes, type MesCalendario, type FuentesAtractivos } from './atractivos-serie'

const CACHE_SEGUNDOS = 3600
const ZONA_HORARIA = 'America/Argentina/Catamarca'

/** Mes calendario actual en hora argentina (el server de Vercel corre en UTC). */
export function mesActual(): MesCalendario {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_HORARIA, year: 'numeric', month: '2-digit' })
    .formatToParts(new Date())
  const get = (tipo: string) => Number(partes.find(p => p.type === tipo)?.value)
  return { ano: get('year'), mes: get('month') }
}

const totalesAtractivoPorAnio = unstable_cache(
  async (atractivo: AtractivoConIngresos, anio: number): Promise<Record<string, number>> => {
    const respuesta = await conReintento(async () => {
      const r = await getSerie(atractivo, anio)
      if (!r.success || !r.data) throw new Error(r.error ?? `serie de ${atractivo} ${anio} sin datos`)
      return r.data
    })
    const totales: Record<string, number> = {}
    for (const punto of respuesta.serie) {
      totales[claveMes({ ano: anio, mes: punto.periodo })] = punto.personas + punto.personasActividades
    }
    return totales
  },
  ['dashboard-atractivo-serie'],
  { revalidate: CACHE_SEGUNDOS },
)

const totalesMuseo = unstable_cache(
  async (museoId: MuseoId): Promise<Record<string, number>> => {
    const museo = MUSEOS.find(m => m.id === museoId)
    if (!museo) throw new Error(`Museo desconocido: ${museoId}`)
    const { visitas, incompleto } = await fetchVisitasMuseo(museo)
    if (incompleto) throw new Error(`Visitas de ${museoId} incompletas`)
    return sumarPorMes(visitas)
  },
  ['dashboard-museo-totales'],
  { revalidate: CACHE_SEGUNDOS },
)

async function fuenteAtractivo(atractivo: AtractivoConIngresos, anios: number[]) {
  try {
    const porAnio = await Promise.all(anios.map(a => totalesAtractivoPorAnio(atractivo, a)))
    return Object.assign({}, ...porAnio) as Record<string, number>
  } catch (error) {
    console.error(`[atractivos-en-vivo] ${atractivo} falló:`, error)
    return null
  }
}

async function fuenteMuseo(museoId: MuseoId) {
  try {
    return await totalesMuseo(museoId)
  } catch (error) {
    console.error(`[atractivos-en-vivo] ${museoId} falló:`, error)
    return null
  }
}

/** Totales por mes de cada fuente del sistema para los años pedidos. */
export async function obtenerFuentesAtractivos(anios: number[]): Promise<FuentesAtractivos> {
  const [casa_puna, pueblo_perdido, casa_caravati, museo_virgen, museo_quiroga] = await Promise.all([
    fuenteAtractivo('casa-la-puna', anios),
    fuenteAtractivo('pueblo-perdido', anios),
    fuenteMuseo('museo-casa-caravati'),
    fuenteMuseo('museo-virgen-valle'),
    fuenteMuseo('museo-adan-quiroga'),
  ])
  return { casa_puna, pueblo_perdido, casa_caravati, museo_virgen, museo_quiroga }
}
