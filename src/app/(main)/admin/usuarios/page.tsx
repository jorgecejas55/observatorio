import { requireAccesoPage } from '@/lib/permisos'
import { getUsuariosAdmin } from '@/lib/permisos/obs-admin-service'
import { conReintento } from '@/lib/reintento'
import UsuariosClient from './UsuariosClient'

export default async function UsuariosAdmin() {
  await requireAccesoPage('usuarios')

  // Prefetch server-side: evita el round trip extra cliente→API→GAS.
  // Si falla (GAS frío o caído), el cliente intenta de nuevo con su propio fetch.
  let initialData = null
  try {
    initialData = await conReintento(() => getUsuariosAdmin())
  } catch {
    // silencioso — UsuariosClient hará su propio fetch y mostrará el error
  }

  return (
    <div>
      <h2 className="section-title mb-1">
        <i className="fa-solid fa-users-gear text-primary mr-2" />
        Gestión de Usuarios
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Administrá quién accede a cada módulo del Observatorio. Los cambios aplican en la
        próxima sesión o en menos de 10 minutos.
      </p>
      <UsuariosClient initialData={initialData} />
    </div>
  )
}
