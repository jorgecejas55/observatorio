import type { InformeFindeCompleto } from '@/lib/informes-auto/types'

type Props = { informe: InformeFindeCompleto }

function Kpi({ titulo, valor, chico = false }: { titulo: string; valor: string; chico?: boolean }) {
  return (
    <div className="bg-primary/5 rounded-xl p-4 print:p-3 text-center print:border print:border-gray-200">
      <p className="text-xs text-text-secondary mb-1">{titulo}</p>
      <p className={`${chico ? 'text-2xl' : 'text-3xl'} font-bold text-primary`}>{valor}</p>
    </div>
  )
}

export function KpisInforme({ informe }: Props) {
  const { relevamiento, perfil, impacto } = informe
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 print:grid-cols-4 gap-4 print:gap-3 mb-8 print:mb-6 evitar-corte">
      <Kpi titulo="Ocupación Hotelera" valor={`${relevamiento.ohTotal}%`} />
      <Kpi titulo="Estadía Promedio" valor={perfil.estadiaSinOutliers.estadiaPromedio.toFixed(1)} />
      <Kpi titulo="Visitantes Totales" valor={impacto.visitantesTotales.toLocaleString('es-AR')} />
      <Kpi titulo="Impacto Económico" valor={`$${impacto.impactoTotal.toLocaleString('es-AR')}`} chico />
    </div>
  )
}

function tituloAnioAnterior(informe: InformeFindeCompleto): string {
  const anterior = informe.comparativaAnioAnterior.relevamiento
  if (!anterior) return 'Año anterior'
  return informe.tipoInforme === 'MENSUAL' ? anterior.nombre : `${anterior.nombre} ${anterior.fechaFin.slice(0, 4)}`
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
                {relevamiento.ohTotal}%
              </td>
              <td className="text-center py-2 px-3 text-text-secondary">
                {ultimo.relevamiento ? `${ultimo.relevamiento.ohTotal}%` : '—'}
              </td>
              <td className="text-center py-2 px-3 text-text-secondary">
                {anterior.relevamiento ? `${anterior.relevamiento.ohTotal}%` : anterior.advertencia ? '⚠' : '—'}
              </td>
            </tr>
            <tr>
              <td className="py-2 px-3 font-medium text-text-secondary">Visitantes totales</td>
              <td className="text-center py-2 px-3 font-bold text-text-primary">
                {impacto.visitantesTotales.toLocaleString('es-AR')}
              </td>
              <td className="text-center py-2 px-3 text-text-secondary">
                {ultimo.visitantes ? ultimo.visitantes.toLocaleString('es-AR') : '—'}
              </td>
              <td className="text-center py-2 px-3 text-text-secondary">
                {anterior.visitantes ? anterior.visitantes.toLocaleString('es-AR') : '—'}
              </td>
            </tr>
            <tr>
              <td className="py-2 px-3 font-medium text-text-secondary">Impacto económico</td>
              <td className="text-center py-2 px-3 font-bold text-text-primary">
                ${impacto.impactoTotal.toLocaleString('es-AR')}
              </td>
              <td className="text-center py-2 px-3 text-text-secondary">
                {ultimo.impactoTotal ? `$${ultimo.impactoTotal.toLocaleString('es-AR')}` : '—'}
              </td>
              <td className="text-center py-2 px-3 text-text-secondary">
                {anterior.impactoTotal ? `$${anterior.impactoTotal.toLocaleString('es-AR')}` : '—'}
              </td>
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
            <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all"
                style={{ width: `${Math.min(item.ohPorcentaje, 100)}%` }}
              />
            </div>
            <span className="w-12 text-xs font-bold text-text-primary text-right">
              {item.ohPorcentaje}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
