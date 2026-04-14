'use client'

import React, { useState, useEffect } from 'react'
import { PAISES, PROVINCIAS_ARG, DEPARTAMENTOS_CATAMARCA } from '@/lib/geografia'

interface VisitaOcasional {
  id?: string
  Fecha: string
  'Procedencia '?: string
  'Lugar de procedencia '?: string
  'Total de personas': number
  motivo_visita?: string
  canal_difusion?: string
  usuario_registro?: string
}

interface FormVisitaOcasionalProps {
  visita?: VisitaOcasional | null
  onSave: (data: Partial<VisitaOcasional>) => Promise<void>
  onClose: () => void
  userEmail: string
}

const PROCEDENCIAS = ['Internacional', 'Nacional', 'Provincial', 'Residente']
const MOTIVOS = ['Muestra permanente', 'Actividad o muestra especial']
const CANALES = [
  'Facebook',
  'Instagram',
  'TikTok',
  'Diarios digitales',
  'Web de turismo municipal',
  'Radio',
  'Televisión',
  'Otro',
]

export default function FormVisitaOcasional({
  visita,
  onSave,
  onClose,
  userEmail,
}: FormVisitaOcasionalProps) {
  const [formData, setFormData] = useState({
    Fecha: '',
    'Procedencia ': '',
    'Lugar de procedencia ': '',
    'Total de personas': 1,
    motivo_visita: '',
    canal_difusion: '',
  })

  const [canalesSeleccionados, setCanalesSeleccionados] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (visita) {
      setFormData({
        Fecha: visita.Fecha || '',
        'Procedencia ': visita['Procedencia '] || '',
        'Lugar de procedencia ': visita['Lugar de procedencia '] || '',
        'Total de personas': visita['Total de personas'] || 1,
        motivo_visita: visita.motivo_visita || '',
        canal_difusion: visita.canal_difusion || '',
      })

      if (visita.canal_difusion) {
        setCanalesSeleccionados(visita.canal_difusion.split(', '))
      }
    }
  }, [visita])

  const handleChange = (field: string, value: any) => {
    // Si cambia la procedencia, resetear lugar de procedencia
    if (field === 'Procedencia ') {
      setFormData((prev) => ({ ...prev, [field]: value, 'Lugar de procedencia ': '' }))
      return
    }

    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleCanalToggle = (canal: string) => {
    setCanalesSeleccionados((prev) => {
      if (prev.includes(canal)) {
        return prev.filter((c) => c !== canal)
      } else {
        return [...prev, canal]
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validaciones
    if (!formData.Fecha) {
      setError('La fecha de la visita es obligatoria')
      return
    }

    if (!formData['Procedencia ']) {
      setError('La procedencia es obligatoria')
      return
    }

    const totalPersonas = parseInt(String(formData['Total de personas']))
    if (isNaN(totalPersonas) || totalPersonas < 1) {
      setError('El total de personas debe ser al menos 1')
      return
    }

    setLoading(true)

    try {
      const dataToSave = {
        ...formData,
        'Total de personas': totalPersonas,
        canal_difusion: canalesSeleccionados.join(', '),
        usuario_registro: userEmail,
      }

      await onSave(dataToSave)
    } catch (err) {
      setError('Error al guardar la visita. Intentá nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-text-primary">
            {visita ? 'Editar' : 'Nueva'} Visita Ocasional
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
              value={formData.Fecha}
              onChange={(e) => handleChange('Fecha', e.target.value)}
              className="input"
              required
            />
          </div>

          {/* Procedencia */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Procedencia <span className="text-red-500">*</span>
            </label>
            <select
              value={formData['Procedencia ']}
              onChange={(e) => handleChange('Procedencia ', e.target.value)}
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

          {/* Lugar de procedencia (condicional con desplegables) */}
          {formData['Procedencia '] && formData['Procedencia '] !== 'Residente' && (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                {formData['Procedencia '] === 'Internacional' && 'País'}
                {formData['Procedencia '] === 'Nacional' && 'Provincia'}
                {formData['Procedencia '] === 'Provincial' && 'Departamento'}
              </label>
              <select
                value={formData['Lugar de procedencia ']}
                onChange={(e) => handleChange('Lugar de procedencia ', e.target.value)}
                className="input"
                required
              >
                <option value="">Seleccioná una opción</option>
                {formData['Procedencia '] === 'Internacional' &&
                  PAISES.map((pais) => (
                    <option key={pais} value={pais}>
                      {pais}
                    </option>
                  ))}
                {formData['Procedencia '] === 'Nacional' &&
                  PROVINCIAS_ARG.map((provincia) => (
                    <option key={provincia} value={provincia}>
                      {provincia}
                    </option>
                  ))}
                {formData['Procedencia '] === 'Provincial' &&
                  DEPARTAMENTOS_CATAMARCA.map((depto) => (
                    <option key={depto} value={depto}>
                      {depto}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Total de personas */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Total de personas en la visita <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={formData['Total de personas']}
              onChange={(e) => handleChange('Total de personas', e.target.value)}
              className="input"
              required
            />
          </div>

          {/* Motivo de visita */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Motivo de visita
            </label>
            <div className="space-y-2">
              {MOTIVOS.map((motivo) => (
                <label key={motivo} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="motivo_visita"
                    value={motivo}
                    checked={formData.motivo_visita === motivo}
                    onChange={(e) => handleChange('motivo_visita', e.target.value)}
                    className="w-4 h-4 text-primary"
                  />
                  <span className="text-sm text-text-primary">{motivo}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Canal de difusión */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              ¿Por qué canal conoció la propuesta del museo?
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CANALES.map((canal) => (
                <label key={canal} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canalesSeleccionados.includes(canal)}
                    onChange={() => handleCanalToggle(canal)}
                    className="w-4 h-4 text-primary rounded"
                  />
                  <span className="text-sm text-text-primary">{canal}</span>
                </label>
              ))}
            </div>
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
