'use client'

import { ESTADO_COLORS, type Evento } from '@/config/eventConfig'

function formatDate(d: string) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' }) }
  catch { return d }
}

function formatMoney(v: string) {
  const n = parseFloat(v)
  if (isNaN(n)) return '—'
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
}

function Row({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-3 py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary sm:w-44 flex-shrink-0">{label}</span>
      <span className="text-sm text-text-primary">{value || '—'}</span>
    </div>
  )
}

function Section({ titulo, icono, children }: { titulo: string; icono: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary mb-3">
        <i className={`fa-solid ${icono}`} />{titulo}
      </h4>
      {children}
    </div>
  )
}

interface EventDetailProps {
  evento: Evento
  onClose: () => void
  onEdit: (e: Evento) => void
}

export default function EventDetail({ evento, onClose, onEdit }: EventDetailProps) {
  const tot = Number(evento.totalAsistentes) || 0
  const res = Number(evento.totalResidentes) || 0
  const noRes = Number(evento.totalNoResidentes) || 0
  const pctForaneos = tot ? Math.round((noRes / tot) * 100) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-8 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">

        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`badge ${ESTADO_COLORS[evento.estado] ?? 'bg-gray-100 text-gray-700'}`}>
                  {evento.estado}
                </span>
                {evento.prioridad && (
                  <span className={`badge ${evento.prioridad === 'Alta' ? 'bg-red-100 text-red-600' : evento.prioridad === 'Media' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                    Prioridad {evento.prioridad}
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold text-text-primary">{evento.denominacion}</h2>
              {evento.generador && <p className="text-sm text-text-secondary">{evento.generador}</p>}
            </div>
            <button onClick={onClose} className="btn-ghost w-9 h-9 rounded-full p-0 flex-shrink-0">
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        </div>

        <div className="p-6 max-h-[65vh] overflow-y-auto space-y-2">

          <Section titulo="Identificación" icono="fa-info-circle">
            <Row label="Tipo" value={[evento.tipo, evento.subtipo].filter(Boolean).join(' › ')} />
            <Row label="Origen" value={evento.origen} />
            <Row label="Sede" value={[evento.sede, evento.tipoSede].filter(Boolean).join(' — ')} />
            <Row label="Fechas" value={evento.fechaInicio
              ? `${formatDate(evento.fechaInicio)}${evento.fechaFin ? ` → ${formatDate(evento.fechaFin)}` : ''}`
              : undefined} />
            <Row label="Duración" value={evento.duracion ? `${evento.duracion} días` : undefined} />
            <Row label="Periodicidad" value={evento.periodicidad} />
            <Row label="Fuente" value={evento.fuente} />
          </Section>

          {evento.referente && (
            <Section titulo="Contacto" icono="fa-address-card">
              <Row label="Referente" value={evento.referente} />
              <Row label="Email" value={evento.email} />
              <Row label="Teléfono" value={evento.telefono} />
            </Section>
          )}

          <Section titulo="Evaluación" icono="fa-clipboard-check">
            <Row label="Aprobación agenda" value={evento.aprobacionAgenda} />
            <Row label="Solicita asistencia" value={evento.solicitaAsistencia} />
            {evento.detallesAsistenciaSolicitada && <Row label="Asistencia solicitada" value={evento.detallesAsistenciaSolicitada} />}
            {evento.detallesAsistenciaAsignada && <Row label="Asistencia asignada" value={evento.detallesAsistenciaAsignada} />}
            <Row label="Derivado" value={evento.derivado} />
            {evento.detallesDerivacion && <Row label="Detalles derivación" value={evento.detallesDerivacion} />}
            <Row label="Presencia física STDE" value={evento.presenciaFisica} />
          </Section>

          {(tot > 0 || evento.inversionSTDE || evento.recaudacion) && (
            <Section titulo="Resultados e impacto" icono="fa-chart-bar">
              {tot > 0 && (
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: 'Total', value: tot.toLocaleString('es-AR'), icon: 'fa-users', color: 'text-primary' },
                    { label: 'Residentes', value: res.toLocaleString('es-AR'), icon: 'fa-house', color: 'text-blue-600' },
                    { label: `Foráneos (${pctForaneos}%)`, value: noRes.toLocaleString('es-AR'), icon: 'fa-plane', color: 'text-orange-500' },
                  ].map(k => (
                    <div key={k.label} className="bg-gray-50 rounded-xl p-3 text-center">
                      <i className={`fa-solid ${k.icon} ${k.color} mb-1 block`} />
                      <p className="text-lg font-bold text-text-primary">{k.value}</p>
                      <p className="text-xs text-text-secondary">{k.label}</p>
                    </div>
                  ))}
                </div>
              )}
              <Row label="Inversión STDE" value={evento.inversionSTDE ? formatMoney(evento.inversionSTDE) : undefined} />
              <Row label="Inversión generador" value={evento.inversionGenerador ? formatMoney(evento.inversionGenerador) : undefined} />
              <Row label="Recaudación" value={evento.recaudacion ? formatMoney(evento.recaudacion) : undefined} />
              {evento.observaciones && <Row label="Observaciones" value={evento.observaciones} />}
            </Section>
          )}

          {evento.fechaCreacion && (
            <p className="text-xs text-text-secondary text-right">
              Creado {formatDate(evento.fechaCreacion)} por {evento.creadoPor || '—'}
              {evento.fechaModificacion && ` · Modificado ${formatDate(evento.fechaModificacion)}`}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="btn-ghost">Cerrar</button>
          <button onClick={() => onEdit(evento)} className="btn-primary">
            <i className="fa-solid fa-pen" /> Editar
          </button>
        </div>
      </div>
    </div>
  )
}
