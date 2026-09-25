'use client'

import { useSession } from 'next-auth/react'
import { redirect, useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { tieneAcceso } from '@/lib/permisos'
import type { InformeFindeCompleto } from '@/lib/informes-auto/types'
import { normalizarInforme } from '@/lib/informes-auto/normalizar'
import PanelPublicacion from '@/components/informes-auto/PanelPublicacion'
import InformeAutoVista from '@/components/informes-auto/vista/InformeAutoVista'

export default function InformeAutoDetallePage() {
  const { data: session, status } = useSession()
  const params = useParams()
  const id = params.id as string

  const [informe, setInforme] = useState<InformeFindeCompleto | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{ mensaje: string; tipo: 'success' | 'error' } | null>(null)
  const [recalculando, setRecalculando] = useState(false)

  useEffect(() => {
    // Intentar cargar de sessionStorage (datos de la generación)
    const cached = sessionStorage.getItem(`informe_${id}`)
    if (cached) {
      try {
        setInforme(normalizarInforme(JSON.parse(cached)))
        setCargando(false)
        return
      } catch {}
    }

    // Fallback: cargar de GAS via API
    fetch(`/api/informes-auto/${id}`)
      .then(async res => {
        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          throw new Error(json.error ?? `Error ${res.status}`)
        }
        return res.json()
      })
      .then(json => {
        const respuesta = json.data
        if (!respuesta) throw new Error('Informe no encontrado')
        // Reconstruir InformeFindeCompleto: el GAS devuelve { ...metadata, datos }
        const informeCompleto = normalizarInforme(respuesta.datos ?? respuesta)

        setInforme(informeCompleto)
        // Cachear en sessionStorage para próximas visitas
        sessionStorage.setItem(`informe_${id}`, JSON.stringify(informeCompleto))
        setCargando(false)
      })
      .catch(err => {
        console.error('Error cargando informe:', err)
        setCargando(false)
        setError(err.message ?? 'Informe no encontrado. Podés generarlo desde el Agente de Informes.')
      })
  }, [id])

  if (status === 'loading') {
    return (
      <div className="animate-pulse space-y-4 p-6">
        <div className="h-8 w-64 bg-gray-200 rounded" />
        <div className="h-96 bg-gray-200 rounded-xl" />
      </div>
    )
  }

  if (!session?.user) redirect('/login')
  if (!tieneAcceso(session.user, 'informes-auto')) redirect('/sin-acceso')

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-16">
        <i className="fa-solid fa-spinner fa-spin text-2xl text-primary" />
      </div>
    )
  }

  if (!informe) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <i className="fa-solid fa-file-circle-exclamation text-4xl text-text-secondary mb-4" />
        <h2 className="text-lg font-bold text-text-primary mb-2">Informe no encontrado</h2>
        <p className="text-sm text-text-secondary">{error}</p>
        <button
          onClick={() => redirect('/admin/informes-auto')}
          className="btn-primary mt-6"
        >
          ← Volver al agente
        </button>
      </div>
    )
  }

  // ── Acciones ──
  const exportarPDF = () => window.print()

  const recalcularDatos = async () => {
    setRecalculando(true)
    try {
      const res = await fetch(`/api/informes-auto/${id}/recalcular`, { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (json.success && json.data) {
        setInforme(json.data)
        sessionStorage.setItem(`informe_${id}`, JSON.stringify(json.data))
        setToast({
          mensaje: json.data.estado === 'cambios-sin-publicar'
            ? 'Datos recalculados. Hay cambios sin publicar: el dashboard muestra los valores anteriores'
            : 'Datos recalculados desde el sistema OH',
          tipo: 'success',
        })
      } else {
        setToast({ mensaje: json.error ?? 'No se pudo recalcular', tipo: 'error' })
      }
    } catch {
      setToast({ mensaje: 'Error de conexión al recalcular', tipo: 'error' })
    } finally {
      setRecalculando(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto print:max-w-none">
      {/* ── Barra de acciones (no-print) ── */}
      <div className="no-print flex items-center justify-between mb-4">
        <button
          onClick={() => redirect('/admin/informes-auto')}
          className="btn-outline text-sm flex items-center gap-1.5"
        >
          <i className="fa-solid fa-arrow-left" />
          Volver al agente
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={recalcularDatos}
            disabled={recalculando}
            title="Recalcula OH por tipo, picos, perfil, impacto e ingresos a atractivos desde las fuentes. No cambia el dashboard hasta que se vuelva a publicar."
            className="btn-outline text-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            <i className={`fa-solid ${recalculando ? 'fa-spinner fa-spin' : 'fa-rotate'}`} />
            {recalculando ? 'Recalculando...' : 'Recalcular datos'}
          </button>
          <button
            onClick={exportarPDF}
            className="btn-outline text-sm flex items-center gap-1.5"
          >
            <i className="fa-solid fa-print" />
            Exportar PDF
          </button>
        </div>
      </div>

      <PanelPublicacion
        informe={informe}
        onPublicado={publicado => {
          setInforme(publicado)
          sessionStorage.setItem(`informe_${id}`, JSON.stringify(publicado))
          setToast({ mensaje: 'Informe publicado: ya está en el dashboard y en Informes Técnicos', tipo: 'success' })
        }}
        onError={mensaje => setToast({ mensaje, tipo: 'error' })}
      />

      {/* ── TOAST ── */}
      {toast && (
        <div className={`no-print fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm font-medium shadow-lg ${
          toast.tipo === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {toast.mensaje}
          <button onClick={() => setToast(null)} className="ml-3 opacity-50 hover:opacity-100">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      )}

      <InformeAutoVista informe={informe} />

    </div>
  )
}
