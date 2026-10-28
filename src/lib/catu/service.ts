import { unstable_cache } from 'next/cache'
import type { CatuDashboard } from './types'

const TIMEOUT_MS = 25000 // el GAS en frío puede tardar
const REVALIDAR_SEG = 1800 // 30 min (el GAS sincroniza cada hora)

async function catuGet(params: Record<string, string>): Promise<any> {
  const url = process.env.CATU_GAS_URL
  const token = process.env.CATU_GAS_TOKEN
  if (!url) throw new Error('CATU_GAS_URL no configurado')
  if (!token) throw new Error('CATU_GAS_TOKEN no configurado')

  const urlObj = new URL(url)
  urlObj.searchParams.set('apiKey', token)
  Object.entries(params).forEach(([k, v]) => urlObj.searchParams.set(k, v))

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(urlObj.toString(), { cache: 'no-store', signal: controller.signal })
    const text = await res.text()
    if (text.trimStart().startsWith('<')) throw new Error('El GAS devolvió HTML. Verificar URL y despliegue.')
    if (!res.ok) throw new Error(`GAS ${res.status}: ${text.slice(0, 200)}`)
    return JSON.parse(text)
  } finally {
    clearTimeout(timeout)
  }
}

async function obtenerDashboard(): Promise<CatuDashboard> {
  const data = await catuGet({ action: 'dashboard' })
  // Si falla, se lanza: unstable_cache no guarda errores
  if (!data.success) throw new Error(data.error || 'Error al obtener datos de Catu')
  if (data.version !== 2) throw new Error('Versión del GAS de Catu desactualizada: redesplegar gas/catu')
  return {
    serie_diaria: data.serie_diaria ?? [],
    topicos_diarios: data.topicos_diarios ?? { dias: [], nombres: [], filas: [] },
    ultima_sync: data.ultima_sync ?? null,
    ultima_sync_estado: data.ultima_sync_estado ?? null,
  }
}

/** Dashboard de Catu cacheado 30 min (solo respuestas exitosas). */
export const fetchCatuDashboard = unstable_cache(obtenerDashboard, ['catu-dashboard-v2'], {
  revalidate: REVALIDAR_SEG,
  tags: ['catu'],
})
