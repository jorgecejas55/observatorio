import { formatearFechaLarga } from '@/lib/formato-fechas'
import { ATRACTIVOS } from '@/lib/types'
import type { ResumenIngresosAtractivos } from '@/lib/informes-auto/types'

interface Props {
  ingresos: ResumenIngresosAtractivos
}

// Informes viejos no tienen el desglose turistas/residentes: se muestra "—"
const formatearCantidad = (cantidad?: number) =>
  cantidad === undefined ? '—' : cantidad.toLocaleString('es-AR')

/**
 * Ingresos a atractivos (Casa de la Puna, Pueblo Perdido, museos) y actividades
 * especiales del período, para el informe definitivo y su PDF.
 */
export default function SeccionIngresosAtractivos({ ingresos }: Props) {
  const { porAtractivo, totalPersonas, actividadesEspeciales } = ingresos
  const hayIncompletos = porAtractivo.some(a => a.incompleto)

  if (porAtractivo.length === 0) return null

  return (
    <div className="mb-8 print:mb-6">
      <h3 className="font-bold text-text-primary mb-1 flex items-center gap-2">
        <i className="fa-solid fa-ticket text-primary text-sm" />
        Ingresos a Atractivos Turísticos
      </h3>
      <p className="text-xs text-text-secondary mb-4">
        {totalPersonas.toLocaleString('es-AR')} personas registradas en el período
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 print:grid-cols-5 gap-3 evitar-corte">
        {porAtractivo.map(a => (
          <div
            key={a.atractivo}
            className="bg-primary/5 rounded-xl p-3 text-center print:border print:border-gray-200"
          >
            <p className="text-2xl font-bold text-primary">{a.personas.toLocaleString('es-AR')}</p>
            <p className="text-xs text-text-secondary mt-1">{a.nombre}</p>
            <p className="text-[10px] text-text-secondary">
              {a.registros.toLocaleString('es-AR')} {a.registros === 1 ? 'registro' : 'registros'}
            </p>
            {a.incompleto && (
              <p className="text-[10px] text-amber-700 mt-1">
                <i className="fa-solid fa-triangle-exclamation mr-1" />
                Dato parcial
              </p>
            )}
          </div>
        ))}
      </div>

      {hayIncompletos && (
        <p className="no-print text-xs text-amber-700 mt-3">
          Algún atractivo no pudo leerse por completo. Usá «Recalcular datos» para volver a consultarlo.
        </p>
      )}

      {actividadesEspeciales.length > 0 && (
        <div className="mt-5 evitar-corte">
          <p className="text-xs font-semibold text-text-secondary mb-2">
            <i className="fa-solid fa-calendar-days mr-1.5 text-primary" />
            Actividades especiales ({actividadesEspeciales.length})
          </p>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-left text-text-secondary">
                <th className="py-1.5 pr-3 font-semibold">Fecha</th>
                <th className="py-1.5 pr-3 font-semibold">Atractivo</th>
                <th className="py-1.5 pr-3 font-semibold">Actividad</th>
                <th className="py-1.5 pr-3 text-right font-semibold">Turistas</th>
                <th className="py-1.5 pr-3 text-right font-semibold">Residentes</th>
                <th className="py-1.5 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {actividadesEspeciales.map((act, i) => (
                <tr key={`${act.atractivo}-${act.fecha}-${i}`} className="border-b border-gray-100">
                  <td className="py-1.5 pr-3 whitespace-nowrap">{formatearFechaLarga(act.fecha)}</td>
                  <td className="py-1.5 pr-3">{ATRACTIVOS[act.atractivo as keyof typeof ATRACTIVOS] ?? act.atractivo}</td>
                  <td className="py-1.5 pr-3">{act.nombre}</td>
                  <td className="py-1.5 pr-3 text-right">{formatearCantidad(act.cantidadTuristas)}</td>
                  <td className="py-1.5 pr-3 text-right">{formatearCantidad(act.cantidadResidentes)}</td>
                  <td className="py-1.5 text-right font-semibold">{act.cantidadTotal.toLocaleString('es-AR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
