'use client'

import React, { useState, useCallback } from 'react'
import { fechaLocalISO, fechaHoraLocalISO } from '@/lib/formato-fechas'
import type { AtractivoConIngresos } from '@/lib/atractivos-config'
import type { ActividadEspecialAtractivo } from '@/lib/types'

interface FormActividadEspecialProps {
  atractivo: AtractivoConIngresos
  /** Si está presente, el form edita esa actividad (PUT). */
  actividad?: ActividadEspecialAtractivo | null
  onGuardado: () => void
  onCancelar: () => void
  /** 'pagina' (default, sin overlay) o 'modal' (overlay tipo museos) — ver FormIngreso. */
  variante?: 'pagina' | 'modal'
}

function generadorIdLocal(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

// ── Stepper reutilizable (tablet-first) ────────────────────────────────────
interface StepperProps {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
}

function Stepper({ label, value, onChange, min = 0, max = 10000 }: StepperProps) {
  const [editando, setEditando] = useState(false)
  const [texto, setTexto] = useState(String(value))

  const aplicar = (v: number) => {
    const n = Math.min(max, Math.max(min, Math.round(v) || min))
    onChange(n)
    setTexto(String(n))
  }

  const inputCls =
    'input bg-white text-center text-3xl font-bold w-32 min-h-16 text-primary touch-manipulation'

  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary block mb-2">
        {label}
      </label>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => aplicar(value - 1)}
          className="w-16 h-16 rounded-xl border-2 border-gray-200 bg-white text-2xl font-bold text-text-primary hover:border-primary/50 touch-manipulation select-none"
          aria-label={`Restar uno a ${label}`}
        >
          −
        </button>
        {editando ? (
          <input
            autoFocus
            type="number"
            min={min}
            max={max}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onBlur={() => {
              aplicar(parseInt(texto, 10) || min)
              setEditando(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            }}
            className={inputCls}
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setTexto(String(value))
              setEditando(true)
            }}
            className={inputCls}
            aria-label={`Editar ${label}`}
          >
            {value}
          </button>
        )}
        <button
          type="button"
          onClick={() => aplicar(value + 1)}
          className="w-16 h-16 rounded-xl border-2 border-gray-200 bg-white text-2xl font-bold text-text-primary hover:border-primary/50 touch-manipulation select-none"
          aria-label={`Sumar uno a ${label}`}
        >
          +
        </button>
      </div>
    </div>
  )
}

export default function FormActividadEspecial({
  atractivo,
  actividad,
  onGuardado,
  onCancelar,
  variante = 'pagina',
}: FormActividadEspecialProps) {
  const modal = variante === 'modal'
  // Fecha/hora del reloj LOCAL del dispositivo: en UTC (toISOString) todo lo
  // cargado después de las 21:00 en Catamarca se fecharía al día siguiente.
  const [fechaActividad, setFechaActividad] = useState<string>(
    actividad?.fecha_actividad || fechaLocalISO(),
  )
  const [nombre, setNombre] = useState<string>(actividad?.nombre_actividad || '')
  const [cantidadTotal, setCantidadTotal] = useState<number>(actividad?.cantidad_total || 1)
  const [cantidadTuristas, setCantidadTuristas] = useState<number>(actividad?.cantidad_turistas || 0)
  const [cantidadResidentes, setCantidadResidentes] = useState<number>(actividad?.cantidad_residentes || 0)
  const [observaciones, setObservaciones] = useState<string>(actividad?.observaciones || '')
  const [idLocal] = useState(() => actividad?.id_local || generadorIdLocal())
  const [fechaHoraRegistro] = useState(() => actividad?.fecha_hora_registro || fechaHoraLocalISO())

  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  // Único punto de guardado: la Fase B solo reemplaza esta función por useOffline().guardar().
  const guardarActividad = useCallback(
    async (payload: Record<string, unknown>) => {
      const url = actividad?.id
        ? `/api/ocio/ingresos/atractivos/${atractivo}/actividades/${actividad.id}`
        : `/api/ocio/ingresos/atractivos/${atractivo}/actividades`
      const method = actividad?.id ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await res.json()
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Error al guardar')
      }
      return result
    },
    [atractivo, actividad],
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!nombre.trim()) {
      setError('Ingresá el nombre de la actividad.')
      return
    }
    if (!fechaActividad) {
      setError('Indicá la fecha de la actividad.')
      return
    }
    if (cantidadTotal < cantidadTuristas + cantidadResidentes) {
      setError('La cantidad total debe ser mayor o igual a turistas + residentes.')
      return
    }

    const payload = {
      fecha_actividad: fechaActividad,
      nombre_actividad: nombre.trim(),
      cantidad_total: cantidadTotal,
      cantidad_turistas: cantidadTuristas,
      cantidad_residentes: cantidadResidentes,
      observaciones: observaciones.trim(),
      fecha_hora_registro: fechaHoraRegistro,
      id_local: idLocal,
    }

    setGuardando(true)
    try {
      await guardarActividad(payload)
      onGuardado()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar la actividad.')
    } finally {
      setGuardando(false)
    }
  }

  const inputBase =
    'input bg-white min-h-16 text-base touch-manipulation w-full py-3'

  const contenido = (
    <form onSubmit={handleSubmit} className={modal ? 'space-y-6' : 'card p-6 space-y-6 max-w-2xl'}>
      {!modal && (
        <div>
          <h3 className="text-lg font-bold text-text-primary">
            {actividad ? 'Editar actividad especial' : 'Nueva actividad especial'}
          </h3>
          <p className="text-sm text-text-secondary">
            Se carga al terminar la actividad (puede ser de días anteriores).
          </p>
        </div>
      )}

      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary block mb-2">
          Fecha de la actividad
        </label>
        <input
          type="date"
          value={fechaActividad}
          onChange={(e) => setFechaActividad(e.target.value)}
          className={inputBase}
          required
        />
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary block mb-2">
          Nombre de la actividad
        </label>
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej.: Peña del Vino, Feria de Artesanos..."
          className={inputBase}
          maxLength={200}
          required
        />
      </div>

      <div className="space-y-6">
        <Stepper label="Cantidad total de personas" value={cantidadTotal} onChange={setCantidadTotal} min={1} />
        <Stepper label="Turistas" value={cantidadTuristas} onChange={setCantidadTuristas} />
        <Stepper label="Residentes" value={cantidadResidentes} onChange={setCantidadResidentes} />
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary block mb-2">
          Observaciones
        </label>
        <textarea
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Detalles opcionales de la actividad..."
          className={inputBase}
        />
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
          <i className="fa-solid fa-triangle-exclamation text-red-500" />
          {error}
        </div>
      )}

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
              {actividad ? 'Guardar cambios' : 'Guardar actividad'}
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
          <h3 className="text-xl font-bold text-text-primary">
            {actividad ? 'Editar actividad especial' : 'Nueva actividad especial'}
          </h3>
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