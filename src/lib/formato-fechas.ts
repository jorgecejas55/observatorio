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

// ── Fechas completas (día/mes/año) ──────────────────────────────────────────

const MESES_ES_MIN = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
]

function aFecha(valor: unknown): Date | null {
  if (!valor) return null
  const f = valor instanceof Date ? valor : new Date(String(valor))
  return isNaN(f.getTime()) ? null : f
}

/** "1 ene 2026" */
export function formatearFecha(valor: unknown): string {
  const f = aFecha(valor)
  if (!f) return '—'
  return `${f.getUTCDate()} ${MESES_ES_MIN[f.getUTCMonth()]} ${f.getUTCFullYear()}`
}

/** "1 de enero de 2026" */
export function formatearFechaLarga(valor: unknown): string {
  const f = aFecha(valor)
  if (!f) return '—'
  return `${f.getUTCDate()} de ${MESES_ES[f.getUTCMonth()].toLowerCase()} de ${f.getUTCFullYear()}`
}

/** "1 al 31 de enero de 2026" (mismo mes) o "28 dic 2025 al 3 ene 2026". */
export function formatearRango(inicio: unknown, fin: unknown): string {
  const fi = aFecha(inicio)
  const ff = aFecha(fin)
  if (!fi && !ff) return '—'
  if (!fi) return formatearFecha(fin)
  if (!ff) return formatearFecha(inicio)
  const mismoMes =
    fi.getUTCMonth() === ff.getUTCMonth() && fi.getUTCFullYear() === ff.getUTCFullYear()
  if (mismoMes) {
    return `${fi.getUTCDate()} al ${ff.getUTCDate()} de ${MESES_ES[
      fi.getUTCMonth()
    ].toLowerCase()} de ${fi.getUTCFullYear()}`
  }
  return `${formatearFecha(fi)} al ${formatearFecha(ff)}`
}

const RE_ISO = /^\d{4}-\d{2}-\d{2}([T ]|$)/

/**
 * Título legible de un relevamiento, evitando mostrar fechas ISO crudas como
 * "2026-01-01T03:00:00.000Z". Si el nombre es una fecha (o está vacío), deriva
 * el título del período: Mensual → "Enero 2026"; Especial → fecha de inicio.
 */
export function tituloRelevamiento(
  tipo: string,
  nombre: string,
  fechaInicio: unknown,
): string {
  const n = (nombre || '').trim()
  if (!n || RE_ISO.test(n)) {
    return tipo === 'Mensual' ? formatearMesAnio(fechaInicio) : formatearFecha(fechaInicio)
  }
  return n
}
