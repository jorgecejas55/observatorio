'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  ComposedChart, Area, Line, LineChart, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import KPICard from '@/components/charts/KPICard'
import type { CatuDashboard, CatuSentimiento } from '@/lib/catu/types'
import {
  type Periodo, presets, periodoAnterior, filtrarSerie, calcularKpis, variacionRelativa,
  diferencia, granularidadPara, construirSerie, topicosDelPeriodo, sentimientoDelPeriodo,
  hoyAR, formatoCorto, diasEntre,
} from '@/lib/catu/periodo'

// ── Estilos compartidos ───────────────────────────────────────────────────────

const AX = { axisLine: false, tickLine: false, tick: { fontSize: 11, fill: '#9ca3af' } } as const
const GRID = { strokeDasharray: '3 3', vertical: false, stroke: '#f3f4f6' } as const

const COLOR_SENT: Record<CatuSentimiento['sentimiento'], string> = {
  Positivo: '#22c55e',
  Neutral: '#9ca3af',
  Negativo: '#ef4444',
  'Sin dato': '#d1d5db',
}

const fmt = (n: number | null, dec = 1) =>
  n === null ? 'Sin dato' : n.toLocaleString('es-AR', { maximumFractionDigits: dec })

// ── Tooltip ───────────────────────────────────────────────────────────────────

function Tip({ active, payload, label, unit = '', prefijo = '' }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-4 py-3 text-sm min-w-[170px]">
      <p className="font-semibold text-gray-700 mb-2">{prefijo}{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-gray-500">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-bold text-gray-800">
            {p.value === null || p.value === undefined ? 'Sin dato' : `${fmt(p.value)}${unit}`}
          </span>
        </div>
      ))}
    </div>
  )
}

function SinDatos({ alto = 'h-52', texto = 'Sin conversaciones en el período' }) {
  return (
    <div className={`${alto} flex flex-col items-center justify-center text-gray-300 gap-2`}>
      <i className="fa-solid fa-chart-simple text-3xl" aria-hidden="true" />
      <p className="text-xs">{texto}</p>
    </div>
  )
}

// ── Selector de período ───────────────────────────────────────────────────────

function SelectorPeriodo({
  opciones, presetId, periodo, min, max, onPreset, onRango,
}: {
  opciones: ReturnType<typeof presets>
  presetId: string | null
  periodo: Periodo
  min: string
  max: string
  onPreset: (id: string) => void
  onRango: (p: Periodo) => void
}) {
  const [personalizado, setPersonalizado] = useState(presetId === null)
  const [borrador, setBorrador] = useState<Periodo>(periodo)

  useEffect(() => setBorrador(periodo), [periodo])

  const valido = borrador.desde && borrador.hasta && borrador.desde <= borrador.hasta

  return (
    <div className="card p-4 space-y-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Período">
        {opciones.map(o => (
          <button
            key={o.id}
            type="button"
            onClick={() => { setPersonalizado(false); onPreset(o.id) }}
            aria-pressed={presetId === o.id}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              presetId === o.id
                ? 'bg-orange-500 text-white shadow-sm'
                : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
            }`}
          >
            {o.etiqueta}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPersonalizado(true)}
          aria-pressed={presetId === null}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all inline-flex items-center gap-1.5 ${
            presetId === null
              ? 'bg-orange-500 text-white shadow-sm'
              : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
          }`}
        >
          <i className="fa-regular fa-calendar" aria-hidden="true" />
          Personalizado
        </button>
      </div>

      {personalizado && (
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={e => { e.preventDefault(); if (valido) onRango(borrador) }}
        >
          <label className="text-xs text-text-secondary flex flex-col gap-1">
            Desde
            <input
              type="date" className="input py-1.5 text-sm" min={min} max={max}
              value={borrador.desde} onChange={e => setBorrador(b => ({ ...b, desde: e.target.value }))}
            />
          </label>
          <label className="text-xs text-text-secondary flex flex-col gap-1">
            Hasta
            <input
              type="date" className="input py-1.5 text-sm" min={min} max={max}
              value={borrador.hasta} onChange={e => setBorrador(b => ({ ...b, hasta: e.target.value }))}
            />
          </label>
          <button type="submit" disabled={!valido} className="btn-primary text-sm px-4 py-2 disabled:opacity-50">
            Aplicar
          </button>
          {!valido && borrador.desde && borrador.hasta && (
            <p className="text-xs text-red-500 w-full">La fecha "desde" tiene que ser anterior a "hasta".</p>
          )}
        </form>
      )}
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function CatuPage() {
  const [datos, setDatos] = useState<CatuDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [presetId, setPresetId] = useState<string | null>('30d')
  const [rangoLibre, setRangoLibre] = useState<Periodo | null>(null)

  useEffect(() => {
    fetch('/api/catu')
      .then(r => r.json())
      .then(res => {
        if (!res.success) throw new Error(res.error ?? 'Error al cargar datos')
        setDatos(res.data)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const hoy = useMemo(() => hoyAR(), [])
  const primerDia = datos?.serie_diaria[0]?.fecha ?? hoy
  const anios = useMemo(
    () => (datos ? [...new Set(datos.serie_diaria.map(d => d.fecha.slice(0, 4)))] : []),
    [datos],
  )
  const opciones = useMemo(() => presets(hoy, primerDia, anios), [hoy, primerDia, anios])

  const periodo: Periodo =
    (presetId ? opciones.find(o => o.id === presetId)?.periodo : rangoLibre) ?? opciones[1].periodo
  const anterior = useMemo(() => periodoAnterior(periodo, presetId), [periodo.desde, periodo.hasta, presetId]) // eslint-disable-line react-hooks/exhaustive-deps

  const calc = useMemo(() => {
    if (!datos) return null
    const dias = filtrarSerie(datos.serie_diaria, periodo)
    const diasAnt = filtrarSerie(datos.serie_diaria, anterior)
    const kpis = calcularKpis(dias)
    const kpisAnt = calcularKpis(diasAnt)
    const g = granularidadPara(periodo)
    const serie = construirSerie(dias, periodo, g)
    const serieAnt = construirSerie(diasAnt, anterior, g)
    // Superponer el período anterior alineado por posición
    const serieComp = serie.map((p, i) => ({ ...p, conversaciones_ant: serieAnt[i]?.conversaciones ?? null }))
    return {
      kpis,
      kpisAnt,
      hayComparacion: kpisAnt.conversaciones > 0,
      granularidad: g,
      serie: serieComp,
      topicos: topicosDelPeriodo(datos.topicos_diarios, periodo, anterior, 10),
      sentimiento: sentimientoDelPeriodo(dias),
    }
  }, [datos, periodo.desde, periodo.hasta, anterior]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render ────────────────────────────────────────────────────────────────────

  if (loading) return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>

  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-text-secondary">
      <i className="fa-solid fa-triangle-exclamation text-3xl text-amber-400" aria-hidden="true" />
      <p className="text-sm">No se pudieron cargar las estadísticas de Catu. Intentá de nuevo más tarde.</p>
      <p className="text-xs opacity-60">{error}</p>
    </div>
  )

  if (!datos || !calc || datos.serie_diaria.length === 0) return (
    <div className="flex flex-col items-center justify-center h-64 gap-2 text-text-secondary">
      <i className="fa-solid fa-robot text-3xl text-orange-300" aria-hidden="true" />
      <p className="text-sm">Todavía no hay datos sincronizados de Catu.</p>
    </div>
  )

  const { kpis, kpisAnt, hayComparacion } = calc
  const etiquetaPeriodo = `${formatoCorto(periodo.desde)} – ${formatoCorto(periodo.hasta)}`
  const etiquetaAnterior = `${formatoCorto(anterior.desde)} – ${formatoCorto(anterior.hasta)}`
  const comp = (v: number | null) => (hayComparacion ? v : null)
  const tituloComp = `Comparado con ${etiquetaAnterior}`
  const porUnidad = { 'día': 'por día', semana: 'por semana', mes: 'por mes' }[calc.granularidad]
  const prefijoTip = calc.granularidad === 'semana' ? 'Semana del ' : ''

  const ultimaSync = datos.ultima_sync
    ? new Date(datos.ultima_sync).toLocaleString('es-AR', {
        timeZone: 'America/Argentina/Catamarca',
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : null

  return (
    <div className="space-y-6 p-4 lg:p-6">

      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <i className="fa-solid fa-robot text-orange-500" aria-hidden="true" />
          Catu Bot — Analítica de conversaciones
        </h1>
        {ultimaSync && (
          <p className="text-xs text-text-secondary mt-1 flex items-center gap-1 flex-wrap">
            <i className="fa-solid fa-clock-rotate-left opacity-60" aria-hidden="true" />
            Última sincronización: {ultimaSync}
            {datos.ultima_sync_estado === 'error' && (
              <span className="ml-2 text-amber-600 font-medium">
                <i className="fa-solid fa-triangle-exclamation mr-1" aria-hidden="true" />
                falló; se muestran los últimos datos disponibles
              </span>
            )}
          </p>
        )}
      </div>

      <SelectorPeriodo
        opciones={opciones}
        presetId={presetId}
        periodo={periodo}
        min={primerDia}
        max={hoy}
        onPreset={id => { setPresetId(id); setRangoLibre(null) }}
        onRango={p => { setRangoLibre(p); setPresetId(null) }}
      />

      <p className="text-sm text-text-secondary -mt-2 flex flex-wrap items-center gap-x-2">
        <span className="font-semibold text-text-primary">{etiquetaPeriodo}</span>
        <span>· {diasEntre(periodo.desde, periodo.hasta)} días</span>
        <span>
          · {hayComparacion
            ? <>variaciones respecto de {etiquetaAnterior}</>
            : <>sin datos en {etiquetaAnterior} para comparar</>}
        </span>
      </p>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          titulo="Conversaciones"
          valor={kpis.conversaciones}
          icono="fa-comments"
          color="text-orange-500"
          variacion={comp(variacionRelativa(kpis.conversaciones, kpisAnt.conversaciones))}
          variacionTitulo={`${tituloComp}: ${kpisAnt.conversaciones.toLocaleString('es-AR')}`}
          subtitulo={hayComparacion ? `Antes: ${kpisAnt.conversaciones.toLocaleString('es-AR')}` : etiquetaPeriodo}
        />
        <KPICard
          titulo="Score promedio"
          valor={kpis.score === null ? 'Sin dato' : fmt(kpis.score)}
          unidad={kpis.score !== null ? '/ 10' : undefined}
          icono="fa-star"
          color="text-amber-500"
          variacion={comp(diferencia(kpis.score, kpisAnt.score))}
          variacionSufijo=" pts"
          variacionTitulo={`${tituloComp}: ${fmt(kpisAnt.score)}`}
          subtitulo={`Meta ≥ 7${hayComparacion ? ` · antes ${fmt(kpisAnt.score)}` : ''}`}
        />
        <KPICard
          titulo="Tasa de resolución"
          valor={kpis.resolucion === null ? 'Sin dato' : fmt(kpis.resolucion)}
          unidad={kpis.resolucion !== null ? '%' : undefined}
          icono="fa-circle-check"
          color="text-green-500"
          variacion={comp(diferencia(kpis.resolucion, kpisAnt.resolucion))}
          variacionSufijo=" pp"
          variacionTitulo={`${tituloComp}: ${fmt(kpisAnt.resolucion)}%`}
          subtitulo={`Meta ≥ 70%${hayComparacion ? ` · antes ${fmt(kpisAnt.resolucion)}%` : ''}`}
        />
        <KPICard
          titulo="Info faltante"
          valor={kpis.infoFaltante === null ? 'Sin dato' : fmt(kpis.infoFaltante)}
          unidad={kpis.infoFaltante !== null ? '%' : undefined}
          icono="fa-circle-exclamation"
          color="text-red-400"
          variacion={comp(diferencia(kpis.infoFaltante, kpisAnt.infoFaltante))}
          variacionSufijo=" pp"
          variacionInvertida
          variacionTitulo={`${tituloComp}: ${fmt(kpisAnt.infoFaltante)}%`}
          subtitulo={`${fmt(kpis.atencion)}% requieren atención`}
        />
      </div>

      {/* Fila 1: conversaciones + score */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-semibold text-text-primary mb-1">Conversaciones {porUnidad}</h3>
          <p className="text-xs text-text-secondary mb-4">
            {hayComparacion ? 'Línea punteada: período anterior' : etiquetaPeriodo}
          </p>
          {kpis.conversaciones === 0 ? <SinDatos /> : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={calc.serie} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradConv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ea580c" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#ea580c" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="etiqueta" {...AX} minTickGap={16} />
                  <YAxis {...AX} width={34} allowDecimals={false} />
                  <Tooltip content={<Tip prefijo={prefijoTip} />} />
                  <Area
                    type="monotone" dataKey="conversaciones" name="Período"
                    stroke="#ea580c" strokeWidth={2} fill="url(#gradConv)"
                  />
                  {hayComparacion && (
                    <Line
                      type="monotone" dataKey="conversaciones_ant" name="Período anterior"
                      stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="4 3" dot={false}
                    />
                  )}
                  {hayComparacion && <Legend iconType="plainline" wrapperStyle={{ fontSize: 11 }} />}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-text-primary mb-1">Score y resolución {porUnidad}</h3>
          <p className="text-xs text-text-secondary mb-4">Score de 0 a 10 · resolución en %</p>
          {kpis.conversaciones === 0 ? <SinDatos /> : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={calc.serie} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="etiqueta" {...AX} minTickGap={16} />
                  <YAxis yAxisId="score" {...AX} width={30} domain={[0, 10]} />
                  <YAxis yAxisId="pct" orientation="right" {...AX} width={34} domain={[0, 100]} unit="%" />
                  <Tooltip content={<Tip prefijo={prefijoTip} />} />
                  <ReferenceLine yAxisId="score" y={7} stroke="#22c55e" strokeDasharray="4 3" strokeWidth={1}
                    label={{ value: 'Meta 7', position: 'insideTopLeft', fill: '#22c55e', fontSize: 10 }} />
                  <Line
                    yAxisId="score" type="monotone" dataKey="score_prom" name="Score"
                    stroke="#f97316" strokeWidth={2} dot={calc.granularidad !== 'día'} connectNulls
                  />
                  <Line
                    yAxisId="pct" type="monotone" dataKey="resolucion" name="Resolución %"
                    stroke="#10b981" strokeWidth={1.5} dot={false} connectNulls
                  />
                  <Legend iconType="plainline" wrapperStyle={{ fontSize: 11 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Fila 2: tópicos + sentimiento */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-6 lg:col-span-2">
          <h3 className="font-semibold text-text-primary mb-1">Tópicos más consultados</h3>
          <p className="text-xs text-text-secondary mb-5">
            Top 10 del período · cada tópico se cuenta una vez por conversación
          </p>
          {calc.topicos.length === 0 ? <SinDatos alto="h-72" /> : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={calc.topicos} layout="vertical" margin={{ top: 4, right: 40, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                  <XAxis type="number" {...AX} allowDecimals={false} />
                  <YAxis
                    type="category" dataKey="topico" {...AX}
                    width={150}
                    tickFormatter={(v: string) => (v.length > 22 ? v.slice(0, 21) + '…' : v)}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0]?.payload
                      const v = hayComparacion ? variacionRelativa(d.total, d.totalAnterior) : null
                      return (
                        <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-4 py-3 text-sm">
                          <p className="font-semibold text-gray-700 mb-1">{label}</p>
                          <p className="text-gray-500">Conversaciones: <span className="font-bold text-gray-800">{d.total}</span></p>
                          {hayComparacion && (
                            <p className="text-gray-500">
                              Período anterior: {d.totalAnterior}
                              {v !== null && <span className={v >= 0 ? 'text-green-600' : 'text-red-500'}> ({v >= 0 ? '+' : ''}{fmt(v)}%)</span>}
                            </p>
                          )}
                          <p className="text-green-600">Resueltas: {d.resueltas}</p>
                          <p className="text-red-500">No resueltas: {d.no_resueltas}</p>
                          <p className="text-gray-500">Score prom.: {fmt(d.score_prom)}{d.score_prom != null ? '/10' : ''}</p>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="total" name="Conversaciones" fill="#f97316" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-text-primary mb-1">Sentimiento del usuario</h3>
          <p className="text-xs text-text-secondary mb-5">{etiquetaPeriodo}</p>
          {kpis.conversaciones === 0 ? <SinDatos /> : (
            <div className="space-y-3">
              {calc.sentimiento.map(s => (
                <div key={s.sentimiento}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-text-primary">{s.sentimiento}</span>
                    <span className="text-sm font-bold" style={{ color: COLOR_SENT[s.sentimiento] }}>
                      {fmt(s.porcentaje)}%
                    </span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${s.porcentaje}%`, background: COLOR_SENT[s.sentimiento] }}
                    />
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">{s.total.toLocaleString('es-AR')} conversaciones</p>
                </div>
              ))}

              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-text-secondary mb-0.5">Promedio de mensajes por conversación</p>
                <p className="text-2xl font-bold text-text-primary">
                  {fmt(kpis.mensajesPorConv)}
                  <span className="text-sm font-normal text-text-secondary ml-1">mensajes</span>
                </p>
                {hayComparacion && (
                  <p className="text-xs text-text-secondary mt-0.5">Antes: {fmt(kpisAnt.mensajesPorConv)}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-text-secondary">
        Fuente: panel de análisis de Catu Bot, sincronizado cada hora. Puntajes y sentimiento son
        evaluaciones automáticas de cada conversación. Días en hora de Argentina.
      </p>
    </div>
  )
}
