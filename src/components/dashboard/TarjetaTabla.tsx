'use client'

import type { ReactNode } from 'react'
import SelectorAnio from './SelectorAnio'

interface Props {
  titulo: string
  anios: number[]
  anio: number | null
  onCambiarAnio: (anio: number) => void
  encabezados: string[]
  children: ReactNode
  pie?: ReactNode
}

/** Card con título, chips de año y tabla — estructura común a las 3 tablas del dashboard. */
export default function TarjetaTabla({ titulo, anios, anio, onCambiarAnio, encabezados, children, pie }: Props) {
  return (
    <div className="card p-5 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
        <h3 className="text-lg font-semibold text-text-primary">{titulo}</h3>
        <SelectorAnio anios={anios} anio={anio} onChange={onCambiarAnio} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full table-auto text-sm">
          <thead>
            <tr className="bg-gray-50 text-left border-y border-gray-200">
              {encabezados.map(e => (
                <th key={e} className="px-3 py-3 font-medium text-text-secondary">{e}</th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
      {pie && <div className="mt-3 text-xs text-text-secondary">{pie}</div>}
    </div>
  )
}
