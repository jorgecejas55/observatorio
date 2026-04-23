'use client'

import { useState, useMemo } from 'react'
import DirectusService from '@/services/directusService'

interface TablaOfertaProps {
  items: any[]
  collection: string
  color?: string
}

type SortKey = string
type SortDir = 'asc' | 'desc'

// Componente para celdas de imagen con fallback
function ImageCell({ src }: { src: string }) {
  const [error, setError] = useState(false)
  const fallback = 'https://via.placeholder.com/100?text=S/I'
  
  return (
    <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden border border-gray-200">
      <img 
        src={error ? fallback : src} 
        alt="" 
        className="w-full h-full object-cover"
        onError={() => setError(true)}
      />
    </div>
  )
}

export default function TablaOferta({ items, collection, color }: TablaOfertaProps) {
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'nombre', dir: 'asc' })

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const va = String(a[sort.key] || a['denominacion'] || '')
      const vb = String(b[sort.key] || b['denominacion'] || '')
      return sort.dir === 'asc' ? va.localeCompare(vb, 'es') : vb.localeCompare(va, 'es')
    })
  }, [items, sort])

  function toggleSort(key: SortKey) {
    setSort(prev => prev.key === key
      ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      : { key, dir: 'asc' }
    )
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sort.key !== k) return <i className="fa-solid fa-sort text-gray-300 ml-1 text-[10px]" />
    return <i className={`fa-solid fa-sort-${sort.dir === 'asc' ? 'up' : 'down'} ml-1 text-[10px]`} />
  }

  const renderHeaders = () => {
    const commonHeaders = [
      { key: 'nombre', label: 'Nombre / Denominación' },
      { key: 'tipo', label: 'Tipo' },
      { key: 'direccion', label: 'Dirección' },
      { key: 'telefono', label: 'Teléfono' },
    ]

    let specificHeaders: { key: string; label: string }[] = []

    switch (collection) {
      case 'alojamientos':
        specificHeaders = [
          { key: 'categoria', label: 'Cat.' },
          { key: 'capacidad_de_habitaciones', label: 'Hab.' },
          { key: 'capacidad_plazas', label: 'Plazas' },
        ]
        // Ajustar el nombre de la columna tipo para alojamientos
        commonHeaders[1].key = 'tipo_de_alojamiento'
        break
      case 'gastronomia':
        specificHeaders = [
          { key: 'especialidad', label: 'Especialidad' },
          { key: 'capacidad', label: 'Cubiertos' },
        ]
        break
      case 'atractivos':
        // Para atractivos, cambiamos "Tipo" por "Temática"
        commonHeaders[1] = { key: 'tematica_atractivos', label: 'Temática' }
        break
      case 'actividades':
        specificHeaders = [
          { key: 'lugar_realizacion', label: 'Lugar' },
        ]
        break
    }

    // Insertar específicos antes de dirección o al final
    const allHeaders = [...commonHeaders]
    if (collection === 'alojamientos') {
        allHeaders.splice(2, 0, ...specificHeaders)
    } else if (collection === 'gastronomia') {
        allHeaders.splice(2, 0, ...specificHeaders)
    } else {
        allHeaders.push(...specificHeaders)
    }

    return (
      <tr className="border-b border-gray-100 text-left bg-gray-50/50">
        <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Foto</th>
        {allHeaders.map(h => (
          <th 
            key={h.key}
            onClick={() => toggleSort(h.key)}
            className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 cursor-pointer hover:text-gray-900 transition-colors whitespace-nowrap"
          >
            {h.label} <SortIcon k={h.key} />
          </th>
        ))}
        <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Acciones</th>
      </tr>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            {renderHeaders()}
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sortedItems.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50/80 transition-colors group">
                <td className="px-4 py-3">
                  <ImageCell src={DirectusService.getImageUrl(item.foto_principal?.id || item.foto_principal)} />
                </td>
                <td className="px-4 py-3">
                  <p className="font-bold text-gray-900 line-clamp-1">{item.nombre || item.denominacion}</p>
                  {collection === 'alojamientos' && item.categoria && (
                    <p className="text-[10px] font-black text-blue-600 uppercase">{item.categoria}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-block px-2 py-1 rounded bg-gray-100 text-gray-600 text-[10px] font-black uppercase tracking-tighter">
                    {item.tipo_de_alojamiento || item.tematica_atractivos || item.tipo || '—'}
                  </span>
                </td>

                {/* Columnas Dinámicas para Alojamientos */}
                {collection === 'alojamientos' && (
                  <>
                    <td className="px-4 py-3 text-sm text-gray-500 font-medium">{item.categoria || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-bold text-center">
                      {item.capacidad_de_habitaciones && item.capacidad_de_habitaciones > 0 ? item.capacidad_de_habitaciones : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-bold text-center">
                      {item.capacidad_plazas && item.capacidad_plazas > 0 ? item.capacidad_plazas : '—'}
                    </td>
                  </>
                )}

                {/* Columnas Dinámicas para Gastronomía */}
                {collection === 'gastronomia' && (
                  <>
                    <td className="px-4 py-3">
                      <p className="text-xs text-gray-600 font-medium line-clamp-1">{item.especialidad || '—'}</p>
                      {item.opciones_de_menu && item.opciones_de_menu.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {item.opciones_de_menu.map((opc: string, idx: number) => {
                            if (opc.toLowerCase().includes('celíaco')) return <i key={idx} className="fa-solid fa-wheat-awn-circle-exclamation text-orange-400 text-[10px]" title="Menú Celíaco"></i>
                            if (opc.toLowerCase().includes('vegetariano')) return <i key={idx} className="fa-solid fa-leaf text-green-400 text-[10px]" title="Vegetariano"></i>
                            if (opc.toLowerCase().includes('vegano')) return <i key={idx} className="fa-solid fa-seedling text-teal-400 text-[10px]" title="Vegano"></i>
                            return null
                          })}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-bold text-center">
                      {item.capacidad && item.capacidad > 0 ? item.capacidad : '—'}
                    </td>
                  </>
                )}

                {/* Columnas Dinámicas para Actividades */}
                {collection === 'actividades' && (
                  <td className="px-4 py-3 text-xs text-gray-600 font-medium">
                    {item.lugar_realizacion?.nombre || '—'}
                  </td>
                )}

                <td className="px-4 py-3 text-xs text-gray-500 font-medium max-w-[200px] truncate">
                  {item.direccion || '—'}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 font-medium whitespace-nowrap">
                  {item.telefono || '—'}
                </td>
                
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors" title="Ver ficha">
                      <i className="fa-solid fa-eye text-xs"></i>
                    </button>
                    {item.ubicacion && (
                      <button className="p-2 hover:bg-green-50 text-green-600 rounded-lg transition-colors" title="Ver en mapa">
                        <i className="fa-solid fa-map-location-dot text-xs"></i>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
