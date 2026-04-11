'use client'

import { useEffect, useState, useRef } from 'react'
import type { AlojamientoMapData } from '@/services/alojamientosService'
import 'leaflet/dist/leaflet.css'

interface MapaAlojamientosProps {
  alojamientos: AlojamientoMapData[]
  altura?: string
  mostrarHeatmap?: boolean
  mostrarMarcadores?: boolean
}

export default function MapaAlojamientosNoRegistrados({
  alojamientos,
  altura = '600px',
  mostrarHeatmap = true,
  mostrarMarcadores = true,
}: MapaAlojamientosProps) {
  const [MapContainer, setMapContainer] = useState<any>(null)
  const [TileLayer, setTileLayer] = useState<any>(null)
  const [Marker, setMarker] = useState<any>(null)
  const [Popup, setPopup] = useState<any>(null)
  const [HeatmapControllerComponent, setHeatmapControllerComponent] = useState<any>(null)
  const [L, setL] = useState<any>(null)
  const [iconoPersonalizado, setIconoPersonalizado] = useState<any>(null)

  useEffect(() => {
    const loadLeaflet = async () => {
      try {
        const leaflet = await import('leaflet')
        const rl = await import('react-leaflet')

        setL(leaflet.default)
        setMapContainer(rl.MapContainer)
        setTileLayer(rl.TileLayer)
        setMarker(rl.Marker)
        setPopup(rl.Popup)

        // Cargar leaflet.heat
        await import('leaflet.heat')

        // Crear icono personalizado con círculo
        const iconoCustom = leaflet.default.divIcon({
          className: 'custom-marker',
          html: `
            <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" fill="#db2777" stroke="#ffffff" stroke-width="2"/>
              <circle cx="12" cy="12" r="4" fill="#ffffff" opacity="0.9"/>
            </svg>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
          popupAnchor: [0, -12],
        })

        setIconoPersonalizado(iconoCustom)

        // Crear componente HeatmapController
        const HeatmapComp = ({
          mostrarHeatmap,
          alojamientos,
          L,
        }: {
          mostrarHeatmap: boolean
          alojamientos: AlojamientoMapData[]
          L: any
        }) => {
          const map = rl.useMap()
          const heatLayerRef = useRef<any>(null)

          useEffect(() => {
            if (!map || !L) return

            // Remover capa existente si hay
            if (heatLayerRef.current) {
              map.removeLayer(heatLayerRef.current)
              heatLayerRef.current = null
            }

            // Si mostrarHeatmap es true, crear nueva capa
            if (mostrarHeatmap) {
              const heatData = alojamientos.map((aloj) => [aloj.lat, aloj.lng, 0.5])

              heatLayerRef.current = (L as any).heatLayer(heatData, {
                radius: 30,
                blur: 20,
                maxZoom: 15,
                max: 1.0,
                minOpacity: 0.3,
                gradient: {
                  0.0: '#0ea5e9',
                  0.3: '#06b6d4',
                  0.5: '#f97316',
                  0.7: '#fb923c',
                  0.85: '#db2777',
                  1.0: '#be185d',
                },
              })

              heatLayerRef.current.addTo(map)
            }

            // Cleanup
            return () => {
              if (heatLayerRef.current && map) {
                map.removeLayer(heatLayerRef.current)
                heatLayerRef.current = null
              }
            }
          }, [mostrarHeatmap, alojamientos, L, map])

          return null
        }

        setHeatmapControllerComponent(() => HeatmapComp)
      } catch (error) {
        console.error('Error cargando Leaflet:', error)
      }
    }

    loadLeaflet()
  }, [])

  if (!MapContainer || !TileLayer || !Marker || !Popup) {
    return (
      <div className="flex items-center justify-center bg-gray-100 rounded-lg" style={{ height: altura }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando mapa...</p>
        </div>
      </div>
    )
  }

  // Centro de San Fernando del Valle de Catamarca
  const centroSFVC = { lat: -28.4696, lng: -65.7795 }

  return (
    <div className="relative rounded-lg overflow-hidden shadow-lg" style={{ height: altura }}>
      <MapContainer
        center={[centroSFVC.lat, centroSFVC.lng]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {mostrarMarcadores && iconoPersonalizado && alojamientos.map((aloj) => (
          <Marker key={aloj.id} position={[aloj.lat, aloj.lng]} icon={iconoPersonalizado}>
            <Popup>
              <div className="p-2">
                <h3 className="font-bold text-lg mb-2">{aloj.nombre}</h3>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="font-semibold">Tipo:</span> {aloj.tipo}
                  </p>
                  <p>
                    <span className="font-semibold">Dirección:</span> {aloj.direccion}
                  </p>
                  {aloj.habitaciones && (
                    <p>
                      <span className="font-semibold">Habitaciones:</span> {aloj.habitaciones}
                    </p>
                  )}
                  {aloj.plazas && (
                    <p>
                      <span className="font-semibold">Plazas:</span> {aloj.plazas}
                    </p>
                  )}
                  {aloj.precio && (
                    <p>
                      <span className="font-semibold">Precio base:</span> ${aloj.precio} ARS/noche
                    </p>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {HeatmapControllerComponent && (
          <HeatmapControllerComponent mostrarHeatmap={mostrarHeatmap} alojamientos={alojamientos} L={L} />
        )}
      </MapContainer>

      <div className="absolute bottom-4 right-4 bg-white p-4 rounded-lg shadow-md z-[1000]">
        <h4 className="font-bold mb-2 text-sm">Leyenda</h4>
        <div className="space-y-1 text-xs">
          {mostrarMarcadores && (
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="#db2777" stroke="#ffffff" strokeWidth="2"/>
                <circle cx="12" cy="12" r="4" fill="#ffffff" opacity="0.9"/>
              </svg>
              <span>Alojamiento no registrado</span>
            </div>
          )}
          {mostrarHeatmap && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gradient-to-r from-cyan-500 via-orange-500 to-pink-600 rounded"></div>
              <span>Densidad de alojamientos</span>
            </div>
          )}
        </div>
        <div className="mt-2 pt-2 border-t text-xs text-gray-600">
          Total: <span className="font-bold">{alojamientos.length}</span> alojamientos
        </div>
      </div>
    </div>
  )
}
