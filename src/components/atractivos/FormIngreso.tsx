'use client'

import React, { useState, useCallback } from 'react'
import { TIPOS_VISITANTE, PROCEDENCIAS_INGRESO, MOTIVOS_INGRESOS } from '@/lib/atractivos-config'
import { fechaHoraLocalISO } from '@/lib/formato-fechas'
import type { AtractivoConIngresos } from '@/lib/atractivos-config'
import type { IngresoAtractivo } from '@/lib/types'

interface FormIngresoProps {
  atractivo: AtractivoConIngresos
  /** Si está presente, el form edita ese registro (PUT). */
  registro?: IngresoAtractivo | null
  onGuardado: () => void
  onCancelar: () => void
}

function generadorIdLocal(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function stepperCls(base: string) {
  return `${base} touch-manipulation select-none`
}

export default function FormIngreso({ atractivo, registro, onGuardado, onCancelar }: FormIngresoProps) {
  const motivos = MOTIVOS_INGRESOS[atractivo]

  // fecha_hora_registro: reloj LOCAL del dispositivo (no UTC — el GAS agrupa
  // "hoy" y el mes por la zona de Catamarca). En edición se preserva la original.
  const [fechaHoraRegistro] = useState(() => registro?.fecha_hora_registro || fechaHoraLocalISO())
  const [idLocal] = useState(() => registro?.id_local || generadorIdLocal())

  const [tipoVisitante, setTipoVisitante] = useState<string>(registro?.tipo_visitante || '')
  const [procedencia, setProcedencia] = useState<string>(registro?.procedencia || '')
  const [cantidad, setCantidad] = useState<number>(registro?.cantidad_personas || 1)
  const [motivo, setMotivo] = useState<string>(registro?.motivo || '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const esTurista = tipoVisitante === 'Turista'

  // Único punto de guardado: la Fase B solo reemplaza esta función por useOffline().guardar().
  const guardarIngreso = useCallback(
    async (payload: Record<string, unknown>) => {
      const url = registro?.id
        ? `/api/ocio/ingresos/atractivos/${atractivo}/ingresos/${registro.id}`
        : `/api/ocio/ingresos/atractivos/${atractivo}/ingresos`
      const method = registro?.id ? 'PUT' : 'POST'

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
    [atractivo, registro],
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
      await guardarIngreso(payload)
      onGuardado()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el ingreso.')
    } finally {
      setGuardando(false)
    }
  }

  const btnSeleccion = (activo: boolean) =>
    `min-h-16 px-4 py-3 rounded-xl border-2 text-base font-semibold transition-all touch-manipulation ${
      activo
        ? 'border-primary bg-primary/10 text-primary'
        : 'border-gray-200 bg-white text-text-secondary hover:border-primary/50'
    }`

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-6 max-w-2xl">
      <div>
        <h3 className="text-lg font-bold text-text-primary">
          {registro ? 'Editar ingreso' : 'Cargar ingreso'}
        </h3>
        <p className="text-sm text-text-secondary">
          Fecha y hora del registro (automáticas del dispositivo):{' '}
          <span className="font-medium text-text-primary">{new Date(fechaHoraRegistro).toLocaleString('es-AR')}</span>
        </p>
      </div>

      {/* Tipo de visitante */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary block mb-2">
          Tipo de visitante
        </label>
        <div className="grid grid-cols-3 gap-3">
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
          <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary block mb-2">
            Procedencia del turista
          </label>
          <div className="grid grid-cols-3 gap-3">
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
        <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary block mb-2">
          Cantidad de personas
        </label>
        <div className="flex items-center gap-4">
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
        <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary block mb-2">
          Motivo de la visita
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
      <div className="sticky bottom-0 -mx-6 px-6 py-4 bg-white border-t border-gray-100 flex gap-3">
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
}