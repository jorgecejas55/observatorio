'use client'

import { useState, useMemo } from 'react'
import { ESTADO_COLORS, type Evento } from '@/config/eventConfig'
import EventCard from './EventCard'

type SortKey = keyof Evento
type SortDir = 'asc' | 'desc'

interface EventosTableProps {
  eventos: Evento[]
  loading: boolean
  onEdit: (e: Evento) => void
  onView: (e: Evento) => void
  onDelete: (id: string) => void
  totalEventos?: number
}

function formatDate(d: string) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('es-AR') } catch { return d }
}

export default function EventosTable({ eventos, loading, onEdit, onView, onDelete, totalEventos }: EventosTableProps) {
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'fechaCreacion', dir: 'desc' })
  const [confirm, setConfirm] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')

  const sorted = useMemo(() => {
    return [...eventos].sort((a, b) => {
      const va = String(a[sort.key] ?? '')
      const vb = String(b[sort.key] ?? '')
      return sort.dir === 'asc' ? va.localeCompare(vb, 'es') : vb.localeCompare(va, 'es')
    })
  }, [eventos, sort])

  function toggleSort(key: SortKey) {
    setSort(prev => prev.key === key
      ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      : { key, dir: 'asc' }
    )
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sort.key !== k) return <i className="fa-solid fa-sort text-gray-300 ml-1 text-xs" />
    return <i className={`fa-solid fa-sort-${sort.dir === 'asc' ? 'up' : 'down'} text-primary ml-1 text-xs`} />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-text-secondary">
        <i className="fa-solid fa-spinner fa-spin text-2xl text-primary mr-3" />
        Cargando eventos...
      </div>
    )
  }

  if (!eventos.length) {
    return (
      <div className="text-center py-20 text-text-secondary">
        <i className="fa-solid fa-calendar-xmark text-4xl text-gray-200 mb-4 block" />
        <p className="font-medium text-text-primary">No hay eventos registrados</p>
        <p className="text-sm">Usá el botón &ldquo;Nuevo evento&rdquo; para agregar el primero.</p>
      </div>
    )
  }

  function handleDeleteClick(id: string) {
    setConfirm(id)
  }

  function confirmDelete() {
    if (confirm) {
      onDelete(confirm)
      setConfirm(null)
    }
  }

  return (
    <>
      {/* Toggle view mode - Visible en todos los tamaños */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          {totalEventos !== undefined ? (
            <>
              Mostrando {eventos.length} de {totalEventos} evento{totalEventos !== 1 ? 's' : ''}
            </>
          ) : (
            <>
              {eventos.length} evento{eventos.length !== 1 ? 's' : ''}
            </>
          )}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('table')}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
              viewMode === 'table'
                ? 'bg-primary text-white'
                : 'text-text-secondary hover:bg-gray-100'
            }`}
            title="Vista tabla"
          >
            <i className="fa-solid fa-table-list text-sm" />
          </button>
          <button
            onClick={() => setViewMode('cards')}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
              viewMode === 'cards'
                ? 'bg-primary text-white'
                : 'text-text-secondary hover:bg-gray-100'
            }`}
            title="Vista tarjetas"
          >
            <i className="fa-solid fa-grip text-sm" />
          </button>
        </div>
      </div>

      {/* Vista de Cards */}
      {viewMode === 'cards' && (
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sorted.map(ev => (
              <EventCard
                key={ev.id}
                evento={ev}
                onEdit={onEdit}
                onView={onView}
                onDelete={handleDeleteClick}
              />
            ))}
          </div>
        </div>
      )}

      {/* Vista de Tabla */}
      {viewMode === 'table' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              {([
                ['denominacion', 'Denominación'],
                ['tipo', 'Tipo'],
                ['estado', 'Estado'],
                ['fechaInicio', 'Inicio'],
                ['sede', 'Sede'],
                ['totalAsistentes', 'Asistentes'],
              ] as [SortKey, string][]).map(([k, label]) => (
                <th key={k}
                  onClick={() => toggleSort(k)}
                  className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-text-secondary cursor-pointer hover:text-primary select-none whitespace-nowrap"
                >
                  {label}<SortIcon k={k} />
                </th>
              ))}
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-text-secondary">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(ev => (
              <tr key={ev.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors group">
                <td className="px-4 py-3">
                  <button onClick={() => onView(ev)}
                    className="font-medium text-text-primary hover:text-primary text-left transition-colors line-clamp-1 max-w-56">
                    {ev.denominacion}
                  </button>
                  {ev.generador && <p className="text-xs text-text-secondary">{ev.generador}</p>}
                </td>
                <td className="px-4 py-3 text-text-secondary whitespace-nowrap">
                  <p>{ev.tipo}</p>
                  {ev.subtipo && <p className="text-xs text-text-secondary">{ev.subtipo}</p>}
                </td>
                <td className="px-4 py-3">
                  <span className={`badge ${ESTADO_COLORS[ev.estado] ?? 'bg-gray-100 text-gray-700'}`}>
                    {ev.estado}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-secondary whitespace-nowrap">
                  {formatDate(ev.fechaInicio)}
                  {ev.fechaFin && ev.fechaFin !== ev.fechaInicio && (
                    <span className="text-xs block">→ {formatDate(ev.fechaFin)}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-text-secondary max-w-36 truncate">{ev.sede || '—'}</td>
                <td className="px-4 py-3 text-text-secondary text-center">
                  {ev.totalAsistentes ? Number(ev.totalAsistentes).toLocaleString('es-AR') : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onView(ev)} title="Ver detalle"
                      className="w-8 h-8 rounded-lg hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center transition-colors text-text-secondary">
                      <i className="fa-solid fa-eye text-xs" />
                    </button>
                    <button onClick={() => onEdit(ev)} title="Editar"
                      className="w-8 h-8 rounded-lg hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-colors text-text-secondary">
                      <i className="fa-solid fa-pen text-xs" />
                    </button>
                    <button onClick={() => handleDeleteClick(ev.id)} title="Eliminar"
                      className="w-8 h-8 rounded-lg hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors text-text-secondary">
                      <i className="fa-solid fa-trash text-xs" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {/* Confirm delete */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-trash text-red-500" />
            </div>
            <h3 className="text-center font-bold text-text-primary mb-2">¿Eliminar este evento?</h3>
            <p className="text-center text-sm text-text-secondary mb-6">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirm(null)} className="btn-ghost flex-1">Cancelar</button>
              <button onClick={confirmDelete}
                className="btn flex-1 bg-red-500 text-white hover:bg-red-600">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
