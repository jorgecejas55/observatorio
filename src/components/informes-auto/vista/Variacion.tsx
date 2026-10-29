import { formatearPorcentaje } from '@/lib/formato-numeros'
import { variacionPct } from '@/lib/informes-auto/canales-digitales-calculo'

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
