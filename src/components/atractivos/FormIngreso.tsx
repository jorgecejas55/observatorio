'use client'

import React, { useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { esAdmin, type SessionUser } from '@/lib/permisos'
import { TIPOS_VISITANTE, PROCEDENCIAS_INGRESO, MOTIVOS_INGRESOS } from '@/lib/atractivos-config'
import { fechaHoraLocalISO, formatearFechaCorta } from '@/lib/formato-fechas'
import { useOffline } from '@/contexts/OfflineContext'
import type { AtractivoConIngresos } from '@/lib/atractivos-config'
import type { IngresoAtractivo } from '@/lib/types'

interface FormIngresoProps {
  atractivo: AtractivoConIngresos
  /** Si está presente, el form edita ese registro (PUT). */
  registro?: IngresoAtractivo | null
  /** modo: 'offline' si la alta quedó encolada en el dispositivo por falta de red. */
  onGuardado: (modo?: 'online' | 'offline') => void
  onCancelar: () => void
  /**
   * 'pagina' (default): botones grandes tablet-first, sin overlay — SOLO
   * /ocio/ingresos/[atractivo]/cargar.
   * 'modal': overlay tipo museos (Adán Quiroga / Virgen del Valle) — usado
   * desde TablaRegistros (/registros y /actividades).
   */
  variante?: 'pagina' | 'modal'
}

function generadorIdLocal(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function stepperCls(base: string) {
  return `${base} touch-manipulation select-none`
}

export default function FormIngreso({ atractivo, registro, onGuardado, onCancelar, variante = 'pagina' }: FormIngresoProps) {
  const modal = variante === 'modal'
  const { data: session } = useSession()
  const { guardar } = useOffline()

  const motivos = MOTIVOS_INGRESOS[atractivo]

  // fecha_hora_registro: reloj LOCAL del dispositivo (no UTC — el GAS agrupa
  // "hoy" y el mes por la zona de Catamarca). En edición se preserva la original,
  // salvo que un admin la corrija a mano (ver puedeEditarFecha más abajo) — a
  // veces hace falta arreglar una fecha mal cargada o migrada del histórico.
  const [fechaHoraRegistro, setFechaHoraRegistro] = useState(
    () => registro?.fecha_hora_registro || fechaHoraLocalISO(),
  )
  const puedeEditarFecha = modal && !!registro && esAdmin(session?.user as SessionUser)
  const [idLocal] = useState(() => registro?.id_local || generadorIdLocal())

  const [tipoVisitante, setTipoVisitante] = useState<string>(registro?.tipo_visitante || '')
  const [procedencia, setProcedencia] = useState<string>(registro?.procedencia || '')
  const [cantidad, setCantidad] = useState<number>(registro?.cantidad_personas || 1)
  const [motivo, setMotivo] = useState<string>(registro?.motivo || '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const esTurista = tipoVisitante === 'Turista'

  // Único punto de guardado. Edición (PUT) requiere conexión — la hace el
  // responsable, no el guía en el campo. Alta (POST) es offline-aware: si
  // falla por falta de red, useOffline().guardar() la encola para sincronizar sola.
  const guardarIngreso = useCallback(
    async (payload: Record<string, unknown>): Promise<{ modo: 'online' | 'offline' }> => {
      if (registro?.id) {
        const res = await fetch(`/api/ocio/ingresos/atractivos/${atractivo}/ingresos/${registro.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const result = await res.json()
        if (!res.ok || !result.success) {
          throw new Error(result.error || 'Error al guardar')
        }
        return { modo: 'online' }
      }

      return guardar({
        tipo: 'ingreso',
        atractivo,
        url: `/api/ocio/ingresos/atractivos/${atractivo}/ingresos`,
        payload,
        idLocal,
      })
    },
    [atractivo, registro, guardar, idLocal],
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!tipoVisitante) {
      setError('Seleccioná el tipo de visitante.')
      return
    }
    if (!motivo) {
      setError('Seleccioná el motivo de la visita.')
      return
    }
    if (esTurista && !procedencia) {
      setError('Para visitantes turistas, indicá la procedencia.')
      return
    }
    if (cantidad < 1) {
      setError('La cantidad de personas debe ser al menos 1.')
      return
    }

    const payload = {
      fecha_hora_registro: fechaHoraRegistro,
      tipo_visitante: tipoVisitante,
      procedencia: esTurista ? procedencia : undefined,
      cantidad_personas: cantidad,
      motivo,
      id_local: idLocal,
    }

    setGuardando(true)
    try {
      const { modo } = await guardarIngreso(payload)
      onGuardado(modo)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el ingreso.')
    } finally {
      setGuardando(false)
    }
  }

  const btnSeleccion = (activo: boolean) =>
    `flex-1 basis-32 min-h-16 px-4 py-3 rounded-xl border-2 text-base font-semibold transition-all touch-manipulation ${
      activo
        ? 'border-primary bg-primary/10 text-primary'
        : 'border-gray-200 bg-white text-text-secondary hover:border-primary/50'
    }`

  const contenido = (
    <form onSubmit={handleSubmit} className={modal ? 'space-y-6' : 'card p-6 space-y-6'}>
      {!modal && (
        <div>
          <h3 className="text-lg font-bold text-text-primary">
            {registro ? 'Editar ingreso' : 'Cargar ingreso'}
          </h3>
          <p className="text-sm text-text-secondary">
            Fecha y hora del registro (automáticas del dispositivo):{' '}
            <span className="font-medium text-text-primary">
              {formatearFechaCorta(fechaHoraRegistro)} {fechaHoraRegistro.substring(11, 16)}
            </span>
          </p>
        </div>
      )}

      {/* Fecha y hora: editable solo para admin, editando un registro, en el modal */}
      {modal && (
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary block mb-2">
            Fecha y hora del registro
          </label>
          {puedeEditarFecha ? (
            <input
              type="datetime-local"
              value={fechaHoraRegistro.substring(0, 16)}
              onChange={(e) => setFechaHoraRegistro(e.target.value)}
              className="input bg-white w-full"
            />
          ) : (
            <p className="text-sm font-medium text-text-primary">
              {formatearFechaCorta(fechaHoraRegistro)} {fechaHoraRegistro.substring(11, 16)}
            </p>
          )}
        </div>
      )}

      {/* Tipo de visitante */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary block mb-2 text-center">
          Tipo de visitante
        </label>
        <div className="flex flex-wrap gap-3">
          {TIPOS_VISITANTE.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTipoVisitante(t)
                if (t !== 'Turista') setProcedencia('')
              }}
              className={btnSeleccion(tipoVisitante === t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Procedencia (solo turistas) */}
      {esTurista && (
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary block mb-2 text-center">
            Procedencia del turista
          </label>
          <div className="flex flex-wrap gap-3">
            {PROCEDENCIAS_INGRESO.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setProcedencia(p)}
                className={btnSeleccion(procedencia === p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Cantidad */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary block mb-2 text-center">
          Cantidad de personas
        </label>
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => setCantidad((c) => Math.max(1, c - 1))}
            className={`w-16 h-16 rounded-xl border-2 border-gray-200 bg-white text-2xl font-bold text-text-primary hover:border-primary/50 ${stepperCls('')}`}
            aria-label="Restar una persona"
          >
            −
          </button>
          <input
            type="number"
            min={1}
            max={10000}
            value={cantidad}
            onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value) || 1))}
            className="input bg-white text-center text-3xl font-bold w-32 min-h-16 text-primary"
            aria-label="Cantidad de personas"
          />
          <button
            type="button"
            onClick={() => setCantidad((c) => Math.min(10000, c + 1))}
            className={`w-16 h-16 rounded-xl border-2 border-gray-200 bg-white text-2xl font-bold text-text-primary hover:border-primary/50 ${stepperCls('')}`}
            aria-label="Sumar una persona"
          >
            +
          </button>
        </div>
      </div>

      {/* Motivo */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary block mb-2 text-center">
          Motivo de la visita
        </label>
        <div className="flex flex-wrap gap-3">
          {motivos.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMotivo(m)}
              className={btnSeleccion(motivo === m)}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
          <i className="fa-solid fa-triangle-exclamation text-red-500" />
          {error}
        </div>
      )}

      {/* Barra sticky de guardar */}
      <div
        className={
          modal
            ? 'sticky bottom-0 -mx-6 -mb-6 px-6 py-4 bg-white border-t border-gray-100 flex gap-3'
            : 'sticky bottom-0 -mx-6 px-6 py-4 bg-white border-t border-gray-100 flex gap-3'
        }
      >
        <button
          type="submit"
          disabled={guardando}
          className="btn-primary flex-1 min-h-14 text-base touch-manipulation"
        >
          {guardando ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Guardando...
            </>
          ) : (
            <>
              <i className="fa-solid fa-floppy-disk mr-2" />
              {registro ? 'Guardar cambios' : 'Registrar ingreso'}
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          disabled={guardando}
          className="btn-secondary min-h-14 touch-manipulation"
        >
          Cancelar
        </button>
      </div>
    </form>
  )

  if (!modal) return contenido

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-text-primary">{registro ? 'Editar ingreso' : 'Nuevo ingreso'}</h3>
          <button
            type="button"
            onClick={onCancelar}
            disabled={guardando}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <i className="fa-solid fa-times text-text-secondary" />
          </button>
        </div>
        <div className="p-6">{contenido}</div>
      </div>
    </div>
  )
}