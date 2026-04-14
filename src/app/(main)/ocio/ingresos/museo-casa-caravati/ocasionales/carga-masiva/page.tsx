'use client'

import React, { useState, useCallback } from 'react'
import Link from 'next/link'
import { MuseoCasaCaravatiAuthProvider, useMuseoCasaCaravatiAuth } from '@/contexts/MuseoCasaCaravatiAuthContext'
import MuseoLoginForm from '@/components/museos/MuseoLoginForm'
import { PAISES, PROVINCIAS_ARG, DEPARTAMENTOS_CATAMARCA } from '@/lib/geografia'
import Toast from '@/components/shared/Toast'

const PROCEDENCIAS = ['Internacional', 'Nacional', 'Provincial', 'Residente']
const MOTIVOS = ['Muestra permanente', 'Actividad o muestra especial']
const CANALES = [
  'Facebook',
  'Instagram',
  'TikTok',
  'Diarios digitales',
  'Web de turismo municipal',
  'Radio',
  'Televisión',
  'Otro',
]

interface VisitaOcasional {
  Fecha: string
  'Procedencia ': string
  'Lugar de procedencia ': string
  'Total de personas': number | string
  motivo_visita: string
  canalesSeleccionados: string[]
}

function CargaMasivaContent() {
  const { isAuthenticated, loading: authLoading, login, logout, getUserInfo } = useMuseoCasaCaravatiAuth()

  const [visitas, setVisitas] = useState<VisitaOcasional[]>([{
    Fecha: '',
    'Procedencia ': '',
    'Lugar de procedencia ': '',
    'Total de personas': '',
    motivo_visita: '',
    canalesSeleccionados: [],
  }])

  const [guardando, setGuardando] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  const agregarVisita = useCallback(() => {
    setVisitas([...visitas, {
      Fecha: '',
      'Procedencia ': '',
      'Lugar de procedencia ': '',
      'Total de personas': '',
      motivo_visita: '',
      canalesSeleccionados: [],
    }])
  }, [visitas])

  const quitarVisita = useCallback((index: number) => {
    if (visitas.length === 1) {
      setToast({ message: 'Debe haber al menos una visita', type: 'info' })
      return
    }
    setVisitas(visitas.filter((_, i) => i !== index))
  }, [visitas])

  const actualizarCampo = useCallback((index: number, campo: keyof VisitaOcasional, valor: any) => {
    const nuevasVisitas = [...visitas]

    if (campo === 'Procedencia ') {
      nuevasVisitas[index] = { ...nuevasVisitas[index], [campo]: valor, 'Lugar de procedencia ': '' }
    } else {
      nuevasVisitas[index] = { ...nuevasVisitas[index], [campo]: valor }
    }

    setVisitas(nuevasVisitas)
  }, [visitas])

  const toggleCanal = useCallback((index: number, canal: string) => {
    const nuevasVisitas = [...visitas]
    const canales = nuevasVisitas[index].canalesSeleccionados

    if (canales.includes(canal)) {
      nuevasVisitas[index].canalesSeleccionados = canales.filter(c => c !== canal)
    } else {
      nuevasVisitas[index].canalesSeleccionados = [...canales, canal]
    }

    setVisitas(nuevasVisitas)
  }, [visitas])

  const validar = useCallback(() => {
    for (let i = 0; i < visitas.length; i++) {
      const v = visitas[i]
      if (!v.Fecha) {
        setToast({ message: `Fila ${i + 1}: Falta fecha`, type: 'error' })
        return false
      }
      if (!v['Procedencia ']) {
        setToast({ message: `Fila ${i + 1}: Falta procedencia`, type: 'error' })
        return false
      }
      if (!v['Total de personas'] || v['Total de personas'] === 0) {
        setToast({ message: `Fila ${i + 1}: Falta total de personas`, type: 'error' })
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
          const res = await fetch('/api/ocio/ingresos/museo-casa-caravati/ocasionales', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              Fecha: visita.Fecha,
              'Procedencia ': visita['Procedencia '],
              'Lugar de procedencia ': visita['Lugar de procedencia '],
              'Total de personas': parseInt(String(visita['Total de personas'])),
              motivo_visita: visita.motivo_visita,
              canal_difusion: visita.canalesSeleccionados.join(', '),
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
          Fecha: '',
          'Procedencia ': '',
          'Lugar de procedencia ': '',
          'Total de personas': '',
          motivo_visita: '',
          canalesSeleccionados: [],
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
        nombreMuseo="Museo de la Ciudad - Casa Caravati"
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
              href="/ocio/ingresos/museo-casa-caravati/ocasionales"
              className="text-text-secondary hover:text-primary transition-colors"
            >
              <i className="fa-solid fa-arrow-left" />
            </Link>
            <h2 className="section-title !mb-0">Carga Masiva - Visitas Ocasionales</h2>
          </div>
          <p className="text-text-secondary text-sm">
            Museo de la Ciudad - Casa Caravati · Registrá múltiples visitas
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
            <p className="text-sm text-blue-900 font-semibold mb-1">Carga múltiples visitas</p>
            <p className="text-sm text-blue-700">
              Usá este formulario para registrar varias visitas de un mismo día o periodo.
              Agregá filas con el botón "+" y completá los datos de cada visita.
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
                    Fecha *
                  </label>
                  <input
                    type="date"
                    value={visita.Fecha}
                    onChange={e => actualizarCampo(index, 'Fecha', e.target.value)}
                    className="input w-full text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary block mb-2">
                    Procedencia *
                  </label>
                  <select
                    value={visita['Procedencia ']}
                    onChange={e => actualizarCampo(index, 'Procedencia ', e.target.value)}
                    className="input w-full text-sm"
                  >
                    <option value="">Seleccioná una opción</option>
                    {PROCEDENCIAS.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                {visita['Procedencia '] && visita['Procedencia '] !== 'Residente' && (
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary block mb-2">
                      {visita['Procedencia '] === 'Internacional' && 'País'}
                      {visita['Procedencia '] === 'Nacional' && 'Provincia'}
                      {visita['Procedencia '] === 'Provincial' && 'Departamento'}
                    </label>
                    <select
                      value={visita['Lugar de procedencia ']}
                      onChange={e => actualizarCampo(index, 'Lugar de procedencia ', e.target.value)}
                      className="input w-full text-sm"
                    >
                      <option value="">Seleccioná una opción</option>
                      {visita['Procedencia '] === 'Internacional' &&
                        PAISES.map(pais => (
                          <option key={pais} value={pais}>{pais}</option>
                        ))}
                      {visita['Procedencia '] === 'Nacional' &&
                        PROVINCIAS_ARG.map(provincia => (
                          <option key={provincia} value={provincia}>{provincia}</option>
                        ))}
                      {visita['Procedencia '] === 'Provincial' &&
                        DEPARTAMENTOS_CATAMARCA.map(depto => (
                          <option key={depto} value={depto}>{depto}</option>
                        ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary block mb-2">
                    Total personas *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={visita['Total de personas']}
                    onChange={e => actualizarCampo(index, 'Total de personas', e.target.value)}
                    className="input w-full text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary block mb-2">
                    Motivo visita
                  </label>
                  <div className="space-y-2">
                    {MOTIVOS.map((motivo) => (
                      <label key={motivo} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name={`motivo_visita_${index}`}
                          value={motivo}
                          checked={visita.motivo_visita === motivo}
                          onChange={e => actualizarCampo(index, 'motivo_visita', e.target.value)}
                          className="w-4 h-4 text-primary"
                        />
                        <span className="text-sm text-text-primary">{motivo}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="col-span-full">
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary block mb-2">
                    ¿Por qué canal conoció la propuesta del museo?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {CANALES.map((canal) => (
                      <label key={canal} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visita.canalesSeleccionados.includes(canal)}
                          onChange={() => toggleCanal(index, canal)}
                          className="w-4 h-4 text-primary rounded"
                        />
                        <span className="text-sm text-text-primary">{canal}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t">
          <Link
            href="/ocio/ingresos/museo-casa-caravati/ocasionales"
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
    <MuseoCasaCaravatiAuthProvider>
      <CargaMasivaContent />
    </MuseoCasaCaravatiAuthProvider>
  )
}
