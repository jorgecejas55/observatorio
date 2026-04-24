'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import 'leaflet/dist/leaflet.css'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'

interface MapaOfertaProps {
  items: any[]
  altura?: string
  mostrarHeatmap?: boolean
  mostrarMarcadores?: boolean
  color?: string
}

// Componente para imágenes en el Popup con fallback
function PopupImage({ src, alt }: { src: string, alt: string }) {
  const [error, setError] = useState(false)
  const fallback = 'https://via.placeholder.com/200x150?text=Sin+Imagen'
  
  return (
    <img 
      src={error ? fallback : src} 
      alt={alt}
      className="w-full h-full object-cover"
      onError={() => setError(true)}
    />
  )
}

// Componente controlador del Heatmap (Separado para evitar recreación)
function HeatmapLayer({ mostrarHeatmap, items }: { mostrarHeatmap: boolean, items: any[] }) {
  const map = useMap()
  const heatLayerRef = useRef<any>(null)

  useEffect(() => {
    if (!map) return

    // Limpiar capa anterior
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current)
      heatLayerRef.current = null
    }

    if (mostrarHeatmap && items.length > 0) {
      // Importación dinámica de leaflet.heat (solo cliente)
      import('leaflet.heat').then(() => {
        const heatData = items
          .map(item => {
            const coords = getCoords(item)
            return coords ? [coords[0], coords[1], 0.5] : null
          })
          .filter((c): c is [number, number, number] => c !== null)

        if (heatData.length > 0) {
          heatLayerRef.current = (L as any).heatLayer(heatData, {
            radius: 25,
            blur: 15,
            maxZoom: 15,
          }).addTo(map)
        }
      })
    }

    return () => {
      if (heatLayerRef.current && map) {
        map.removeLayer(heatLayerRef.current)
        heatLayerRef.current = null
      }
    }
  }, [mostrarHeatmap, items, map])

  return null
}

// Función auxiliar de coordenadas optimizada para Directus
const getCoords = (item: any): [number, number] | null => {
  // Priorizamos los campos de ubicación detectados en las distintas colecciones
  const loc = item.coordenadas_de_ubicacion || item.ubicacion || item.location || item.coordenadas

  if (!loc) return null

  // Caso 1: Objeto GeoJSON estándar de Directus { type: "Point", coordinates: [lng, lat] }
  if (typeof loc === 'object' && loc.coordinates && Array.isArray(loc.coordinates)) {
    return [loc.coordinates[1], loc.coordinates[0]]
  }

  // Caso 2: Objeto con propiedades lat/lng directas (algunas configuraciones de Directus)
  if (typeof loc === 'object' && loc.lat !== undefined && loc.lng !== undefined) {
    return [parseFloat(loc.lat), parseFloat(loc.lng)]
  }

  // Caso 3: Cadena de texto "lat, lng" o formatos especiales como "Lat/long (-28.4, -65.7)"
  if (typeof loc === 'string') {
    // Limpiar la cadena de caracteres no numéricos excepto comas, puntos y signos menos
    const cleaned = loc.replace(/[a-zA-Z/()\s]/g, '')
    const parts = cleaned.split(',').filter(Boolean).map((p: string) => parseFloat(p.trim()))
    
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return [parts[0], parts[1]]
    }
  }

  return null
}

export default function MapaOfertaTuristica({
  items,
  altura = '600px',
  mostrarHeatmap = false,
  mostrarMarcadores = true,
  color = '#2563eb',
}: MapaOfertaProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    
    // Fix para los iconos de Leaflet en Next.js
    // @ts-ignore
    delete L.Icon.Default.prototype._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    })
  }, [])

  const iconoPersonalizado = useMemo(() => {
    if (typeof window === 'undefined') return null
    return L.divIcon({
      className: 'custom-marker-oferta',
      html: `
        <svg width="28" height="28" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="${color}" stroke="#ffffff" stroke-width="1.5"/>
        </svg>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      popupAnchor: [0, -28],
    })
  }, [color])

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center bg-gray-100 rounded-xl" style={{ height: altura }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500 text-sm font-medium">Cargando mapa interactivo...</p>
        </div>
      </div>
    )
  }

  const centroSFVC: [number, number] = [-28.4696, -65.7795]

  return (
    <div className="relative rounded-xl overflow-hidden shadow-md border" style={{ height: altura }}>
      <MapContainer
        center={centroSFVC}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {mostrarMarcadores && iconoPersonalizado && items.map((item) => {
          const coords = getCoords(item)
          if (!coords) return null

          const fotoId = item.foto_principal?.id || item.foto_principal
          const fotoUrl = fotoId ? `https://turismo.apps.cc.gob.ar/assets/${fotoId}` : ''

          return (
            <Marker key={item.id} position={coords} icon={iconoPersonalizado}>
              <Popup maxWidth={300}>
                <div className="flex flex-col gap-2 min-w-[200px]">
                  {fotoUrl && (
                    <div className="h-32 -mx-3 -mt-3 mb-1 overflow-hidden">
                      <PopupImage 
                        src={fotoUrl} 
                        alt={item.nombre || item.nombre_de_la_actividad || 'Imagen'}
                      />
                    </div>
                  )}
                  <h3 className="font-bold text-gray-900 leading-tight">
                    {item.nombre || item.nombre_de_la_actividad || item.denominacion}
                  </h3>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p className="flex items-center gap-1.5 font-medium text-blue-600">
                      <i className="fa-solid fa-tag"></i> {item.tipo_de_alojamiento || item.tipo || item.categoria || item.tematica_atractivos || item.tematicas}
                    </p>
                    {item.direccion && (
                      <p className="flex items-start gap-1.5">
                        <i className="fa-solid fa-location-dot mt-0.5 text-gray-400"></i>
                        <span>{item.direccion}</span>
                      </p>
                    )}
                    {item.capacidad_plazas && (
                      <p className="flex items-center gap-1.5">
                        <i className="fa-solid fa-bed text-gray-400"></i>
                        <span>{item.capacidad_plazas} plazas</span>
                      </p>
                    )}
                    {item.estado && (
                      <p className="flex items-center gap-1.5">
                        <i className="fa-solid fa-circle-info text-gray-400"></i>
                        <span>Estado: {item.estado}</span>
                      </p>
                    )}
                    {item.tipos_vehiculos && (
                      <p className="flex items-center gap-1.5">
                        <i className="fa-solid fa-car text-gray-400"></i>
                        <span>Flota: {item.tipos_vehiculos}</span>
                      </p>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}

        <HeatmapLayer mostrarHeatmap={mostrarHeatmap} items={items} />
      </MapContainer>

      {/* Flotante info */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-sm z-[1000] border border-gray-100 hidden md:block">
        <p className="text-xs font-bold text-gray-700 mb-1">Total en el área</p>
        <p className="text-xl font-black" style={{ color }}>{items.length}</p>
      </div>
    </div>
  )
}
