'use client'

import type { IndicadorFinde } from '@/lib/indicadores/types'
import TarjetaTabla from './TarjetaTabla'
import { useTablaPorAnio } from './useTablaPorAnio'

const ENCABEZADOS = ['Evento', 'Mes', 'OH %', 'Estadía', 'Visitantes']

export default function TablaFindes({ historico }: { historico: IndicadorFinde[] }) {
  const { anio, setAnio, anios, filas } = useTablaPorAnio(historico)

  return (
    <TarjetaTabla
      titulo="Histórico Fines de Semana Largos"
      anios={anios}
      anio={anio}
      onCambiarAnio={setAnio}
      encabezados={ENCABEZADOS}
    >
      {filas.map((item, i) => (
        <tr key={`${item.ano}-${item.evento}-${i}`} className="border-b border-gray-100 hover:bg-gray-50">
          <td className="px-3 py-3 font-medium text-text-primary">{item.evento}</td>
          <td className="px-3 py-3 text-text-secondary">{item.mes}</td>
          <td className="px-3 py-3 text-primary font-bold">{item.oh.toFixed(1)}%</td>
          <td className="px-3 py-3">{item.estadia_prom.toFixed(1)} días</td>
          <td className="px-3 py-3">{item.visitantes.toLocaleString('es-AR')}</td>
        </tr>
      ))}
    </TarjetaTabla>
  )
}
