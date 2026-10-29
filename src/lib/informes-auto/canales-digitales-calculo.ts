/**
 * Cálculos puros de la sección "Canales digitales" del informe MENSUAL
 * (sitio web, Instagram, Facebook). Sin fetch ni imports de runtime.
 *
 * Regla dura de período (plan §3.2) para el mes M del año A:
 * - KPIs: solo el registro M/A; comparaciones con M-1 (o 12/A-1) y M/A-1.
 * - Evolución: 01/A..M/A y 01/A-1..M/A-1. Nunca meses posteriores a M/A.
 * - Mes sin registro → null ("sin datos"), nunca 0.
 */

import type {
  CanalesDigitalesInforme,
  MetricaCanalMensual,
  ParticipacionCanal,
  PuntoMensual,
  RedSocialInforme,
  WebInforme,
} from './types'

export interface RegistroWeb {
  mes_anio: unknown
  visitantes: number
  regiones?: { region: string; visitas: number }[]
  fuentes?: { fuente: string; visitas: number }[]
}

export interface RegistroSocial {
  mes_anio: unknown
  seguidores: number
  interacciones: number
  publicaciones: number
}

/** Variación menor a este % se lee como "similar". */
const UMBRAL_LECTURA = 10

// ── Meses ─────────────────────────────────────────────────────────────────────

/** Clave ordenable año*100+mes. */
const clave = (anio: number, mes: number) => anio * 100 + mes

/**
 * Acepta "MM/YYYY", "M/YYYY" y fechas ISO: Sheets a veces convierte el texto en
 * fecha ("2026-04-01T03:00:00.000Z" = 1/4 en hora argentina; la fecha UTC coincide).
 */
export function parsearMesAnio(valor: unknown): { anio: number; mes: number } | null {
  const texto = String(valor ?? '').trim()
  const barra = /^(\d{1,2})\/(\d{4})$/.exec(texto)
  if (barra) return validar(Number(barra[2]), Number(barra[1]))
  const iso = /^(\d{4})-(\d{2})/.exec(texto)
  if (iso) return validar(Number(iso[1]), Number(iso[2]))
  return null
}

function validar(anio: number, mes: number) {
  return mes >= 1 && mes <= 12 ? { anio, mes } : null
}

export function mesAnterior(anio: number, mes: number): { anio: number; mes: number } {
  return mes === 1 ? { anio: anio - 1, mes: 12 } : { anio, mes: mes - 1 }
}

export function indexarPorMes<T extends { mes_anio: unknown }>(registros: T[]): Map<number, T> {
  const mapa = new Map<number, T>()
  for (const r of registros) {
    const m = parsearMesAnio(r.mes_anio)
    if (m) mapa.set(clave(m.anio, m.mes), r)
  }
  return mapa
}

// ── Métricas y series ─────────────────────────────────────────────────────────

type Extractor<T> = (registro: T) => number | null

function valorEn<T>(mapa: Map<number, T>, anio: number, mes: number, extraer: Extractor<T>): number | null {
  const r = mapa.get(clave(anio, mes))
  if (!r) return null
  const v = extraer(r)
  return v === null || !Number.isFinite(v) ? null : v
}

export function metricaMensual<T>(mapa: Map<number, T>, anio: number, mes: number, extraer: Extractor<T>): MetricaCanalMensual {
  const ant = mesAnterior(anio, mes)
  return {
    actual: valorEn(mapa, anio, mes, extraer),
    mesAnterior: valorEn(mapa, ant.anio, ant.mes, extraer),
    anioAnterior: valorEn(mapa, anio - 1, mes, extraer),
  }
}

/** Enero → `hastaMes` del año dado. */
export function serieAnual<T>(mapa: Map<number, T>, anio: number, hastaMes: number, extraer: Extractor<T>): PuntoMensual[] {
  return Array.from({ length: hastaMes }, (_, i) => ({ mes: i + 1, valor: valorEn(mapa, anio, i + 1, extraer) }))
}

const redondear = (valor: number, decimales: number) => Math.round(valor * 10 ** decimales) / 10 ** decimales

/** Variación relativa en % (null si falta un extremo o la base es 0). */
export function variacionPct(actual: number | null, anterior: number | null): number | null {
  if (actual === null || anterior === null || anterior === 0) return null
  return redondear(((actual - anterior) / anterior) * 100, 1)
}

// ── Redes sociales ────────────────────────────────────────────────────────────

const intPorPub: Extractor<RegistroSocial> = r =>
  r.publicaciones > 0 ? redondear(r.interacciones / r.publicaciones, 1) : null

const pctTexto = (v: number) => `${Math.round(Math.abs(v)).toLocaleString('es-AR')} %`

/**
 * Lectura en lenguaje llano: ¿se publicó más/menos y cómo respondió cada
 * publicación? Sin mes anterior no hay lectura.
 */
export function lecturaRedSocial(
  publicaciones: MetricaCanalMensual,
  ippActual: number | null,
  ippAnterior: number | null,
): string | null {
  const vPub = variacionPct(publicaciones.actual, publicaciones.mesAnterior)
  const vIpp = variacionPct(ippActual, ippAnterior)
  if (vPub === null || vIpp === null) return null

  const sentido = (v: number) => (v > UMBRAL_LECTURA ? 'sube' : v < -UMBRAL_LECTURA ? 'baja' : 'igual')
  const pub = sentido(vPub)
  const ipp = sentido(vIpp)
  const frasePub = pub === 'sube'
    ? `Se publicó un ${pctTexto(vPub)} más que el mes anterior`
    : pub === 'baja'
      ? `Se publicó un ${pctTexto(vPub)} menos que el mes anterior`
      : 'Con un volumen de publicaciones similar al mes anterior'
  const fraseIpp = ipp === 'sube'
    ? `las interacciones por publicación subieron un ${pctTexto(vIpp)}`
    : ipp === 'baja'
      ? `las interacciones por publicación bajaron un ${pctTexto(vIpp)}`
      : 'la respuesta por publicación fue similar'

  const cierres: Record<string, string> = {
    'sube|baja': ': más volumen con menor respuesta.',
    'sube|sube': ': más volumen y mejor respuesta.',
    'baja|sube': ': menos volumen con mejor respuesta.',
    'baja|baja': ': menos volumen y menor respuesta.',
  }
  const cierre = cierres[`${pub}|${ipp}`] ?? '.'
  const union = pub === 'igual' ? ', ' : ' y '
  return `${frasePub}${union}${fraseIpp}${cierre}`
}

export function calcularRedSocial(registros: RegistroSocial[], anio: number, mes: number): RedSocialInforme {
  const mapa = indexarPorMes(registros)
  const seguidores = metricaMensual(mapa, anio, mes, r => r.seguidores)
  const publicaciones = metricaMensual(mapa, anio, mes, r => r.publicaciones)
  const interacciones = metricaMensual(mapa, anio, mes, r => r.interacciones)
  const ipp = metricaMensual(mapa, anio, mes, intPorPub)

  return {
    seguidores,
    nuevosSeguidores: seguidores.actual !== null && seguidores.mesAnterior !== null
      ? seguidores.actual - seguidores.mesAnterior
      : null,
    publicaciones,
    interacciones,
    // Misma fórmula que /estadisticas/digital
    engagement: seguidores.actual && interacciones.actual !== null
      ? redondear((interacciones.actual / seguidores.actual) * 100, 2)
      : null,
    interaccionesPorPublicacion: ipp.actual,
    lectura: lecturaRedSocial(publicaciones, ipp.actual, ipp.mesAnterior),
    serieSeguidores: serieAnual(mapa, anio, mes, r => r.seguidores),
    seriePublicaciones: serieAnual(mapa, anio, mes, r => r.publicaciones),
    serieIntPorPub: serieAnual(mapa, anio, mes, intPorPub),
  }
}

// ── Sitio web ─────────────────────────────────────────────────────────────────

/** "buenos aires c.f." → "Buenos Aires C.f." */
function capitalizar(texto: string): string {
  return texto.trim().toLowerCase().replace(/(^|\s)\p{L}/gu, letra => letra.toUpperCase())
}

function top3(items: { nombre: string; pct: number }[]): ParticipacionCanal[] {
  return items
    .filter(i => i.nombre && Number.isFinite(i.pct))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 3)
    .map(i => ({ nombre: capitalizar(i.nombre), pct: i.pct }))
}

export function calcularWeb(registros: RegistroWeb[], anio: number, mes: number): WebInforme {
  const mapa = indexarPorMes(registros)
  const delMes = mapa.get(clave(anio, mes))
  return {
    visitantes: metricaMensual(mapa, anio, mes, r => r.visitantes),
    serie: serieAnual(mapa, anio, mes, r => r.visitantes),
    serieAnioAnterior: serieAnual(mapa, anio - 1, mes, r => r.visitantes),
    // regiones/fuentes se cargan como % del mes, no como visitas absolutas
    topRegiones: top3((delMes?.regiones ?? []).map(r => ({ nombre: r.region, pct: Number(r.visitas) }))),
    topFuentes: top3((delMes?.fuentes ?? []).map(f => ({ nombre: f.fuente, pct: Number(f.visitas) }))),
  }
}

// ── Faltantes ─────────────────────────────────────────────────────────────────

/** Canales sin dato del mes o leídos a medias, para avisar en la revisión. */
export function faltantesDe(canales: Omit<CanalesDigitalesInforme, 'faltantes'>): string[] {
  const { anio, mes } = canales.periodo
  const etiquetaMes = `${String(mes).padStart(2, '0')}/${anio}`
  const faltantes: string[] = []
  const revisar = (nombre: string, canal: { incompleto?: boolean } | null, actual: number | null | undefined) => {
    if (!canal || canal.incompleto) faltantes.push(`${nombre}: no se pudo leer`)
    else if (actual === null || actual === undefined) faltantes.push(`${nombre}-${etiquetaMes}`)
  }
  revisar('web', canales.web, canales.web?.visitantes.actual)
  revisar('instagram', canales.instagram, canales.instagram?.seguidores.actual)
  revisar('facebook', canales.facebook, canales.facebook?.seguidores.actual)
  revisar('catu', canales.catu, canales.catu?.conversaciones)
  return faltantes
}

const NOMBRES_FALTANTE: Record<string, string> = {
  web: 'Sitio web', instagram: 'Instagram', facebook: 'Facebook', catu: 'Catu',
}

/** "instagram-10/2026" → "Instagram: sin datos cargados de 10/2026" (texto para la UI). */
export function describirFaltante(faltante: string): string {
  const corte = faltante.search(/[-:]/)
  const canal = corte < 0 ? faltante : faltante.slice(0, corte)
  const nombre = NOMBRES_FALTANTE[canal] ?? canal
  if (faltante[corte] === ':') return `${nombre}: no se pudo leer (volvé a calcular)`
  return `${nombre}: sin datos cargados de ${faltante.slice(corte + 1)}`
}
