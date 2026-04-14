'use client'

import React, { useState, useEffect } from 'react'

interface VisitaInstitucional {
  id?: string
  fecha_visita: string
  procedencia_institucion: string
  tipo_institucion: string
  subtipo_institucion: string
  nombre_institucion: string
  cantidad_asistentes: number
  timestamp?: string
  usuario_registro?: string
}

interface FormVisitaInstitucionalProps {
  visita?: VisitaInstitucional | null
  onSave: (data: Partial<VisitaInstitucional>) => Promise<void>
  onClose: () => void
  userEmail: string
}

const PROCEDENCIAS = ['Internacional', 'Nacional', 'Provincial', 'Local']

const TIPOS_INSTITUCION: Record<string, string[]> = {
  'Instituciones educativas': [
    'Nivel inicial',
    'Nivel primario',
    'Nivel secundario',
    'Nivel superior / universitario',
    'Otros (academias, institutos)',
  ],
  'Organismos públicos': ['Municipales', 'Provinciales', 'Nacionales'],
  'Organizaciones sociales y comunitarias': [
    'ONGs',
    'Fundaciones',
    'Centros vecinales',
    'Asociaciones civiles',
  ],
  'Instituciones religiosas': [
    'Parroquias',
    'Grupos pastorales',
    'Instituciones educativas confesionales',
  ],
  'Sector privado / empresas': ['Empresas', 'Cámaras empresariales', 'Consultoras'],
  'Turismo organizado': ['Agencias de viajes', 'Contingentes turísticos', 'Guías independientes'],
  Otros: ['Otros'],
}

export default function FormVisitaInstitucional({
  visita,
  onSave,
  onClose,
  userEmail,
}: FormVisitaInstitucionalProps) {
  const [formData, setFormData] = useState({
    fecha_visita: '',
    procedencia_institucion: '',
    tipo_institucion: '',
    subtipo_institucion: '',
    nombre_institucion: '',
    cantidad_asistentes: 1,
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (visita) {
      setFormData({
        fecha_visita: visita.fecha_visita || '',
        procedencia_institucion: visita.procedencia_institucion || '',
        tipo_institucion: visita.tipo_institucion || '',
        subtipo_institucion: visita.subtipo_institucion || '',
        nombre_institucion: visita.nombre_institucion || '',
        cantidad_asistentes: visita.cantidad_asistentes || 1,
      })
    }
  }, [visita])

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value }

      // Si cambia el tipo de institución, resetear subtipo
      if (field === 'tipo_institucion') {
        updated.subtipo_institucion = ''
      }

      return updated
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validaciones
    if (!formData.fecha_visita) {
      setError('La fecha de la visita es obligatoria')
      return
    }

    if (!formData.procedencia_institucion) {
      setError('La procedencia de la institución es obligatoria')
      return
    }

    if (!formData.tipo_institucion) {
      setError('El tipo de institución es obligatorio')
      return
    }

    if (!formData.nombre_institucion.trim()) {
      setError('El nombre de la institución es obligatorio')
      return
    }

    const cantidadAsistentes = parseInt(String(formData.cantidad_asistentes))
    if (isNaN(cantidadAsistentes) || cantidadAsistentes < 1) {
      setError('La cantidad de asistentes debe ser al menos 1')
      return
    }

    setLoading(true)

    try {
      const dataToSave = {
        ...formData,
        cantidad_asistentes: cantidadAsistentes,
        usuario_registro: userEmail,
      }

      await onSave(dataToSave)
    } catch (err) {
      setError('Error al guardar la visita institucional. Intentá nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  const subtiposDisponibles = formData.tipo_institucion
    ? TIPOS_INSTITUCION[formData.tipo_institucion] || []
    : []

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-text-primary">
            {visita ? 'Editar' : 'Nueva'} Visita Institucional
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
            disabled={loading}
          >
            <i className="fa-solid fa-times text-text-secondary" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Fecha */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Fecha de la visita <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.fecha_visita}
              onChange={(e) => handleChange('fecha_visita', e.target.value)}
              className="input"
              required
            />
          </div>

          {/* Procedencia */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Procedencia de la institución <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.procedencia_institucion}
              onChange={(e) => handleChange('procedencia_institucion', e.target.value)}
              className="input"
              required
            >
              <option value="">Seleccioná una opción</option>
              {PROCEDENCIAS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo de institución */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Tipo de institución <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.tipo_institucion}
              onChange={(e) => handleChange('tipo_institucion', e.target.value)}
              className="input"
              required
            >
              <option value="">Seleccioná una opción</option>
              {Object.keys(TIPOS_INSTITUCION).map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </div>

          {/* Subtipo de institución (condicional) */}
          {formData.tipo_institucion && subtiposDisponibles.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Subtipo de institución
              </label>
              <select
                value={formData.subtipo_institucion}
                onChange={(e) => handleChange('subtipo_institucion', e.target.value)}
                className="input"
              >
                <option value="">Seleccioná una opción</option>
                {subtiposDisponibles.map((subtipo) => (
                  <option key={subtipo} value={subtipo}>
                    {subtipo}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Nombre de la institución */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Nombre de la institución <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.nombre_institucion}
              onChange={(e) => handleChange('nombre_institucion', e.target.value)}
              className="input"
              placeholder="Ej: Escuela Fray Mamerto Esquiú"
              required
            />
          </div>

          {/* Cantidad de asistentes */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Cantidad de asistentes <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={formData.cantidad_asistentes}
              onChange={(e) => handleChange('cantidad_asistentes', e.target.value)}
              className="input"
              required
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-3">
              <i className="fa-solid fa-triangle-exclamation text-red-500 mt-0.5" />
              <p className="text-sm text-red-700 flex-1">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost flex-1"
              disabled={loading}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-save" />
                  <span>Guardar</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
