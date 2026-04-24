'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

interface NavItem {
  href: string
  label: string
  icon: string
}

interface NavGroup {
  label: string
  icon: string
  color: string
  items: NavItem[]
}

const NAV: NavGroup[] = [
  {
    label: 'Turismo de Ocio',
    icon: 'fa-umbrella-beach',
    color: 'text-orange-500',
    items: [
      { href: '/ocio/encuesta', label: 'Encuesta turista', icon: 'fa-clipboard-list' },
      { href: '/ocio/ingresos', label: 'Ingresos atractivos', icon: 'fa-ticket' },
      { href: '/ocio/camping', label: 'Camping municipal', icon: 'fa-campground' },
    ],
  },
  {
    label: 'Turismo de Eventos',
    icon: 'fa-calendar-star',
    color: 'text-purple-500',
    items: [
      { href: '/eventos/registro', label: 'Registro de evento', icon: 'fa-calendar-plus' },
      { href: '/eventos/encuesta', label: 'Encuesta demanda', icon: 'fa-clipboard-question' },
    ],
  },
  {
    label: 'Oferta de Servicios',
    icon: 'fa-hotel',
    color: 'text-accent',
    items: [
      { href: '/oferta', label: 'Estructura de la Oferta', icon: 'fa-database' },
      { href: '/oferta/alojamientos', label: 'Alojamientos (No Reg.)', icon: 'fa-house-chimney' },
    ],
  },
  {
    label: 'Análisis de Calidad',
    icon: 'fa-star-half-stroke',
    color: 'text-yellow-500',
    items: [
      { href: '/calidad/atractivos', label: 'Calidad atractivos', icon: 'fa-landmark' },
      { href: '/calidad/servicios', label: 'Calidad servicios', icon: 'fa-concierge-bell' },
      { href: '/calidad/bus', label: 'Calidad bus turístico', icon: 'fa-bus' },
      { href: '/calidad/percepcion', label: 'Percepción social', icon: 'fa-people-group' },
    ],
  },
  {
    label: 'Estadísticas',
    icon: 'fa-chart-column',
    color: 'text-primary',
    items: [
      { href: '/estadisticas/indicadores', label: 'Indicadores mensuales', icon: 'fa-table-list' },
      { href: '/estadisticas/perfil-visitante', label: 'Perfil del visitante', icon: 'fa-chart-bar' },
      { href: '/estadisticas/eventos', label: 'Dashboard de eventos', icon: 'fa-calendar-check' },
      { href: '/estadisticas/digital', label: 'Dashboard digital', icon: 'fa-chart-line' },
    ],
  },
]

function NavLink({ href, label, icon, onNavigate }: NavItem & { onNavigate?: () => void }) {
  const pathname = usePathname()
  const active = pathname === href

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
        active
          ? 'bg-primary/10 text-primary font-semibold'
          : 'text-text-secondary hover:text-primary hover:bg-gray-100'
      }`}
    >
      <i className={`fa-solid ${icon} w-4 text-center text-xs`} />
      {label}
    </Link>
  )
}

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'Turismo de Ocio': true,
    'Turismo de Eventos': true,
    'Oferta de Servicios': true,
    'Análisis de Calidad': true,
    'Estadísticas': true,
  })

  const toggle = (label: string) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }))

  return (
    <>
      <aside className={`flex flex-col fixed top-16 left-0 bottom-0 w-64 bg-white border-r border-gray-100 overflow-y-auto z-40 transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <nav className="p-4 flex flex-col gap-1">
          {/* Dashboard */}
          <NavLink href="/dashboard" label="Dashboard" icon="fa-chart-pie" onNavigate={onClose} />

          <div className="my-2 border-t border-gray-100" />

          {NAV.map((group) => (
            <div key={group.label} className="mb-1">
              <button
                onClick={() => toggle(group.label)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider text-text-secondary hover:text-primary transition-colors"
              >
                <i className={`fa-solid ${group.icon} ${group.color} text-sm w-4 text-center`} />
                <span className="flex-1 text-left">{group.label}</span>
                <i
                  className={`fa-solid fa-chevron-down text-xs transition-transform duration-200 ${
                    openGroups[group.label] ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {openGroups[group.label] && (
                <div className="ml-3 pl-3 border-l border-gray-100 flex flex-col gap-0.5 mt-0.5">
                  {group.items.map((item) => (
                    <NavLink key={item.href} {...item} onNavigate={onClose} />
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className="my-2 border-t border-gray-100" />

          {/* Admin */}
          <NavLink href="/admin/metricas" label="Métricas" icon="fa-chart-simple" onNavigate={onClose} />
          <NavLink href="/admin/usuarios" label="Usuarios" icon="fa-users-gear" onNavigate={onClose} />
          <NavLink href="/admin/config" label="Configuración" icon="fa-gear" onNavigate={onClose} />
        </nav>
      </aside>
    </>
  )
}
