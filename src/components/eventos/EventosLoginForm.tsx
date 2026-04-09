'use client'

import React, { useState } from 'react'
import { useEventosAuth } from '@/contexts/EventosAuthContext'

const EventosLoginForm = () => {
  const { login, loading: authLoading, error: authError } = useEventosAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    if (error) setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.email.trim() || !formData.password.trim()) {
      setError('Por favor completá todos los campos')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await login(formData.email, formData.password)
      if (!result.success) {
        setError(result.message || 'Error al iniciar sesión')
      }
    } catch (err) {
      setError('Error inesperado. Intentá nuevamente')
    } finally {
      setLoading(false)
    }
  }

  const isSubmitting = loading || authLoading

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 via-white to-accent/10 p-5 z-[1000]">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-10 relative">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary flex items-center justify-center">
            <i className="fa-solid fa-calendar-days text-white text-2xl" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">
            Sistema de Gestión de Eventos
          </h2>
          <p className="text-sm text-text-secondary">
            Ingresá tus credenciales para acceder al registro de eventos turísticos
          </p>
        </div>

        {/* Error Alert */}
        {(error || authError) && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-6">
            <span className="text-sm">⚠️ {error || authError}</span>
          </div>
        )}

        {/* Loading State */}
        {authLoading && (
          <div className="text-center mb-6">
            <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-text-secondary mt-3 text-sm">Verificando sesión...</p>
          </div>
        )}

        {/* Login Form */}
        {!authLoading && (
          <form onSubmit={handleSubmit}>
            {/* Email Field */}
            <div className="mb-5">
              <label
                htmlFor="email"
                className="block mb-2 text-sm font-semibold text-text-primary"
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="usuario@ejemplo.com"
                disabled={isSubmitting}
                autoComplete="email"
                autoFocus
                className="w-full px-4 py-3 text-base border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            {/* Password Field */}
            <div className="mb-8">
              <label
                htmlFor="password"
                className="block mb-2 text-sm font-semibold text-text-primary"
              >
                Contraseña
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Ingresá tu contraseña"
                disabled={isSubmitting}
                autoComplete="current-password"
                className="w-full px-4 py-3 text-base border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-5 py-3.5 text-base font-semibold text-white bg-primary rounded hover:bg-primary-hover transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-border text-center space-y-3">
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="text-sm text-text-secondary hover:text-primary transition-colors underline"
          >
            ← Volver al inicio
          </button>
          <p className="text-xs text-text-secondary">
            Acceso restringido · Sistema interno de la Dirección de Turismo
          </p>
        </div>
      </div>
    </div>
  )
}

export default EventosLoginForm
