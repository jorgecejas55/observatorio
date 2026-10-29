/**
 * Formato numérico es-AR para datos oficiales: coma decimal y punto de miles
 * ("45,3 %", "3,1", "13.570"). Evita mezclar "45.3%" con "13.570".
 */

export function formatearDecimal(valor: number, decimales = 1): string {
  return valor.toLocaleString('es-AR', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  })
}

/** "45,3 %" (espacio duro para que el signo no quede solo en otra línea). */
export function formatearPorcentaje(valor: number, decimales = 1): string {
  return `${formatearDecimal(valor, decimales)} %`
}

export function formatearEntero(valor: number): string {
  return Math.round(valor).toLocaleString('es-AR')
}

export function formatearPesos(valor: number): string {
  return `$${formatearEntero(valor)}`
}
