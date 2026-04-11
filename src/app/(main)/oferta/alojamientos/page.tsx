'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import AlojamientosService, { type AlojamientoMapData } from '@/services/alojamientosService'

// Importar el mapa de forma dinámica para evitar problemas de SSR
const MapaAlojamientosNoRegistrados = dynamic(
  () => import('@/components/MapaAlojamientosNoRegistrados'),
  { ssr: false }
)

export default function AlojamientosNoRegistradosPage() {
  const [alojamientos, setAlojamientos] = useState<AlojamientoMapData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mostrarHeatmap, setMostrarHeatmap] = useState(true)
  const [mostrarMarcadores, setMostrarMarcadores] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')
  const [busqueda, setBusqueda] = useState<string>('')

  useEffect(() => {
    cargarAlojamientos()
  }, [])

  const cargarAlojamientos = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await AlojamientosService.getMapData()
      setAlojamientos(data)
    } catch (err: any) {
      console.error('Error cargando alojamientos:', err)
      setError(err.message || 'No se pudieron cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  // Obtener tipos únicos para filtro
  const tiposUnicos = ['todos', ...Array.from(new Set(alojamientos.map((a) => a.tipo)))]

  // Filtrar alojamientos según tipo y búsqueda
  const alojamientosFiltrados = alojamientos.filter((aloj) => {
    // Filtro por tipo
    const cumpleTipo = filtroTipo === 'todos' || aloj.tipo === filtroTipo

    // Filtro por búsqueda (nombre, dirección, tipo)
    const cumpleBusqueda =
      busqueda === '' ||
      aloj.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      aloj.direccion.toLowerCase().includes(busqueda.toLowerCase()) ||
      aloj.tipo.toLowerCase().includes(busqueda.toLowerCase())

    return cumpleTipo && cumpleBusqueda
  })

  // Calcular estadísticas
  const totalHabitaciones = alojamientos.reduce((sum, a) => sum + (a.habitaciones || 0), 0)
  const totalPlazas = alojamientos.reduce((sum, a) => sum + (a.plazas || 0), 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Alojamientos No Registrados</h1>
              <p className="text-gray-600 mt-1">
                Observatorio Municipal de Turismo — San Fernando del Valle de Catamarca
              </p>
            </div>
            <a
              href="/oferta/alojamientos/admin"
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition"
            >
              Administrar
            </a>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="container mx-auto px-4 py-8">
        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Total Alojamientos</div>
            <div className="text-3xl font-bold text-green-600">{alojamientos.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">
              {busqueda || filtroTipo !== 'todos' ? 'Mostrando' : 'En el mapa'}
            </div>
            <div className="text-3xl font-bold text-pink-600">{alojamientosFiltrados.length}</div>
            {(busqueda || filtroTipo !== 'todos') && alojamientosFiltrados.length !== alojamientos.length && (
              <div className="text-xs text-gray-500 mt-1">de {alojamientos.length} totales</div>
            )}
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Total Habitaciones</div>
            <div className="text-3xl font-bold text-purple-600">{totalHabitaciones}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Total Plazas</div>
            <div className="text-3xl font-bold text-orange-600">{totalPlazas}</div>
          </div>
        </div>

        {/* Búsqueda */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="relative">
            <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input
              type="text"
              placeholder="Buscar por nombre, dirección o tipo..."
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

        {/* Controles */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="filtroTipo" className="text-sm font-medium text-gray-700">
                Filtrar por tipo:
              </label>
              <select
                id="filtroTipo"
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-600"
              >
                {tiposUnicos.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo === 'todos' ? 'Todos los tipos' : tipo}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-4 border-l pl-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="toggleMarcadores"
                  checked={mostrarMarcadores}
                  onChange={(e) => setMostrarMarcadores(e.target.checked)}
                  className="rounded border-gray-300 text-pink-600 focus:ring-pink-600"
                />
                <label htmlFor="toggleMarcadores" className="text-sm font-medium text-gray-700">
                  Mostrar puntos
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="toggleHeatmap"
                  checked={mostrarHeatmap}
                  onChange={(e) => setMostrarHeatmap(e.target.checked)}
                  className="rounded border-gray-300 text-pink-600 focus:ring-pink-600"
                />
                <label htmlFor="toggleHeatmap" className="text-sm font-medium text-gray-700">
                  Mapa de calor
                </label>
              </div>
            </div>

            <button
              onClick={cargarAlojamientos}
              className="ml-auto bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm transition flex items-center gap-2"
            >
              <i className="fa-solid fa-rotate-right"></i>
              Actualizar datos
            </button>
          </div>
        </div>

        {/* Mapa */}
        {loading && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando datos del mapa...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800 font-medium mb-2">Error al cargar los datos</p>
            <p className="text-red-600 text-sm mb-4">{error}</p>
            <button
              onClick={cargarAlojamientos}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition"
            >
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && (
          <MapaAlojamientosNoRegistrados
            alojamientos={alojamientosFiltrados}
            altura="700px"
            mostrarHeatmap={mostrarHeatmap}
            mostrarMarcadores={mostrarMarcadores}
          />
        )}

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
            <i className="fa-solid fa-circle-info"></i>
            Acerca de estos datos
          </h3>
          <p className="text-blue-800 text-sm mb-2">
            Este mapa muestra alojamientos turísticos no registrados oficialmente que fueron identificados mediante
            relevamientos del Observatorio de Turismo Municipal.
          </p>
          <p className="text-blue-800 text-sm">
            Los datos incluyen: nombre, tipo de alojamiento, dirección, capacidad (habitaciones y plazas), y
            características de los servicios ofrecidos.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-gray-600 text-sm">
          <p>Observatorio de Turismo Municipal — Secretaría de Turismo y Desarrollo Económico</p>
          <p className="mt-1">Municipalidad de San Fernando del Valle de Catamarca</p>
        </div>
      </footer>
    </div>
  )
}
