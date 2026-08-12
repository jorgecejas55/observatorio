/**
 * Layout de un atractivo con ingresos (Casa de la Puna / Pueblo Perdido).
 * Valida el id contra la allowlist (404 si no) y gatea con el módulo RBAC
 * del atractivo. Las carpetas estáticas de museos ganan sobre este segmento
 * dinámico y quedan intactas.
 */

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/auth'
import { requireAccesoPage, puedeEscribir } from '@/lib/permisos'
import type { SessionUser } from '@/lib/permisos'
import { ATRACTIVOS } from '@/lib/types'
import { esAtractivoConIngresos, MODULO_DE_ATRACTIVO } from '@/lib/atractivos-config'

export const metadata = {
  title: 'Ingresos a Atractivos — Observatorio',
  description: 'Registro de visitas guiadas y actividades especiales',
}

interface AtractivoLayoutProps {
  children: React.ReactNode
  params: Promise<{ atractivo: string }>
}

export default async function AtractivoLayout({ children, params }: AtractivoLayoutProps) {
  const { atractivo } = await params
  if (!esAtractivoConIngresos(atractivo)) notFound()

  await requireAccesoPage(MODULO_DE_ATRACTIVO[atractivo])

  const session = await auth()
  const escribir = puedeEscribir(session?.user as SessionUser)

  const base = `/ocio/ingresos/${atractivo}`
  const nombre = ATRACTIVOS[atractivo]

  const navItem = (href: string, icon: string, label: string) => (
    <Link
      href={href}
      className="px-3 py-1.5 rounded-md hover:bg-gray-100 text-gray-700 font-medium transition-colors"
    >
      <i className={`fas ${icon} mr-1.5 opacity-60`} />
      {label}
    </Link>
  )

  return (
    <div className="space-y-6">
      {/* Sub-nav interno de la sección (nunca se imprime) */}
      <div className="print:hidden flex flex-wrap gap-2 items-center border-b border-gray-200 pb-3">
        <h2 className="text-xl font-bold text-gray-800 mr-4">
          <i className="fas fa-landmark text-orange-500 mr-2" />
          {nombre}
        </h2>
        <nav className="flex gap-1 text-sm">
          {navItem(base, 'fa-chart-pie', 'Dashboard')}
          {escribir && (
            <>
              {navItem(`${base}/cargar`, 'fa-arrow-up-from-bracket', 'Cargar ingreso')}
              {navItem(`${base}/actividades`, 'fa-star', 'Actividades')}
              {navItem(`${base}/registros`, 'fa-list', 'Registros')}
            </>
          )}
        </nav>
      </div>

      {children}
    </div>
  )
}