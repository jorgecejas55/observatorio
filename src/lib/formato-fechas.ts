const MESES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export function normalizarMesAnio(valor: unknown): string {
  if (!valor) return ''
  if (typeof valor === 'string' && /^\d{2}\/\d{4}$/.test(valor)) return valor
  const fecha = valor instanceof Date ? valor : new Date(valor as string)
  if (isNaN(fecha.getTime())) return ''
  const mm = String(fecha.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = fecha.getUTCFullYear()
  return `${mm}/${yyyy}`
}

export function formatearMesAnio(valor: unknown): string {
  const norm = normalizarMesAnio(valor)
  if (!norm) return '—'
  const [mm, yyyy] = norm.split('/').map(Number)
  return `${MESES_ES[mm - 1]} ${yyyy}`
}

export function mesAnioOrdenable(valor: unknown): number {
  const norm = normalizarMesAnio(valor)
  if (!norm) return 0
  const [mm, yyyy] = norm.split('/').map(Number)
  return yyyy * 100 + mm
}

export function esMesAnioValido(valor: string): boolean {
  if (!/^\d{2}\/\d{4}$/.test(valor)) return false
  const [mm, yyyy] = valor.split('/').map(Number)
  return mm >= 1 && mm <= 12 && yyyy >= 2020 && yyyy <= 2100
}
