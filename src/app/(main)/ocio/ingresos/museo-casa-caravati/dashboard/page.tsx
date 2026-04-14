'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { MuseoCasaCaravatiAuthProvider, useMuseoCasaCaravatiAuth } from '@/contexts/MuseoCasaCaravatiAuthContext'
import MuseoLoginForm from '@/components/museos/MuseoLoginForm'
import DashboardMuseo from '@/components/museos/DashboardMuseo'

interface VisitaOcasional {
  id?: string
  Fecha: string
  'Procedencia '?: string
  'Lugar de procedencia '?: string
  'Total de personas': number
  motivo_visita?: string
  canal_difusion?: string
}

interface VisitaInstitucional {
  id?: string
  fecha_visita: string
  procedencia_institucion: string
  tipo_institucion: string
  subtipo_institucion: string
  nombre_institucion: string
  cantidad_asistentes: number
}

function DashboardContent() {
  const { isAuthenticated, loading, login, logout, getUserInfo } = useMuseoCasaCaravatiAuth()
  const [ocasionales, setOcasionales] = useState<VisitaOcasional[]>([])
  const [institucionales, setInstitucionales] = useState<VisitaInstitucional[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargarDatos = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const [resOcasionales, resInstitucionales] = await Promise.all([
        fetch('/api/ocio/ingresos/museo-casa-caravati/ocasionales'),
        fetch('/api/ocio/ingresos/museo-casa-caravati/institucionales')
      ])

      if (!resOcasionales.ok || !resInstitucionales.ok) {
        throw new Error('Error al cargar datos')
      }

      const dataOcasionales = await resOcasionales.json()
      const dataInstitucionales = await resInstitucionales.json()

      setOcasionales(dataOcasionales.data || [])
      setInstitucionales(dataInstitucionales.data || [])
    } catch (err) {
      console.error('Error cargando datos:', err)
      setError('No se pudieron cargar los datos del dashboard')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated()) {
      cargarDatos()
    }
  }, [isAuthenticated, cargarDatos])

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
          <div className="flex items-center gap-3 mb-2">
            <Link
              href="/ocio/ingresos/museo-casa-caravati"
              className="text-text-secondary hover:text-primary transition-colors"
            >
              <i className="fa-solid fa-arrow-left" />
            </Link>
            <h2 className="section-title">Dashboard de Métricas</h2>
          </div>
          <p className="text-text-secondary text-sm -mt-6 ml-9">
            Museo de la Ciudad - Casa Caravati
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

      {/* Loading / Error */}
      {cargando ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="text-center">
            <div className="inline-block w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-text-secondary">Cargando datos del dashboard...</p>
          </div>
        </div>
      ) : error ? (
        <div className="card p-6 bg-red-50 border-red-200">
          <div className="flex items-start gap-3">
            <i className="fa-solid fa-circle-exclamation text-red-600 text-xl" />
            <div>
              <p className="font-semibold text-red-900 mb-1">Error</p>
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={cargarDatos}
                className="btn-secondary mt-3"
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      ) : (
        <DashboardMuseo
          ocasionales={ocasionales}
          institucionales={institucionales}
        />
      )}
    </div>
  )
}

export default function MuseoCasaCaravatiDashboardPage() {
  return (
    <MuseoCasaCaravatiAuthProvider>
      <DashboardContent />
    </MuseoCasaCaravatiAuthProvider>
  )
}
