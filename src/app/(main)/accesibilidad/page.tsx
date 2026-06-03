'use client'

import Link from 'next/link'
import { useEffect, useState, useMemo } from 'react'
import {
  AccAtractivoDirectus,
  DIMENSIONES,
  calcularCumplimiento,
  calcularCumplimientoGeneral,
  nivelAccesibilidad,
} from '@/lib/accesibilidad'

const DIRECTUS_ASSETS = 'https://turismo.apps.cc.gob.ar/assets'

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function BarraDimension({ label, pct }: { label: string; pct: number | null }) {
  const nivel = nivelAccesibilidad(pct)
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 truncate text-text-secondary shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        {pct !== null && (
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: nivel.color }}
          />
        )}
      </div>
      <span className="w-8 text-right font-medium" style={{ color: nivel.color }}>
        {pct !== null ? `${pct}%` : '—'}
      </span>
    </div>
  )
}

function BadgeNivel({ pct }: { pct: number | null }) {
  const n = nivelAccesibilidad(pct)
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${n.bg} ${n.textColor}`}>
      {n.label}
    </span>
  )
}

function BadgeEstado({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    published: 'bg-green-100 text-green-700',
    publicado: 'bg-green-100 text-green-700',
    draft: 'bg-amber-100 text-amber-700',
    borrador: 'bg-amber-100 text-amber-700',
    archived: 'bg-gray-100 text-gray-500',
    archivado: 'bg-gray-100 text-gray-500',
  }
  const cls = map[estado?.toLowerCase()] ?? 'bg-gray-100 text-gray-600'
  const labels: Record<string, string> = {
    published: 'Publicado', publicado: 'Publicado',
    draft: 'Borrador', borrador: 'Borrador',
    archived: 'Archivado', archivado: 'Archivado',
  }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>
      {labels[estado?.toLowerCase()] ?? estado}
    </span>
  )
}

function TarjetaAtractivo({ registro }: { registro: AccAtractivoDirectus }) {
  const atractivo = registro.atractivo_id
  const fotoId = atractivo?.foto_principal?.id
  const pctGeneral = calcularCumplimientoGeneral(registro)

  return (
    <div className="card flex flex-col overflow-hidden hover:shadow-md transition-shadow">
      {/* Foto */}
      <div className="h-36 bg-gray-100 overflow-hidden flex-shrink-0">
        {fotoId ? (
          <img
            src={`${DIRECTUS_ASSETS}/${fotoId}?width=400&height=145&fit=cover`}
            alt={atractivo.nombre}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <i className="fa-solid fa-image text-3xl" />
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1 gap-3">
        {/* Header */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-text-primary leading-tight">
              {atractivo?.nombre ?? 'Sin nombre'}
            </h3>
            <BadgeEstado estado={registro.Estado ?? ''} />
          </div>
          {atractivo?.tipo_atractivos && (
            <p className="text-xs text-text-secondary mt-0.5">{atractivo.tipo_atractivos}</p>
          )}
        </div>

        {/* Score general */}
        <div className="flex items-center gap-3">
          <span
            className="text-2xl font-bold tabular-nums"
            style={{ color: nivelAccesibilidad(pctGeneral).color }}
          >
            {pctGeneral !== null ? `${pctGeneral}%` : '—'}
          </span>
          <div>
            <BadgeNivel pct={pctGeneral} />
            <p className="text-[10px] text-text-secondary mt-0.5">Cumplimiento general</p>
          </div>
        </div>

        {/* Barras por dimensión */}
        <div className="flex flex-col gap-1.5">
          {DIMENSIONES.map(dim => (
            <BarraDimension
              key={dim.key}
              label={dim.label}
              pct={calcularCumplimiento(registro, dim)}
            />
          ))}
        </div>

        {/* Footer */}
        <Link
          href={`/accesibilidad/${registro.id}`}
          className="mt-auto flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary/5 text-primary text-xs font-medium hover:bg-primary/10 transition-colors"
        >
          <i className="fa-solid fa-magnifying-glass" />
          Ver detalle completo
        </Link>
      </div>
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function AccesibilidadPage() {
  const [registros, setRegistros] = useState<AccAtractivoDirectus[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroBusqueda, setFiltroBusqueda] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/accesibilidad', { signal: controller.signal })
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

  const estados = useMemo(() => {
    const set = new Set(registros.map(r => r.Estado).filter(Boolean))
    return Array.from(set)
  }, [registros])

  const registrosFiltrados = useMemo(() => {
    return registros.filter(r => {
      if (filtroEstado !== 'todos' && r.Estado !== filtroEstado) return false
      if (filtroBusqueda) {
        const q = filtroBusqueda.toLowerCase()
        const nombre = r.atractivo_id?.nombre?.toLowerCase() ?? ''
        const tipo = r.atractivo_id?.tipo_atractivos?.toLowerCase() ?? ''
        if (!nombre.includes(q) && !tipo.includes(q)) return false
      }
      return true
    })
  }, [registros, filtroEstado, filtroBusqueda])

  const promedioGeneral = useMemo(() => {
    const vals = registrosFiltrados
      .map(r => calcularCumplimientoGeneral(r))
      .filter((v): v is number => v !== null)
    if (vals.length === 0) return null
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
  }, [registrosFiltrados])

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-text-secondary">
          <i className="fa-solid fa-spinner fa-spin text-3xl text-primary mb-4 block" />
          <p>Cargando inventario...</p>
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
        <h2 className="section-title">Accesibilidad Turística</h2>
        <p className="text-text-secondary text-sm -mt-6">
          Inventario de atractivos relevados — {registros.length} registros
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-xs text-text-secondary">Total relevados</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{registros.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-text-secondary">Mostrados</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{registrosFiltrados.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-text-secondary">Promedio general</p>
          <p className="text-2xl font-bold mt-1" style={{ color: nivelAccesibilidad(promedioGeneral).color }}>
            {promedioGeneral !== null ? `${promedioGeneral}%` : '—'}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-text-secondary">Nivel promedio</p>
          <div className="mt-2">
            <BadgeNivel pct={promedioGeneral} />
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-xs" />
          <input
            type="text"
            placeholder="Buscar atractivo..."
            value={filtroBusqueda}
            onChange={e => setFiltroBusqueda(e.target.value)}
            className="input pl-8 w-full text-sm"
          />
        </div>
        <select
          value={filtroEstado}
          onChange={e => setFiltroEstado(e.target.value)}
          className="input bg-white w-auto text-sm"
        >
          <option value="todos">Todos los estados</option>
          {estados.map(e => (
            <option key={e ?? ''} value={e ?? ''}>{e}</option>
          ))}
        </select>
      </div>

      {/* Grid de tarjetas */}
      {registrosFiltrados.length === 0 ? (
        <div className="card p-10 text-center text-text-secondary">
          <i className="fa-solid fa-wheelchair text-3xl mb-3 block text-gray-300" />
          <p>No hay atractivos que coincidan con los filtros</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {registrosFiltrados.map(r => (
            <TarjetaAtractivo key={r.id} registro={r} />
          ))}
        </div>
      )}
    </div>
  )
}
