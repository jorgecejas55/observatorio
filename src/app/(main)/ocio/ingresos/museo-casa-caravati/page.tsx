'use client'

import React from 'react'
import Link from 'next/link'
import { MuseoCasaCaravatiAuthProvider, useMuseoCasaCaravatiAuth } from '@/contexts/MuseoCasaCaravatiAuthContext'
import MuseoLoginForm from '@/components/museos/MuseoLoginForm'

function MuseoCasaCaravatiDashboardContent() {
  const { isAuthenticated, loading, login, logout, getUserInfo } = useMuseoCasaCaravatiAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-text-secondary">Verificando sesión...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated()) {
    return (
      <MuseoLoginForm
        nombreMuseo="Museo de la Ciudad - Casa Caravati"
        onLogin={login}
        loading={loading}
      />
    )
  }

  const userInfo = getUserInfo()

  const handleLogout = () => {
    const confirmar = window.confirm('¿Estás seguro de que querés cerrar sesión?')
    if (confirmar) {
      logout()
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="section-title">Museo de la Ciudad - Casa Caravati</h2>
          <p className="text-text-secondary text-sm -mt-6">
            Gestión de visitas y estadísticas
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
            <i className="fa-solid fa-user text-primary text-sm" />
            <span className="text-sm text-text-primary font-medium">
              {userInfo?.nombre || userInfo?.email}
            </span>
            <button
              onClick={handleLogout}
              className="ml-2 text-text-secondary hover:text-red-600 transition-colors"
              title="Cerrar sesión"
            >
              <i className="fa-solid fa-right-from-bracket text-sm" />
            </button>
          </div>
        </div>
      </div>

      {/* Cards de navegación */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Visitas Ocasionales */}
        <Link
          href="/ocio/ingresos/museo-casa-caravati/ocasionales"
          className="card p-6 card-hover group"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <i className="fa-solid fa-users text-xl text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-text-primary group-hover:text-primary transition-colors mb-1">
                Visitas Ocasionales
              </h3>
              <p className="text-sm text-text-secondary mb-3">
                Registrá y gestioná visitas de visitantes regulares
              </p>
              <p className="text-xs text-primary font-medium flex items-center gap-1">
                Acceder al registro
                <i className="fa-solid fa-arrow-right" />
              </p>
            </div>
          </div>
        </Link>

        {/* Visitas Institucionales */}
        <Link
          href="/ocio/ingresos/museo-casa-caravati/institucionales"
          className="card p-6 card-hover group"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
              <i className="fa-solid fa-building text-xl text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-text-primary group-hover:text-primary transition-colors mb-1">
                Visitas Institucionales
              </h3>
              <p className="text-sm text-text-secondary mb-3">
                Registrá y gestioná visitas de escuelas, organismos y grupos organizados
              </p>
              <p className="text-xs text-primary font-medium flex items-center gap-1">
                Acceder al registro
                <i className="fa-solid fa-arrow-right" />
              </p>
            </div>
          </div>
        </Link>

        {/* Dashboard de Métricas */}
        <Link
          href="/ocio/ingresos/museo-casa-caravati/dashboard"
          className="card p-6 card-hover group"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
              <i className="fa-solid fa-chart-line text-xl text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-text-primary group-hover:text-primary transition-colors mb-1">
                Dashboard de Métricas
              </h3>
              <p className="text-sm text-text-secondary mb-3">
                Visualizá estadísticas y gráficos de visitas
              </p>
              <p className="text-xs text-primary font-medium flex items-center gap-1">
                Ver estadísticas
                <i className="fa-solid fa-arrow-right" />
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* Info adicional */}
      <div className="card p-6 mt-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
            <i className="fa-solid fa-circle-info text-orange-600" />
          </div>
          <div>
            <h4 className="font-semibold text-text-primary mb-1">Información</h4>
            <p className="text-sm text-text-secondary">
              Este sistema reemplaza los formularios de Google Forms. Todos los datos se guardan
              en la misma planilla de Google Sheets y son compatibles con los dashboards de
              Looker Studio existentes.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MuseoCasaCaravatiDashboardPage() {
  return (
    <MuseoCasaCaravatiAuthProvider>
      <MuseoCasaCaravatiDashboardContent />
    </MuseoCasaCaravatiAuthProvider>
  )
}
