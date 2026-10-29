/**
 * Piezas comunes de los paneles de canales digitales: marco, cifra principal,
 * filas de métricas y listas de ranking.
 */

import { formatearEntero, formatearPorcentaje } from '@/lib/formato-numeros'
import type { ParticipacionCanal } from '@/lib/informes-auto/types'

export const SIN_DATOS = 'sin datos'

export const mostrar = (valor: number | null, formato: (v: number) => string) =>
  valor === null ? SIN_DATOS : formato(valor)

/** Marco de un canal: encabezado con ícono y, abajo, todo lo de ese canal. */
export function PanelCanal({ icono, titulo, children }: { icono: string; titulo: string; children: React.ReactNode }) {
  return (
    <section className="border border-gray-200 rounded-xl overflow-hidden evitar-corte">
      <h4 className="bg-primary/5 border-b border-gray-200 px-4 py-2 print:py-1.5 text-sm font-bold text-text-primary flex items-center gap-2">
        <i className={`${icono} text-primary`} aria-hidden="true" />
        {titulo}
      </h4>
      <div className="p-4 print:p-3 space-y-3 print:space-y-2">{children}</div>
    </section>
  )
}

/** Cifras a la izquierda, gráficos a la derecha. */
export function CuerpoPanel({ cifras, graficos }: { cifras: React.ReactNode; graficos: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[2fr_3fr] print:grid-cols-[2fr_3fr] gap-4 print:gap-3">
      <div>{cifras}</div>
      <div className="space-y-3 print:space-y-2">{graficos}</div>
    </div>
  )
}

export function ValorPrincipal({ valor, etiqueta }: { valor: number | null; etiqueta: string }) {
  return (
    <div className="mb-2">
      <p className={valor === null ? 'text-sm italic text-text-secondary' : 'text-2xl font-bold text-primary leading-tight'}>
        {mostrar(valor, formatearEntero)}
      </p>
      <p className="text-[10px] text-text-secondary">{etiqueta}</p>
    </div>
  )
}

export function Fila({ etiqueta, valor, children }: { etiqueta: string; valor: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-xs border-b border-gray-100 last:border-0 py-0.5">
      <span className="text-text-secondary">{etiqueta}</span>
      <span className="text-right">
        <span className={`font-semibold ${valor === SIN_DATOS ? 'text-text-secondary font-normal italic' : 'text-text-primary'}`}>
          {valor}
        </span>
        {children && <span className="ml-1">{children}</span>}
      </span>
    </div>
  )
}

export function ListaTop({ titulo, items }: { titulo: string; items: ParticipacionCanal[] }) {
  return (
    <div>
      <p className="text-xs font-semibold text-text-secondary mb-1">{titulo}</p>
      {items.length === 0 ? (
        <p className="text-xs italic text-text-secondary">{SIN_DATOS}</p>
      ) : (
        <ol className="text-xs space-y-0.5">
          {items.map((item, i) => (
            <li key={item.nombre} className="flex justify-between gap-2">
              <span className="text-text-secondary">{i + 1}. {item.nombre}</span>
              <span className="font-semibold text-text-primary">{formatearPorcentaje(item.pct, 0)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
