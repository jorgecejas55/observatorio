'use client'

import { ESTADO_COLORS, type Evento } from '@/config/eventConfig'

interface EventCardProps {
  evento: Evento
  onEdit: (e: Evento) => void
  onView: (e: Evento) => void
  onDelete: (id: string) => void
}

function formatDate(d: string) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('es-AR') } catch { return d }
}

export default function EventCard({ evento, onEdit, onView, onDelete }: EventCardProps) {
  return (
    <div className="card p-4 hover:shadow-lg transition-all group">
      {/* Header con estado y acciones */}
      <div className="flex items-start justify-between mb-3">
        <span className={`badge ${ESTADO_COLORS[evento.estado] ?? 'bg-gray-100 text-gray-700'}`}>
          {evento.estado}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onView(evento)}
            className="w-8 h-8 rounded-lg hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center transition-colors text-text-secondary"
            title="Ver detalle"
          >
            <i className="fa-solid fa-eye text-xs" />
          </button>
          <button
            onClick={() => onEdit(evento)}
            className="w-8 h-8 rounded-lg hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-colors text-text-secondary"
            title="Editar"
          >
            <i className="fa-solid fa-pen text-xs" />
          </button>
          <button
            onClick={() => onDelete(evento.id)}
            className="w-8 h-8 rounded-lg hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors text-text-secondary"
            title="Eliminar"
          >
            <i className="fa-solid fa-trash text-xs" />
          </button>
        </div>
      </div>

      {/* Título y generador */}
      <button
        onClick={() => onView(evento)}
        className="text-left w-full mb-3 group-hover:text-primary transition-colors"
      >
        <h3 className="font-bold text-text-primary line-clamp-2 mb-1">{evento.denominacion}</h3>
        {evento.generador && (
          <p className="text-sm text-text-secondary line-clamp-1">{evento.generador}</p>
        )}
      </button>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        {/* Tipo */}
        <div>
          <p className="text-xs text-text-secondary uppercase tracking-wider mb-0.5">Tipo</p>
          <p className="font-medium text-text-primary truncate">{evento.tipo}</p>
          {evento.subtipo && <p className="text-xs text-text-secondary truncate">{evento.subtipo}</p>}
        </div>

        {/* Fecha */}
        <div>
          <p className="text-xs text-text-secondary uppercase tracking-wider mb-0.5">Inicio</p>
          <p className="font-medium text-text-primary">{formatDate(evento.fechaInicio)}</p>
          {evento.fechaFin && evento.fechaFin !== evento.fechaInicio && (
            <p className="text-xs text-text-secondary">→ {formatDate(evento.fechaFin)}</p>
          )}
        </div>

        {/* Sede */}
        {evento.sede && (
          <div className="col-span-2">
            <p className="text-xs text-text-secondary uppercase tracking-wider mb-0.5">Sede</p>
            <p className="font-medium text-text-primary truncate">{evento.sede}</p>
          </div>
        )}

        {/* Asistentes */}
        {evento.totalAsistentes && (
          <div>
            <p className="text-xs text-text-secondary uppercase tracking-wider mb-0.5">Asistentes</p>
            <p className="font-bold text-primary">
              <i className="fa-solid fa-users text-xs mr-1" />
              {Number(evento.totalAsistentes).toLocaleString('es-AR')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
