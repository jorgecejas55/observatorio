// Cálculos por período del tablero de Catu (funciones puras, sin React).
// Todas las fechas son texto yyyy-MM-dd en hora Argentina: la aritmética se hace
// en UTC sobre ese texto para no depender de la zona horaria del navegador.

import type { CatuDiario, CatuTopicosDiarios, CatuSentimiento } from './types'

export interface Periodo {
  desde: string
  hasta: string
}

// ── Fechas ────────────────────────────────────────────────────────────────────

const DIA_MS = 86_400_000

function aUtc(fecha: string): number {
  const [a, m, d] = fecha.split('-').map(Number)
  return Date.UTC(a, m - 1, d)
}

function deUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

export function sumarDias(fecha: string, n: number): string {
  return deUtc(aUtc(fecha) + n * DIA_MS)
}

export function diasEntre(desde: string, hasta: string): number {
  return Math.round((aUtc(hasta) - aUtc(desde)) / DIA_MS) + 1
}

/** Hoy en hora Argentina. */
export function hoyAR(): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Argentina/Catamarca', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date()).map(x => [x.type, x.value]),
  )
  return `${p.year}-${p.month}-${p.day}`
}

export function formatoCorto(fecha: string): string {
  const [a, m, d] = fecha.split('-')
  return `${d}/${m}/${a.slice(2)}`
}

// ── Presets ───────────────────────────────────────────────────────────────────

export interface Preset {
  id: string
  etiqueta: string
  periodo: Periodo
}

export function presets(hoy: string, primerDia: string, anios: string[]): Preset[] {
  const [a, m] = hoy.split('-')
  const inicioMes = `${a}-${m}-01`
  const finMesAnterior = sumarDias(inicioMes, -1)
  const inicioMesAnterior = `${finMesAnterior.slice(0, 7)}-01`
  const lista: Preset[] = [
    { id: '7d', etiqueta: 'Últimos 7 días', periodo: { desde: sumarDias(hoy, -6), hasta: hoy } },
    { id: '30d', etiqueta: 'Últimos 30 días', periodo: { desde: sumarDias(hoy, -29), hasta: hoy } },
    { id: '90d', etiqueta: 'Últimos 90 días', periodo: { desde: sumarDias(hoy, -89), hasta: hoy } },
    { id: 'mes', etiqueta: 'Este mes', periodo: { desde: inicioMes, hasta: hoy } },
    { id: 'mes-ant', etiqueta: 'Mes anterior', periodo: { desde: inicioMesAnterior, hasta: finMesAnterior } },
  ]
  for (const anio of [...anios].sort().reverse()) {
    lista.push({
      id: `anio-${anio}`,
      etiqueta: anio === a ? `${anio} (en curso)` : anio,
      periodo: { desde: `${anio}-01-01`, hasta: anio === a ? hoy : `${anio}-12-31` },
    })
  }
  lista.push({ id: 'todo', etiqueta: 'Todo el período', periodo: { desde: primerDia, hasta: hoy } })
  return lista
}

/**
 * Período de comparación. Meses y años calendario se comparan con el mes/año
 * anterior (mismos días transcurridos si está en curso); el resto, con el
 * mismo largo inmediatamente anterior.
 */
export function periodoAnterior(p: Periodo, presetId: string | null): Periodo {
  if (presetId?.startsWith('anio-')) {
    const anio = Number(p.desde.slice(0, 4)) - 1
    const hasta = `${anio}${p.hasta.slice(4)}`
    return { desde: `${anio}-01-01`, hasta: hasta.endsWith('-02-29') ? `${anio}-02-28` : hasta }
  }
  if (presetId === 'mes' || presetId === 'mes-ant') {
    const inicioAnt = `${sumarDias(p.desde, -1).slice(0, 7)}-01`
    const finAnt = sumarDias(p.desde, -1)
    // Mes completo → mes anterior completo; mes en curso → mismos días transcurridos
    const mesCompleto = sumarDias(p.hasta, 1).slice(8, 10) === '01'
    if (mesCompleto) return { desde: inicioAnt, hasta: finAnt }
    const hasta = sumarDias(inicioAnt, diasEntre(p.desde, p.hasta) - 1)
    return { desde: inicioAnt, hasta: hasta > finAnt ? finAnt : hasta }
  }
  const largo = diasEntre(p.desde, p.hasta)
  const hasta = sumarDias(p.desde, -1)
  return { desde: sumarDias(hasta, -(largo - 1)), hasta }
}

// ── Filtrado y KPIs ───────────────────────────────────────────────────────────

export const enPeriodo = (fecha: string, p: Periodo) => fecha >= p.desde && fecha <= p.hasta

export function filtrarSerie(serie: CatuDiario[], p: Periodo): CatuDiario[] {
  return serie.filter(d => enPeriodo(d.fecha, p))
}

export interface Kpis {
  conversaciones: number
  score: number | null
  resolucion: number | null // %
  atencion: number | null // %
  infoFaltante: number | null // %
  mensajesPorConv: number | null
}

export function calcularKpis(dias: CatuDiario[]): Kpis {
  let conv = 0, msg = 0, suma = 0, n = 0, res = 0, aten = 0, falt = 0
  for (const d of dias) {
    conv += d.conversaciones
    msg += d.mensajes_total
    suma += d.score_suma
    n += d.score_n
    res += d.resueltas
    aten += d.requieren_atencion
    falt += d.info_faltante
  }
  // "Sin datos ≠ 0": sin conversaciones, las tasas quedan en null
  const pct = (x: number) => (conv > 0 ? Math.round(x / conv * 1000) / 10 : null)
  return {
    conversaciones: conv,
    score: n > 0 ? Math.round(suma / n * 10) / 10 : null,
    resolucion: pct(res),
    atencion: pct(aten),
    infoFaltante: pct(falt),
    mensajesPorConv: conv > 0 ? Math.round(msg / conv * 10) / 10 : null,
  }
}

/** Variación relativa en % (null si no hay base de comparación). */
export function variacionRelativa(actual: number, anterior: number): number | null {
  if (!anterior) return null
  return Math.round((actual - anterior) / anterior * 1000) / 10
}

/** Diferencia absoluta (puntos o puntos porcentuales). */
export function diferencia(actual: number | null, anterior: number | null): number | null {
  if (actual === null || anterior === null) return null
  return Math.round((actual - anterior) * 10) / 10
}

// ── Serie para gráficos ───────────────────────────────────────────────────────

export type Granularidad = 'día' | 'semana' | 'mes'

export interface PuntoSerie {
  clave: string
  etiqueta: string
  conversaciones: number
  score_prom: number | null
  resolucion: number | null
}

export function granularidadPara(p: Periodo): Granularidad {
  const largo = diasEntre(p.desde, p.hasta)
  if (largo <= 45) return 'día'
  if (largo <= 210) return 'semana'
  return 'mes'
}

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

/** Lunes de la semana (ISO) de una fecha. */
function lunesDe(fecha: string): string {
  const dow = (new Date(aUtc(fecha)).getUTCDay() + 6) % 7 // 0 = lunes
  return sumarDias(fecha, -dow)
}

/** Agrupa la serie diaria del período; incluye los días/semanas/meses sin conversaciones. */
export function construirSerie(dias: CatuDiario[], p: Periodo, g: Granularidad): PuntoSerie[] {
  const porFecha = new Map(dias.map(d => [d.fecha, d]))
  const grupos = new Map<string, { conv: number; suma: number; n: number; res: number }>()
  const variosAnios = p.desde.slice(0, 4) !== p.hasta.slice(0, 4)

  const claveDe = (f: string) => (g === 'día' ? f : g === 'semana' ? lunesDe(f) : f.slice(0, 7))
  for (let f = p.desde; f <= p.hasta; f = sumarDias(f, 1)) {
    const k = claveDe(f)
    const acc = grupos.get(k) ?? { conv: 0, suma: 0, n: 0, res: 0 }
    const d = porFecha.get(f)
    if (d) {
      acc.conv += d.conversaciones
      acc.suma += d.score_suma
      acc.n += d.score_n
      acc.res += d.resueltas
    }
    grupos.set(k, acc)
  }

  return [...grupos.entries()].map(([k, x]) => {
    let etiqueta: string
    if (g === 'mes') {
      const m = MESES[Number(k.slice(5, 7)) - 1]
      etiqueta = variosAnios ? `${m} ${k.slice(2, 4)}` : m
    } else {
      etiqueta = `${k.slice(8, 10)}/${k.slice(5, 7)}`
    }
    return {
      clave: k,
      etiqueta,
      conversaciones: x.conv,
      score_prom: x.n > 0 ? Math.round(x.suma / x.n * 10) / 10 : null,
      resolucion: x.conv > 0 ? Math.round(x.res / x.conv * 100) : null,
    }
  })
}

// ── Tópicos y sentimiento ─────────────────────────────────────────────────────

export interface TopicoPeriodo {
  topico: string
  total: number
  resueltas: number
  no_resueltas: number
  score_prom: number | null
  totalAnterior: number
}

export function topicosDelPeriodo(
  td: CatuTopicosDiarios, p: Periodo, anterior: Periodo | null, limite = 10,
): TopicoPeriodo[] {
  const act = new Map<number, { total: number; res: number; suma: number; n: number }>()
  const ant = new Map<number, number>()
  for (const [di, ti, total, res, suma, n] of td.filas) {
    const f = td.dias[di]
    if (enPeriodo(f, p)) {
      const x = act.get(ti) ?? { total: 0, res: 0, suma: 0, n: 0 }
      x.total += total; x.res += res; x.suma += suma; x.n += n
      act.set(ti, x)
    } else if (anterior && enPeriodo(f, anterior)) {
      ant.set(ti, (ant.get(ti) ?? 0) + total)
    }
  }
  return [...act.entries()]
    .sort((a, b) => b[1].total - a[1].total || td.nombres[a[0]].localeCompare(td.nombres[b[0]]))
    .slice(0, limite)
    .map(([ti, x]) => ({
      topico: td.nombres[ti],
      total: x.total,
      resueltas: x.res,
      no_resueltas: x.total - x.res,
      score_prom: x.n > 0 ? Math.round(x.suma / x.n * 10) / 10 : null,
      totalAnterior: ant.get(ti) ?? 0,
    }))
}

export function sentimientoDelPeriodo(dias: CatuDiario[]): CatuSentimiento[] {
  const t = { Positivo: 0, Neutral: 0, Negativo: 0, 'Sin dato': 0 }
  for (const d of dias) {
    t.Positivo += d.sent_positivo
    t.Neutral += d.sent_neutral
    t.Negativo += d.sent_negativo
    t['Sin dato'] += d.sent_sin_dato
  }
  const total = t.Positivo + t.Neutral + t.Negativo + t['Sin dato']
  return (Object.keys(t) as (keyof typeof t)[])
    .filter(k => k !== 'Sin dato' || t[k] > 0)
    .map(k => ({
      sentimiento: k,
      total: t[k],
      porcentaje: total > 0 ? Math.round(t[k] / total * 1000) / 10 : 0,
    }))
}
