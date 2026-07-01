import { auth } from '@/auth'
import { tieneAccesoCasaCatamarca } from '@/lib/casa-catamarca-acceso'
import { DashboardClient } from './DashboardClient'

/**
 * Server Component — gate de autenticación para el dashboard de Casa de Catamarca.
 * Solo emails en la allowlist pueden ver estadísticas.
 */
export default async function CasaCatamarcaDashboardPage() {
  const session = await auth()

  if (!session?.user?.email) {
    return (
      <div className="card p-12 text-center">
        <i className="fa-solid fa-lock text-4xl text-gray-300 mb-4 block" />
        <p className="text-gray-600 text-lg mb-4">Panel restringido</p>
        <p className="text-gray-500 text-sm mb-6">Iniciá sesión con tu cuenta del Observatorio para acceder.</p>
        <a href="/login?callbackUrl=/casa-catamarca/dashboard" className="btn-primary px-8 py-2.5">
          <i className="fa-solid fa-right-to-bracket mr-2" />
          Iniciar sesión
        </a>
      </div>
    )
  }

  if (!tieneAccesoCasaCatamarca(session.user.email)) {
    return (
      <div className="card p-12 text-center">
        <i className="fa-solid fa-shield-halved text-4xl text-gray-300 mb-4 block" />
        <p className="text-gray-600 text-lg mb-2">No tenés acceso a este panel</p>
        <p className="text-gray-500 text-sm mb-6">
          Solicitá acceso al Observatorio. Si creés que deberías poder ver este panel,
          comunicate con el administrador.
        </p>
        <a href="/login" className="btn-primary px-8 py-2.5">
          <i className="fa-solid fa-arrow-right-to-bracket mr-2" />
          Volver al login
        </a>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 rounded-2xl bg-blue-50 border border-blue-200 px-6 py-4 flex items-start gap-3">
        <i className="fa-solid fa-chart-pie text-blue-500 text-xl mt-0.5" />
        <div>
          <p className="font-semibold text-blue-800">Panel operativo · Casa de Catamarca en Buenos Aires</p>
          <p className="text-sm text-blue-700 mt-0.5">Estadísticas de encuestas al potencial visitante — acceso restringido</p>
        </div>
      </div>
      <DashboardClient />
    </div>
  )
}
