'use client'

import { useEffect, useRef, useState } from 'react'
import { useOffline } from '@/contexts/OfflineContext'

function plural(n: number, singular: string, plural: string) {
  return n === 1 ? singular : plural
}

export default function OfflineBanner() {
  const { pendientes, enLinea, sincronizando, sincronizar } = useOffline()
  const [mostrarExito, setMostrarExito] = useState(false)
  const pendientesAntes = useRef(0)

  useEffect(() => {
    const antes = pendientesAntes.current
    pendientesAntes.current = pendientes.length
    if (antes > 0 && pendientes.length === 0 && enLinea) {
      setMostrarExito(true)
      const t = setTimeout(() => setMostrarExito(false), 4000)
      return () => clearTimeout(t)
    }
  }, [pendientes.length, enLinea])

  if (mostrarExito) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 flex items-center gap-2 text-sm font-medium text-green-700">
        <i className="fa-solid fa-circle-check" />
        Registros pendientes sincronizados correctamente.
      </div>
    )
  }

  if (enLinea && pendientes.length === 0) return null

  return (
    <div
      className={`rounded-xl border px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-sm font-medium ${
        enLinea ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-amber-50 border-amber-200 text-amber-800'
      }`}
    >
      <div className="flex items-center gap-2">
        <i className={`fa-solid ${enLinea ? 'fa-cloud-arrow-up' : 'fa-wifi-slash'}`} />
        {enLinea
          ? `Sincronizando ${pendientes.length} ${plural(pendientes.length, 'registro', 'registros')} pendiente${plural(pendientes.length, '', 's')}…`
          : `Sin conexión — ${pendientes.length} ${plural(pendientes.length, 'registro guardado', 'registros guardados')} en el dispositivo, se sincronizará${plural(pendientes.length, '', 'n')} solo${plural(pendientes.length, '', 's')} al volver la señal.`}
      </div>
      {enLinea && pendientes.length > 0 && (
        <button
          type="button"
          onClick={sincronizar}
          disabled={sincronizando}
          className="underline disabled:opacity-50 touch-manipulation"
        >
          {sincronizando ? 'Sincronizando…' : 'Sincronizar ahora'}
        </button>
      )}
    </div>
  )
}
