'use client'

import { useEffect, useState } from 'react'
import alojamientosAuthService from '@/services/alojamientosAuthService'
import AlojamientosService, { type Alojamiento } from '@/services/alojamientosService'
import type { User } from '@/services/appsScriptAuthService'

export default function AlojamientosAdminPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verificar si hay sesión activa
    const initialize = async () => {
      const currentUser = await alojamientosAuthService.initialize()
      setUser(currentUser)
      setLoading(false)
    }

    initialize()

    // Suscribirse a cambios de autenticación
    const { unsubscribe } = alojamientosAuthService.onAuthStateChange((event, session) => {
      setUser(session.user)
    })

    return () => unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando sesión...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginScreen />
  }

  return <AdminPanel user={user} />
}

/**
 * Pantalla de login
 */
function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await alojamientosAuthService.login(email, password)

      if (!result.success) {
        setError(result.message || 'Credenciales inválidas')
      }
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Administración de Alojamientos</h1>
            <p className="text-gray-600 text-sm">Observatorio De Turismo Municipal</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="usuario@ejemplo.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 rounded-lg transition"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <a href="/oferta/alojamientos" className="text-green-600 hover:text-green-700 text-sm flex items-center gap-1 justify-center">
              <i className="fa-solid fa-arrow-left"></i>
              Volver al mapa público
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Panel de administración (después del login)
 */
function AdminPanel({ user }: { user: User }) {
  const [alojamientos, setAlojamientos] = useState<Alojamiento[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modoEdicion, setModoEdicion] = useState(false)
  const [alojamientoSeleccionado, setAlojamientoSeleccionado] = useState<Alojamiento | null>(null)
  const [busqueda, setBusqueda] = useState<string>('')

  useEffect(() => {
    cargarAlojamientos()
  }, [])

  const cargarAlojamientos = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await AlojamientosService.getAlojamientos()
      setAlojamientos(data)
    } catch (err: any) {
      setError(err.message || 'Error al cargar alojamientos')
    } finally {
      setLoading(false)
    }
  }

  const handleNuevo = () => {
    setAlojamientoSeleccionado(null)
    setModoEdicion(true)
  }

  const handleEditar = (alojamiento: Alojamiento) => {
    setAlojamientoSeleccionado(alojamiento)
    setModoEdicion(true)
  }

  const handleEliminar = async (id: string, nombre: string) => {
    if (!confirm(`¿Confirmar eliminación de "${nombre}"?`)) return

    try {
      await AlojamientosService.deleteAlojamiento(id)
      await cargarAlojamientos()
    } catch (err: any) {
      alert('Error al eliminar: ' + err.message)
    }
  }

  const handleGuardado = async () => {
    setModoEdicion(false)
    await cargarAlojamientos()
  }

  const handleCancelar = () => {
    setModoEdicion(false)
    setAlojamientoSeleccionado(null)
  }

  const handleLogout = async () => {
    await alojamientosAuthService.logout()
  }

  if (modoEdicion) {
    return (
      <FormularioAlojamiento
        alojamiento={alojamientoSeleccionado}
        user={user}
        onGuardado={handleGuardado}
        onCancelar={handleCancelar}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Panel de Administración</h1>
              <p className="text-sm text-gray-600 mt-1">
                Bienvenido, {user.nombre} {user.apellido}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="/oferta/alojamientos"
                className="text-green-600 hover:text-green-700 text-sm font-medium"
              >
                Ver mapa público
              </a>
              <button
                onClick={handleLogout}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm transition"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">Listado de Alojamientos</h2>
          <button
            onClick={handleNuevo}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition"
          >
            + Nuevo Alojamiento
          </button>
        </div>

        {/* Búsqueda */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="relative">
            <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input
              type="text"
              placeholder="Buscar por nombre, dirección, tipo o propietario..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-600 focus:border-transparent"
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <i className="fa-solid fa-times"></i>
              </button>
            )}
          </div>
        </div>

        {loading && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {!loading && !error && (() => {
          // Filtrar alojamientos según búsqueda
          const alojamientosFiltrados = alojamientos.filter((aloj) => {
            if (!busqueda) return true

            const searchLower = busqueda.toLowerCase()
            return (
              aloj.nombre?.toLowerCase().includes(searchLower) ||
              aloj.direccion?.toLowerCase().includes(searchLower) ||
              aloj.tipo?.toLowerCase().includes(searchLower) ||
              aloj.propietario?.toLowerCase().includes(searchLower)
            )
          })

          return (
            <>
              {busqueda && (
                <div className="mb-4 text-sm text-gray-600">
                  Mostrando {alojamientosFiltrados.length} de {alojamientos.length} alojamientos
                </div>
              )}

              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dirección</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hab.</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plazas</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {alojamientosFiltrados.map((aloj) => (
                      <tr key={aloj.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{aloj.nombre}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{aloj.tipo}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{aloj.direccion}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{aloj.habitaciones || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{aloj.plazas || '-'}</td>
                        <td className="px-6 py-4 text-sm space-x-2">
                          <button
                            onClick={() => handleEditar(aloj)}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleEliminar(aloj.id, aloj.nombre)}
                            className="text-red-600 hover:text-red-800 font-medium"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {alojamientosFiltrados.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    {busqueda ? 'No se encontraron alojamientos con ese criterio de búsqueda' : 'No hay alojamientos registrados'}
                  </div>
                )}
              </div>
            </>
          )
        })()}
      </main>
    </div>
  )
}

/**
 * Formulario de creación/edición de alojamiento
 */
function FormularioAlojamiento({
  alojamiento,
  user,
  onGuardado,
  onCancelar,
}: {
  alojamiento: Alojamiento | null
  user: User
  onGuardado: () => void
  onCancelar: () => void
}) {
  const esNuevo = !alojamiento

  const [formData, setFormData] = useState<Partial<Alojamiento>>(
    alojamiento || {
      nombre: '',
      tipo: '',
      direccion: '',
      coordenadas: '',
      estado: '',
      propietario: '',
      telefono: '',
      email: '',
      redes_sociales: '',
      habitaciones: undefined,
      plazas: undefined,
      tipo_unidades: '',
      precio: undefined,
      servicios: '',
      movilidad_reducida: '',
      horario_ingreso: '',
      horario_salida: '',
      observaciones: '',
    }
  )

  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setGuardando(true)

    try {
      // Validar campos obligatorios
      if (!formData.nombre || !formData.tipo || !formData.direccion || !formData.coordenadas) {
        setError('Los campos Nombre, Tipo, Dirección y Coordenadas son obligatorios')
        setGuardando(false)
        return
      }

      const userName = `${user.nombre} ${user.apellido}`

      if (esNuevo) {
        await AlojamientosService.createAlojamiento(formData, userName)
      } else {
        await AlojamientosService.updateAlojamiento(alojamiento.id, formData, userName)
      }

      onGuardado()
    } catch (err: any) {
      setError(err.message || 'Error al guardar')
      setGuardando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">{esNuevo ? 'Nuevo' : 'Editar'} Alojamiento</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Campos obligatorios */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del alojamiento <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de alojamiento <span className="text-red-500">*</span>
              </label>
              <select
                name="tipo"
                value={formData.tipo}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Seleccionar...</option>
                <option value="Apart">Apart</option>
                <option value="Cabaña">Cabaña</option>
                <option value="Casa">Casa completa</option>
                <option value="Casa">Casa compartida</option>
                <option value="Departamento">Departamento</option>
                <option value="Dúplex">Dúplex</option>
                <option value="Habitación">Habitación</option>
                <option value="Hostel">Hostel</option>
                <option value="Posada">Posada</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dirección <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="direccion"
              value={formData.direccion}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Coordenadas (lat, lng) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="coordenadas"
              value={formData.coordenadas}
              onChange={handleChange}
              required
              placeholder="-28.469, -65.779"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <p className="text-xs text-gray-500 mt-1">Formato: latitud, longitud (separados por coma)</p>
          </div>

          {/* Campos opcionales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Propietario/Responsable</label>
              <input
                type="text"
                name="propietario"
                value={formData.propietario}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input
                type="text"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Habitaciones</label>
              <input
                type="number"
                name="habitaciones"
                value={formData.habitaciones || ''}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plazas totales</label>
              <input
                type="number"
                name="plazas"
                value={formData.plazas || ''}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio base (ARS/noche)</label>
              <input
                type="number"
                name="precio"
                value={formData.precio || ''}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Servicios</label>
            <textarea
              name="servicios"
              value={formData.servicios}
              onChange={handleChange}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
            <textarea
              name="observaciones"
              value={formData.observaciones}
              onChange={handleChange}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Botones */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onCancelar}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition"
            >
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
