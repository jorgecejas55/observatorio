'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import { MuseoVirgenValleAuthProvider, useMuseoVirgenValleAuth } from '@/contexts/MuseoVirgenValleAuthContext'
import MuseoLoginForm from '@/components/museos/MuseoLoginForm'
import FormVisitaInstitucional from '@/components/museos/FormVisitaInstitucional'
import TablaVisitas from '@/components/museos/TablaVisitas'
import Toast from '@/components/shared/Toast'

// ── Componente SelectAno ──────────────────────────────────────────────────
function SelectAno({ value, onChange, anos }: {
  value: string
  onChange: (v: string) => void
  anos: number[]
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="input bg-white text-sm py-1.5"
    >
      <option value="todos">Todos los años</option>
      {anos.map(ano => <option key={ano} value={ano}>{ano}</option>)}
    </select>
  )
}

function VisitasInstitucionalesContent() {
  const { isAuthenticated, loading: authLoading, login, logout, getUserInfo } = useMuseoVirgenValleAuth()

  const [visitas, setVisitas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editando, setEditando] = useState<any>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  // Filtros
  const [anoSeleccionado, setAnoSeleccionado] = useState<string>('todos')
  const [fechaDesde, setFechaDesde] = useState<string>('')
  const [fechaHasta, setFechaHasta] = useState<string>('')

  // Dropdown exportar
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 20

  const cargarVisitas = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/ocio/ingresos/museo-virgen-valle/institucionales')
      const data = await res.json()

      if (data.success) {
        setVisitas(data.data || [])
      } else {
        setError('No se pudieron cargar las visitas institucionales')
      }
    } catch (err) {
      setError('Error de conexión. Verificá tu conexión a internet.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && isAuthenticated()) {
      cargarVisitas()
    }
  }, [authLoading, isAuthenticated])

  // Cerrar dropdown al click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ── Extraer años disponibles (useMemo) ────────────────────────────────────
  const anosDisponibles = useMemo(() => {
    const anos = new Set<number>()
    visitas.forEach(v => {
      if (v.fecha_visita) {
        const ano = parseInt(v.fecha_visita.substring(0, 4))
        if (!isNaN(ano)) anos.add(ano)
      }
    })
    return Array.from(anos).sort((a, b) => b - a)
  }, [visitas])

  // ── Filtrar visitas (useMemo) ─────────────────────────────────────────────
  const visitasFiltradas = useMemo(() => {
    return visitas.filter(v => {
      if (!v.fecha_visita) return false

      // Filtro año
      if (anoSeleccionado !== 'todos') {
        const ano = v.fecha_visita.substring(0, 4)
        if (ano !== anoSeleccionado) return false
      }

      // Filtro periodo
      if (fechaDesde && v.fecha_visita < fechaDesde) return false
      if (fechaHasta && v.fecha_visita > fechaHasta) return false

      return true
    })
  }, [visitas, anoSeleccionado, fechaDesde, fechaHasta])

  // ── Limpiar filtros (useCallback) ─────────────────────────────────────────
  const limpiarFiltros = useCallback(() => {
    setAnoSeleccionado('todos')
    setFechaDesde('')
    setFechaHasta('')
  }, [])

  // ── Hay filtros activos (useMemo) ─────────────────────────────────────────
  const hayFiltrosActivos = useMemo(() => {
    return anoSeleccionado !== 'todos' || fechaDesde !== '' || fechaHasta !== ''
  }, [anoSeleccionado, fechaDesde, fechaHasta])

  // Paginar visitas filtradas - memoizado para mejor rendimiento
  const totalPages = useMemo(() => Math.ceil(visitasFiltradas.length / ITEMS_PER_PAGE), [visitasFiltradas.length])
  const visitasPaginadas = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return visitasFiltradas.slice(start, start + ITEMS_PER_PAGE)
  }, [visitasFiltradas, currentPage])

  // Resetear página cuando se cargan nuevas visitas
  useEffect(() => {
    setCurrentPage(1)
  }, [visitas.length])

  // Handlers memoizados - DEBEN estar antes de los returns condicionales
  const handleSave = useCallback(async (formData: any) => {
    try {
      const isEditing = !!editando

      if (isEditing) {
        const res = await fetch(`/api/ocio/ingresos/museo-virgen-valle/institucionales/${editando.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })

        const result = await res.json()
        if (!result.success) throw new Error('Error al actualizar')
      } else {
        const res = await fetch('/api/ocio/ingresos/museo-virgen-valle/institucionales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })

        const result = await res.json()
        if (!result.success) throw new Error('Error al crear')
      }

      setFormOpen(false)
      setEditando(null)
      await cargarVisitas()

      setToast({
        message: isEditing ? 'Visita institucional actualizada exitosamente' : 'Visita institucional registrada exitosamente',
        type: 'success',
      })
    } catch (err) {
      setToast({
        message: 'Error al guardar la visita institucional. Intentá nuevamente.',
        type: 'error',
      })
      console.error(err)
    }
  }, [editando, cargarVisitas])

  const handleDelete = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/ocio/ingresos/museo-virgen-valle/institucionales/${id}`, {
        method: 'DELETE',
      })

      const result = await res.json()
      if (!result.success) throw new Error('Error al eliminar')

      await cargarVisitas()
      setToast({
        message: 'Visita institucional eliminada exitosamente',
        type: 'success',
      })
    } catch (err) {
      setToast({
        message: 'Error al eliminar la visita institucional. Intentá nuevamente.',
        type: 'error',
      })
      console.error(err)
    }
  }, [cargarVisitas])

  const handleEdit = useCallback((visita: any) => {
    setEditando(visita)
    setFormOpen(true)
  }, [])

  const handleLogout = useCallback(() => {
    const confirmar = window.confirm('¿Estás seguro de que querés cerrar sesión?')
    if (confirmar) {
      logout()
    }
  }, [logout])

  // Exportar CSV - memoizado (exporta solo filtradas)
  const exportarCSV = useCallback(() => {
    if (visitasFiltradas.length === 0) {
      setToast({ message: 'No hay datos para exportar', type: 'info' })
      return
    }

    // Headers
    const headers = [
      'Fecha Visita',
      'Procedencia Institución',
      'Tipo Institución',
      'Subtipo Institución',
      'Nombre Institución',
      'Cantidad Asistentes',
    ]

    // Rows (usa visitasFiltradas)
    const rows = visitasFiltradas.map(v => [
      v.fecha_visita || '',
      v.procedencia_institucion || '',
      v.tipo_institucion || '',
      v.subtipo_institucion || '',
      v.nombre_institucion || '',
      v.cantidad_asistentes || 0,
    ])

    // Generar CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    // Descargar
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    const fecha = new Date().toISOString().split('T')[0]

    link.setAttribute('href', url)
    link.setAttribute('download', `visitas-institucionales-virgen-valle-${fecha}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    setToast({ message: `${visitasFiltradas.length} visitas exportadas (CSV)`, type: 'success' })
    setDropdownOpen(false)
  }, [visitasFiltradas])

  // Exportar XLSX - memoizado
  const exportarXLSX = useCallback(() => {
    if (visitasFiltradas.length === 0) {
      setToast({ message: 'No hay datos para exportar', type: 'info' })
      return
    }

    // Preparar datos
    const datos = visitasFiltradas.map(v => ({
      'Fecha Visita': v.fecha_visita || '',
      'Procedencia Institución': v.procedencia_institucion || '',
      'Tipo Institución': v.tipo_institucion || '',
      'Subtipo Institución': v.subtipo_institucion || '',
      'Nombre Institución': v.nombre_institucion || '',
      'Cantidad Asistentes': v.cantidad_asistentes || 0,
    }))

    // Crear workbook
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(datos)

    // Ajustar anchos columnas
    const colWidths = [
      { wch: 12 }, // Fecha
      { wch: 18 }, // Procedencia
      { wch: 25 }, // Tipo
      { wch: 25 }, // Subtipo
      { wch: 35 }, // Nombre
      { wch: 16 }, // Cantidad
    ]
    ws['!cols'] = colWidths

    // Agregar hoja
    XLSX.utils.book_append_sheet(wb, ws, 'Visitas Institucionales')

    // Descargar
    const fecha = new Date().toISOString().split('T')[0]
    XLSX.writeFile(wb, `visitas-institucionales-virgen-valle-${fecha}.xlsx`)

    setToast({ message: `${visitasFiltradas.length} visitas exportadas (Excel)`, type: 'success' })
    setDropdownOpen(false)
  }, [visitasFiltradas])

  // Early returns - después de todos los hooks
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-text-secondary">Verificando sesión...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated()) {
    return (
      <MuseoLoginForm
        nombreMuseo="Museo de la Virgen del Valle"
        onLogin={login}
        loading={authLoading}
      />
    )
  }

  const userInfo = getUserInfo()

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/ocio/ingresos/museo-virgen-valle"
              className="text-text-secondary hover:text-primary transition-colors"
            >
              <i className="fa-solid fa-arrow-left" />
            </Link>
            <h2 className="section-title !mb-0">Visitas Institucionales</h2>
          </div>
          <p className="text-text-secondary text-sm">
            Museo de la Virgen del Valle · {loading ? 'Cargando...' : `${visitasFiltradas.length} de ${visitas.length} visita${visitas.length !== 1 ? 's' : ''}`}
            {hayFiltrosActivos && <span className="text-primary font-medium"> (filtrado)</span>}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
            <i className="fa-solid fa-user text-primary text-sm" />
            <span className="text-sm text-text-primary font-medium">
              {userInfo?.nombre || userInfo?.email}
            </span>
            <button
              onClick={handleLogout}
              className="ml-2 text-text-secondary hover:text-red-600 transition-colors"
              title="Cerrar sesión"
            >
              <i className="fa-solid fa-right-from-bracket text-sm" />
            </button>
          </div>
          <Link
            href="/ocio/ingresos/museo-virgen-valle/institucionales/carga-masiva"
            className="btn-secondary"
            title="Registrar múltiples visitas institucionales"
          >
            <i className="fa-solid fa-layer-group" /> Carga masiva
          </Link>
          {/* Dropdown Exportar */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="btn-secondary"
              disabled={visitasFiltradas.length === 0}
              title={hayFiltrosActivos ? 'Exportar visitas filtradas' : 'Exportar todas las visitas'}
            >
              <i className="fa-solid fa-download" /> Exportar <i className="fa-solid fa-chevron-down text-xs ml-1" />
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                <button
                  onClick={exportarXLSX}
                  className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-gray-50 flex items-center gap-2"
                >
                  <i className="fa-solid fa-file-excel text-green-600" />
                  Descargar XLSX (Excel)
                </button>
                <button
                  onClick={exportarCSV}
                  className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-gray-50 flex items-center gap-2"
                >
                  <i className="fa-solid fa-file-csv text-blue-600" />
                  Descargar CSV
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => {
              setEditando(null)
              setFormOpen(true)
            }}
            className="btn-primary"
          >
            <i className="fa-solid fa-plus" /> Nueva visita institucional
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="card p-4 mb-4 border-red-200 bg-red-50 flex items-center gap-3">
          <i className="fa-solid fa-triangle-exclamation text-red-500" />
          <p className="text-sm text-red-700 flex-1">{error}</p>
          <button onClick={cargarVisitas} className="btn-ghost text-red-600 text-xs">
            <i className="fa-solid fa-rotate-right" /> Reintentar
          </button>
        </div>
      )}

      {/* Filtros */}
      <div className="card p-5 mb-5">
        <h3 className="text-base font-semibold text-text-primary mb-4">
          Filtros
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Filtro por Año */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary block mb-2">
              Filtrar por año:
            </label>
            <SelectAno
              value={anoSeleccionado}
              onChange={setAnoSeleccionado}
              anos={anosDisponibles}
            />
          </div>

          {/* Filtro por Rango de Fechas */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary block mb-2">
              O filtrar por rango específico:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="input bg-white text-sm py-1.5"
                placeholder="Desde"
                aria-label="Fecha desde"
              />
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="input bg-white text-sm py-1.5"
                placeholder="Hasta"
                aria-label="Fecha hasta"
              />
            </div>
          </div>
        </div>

        {/* Botón Limpiar */}
        {hayFiltrosActivos && (
          <div className="mt-4">
            <button
              onClick={limpiarFiltros}
              className="btn-secondary text-sm"
              aria-label="Limpiar todos los filtros"
            >
              <i className="fa-solid fa-times" aria-hidden="true" /> Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Tabla */}
      <div className="card">
        <TablaVisitas
          visitas={visitasPaginadas}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          tipo="institucional"
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={visitasFiltradas.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Modal formulario */}
      {formOpen && (
        <FormVisitaInstitucional
          visita={editando}
          onSave={handleSave}
          onClose={() => {
            setFormOpen(false)
            setEditando(null)
          }}
          userEmail={userInfo?.email || 'desconocido'}
        />
      )}

      {/* Toast notifications */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  )
}

export default function VisitasInstitucionalesPage() {
  return (
    <MuseoVirgenValleAuthProvider>
      <VisitasInstitucionalesContent />
    </MuseoVirgenValleAuthProvider>
  )
}
