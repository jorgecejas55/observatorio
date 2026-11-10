/**
 * Evolución de ocupación hotelera y estadía promedio (solo informes MENSUAL):
 * líneas ene → mes del informe, año del informe contra el anterior. Presentacional, sin hooks.
 */

import { formatearDecimal, formatearPorcentaje } from '@/lib/formato-numeros'
import type { EvolucionOcupacion as EvolucionOcupacionDatos } from '@/lib/informes-auto/types'
import { LineasComparadas, leyendaAnios } from './MiniGraficos'
import TituloSeccion from './TituloSeccion'

export default function EvolucionOcupacion({ evolucion }: { evolucion: EvolucionOcupacionDatos }) {
  const leyenda = leyendaAnios(evolucion.periodo.anio, 'linea')
  return (
    <div className="mb-8 print:mb-3 evitar-corte">
      <TituloSeccion icono="fa-chart-line">Evolución en el año</TituloSeccion>
      <div className="space-y-4 print:space-y-2">
        <LineasComparadas
          titulo="Ocupación hotelera (%)"
          actual={evolucion.oh.serie}
          anterior={evolucion.oh.serieAnioAnterior}
          leyenda={leyenda}
          formato={v => formatearPorcentaje(v)}
        />
        <LineasComparadas
          titulo="Estadía promedio (noches)"
          actual={evolucion.estadia.serie}
          anterior={evolucion.estadia.serieAnioAnterior}
          leyenda={leyenda}
          formato={v => formatearDecimal(v)}
        />
      </div>
    </div>
  )
}
