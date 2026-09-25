'use client'

import { useState } from 'react'
import type { InformeFindeCompleto } from '@/lib/informes-auto/types'
import EstadoInformeBadge, { normalizarEstado } from './EstadoInformeBadge'
import ModalPublicacion from './ModalPublicacion'

interface Props {
  informe: InformeFindeCompleto
  onPublicado: (informe: InformeFindeCompleto) => void
  onError: (mensaje: string) => void
}

const TEXTO_BOTON = {
  borrador: 'Publicar',
  'cambios-sin-publicar': 'Publicar cambios',
  publicado: 'Volver a publicar',
} as const

function formatearFechaHora(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/** Estado de publicación del informe + botón y modal para publicar (no se imprime). */
export default function PanelPublicacion({ informe, onPublicado, onError }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [publicando, setPublicando] = useState(false)
  const estado = normalizarEstado(informe.estado)

  const publicar = async () => {
    setPublicando(true)
    try {
      const res = await fetch(`/api/informes-auto/${informe.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'publicar' }),
      })
      const json = await res.json().catch(() => ({}))
      if (!json.success) {
        onError(json.error ?? 'No se pudo publicar el informe')
        return
      }
      setAbierto(false)
      onPublicado(json.data)
    } catch {
      onError('Error de conexión al publicar')
    } finally {
      setPublicando(false)
    }
  }

  return (
    <div className="no-print mb-4 p-3 rounded-lg bg-gray-50 border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-2 flex-wrap text-sm text-text-secondary">
        <EstadoInformeBadge estado={estado} />
        {estado === 'borrador' && <span>Todavía no está en el dashboard.</span>}
        {estado !== 'borrador' && informe.publicacion && (
          <span>Publicado el {formatearFechaHora(informe.publicacion.fecha)}.</span>
        )}
        {estado === 'cambios-sin-publicar' && (
          <span className="text-amber-800">El dashboard muestra los valores anteriores.</span>
        )}
      </div>
      <button
        onClick={() => setAbierto(true)}
        className={`${estado === 'publicado' ? 'btn-outline' : 'btn-primary'} text-sm flex items-center gap-1.5 whitespace-nowrap`}
      >
        <i className="fa-solid fa-upload" aria-hidden="true" />
        {TEXTO_BOTON[estado]}
      </button>

      {abierto && (
        <ModalPublicacion
          informeId={informe.id}
          publicando={publicando}
          onConfirmar={publicar}
          onCancelar={() => setAbierto(false)}
        />
      )}
    </div>
  )
}
