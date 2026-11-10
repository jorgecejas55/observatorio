/**
 * Mini-gráficos de evolución mensual para el informe (pantalla + PDF).
 * Barras = div con Tailwind (rectas, sin redondeo); líneas = <svg>
 * mínimo superpuesto (solo redes sociales: otra unidad o seguidores). Sin Recharts: la vista pública es Server Component y
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
  // Año anterior en barras y líneas: celeste #00b5db elegido por Jorge, al 45 % de
  // opacidad para que quede de fondo y el año del informe se destaque
  celesteSuave: '#00b5db73',
}

type ItemLeyenda = { color: string; texto: string; forma?: 'linea' | 'barra' }

interface SerieLinea {
  puntos: PuntoMensual[]
  color: string
  /** Grosor del trazo en px (por defecto 1,75) */
  grosor?: number
  /** Color del área bajo la línea (con transparencia); sin él, solo trazo */
  relleno?: string
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

/** Cierra un tramo contra la base del gráfico para pintar el área bajo la línea. */
function areaBajo(pts: string): string {
  const coordenadas = pts.split(' ')
  const xInicio = coordenadas[0].split(',')[0]
  const xFin = coordenadas[coordenadas.length - 1].split(',')[0]
  return `${xInicio},100 ${pts} ${xFin},100`
}

function Lineas({ series, total, min, max }: { series: SerieLinea[]; total: number; min: number; max: number }) {
  const rango = max - min || 1
  const y = (v: number) => 100 - ((v - min) / rango) * 92 - 4
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full" aria-hidden="true">
      {series.map((s, i) =>
        tramos(s.puntos, total, y).map((pts, j) =>
          pts.includes(' ') ? (
            <g key={`${i}-${j}`}>
              {s.relleno && <polygon points={areaBajo(pts)} fill={s.relleno} stroke="none" />}
              <polyline
              points={pts}
              fill="none"
              stroke={s.color}
              strokeWidth={s.grosor ?? 1.75}
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            </g>
          ) : (
            <circle key={`${i}-${j}`} cx={pts.split(',')[0]} cy={pts.split(',')[1]} r={1.2} fill={s.color} />
          ),
        ),
      )}
    </svg>
  )
}

/** `destacarUltimo`: el mes del informe en negrita (las barras comparadas no lo marcan por color). */
function EjeMeses({ total, destacarUltimo = false }: { total: number; destacarUltimo?: boolean }) {
  return (
    <div className="grid text-[9px] text-text-secondary text-center mt-1" style={{ gridTemplateColumns: `repeat(${total}, 1fr)` }}>
      {INICIALES_MES.slice(0, total).map((m, i) => (
        <span key={i} className={destacarUltimo && i === total - 1 ? 'font-bold text-text-primary' : undefined}>{m}</span>
      ))}
    </div>
  )
}

export function Leyenda({ items }: { items: ItemLeyenda[] }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[9px] text-text-secondary">
      {items.map(item => (
        <span key={item.texto} className="flex items-center gap-1">
          {item.forma === 'barra' ? (
            <span className="inline-block w-2.5 h-2.5" style={{ backgroundColor: item.color }} />
          ) : (
            <span
              className="inline-block w-3"
              style={{ borderTop: `2px solid ${item.color}` }}
            />
          )}
          {item.texto}
        </span>
      ))}
    </div>
  )
}

function MarcoGrafico({ titulo, children }: { titulo?: string; children: React.ReactNode }) {
  return (
    <div className="evitar-corte">
      {titulo && <p className="text-xs font-semibold text-text-secondary mb-2 print:mb-1">{titulo}</p>}
      {children}
    </div>
  )
}

/** Leyenda estándar de la evolución mensual: año anterior y año del informe. */
export const leyendaAnios = (anio: number, forma: ItemLeyenda['forma'] = 'barra'): ItemLeyenda[] => [
  { color: COLOR.celesteSuave, texto: String(anio - 1), forma },
  { color: COLOR.primary, texto: String(anio), forma },
]

/** Con rótulo, las barras usan hasta el 78 % del alto: deja lugar al valor sobre la última. */
const ALTO_MAXIMO_CON_ROTULO = 1.18

/** Alto en % del área del gráfico; null = sin dato (hueco, nunca una barra en cero). */
const altoBarra = (valor: number | null, max: number) =>
  valor !== null && max > 0 ? Math.max((valor / max) * 92, 2) : null

/** Barra dentro de su columna; sin dato no se dibuja pero ocupa el lugar (los meses quedan alineados). */
function Barra({ alto, className }: { alto: number | null; className: string }) {
  return <div className={`flex-1 ${alto === null ? '' : className}`} style={{ height: `${alto ?? 0}%` }} />
}

/**
 * Evolución de un año contra el anterior: por mes, barra celeste (año anterior)
 * y barra de color de marca (año del informe). `rotuloUltimo`: escribe el
 * valor del mes del informe sobre su barra (no hay eje Y).
 */
export function BarrasComparadas({ titulo, actual, anterior, leyenda, rotuloUltimo }: {
  titulo?: string
  actual: PuntoMensual[]
  anterior: PuntoMensual[]
  leyenda?: ItemLeyenda[]
  rotuloUltimo?: (valor: number) => string
}) {
  const total = actual.length
  const max = maximo([actual, anterior]) * (rotuloUltimo ? ALTO_MAXIMO_CON_ROTULO : 1)
  const valorAnterior = (mes: number) => anterior.find(p => p.mes === mes)?.valor ?? null
  return (
    <MarcoGrafico titulo={titulo}>
      <div className="relative h-20 print:h-14 border-b border-gray-200">
        <div className="absolute inset-0 grid items-end" style={{ gridTemplateColumns: `repeat(${total}, 1fr)` }}>
          {actual.map((p, i) => {
            const altoActual = altoBarra(p.valor, max)
            const altoAnterior = altoBarra(valorAnterior(p.mes), max)
            // El rótulo va sobre la barra más alta del mes: si la del año anterior es mayor, no la pisa
            const altoRotulo = Math.max(altoActual ?? 0, altoAnterior ?? 0)
            const conRotulo = i === total - 1 && altoActual !== null && p.valor !== null && rotuloUltimo
            return (
              // Las dos barras del mes van pegadas; el padding separa un mes del siguiente
              <div key={p.mes} className="relative h-full flex items-end px-[14%]">
                <Barra alto={altoAnterior} className="bg-[#00b5db]/45" />
                <Barra alto={altoActual} className="bg-primary" />
                {conRotulo && (
                  // Alineado a la derecha: no se sale del contenedor en la última columna
                  <span
                    className="absolute right-0 text-[9px] font-semibold text-text-primary whitespace-nowrap leading-none"
                    style={{ bottom: `calc(${altoRotulo}% + 2px)` }}
                  >
                    {rotuloUltimo(p.valor as number)}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
      <EjeMeses total={total} destacarUltimo />
      {leyenda && <Leyenda items={leyenda} />}
    </MarcoGrafico>
  )
}

/**
 * Barras del año del informe + línea con escala propia (otra unidad, p. ej.
 * interacciones por publicación). El mes del informe va en color pleno.
 */
export function BarrasConLinea({ titulo, barras, linea, leyenda }: {
  titulo?: string
  barras: PuntoMensual[]
  linea: SerieLinea
  leyenda?: ItemLeyenda[]
}) {
  const total = barras.length
  const maxBarras = maximo([barras])
  return (
    <MarcoGrafico titulo={titulo}>
      <div className="relative h-20 print:h-14 border-b border-gray-200">
        <div className="absolute inset-0 grid items-end" style={{ gridTemplateColumns: `repeat(${total}, 1fr)` }}>
          {barras.map((p, i) => (
            <div key={p.mes} className="relative h-full flex items-end px-[2px]">
              <Barra alto={altoBarra(p.valor, maxBarras)} className={i === total - 1 ? 'bg-primary' : 'bg-primary/35'} />
            </div>
          ))}
        </div>
        <Lineas series={[linea]} total={total} min={0} max={maximo([linea.puntos])} />
      </div>
      <EjeMeses total={total} />
      {leyenda && <Leyenda items={leyenda} />}
    </MarcoGrafico>
  )
}

/**
 * Evolución de un año contra el anterior en líneas, con escala ajustada al
 * rango de los datos (OH y estadía varían poco: desde cero se verían planas).
 * Sin eje Y: solo se rotula el mes del informe en los dos años (la
 * comparación que importa); el de más arriba va encima de su punto y el
 * otro debajo, para que no se pisen.
 */
export function LineasComparadas({ titulo, actual, anterior, leyenda, formato }: {
  titulo?: string
  actual: PuntoMensual[]
  anterior: PuntoMensual[]
  leyenda?: ItemLeyenda[]
  formato: (valor: number) => string
}) {
  const total = actual.length
  const anteriorRecortado = anterior.slice(0, total)
  const valores = [...actual, ...anteriorRecortado].map(p => p.valor).filter((v): v is number => v !== null)
  const minReal = valores.length ? Math.min(...valores) : 0
  const maxReal = valores.length ? Math.max(...valores) : 1
  // Margen arriba y abajo: deja lugar a los rótulos del mes del informe
  const margen = (maxReal - minReal) * 0.3 || 1
  const min = Math.max(0, minReal - margen)
  const max = maxReal + margen
  const posicionY = (v: number) => ((v - min) / (max - min)) * 92 + 4

  const ultimoActual = actual[total - 1]?.valor ?? null
  const ultimoAnterior = anteriorRecortado[total - 1]?.valor ?? null
  const actualArriba = ultimoAnterior === null || (ultimoActual ?? 0) >= ultimoAnterior

  return (
    <MarcoGrafico titulo={titulo}>
      <div className="relative h-28 print:h-20 border-b border-gray-200">
        <Lineas
          series={[
            { puntos: anteriorRecortado, color: COLOR.celesteSuave, grosor: 2 },
            { puntos: actual, color: COLOR.primary, grosor: 3, relleno: 'rgba(219, 39, 119, 0.10)' },
          ]}
          total={total}
          min={min}
          max={max}
        />
        {actual.map((p, i) =>
          p.valor === null ? null : (
            <span
              key={p.mes}
              className={`absolute -translate-x-1/2 translate-y-1/2 rounded-full bg-primary ring-2 ring-white ${i === total - 1 ? 'w-2.5 h-2.5' : 'w-1.5 h-1.5'}`}
              style={{ left: `${((i + 0.5) / total) * 100}%`, bottom: `${posicionY(p.valor)}%` }}
            />
          ),
        )}
        {ultimoActual !== null && (
          <RotuloPunto y={posicionY(ultimoActual)} arriba={actualArriba} className="font-bold text-primary">
            {formato(ultimoActual)}
          </RotuloPunto>
        )}
        {ultimoAnterior !== null && (
          <RotuloPunto y={posicionY(ultimoAnterior)} arriba={!actualArriba} // Celeste más oscuro: el #00b5db sobre blanco no llega al contraste mínimo para texto
            className="text-[#0090ad]">
            {formato(ultimoAnterior)}
          </RotuloPunto>
        )}
      </div>
      <EjeMeses total={total} destacarUltimo />
      {leyenda && <Leyenda items={leyenda} />}
    </MarcoGrafico>
  )
}

/** Valor junto a un punto, alineado a la derecha para no salirse del gráfico en el último mes. */
function RotuloPunto({ y, arriba, className, children }: {
  y: number
  arriba: boolean
  className: string
  children: React.ReactNode
}) {
  return (
    <span
      className={`absolute right-0 px-0.5 rounded-sm bg-white/85 text-[10px] leading-none whitespace-nowrap ${className}`}
      style={arriba ? { bottom: `calc(${y}% + 7px)` } : { top: `calc(${100 - y}% + 7px)` }}
    >
      {children}
    </span>
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
  leyenda?: ItemLeyenda[]
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
      {leyenda && <Leyenda items={leyenda} />}
    </MarcoGrafico>
  )
}
