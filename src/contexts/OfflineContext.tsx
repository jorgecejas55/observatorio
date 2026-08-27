'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { encolar, listarPendientes, type RegistroPendiente } from '@/lib/offline/queue'
import { sincronizarPendientes } from '@/lib/offline/sincronizar'

const INTERVALO_SYNC_MS = 30_000

interface GuardarOpts {
  tipo: RegistroPendiente['tipo']
  atractivo: string
  url: string
  payload: Record<string, unknown>
  idLocal: string
}

interface OfflineContextValue {
  pendientes: RegistroPendiente[]
  enLinea: boolean
  sincronizando: boolean
  sincronizar: () => Promise<void>
  /** Único punto de guardado para altas offline-aware: POST directo si hay red, encola si falla por red. */
  guardar: (opts: GuardarOpts) => Promise<{ modo: 'online' | 'offline' }>
}

const OfflineContext = createContext<OfflineContextValue | null>(null)

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [pendientes, setPendientes] = useState<RegistroPendiente[]>([])
  const [enLinea, setEnLinea] = useState(true)
  const [sincronizando, setSincronizando] = useState(false)

  const refrescarPendientes = useCallback(async () => {
    setPendientes(await listarPendientes())
  }, [])

  const sincronizandoRef = useRef(false)

  const sincronizar = useCallback(async () => {
    if (sincronizandoRef.current) return
    sincronizandoRef.current = true
    setSincronizando(true)
    try {
      await sincronizarPendientes()
    } finally {
      sincronizandoRef.current = false
      setSincronizando(false)
      await refrescarPendientes()
    }
  }, [refrescarPendientes])

  useEffect(() => {
    setEnLinea(navigator.onLine)
    refrescarPendientes()

    const handleOnline = () => {
      setEnLinea(true)
      sincronizar()
    }
    const handleOffline = () => setEnLinea(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    const intervalo = setInterval(() => {
      if (navigator.onLine) sincronizar()
    }, INTERVALO_SYNC_MS)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(intervalo)
    }
  }, [refrescarPendientes, sincronizar])

  const guardar = useCallback(
    async ({ tipo, atractivo, url, payload, idLocal }: GuardarOpts): Promise<{ modo: 'online' | 'offline' }> => {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const result = await res.json()
        if (!res.ok || !result.success) {
          throw new Error(result.error || 'Error al guardar')
        }
        return { modo: 'online' }
      } catch (err) {
        // Solo encolamos si fetch falló por falta de red (TypeError: "Failed to
        // fetch"), no si el servidor respondió con un error de validación/negocio.
        if (err instanceof TypeError) {
          await encolar({ id: idLocal, tipo, atractivo, url, payload })
          await refrescarPendientes()
          return { modo: 'offline' }
        }
        throw err
      }
    },
    [refrescarPendientes],
  )

  return (
    <OfflineContext.Provider value={{ pendientes, enLinea, sincronizando, sincronizar, guardar }}>
      {children}
    </OfflineContext.Provider>
  )
}

export function useOffline() {
  const ctx = useContext(OfflineContext)
  if (!ctx) throw new Error('useOffline debe usarse dentro de OfflineProvider')
  return ctx
}
