import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { puedeEscribir } from '@/lib/permisos'
import type { SessionUser } from '@/lib/permisos'

/**
 * Layout de la página de carga OH.
 * Solo usuarios con permiso de escritura (admin u operador) pueden acceder.
 * Lectores son redirigidos a /sin-acceso.
 */
export default async function CargaLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!puedeEscribir(session.user as SessionUser)) redirect('/sin-acceso')

  return <>{children}</>
}
