'use client'

import { signIn } from 'next-auth/react'

export default function LoginPage() {
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
          Ingresá con tu cuenta institucional de Google para acceder al sistema.
        </p>

        <button
          onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
          className="btn-primary w-full"
        >
          <i className="fa-brands fa-google" />
          Ingresar con Google
        </button>

        <p className="mt-6 text-xs text-text-secondary">
          Solo cuentas autorizadas por la Dirección de Turismo.
          <br />
          Si no podés ingresar, contactá al administrador del sistema.
        </p>
      </div>
    </div>
  )
}
