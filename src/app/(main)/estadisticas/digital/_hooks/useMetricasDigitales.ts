'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { obtenerMetricasCanal, type CanalDigital, type MetricaSocial, type MetricaWeb } from '@/services/metricasService'

// Más que esto es un GAS trabado: mejor ofrecer "Reintentar" que un spinner eterno
const LIMITE_ESPERA_MS = 30000

const CANALES: CanalDigital[] = ['web', 'facebook', 'instagram']

export type EstadoCanal<T> =
  | { estado: 'cargando' }
  | { estado: 'ok'; datos: T[] }
  | { estado: 'error'; mensaje: string }

export interface EstadosMetricas {
  web: EstadoCanal<MetricaWeb>
  facebook: EstadoCanal<MetricaSocial>
  instagram: EstadoCanal<MetricaSocial>
}

const ESTADO_INICIAL: EstadosMetricas = {
  web: { estado: 'cargando' },
  facebook: { estado: 'cargando' },
  instagram: { estado: 'cargando' },
}

function esDemora(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'TimeoutError'
}

/**
 * Un reintento silencioso si se venció el tiempo: el servidor sigue leyendo el GAS
 * aunque el navegador corte, y deja el resultado en caché, así que el segundo
 * pedido suele resolverse al instante.
 */
async function conReintentoPorDemora<T>(pedir: () => Promise<T>): Promise<T> {
  try {
    return await pedir()
  } catch (error) {
    if (!esDemora(error)) throw error
    return await pedir()
  }
}

function mensajeDeError(error: unknown): string {
  if (esDemora(error)) {
    return 'El servidor de datos está tardando demasiado.'
  }
  return 'No se pudieron cargar los datos.'
}

/**
 * Carga por canal: primero el de la pestaña activa (lo que la persona está mirando)
 * y después el resto en segundo plano. Cada canal tiene su propio estado y reintento.
 */
export function useMetricasDigitales(canalActivo: CanalDigital) {
  const [estados, setEstados] = useState<EstadosMetricas>(ESTADO_INICIAL)
  const pedidos = useRef(new Set<CanalDigital>())

  const cargar = useCallback(async (canal: CanalDigital) => {
    pedidos.current.add(canal)
    setEstados(prev => ({ ...prev, [canal]: { estado: 'cargando' } }))
    try {
      const datos = await conReintentoPorDemora(() =>
        obtenerMetricasCanal(canal, AbortSignal.timeout(LIMITE_ESPERA_MS)),
      )
      setEstados(prev => ({ ...prev, [canal]: { estado: 'ok', datos } }))
    } catch (error) {
      console.error(`[canales digitales] Falló la carga de ${canal}:`, error)
      setEstados(prev => ({ ...prev, [canal]: { estado: 'error', mensaje: mensajeDeError(error) } }))
    }
  }, [])

  useEffect(() => {
    if (pedidos.current.has(canalActivo)) return
    cargar(canalActivo).then(() => {
      CANALES.filter(c => !pedidos.current.has(c)).forEach(cargar)
    })
  }, [canalActivo, cargar])

  return { estados, reintentar: cargar }
}
