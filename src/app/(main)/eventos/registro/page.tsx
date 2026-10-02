'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import * as XLSX from 'xlsx'
import EventForm from '@/components/eventos/EventForm'
import EventosTable from '@/components/eventos/EventosTable'
import EventDetail from '@/components/eventos/EventDetail'
import Toast from '@/components/shared/Toast'
import { ESTADOS, TIPOS, type Evento, type ArchivoEvento } from '@/config/eventConfig'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toCamel(obj: Record<string, unknown>): Evento {
  const map: Record<string, string> = {
    tipo_sede: 'tipoSede', fecha_inicio: 'fechaInicio', fecha_fin: 'fechaFin',
    aprobacion_agenda: 'aprobacionAgenda', solicita_asistencia: 'solicitaAsistencia',
    detalles_asistencia_solicitada: 'detallesAsistenciaSolicitada',
    detalles_asistencia_asignada: 'detallesAsistenciaAsignada',
    detalles_derivacion: 'detallesDerivacion', presencia_fisica: 'presenciaFisica',
    total_asistentes: 'totalAsistentes', total_residentes: 'totalResidentes',
    total_no_residentes: 'totalNoResidentes', inversion_stde: 'inversionSTDE',
    inversion_generador: 'inversionGenerador', creado_por: 'creadoPor',
    fecha_creacion: 'fechaCreacion', modificado_por: 'modificadoPor',
    fecha_modificacion: 'fechaModificacion',
  }
  const result: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    result[map[k] ?? k] = v
  }
  return result as unknown as Evento
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function RegistroEventosPage() {
  const { data: session } = useSession()

  const [eventos, setEventos] = useState<Evento[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editando, setEditando] = useState<Evento | null>(null)
  const [viendo, setViendo] = useState<Evento | null>(null)

  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [minAsistentes, setMinAsistentes] = useState('')
  const [maxAsistentes, setMaxAsistentes] = useState('')
  const [filtroRapido, setFiltroRapido] = useState<'este-mes' | 'este-año' | 'proximos' | ''>('')

  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 20

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null)

  // ── Cargar eventos ────────────────────────────────────────────────────────

  const cargarEventos = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/eventos')
      const data = await res.json()
      const lista = Array.isArray(data) ? data : (data.data ?? [])
      setEventos(lista.map((e: Record<string, unknown>) => toCamel(e)))
    } catch (err) {
      setError('No se pudieron cargar los eventos. Verificá la conexión.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargarEventos()
  }, [cargarEventos])

  useEffect(() => {
    setCurrentPage(1)
  }, [busqueda, filtroEstado, filtroTipo, fechaDesde, fechaHasta, minAsistentes, maxAsistentes])

  // ── Filtrado ──────────────────────────────────────────────────────────────

  const eventosFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase()
    return eventos.filter(ev => {
      if (q && !['denominacion', 'generador', 'sede', 'tipo', 'observaciones'].some(
        k => String(ev[k as keyof Evento] ?? '').toLowerCase().includes(q)
      )) return false
      if (filtroEstado && ev.estado !== filtroEstado) return false
      if (filtroTipo && ev.tipo !== filtroTipo) return false
      if (fechaDesde && ev.fechaInicio && ev.fechaInicio < fechaDesde) return false
      if (fechaHasta && ev.fechaInicio && ev.fechaInicio > fechaHasta) return false
      const asistentes = parseInt(ev.totalAsistentes) || 0
      if (minAsistentes && asistentes < parseInt(minAsistentes)) return false
      if (maxAsistentes && asistentes > parseInt(maxAsistentes)) return false
      return true
    })
  }, [eventos, busqueda, filtroEstado, filtroTipo, fechaDesde, fechaHasta, minAsistentes, maxAsistentes])

  const totalPages = Math.ceil(eventosFiltrados.length / ITEMS_PER_PAGE)
  const eventosPaginados = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return eventosFiltrados.slice(start, start + ITEMS_PER_PAGE)
  }, [eventosFiltrados, currentPage])

  const filtrosActivos = [
    filtroEstado, filtroTipo, fechaDesde, fechaHasta, minAsistentes, maxAsistentes
  ].filter(Boolean).length

  // ── Export Excel ──────────────────────────────────────────────────────────

  const exportarXLSX = useCallback(() => {
    if (eventosFiltrados.length === 0) {
      setToast({ message: 'No hay eventos para exportar', type: 'info' })
      return
    }

    const datos = eventosFiltrados.map(ev => ({
      'Estado': ev.estado || '',
      'Fuente': ev.fuente || '',
      'Denominación': ev.denominacion || '',
      'Generador': ev.generador || '',
      'Origen': ev.origen || '',
      'Tipo': ev.tipo || '',
      'Subtipo': ev.subtipo || '',
      'Sede': ev.sede || '',
      'Tipo de sede': ev.tipoSede || '',
      'Fecha inicio': ev.fechaInicio || '',
      'Fecha fin': ev.fechaFin || '',
      'Duración (días)': ev.duracion || '',
      'Periodicidad': ev.periodicidad || '',
      'Referente': ev.referente || '',
      'Email': ev.email || '',
      'Teléfono': ev.telefono || '',
      'Prioridad': ev.prioridad || '',
      'Aprobación en agenda': ev.aprobacionAgenda || '',
      'Solicita asistencia STDE': ev.solicitaAsistencia || '',
      'Detalles asistencia solicitada': ev.detallesAsistenciaSolicitada || '',
      'Detalles asistencia asignada': ev.detallesAsistenciaAsignada || '',
      'Derivado': ev.derivado || '',
      'Detalles derivación': ev.detallesDerivacion || '',
      'Presencia física STDE': ev.presenciaFisica || '',
      'Total asistentes': ev.totalAsistentes || '',
      'Residentes': ev.totalResidentes || '',
      'No residentes': ev.totalNoResidentes || '',
      'Inversión STDE ($)': ev.inversionSTDE || '',
      'Inversión generador ($)': ev.inversionGenerador || '',
      'Recaudación ($)': ev.recaudacion || '',
      'Observaciones': ev.observaciones || '',
      'Creado por': ev.creadoPor || '',
      'Fecha creación': ev.fechaCreacion || '',
      'Modificado por': ev.modificadoPor || '',
      'Fecha modificación': ev.fechaModificacion || '',
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(datos)
    ws['!cols'] = Object.keys(datos[0]).map(col => ({ wch: Math.min(Math.max(col.length, 14), 35) }))
    XLSX.utils.book_append_sheet(wb, ws, 'Eventos')

    const fecha = new Date().toISOString().split('T')[0]
    XLSX.writeFile(wb, `eventos-turisticos-${fecha}.xlsx`)

    setToast({ message: `${eventosFiltrados.length} evento${eventosFiltrados.length !== 1 ? 's' : ''} exportado${eventosFiltrados.length !== 1 ? 's' : ''} (Excel)`, type: 'success' })
  }, [eventosFiltrados])

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async function handleSave(formData: Omit<Evento, 'id' | 'creadoPor' | 'fechaCreacion' | 'modificadoPor' | 'fechaModificacion'>) {
    try {
      if (editando) {
        const res = await fetch(`/api/eventos/${editando.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        if (!res.ok) throw new Error('Error al actualizar')
      } else {
        const res = await fetch('/api/eventos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        if (!res.ok) throw new Error('Error al crear')
      }

      setFormOpen(false)
      setEditando(null)
      await cargarEventos()
      setToast({
        message: editando ? 'Evento actualizado exitosamente' : 'Evento creado exitosamente',
        type: 'success'
      })
    } catch (err) {
      setToast({ message: 'Error al guardar el evento. Intentá nuevamente.', type: 'error' })
      console.error(err)
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/eventos/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar')
      await cargarEventos()
      setToast({ message: 'Evento eliminado exitosamente', type: 'success' })
    } catch (err) {
      setToast({ message: 'Error al eliminar el evento. Intentá nuevamente.', type: 'error' })
      console.error(err)
    }
  }

  function handleEdit(ev: Evento) {
    setViendo(null)
    setEditando(ev)
    setFormOpen(true)
  }

  // ── Filtros rápidos ───────────────────────────────────────────────────────

  function aplicarFiltroRapido(tipo: 'este-mes' | 'este-año' | 'proximos') {
    const hoy = new Date()
    const año = hoy.getFullYear()
    const mes = hoy.getMonth()

    if (tipo === 'este-mes') {
      setFechaDesde(new Date(año, mes, 1).toISOString().split('T')[0])
      setFechaHasta(new Date(año, mes + 1, 0).toISOString().split('T')[0])
      setFiltroRapido('este-mes')
    } else if (tipo === 'este-año') {
      setFechaDesde(new Date(año, 0, 1).toISOString().split('T')[0])
      setFechaHasta(new Date(año, 11, 31).toISOString().split('T')[0])
      setFiltroRapido('este-año')
    } else if (tipo === 'proximos') {
      setFechaDesde(hoy.toISOString().split('T')[0])
      setFechaHasta('')
      setFiltroRapido('proximos')
    }
  }

  function handleFechaDesdeChange(value: string) {
    setFechaDesde(value)
    if (filtroRapido) setFiltroRapido('')
  }

  function handleFechaHastaChange(value: string) {
    setFechaHasta(value)
    if (filtroRapido) setFiltroRapido('')
  }

  function limpiarFiltros() {
    setBusqueda('')
    setFiltroEstado('')
    setFiltroTipo('')
    setFechaDesde('')
    setFechaHasta('')
    setMinAsistentes('')
    setMaxAsistentes('')
    setFiltroRapido('')
    setCurrentPage(1)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Encabezado */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="section-title">Registro de Eventos</h2>
          <p className="text-text-secondary text-sm -mt-6">
            {loading ? 'Cargando...' : (
              <>
                <span className="font-semibold text-primary">{eventosFiltrados.length}</span> evento{eventosFiltrados.length !== 1 ? 's' : ''}
                {filtrosActivos > 0 && <span className="text-xs ml-2">({filtrosActivos} filtro{filtrosActivos > 1 ? 's' : ''} activo{filtrosActivos > 1 ? 's' : ''})</span>}
                {eventosFiltrados.length !== eventos.length && (
                  <span className="text-xs ml-2">de {eventos.length} total{eventos.length !== 1 ? 'es' : ''}</span>
                )}
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {session?.user && (
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
              <i className="fa-solid fa-user text-primary text-sm" />
              <span className="text-sm text-text-primary font-medium">
                {session.user.name || session.user.email}
              </span>
            </div>
          )}
          <button onClick={exportarXLSX} className="btn-outline" title="Descargar Excel con los eventos filtrados">
            <i className="fa-solid fa-file-excel" /> Exportar Excel
          </button>
          <button onClick={() => { setEditando(null); setFormOpen(true) }} className="btn-primary">
            <i className="fa-solid fa-plus" /> Nuevo evento
          </button>
        </div>
      </div>

      {error && (
        <div className="card p-4 mb-4 border-red-200 bg-red-50 flex items-center gap-3">
          <i className="fa-solid fa-triangle-exclamation text-red-500" />
          <p className="text-sm text-red-700 flex-1">{error}</p>
          <button onClick={cargarEventos} className="btn-ghost text-red-600 text-xs">
            <i className="fa-solid fa-rotate-right" /> Reintentar
          </button>
        </div>
      )}

      {/* Búsqueda y filtros */}
      <div className="card p-4 mb-4">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-64">
              <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm" />
              <input
                type="text"
                placeholder="Buscar por nombre, generador, sede..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className="input pl-9"
              />
            </div>
            <button onClick={cargarEventos} className="btn-ghost" title="Actualizar datos">
              <i className="fa-solid fa-rotate-right" />
            </button>
            {(busqueda || filtrosActivos > 0) && (
              <button onClick={limpiarFiltros} className="btn-ghost text-red-500 hover:bg-red-50">
                <i className="fa-solid fa-filter-circle-xmark" /> Limpiar filtros
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-text-secondary font-semibold uppercase tracking-wider">Filtros rápidos:</span>
            {(['este-mes', 'este-año', 'proximos'] as const).map(tipo => (
              <button
                key={tipo}
                onClick={() => aplicarFiltroRapido(tipo)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filtroRapido === tipo ? 'bg-primary text-white' : 'bg-gray-100 text-text-primary hover:bg-gray-200'
                }`}
              >
                <i className={`fa-solid ${tipo === 'este-mes' ? 'fa-calendar-day' : tipo === 'este-año' ? 'fa-calendar' : 'fa-calendar-arrow-up'} mr-1.5`} />
                {tipo === 'este-mes' ? 'Este mes' : tipo === 'este-año' ? 'Este año' : 'Próximos'}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="input bg-white w-auto min-w-40">
              <option value="">Todos los estados</option>
              {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="input bg-white w-auto min-w-48">
              <option value="">Todos los tipos</option>
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <div className="text-xs text-text-secondary font-semibold uppercase tracking-wider">Fechas personalizadas:</div>
            <input type="date" value={fechaDesde} onChange={e => handleFechaDesdeChange(e.target.value)} className="input w-auto" />
            <span className="text-text-secondary">→</span>
            <input type="date" value={fechaHasta} onChange={e => handleFechaHastaChange(e.target.value)} className="input w-auto" />
            <div className="w-px h-6 bg-gray-200" />
            <div className="text-xs text-text-secondary font-semibold uppercase tracking-wider">Asistentes:</div>
            <input type="number" value={minAsistentes} onChange={e => setMinAsistentes(e.target.value)} placeholder="Mín" className="input w-24" min="0" />
            <span className="text-text-secondary">-</span>
            <input type="number" value={maxAsistentes} onChange={e => setMaxAsistentes(e.target.value)} placeholder="Máx" className="input w-24" min="0" />
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="card">
        <EventosTable
          eventos={eventosPaginados}
          loading={loading}
          onEdit={handleEdit}
          onView={ev => setViendo(ev)}
          onDelete={handleDelete}
          totalEventos={eventosFiltrados.length}
        />

        {!loading && eventosFiltrados.length > ITEMS_PER_PAGE && (
          <div className="px-4 py-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-sm text-text-secondary">
              Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, eventosFiltrados.length)} de {eventosFiltrados.length}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100">
                <i className="fa-solid fa-angles-left text-sm" />
              </button>
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100">
                <i className="fa-solid fa-angle-left text-sm" />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1))
                  .map((page, index, array) => {
                    const prevPage = array[index - 1]
                    const showEllipsis = prevPage && page > prevPage + 1
                    return (
                      <React.Fragment key={page}>
                        {showEllipsis && <span className="px-2 text-text-secondary">...</span>}
                        <button
                          onClick={() => setCurrentPage(page)}
                          className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-medium transition-colors ${
                            currentPage === page ? 'bg-primary text-white' : 'hover:bg-gray-100 text-text-primary'
                          }`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    )
                  })}
              </div>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100">
                <i className="fa-solid fa-angle-right text-sm" />
              </button>
              <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100">
                <i className="fa-solid fa-angles-right text-sm" />
              </button>
            </div>
            <div className="text-sm text-text-secondary hidden sm:block">Página {currentPage} de {totalPages}</div>
          </div>
        )}
      </div>

      {formOpen && (
        <EventForm
          evento={editando}
          onSave={handleSave}
          onClose={() => { setFormOpen(false); setEditando(null) }}
        />
      )}

      {viendo && (
        <EventDetail
          evento={viendo}
          onClose={() => setViendo(null)}
          onEdit={handleEdit}
          onArchivosCambiaron={(archivos: ArchivoEvento[]) => {
            setViendo(prev => prev ? { ...prev, archivos_drive: JSON.stringify(archivos) } : prev)
            cargarEventos()
          }}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
