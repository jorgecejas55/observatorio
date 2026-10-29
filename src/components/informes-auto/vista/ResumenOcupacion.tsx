import { formatearDecimal, formatearEntero, formatearPesos, formatearPorcentaje } from '@/lib/formato-numeros'
import type { InformeFindeCompleto } from '@/lib/informes-auto/types'
import Variacion from './Variacion'

type Props = { informe: InformeFindeCompleto }

function Kpi({ titulo, valor, icono, chico = false }: { titulo: string; valor: string; icono: string; chico?: boolean }) {
  return (
    <div className="bg-primary/5 rounded-xl p-4 print:p-3 text-center print:border print:border-gray-200">
      <p className="text-xs text-text-secondary mb-1 flex items-center justify-center gap-1.5">
        <i className={`fa-solid ${icono} text-secondary`} aria-hidden="true" />
        {titulo}
      </p>
      <p className={`${chico ? 'text-base sm:text-2xl' : 'text-2xl sm:text-3xl'} font-bold text-primary whitespace-nowrap`}>{valor}</p>
    </div>
  )
}

export function KpisInforme({ informe }: Props) {
  const { relevamiento, perfil, impacto } = informe
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 print:grid-cols-4 gap-4 print:gap-3 mb-8 print:mb-6 evitar-corte">
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
  const { relevamiento, impacto, comparativaUltimoFinde: ultimo, comparativaAnioAnterior: anterior } = informe
  return (
    <div className="mb-8 print:mb-6 evitar-corte">
      <h3 className="font-bold text-text-primary mb-3 flex items-center gap-2">
        <i className="fa-solid fa-scale-balanced text-primary text-sm" />
        Comparativas
      </h3>
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
  const ohGeneral = Math.min(informe.relevamiento.ohTotal, 100)
  return (
    <div className="mb-8 print:mb-0 evitar-corte">
      <h3 className="font-bold text-text-primary mb-3 flex items-center gap-2">
        <i className="fa-solid fa-hotel text-primary text-sm" />
        Ocupación Hotelera por Tipo de Alojamiento
      </h3>
      <div className="space-y-2">
        {conDatos.map((item) => (
          <div key={item.tipo} className="flex items-center gap-3">
            <span className="w-36 text-xs text-text-secondary text-right flex-shrink-0">
              {item.tipo}
            </span>
            <div className="relative flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all"
                style={{ width: `${Math.min(item.ohPorcentaje, 100)}%` }}
              />
              {/* Referencia: OH general del relevamiento */}
              <div className="absolute inset-y-0 border-l-2 border-dashed border-text-primary/60" style={{ left: `${ohGeneral}%` }} />
            </div>
            <span className="w-12 text-xs font-bold text-text-primary text-right">
              {formatearPorcentaje(item.ohPorcentaje)}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-text-secondary flex items-center justify-end gap-1.5">
        <span className="inline-block h-3 border-l-2 border-dashed border-text-primary/60" aria-hidden="true" />
        Promedio general {formatearPorcentaje(informe.relevamiento.ohTotal)}
      </p>
    </div>
  )
}
