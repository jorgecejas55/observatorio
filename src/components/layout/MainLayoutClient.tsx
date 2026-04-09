'use client'

import { useState, useEffect } from 'react'
import Header from './Header'
import Sidebar from './Sidebar'

export default function MainLayoutClient({ children }: { children: React.ReactNode }) {
  // Cerrado por defecto (SSR seguro), se abre en desktop después de hidratación
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (window.innerWidth >= 1024) setOpen(true)
  }, [])

  const toggle = () => setOpen(o => !o)
  const close  = () => setOpen(false)

  return (
    <div className="min-h-screen bg-gray-50">
      <Header sidebarOpen={open} onToggle={toggle} />

      {/* Backdrop mobile — clic fuera cierra el sidebar */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={close}
        />
      )}

      <div className="flex min-w-0">
        <Sidebar open={open} onClose={close} />

        <main className={`flex-1 min-w-0 pt-16 min-h-screen transition-all duration-300 ${open ? 'lg:ml-64' : 'lg:ml-0'}`}>
          <div className="p-6 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
