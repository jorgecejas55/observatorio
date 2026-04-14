'use client'

import React, { useState } from 'react'

interface MuseoLoginFormProps {
  nombreMuseo: string
  onLogin: (email: string, password: string) => Promise<{ success: boolean; message?: string }>
  loading?: boolean
}

export default function MuseoLoginForm({ nombreMuseo, onLogin, loading = false }: MuseoLoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Por favor completá todos los campos')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await onLogin(email, password)
      if (!result.success) {
        setError(result.message || 'Error al iniciar sesión')
      }
    } catch (err) {
      setError('Error de conexión. Intentá nuevamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <i className="fa-solid fa-landmark text-3xl text-primary" />
          </div>
          <h2 className="text-3xl font-bold text-text-primary mb-2">
            {nombreMuseo}
          </h2>
          <p className="text-text-secondary">
            Ingresá con tu cuenta para continuar
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-2">
                Correo electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i className="fa-solid fa-envelope text-text-secondary" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="tu@email.com"
                  disabled={isSubmitting || loading}
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-2">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i className="fa-solid fa-lock text-text-secondary" />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10"
                  placeholder="••••••••"
                  disabled={isSubmitting || loading}
                  autoComplete="current-password"
                />
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-3">
              <i className="fa-solid fa-triangle-exclamation text-red-500 mt-0.5" />
              <p className="text-sm text-red-700 flex-1">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting || loading}
            className="btn-primary w-full justify-center"
          >
            {isSubmitting || loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Iniciando sesión...</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-right-to-bracket" />
                <span>Iniciar sesión</span>
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center pt-4">
          <p className="text-xs text-text-secondary">
            Si no tenés cuenta, contactá al administrador del sistema
          </p>
        </div>
      </div>
    </div>
  )
}
