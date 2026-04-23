'use client'

import React, { useState, useEffect } from 'react'

interface TablaVisitasProps {
  visitas: any[]
  loading: boolean
  onEdit: (visita: any) => void
  onDelete: (id: string) => void
  onDeleteMultiple?: (ids: string[]) => void
  tipo: 'ocasional' | 'institucional'
  // Paginación
  currentPage?: number
  totalPages?: number
  totalItems?: number
  itemsPerPage?: number
  onPageChange?: (page: number) => void
}

export default function TablaVisitas({
  visitas,
  loading,
  onEdit,
  onDelete,
  tipo,
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  itemsPerPage = 20,
  onPageChange,
  onDeleteMultiple,
}: TablaVisitasProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Limpiar selección cuando cambia la página o los datos
  useEffect(() => {
    setSelectedIds([])
  }, [currentPage, visitas])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-text-secondary">Cargando visitas...</p>
        </div>
      </div>
    )
  }

  if (visitas.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <i className="fa-solid fa-inbox text-2xl text-gray-400" />
        </div>
        <p className="text-text-secondary mb-2">No hay visitas registradas</p>
        <p className="text-sm text-text-secondary">
          Hacé clic en "Nueva visita" para agregar el primer registro
        </p>
      </div>
    )
  }

  const handleDeleteClick = (id: string, nombre?: string) => {
    const confirmacion = window.confirm(
      `¿Estás seguro de que querés eliminar esta visita?${nombre ? `\n\nInstitución: ${nombre}` : ''}`
    )
    if (confirmacion) {
      onDelete(id)
    }
  }

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = visitas.map((v) => v.id).filter(Boolean)
      setSelectedIds(allIds)
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const handleDeleteMultipleClick = () => {
    if (!onDeleteMultiple || selectedIds.length === 0) return

    const confirmacion = window.confirm(
      `¿Estás seguro de que querés eliminar las ${selectedIds.length} visitas seleccionadas?`
    )
    if (confirmacion) {
      onDeleteMultiple(selectedIds)
    }
  }

  return (
    <div className="overflow-x-auto">
      {/* Barra de acciones de selección */}
      {selectedIds.length > 0 && (
        <div className="bg-blue-50 px-4 py-3 border-b border-blue-100 flex items-center justify-between sticky left-0">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-blue-700">
              {selectedIds.length} seleccionado{selectedIds.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs text-blue-600 hover:underline"
            >
              Desmarcar todos
            </button>
          </div>
          <button
            onClick={handleDeleteMultipleClick}
            className="btn-danger !py-1.5 !px-3 text-sm flex items-center gap-2"
          >
            <i className="fa-solid fa-trash-can" />
            Eliminar seleccionados
          </button>
        </div>
      )}

      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="py-3 px-4 text-left w-10">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                checked={visitas.length > 0 && selectedIds.length === visitas.length}
                onChange={handleSelectAll}
              />
            </th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Fecha</th>
            {tipo === 'ocasional' ? (
              <>
                <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">
                  Procedencia
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">
                  Lugar
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">
                  Personas
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">
                  Motivo
                </th>
              </>
            ) : (
              <>
                <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">
                  Institución
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">
                  Tipo
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">
                  Procedencia
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">
                  Asistentes
                </th>
              </>
            )}
            <th className="text-right py-3 px-4 text-sm font-semibold text-text-primary">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {visitas.map((visita, index) => {
            // Generar una clave única para React
            const rowKey = visita.id || `row-${index}`
            // Solo considerar seleccionado si tiene ID y está en la lista
            const isSelected = visita.id && selectedIds.includes(visita.id)
            
            const fecha =
              tipo === 'ocasional'
                ? visita.Fecha || visita.fecha_visita
                : visita.fecha_visita
            const fechaFormateada = fecha
              ? new Date(fecha + 'T00:00:00').toLocaleDateString('es-AR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })
              : '-'

            return (
              <tr
                key={visita.id || index}
                className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  isSelected ? 'bg-blue-50/30' : ''
                }`}
              >
                <td className="py-3 px-4">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                    checked={isSelected}
                    onChange={() => handleSelectOne(visita.id)}
                  />
                </td>
                <td className="py-3 px-4 text-sm text-text-primary">{fechaFormateada}</td>

                {tipo === 'ocasional' ? (
                  <>
                    <td className="py-3 px-4 text-sm text-text-primary">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        {visita['Procedencia '] || visita.procedencia || '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-text-secondary">
                      {visita['Lugar de procedencia '] || visita.lugar_procedencia || '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-text-primary font-medium">
                      {visita['Total de personas'] || visita.total_personas || 0}
                    </td>
                    <td className="py-3 px-4 text-sm text-text-secondary">
                      {visita.motivo_visita || '-'}
                    </td>
                  </>
                ) : (
                  <>
                    <td className="py-3 px-4 text-sm text-text-primary font-medium">
                      {visita.nombre_institucion || '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-text-secondary">
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-text-primary">
                          {visita.tipo_institucion || '-'}
                        </div>
                        {visita.subtipo_institucion && (
                          <div className="text-xs text-text-secondary">
                            {visita.subtipo_institucion}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-text-primary">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                        {visita.procedencia_institucion || '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-text-primary font-medium">
                      {visita.cantidad_asistentes || 0}
                    </td>
                  </>
                )}

                <td className="py-3 px-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onEdit(visita)}
                      className="w-8 h-8 rounded-lg hover:bg-blue-50 flex items-center justify-center transition-colors group"
                      title="Editar"
                    >
                      <i className="fa-solid fa-pen text-sm text-text-secondary group-hover:text-blue-600" />
                    </button>
                    <button
                      onClick={() =>
                        handleDeleteClick(visita.id, visita.nombre_institucion)
                      }
                      className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center transition-colors group"
                      title="Eliminar"
                    >
                      <i className="fa-solid fa-trash text-sm text-text-secondary group-hover:text-red-600" />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Footer con paginación */}
      {onPageChange && totalPages > 1 ? (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-sm text-text-secondary">
            Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalItems)} de {totalItems}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-200"
              title="Primera página"
            >
              <i className="fa-solid fa-angles-left text-sm" />
            </button>

            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-200"
              title="Anterior"
            >
              <i className="fa-solid fa-angle-left text-sm" />
            </button>

            <span className="px-4 py-2 text-sm font-medium text-text-primary">
              Página {currentPage} de {totalPages}
            </span>

            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-200"
              title="Siguiente"
            >
              <i className="fa-solid fa-angle-right text-sm" />
            </button>

            <button
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-200"
              title="Última página"
            >
              <i className="fa-solid fa-angles-right text-sm" />
            </button>
          </div>

          <div className="text-sm text-text-secondary hidden sm:block">
            {itemsPerPage} por página
          </div>
        </div>
      ) : (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
          <p className="text-sm text-text-secondary">
            Total: <span className="font-semibold text-text-primary">{totalItems || visitas.length}</span> visita
            {(totalItems || visitas.length) !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  )
}
