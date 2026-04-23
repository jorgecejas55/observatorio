'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import DirectusService from '@/services/directusService'
import SkeletonLoader from '@/components/shared/SkeletonLoader'
import TablaOferta from '@/components/oferta/TablaOferta'
import { 
  AlojamientoDirectus, 
  GastronomiaDirectus, 
  AtractivoDirectus, 
  ActividadDirectus, 
  ServicioGeneralDirectus 
} from '@/lib/types/directus'

// Importar el mapa dinámicamente para evitar problemas de SSR
const MapaOfertaTuristica = dynamic(
  () => import('@/components/MapaOfertaTuristica'),
  { ssr: false }
)

type CollectionType = 'alojamientos' | 'gastronomia' | 'atractivos' | 'actividades' | 'agencias' | 'alquiler-autos'
type ViewType = 'cards' | 'table' | 'map'

interface CollectionConfig {
  id: CollectionType
  label: string
  icon: string
  color: string
  hexColor: string
}

const COLLECTIONS: CollectionConfig[] = [
  { id: 'alojamientos', label: 'Alojamientos', icon: 'fa-hotel', color: 'bg-blue-600', hexColor: '#2563eb' },
  { id: 'gastronomia', label: 'Gastronomía', icon: 'fa-utensils', color: 'bg-orange-500', hexColor: '#f97316' },
  { id: 'atractivos', label: 'Atractivos', icon: 'fa-map-location-dot', color: 'bg-green-600', hexColor: '#16a34a' },
  { id: 'actividades', label: 'Actividades', icon: 'fa-ticket', color: 'bg-purple-600', hexColor: '#9333ea' },
  { id: 'agencias', label: 'Agencias', icon: 'fa-briefcase', color: 'bg-teal-600', hexColor: '#0d9488' },
  { id: 'alquiler-autos', label: 'Alquiler de Autos', icon: 'fa-car', color: 'bg-red-600', hexColor: '#dc2626' },
]

// Componente para celdas de imagen con fallback (versión para cards)
function CardImage({ src, alt }: { src: string, alt: string }) {
  const [error, setError] = useState(false)
  const fallback = 'https://via.placeholder.com/400x300?text=Sin+Imagen'
  
  return (
    <img 
      src={error ? fallback : src} 
      alt={alt}
      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      onError={() => setError(true)}
    />
  )
}

export default function OfertaTuristicaPage() {
  const [activeCollection, setActiveCollection] = useState<CollectionType>('alojamientos')
  const [viewMode, setViewMode] = useState<ViewType>('table')
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  
  // Filtros dinámicos
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroCategoria, setFiltroCategoria] = useState('todos')
  const [filtroEspecialidad, setFiltroEspecialidad] = useState('todos')
  
  // Filtros de menú especial
  const [filtroCeliacos, setFiltroCeliacos] = useState('todos')
  const [filtroVegetariano, setFiltroVegetariano] = useState('todos')
  const [filtroVegano, setFiltroVegano] = useState('todos')

  // Estados del mapa
  const [mostrarHeatmap, setMostrarHeatmap] = useState(false)
  const [mostrarMarcadores, setMostrarMarcadores] = useState(true)

  const cargarDatos = useCallback(async (collection: CollectionType) => {
    try {
      setLoading(true)
      setError(null)
      // Reset filtros al cambiar colección
      setFiltroTipo('todos') 
      setFiltroCategoria('todos')
      setFiltroEspecialidad('todos')
      setFiltroCeliacos('todos')
      setFiltroVegetariano('todos')
      setFiltroVegano('todos')
      setBusqueda('')

      let result: any[] = []

      switch (collection) {
        case 'alojamientos':
          result = await DirectusService.getAlojamientos()
          break
        case 'gastronomia':
          result = await DirectusService.getGastronomia()
          break
        case 'atractivos':
          result = await DirectusService.getAtractivos()
          break
        case 'actividades':
          result = await DirectusService.getActividades()
          break
        case 'agencias':
          result = await DirectusService.getServiciosGenerales('Agencias de Viajes')
          break
        case 'alquiler-autos':
          result = await DirectusService.getServiciosGenerales('Alquiler de Vehículos')
          break
      }

      // Asegurar que los datos sean serializables y no contengan objetos extraños
      setData(JSON.parse(JSON.stringify(result)))
    } catch (err: any) {
      console.error('Error cargando datos de Directus:', err)
      setError('No se pudieron cargar los datos de la oferta turística.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargarDatos(activeCollection)
  }, [activeCollection, cargarDatos])

  // Cálculo de opciones para filtros
  const tiposUnicos = useMemo(() => 
    ['todos', ...Array.from(new Set(data.map(item => item.tipo_de_alojamiento || item.tipo).filter(Boolean)))].sort()
  , [data])

  const categoriasUnicas = useMemo(() => 
    ['todos', ...Array.from(new Set(data.map(item => item.categoria).filter(Boolean)))].sort()
  , [data])

  const especialidadesUnicas = useMemo(() => 
    ['todos', ...Array.from(new Set(data.map(item => item.especialidad).filter(Boolean)))].sort()
  , [data])

  // Lógica de filtrado unificada
  const datosFiltrados = useMemo(() => {
    return data.filter(item => {
      const nombreItem = (item.nombre || item.denominacion || '').toLowerCase()
      const direccionItem = (item.direccion || '').toLowerCase()
      const tipoItem = (item.tipo_de_alojamiento || item.tipo || '').toLowerCase()

      const cumpleBusqueda = 
        nombreItem.includes(busqueda.toLowerCase()) ||
        direccionItem.includes(busqueda.toLowerCase()) ||
        tipoItem.includes(busqueda.toLowerCase())

      const cumpleTipo = filtroTipo === 'todos' || (item.tipo_de_alojamiento || item.tipo) === filtroTipo
      const cumpleCategoria = filtroCategoria === 'todos' || item.categoria === filtroCategoria
      const cumpleEspecialidad = filtroEspecialidad === 'todos' || item.especialidad === filtroEspecialidad

      // Lógica de menús especiales corregida
      const opciones = (item.opciones_de_menu || []) as string[]
      const cumpleCeliaco = filtroCeliacos === 'todos' || opciones.some(o => o.toLowerCase().includes('celíaco'))
      const cumpleVegetariano = filtroVegetariano === 'todos' || opciones.some(o => o.toLowerCase().includes('vegetariano'))
      const cumpleVegano = filtroVegano === 'todos' || opciones.some(o => o.toLowerCase().includes('vegano'))

      return cumpleBusqueda && cumpleTipo && cumpleCategoria && cumpleEspecialidad && cumpleCeliaco && cumpleVegetariano && cumpleVegano
    })
  }, [data, busqueda, filtroTipo, filtroCategoria, filtroEspecialidad, filtroCeliacos, filtroVegetariano, filtroVegano])

  const activeConfig = COLLECTIONS.find(c => c.id === activeCollection)

  // Estadísticas dinámicas (Alojamientos)
  const totalHabitaciones = useMemo(() => 
    datosFiltrados.reduce((sum, item) => sum + (item.capacidad_de_habitaciones || 0), 0)
  , [datosFiltrados])

  const totalPlazas = useMemo(() => 
    datosFiltrados.reduce((sum, item) => sum + (item.capacidad_plazas || 0), 0)
  , [datosFiltrados])

  // Estadísticas dinámicas (Gastronomía)
  const totalCubiertos = useMemo(() => 
    datosFiltrados.reduce((sum, item) => sum + (item.capacidad || 0), 0)
  , [datosFiltrados])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Estructura de la Oferta Turística</h1>
          <p className="text-gray-600 mt-1">
            Información oficial sincronizada desde Directus — San Fernando del Valle de Catamarca
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Selector de Colecciones */}
        <div className="flex flex-wrap gap-3 mb-8">
          {COLLECTIONS.map((col) => (
            <button
              key={col.id}
              onClick={() => setActiveCollection(col.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all shadow-sm ${
                activeCollection === col.id
                  ? `${col.color} text-white shadow-md scale-105`
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <i className={`fa-solid ${col.icon}`}></i>
              {col.label}
            </button>
          ))}
        </div>

        {/* Controles Superiores: Búsqueda y Vista */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          {/* Buscador */}
          <div className="flex-grow bg-white rounded-xl shadow-sm border p-2 flex items-center">
            <div className="relative w-full">
              <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input
                type="text"
                placeholder={`Buscar en ${activeConfig?.label.toLowerCase()}...`}
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-transparent focus:outline-none text-gray-700 font-medium"
              />
            </div>
            {busqueda && (
              <button onClick={() => setBusqueda('')} className="px-4 text-gray-400 hover:text-gray-600">
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>

          {/* Selector de Vista */}
          <div className="bg-white rounded-xl shadow-sm border p-1 flex items-center shrink-0">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all ${
                viewMode === 'table' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <i className="fa-solid fa-table-list"></i>
              Tabla
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all ${
                viewMode === 'cards' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <i className="fa-solid fa-grip"></i>
              Cards
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all ${
                viewMode === 'map' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <i className="fa-solid fa-map"></i>
              Mapa
            </button>
          </div>
        </div>

        {/* Filtros Avanzados (Sobre las estadísticas y cards) */}
        {(activeCollection === 'alojamientos' || activeCollection === 'gastronomia') && !loading && !error && (
          <div className="flex flex-wrap gap-4 mb-8 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            {/* Filtro Tipo (Común) */}
            <div className="flex flex-col gap-1.5 min-w-[200px]">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Filtrar por Tipo</label>
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-gray-900 bg-gray-50 text-gray-700 cursor-pointer"
              >
                {tiposUnicos.map(tipo => (
                  <option key={tipo} value={tipo}>{tipo === 'todos' ? 'Todos los tipos' : tipo}</option>
                ))}
              </select>
            </div>

            {/* Filtro Categoría (Alojamientos) */}
            {activeCollection === 'alojamientos' && (
              <div className="flex flex-col gap-1.5 min-w-[200px]">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Categoría</label>
                <select
                  value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value)}
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-gray-900 bg-gray-50 text-gray-700 cursor-pointer"
                >
                  {categoriasUnicas.map(cat => (
                    <option key={cat} value={cat}>{cat === 'todos' ? 'Todas las categorías' : cat}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Filtro Especialidad (Gastronomía) */}
            {activeCollection === 'gastronomia' && (
              <>
                <div className="flex flex-col gap-1.5 min-w-[200px]">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Especialidad</label>
                  <select
                    value={filtroEspecialidad}
                    onChange={(e) => setFiltroEspecialidad(e.target.value)}
                    className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-gray-900 bg-gray-50 text-gray-700 cursor-pointer"
                  >
                    {especialidadesUnicas.map(esp => (
                      <option key={esp} value={esp}>{esp === 'todos' ? 'Todas las especialidades' : esp}</option>
                    ))}
                  </select>
                </div>

                {/* Filtros de Menú Especial */}
                <div className="flex flex-col gap-1.5 min-w-[150px]">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Menú Celíaco</label>
                  <select
                    value={filtroCeliacos}
                    onChange={(e) => setFiltroCeliacos(e.target.value)}
                    className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 bg-gray-50 text-gray-700 cursor-pointer"
                  >
                    <option value="todos">Todos</option>
                    <option value="si">Solo con menú celíaco</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 min-w-[150px]">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Vegetariano</label>
                  <select
                    value={filtroVegetariano}
                    onChange={(e) => setFiltroVegetariano(e.target.value)}
                    className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50 text-gray-700 cursor-pointer"
                  >
                    <option value="todos">Todos</option>
                    <option value="si">Solo vegetariano</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 min-w-[150px]">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Vegano</label>
                  <select
                    value={filtroVegano}
                    onChange={(e) => setFiltroVegano(e.target.value)}
                    className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 bg-gray-50 text-gray-700 cursor-pointer"
                  >
                    <option value="todos">Todos</option>
                    <option value="si">Solo vegano</option>
                  </select>
                </div>
              </>
            )}

            <div className="flex items-end pb-1 ml-auto">
              <button 
                onClick={() => { setFiltroTipo('todos'); setFiltroCategoria('todos'); setFiltroEspecialidad('todos'); setBusqueda(''); }}
                className="text-xs text-gray-400 hover:text-red-600 font-bold px-3 py-2 transition-colors flex items-center gap-2"
              >
                <i className="fa-solid fa-trash-can"></i>
                Limpiar Filtros
              </button>
            </div>
          </div>
        )}

        {/* Tarjetas de Estadísticas Dinámicas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Total {activeConfig?.label}</p>
              <p className="text-2xl font-bold text-gray-900">{datosFiltrados.length}</p>
              {datosFiltrados.length !== data.length && (
                <p className="text-xs text-gray-400">filtrados de {data.length}</p>
              )}
            </div>
            <div className={`w-12 h-12 rounded-lg ${activeConfig?.color} bg-opacity-10 flex items-center justify-center`}>
              <i className={`fa-solid ${activeConfig?.icon} text-xl ${activeConfig?.color.replace('bg-', 'text-')}`}></i>
            </div>
          </div>

          {activeCollection === 'alojamientos' && (
            <>
              <div className="bg-white rounded-xl shadow-sm border p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Habitaciones</p>
                  <p className="text-2xl font-bold text-purple-600">{totalHabitaciones}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
                  <i className="fa-solid fa-door-open text-xl"></i>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Plazas Totales</p>
                  <p className="text-2xl font-bold text-orange-600">{totalPlazas}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                  <i className="fa-solid fa-bed text-xl"></i>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Promedio Plazas/Hab.</p>
                  <p className="text-2xl font-bold text-green-600">
                    {totalHabitaciones > 0 ? (totalPlazas / totalHabitaciones).toFixed(1) : 0}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                  <i className="fa-solid fa-calculator text-xl"></i>
                </div>
              </div>
            </>
          )}

          {activeCollection === 'gastronomia' && (
            <div className="bg-white rounded-xl shadow-sm border p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Cubiertos</p>
                <p className="text-2xl font-bold text-orange-600">{totalCubiertos}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                <i className="fa-solid fa-chair text-xl"></i>
              </div>
            </div>
          )}
        </div>

        {/* Contenido Principal */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-xl border p-4 shadow-sm">
                <SkeletonLoader className="h-48 w-full rounded-lg mb-4" />
                <SkeletonLoader className="h-6 w-3/4 mb-2" />
                <SkeletonLoader className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
            <i className="fa-solid fa-circle-exclamation text-red-500 text-4xl mb-4"></i>
            <p className="text-red-800 font-bold text-lg">{error}</p>
            <button 
              onClick={() => cargarDatos(activeCollection)}
              className="mt-4 bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition"
            >
              Reintentar
            </button>
          </div>
        ) : datosFiltrados.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
            <i className="fa-solid fa-folder-open text-gray-300 text-5xl mb-4"></i>
            <p className="text-gray-500 text-lg">No se encontraron resultados</p>
          </div>
        ) : viewMode === 'map' ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-6 bg-white p-4 rounded-xl shadow-sm border mb-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="toggleMarcadores"
                  checked={mostrarMarcadores}
                  onChange={(e) => setMostrarMarcadores(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 cursor-pointer"
                />
                <label htmlFor="toggleMarcadores" className="text-sm font-bold text-gray-700 cursor-pointer select-none">
                  Mostrar Marcadores
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="toggleHeatmap"
                  checked={mostrarHeatmap}
                  onChange={(e) => setMostrarHeatmap(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 cursor-pointer"
                />
                <label htmlFor="toggleHeatmap" className="text-sm font-bold text-gray-700 cursor-pointer select-none">
                  Mapa de Calor
                </label>
              </div>
            </div>
            <MapaOfertaTuristica 
              items={datosFiltrados} 
              altura="700px" 
              color={activeConfig?.hexColor}
              mostrarHeatmap={mostrarHeatmap}
              mostrarMarcadores={mostrarMarcadores}
            />
          </div>
        ) : viewMode === 'table' ? (
          <TablaOferta items={datosFiltrados} collection={activeCollection} color={activeConfig?.hexColor} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {datosFiltrados.map((item) => (
              <div key={item.id} className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-all overflow-hidden flex flex-col group">
                <div className="h-48 bg-gray-200 relative overflow-hidden">
                  <CardImage 
                    src={DirectusService.getImageUrl(item.foto_principal?.id || item.foto_principal)} 
                    alt={item.nombre || item.denominacion}
                  />
                  {/* Badge de Tipo */}
                  {(item.tipo_de_alojamiento || item.tipo) && (
                    <span className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-black text-gray-700 shadow-sm border border-gray-100 uppercase tracking-tighter">
                      {item.tipo_de_alojamiento || item.tipo}
                    </span>
                  )}
                  {/* Badge de Categoría o Especialidad */}
                  {(item.categoria || item.especialidad) && (
                    <span className="absolute top-3 left-3 bg-gray-900/80 backdrop-blur-sm text-white px-3 py-1 rounded-full text-[10px] font-black shadow-sm uppercase tracking-tighter">
                      {item.categoria || item.especialidad}
                    </span>
                  )}
                </div>
                
                <div className="p-5 flex-grow">
                  <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1 group-hover:text-blue-600 transition-colors">
                    {item.nombre || item.denominacion}
                  </h3>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    {item.direccion && (
                      <p className="flex items-start gap-2">
                        <i className="fa-solid fa-location-dot mt-1 text-gray-400"></i>
                        <span className="line-clamp-2">{item.direccion}</span>
                      </p>
                    )}
                    {item.telefono && (
                      <p className="flex items-center gap-2">
                        <i className="fa-solid fa-phone text-gray-400"></i>
                        <span>{item.telefono}</span>
                      </p>
                    )}
                  </div>

                  {/* Datos técnicos dinámicos */}
                  <div className="mt-4 pt-4 border-t flex flex-wrap gap-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    {activeCollection === 'alojamientos' && (
                      <>
                        {item.capacidad_de_habitaciones > 0 && (
                          <span className="flex items-center gap-1.5">
                            <i className="fa-solid fa-door-open text-gray-400"></i> {item.capacidad_de_habitaciones} Hab.
                          </span>
                        )}
                        {item.capacidad_plazas > 0 && (
                          <span className="flex items-center gap-1.5">
                            <i className="fa-solid fa-bed text-gray-400"></i> {item.capacidad_plazas} Plazas
                          </span>
                        )}
                      </>
                    )}

                    {activeCollection === 'gastronomia' && item.capacidad > 0 && (
                      <span className="flex items-center gap-1.5">
                        <i className="fa-solid fa-chair text-gray-400"></i> {item.capacidad} Cubiertos
                      </span>
                    )}

                    {activeCollection === 'actividades' && item.lugar_realizacion && (
                      <span className="flex items-center gap-1.5 text-purple-600">
                        <i className="fa-solid fa-map-pin"></i> {item.lugar_realizacion.nombre}
                      </span>
                    )}
                  </div>
                </div>

                <div className="px-5 py-3 bg-gray-50 border-t flex justify-between items-center group-hover:bg-gray-100 transition-colors">
                  <button className="text-[10px] font-black text-blue-600 hover:text-blue-800 transition uppercase tracking-widest">
                    Ver ficha completa
                  </button>
                  {item.ubicacion && (
                    <div className="text-gray-300 group-hover:text-green-600 transition-colors" title="Ubicación disponible">
                      <i className="fa-solid fa-map-location-dot text-lg"></i>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-gray-400 text-xs font-bold uppercase tracking-[0.2em]">
          <p>Observatorio de Turismo Municipal — Secretaría de Turismo y Desarrollo Económico</p>
          <p className="mt-1">San Fernando del Valle de Catamarca</p>
        </div>
      </footer>
    </div>
  )
}
