'use client'

import React, { useState, useCallback } from 'react'
import Link from 'next/link'
import { MuseoVirgenValleAuthProvider, useMuseoVirgenValleAuth } from '@/contexts/MuseoVirgenValleAuthContext'
import MuseoLoginForm from '@/components/museos/MuseoLoginForm'
import Toast from '@/components/shared/Toast'

interface VisitaInstitucional {
  fecha_visita: string
  procedencia_institucion: string
  tipo_institucion: string
  subtipo_institucion: string
  nombre_institucion: string
  cantidad_asistentes: number | string
}

const TIPOS_INSTITUCION = {
  'Instituciones educativas': ['Nivel inicial', 'Nivel primario', 'Nivel secundario', 'Nivel superior / universitario', 'Otros (academias, institutos)'],
  'Organismos públicos': ['Municipales', 'Provinciales', 'Nacionales'],
  'Organizaciones sociales y comunitarias': ['ONGs', 'Fundaciones', 'Centros vecinales', 'Asociaciones civiles'],
  'Instituciones religiosas': ['Parroquias', 'Grupos pastorales', 'Instituciones educativas confesionales'],
  'Sector privado / empresas': ['Empresas', 'Cámaras empresariales', 'Consultoras'],
  'Turismo organizado': ['Agencias de viajes', 'Contingentes turísticos', 'Guías independientes'],
  'Otros': ['Otro']
}

function CargaMasivaContent() {
  const { isAuthenticated, loading: authLoading, login, logout, getUserInfo } = useMuseoVirgenValleAuth()

  const [visitas, setVisitas] = useState<VisitaInstitucional[]>([{
    fecha_visita: '',
    procedencia_institucion: '',
    tipo_institucion: '',
    subtipo_institucion: '',
    nombre_institucion: '',
    cantidad_asistentes: '',
  }])

  const [guardando, setGuardando] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  const agregarVisita = useCallback(() => {
    setVisitas([...visitas, {
      fecha_visita: '',
      procedencia_institucion: '',
      tipo_institucion: '',
      subtipo_institucion: '',
      nombre_institucion: '',
      cantidad_asistentes: '',
    }])
  }, [visitas])

  const quitarVisita = useCallback((index: number) => {
    if (visitas.length === 1) {
      setToast({ message: 'Debe haber al menos una visita', type: 'info' })
      return
    }
    setVisitas(visitas.filter((_, i) => i !== index))
  }, [visitas])

  const actualizarCampo = useCallback((index: number, campo: keyof VisitaInstitucional, valor: any) => {
    const nuevasVisitas = [...visitas]
    nuevasVisitas[index] = { ...nuevasVisitas[index], [campo]: valor }

    // Reset subtipo si cambia tipo
    if (campo === 'tipo_institucion') {
      nuevasVisitas[index].subtipo_institucion = ''
    }

    setVisitas(nuevasVisitas)
  }, [visitas])

  const validar = useCallback(() => {
    for (let i = 0; i < visitas.length; i++) {
      const v = visitas[i]
      if (!v.fecha_visita) {
        setToast({ message: `Fila ${i + 1}: Falta fecha`, type: 'error' })
        return false
      }
      if (!v.procedencia_institucion) {
        setToast({ message: `Fila ${i + 1}: Falta procedencia`, type: 'error' })
        return false
      }
      if (!v.tipo_institucion) {
        setToast({ message: `Fila ${i + 1}: Falta tipo institución`, type: 'error' })
        return false
      }
      if (!v.nombre_institucion) {
        setToast({ message: `Fila ${i + 1}: Falta nombre institución`, type: 'error' })
        return false
      }
      if (!v.cantidad_asistentes || v.cantidad_asistentes === 0) {
        setToast({ message: `Fila ${i + 1}: Falta cantidad asistentes`, type: 'error' })
        return false
      }
    }
    return true
  }, [visitas])

  const guardarTodas = useCallback(async () => {
    if (!validar()) return

    const userInfo = getUserInfo()
    const userEmail = userInfo?.email || 'sin-email'

    setGuardando(true)
    try {
      let exitosas = 0
      let errores = 0

      for (const visita of visitas) {
        try {
          const res = await fetch('/api/ocio/ingresos/museo-virgen-valle/institucionales', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...visita,
              cantidad_asistentes: parseInt(String(visita.cantidad_asistentes)),
              usuario_registro: userEmail
            }),
          })

          const result = await res.json()
          if (result.success) {
            exitosas++
          } else {
            errores++
          }
        } catch (err) {
          errores++
        }
      }

      if (errores === 0) {
        setToast({ message: `${exitosas} visitas guardadas exitosamente`, type: 'success' })
        setVisitas([{
          fecha_visita: '',
          procedencia_institucion: '',
          tipo_institucion: '',
          subtipo_institucion: '',
          nombre_institucion: '',
          cantidad_asistentes: '',
        }])
      } else {
        setToast({ message: `${exitosas} exitosas, ${errores} errores`, type: 'error' })
      }
    } catch (err) {
      setToast({ message: 'Error al guardar las visitas', type: 'error' })
    } finally {
      setGuardando(false)
    }
  }, [visitas, validar, getUserInfo])

  const handleLogout = useCallback(() => {
    const confirmar = window.confirm('¿Estás seguro de que querés cerrar sesión?')
    if (confirmar) logout()
  }, [logout])

  if (authLoading) {
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
        nombreMuseo="Museo de la Virgen del Valle"
        onLogin={login}
        loading={authLoading}
      />
    )
  }

  const userInfo = getUserInfo()

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/ocio/ingresos/museo-virgen-valle/institucionales"
              className="text-text-secondary hover:text-primary transition-colors"
            >
              <i className="fa-solid fa-arrow-left" />
            </Link>
            <h2 className="section-title !mb-0">Carga Masiva - Visitas Institucionales</h2>
          </div>
          <p className="text-text-secondary text-sm">
            Museo de la Virgen del Valle · Registrá múltiples visitas
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

      <div className="card p-4 mb-5 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <i className="fa-solid fa-circle-info text-blue-600 text-xl" />
          <div className="flex-1">
            <p className="text-sm text-blue-900 font-semibold mb-1">Carga múltiples visitas institucionales</p>
            <p className="text-sm text-blue-700">
              Usá este formulario para registrar varias visitas institucionales.
              Agregá filas con el botón "+" y completá los datos de cada institución.
            </p>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-text-primary">
            Visitas a registrar ({visitas.length})
          </h3>
          <button
            onClick={agregarVisita}
            className="btn-secondary text-sm"
          >
            <i className="fa-solid fa-plus" /> Agregar visita
          </button>
        </div>

        <div className="space-y-4">
          {visitas.map((visita, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-text-primary">
                  Visita #{index + 1}
                </span>
                {visitas.length > 1 && (
                  <button
                    onClick={() => quitarVisita(index)}
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    <i className="fa-solid fa-trash" /> Quitar
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary block mb-2">
                    Fecha visita *
                  </label>
                  <input
                    type="date"
                    value={visita.fecha_visita}
                    onChange={e => actualizarCampo(index, 'fecha_visita', e.target.value)}
                    className="input w-full text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary block mb-2">
                    Procedencia *
                  </label>
                  <select
                    value={visita.procedencia_institucion}
                    onChange={e => actualizarCampo(index, 'procedencia_institucion', e.target.value)}
                    className="input w-full text-sm"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="Internacional">Internacional</option>
                    <option value="Nacional">Nacional</option>
                    <option value="Provincial">Provincial</option>
                    <option value="Local">Local</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary block mb-2">
                    Tipo institución *
                  </label>
                  <select
                    value={visita.tipo_institucion}
                    onChange={e => actualizarCampo(index, 'tipo_institucion', e.target.value)}
                    className="input w-full text-sm"
                  >
                    <option value="">Seleccionar...</option>
                    {Object.keys(TIPOS_INSTITUCION).map(tipo => (
                      <option key={tipo} value={tipo}>{tipo}</option>
                    ))}
                  </select>
                </div>

                {visita.tipo_institucion && (
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary block mb-2">
                      Subtipo
                    </label>
                    <select
                      value={visita.subtipo_institucion}
                      onChange={e => actualizarCampo(index, 'subtipo_institucion', e.target.value)}
                      className="input w-full text-sm"
                    >
                      <option value="">Seleccionar...</option>
                      {TIPOS_INSTITUCION[visita.tipo_institucion as keyof typeof TIPOS_INSTITUCION]?.map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary block mb-2">
                    Nombre institución *
                  </label>
                  <input
                    type="text"
                    value={visita.nombre_institucion}
                    onChange={e => actualizarCampo(index, 'nombre_institucion', e.target.value)}
                    placeholder="Nombre de la institución"
                    className="input w-full text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary block mb-2">
                    Cantidad asistentes *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={visita.cantidad_asistentes}
                    onChange={e => actualizarCampo(index, 'cantidad_asistentes', e.target.value)}
                    className="input w-full text-sm"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t">
          <Link
            href="/ocio/ingresos/museo-virgen-valle/institucionales"
            className="btn-secondary"
          >
            Cancelar
          </Link>
          <button
            onClick={guardarTodas}
            disabled={guardando}
            className="btn-primary"
          >
            {guardando ? (
              <>
                <i className="fa-solid fa-spinner fa-spin" /> Guardando...
              </>
            ) : (
              <>
                <i className="fa-solid fa-save" /> Guardar {visitas.length} visita{visitas.length !== 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}

export default function CargaMasivaPage() {
  return (
    <MuseoVirgenValleAuthProvider>
      <CargaMasivaContent />
    </MuseoVirgenValleAuthProvider>
  )
}
