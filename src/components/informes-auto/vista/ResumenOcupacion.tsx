import { formatearDecimal, formatearEntero, formatearPesos, formatearPorcentaje } from '@/lib/formato-numeros'
import type { InformeFindeCompleto } from '@/lib/informes-auto/types'
import BarrasHorizontalesOH from './BarrasHorizontalesOH'
import Kpi from './Kpi'
import TituloSeccion from './TituloSeccion'
import Variacion from './Variacion'

type Props = { informe: InformeFindeCompleto }

export function KpisInforme({ informe }: Props) {
  const { relevamiento, perfil, impacto } = informe
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 print:grid-cols-4 gap-4 print:gap-3 mb-8 print:mb-4 evitar-corte">
      <Kpi titulo="Ocupación Hotelera" icono="fa-bed" valor={formatearPorcentaje(relevamiento.ohTotal)} />
      <Kpi titulo="Estadía Promedio" icono="fa-moon" valor={formatearDecimal(perfil.estadiaSinOutliers.estadiaPromedio)} />
      <Kpi titulo="Visitantes Totales" icono="fa-users" valor={formatearEntero(impacto.visitantesTotales)} />
      <Kpi titulo="Impacto Económico" icono="fa-sack-dollar" valor={formatearPesos(impacto.impactoTotal)} chico />
    </div>
  )
}

function tituloAnioAnterior(informe: InformeFindeCompleto): string {
  const anterior = informe.comparativaAnioAnterior.relevamiento
  if (!anterior) return 'Año anterior'
  return informe.tipoInforme === 'MENSUAL' ? anterior.nombre : `${anterior.nombre} ${anterior.fechaFin.slice(0, 4)}`
}

/** Valor de un período comparado + variación del período del informe respecto de él. */
function CeldaComparada({ valor, actual, formato, vacio = '—' }: {
  valor: number | null | undefined
  actual: number
  formato: (v: number) => string
  vacio?: string
}) {
  return (
    <td className="text-center py-2 px-3 text-text-secondary">
      {valor ? (
        <>
          <span className="block">{formato(valor)}</span>
          <Variacion actual={actual} anterior={valor} />
        </>
      ) : vacio}
    </td>
  )
}

export function TablaComparativas({ informe }: Props) {
  const { relevamiento, impacto, perfil, comparativaUltimoFinde: ultimo, comparativaAnioAnterior: anterior } = informe
  const estadia = perfil.estadiaSinOutliers.estadiaPromedio
  // Informes guardados antes de sumar la estadía a las comparativas: no se muestra una fila vacía
  const conEstadia = ultimo.estadiaPromedio !== undefined || anterior.estadiaPromedio !== undefined
  return (
    <div className="mb-8 print:mb-3 evitar-corte">
      <TituloSeccion icono="fa-scale-balanced">Comparativas</TituloSeccion>
      <div className="overflow-x-auto print:overflow-visible">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-2 px-3 text-text-secondary font-medium">Indicador</th>
              <th className="text-center py-2 px-3 text-text-primary font-semibold">
                {informe.nombre}
              </th>
              <th className="text-center py-2 px-3 text-text-secondary font-medium">
                <span className="whitespace-normal text-xs print:text-[10px]">
                  {ultimo.relevamiento?.nombre ?? 'Último finde del año'}
                </span>
              </th>
              <th className="text-center py-2 px-3 text-text-secondary font-medium">
                <span className="whitespace-normal text-xs print:text-[10px]">
                  {tituloAnioAnterior(informe)}
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr>
              <td className="py-2 px-3 font-medium text-text-secondary">OH</td>
              <td className="text-center py-2 px-3 font-bold text-text-primary">
                {formatearPorcentaje(relevamiento.ohTotal)}
              </td>
              <CeldaComparada valor={ultimo.relevamiento?.ohTotal} actual={relevamiento.ohTotal} formato={formatearPorcentaje} />
              <CeldaComparada
                valor={anterior.relevamiento?.ohTotal}
                actual={relevamiento.ohTotal}
                formato={formatearPorcentaje}
                vacio={anterior.advertencia ? '⚠' : '—'}
              />
            </tr>
            {conEstadia && (
              <tr>
                <td className="py-2 px-3 font-medium text-text-secondary">Estadía promedio</td>
                <td className="text-center py-2 px-3 font-bold text-text-primary">{formatearDecimal(estadia)}</td>
                <CeldaComparada valor={ultimo.estadiaPromedio} actual={estadia} formato={formatearDecimal} />
                <CeldaComparada valor={anterior.estadiaPromedio} actual={estadia} formato={formatearDecimal} />
              </tr>
            )}
            <tr>
              <td className="py-2 px-3 font-medium text-text-secondary">Visitantes totales</td>
              <td className="text-center py-2 px-3 font-bold text-text-primary">
                {formatearEntero(impacto.visitantesTotales)}
              </td>
              <CeldaComparada valor={ultimo.visitantes} actual={impacto.visitantesTotales} formato={formatearEntero} />
              <CeldaComparada valor={anterior.visitantes} actual={impacto.visitantesTotales} formato={formatearEntero} />
            </tr>
            <tr>
              <td className="py-2 px-3 font-medium text-text-secondary">Impacto económico</td>
              <td className="text-center py-2 px-3 font-bold text-text-primary">
                {formatearPesos(impacto.impactoTotal)}
              </td>
              <CeldaComparada valor={ultimo.impactoTotal} actual={impacto.impactoTotal} formato={formatearPesos} />
              <CeldaComparada valor={anterior.impactoTotal} actual={impacto.impactoTotal} formato={formatearPesos} />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function OhPorTipoAlojamiento({ informe }: Props) {
  const conDatos = informe.ohPorTipo.filter(item => item.habitacionesRelevadas > 0 && item.ohPorcentaje > 0)
  if (conDatos.length === 0) return null
  return (
    <div className="mb-8 print:mb-0 evitar-corte">
      <TituloSeccion icono="fa-hotel">Ocupación Hotelera por Tipo de Alojamiento</TituloSeccion>
      <BarrasHorizontalesOH
        items={conDatos.map(item => ({ etiqueta: item.tipo, valor: item.ohPorcentaje }))}
        referencia={informe.relevamiento.ohTotal}
        compacto
      />
    </div>
  )
}
