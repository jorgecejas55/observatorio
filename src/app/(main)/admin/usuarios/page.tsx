import { requireAccesoPage } from '@/lib/permisos'
import UsuariosClient from './UsuariosClient'

export default async function UsuariosAdmin() {
  await requireAccesoPage('usuarios')

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
      <UsuariosClient />
    </div>
  )
}
