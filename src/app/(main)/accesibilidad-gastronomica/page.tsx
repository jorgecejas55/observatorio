'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  GastronomiaAccesibilidadDirectus,
  nivelAccesibilidadGastronomia,
  tieneAccesibilidadCargada,
} from '@/lib/accesibilidad-gastronomia'

const DIRECTUS_ASSETS = 'https://turismo.apps.cc.gob.ar/assets'

const NECESIDADES = ['Movilidad Reducida', 'Audición Reducida', 'Visión Reducida']
const MENUS_ACCESIBILIDAD = ['Menú para celíacos', 'Menú vegetariano', 'Menú vegano']
const MENUS_LABELS: Record<string, string> = {
  'Menú para celíacos': 'Celíaco',
  'Menú vegetariano': 'Vegetariano',
  'Menú vegano': 'Vegano',
}
const NECESIDADES_COLORS: Record<string, string> = {
  'Movilidad Reducida': 'bg-blue-100 text-blue-700',
  'Audición Reducida': 'bg-orange-100 text-orange-700',
  'Visión Reducida': 'bg-purple-100 text-purple-700',
}
const NECESIDADES_LABELS: Record<string, string> = {
  'Movilidad Reducida': 'Movilidad',
  'Audición Reducida': 'Audición',
  'Visión Reducida': 'Visión',
}

function chipSiNo(valor: string | null) {
  if (!valor) return null
  const map: Record<string, string> = {
    'Sí': 'bg-emerald-100 text-emerald-700',
    'No': 'bg-red-100 text-red-700',
    'Sin dato': 'bg-gray-100 text-gray-500',
  }
  const cls = map[valor] ?? 'bg-gray-100 text-gray-500'
  return <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${cls}`}>{valor}</span>
}

function SkeletonTarjeta() {
  return (
    <div className="card overflow-hidden animate-pulse">
      <div className="h-36 bg-gray-200" />
      <div className="p-4 flex flex-col gap-3">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
        <div className="h-5 bg-gray-200 rounded w-1/3" />
        <div className="flex gap-2">
          <div className="h-5 bg-gray-100 rounded-full w-16" />
          <div className="h-5 bg-gray-100 rounded-full w-16" />
        </div>
      </div>
    </div>
  )
}

function TarjetaGastronomia({ r }: { r: GastronomiaAccesibilidadDirectus }) {
  const nivel = nivelAccesibilidadGastronomia(r)
  const fotoUrl = r.foto_principal
    ? `${DIRECTUS_ASSETS}/${r.foto_principal}?width=400&height=200&fit=cover`
    : null
  const necesidades = Array.isArray(r.accesibilidad) ? r.accesibilidad : []
  const menus = Array.isArray(r.opciones_de_menu)
    ? r.opciones_de_menu.filter(m => MENUS_ACCESIBILIDAD.includes(m))
    : []

  return (
    <div className="card flex flex-col overflow-hidden hover:shadow-md transition-shadow">
      <div className="h-36 bg-gray-100 overflow-hidden flex-shrink-0">
        {fotoUrl ? (
          <img
            src={fotoUrl}
            alt={r.denominacion}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <i className="fa-solid fa-utensils text-3xl" />
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1 gap-2.5">
        <div>
          <h3 className="text-sm font-semibold text-text-primary leading-tight">{r.denominacion}</h3>
          {r.tipo && (
            <span className="inline-block mt-1 text-[10px] px-2 py-0.5 bg-gray-100 text-text-secondary rounded-full">
              {r.tipo}
            </span>
          )}
          {r.direccion && (
            <p className="text-xs text-text-secondary mt-1 flex items-center gap-1">
              <i className="fa-solid fa-location-dot text-[10px]" />
              {r.direccion}
            </p>
          )}
        </div>

        <div>
          <p className="text-[10px] text-text-secondary mb-0.5">Accesibilidad general</p>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${nivel.bg} ${nivel.textColor}`}>
            {nivel.label}
          </span>
        </div>

        {necesidades.length > 0 && (
          <div>
            <p className="text-[10px] text-text-secondary mb-0.5">Necesidades atendidas</p>
            <div className="flex flex-wrap gap-1">
              {necesidades.map(n => (
                <span key={n} className={`text-xs px-2 py-0.5 rounded-full font-medium ${NECESIDADES_COLORS[n] ?? 'bg-gray-100 text-gray-600'}`}>
                  {NECESIDADES_LABELS[n] ?? n}
                </span>
              ))}
            </div>
          </div>
        )}

        {menus.length > 0 && (
          <div>
            <p className="text-[10px] text-text-secondary mb-0.5">Menús inclusivos</p>
            <div className="flex flex-wrap gap-1">
              {menus.map(m => (
                <span key={m} className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-medium">
                  {MENUS_LABELS[m] ?? m}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1 mt-auto pt-1 border-t border-border">
          <span className="text-[10px] text-text-secondary flex items-center gap-1">
            Acceso sin escalones:&nbsp;{chipSiNo(r.acceso_sin_escalones) ?? <span className="text-[10px] text-gray-400">Sin dato</span>}
          </span>
          <span className="text-[10px] text-text-secondary flex items-center gap-1">
            Baño adaptado:&nbsp;{chipSiNo(r.bano_adaptado) ?? <span className="text-[10px] text-gray-400">Sin dato</span>}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function AccesibilidadGastronomicaPage() {
  const [registros, setRegistros] = useState<GastronomiaAccesibilidadDirectus[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtros
  const [filtroBusqueda, setFiltroBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroEspecialidad, setFiltroEspecialidad] = useState('todos')
  const [filtroNecesidades, setFiltroNecesidades] = useState<string[]>([])
  const [filtroAcceso, setFiltroAcceso] = useState('todos')
  const [filtroBano, setFiltroBano] = useState('todos')
  const [filtroMenus, setFiltroMenus] = useState<string[]>([])
  const [filtroGeneral, setFiltroGeneral] = useState('todos')

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/accesibilidad-gastronomica', { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        if (data.data) setRegistros(data.data)
        else setError('No se pudieron cargar los datos')
      })
      .catch(err => {
        if (err.name !== 'AbortError') setError('Error al conectar con el servidor')
      })
      .finally(() => setCargando(false))
    return () => controller.abort()
  }, [])

  const conAccesibilidad = useMemo(
    () => registros.filter(tieneAccesibilidadCargada).length,
    [registros]
  )

  const tipos = useMemo(() => {
    const set = new Set(registros.map(r => r.tipo).filter(Boolean) as string[])
    return Array.from(set).sort()
  }, [registros])

  const especialidades = useMemo(() => {
    const set = new Set(registros.map(r => r.especialidad).filter(Boolean) as string[])
    return Array.from(set).sort()
  }, [registros])

  const registrosFiltrados = useMemo(() => {
    return registros.filter(r => {
      if (filtroBusqueda) {
        const q = filtroBusqueda.toLowerCase()
        const den = r.denominacion?.toLowerCase() ?? ''
        const dir = r.direccion?.toLowerCase() ?? ''
        if (!den.includes(q) && !dir.includes(q)) return false
      }
      if (filtroTipo !== 'todos' && r.tipo !== filtroTipo) return false
      if (filtroEspecialidad !== 'todos' && r.especialidad !== filtroEspecialidad) return false
      if (filtroNecesidades.length > 0) {
        const acc = Array.isArray(r.accesibilidad) ? r.accesibilidad : []
        if (!filtroNecesidades.every(n => acc.includes(n))) return false
      }
      if (filtroAcceso !== 'todos' && r.acceso_sin_escalones !== filtroAcceso) return false
      if (filtroBano !== 'todos' && r.bano_adaptado !== filtroBano) return false
      if (filtroMenus.length > 0) {
        const menus = Array.isArray(r.opciones_de_menu)
          ? r.opciones_de_menu.filter(m => MENUS_ACCESIBILIDAD.includes(m))
          : []
        if (!filtroMenus.every(m => menus.includes(m))) return false
      }
      if (filtroGeneral !== 'todos' && r.accesibilidad_general !== filtroGeneral) return false
      return true
    })
  }, [registros, filtroBusqueda, filtroTipo, filtroEspecialidad, filtroNecesidades, filtroAcceso, filtroBano, filtroMenus, filtroGeneral])

  const hayFiltros =
    filtroBusqueda !== '' ||
    filtroTipo !== 'todos' ||
    filtroEspecialidad !== 'todos' ||
    filtroNecesidades.length > 0 ||
    filtroAcceso !== 'todos' ||
    filtroBano !== 'todos' ||
    filtroMenus.length > 0 ||
    filtroGeneral !== 'todos'

  function limpiarFiltros() {
    setFiltroBusqueda('')
    setFiltroTipo('todos')
    setFiltroEspecialidad('todos')
    setFiltroNecesidades([])
    setFiltroAcceso('todos')
    setFiltroBano('todos')
    setFiltroMenus([])
    setFiltroGeneral('todos')
  }

  function toggleNecesidad(n: string) {
    setFiltroNecesidades(prev =>
      prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n]
    )
  }

  function toggleMenu(m: string) {
    setFiltroMenus(prev =>
      prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
    )
  }

  if (cargando) {
    return (
      <div>
        <div className="mb-6">
          <h2 className="section-title">Accesibilidad en Gastronomía</h2>
          <p className="text-text-secondary text-sm -mt-6">Cargando inventario...</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonTarjeta key={i} />)}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card p-8 text-center">
        <i className="fa-solid fa-triangle-exclamation text-red-500 text-3xl mb-4 block" />
        <p className="text-red-700 font-medium">{error}</p>
        <button onClick={() => window.location.reload()} className="btn-ghost text-primary mt-4 text-sm">
          <i className="fa-solid fa-rotate-right" /> Reintentar
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Encabezado */}
      <div className="mb-6">
        <h2 className="section-title">Accesibilidad en Gastronomía</h2>
        <p className="text-text-secondary text-sm -mt-6">
          Inventario de establecimientos con información de accesibilidad relevada en campo.
          {registros.length > 0 && (
            <> <span className="font-medium text-text-primary">{conAccesibilidad} establecimientos relevados</span> de {registros.length} en total.</>
          )}
        </p>
      </div>

      {/* Panel de filtros */}
      <div className="card p-4 mb-6 flex flex-col gap-4">
        {/* Búsqueda */}
        <div className="relative">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-xs" />
          <input
            type="text"
            placeholder="Buscar por nombre o dirección..."
            value={filtroBusqueda}
            onChange={e => setFiltroBusqueda(e.target.value)}
            className="input pl-8 w-full text-sm"
          />
        </div>

        {/* Tipo y especialidad */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5">Tipo de establecimiento</p>
            <select
              value={filtroTipo}
              onChange={e => setFiltroTipo(e.target.value)}
              className="input bg-white w-full text-sm"
            >
              <option value="todos">Todos los tipos</option>
              {tipos.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5">Especialidad</p>
            <select
              value={filtroEspecialidad}
              onChange={e => setFiltroEspecialidad(e.target.value)}
              className="input bg-white w-full text-sm"
            >
              <option value="todos">Todas las especialidades</option>
              {especialidades.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Necesidades atendidas */}
          <div>
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5">Necesidades atendidas</p>
            <div className="flex flex-col gap-1">
              {NECESIDADES.map(n => (
                <label key={n} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={filtroNecesidades.includes(n)}
                    onChange={() => toggleNecesidad(n)}
                    className="rounded"
                  />
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${NECESIDADES_COLORS[n]}`}>
                    {NECESIDADES_LABELS[n]}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Acceso y baño */}
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5">Acceso sin escalones</p>
              <div className="flex flex-wrap gap-1">
                {['todos', 'Sí', 'No', 'Sin dato'].map(v => (
                  <button
                    key={v}
                    onClick={() => setFiltroAcceso(v)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      filtroAcceso === v
                        ? 'bg-primary text-white border-primary'
                        : 'border-gray-200 text-text-secondary hover:border-primary/50'
                    }`}
                  >
                    {v === 'todos' ? 'Todos' : v}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5">Baño adaptado</p>
              <div className="flex flex-wrap gap-1">
                {['todos', 'Sí', 'No', 'Sin dato'].map(v => (
                  <button
                    key={v}
                    onClick={() => setFiltroBano(v)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      filtroBano === v
                        ? 'bg-primary text-white border-primary'
                        : 'border-gray-200 text-text-secondary hover:border-primary/50'
                    }`}
                  >
                    {v === 'todos' ? 'Todos' : v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Menús y accesibilidad general */}
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5">Menús inclusivos</p>
              <div className="flex flex-col gap-1">
                {MENUS_ACCESIBILIDAD.map(m => (
                  <label key={m} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={filtroMenus.includes(m)}
                      onChange={() => toggleMenu(m)}
                      className="rounded"
                    />
                    <span className="text-xs text-text-secondary">{MENUS_LABELS[m]}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5">Accesibilidad general</p>
              <div className="flex flex-wrap gap-1">
                {['todos', 'Plena', 'Parcial', 'En proceso'].map(v => (
                  <button
                    key={v}
                    onClick={() => setFiltroGeneral(v)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      filtroGeneral === v
                        ? 'bg-primary text-white border-primary'
                        : 'border-gray-200 text-text-secondary hover:border-primary/50'
                    }`}
                  >
                    {v === 'todos' ? 'Todos' : v}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {hayFiltros && (
          <button
            onClick={limpiarFiltros}
            className="self-start text-xs text-primary hover:underline flex items-center gap-1"
          >
            <i className="fa-solid fa-xmark" /> Limpiar filtros
          </button>
        )}
      </div>

      {/* Contador */}
      <p className="text-xs text-text-secondary mb-4">
        {registrosFiltrados.length} {registrosFiltrados.length === 1 ? 'establecimiento' : 'establecimientos'} mostrados
        {hayFiltros && ` (de ${registros.length} totales)`}
      </p>

      {/* Grid de tarjetas */}
      {registrosFiltrados.length === 0 ? (
        <div className="card p-10 text-center text-text-secondary">
          <i className="fa-solid fa-utensils text-3xl mb-3 block text-gray-300" />
          <p>Sin resultados para los filtros seleccionados</p>
          {hayFiltros && (
            <button onClick={limpiarFiltros} className="text-primary text-sm mt-2 hover:underline">
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {registrosFiltrados.map(r => (
            <TarjetaGastronomia key={r.id} r={r} />
          ))}
        </div>
      )}
    </div>
  )
}
