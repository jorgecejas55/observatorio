'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import DirectusService from '@/services/directusService'
import SkeletonLoader from '@/components/shared/SkeletonLoader'
import TablaOferta from '@/components/oferta/TablaOferta'

// Importar el mapa dinámicamente con una protección adicional
const MapaOfertaTuristica = dynamic(
  () => import('@/components/MapaOfertaTuristica'),
  { 
    ssr: false,
    loading: () => <SkeletonLoader className="h-[700px] w-full rounded-xl" />
  }
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
  
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroCategoria, setFiltroCategoria] = useState('todos')
  const [filtroEspecialidad, setFiltroEspecialidad] = useState('todos')
  const [filtroCeliacos, setFiltroCeliacos] = useState('todos')
  const [filtroVegetariano, setFiltroVegetariano] = useState('todos')
  const [filtroVegano, setFiltroVegano] = useState('todos')

  const [mostrarHeatmap, setMostrarHeatmap] = useState(false)
  const [mostrarMarcadores, setMostrarMarcadores] = useState(true)

  const cargarDatos = useCallback(async (collection: CollectionType) => {
    try {
      setLoading(true)
      setError(null)
      setBusqueda('')
      setFiltroTipo('todos')
      setFiltroCategoria('todos')
      setFiltroEspecialidad('todos')

      let result: any[] = []
      switch (collection) {
        case 'alojamientos': result = await DirectusService.getAlojamientos(); break
        case 'gastronomia': result = await DirectusService.getGastronomia(); break
        case 'atractivos': result = await DirectusService.getAtractivos(); break
        case 'actividades': result = await DirectusService.getActividades(); break
        case 'agencias': result = await DirectusService.getServiciosGenerales('Agencias de Viajes'); break
        case 'alquiler-autos': result = await DirectusService.getServiciosGenerales('Alquiler de Vehículos'); break
      }

      // Limpieza profunda para evitar objetos de evento u otros no serializables
      const cleanData = JSON.parse(JSON.stringify(result || []))
      setData(cleanData)
    } catch (err) {
      console.error('Error:', err)
      setError('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargarDatos(activeCollection)
  }, [activeCollection, cargarDatos])

  const tiposUnicos = useMemo(() => 
    ['todos', ...Array.from(new Set(data.map(item => item.tipo_de_alojamiento || item.tipo || item.tematicas || item.tematica_atractivos).filter(Boolean)))].sort()
  , [data])

  const categoriasUnicas = useMemo(() => 
    ['todos', ...Array.from(new Set(data.map(item => item.categoria).filter(Boolean)))].sort()
  , [data])

  const especialidadesUnicas = useMemo(() => 
    ['todos', ...Array.from(new Set(data.map(item => item.especialidad).filter(Boolean)))].sort()
  , [data])

  const datosFiltrados = useMemo(() => {
    return data.filter(item => {
      const nom = (item.nombre_de_la_actividad || item.nombre || item.denominacion || '').toLowerCase()
      const dir = (item.direccion || '').toLowerCase()
      const bus = busqueda.toLowerCase()
      const cumpleBusqueda = nom.includes(bus) || dir.includes(bus)

      const tipoActual = item.tipo_de_alojamiento || item.tipo || item.tematicas || item.tematica_atractivos
      const cumpleTipo = filtroTipo === 'todos' || tipoActual === filtroTipo
      const cumpleCategoria = filtroCategoria === 'todos' || item.categoria === filtroCategoria
      const cumpleEspecialidad = filtroEspecialidad === 'todos' || item.especialidad === filtroEspecialidad

      const opciones = (item.opciones_de_menu || [])
      const cumpleCeliaco = filtroCeliacos === 'todos' || opciones.some((o: any) => String(o).toLowerCase().includes('celíaco'))
      const cumpleVegetariano = filtroVegetariano === 'todos' || opciones.some((o: any) => String(o).toLowerCase().includes('vegetariano'))
      const cumpleVegano = filtroVegano === 'todos' || opciones.some((o: any) => String(o).toLowerCase().includes('vegano'))

      return cumpleBusqueda && cumpleTipo && cumpleCategoria && cumpleEspecialidad && cumpleCeliaco && cumpleVegetariano && cumpleVegano
    })
  }, [data, busqueda, filtroTipo, filtroCategoria, filtroEspecialidad, filtroCeliacos, filtroVegetariano, filtroVegano])

  const activeConfig = COLLECTIONS.find(c => c.id === activeCollection)

  const totalHabitaciones = useMemo(() => datosFiltrados.reduce((sum, item) => sum + (Number(item.capacidad_de_habitaciones) || 0), 0), [datosFiltrados])
  const totalPlazas = useMemo(() => datosFiltrados.reduce((sum, item) => sum + (Number(item.capacidad_plazas) || 0), 0), [datosFiltrados])
  const totalCubiertos = useMemo(() => datosFiltrados.reduce((sum, item) => sum + (Number(item.capacidad) || 0), 0), [datosFiltrados])

  const totalSinUbicacion = useMemo(() => {
    if (activeCollection !== 'agencias') return 0
    return datosFiltrados.filter(item => {
      const coord1 = String(item.coordenadas_de_ubicacion || '').trim()
      const coord2 = String(item.ubicacion || '').trim()
      return !coord1 && !coord2
    }).length
  }, [datosFiltrados, activeCollection])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Estructura de la Oferta Turística</h1>
          <p className="text-gray-600 mt-1">Información oficial sincronizada — San Fernando del Valle de Catamarca</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Colecciones */}
        <div className="flex flex-wrap gap-3 mb-8">
          {COLLECTIONS.map((col) => (
            <button
              key={col.id}
              onClick={() => setActiveCollection(col.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all ${
                activeCollection === col.id ? `${col.color} text-white shadow-md scale-105` : 'bg-white text-gray-600 hover:bg-gray-100 border'
              }`}
            >
              <i className={`fa-solid ${col.icon}`}></i>
              {col.label}
            </button>
          ))}
        </div>

        {/* Controles */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="flex-grow bg-white rounded-xl shadow-sm border p-2 flex items-center">
            <div className="relative w-full">
              <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input
                type="text"
                placeholder={`Buscar...`}
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-transparent focus:outline-none text-gray-700"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-1 flex items-center">
            {(['table', 'cards', 'map'] as ViewType[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-6 py-3 rounded-lg text-sm font-bold transition-all ${
                  viewMode === mode ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <i className={`fa-solid fa-${mode === 'table' ? 'table-list' : mode === 'cards' ? 'grip' : 'map'} mr-2`}></i>
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Filtros */}
        {(activeCollection === 'alojamientos' || activeCollection === 'gastronomia') && !loading && (
          <div className="flex flex-wrap gap-4 mb-8 bg-white p-5 rounded-2xl shadow-sm border">
            {/* Filtro Tipo */}
            <div className="flex flex-col gap-1.5 min-w-[180px]">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tipo</label>
              <select 
                value={filtroTipo} 
                onChange={(e) => setFiltroTipo(e.target.value)} 
                className="border rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              >
                {tiposUnicos.map(t => <option key={t} value={t}>{t === 'todos' ? 'Todos los tipos' : t}</option>)}
              </select>
            </div>

            {/* Filtro Categoría (Solo Alojamientos) */}
            {activeCollection === 'alojamientos' && (
              <div className="flex flex-col gap-1.5 min-w-[180px]">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Categoría</label>
                <select 
                  value={filtroCategoria} 
                  onChange={(e) => setFiltroCategoria(e.target.value)} 
                  className="border rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                >
                  {categoriasUnicas.map(c => <option key={c} value={c}>{c === 'todos' ? 'Todas las categorías' : c}</option>)}
                </select>
              </div>
            )}

            {/* Filtro Especialidad (Solo Gastronomía) */}
            {activeCollection === 'gastronomia' && (
              <div className="flex flex-col gap-1.5 min-w-[180px]">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Especialidad</label>
                <select 
                  value={filtroEspecialidad} 
                  onChange={(e) => setFiltroEspecialidad(e.target.value)} 
                  className="border rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                >
                  {especialidadesUnicas.map(e => <option key={e} value={e}>{e === 'todos' ? 'Todas las especialidades' : e}</option>)}
                </select>
              </div>
            )}

            {/* Filtros de Dieta (Solo Gastronomía) */}
            {activeCollection === 'gastronomia' && (
              <div className="flex gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 text-center">Celíacos</label>
                  <select 
                    value={filtroCeliacos} 
                    onChange={(e) => setFiltroCeliacos(e.target.value)} 
                    className={`border rounded-xl px-3 py-2.5 text-xs font-bold outline-none transition-all ${filtroCeliacos !== 'todos' ? 'bg-orange-100 border-orange-200 text-orange-700' : 'bg-gray-50'}`}
                  >
                    <option value="todos">Cualquiera</option>
                    <option value="si">Apto Celíacos</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 text-center">Vegetariano</label>
                  <select 
                    value={filtroVegetariano} 
                    onChange={(e) => setFiltroVegetariano(e.target.value)} 
                    className={`border rounded-xl px-3 py-2.5 text-xs font-bold outline-none transition-all ${filtroVegetariano !== 'todos' ? 'bg-green-100 border-green-200 text-green-700' : 'bg-gray-50'}`}
                  >
                    <option value="todos">Cualquiera</option>
                    <option value="si">Apto Vegetariano</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 text-center">Vegano</label>
                  <select 
                    value={filtroVegano} 
                    onChange={(e) => setFiltroVegano(e.target.value)} 
                    className={`border rounded-xl px-3 py-2.5 text-xs font-bold outline-none transition-all ${filtroVegano !== 'todos' ? 'bg-teal-100 border-teal-200 text-teal-700' : 'bg-gray-50'}`}
                  >
                    <option value="todos">Cualquiera</option>
                    <option value="si">Apto Vegano</option>
                  </select>
                </div>
              </div>
            )}

            <button 
              onClick={() => { 
                setFiltroTipo('todos'); 
                setFiltroCategoria('todos'); 
                setFiltroEspecialidad('todos');
                setFiltroCeliacos('todos');
                setFiltroVegetariano('todos');
                setFiltroVegano('todos');
                setBusqueda(''); 
              }} 
              className="ml-auto self-end mb-2.5 text-[10px] font-black text-gray-400 hover:text-red-600 uppercase tracking-widest transition-colors"
            >
              <i className="fa-solid fa-trash-can mr-1.5"></i>
              Limpiar Filtros
            </button>
          </div>
        )}

        {/* Estadísticas */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-sm border p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Total {activeConfig?.label}</p>
                <p className="text-2xl font-bold text-gray-900">{datosFiltrados.length}</p>
              </div>
              <div className={`w-12 h-12 rounded-lg ${activeConfig?.color} bg-opacity-10 flex items-center justify-center text-xl ${activeConfig?.color.replace('bg-', 'text-')}`}>
                <i className={`fa-solid ${activeConfig?.icon}`}></i>
              </div>
            </div>
            {/* Bloque estadístico de alojamientos */}
            {activeCollection === 'alojamientos' && (
              <>
                <div className="bg-white rounded-xl shadow-sm border p-4 flex items-center justify-between text-purple-600">
                  <div><p className="text-sm text-gray-500">Habitaciones</p><p className="text-2xl font-bold">{totalHabitaciones}</p></div>
                  <i className="fa-solid fa-door-open text-xl opacity-20"></i>
                </div>
                <div className="bg-white rounded-xl shadow-sm border p-4 flex items-center justify-between text-orange-600">
                  <div><p className="text-sm text-gray-500">Plazas</p><p className="text-2xl font-bold">{totalPlazas}</p></div>
                  <i className="fa-solid fa-bed text-xl opacity-20"></i>
                </div>
              </>
            )}
            {/* Bloque estadístico de agencias */}
            {activeCollection === 'agencias' && (
              <div className="bg-white rounded-xl shadow-sm border p-4 flex items-center justify-between text-amber-600">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Sin ubicación física</p>
                  <p className="text-2xl font-bold">{totalSinUbicacion}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-amber-50 flex items-center justify-center text-xl">
                  <i className="fa-solid fa-map-pin-slash opacity-40"></i>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Contenido */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <SkeletonLoader key={i} className="h-64 w-full rounded-xl" />)}
          </div>
        ) : error ? (
          <div className="bg-red-50 p-8 text-center rounded-xl border border-red-200">
            <p className="text-red-800 font-bold">{error}</p>
            <button onClick={() => cargarDatos(activeCollection)} className="mt-4 bg-red-600 text-white px-6 py-2 rounded-lg">Reintentar</button>
          </div>
        ) : datosFiltrados.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-xl border border-dashed">
            <p className="text-gray-500">No se encontraron resultados</p>
          </div>
        ) : viewMode === 'map' ? (
          <div className="space-y-4">
            <div className="flex gap-6 bg-white p-4 rounded-xl border mb-4">
              <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
                <input type="checkbox" checked={mostrarMarcadores} onChange={(e) => setMostrarMarcadores(e.target.checked)} className="w-4 h-4" /> Marcadores
              </label>
              <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
                <input type="checkbox" checked={mostrarHeatmap} onChange={(e) => setMostrarHeatmap(e.target.checked)} className="w-4 h-4" /> Calor
              </label>
            </div>
            <MapaOfertaTuristica items={datosFiltrados} color={activeConfig?.hexColor} mostrarHeatmap={mostrarHeatmap} mostrarMarcadores={mostrarMarcadores} />
          </div>
        ) : viewMode === 'table' ? (
          <TablaOferta items={datosFiltrados} collection={activeCollection} color={activeConfig?.hexColor} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {datosFiltrados.map((item) => (
              <div key={item.id} className="bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col group">
                <div className="h-48 bg-gray-200 relative overflow-hidden">
                  <CardImage src={DirectusService.getImageUrl(item.foto_principal?.id || item.foto_principal)} alt={item.nombre || item.nombre_de_la_actividad || ''} />
                </div>
                <div className="p-5 flex-grow flex flex-col">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <h3 className="text-lg font-bold text-gray-900 line-clamp-2 leading-tight">
                      {item.nombre_de_la_actividad || item.nombre || item.denominacion}
                    </h3>
                    <span className="text-[10px] font-black px-2 py-1 rounded bg-gray-100 text-gray-500 uppercase whitespace-nowrap">
                      {item.tipo_de_alojamiento || item.tipo || item.categoria || item.tematica_atractivos || item.tematicas || '—'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 flex items-start gap-2 mb-4">
                    <i className="fa-solid fa-location-dot mt-1 text-gray-400"></i>
                    {item.direccion || 'Sin dirección'}
                  </p>
                  
                  {/* Detalles adicionales según colección */}
                  <div className="mt-auto pt-4 border-t border-gray-50 grid grid-cols-2 gap-y-2 gap-x-4 text-[11px]">
                    {item.telefono && (
                      <p className="text-gray-500 flex items-center gap-1.5 truncate">
                        <i className="fa-solid fa-phone text-gray-300"></i> {item.telefono}
                      </p>
                    )}
                    {item.capacidad_plazas && (
                      <p className="text-gray-500 flex items-center gap-1.5">
                        <i className="fa-solid fa-bed text-gray-300"></i> {item.capacidad_plazas} plazas
                      </p>
                    )}
                    {item.capacidad && activeCollection === 'gastronomia' && (
                      <p className="text-gray-500 flex items-center gap-1.5">
                        <i className="fa-solid fa-utensils text-gray-300"></i> {item.capacidad} cubiertos
                      </p>
                    )}
                    {item.estado && (
                      <p className="text-gray-500 flex items-center gap-1.5">
                        <i className="fa-solid fa-circle-info text-gray-300"></i> {item.estado}
                      </p>
                    )}
                    {item.tipos_vehiculos && (
                      <p className="text-gray-500 flex items-center gap-1.5 col-span-2">
                        <i className="fa-solid fa-car text-gray-300"></i> {item.tipos_vehiculos}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="bg-white border-t mt-12 py-6 text-center text-gray-400 text-[10px] font-bold uppercase tracking-widest">
        <p>Observatorio de Turismo Municipal — San Fernando del Valle de Catamarca</p>
      </footer>
    </div>
  )
}
