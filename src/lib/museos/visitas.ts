/**
 * Lectura de visitas de los 3 museos municipales (institucionales + ocasionales).
 * Cada museo tiene su propio GAS sin filtro de fecha: se trae todo y quien
 * consume filtra o agrupa. Compartido por informes-auto y el dashboard.
 */

export type MuseoId = 'museo-virgen-valle' | 'museo-adan-quiroga' | 'museo-casa-caravati'

interface MuseoConfig {
  id: MuseoId
  envVar: string
}

export const MUSEOS: MuseoConfig[] = [
  { id: 'museo-virgen-valle', envVar: 'MUSEO_VIRGEN_VALLE_SCRIPT_URL' },
  { id: 'museo-adan-quiroga', envVar: 'MUSEO_ADAN_QUIROGA_SCRIPT_URL' },
  { id: 'museo-casa-caravati', envVar: 'MUSEO_CASA_CARAVATI_SCRIPT_URL' },
]

export interface VisitaMuseo {
  fecha: string       // YYYY-MM-DD (o vacío si el registro no tiene fecha)
  personas: number
}

export interface VisitasMuseo {
  visitas: VisitaMuseo[]
  /** true si alguna de las dos hojas no respondió: los totales pueden quedar cortos */
  incompleto: boolean
}

async function getJson(url: string, action: string): Promise<{ success?: boolean; data?: unknown } | null> {
  try {
    const res = await fetch(`${url}?action=${action}`, { cache: 'no-store' })
    return await res.json()
  } catch (error) {
    console.error(`[museos] ${action} falló:`, error)
    return null
  }
}

function filas(respuesta: { success?: boolean; data?: unknown } | null): Record<string, unknown>[] {
  return respuesta?.success && Array.isArray(respuesta.data) ? respuesta.data as Record<string, unknown>[] : []
}

export async function fetchVisitasMuseo(museo: MuseoConfig): Promise<VisitasMuseo> {
  const url = process.env[museo.envVar]
  if (!url) return { visitas: [], incompleto: true }

  const [institucionales, ocasionales] = await Promise.all([
    getJson(url, 'getInstitucionales'),
    getJson(url, 'getOcasionales'),
  ])

  const visitas: VisitaMuseo[] = [
    ...filas(institucionales).map(v => ({
      fecha: String(v.fecha_visita ?? '').slice(0, 10),
      personas: Number(v.cantidad_asistentes) || 0,
    })),
    ...filas(ocasionales).map(v => ({
      fecha: String(v.Fecha ?? v.fecha_visita ?? '').slice(0, 10),
      personas: Number(v['Total de personas']) || 0,
    })),
  ]

  return { visitas, incompleto: !institucionales?.success || !ocasionales?.success }
}
