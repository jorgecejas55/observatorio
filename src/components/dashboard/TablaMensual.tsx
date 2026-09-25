'use client'

import type { IndicadorMensual } from '@/lib/indicadores/types'
import TarjetaTabla from './TarjetaTabla'
import { useTablaPorAnio } from './useTablaPorAnio'

function CeldaVariacion({ valor }: { valor: number | null }) {
  if (valor === null) return <td className="px-3 py-3 text-text-secondary">—</td>
  return (
    <td className={`px-3 py-3 font-semibold ${valor >= 0 ? 'text-green-600' : 'text-red-600'}`}>
      {valor >= 0 ? '+' : ''}{valor.toFixed(1)}%
    </td>
  )
}

const ENCABEZADOS = ['Período', 'OH %', 'Var. mensual OH', 'Var. anual OH', 'Estadía (días)', 'Var. mensual estadía']

export default function TablaMensual({ historico }: { historico: IndicadorMensual[] }) {
  const { anio, setAnio, anios, filas } = useTablaPorAnio(historico)

  return (
    <TarjetaTabla
      titulo="Datos Mensuales"
      anios={anios}
      anio={anio}
      onCambiarAnio={setAnio}
      encabezados={ENCABEZADOS}
      pie="Variaciones: mensual contra el mes anterior, anual contra el mismo mes del año previo. «—» cuando falta el mes de referencia."
    >
      {filas.map(item => (
        <tr key={`${item.ano}-${item.mes}`} className="border-b border-gray-100 hover:bg-gray-50">
          <td className="px-3 py-3">{item.mes} {item.ano}</td>
          <td className="px-3 py-3">{item.oh.toFixed(1)}%</td>
          <CeldaVariacion valor={item.oh_var_mensual} />
          <CeldaVariacion valor={item.oh_var_anual} />
          <td className="px-3 py-3">{item.estadia_prom.toFixed(1)} días</td>
          <CeldaVariacion valor={item.estadia_var_mensual} />
        </tr>
      ))}
    </TarjetaTabla>
  )
}
