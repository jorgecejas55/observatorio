'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { puedeEscribir } from '@/lib/permisos'
import Toast from '@/components/shared/Toast'
import FormIngreso from './FormIngreso'
import FormActividadEspecial from './FormActividadEspecial'
import type { AtractivoConIngresos } from '@/lib/atractivos-config'
import type { IngresoAtractivo, ActividadEspecialAtractivo } from '@/lib/types'

type TipoRegistro = 'ingreso' | 'actividad'

interface TablaRegistrosProps {
  atractivo: AtractivoConIngresos
  tipo: TipoRegistro
}

const ITEMS_PER_PAGE = 20

const NOMBRE_REGISTRO: Record<TipoRegistro, string> = {
  ingreso: 'ingreso',
  actividad: 'actividad especial',
}

const formatearFecha = (v: string | undefined) => (v ? String(v).substring(0, 10) : '')
const formatearHora = (v: string | undefined) => (v ? String(v).substring(11, 16) : '')
const emailCorto = (v: string | undefined) => (v ? v.split('@')[0] : '—')

export default function TablaRegistros({ atractivo, tipo }: TablaRegistrosProps) {
  const { data: session } = useSession()
  const escribir = puedeEscribir(session?.user as never)

  const [registros, setRegistros] = useState<(IngresoAtractivo | ActividadEspecialAtractivo)[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mes, setMes] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState<IngresoAtractivo | ActividadEspecialAtractivo | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  const formRef = useRef<HTMLDivElement>(null)

  const mensajeLista = tipo === 'ingreso' ? 'ingresos' : 'actividades'
  const endpointBase = `/api/ocio/ingresos/atractivos/${atractivo}/${tipo === 'ingreso' ? 'ingresos' : 'actividades'}`

  const cargar = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      params.set('limit', '1000')
      if (mes) {
        params.set('desde', `${mes}-01`)
        params.set('hasta', `${mes}-31`)
      }
      const res = await fetch(`${endpointBase}?${params.toString()}`)
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Error')
      setRegistros(data.data || [])
    } catch (err) {
      setError('No se pudieron cargar los registros.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [endpointBase, mes])

  useEffect(() => {
    setCurrentPage(1)
  }, [mes, registros.length])

  useEffect(() => {
    cargar()
  }, [cargar])

  useEffect(() => {
    if (modalAbierto && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [modalAbierto])

  // ── Paginación (client) ──────────────────────────────────────────────────────
  const totalPages = useMemo(() => Math.ceil(registros.length / ITEMS_PER_PAGE), [registros.length])
  const paginaActualSegura = Math.min(currentPage, Math.max(1, totalPages))
  const paginados = useMemo(() => {
    const start = (paginaActualSegura - 1) * ITEMS_PER_PAGE
    return registros.slice(start, start + ITEMS_PER_PAGE)
  }, [registros, paginaActualSegura])

  // ── Acciones ─────────────────────────────────────────────────────────────────
  const abrirCrear = () => {
    setEditando(null)
    setModalAbierto(true)
  }

  const abrirEditar = (r: IngresoAtractivo | ActividadEspecialAtractivo) => {
    setEditando(r)
    setModalAbierto(true)
  }

  const cerrarModal = () => {
    setModalAbierto(false)
    setEditando(null)
  }

  const handleGuardado = useCallback(() => {
    cerrarModal()
    setToast({
      message: `${NOMBRE_REGISTRO[tipo][0].toUpperCase()}${NOMBRE_REGISTRO[tipo].slice(1)} guardado correctamente`,
      type: 'success',
    })
    cargar()
  }, [tipo, cargar])

  const handleBorrar = useCallback(
    async (r: IngresoAtractivo | ActividadEspecialAtractivo) => {
      if (!window.confirm(`¿Eliminar este ${NOMBRE_REGISTRO[tipo]}? Se marca como inactivo (no se borra de la planilla).`)) {
        return
      }
      try {
        const res = await fetch(`${endpointBase}/${r.id}`, { method: 'DELETE' })
        const data = await res.json()
        if (!res.ok || !data.success) throw new Error(data.error || 'Error')
        setToast({ message: 'Registro eliminado', type: 'success' })
        await cargar()
      } catch (err) {
        setToast({ message: 'Error al eliminar el registro', type: 'error' })
        console.error(err)
      }
    },
    [endpointBase, tipo, cargar],
  )

  // ── Render filas ─────────────────────────────────────────────────────────────
  const renderIngreso = (r: IngresoAtractivo) => (
    <>
      <td className="px-4 py-3 text-sm text-text-primary whitespace-nowrap">
        <span className="font-medium">{formatearFecha(r.fecha_hora_registro)}</span>
        <span className="ml-2 text-text-secondary">{formatearHora(r.fecha_hora_registro)}</span>
      </td>
      <td className="px-4 py-3 text-sm text-text-primary">{r.tipo_visitante}</td>
      <td className="px-4 py-3 text-sm text-text-secondary">{r.procedencia || '—'}</td>
      <td className="px-4 py-3 text-sm font-bold text-text-primary text-center">{r.cantidad_personas}</td>
      <td className="px-4 py-3 text-sm text-text-primary">{r.motivo}</td>
      <td className="px-4 py-3 text-sm text-text-secondary">{emailCorto(r.usuario_registro)}</td>
    </>
  )

  const renderActividad = (r: ActividadEspecialAtractivo) => (
    <>
      <td className="px-4 py-3 text-sm text-text-primary whitespace-nowrap">{formatearFecha(r.fecha_actividad)}</td>
      <td className="px-4 py-3 text-sm font-medium text-text-primary">{r.nombre_actividad}</td>
      <td className="px-4 py-3 text-sm font-bold text-text-primary text-center">{r.cantidad_total}</td>
      <td className="px-4 py-3 text-sm text-text-secondary text-center">{r.cantidad_turistas}</td>
      <td className="px-4 py-3 text-sm text-text-secondary text-center">{r.cantidad_residentes}</td>
      <td className="px-4 py-3 text-sm text-text-secondary max-w-40 truncate">{r.observaciones || '—'}</td>
      <td className="px-4 py-3 text-sm text-text-secondary">{emailCorto(r.usuario_registro)}</td>
    </>
  )

  return (
    <div className="space-y-4">
      {/* Barra de filtros + acciones */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="input bg-white text-sm py-1.5 w-auto"
            aria-label="Filtrar por mes"
          />
          {mes && (
            <button onClick={() => setMes('')} className="btn-ghost text-xs text-red-600">
              <i className="fa-solid fa-times mr-1" /> Limpiar mes
            </button>
          )}
          <span className="text-sm text-text-secondary">
            {loading ? 'Cargando...' : `${registros.length} ${mensajeLista}`}
          </span>
        </div>
        {escribir && (
          <button onClick={abrirCrear} className="btn-primary min-h-12 touch-manipulation">
            <i className="fa-solid fa-plus" /> Nuevo {NOMBRE_REGISTRO[tipo]}
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="card p-4 border-red-200 bg-red-50 flex items-center gap-3">
          <i className="fa-solid fa-triangle-exclamation text-red-500" />
          <p className="text-sm text-red-700 flex-1">{error}</p>
          <button onClick={cargar} className="btn-ghost text-red-600 text-xs">
            <i className="fa-solid fa-rotate-right" /> Reintentar
          </button>
        </div>
      )}

      {/* Tabla */}
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">
              {tipo === 'ingreso' ? (
                <>
                  <th className="px-4 py-3">Fecha / hora</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Procedencia</th>
                  <th className="px-4 py-3 text-center">Personas</th>
                  <th className="px-4 py-3">Motivo</th>
                  <th className="px-4 py-3">Cargó</th>
                </>
              ) : (
                <>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Actividad</th>
                  <th className="px-4 py-3 text-center">Total</th>
                  <th className="px-4 py-3 text-center">Turistas</th>
                  <th className="px-4 py-3 text-center">Residentes</th>
                  <th className="px-4 py-3">Observaciones</th>
                  <th className="px-4 py-3">Cargó</th>
                </>
              )}
              {escribir && <th className="px-4 py-3 text-right">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {paginados.length === 0 && !loading && (
              <tr>
                <td colSpan={escribir ? 8 : 7} className="px-4 py-8 text-center text-sm text-text-secondary">
                  No hay {mensajeLista} registrados.
                </td>
              </tr>
            )}
            {paginados.map((r) => (
              <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                {tipo === 'ingreso' ? renderIngreso(r as IngresoAtractivo) : renderActividad(r as ActividadEspecialAtractivo)}
                {escribir && (
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => abrirEditar(r)}
                      className="text-primary hover:text-primary/70 mr-3 touch-manipulation px-2 py-2"
                      aria-label="Editar"
                    >
                      <i className="fa-solid fa-pen" />
                    </button>
                    <button
                      onClick={() => handleBorrar(r)}
                      className="text-red-500 hover:text-red-700 touch-manipulation px-2 py-2"
                      aria-label="Eliminar"
                    >
                      <i className="fa-solid fa-trash" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-text-secondary">
              Página {paginaActualSegura} de {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={paginaActualSegura <= 1}
                className="btn-secondary text-sm min-h-11 touch-manipulation"
              >
                <i className="fa-solid fa-chevron-left" /> Anterior
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={paginaActualSegura >= totalPages}
                className="btn-secondary text-sm min-h-11 touch-manipulation"
              >
                Siguiente <i className="fa-solid fa-chevron-right" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal-embed del form. `key` fuerza el remonte al cambiar de registro:
          los forms inicializan su estado solo al montar, y sin esto pasar de un
          registro a otro (o de "nuevo" a editar) dejaría los valores anteriores
          y los guardaría sobre el registro recién seleccionado. */}
      {modalAbierto && (
        <div ref={formRef}>
          {tipo === 'ingreso' ? (
            <FormIngreso
              key={editando?.id ?? 'nuevo'}
              atractivo={atractivo}
              registro={editando as IngresoAtractivo | null}
              onGuardado={handleGuardado}
              onCancelar={cerrarModal}
            />
          ) : (
            <FormActividadEspecial
              key={editando?.id ?? 'nuevo'}
              atractivo={atractivo}
              actividad={editando as ActividadEspecialAtractivo | null}
              onGuardado={handleGuardado}
              onCancelar={cerrarModal}
            />
          )}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}