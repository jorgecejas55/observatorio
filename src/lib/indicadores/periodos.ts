/**
 * Utilidades de períodos para las series de la planilla maestra
 * (año numérico + mes en texto: "ENERO", "Septiembre", "SETIEMBRE"...).
 */

export const MESES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
] as const

export interface ConPeriodo {
  ano: number
  mes: string
}

function normalizarMes(mes: string): string {
  return String(mes ?? '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '')
    .replace('SETIEMBRE', 'SEPTIEMBRE')
}

/** Número de mes 1-12 a partir del nombre; 0 si no se reconoce. */
export function numeroDeMes(mes: string): number {
  return MESES.indexOf(normalizarMes(mes) as typeof MESES[number]) + 1
}

/** Clave ordenable año*12 + mes (0 en el mes si no se reconoce). */
export function clavePeriodo(item: ConPeriodo): number {
  return item.ano * 12 + numeroDeMes(item.mes)
}

/**
 * Ordena del período más reciente al más viejo. A igual período (ej. semanas
 * del receso invernal en el mismo mes) conserva el orden de carga invertido:
 * lo último cargado en la planilla aparece primero.
 */
export function ordenarRecientePrimero<T extends ConPeriodo>(lista: T[]): T[] {
  return lista
    .map((item, indice) => ({ item, indice }))
    .sort((a, b) => clavePeriodo(b.item) - clavePeriodo(a.item) || b.indice - a.indice)
    .map(({ item }) => item)
}

/** Años presentes en la serie, del más reciente al más viejo. */
export function aniosDisponibles(lista: ConPeriodo[]): number[] {
  return [...new Set(lista.map(i => i.ano))].sort((a, b) => b - a)
}
