'use client'

import React, { useState, useEffect, useMemo } from 'react'
import EventForm from '@/components/eventos/EventForm'
import EventosTable from '@/components/eventos/EventosTable'
import EventDetail from '@/components/eventos/EventDetail'
import Toast from '@/components/shared/Toast'
import LogoutConfirmModal from '@/components/eventos/LogoutConfirmModal'
import { ESTADOS, TIPOS, type Evento } from '@/config/eventConfig'
import { EventosAuthProvider, useEventosAuth } from '@/contexts/EventosAuthContext'
import EventosLoginForm from '@/components/eventos/EventosLoginForm'

// ─── Helpers ──────────────────────────────────────────────────────────────────

// fieldMapper: el Apps Script usa snake_case, el frontend camelCase
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
  return result as Evento
}

function toSnake(obj: Record<string, unknown>): Record<string, unknown> {
  const map: Record<string, string> = {
    tipoSede: 'tipo_sede', fechaInicio: 'fecha_inicio', fechaFin: 'fecha_fin',
    aprobacionAgenda: 'aprobacion_agenda', solicitaAsistencia: 'solicita_asistencia',
    detallesAsistenciaSolicitada: 'detalles_asistencia_solicitada',
    detallesAsistenciaAsignada: 'detalles_asistencia_asignada',
    detallesDerivacion: 'detalles_derivacion', presenciaFisica: 'presencia_fisica',
    totalAsistentes: 'total_asistentes', totalResidentes: 'total_residentes',
    totalNoResidentes: 'total_no_residentes', inversionSTDE: 'inversion_stde',
    inversionGenerador: 'inversion_generador',
  }
  const result: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    result[map[k] ?? k] = v
  }
  return result
}

// ─── Componente con contenido protegido ──────────────────────────────────────

function RegistroEventosContent() {
  // ⚠️ TODOS los hooks deben estar al inicio, antes de cualquier return condicional
  const { isAuthenticated, loading: authLoading, getUserInfo, logout } = useEventosAuth()

  // Estados principales
  const [eventos, setEventos] = useState<Evento[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modales
  const [formOpen, setFormOpen] = useState(false)
  const [editando, setEditando] = useState<Evento | null>(null)
  const [viendo, setViendo] = useState<Evento | null>(null)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  // Búsqueda y filtros
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [minAsistentes, setMinAsistentes] = useState('')
  const [maxAsistentes, setMaxAsistentes] = useState('')
  const [filtroRapido, setFiltroRapido] = useState<'este-mes' | 'este-año' | 'proximos' | ''>('')

  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 20

  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null)

  // ── Cargar eventos (función antes del hook para evitar warnings de exhaustive-deps) ──

  const cargarEventos = async () => {
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
  }

  // ── Filtrado client-side ──────────────────────────────────────────────────

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

  // ── Paginación ────────────────────────────────────────────────────────────

  const totalPages = Math.ceil(eventosFiltrados.length / ITEMS_PER_PAGE)
  const eventosPaginados = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return eventosFiltrados.slice(start, start + ITEMS_PER_PAGE)
  }, [eventosFiltrados, currentPage])

  const filtrosActivos = [
    filtroEstado, filtroTipo, fechaDesde, fechaHasta, minAsistentes, maxAsistentes
  ].filter(Boolean).length

  // ── Effects ────────────────────────────────────────────────────────────────

  // Cargar eventos cuando se autentica o cuando deja de estar en loading
  useEffect(() => {
    if (!authLoading && isAuthenticated()) {
      cargarEventos()
    }
  }, [authLoading, isAuthenticated]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setCurrentPage(1)
  }, [busqueda, filtroEstado, filtroTipo, fechaDesde, fechaHasta, minAsistentes, maxAsistentes])

  // ── Mostrar login si no está autenticado (DESPUÉS de todos los hooks) ───────

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-text-secondary">Verificando sesión...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated()) {
    return <EventosLoginForm />
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async function handleSave(formData: Omit<Evento, 'id' | 'creadoPor' | 'fechaCreacion' | 'modificadoPor' | 'fechaModificacion'>) {
    try {
      const snakeData = toSnake(formData as unknown as Record<string, unknown>)
      const isEditing = !!editando

      // Obtener email del usuario actual para auditoría
      const currentUser = getUserInfo()
      const userEmail = currentUser?.email || 'desconocido'

      // Agregar campo especial para la API route
      const dataWithUser = {
        ...snakeData,
        _userEmail: userEmail, // Campo especial que la API route leerá
      }

      if (isEditing) {
        const res = await fetch(`/api/eventos/${editando.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataWithUser),
        })
        if (!res.ok) throw new Error('Error al actualizar')
      } else {
        const res = await fetch('/api/eventos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataWithUser),
        })
        if (!res.ok) throw new Error('Error al crear')
      }

      setFormOpen(false)
      setEditando(null)
      await cargarEventos()

      setToast({
        message: isEditing ? 'Evento actualizado exitosamente' : 'Evento creado exitosamente',
        type: 'success'
      })
    } catch (err) {
      setToast({
        message: 'Error al guardar el evento. Intentá nuevamente.',
        type: 'error'
      })
      console.error(err)
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/eventos/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar')

      await cargarEventos()
      setToast({
        message: 'Evento eliminado exitosamente',
        type: 'success'
      })
    } catch (err) {
      setToast({
        message: 'Error al eliminar el evento. Intentá nuevamente.',
        type: 'error'
      })
      console.error(err)
    }
  }

  function handleEdit(ev: Evento) {
    setViendo(null)
    setEditando(ev)
    setFormOpen(true)
  }

  // ── Filtros rápidos de fecha ──────────────────────────────────────────────

  function aplicarFiltroRapido(tipo: 'este-mes' | 'este-año' | 'proximos') {
    const hoy = new Date()
    const año = hoy.getFullYear()
    const mes = hoy.getMonth()

    if (tipo === 'este-mes') {
      const primerDia = new Date(año, mes, 1).toISOString().split('T')[0]
      const ultimoDia = new Date(año, mes + 1, 0).toISOString().split('T')[0]
      setFechaDesde(primerDia)
      setFechaHasta(ultimoDia)
      setFiltroRapido('este-mes')
    } else if (tipo === 'este-año') {
      const primerDia = new Date(año, 0, 1).toISOString().split('T')[0]
      const ultimoDia = new Date(año, 11, 31).toISOString().split('T')[0]
      setFechaDesde(primerDia)
      setFechaHasta(ultimoDia)
      setFiltroRapido('este-año')
    } else if (tipo === 'proximos') {
      const hoyStr = hoy.toISOString().split('T')[0]
      setFechaDesde(hoyStr)
      setFechaHasta('')
      setFiltroRapido('proximos')
    }
  }

  // Manejadores de cambio manual de fechas (limpian filtro rápido)
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

  function handleLogout() {
    setShowLogoutConfirm(true)
  }

  async function confirmLogout() {
    setShowLogoutConfirm(false)
    await logout()
  }

  function cancelLogout() {
    setShowLogoutConfirm(false)
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
          {/* Info del usuario */}
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
            <i className="fa-solid fa-user text-primary text-sm" />
            <span className="text-sm text-text-primary font-medium">
              {getUserInfo()?.nombre || getUserInfo()?.email}
            </span>
            <button
              onClick={handleLogout}
              className="ml-2 text-text-secondary hover:text-red-600 transition-colors"
              title="Cerrar sesión"
            >
              <i className="fa-solid fa-right-from-bracket text-sm" />
            </button>
          </div>
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
          {/* Fila 1: Búsqueda principal */}
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

          {/* Fila 2: Filtros rápidos de fecha */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-text-secondary font-semibold uppercase tracking-wider">Filtros rápidos:</span>
            <button
              onClick={() => aplicarFiltroRapido('este-mes')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filtroRapido === 'este-mes'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-text-primary hover:bg-gray-200'
              }`}
            >
              <i className="fa-solid fa-calendar-day mr-1.5" />
              Este mes
            </button>
            <button
              onClick={() => aplicarFiltroRapido('este-año')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filtroRapido === 'este-año'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-text-primary hover:bg-gray-200'
              }`}
            >
              <i className="fa-solid fa-calendar mr-1.5" />
              Este año
            </button>
            <button
              onClick={() => aplicarFiltroRapido('proximos')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filtroRapido === 'proximos'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-text-primary hover:bg-gray-200'
              }`}
            >
              <i className="fa-solid fa-calendar-arrow-up mr-1.5" />
              Próximos
            </button>
          </div>

          {/* Fila 3: Filtros categóricos */}
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

          {/* Fila 4: Fechas personalizadas y Asistentes */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="text-xs text-text-secondary font-semibold uppercase tracking-wider">Fechas personalizadas:</div>
            <input
              type="date"
              value={fechaDesde}
              onChange={e => handleFechaDesdeChange(e.target.value)}
              className="input w-auto"
              placeholder="Desde"
            />
            <span className="text-text-secondary">→</span>
            <input
              type="date"
              value={fechaHasta}
              onChange={e => handleFechaHastaChange(e.target.value)}
              className="input w-auto"
              placeholder="Hasta"
            />

            <div className="w-px h-6 bg-gray-200" />

            <div className="text-xs text-text-secondary font-semibold uppercase tracking-wider">Asistentes:</div>
            <input
              type="number"
              value={minAsistentes}
              onChange={e => setMinAsistentes(e.target.value)}
              placeholder="Mín"
              className="input w-24"
              min="0"
            />
            <span className="text-text-secondary">-</span>
            <input
              type="number"
              value={maxAsistentes}
              onChange={e => setMaxAsistentes(e.target.value)}
              placeholder="Máx"
              className="input w-24"
              min="0"
            />
          </div>
        </div>
      </div>

      {/* Tabla con paginación */}
      <div className="card">
        <EventosTable
          eventos={eventosPaginados}
          loading={loading}
          onEdit={handleEdit}
          onView={ev => setViendo(ev)}
          onDelete={handleDelete}
          totalEventos={eventosFiltrados.length}
        />

        {/* Controles de paginación */}
        {!loading && eventosFiltrados.length > ITEMS_PER_PAGE && (
          <div className="px-4 py-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-sm text-text-secondary">
              Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, eventosFiltrados.length)} de {eventosFiltrados.length}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100"
                title="Primera página"
              >
                <i className="fa-solid fa-angles-left text-sm" />
              </button>

              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100"
                title="Anterior"
              >
                <i className="fa-solid fa-angle-left text-sm" />
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => {
                    // Mostrar solo 5 páginas alrededor de la actual
                    return page === 1 ||
                           page === totalPages ||
                           (page >= currentPage - 1 && page <= currentPage + 1)
                  })
                  .map((page, index, array) => {
                    const prevPage = array[index - 1]
                    const showEllipsis = prevPage && page > prevPage + 1

                    return (
                      <React.Fragment key={page}>
                        {showEllipsis && (
                          <span className="px-2 text-text-secondary">...</span>
                        )}
                        <button
                          onClick={() => setCurrentPage(page)}
                          className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-medium transition-colors ${
                            currentPage === page
                              ? 'bg-primary text-white'
                              : 'hover:bg-gray-100 text-text-primary'
                          }`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    )
                  })}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100"
                title="Siguiente"
              >
                <i className="fa-solid fa-angle-right text-sm" />
              </button>

              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100"
                title="Última página"
              >
                <i className="fa-solid fa-angles-right text-sm" />
              </button>
            </div>

            <div className="text-sm text-text-secondary hidden sm:block">
              Página {currentPage} de {totalPages}
            </div>
          </div>
        )}
      </div>

      {/* Modal formulario */}
      {formOpen && (
        <EventForm
          evento={editando}
          onSave={handleSave}
          onClose={() => { setFormOpen(false); setEditando(null) }}
        />
      )}

      {/* Modal detalle */}
      {viendo && (
        <EventDetail
          evento={viendo}
          onClose={() => setViendo(null)}
          onEdit={handleEdit}
        />
      )}

      {/* Toast notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Modal confirmación logout */}
      {showLogoutConfirm && (
        <LogoutConfirmModal
          userName={getUserInfo()?.nombre || getUserInfo()?.email || 'Usuario'}
          onConfirm={confirmLogout}
          onCancel={cancelLogout}
        />
      )}
    </div>
  )
}

// ─── Página principal con AuthProvider ────────────────────────────────────────

export default function RegistroEventosPage() {
  return (
    <EventosAuthProvider>
      <RegistroEventosContent />
    </EventosAuthProvider>
  )
}
