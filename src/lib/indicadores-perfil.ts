/**
 * Qué respuesta es favorable para el destino en los indicadores Sí/No del
 * perfil del visitante. Se usa para resaltarla igual en el dashboard, la vista
 * previa y el informe definitivo.
 */
export type RespuestaSiNo = 'SI' | 'NO'

export const RESPUESTA_FAVORABLE: Record<'primeraVez' | 'otrosDestinos', RespuestaSiNo> = {
  primeraVez: 'SI',     // que sea su primera vez = visitante nuevo captado
  otrosDestinos: 'NO',  // que no haya pensado en otros destinos = SFVC fue su primera opción
}

/** Normaliza 'SÍ' / 'Si' / 'sí' → 'SI' y 'no' → 'NO'. */
export function normalizarRespuestaSiNo(valor: string): string {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase()
}

export const COLOR_RESPUESTA_FAVORABLE = '#10b981'
export const COLOR_RESPUESTA_NEUTRA = '#9ca3af'

export function colorRespuestaSiNo(nombre: string, favorable: RespuestaSiNo): string {
  return normalizarRespuestaSiNo(nombre) === favorable ? COLOR_RESPUESTA_FAVORABLE : COLOR_RESPUESTA_NEUTRA
}

/** Porcentaje entero de `cantidad` sobre `total`; 0 si no hay respuestas. */
export function porcentajeDe(cantidad: number, total: number): number {
  return total > 0 ? Math.round((cantidad / total) * 100) : 0
}

/** Cantidad de personas que contestaron una pregunta (suma de sus respuestas). */
export function totalRespuestas(items: Array<{ cantidad: number }>): number {
  return items.reduce((suma, item) => suma + item.cantidad, 0)
}

/**
 * Porcentaje de una respuesta sobre quienes contestaron esa pregunta.
 * Las encuestas sin respuesta se ignoran (no forman parte del denominador),
 * por eso Sí + No suma 100%.
 */
export function porcentajeSobreRespondentes(respuestas: Record<string, number> | undefined, clave: string): number {
  const conteos = respuestas ?? {}
  const respondentes = Object.values(conteos).reduce((suma, cantidad) => suma + cantidad, 0)
  return porcentajeDe(conteos[clave] ?? 0, respondentes)
}
