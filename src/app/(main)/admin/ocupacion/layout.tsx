/**
 * Layout de la sección Ocupación Hotelera.
 * Acceso restringido a jorgecejas55@gmail.com.
 */

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'

export const metadata: Metadata = {
  title: 'Ocupación Hotelera — Observatorio',
  description: 'Sistema de relevamiento de ocupación hotelera en SFVC',
}

export default async function OcupacionLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  // @ts-expect-error — rol extendido en la sesión
  if (session.user?.rol !== 'admin') redirect('/sin-acceso')
  if (session.user.email !== 'jorgecejas55@gmail.com') redirect('/sin-acceso')

  return (
    <div className="space-y-6">
      {/* Sub-nav interno de la sección */}
      <div className="flex flex-wrap gap-2 items-center border-b border-gray-200 pb-3">
        <h2 className="text-xl font-bold text-gray-800 mr-4">
          <i className="fas fa-hotel text-accent mr-2" />
          Ocupación Hotelera
        </h2>
        <nav className="flex gap-1 text-sm">
          <a href="/admin/ocupacion" className="px-3 py-1.5 rounded-md hover:bg-gray-100 text-gray-700 font-medium transition-colors">
            <i className="fas fa-chart-pie mr-1.5 opacity-60" />Dashboard
          </a>
          <a href="/admin/ocupacion/relevamientos" className="px-3 py-1.5 rounded-md hover:bg-gray-100 text-gray-700 font-medium transition-colors">
            <i className="fas fa-list-check mr-1.5 opacity-60" />Relevamientos
          </a>
          <a href="/admin/ocupacion/carga" className="px-3 py-1.5 rounded-md hover:bg-gray-100 text-gray-700 font-medium transition-colors">
            <i className="fas fa-cloud-upload-alt mr-1.5 opacity-60" />Carga OH
          </a>
        </nav>
      </div>

      {children}
    </div>
  )
}
