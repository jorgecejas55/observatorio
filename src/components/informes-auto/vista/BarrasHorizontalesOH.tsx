/**
 * Barras horizontales de ocupación por grupo con una línea punteada de
 * referencia (OH general). Presentacional: la usan el informe automático
 * (OH por tipo) y la ficha técnica (OH por grupo tipo-categoría).
 */

import { formatearPorcentaje } from '@/lib/formato-numeros'

export interface BarraOH {
  etiqueta: string
  /** null = sin datos: se rotula, nunca se dibuja una barra en cero */
  valor: number | null
  /** Texto chico al lado del valor (p. ej. "n 12 · 20–85 %") */
  detalle?: string
}

/** `compacto`: barras más bajas al imprimir (el informe mensual necesita la hoja 1 entera). */
export default function BarrasHorizontalesOH({ items, referencia, compacto = false }: {
  items: BarraOH[]
  referencia: number
  compacto?: boolean
}) {
  const posicionReferencia = Math.min(referencia, 100)
  return (
    <>
      <div className={`space-y-2 ${compacto ? 'print:space-y-1' : ''}`}>
        {items.map(item => (
          // En móvil la etiqueta va arriba de la barra; desde sm (y en impresión), a la izquierda
          <div key={item.etiqueta} className="sm:flex sm:items-center sm:gap-3 print:flex print:items-center print:gap-3">
            <span className="block text-xs text-text-secondary mb-0.5 sm:mb-0 sm:w-36 sm:text-right sm:flex-shrink-0 print:mb-0 print:w-36 print:text-right print:flex-shrink-0">
              {item.etiqueta}
            </span>
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className={`relative flex-1 bg-gray-100 rounded-full h-5 overflow-hidden ${compacto ? 'print:h-3.5' : ''}`}>
                {item.valor !== null && (
                  <div
                    className="bg-primary h-full rounded-full transition-all"
                    style={{ width: `${Math.min(item.valor, 100)}%` }}
                  />
                )}
                {/* Referencia: OH general del relevamiento */}
                <div className="absolute inset-y-0 border-l-2 border-dashed border-text-primary/60" style={{ left: `${posicionReferencia}%` }} />
              </div>
              {item.valor === null ? (
                <span className="min-w-[3rem] text-xs italic text-text-secondary text-right whitespace-nowrap">sin datos</span>
              ) : (
                <span className="min-w-[3rem] text-xs font-bold text-text-primary text-right whitespace-nowrap">
                  {formatearPorcentaje(item.valor)}
                </span>
              )}
              {item.detalle && (
                <span className="hidden sm:inline print:inline w-28 flex-shrink-0 text-[10px] text-text-secondary">
                  {item.detalle}
                </span>
              )}
            </div>
            {/* En móvil el detalle baja a su propia línea para no comprimir la barra */}
            {item.detalle && (
              <span className="block sm:hidden print:hidden text-[10px] text-text-secondary mt-0.5">{item.detalle}</span>
            )}
          </div>
        ))}
      </div>
      <p className={`mt-2 ${compacto ? 'print:mt-1' : ''} text-[10px] text-text-secondary flex items-center justify-end gap-1.5`}>
        <span className="inline-block h-3 border-l-2 border-dashed border-text-primary/60" aria-hidden="true" />
        Promedio general {formatearPorcentaje(referencia)}
      </p>
    </>
  )
}
