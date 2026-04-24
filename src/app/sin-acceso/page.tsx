import Link from 'next/link'

export default function SinAccesoPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-white to-accent/10">
      <div className="card w-full max-w-md mx-4 p-10 text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
          <i className="fa-solid fa-lock text-red-500 text-2xl" />
        </div>

        <h1 className="text-2xl font-bold text-text-primary mb-2">Acceso no autorizado</h1>
        <p className="text-sm text-text-secondary mb-8">
          Tu cuenta de Google no tiene permisos para acceder a esta sección.
          Contactá al administrador del sistema para solicitar acceso.
        </p>

        <Link href="/dashboard" className="btn-primary w-full inline-block">
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
