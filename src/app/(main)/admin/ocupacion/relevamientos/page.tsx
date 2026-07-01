'use client'

/**
 * Listado de relevamientos con filtros y creación de nuevo relevamiento.
 * "sin datos ≠ 0%": los relevamientos sin cargas muestran "—" en OH.
 */

import { useState, useEffect, useCallback } from 'react'
import { tituloRelevamiento, formatearRango } from '@/lib/formato-fechas'

interface Relevamiento {
  id: string
  nombre: string
  tipo: 'Mensual' | 'Especial'
  estado: 'EN_CURSO' | 'CERRADO'
  fechaInicio: string
  fechaFin: string
  ohTotal: number
  cantidadRelevados: number
}

interface RelevamientoActivo extends Relevamiento {
  estado: 'EN_CURSO'
}

export default function RelevamientosPage() {
  const [relevamientos, setRelevamientos] = useState<Relevamiento[]>([])
  const [activo, setActivo] = useState<RelevamientoActivo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')

  // Form crear
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ tipo: 'Especial', nombre: '', fechaInicio: '', fechaFin: '' })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [formOk, setFormOk] = useState('')

  // Cerrar relevamiento
  const [closingId, setClosingId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (filtroTipo) params.set('tipo', filtroTipo)
      if (filtroEstado) params.set('estado', filtroEstado)

      const [resRel, resActivo] = await Promise.all([
        fetch(`/api/ocupacion/relevamientos?${params.toString()}`),
        fetch('/api/ocupacion/relevamientos/activo'),
      ])

      if (!resRel.ok) throw new Error(`Error ${resRel.status}`)

      const jsonRel = await resRel.json()
      setRelevamientos(jsonRel.data || [])

      if (resActivo.ok) {
        const jsonA = await resActivo.json()
        if (jsonA.success && jsonA.data) setActivo(jsonA.data)
        else setActivo(null)
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar relevamientos')
    } finally {
      setLoading(false)
    }
  }, [filtroTipo, filtroEstado])

  useEffect(() => { loadData() }, [loadData])

  // ── Crear relevamiento ──────────────────────────────────────────────────
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    setFormOk('')
    setSubmitting(true)

    try {
      const res = await fetch('/api/ocupacion/relevamientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const json = await res.json()

      if (!res.ok || !json.success) {
        setFormError(json.error || 'Error al crear relevamiento')
        return
      }

      setFormOk(`Relevamiento #${json.id} creado exitosamente`)
      setFormData({ tipo: 'Especial', nombre: '', fechaInicio: '', fechaFin: '' })
      setShowForm(false)
      loadData()
    } catch (err: any) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Cerrar relevamiento ─────────────────────────────────────────────────
  async function handleClose(id: string) {
    if (!confirm('¿Está seguro de cerrar este relevamiento? Se calculará el OH final y no podrá agregar más cargas.')) return

    setClosingId(id)
    try {
      const res = await fetch(`/api/ocupacion/relevamientos/${id}/close`, { method: 'POST' })
      const json = await res.json()

      if (!res.ok || !json.success) {
        alert(json.error || 'Error al cerrar')
        return
      }

      alert(`Relevamiento cerrado. OH Total: ${json.data?.ohTotal}%`)
      loadData()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setClosingId(null)
    }
  }

  // ── Badges ──────────────────────────────────────────────────────────────
  function BadgeEstado({ estado }: { estado: string }) {
    if (estado === 'EN_CURSO') return <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">En curso</span>
    if (estado === 'CERRADO') return <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-600 rounded-full">Cerrado</span>
    return <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 rounded-full">{estado}</span>
  }

  function BadgeTipo({ tipo }: { tipo: string }) {
    if (tipo === 'Especial') return <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">Especial</span>
    if (tipo === 'Mensual') return <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">Mensual</span>
    return <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">{tipo}</span>
  }

  // ── Loading / Error ────────────────────────────────────────────────────
  if (loading && relevamientos.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
        <span className="ml-3 text-gray-500">Cargando relevamientos...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card p-6 border-l-4 border-red-400 bg-red-50">
        <p className="text-red-700 flex items-center gap-2"><i className="fas fa-exclamation-triangle" /> {error}</p>
      </div>
    )
  }

  // ── UI ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Relevamiento activo (banner) */}
      {activo && (
        <div className="card p-4 bg-accent/5 border-accent/30 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <i className="fas fa-play-circle text-accent text-lg" />
            <div>
              <p className="text-sm font-semibold text-gray-800">{tituloRelevamiento(activo.tipo, activo.nombre, activo.fechaInicio)}</p>
              <p className="text-xs text-gray-500">
                {activo.tipo} • {formatearRango(activo.fechaInicio, activo.fechaFin)} • {activo.cantidadRelevados} cargas
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <a href={`/admin/ocupacion/relevamientos/${activo.id}`} className="btn-primary text-xs px-3 py-1.5">
              <i className="fas fa-eye mr-1" />Ver detalle
            </a>
            <a href="/admin/ocupacion/carga" className="btn-primary text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700">
              <i className="fas fa-plus mr-1" />Cargar OH
            </a>
            <button
              onClick={() => handleClose(activo.id)}
              disabled={closingId === activo.id}
              className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 border border-red-200 rounded-md hover:bg-red-100 disabled:opacity-50 transition-colors"
            >
              <i className="fas fa-lock mr-1" />
              {closingId === activo.id ? 'Cerrando...' : 'Cerrar'}
            </button>
          </div>
        </div>
      )}

      {/* Controles: filtros + botón crear */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="input w-36 text-sm">
          <option value="">Todos los tipos</option>
          <option value="Mensual">Mensual</option>
          <option value="Especial">Especial</option>
        </select>
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="input w-36 text-sm">
          <option value="">Todos los estados</option>
          <option value="EN_CURSO">En curso</option>
          <option value="CERRADO">Cerrado</option>
        </select>
        <div className="flex-1" />
        <button
          onClick={() => setShowForm(!showForm)}
          disabled={!!activo}
          className="btn-primary text-sm disabled:opacity-50"
          title={activo ? 'Ya existe un relevamiento activo' : undefined}
        >
          <i className="fas fa-plus mr-1" />Nuevo relevamiento
        </button>
      </div>

      {/* Formulario crear */}
      {showForm && (
        <form onSubmit={handleCreate} className="card p-5 space-y-3 bg-gray-50 border border-gray-200">
          <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
            <i className="fas fa-calendar-plus text-accent" /> Nuevo relevamiento
          </h3>

          {formError && <p className="text-sm text-red-600 bg-red-50 p-2 rounded flex items-center gap-1"><i className="fas fa-exclamation-circle" /> {formError}</p>}
          {formOk && <p className="text-sm text-green-700 bg-green-50 p-2 rounded flex items-center gap-1"><i className="fas fa-check-circle" /> {formOk}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-gray-500 font-medium">Tipo</span>
              <select value={formData.tipo} onChange={(e) => setFormData({ ...formData, tipo: e.target.value })} className="input w-full mt-1" required>
                <option value="Especial">Especial (Finde / Evento)</option>
                <option value="Mensual">Mensual</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 font-medium">Nombre</span>
              <input type="text" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} className="input w-full mt-1" placeholder="Ej: Finde XXL Octubre 2026" required />
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 font-medium">Fecha inicio</span>
              <input type="date" value={formData.fechaInicio} onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })} className="input w-full mt-1" required />
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 font-medium">Fecha fin</span>
              <input type="date" value={formData.fechaFin} onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })} className="input w-full mt-1" required />
            </label>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={submitting} className="btn-primary text-sm">
              {submitting ? <><i className="fas fa-spinner fa-spin mr-1" />Creando...</> : <><i className="fas fa-check mr-1" />Crear relevamiento</>}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setFormError(''); setFormOk('') }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Tabla de relevamientos */}
      {relevamientos.length === 0 ? (
        <div className="card p-12 text-center">
          <i className="fas fa-calendar-xmark text-4xl text-gray-300 mb-3 block" />
          <p className="text-gray-500">No se encontraron relevamientos con los filtros actuales.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-left text-gray-500 text-xs uppercase tracking-wide">
                  <th className="p-3 font-medium">ID</th>
                  <th className="p-3 font-medium">Nombre</th>
                  <th className="p-3 font-medium">Tipo</th>
                  <th className="p-3 font-medium">Estado</th>
                  <th className="p-3 font-medium">Período</th>
                  <th className="p-3 font-medium text-right">OH Total</th>
                  <th className="p-3 font-medium text-right">Relevados</th>
                  <th className="p-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {relevamientos.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="p-3 text-gray-400 font-mono text-xs">#{r.id}</td>
                    <td className="p-3 font-medium text-gray-800">{tituloRelevamiento(r.tipo, r.nombre, r.fechaInicio)}</td>
                    <td className="p-3"><BadgeTipo tipo={r.tipo} /></td>
                    <td className="p-3"><BadgeEstado estado={r.estado} /></td>
                    <td className="p-3 text-gray-600 text-xs">{formatearRango(r.fechaInicio, r.fechaFin)}</td>
                    <td className="p-3 text-right">
                      {r.estado === 'CERRADO' && r.ohTotal > 0 ? (
                        <span className="font-semibold text-accent">{r.ohTotal}%</span>
                      ) : r.estado === 'CERRADO' ? (
                        <span className="text-gray-400">0%</span>
                      ) : (
                        <span className="text-gray-400 text-xs italic">En curso</span>
                      )}
                    </td>
                    <td className="p-3 text-right text-gray-600">{r.cantidadRelevados || '—'}</td>
                    <td className="p-3 text-right">
                      <div className="flex gap-1 justify-end">
                        <a href={`/admin/ocupacion/relevamientos/${r.id}`} className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors">
                          <i className="fas fa-eye" />
                        </a>
                        {r.estado === 'EN_CURSO' && (
                          <button onClick={() => handleClose(r.id)} disabled={closingId === r.id} className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50">
                            <i className={`fas ${closingId === r.id ? 'fa-spinner fa-spin' : 'fa-lock'}`} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
