/**
 * Cliente server-side para leer sugerencias del historial de impacto económico.
 * Solo usa variables de entorno — sin credenciales expuestas al cliente.
 */

import type { SugerenciaHistorial } from '@/lib/informes-auto/types'

export async function getUltimoGastoHistorial(): Promise<SugerenciaHistorial | null> {
  const url = process.env.HISTORIAL_IMPACTO_GAS_URL
  if (!url || url === 'PENDIENTE') {
    console.warn('HISTORIAL_IMPACTO_GAS_URL no configurada')
    return null
  }

  try {
    const res = await fetch(url)
    if (!res.ok) {
      console.error('Error leyendo historial:', res.status)
      return null
    }

    const json = await res.json()

    if (json.error) {
      console.warn('Historial GAS reportó error:', json.error)
      return null
    }

    return {
      evento: String(json.evento ?? ''),
      anio: Number(json.anio ?? 0),
      gastoDiarioTuristas: Number(json.gastoDiarioTuristas ?? 0),
      gastoDiarioExcursionistas: Number(json.gastoDiarioExcursionistas ?? 0),
      excursionistas: Number(json.excursionistas ?? 0),
      turistasAlojados: Number(json.turistasAlojados ?? 0),
    }
  } catch (error) {
    console.error('Error de conexión con historial:', error)
    return null
  }
}
