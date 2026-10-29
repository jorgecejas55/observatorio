/**
 * Mini-gráficos de evolución mensual para el informe (pantalla + PDF).
 * Barras = div con Tailwind (rectas, sin redondeo); líneas = <svg>
 * mínimo superpuesto. Sin Recharts: la vista pública es Server Component y
 * ResponsiveContainer no se relayoutea al imprimir.
 */

import { formatearEntero } from '@/lib/formato-numeros'
import type { PuntoMensual } from '@/lib/informes-auto/types'

const INICIALES_MES = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

// Colores de tailwind.config.ts (el SVG no usa clases de color)
export const COLOR = {
  primary: '#db2777',
  secondary: '#f97316',
  accent: '#0ea5e9',
  gris: '#6b7280',
}

interface SerieLinea {
  puntos: PuntoMensual[]
  color: string
  punteada?: boolean
}

const maximo = (series: PuntoMensual[][]) =>
  Math.max(0, ...series.flat().map(p => p.valor ?? 0))

/** Polilíneas cortadas en los meses sin dato (un hueco, nunca una caída a cero). */
function tramos(puntos: PuntoMensual[], total: number, y: (v: number) => number): string[] {
  const resultado: string[] = []
  let actual: string[] = []
  puntos.forEach((p, i) => {
    if (p.valor === null) {
      if (actual.length) resultado.push(actual.join(' '))
      actual = []
      return
    }
    actual.push(`${((i + 0.5) / total) * 100},${y(p.valor)}`)
  })
  if (actual.length) resultado.push(actual.join(' '))
  return resultado
}

function Lineas({ series, total, min, max }: { series: SerieLinea[]; total: number; min: number; max: number }) {
  const rango = max - min || 1
  const y = (v: number) => 100 - ((v - min) / rango) * 92 - 4
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full" aria-hidden="true">
      {series.map((s, i) =>
        tramos(s.puntos, total, y).map((pts, j) =>
          pts.includes(' ') ? (
            <polyline
              key={`${i}-${j}`}
              points={pts}
              fill="none"
              stroke={s.color}
              strokeWidth={1.75}
              strokeDasharray={s.punteada ? '4 3' : undefined}
              vectorEffect="non-scaling-stroke"
            />
          ) : (
            <circle key={`${i}-${j}`} cx={pts.split(',')[0]} cy={pts.split(',')[1]} r={1.2} fill={s.color} />
          ),
        ),
      )}
    </svg>
  )
}

function EjeMeses({ total }: { total: number }) {
  return (
    <div className="grid text-[9px] text-text-secondary text-center mt-1" style={{ gridTemplateColumns: `repeat(${total}, 1fr)` }}>
      {INICIALES_MES.slice(0, total).map((m, i) => <span key={i}>{m}</span>)}
    </div>
  )
}

export function Leyenda({ items }: { items: { color: string; texto: string; punteada?: boolean }[] }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[9px] text-text-secondary">
      {items.map(item => (
        <span key={item.texto} className="flex items-center gap-1">
          <span
            className="inline-block w-3"
            style={{ borderTop: `2px ${item.punteada ? 'dashed' : 'solid'} ${item.color}` }}
          />
          {item.texto}
        </span>
      ))}
    </div>
  )
}

function MarcoGrafico({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="evitar-corte">
      <p className="text-xs font-semibold text-text-secondary mb-2">{titulo}</p>
      {children}
    </div>
  )
}

/**
 * Barras del año del informe + línea opcional. `escalaPropia`: la línea usa
 * su propio máximo (otra unidad, p. ej. interacciones por publicación).
 */
export function BarrasConLinea({ titulo, barras, linea, escalaPropia = false, leyenda }: {
  titulo: string
  barras: PuntoMensual[]
  linea?: SerieLinea
  escalaPropia?: boolean
  leyenda: { color: string; texto: string; punteada?: boolean }[]
}) {
  const total = barras.length
  const maxBarras = maximo(linea && !escalaPropia ? [barras, linea.puntos] : [barras])
  const maxLinea = escalaPropia && linea ? maximo([linea.puntos]) : maxBarras
  return (
    <MarcoGrafico titulo={titulo}>
      <div className="relative h-20 print:h-14 border-b border-gray-200">
        <div className="absolute inset-0 grid items-end" style={{ gridTemplateColumns: `repeat(${total}, 1fr)` }}>
          {barras.map((p, i) => (
            <div key={p.mes} className="h-full flex items-end px-[2px]">
              {p.valor !== null && maxBarras > 0 && (
                // El mes del informe (última barra) va en color pleno
                <div
                  className={`w-full ${i === total - 1 ? 'bg-primary' : 'bg-primary/35'}`}
                  style={{ height: `${Math.max((p.valor / maxBarras) * 92, 2)}%` }}
                />
              )}
            </div>
          ))}
        </div>
        {linea && <Lineas series={[linea]} total={total} min={0} max={maxLinea} />}
      </div>
      <EjeMeses total={total} />
      <Leyenda items={leyenda} />
    </MarcoGrafico>
  )
}

/**
 * Solo líneas (p. ej. seguidores), escala ajustada al rango de los datos para
 * ver la tendencia. Se rotulan máximo y mínimo reales: sin ellos, una
 * variación chica parecería grande.
 */
export function SoloLineas({ titulo, series, leyenda }: {
  titulo: string
  series: SerieLinea[]
  leyenda: { color: string; texto: string; punteada?: boolean }[]
}) {
  const total = Math.max(0, ...series.map(s => s.puntos.length))
  const valores = series.flatMap(s => s.puntos.map(p => p.valor)).filter((v): v is number => v !== null)
  const minReal = valores.length ? Math.min(...valores) : 0
  const maxReal = valores.length ? Math.max(...valores) : 0
  const min = minReal * 0.97
  const max = valores.length ? maxReal * 1.01 : 1
  return (
    <MarcoGrafico titulo={titulo}>
      <div className="relative h-20 print:h-14 border-b border-gray-200">
        {valores.length > 0 && (
          <>
            <span className="absolute left-0 top-0 text-[9px] text-text-secondary">{formatearEntero(maxReal)}</span>
            <span className="absolute left-0 bottom-0.5 text-[9px] text-text-secondary">{formatearEntero(minReal)}</span>
          </>
        )}
        <Lineas series={series} total={total} min={min} max={max} />
      </div>
      <EjeMeses total={total} />
      <Leyenda items={leyenda} />
    </MarcoGrafico>
  )
}
