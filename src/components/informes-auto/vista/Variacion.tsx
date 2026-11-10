import { formatearPorcentaje } from '@/lib/formato-numeros'
import { variacionPct } from '@/lib/informes-auto/canales-digitales-calculo'
import type { PuntoMensual } from '@/lib/informes-auto/types'

/** Variaciones menores a este % se muestran en gris (sin cambio relevante). */
const UMBRAL_NEUTRO = 1

/** ▲/▼ con % de variación (verde sube, rojo baja, gris si |Δ| < 1 %). Nada si no hay base. */
export default function Variacion({ actual, anterior, etiqueta }: {
  actual: number | null
  anterior: number | null
  etiqueta?: string
}) {
  const v = variacionPct(actual, anterior)
  if (v === null) return null
  const neutro = Math.abs(v) < UMBRAL_NEUTRO
  const color = neutro ? 'text-text-secondary' : v > 0 ? 'text-green-600' : 'text-red-600'
  const flecha = neutro ? '=' : v > 0 ? '▲' : '▼'
  return (
    <span className={`text-[10px] font-semibold whitespace-nowrap ${color}`}>
      {flecha} {formatearPorcentaje(Math.abs(v))}
      {etiqueta && <span className="font-normal text-text-secondary"> {etiqueta}</span>}
    </span>
  )
}

/**
 * Valor de un mes contando desde el final de la serie (0 = mes del informe).
 * Las series van de enero al mes del informe: en enero no hay mes anterior.
 */
function valorDesdeElFinal(serie: PuntoMensual[], mesesAtras: number): number | null {
  return serie[serie.length - 1 - mesesAtras]?.valor ?? null
}

/** Variación del mes del informe vs mes anterior y vs mismo mes del año anterior, desde sus series. */
export function VariacionesDelMes({ actual, serie, serieAnioAnterior, className = '' }: {
  actual: number | null
  serie: PuntoMensual[]
  serieAnioAnterior: PuntoMensual[]
  className?: string
}) {
  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      <Variacion actual={actual} anterior={valorDesdeElFinal(serie, 1)} etiqueta="vs mes anterior" />
      <Variacion actual={actual} anterior={valorDesdeElFinal(serieAnioAnterior, 0)} etiqueta="vs mismo mes año anterior" />
    </div>
  )
}
