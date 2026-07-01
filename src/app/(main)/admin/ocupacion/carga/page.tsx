'use client'

/**
 * Carga de Ocupación Hotelera en vivo.
 *
 * Flujo:
 * 1. Obtiene alojamientos desde Directus (/api/ocupacion/alojamientos)
 * 2. Obtiene relevamiento activo (/api/ocupacion/relevamientos/activo)
 * 3. Operador selecciona alojamiento + ingresa %OH
 * 4. POST /api/ocupacion/cargas con snapshot completo
 * 5. Polling adaptativo para ver cargas en tiempo real
 *
 * Principio "sin datos ≠ 0%":
 * - 0% explícito: alojamiento relevado sin ocupación → participa en estadísticas
 * - sin carga: alojamiento no aparece en la tabla de cargas ni en promedios
 * - Diferencia visual clara entre ambos casos
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { tituloRelevamiento, formatearRango, formatearFecha } from '@/lib/formato-fechas'

interface Alojamiento {
  id: string
  nombre: string
  tipo: string
  categoria: string
  capacidadHab: number
  capacidadPlazas: number
}

interface RelevamientoActivo {
  id: string
  nombre: string
  tipo: string
  fechaInicio: string
  fechaFin: string
  estado: string
  cantidadRelevados: number
}

interface Carga {
  ID?: string
  id?: string
  AlojamientoID?: string
  alojamientoId?: string
  AlojamientoNombre?: string
  alojamientoNombre?: string
  Tipo?: string
  tipo?: string
  Categoria?: string
  categoria?: string
  PorcentajeOH?: number
  porcentajeOH?: number
  CapacidadHab?: number
  capacidadHab?: number
  UsuarioCarga?: string
  usuarioCarga?: string
  FechaCarga?: string
  fechaCarga?: string
  HoraCarga?: string
  horaCarga?: string
}

export default function CargaOHPage() {
  // ── Estado ─────────────────────────────────────────────────────────────
  const [relevamiento, setRelevamiento] = useState<RelevamientoActivo | null>(null)
  const [alojamientos, setAlojamientos] = useState<Alojamiento[]>([])
  const [cargas, setCargas] = useState<Carga[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Formulario
  const [selectedAlojamientoId, setSelectedAlojamientoId] = useState('')
  const [porcentajeOH, setPorcentajeOH] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [formOk, setFormOk] = useState('')

  // Búsqueda / filtro de alojamientos
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')

  // Polling
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastModifiedRef = useRef(0)

  // ── Carga inicial ──────────────────────────────────────────────────────
  useEffect(() => {
    loadInitialData()
    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [])

  async function loadInitialData() {
    setLoading(true)
    setError('')
    try {
      const [resActivo, resAloj] = await Promise.all([
        fetch('/api/ocupacion/relevamientos/activo'),
        fetch('/api/ocupacion/alojamientos'),
      ])

      // Relevamiento activo
      if (resActivo.ok) {
        const json = await resActivo.json()
        if (json.success && json.data && json.data.estado === 'EN_CURSO') {
          setRelevamiento(json.data)
          // Iniciar polling
          startPolling(json.data.id)
          // Cargar cargas existentes
          loadCargas(json.data.id)
        } else {
          setError('No hay un relevamiento activo en este momento. Creá uno en la sección Relevamientos.')
        }
      } else {
        setError('No se pudo verificar el relevamiento activo.')
      }

      // Alojamientos
      if (resAloj.ok) {
        const json = await resAloj.json()
        if (json.success) {
          setAlojamientos(json.data || [])
        }
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Polling adaptativo ──────────────────────────────────────────────────
  function startPolling(relevamientoId: string) {
    // Polling: cada 3 segundos verificamos versión, si hay cambios traemos delta
    pollingRef.current = setInterval(async () => {
      try {
        // 1. Verificar versión
        const verRes = await fetch(`/api/ocupacion/cargas/version?relevamientoId=${relevamientoId}`)
        if (!verRes.ok) return
        const ver = await verRes.json()
        if (!ver.success) return

        // 2. Si hay cambios, traer delta
        if (ver.lastModified > lastModifiedRef.current && lastModifiedRef.current > 0) {
          const deltaRes = await fetch(`/api/ocupacion/cargas/since?relevamientoId=${relevamientoId}&since=${lastModifiedRef.current}`)
          if (deltaRes.ok) {
            const delta = await deltaRes.json()
            if (delta.success && delta.data?.length > 0) {
              setCargas(prev => {
                const existingIds = new Set(prev.map((c: any) => c.ID || c.id))
                const newCargas = delta.data.filter((c: any) => !existingIds.has(c.ID || c.id))
                return [...prev, ...newCargas]
              })
            }
          }
        }

        if (ver.lastModified > 0) {
          lastModifiedRef.current = ver.lastModified
        }
      } catch {
        // silencioso — el polling es secundario
      }
    }, 3000)
  }

  async function loadCargas(relevamientoId: string) {
    try {
      const res = await fetch(`/api/ocupacion/cargas?relevamientoId=${relevamientoId}`)
      if (res.ok) {
        const json = await res.json()
        if (json.success) setCargas(json.data || [])
      }
      // Actualizar timestamp para polling
      const verRes = await fetch(`/api/ocupacion/cargas/version?relevamientoId=${relevamientoId}`)
      if (verRes.ok) {
        const ver = await verRes.json()
        if (ver.lastModified) lastModifiedRef.current = ver.lastModified
      }
    } catch { /* silencioso */ }
  }

  // ── Submit carga ────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    setFormOk('')

    if (!selectedAlojamientoId) {
      setFormError('Seleccioná un alojamiento')
      return
    }

    const pct = parseFloat(porcentajeOH)
    if (isNaN(pct) || pct < 0 || pct > 100) {
      setFormError('El porcentaje debe ser un número entre 0 y 100')
      return
    }

    // Verificar duplicado
    const yaCargado = cargas.some((c: any) =>
      String(c.AlojamientoID || c.alojamientoId) === String(selectedAlojamientoId)
    )
    if (yaCargado) {
      setFormError('Este alojamiento ya fue cargado en este relevamiento')
      return
    }

    const aloj = alojamientos.find(a => String(a.id) === String(selectedAlojamientoId))
    if (!aloj) {
      setFormError('Alojamiento no encontrado')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/ocupacion/cargas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          relevamientoId: relevamiento!.id,
          alojamientoId: aloj.id,
          nombre: aloj.nombre,
          tipo: aloj.tipo,
          categoria: aloj.categoria,
          capacidadHab: aloj.capacidadHab,
          porcentajeOH: pct,
        }),
      })

      const json = await res.json()

      if (!res.ok || !json.success) {
        if (json.cargaExistente) {
          setFormError('Este alojamiento ya fue cargado anteriormente')
        } else {
          setFormError(json.error || 'Error al registrar la carga')
        }
        return
      }

      // OK — agregar optimista y resetear
      setFormOk(`¡Cargado! ${aloj.nombre} → ${pct}%`)
      setSelectedAlojamientoId('')
      setPorcentajeOH('')

      // Recargar cargas
      if (relevamiento) loadCargas(relevamiento.id)

      // Limpiar mensaje OK después de 2s
      setTimeout(() => setFormOk(''), 2500)
    } catch (err: any) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Filtros ─────────────────────────────────────────────────────────────
  const tiposUnicos = [...new Set(alojamientos.map(a => a.tipo).filter(Boolean))].sort()

  const alojamientosFiltrados = alojamientos.filter(a => {
    if (filtroTipo && a.tipo !== filtroTipo) return false
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      return a.nombre.toLowerCase().includes(q) ||
             a.tipo.toLowerCase().includes(q) ||
             a.categoria.toLowerCase().includes(q)
    }
    return true
  })

  // IDs de alojamientos ya cargados
  const cargadosIds = new Set(cargas.map((c: any) => String(c.AlojamientoID || c.alojamientoId)))

  // ── Loading ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
        <span className="ml-3 text-gray-500">Cargando...</span>
      </div>
    )
  }

  // ── Sin relevamiento activo ────────────────────────────────────────────
  if (error && !relevamiento) {
    return (
      <div className="card p-12 text-center">
        <i className="fas fa-calendar-xmark text-5xl text-gray-300 mb-4 block" />
        <p className="text-gray-600 text-lg mb-1">No hay relevamiento activo</p>
        <p className="text-gray-400 text-sm mb-4">{error}</p>
        <a href="/admin/ocupacion/relevamientos" className="btn-primary inline-block">
          <i className="fas fa-plus mr-1" />Crear relevamiento
        </a>
      </div>
    )
  }

  // ── UI Principal ────────────────────────────────────────────────────────
  const cargadosCount = cargas.length
  const pendientesCount = alojamientos.length - cargadosCount
  const pctCargado = alojamientos.length > 0 ? Math.round((cargadosCount / alojamientos.length) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Header con progreso */}
      <div className="card p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <i className="fas fa-play-circle text-green-500" />
            {tituloRelevamiento(relevamiento!.tipo, relevamiento!.nombre, relevamiento!.fechaInicio)}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {relevamiento!.tipo} • {formatearRango(relevamiento!.fechaInicio, relevamiento!.fechaFin)}
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="text-center">
            <p className="text-2xl font-bold text-accent">{cargadosCount}</p>
            <p className="text-xs text-gray-400">Cargados</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-400">{pendientesCount}</p>
            <p className="text-xs text-gray-400">Pendientes</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-600">{alojamientos.length}</p>
            <p className="text-xs text-gray-400">Total</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{pctCargado}%</p>
            <p className="text-xs text-gray-400">Cargado</p>
          </div>
          {/* Barra de progreso simple */}
          <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-500"
              style={{ width: `${pctCargado}%` }}
            />
          </div>
        </div>
      </div>

      {/* Formulario de carga */}
      <form onSubmit={handleSubmit} className="card p-5 space-y-4">
        <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
          <i className="fas fa-cloud-upload-alt text-accent" />
          Nueva carga
        </h3>

        {formError && <p className="text-sm text-red-600 bg-red-50 p-2.5 rounded flex items-center gap-2"><i className="fas fa-exclamation-circle" /> {formError}</p>}
        {formOk && <p className="text-sm text-green-700 bg-green-50 p-2.5 rounded flex items-center gap-2"><i className="fas fa-check-circle" /> {formOk}</p>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Selector de alojamiento (con búsqueda) */}
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-500 font-medium mb-1">Alojamiento</label>

            {/* Filtros */}
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre, tipo o categoría..."
                className="input flex-1 text-sm"
              />
              <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="input w-40 text-sm">
                <option value="">Todos los tipos</option>
                {tiposUnicos.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <select
              value={selectedAlojamientoId}
              onChange={(e) => setSelectedAlojamientoId(e.target.value)}
              className="input w-full text-sm"
              size={8}
              required
            >
              <option value="">— Seleccionar alojamiento —</option>
              {alojamientosFiltrados.map(a => {
                const yaCargado = cargadosIds.has(String(a.id))
                return (
                  <option key={a.id} value={a.id} disabled={yaCargado} className={yaCargado ? 'text-gray-300' : ''}>
                    {a.nombre} — {a.tipo} {a.categoria ? `(${a.categoria})` : ''} — {a.capacidadHab} hab.
                    {yaCargado ? ' ✓ Ya cargado' : ''}
                  </option>
                )
              })}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              {alojamientosFiltrados.length} alojamientos • Los ya cargados aparecen deshabilitados
            </p>
          </div>

          {/* % OH + submit */}
          <div className="flex flex-col justify-end gap-2">
            <label className="block text-xs text-gray-500 font-medium">
              % Ocupación
              <span className="text-gray-300 ml-1">(0–100)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={porcentajeOH}
                onChange={(e) => setPorcentajeOH(e.target.value)}
                min="0"
                max="100"
                step="0.1"
                placeholder="0–100%"
                className="input w-24 text-sm text-center"
                required
              />
              <button
                type="submit"
                disabled={submitting || !selectedAlojamientoId || porcentajeOH === ''}
                className="btn-primary text-sm flex-1 disabled:opacity-50"
              >
                {submitting ? (
                  <><i className="fas fa-spinner fa-spin mr-1" />Cargando</>
                ) : (
                  <><i className="fas fa-check mr-1" />Cargar</>
                )}
              </button>
            </div>
            {/* Presets rápidos */}
            <div className="flex gap-1 mt-1">
              {[0, 25, 50, 75, 100].map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setPorcentajeOH(String(v))}
                  className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                    porcentajeOH === String(v)
                      ? 'border-accent bg-accent/10 text-accent font-semibold'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {v}%
                </button>
              ))}
            </div>
          </div>
        </div>
      </form>

      {/* Tabla de cargas realizadas */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <i className="fas fa-list-check text-accent" />
            Cargas realizadas ({cargadosCount})
          </h3>
          <button onClick={() => relevamiento && loadCargas(relevamiento.id)} className="text-xs text-gray-400 hover:text-accent transition-colors">
            <i className="fas fa-sync-alt mr-1" />Actualizar
          </button>
        </div>

        {cargas.length === 0 ? (
          <p className="text-sm text-gray-400 italic py-4">
            Todavía no hay cargas. Seleccioná un alojamiento arriba y cargá el porcentaje de ocupación.
          </p>
        ) : (
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 sticky top-0 bg-white">
                <tr className="text-left text-gray-500 text-xs uppercase tracking-wide">
                  <th className="pb-2 font-medium">Alojamiento</th>
                  <th className="pb-2 font-medium">Tipo</th>
                  <th className="pb-2 font-medium">Categoría</th>
                  <th className="pb-2 font-medium text-right">% OH</th>
                  <th className="pb-2 font-medium text-right">Hab.</th>
                  <th className="pb-2 font-medium">Hora</th>
                </tr>
              </thead>
              <tbody>
                {cargas.map((c: any, idx: number) => {
                  const id = c.ID || c.id || idx
                  const pct = c.PorcentajeOH ?? c.porcentajeOH ?? 0
                  const esCero = pct === 0
                  return (
                    <tr key={id} className={`border-b border-gray-50 ${esCero ? 'bg-amber-50/50' : ''}`}>
                      <td className="py-2 font-medium text-gray-800">
                        {c.AlojamientoNombre || c.alojamientoNombre}
                        {esCero && <span className="ml-2 text-xs text-amber-600 font-normal italic">0% explícito</span>}
                      </td>
                      <td className="py-2 text-gray-600">{c.Tipo || c.tipo || '—'}</td>
                      <td className="py-2 text-gray-600">{c.Categoria || c.categoria || '—'}</td>
                      <td className="py-2 text-right">
                        <span className={`font-semibold ${pct > 0 ? 'text-accent' : esCero ? 'text-amber-600' : 'text-gray-400'}`}>
                          {pct}%
                        </span>
                      </td>
                      <td className="py-2 text-right text-gray-600">{c.CapacidadHab ?? c.capacidadHab ?? '—'}</td>
                      <td className="py-2 text-gray-500 text-xs">
                        {formatearFecha(c.FechaCarga || c.fechaCarga)} {(c.HoraCarga || c.horaCarga || '').substring(0, 5)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
