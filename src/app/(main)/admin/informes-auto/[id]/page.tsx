'use client'

import { useSession } from 'next-auth/react'
import { redirect, useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { tieneAcceso } from '@/lib/permisos'
import type { InformeFindeCompleto } from '@/lib/informes-auto/types'
import { normalizarInforme } from '@/lib/informes-auto/normalizar'
import PanelPublicacion from '@/components/informes-auto/PanelPublicacion'
import InformeAutoVista from '@/components/informes-auto/vista/InformeAutoVista'
import { nombreArchivoInforme } from '@/components/informes-auto/vista/etiquetas'
import { useNombreArchivoImpresion } from '@/hooks/useNombreArchivoImpresion'

export default function InformeAutoDetallePage() {
  const { data: session, status } = useSession()
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [informe, setInforme] = useState<InformeFindeCompleto | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{ mensaje: string; tipo: 'success' | 'error' } | null>(null)
  const [recalculando, setRecalculando] = useState(false)
  const [modalRenombrar, setModalRenombrar] = useState(false)
  const [nombreNuevo, setNombreNuevo] = useState('')
  const [guardandoNombre, setGuardandoNombre] = useState(false)

  useNombreArchivoImpresion(informe ? nombreArchivoInforme(informe) : null)

  useEffect(() => {
    // sessionStorage es solo un placeholder instantáneo: siempre se pide al GAS,
    // porque el informe pudo publicarse o recalcularse desde otra pestaña.
    const cached = sessionStorage.getItem(`informe_${id}`)
    if (cached) {
      try {
        setInforme(normalizarInforme(JSON.parse(cached)))
        setCargando(false)
      } catch {
        sessionStorage.removeItem(`informe_${id}`)
      }
    }

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
          onClick={() => router.push('/admin/informes-auto')}
          className="btn-primary mt-6"
        >
          ← Volver al listado
        </button>
      </div>
    )
  }

  // ── Acciones ──
  const exportarPDF = () => window.print()

  const abrirRenombrar = () => {
    setNombreNuevo(informe?.nombre ?? '')
    setModalRenombrar(true)
  }

  const renombrarInforme = async () => {
    if (!nombreNuevo.trim() || !informe) return
    setGuardandoNombre(true)
    try {
      const res = await fetch(`/api/informes-auto/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'renombrar', nombreNuevo: nombreNuevo.trim() }),
      })
      const json = await res.json().catch(() => ({}))
      if (json.success && json.data) {
        setInforme(json.data)
        sessionStorage.setItem(`informe_${id}`, JSON.stringify(json.data))
        setModalRenombrar(false)
        setToast({ mensaje: 'Nombre actualizado', tipo: 'success' })
      } else {
        setToast({ mensaje: json.error ?? 'No se pudo renombrar', tipo: 'error' })
        setModalRenombrar(false)
      }
    } catch {
      setToast({ mensaje: 'Error de conexión al renombrar', tipo: 'error' })
      setModalRenombrar(false)
    } finally {
      setGuardandoNombre(false)
    }
  }

  const recalcularDatos = async () => {
    setRecalculando(true)
    try {
      const res = await fetch(`/api/informes-auto/${id}/recalcular`, { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (json.success && json.data) {
        setInforme(json.data)
        sessionStorage.setItem(`informe_${id}`, JSON.stringify(json.data))
        const avisos: string[] = json.avisos ?? []
        const resumen = json.data.estado === 'cambios-sin-publicar'
          ? 'Datos recalculados. Hay cambios sin publicar: la versión pública muestra la anterior'
          : 'Datos recalculados desde las fuentes'
        setToast({
          mensaje: [resumen, ...avisos].join(' · '),
          tipo: avisos.length > 0 ? 'error' : 'success',
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
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <button
          onClick={() => router.push('/admin/informes-auto')}
          className="btn-outline text-sm flex items-center justify-center gap-1.5 whitespace-nowrap"
        >
          <i className="fa-solid fa-arrow-left" />
          Volver al listado
        </button>

        {/* En móvil los botones ocupan el ancho y bajan de línea si no entran */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={abrirRenombrar}
            title="Cambia el nombre del informe. El enlace público y el id se conservan."
            className="btn-outline text-sm flex flex-1 sm:flex-none items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <i className="fa-solid fa-pen" />
            Cambiar nombre
          </button>
          <button
            onClick={recalcularDatos}
            disabled={recalculando}
            title="Recalcula OH por tipo, picos, perfil, impacto e ingresos a atractivos desde las fuentes. No cambia el dashboard hasta que se vuelva a publicar."
            className="btn-outline text-sm flex flex-1 sm:flex-none items-center justify-center gap-1.5 whitespace-nowrap disabled:opacity-50"
          >
            <i className={`fa-solid ${recalculando ? 'fa-spinner fa-spin' : 'fa-rotate'}`} />
            {recalculando ? 'Recalculando...' : 'Recalcular datos'}
          </button>
          <button
            onClick={exportarPDF}
            className="btn-outline text-sm flex flex-1 sm:flex-none items-center justify-center gap-1.5 whitespace-nowrap"
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

      {/* ── MODAL CAMBIAR NOMBRE ── */}
      {modalRenombrar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-base font-semibold text-text-primary mb-1">Cambiar nombre del informe</h3>
            <p className="text-xs text-text-secondary mb-4">
              El id y el enlace público se conservan sin cambios.
            </p>
            <input
              type="text"
              value={nombreNuevo}
              onChange={e => setNombreNuevo(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') renombrarInforme() }}
              className="input w-full mb-5"
              placeholder="Nombre del informe"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setModalRenombrar(false)}
                disabled={guardandoNombre}
                className="btn-outline text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={renombrarInforme}
                disabled={guardandoNombre || !nombreNuevo.trim() || nombreNuevo.trim() === informe.nombre}
                className="btn-primary text-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                <i className={`fa-solid ${guardandoNombre ? 'fa-spinner fa-spin' : 'fa-check'}`} />
                {guardandoNombre ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
