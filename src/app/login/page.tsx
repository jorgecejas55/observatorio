'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [mostrarPassword, setMostrarPassword] = useState(false)

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      const result = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        callbackUrl: '/dashboard',
        redirect: false,
      })
      if (result?.error) {
        setError('Email o contraseña incorrectos.')
      } else if (result?.url) {
        window.location.href = result.url
      }
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-white to-accent/10">
      <div className="card w-full max-w-md mx-4 p-10 text-center">
        {/* Logo / Identidad */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
            <i className="fa-solid fa-chart-line text-white text-xl" />
          </div>
          <div className="text-left">
            <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">
              Municipalidad de la Capital
            </p>
            <h1 className="text-lg font-bold text-text-primary leading-tight">
              Observatorio de Turismo
            </h1>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-text-primary mb-2">Bienvenido</h2>
        <p className="text-sm text-text-secondary mb-8">
          Ingresá con tu cuenta institucional para acceder al sistema.
        </p>

        {/* Google */}
        <button
          onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
          className="btn-primary w-full mb-4"
        >
          <i className="fa-brands fa-google" />
          Ingresar con Google
        </button>

        {/* Divisor */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-text-secondary">o</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Credenciales */}
        <form onSubmit={handleCredentials} className="text-left space-y-3">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              placeholder="usuario@ejemplo.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Contraseña</label>
            <div className="relative">
              <input
                type={mostrarPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 pr-9 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setMostrarPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <i className={`fa-solid text-xs ${mostrarPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 flex items-center gap-1.5">
              <i className="fa-solid fa-triangle-exclamation text-xs" />
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="btn-outline w-full disabled:opacity-50"
          >
            {cargando ? (
              <i className="fa-solid fa-spinner fa-spin" />
            ) : (
              <i className="fa-solid fa-right-to-bracket" />
            )}
            Ingresar
          </button>
        </form>

        <p className="mt-6 text-xs text-text-secondary">
          Solo cuentas autorizadas por la Dirección de Turismo.
          <br />
          Si no podés ingresar, contactá al administrador del sistema.
        </p>
      </div>
    </div>
  )
}
