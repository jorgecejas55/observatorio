'use client'

import { signOut, useSession } from 'next-auth/react'
import { useState } from 'react'

interface HeaderProps {
  sidebarOpen: boolean
  onToggle: () => void
}

export default function Header({ sidebarOpen, onToggle }: HeaderProps) {
  const { data: session } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm h-16 flex items-center px-4 lg:px-6">
      {/* Botón toggle sidebar */}
      <button
        onClick={onToggle}
        className="mr-3 w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-text-secondary hover:text-primary"
        aria-label={sidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
      >
        <i className={`fa-solid ${sidebarOpen ? 'fa-xmark' : 'fa-bars'} text-base`} />
      </button>

      {/* Marca */}
      <div className="flex items-center gap-3 flex-1">
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
          <i className="fa-solid fa-chart-line text-white text-sm" />
        </div>
        <div className="hidden sm:block">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary leading-none">
            Municipalidad de la Capital
          </p>
          <h1 className="text-sm font-bold text-text-primary leading-tight">
            Observatorio de Turismo
          </h1>
        </div>
      </div>

      {/* Usuario */}
      {session?.user && (
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 rounded-full px-3 py-1.5 hover:bg-gray-100 transition-colors"
          >
            {session.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt={session.user.name ?? ''}
                className="w-7 h-7 rounded-full"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                <i className="fa-solid fa-user text-primary text-xs" />
              </div>
            )}
            <span className="hidden md:block text-sm font-medium text-text-primary">
              {session.user.name?.split(' ')[0]}
            </span>
            <i className="fa-solid fa-chevron-down text-xs text-text-secondary" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-text-primary truncate">
                  {session.user.name}
                </p>
                <p className="text-xs text-text-secondary truncate">{session.user.email}</p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="w-full text-left px-4 py-2 text-sm text-text-secondary hover:text-primary hover:bg-gray-50 flex items-center gap-2 transition-colors"
              >
                <i className="fa-solid fa-arrow-right-from-bracket" />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
