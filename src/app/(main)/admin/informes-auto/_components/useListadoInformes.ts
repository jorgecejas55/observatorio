'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ResumenInforme } from '@/lib/informes-auto/listado'
import type { RelevamientoOH } from '@/lib/informes-auto/types'

interface ListadoInformes {
  informes: ResumenInforme[]
  relevamientos: RelevamientoOH[]
  cargando: boolean
  error: string
}

async function leerJson<T>(url: string): Promise<{ status: number; data: T | null }> {
  const res = await fetch(url)
  if (!res.ok) return { status: res.status, data: null }
  const json = await res.json()
  return { status: res.status, data: (json.data ?? null) as T | null }
}

/**
 * Informes guardados (bloqueante) y relevamientos OH (secundario, solo para
 * "Listos para generar": si falla, el listado se muestra igual).
 */
export function useListadoInformes(habilitado: boolean): ListadoInformes {
  const router = useRouter()
  const [informes, setInformes] = useState<ResumenInforme[]>([])
  const [relevamientos, setRelevamientos] = useState<RelevamientoOH[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!habilitado) return
    leerJson<ResumenInforme[]>('/api/informes-auto')
      .then(({ status, data }) => {
        if (status === 401 || status === 403) return router.replace('/sin-acceso')
        if (!data) throw new Error(`Error ${status}`)
        setInformes(data)
      })
      .catch(err => {
        console.error('[informes-auto] listado:', err)
        setError('No se pudo cargar la lista de informes. Reintentá en unos segundos.')
      })
      .finally(() => setCargando(false))

    leerJson<RelevamientoOH[]>('/api/informes-auto/relevamientos')
      .then(({ data }) => setRelevamientos(data ?? []))
      .catch(err => console.error('[informes-auto] relevamientos:', err))
  }, [habilitado, router])

  return { informes, relevamientos, cargando, error }
}
