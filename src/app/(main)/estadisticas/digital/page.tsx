'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import MetricasService from '@/services/metricasService'
import type { MetricaWeb, MetricaSocial } from '@/services/metricasService'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import KPICard from '@/components/charts/KPICard'
import { formatearMesAnio } from '@/lib/formato-fechas'

// ── Tipos ─────────────────────────────────────────────────────────────────────

type Canal = 'web' | 'facebook' | 'instagram'

const CANALES: { key: Canal; label: string; icono: string; color: string; accent: string }[] = [
  { key: 'web',       label: 'Sitio Web',  icono: 'fa-solid fa-globe',              color: 'text-blue-600',   accent: '#3b82f6' },
  { key: 'facebook',  label: 'Facebook',   icono: 'fa-brands fa-facebook',          color: 'text-indigo-600', accent: '#4f46e5' },
  { key: 'instagram', label: 'Instagram',  icono: 'fa-brands fa-instagram',         color: 'text-pink-600',   accent: '#db2777' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function sortFn(a: { mes_anio: string }, b: { mes_anio: string }) {
  const [ma, ya] = a.mes_anio.split('/').map(Number)
  const [mb, yb] = b.mes_anio.split('/').map(Number)
  return ya !== yb ? ya - yb : ma - mb
}

function extractAnio(mes_anio: string): number {
  const p = mes_anio.split('/')
  return p.length === 2 ? Number(p[1]) : 0
}

const fmtN = (v: unknown) =>
  typeof v === 'number' ? v.toLocaleString('es-AR') : String(v ?? '—')

function variacionPct(cur: number, pre: number): number | undefined {
  if (!pre) return undefined
  return Math.round(((cur - pre) / pre) * 100)
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

function Tip({ active, payload, label, unit = '' }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-4 py-3 text-sm min-w-[150px]">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-gray-500">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-bold text-gray-800">{fmtN(p.value)}{unit}</span>
        </div>
      ))}
    </div>
  )
}

// ── Subcomponentes ────────────────────────────────────────────────────────────

function EmptyPeriodo() {
  return (
    <div className="h-52 flex flex-col items-center justify-center text-gray-300 gap-2">
      <i className="fa-solid fa-chart-simple text-3xl" />
      <p className="text-xs">Sin datos para el período</p>
    </div>
  )
}

const AX = { axisLine: false, tickLine: false, tick: { fontSize: 11, fill: '#9ca3af' } } as const
const GRID = { strokeDasharray: '3 3', vertical: false, stroke: '#f3f4f6' } as const

// ── Vista Web ─────────────────────────────────────────────────────────────────

function VistaWeb({ datos }: { datos: MetricaWeb[] }) {
  const ultimo = datos[datos.length - 1]
  const anterior = datos[datos.length - 2]

  const kpis = useMemo(() => {
    const total = datos.reduce((s, d) => s + (d.visitantes ?? 0), 0)
    const topRegion = ultimo?.regiones?.slice().sort((a, b) => b.visitas - a.visitas)[0]
    const topFuente = ultimo?.fuentes?.slice().sort((a, b) => b.visitas - a.visitas)[0]
    // Etiqueta del período filtrado
    const anos = [...new Set(datos.map(d => d.mes_anio.split('/')[1]))].sort()
    const labelPeriodo = anos.length === 1 ? `Año ${anos[0]}` : `${anos[0]}–${anos[anos.length - 1]}`
    return { total, topRegion, topFuente, labelPeriodo }
  }, [datos])

  const labelUltimoMes = ultimo ? formatearMesAnio(ultimo.mes_anio) : '—'

  if (!datos.length) return <EmptyPeriodo />

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          titulo="Visitantes"
          valor={ultimo?.visitantes ?? 0}
          icono="fa-users"
          color="text-blue-500"
          variacion={variacionPct(ultimo?.visitantes ?? 0, anterior?.visitantes ?? 0)}
          subtitulo={labelUltimoMes}
        />
        <KPICard
          titulo="Total de visitantes"
          valor={kpis.total}
          icono="fa-chart-line"
          color="text-blue-400"
          subtitulo={kpis.labelPeriodo}
        />
        <KPICard
          titulo="Top región"
          valor={kpis.topRegion?.region ?? '—'}
          icono="fa-map-pin"
          color="text-green-500"
          subtitulo={`${kpis.topRegion?.visitas ?? 0}% · ${labelUltimoMes}`}
        />
        <KPICard
          titulo="Principal fuente"
          valor={kpis.topFuente?.fuente ?? '—'}
          icono="fa-arrow-pointer"
          color="text-purple-500"
          subtitulo={`${kpis.topFuente?.visitas ?? 0}% · ${labelUltimoMes}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-6 lg:col-span-2">
          <h3 className="font-semibold text-text-primary mb-5">Visitantes por mes</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={datos} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gWeb" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="mes_anio" {...AX} />
                <YAxis {...AX} width={50} tickFormatter={fmtN} />
                <Tooltip content={<Tip />} />
                <Area type="monotone" dataKey="visitantes" name="Visitantes"
                  stroke="#3b82f6" strokeWidth={2} fill="url(#gWeb)"
                  dot={false} activeDot={{ r: 4, strokeWidth: 0 }} connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-text-primary mb-1">Top regiones</h3>
          <p className="text-xs text-text-secondary mb-4">{ultimo?.mes_anio ?? '—'}</p>
          {(ultimo?.regiones ?? []).length === 0 ? (
            <p className="text-sm text-gray-400">Sin datos</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ultimo!.regiones} layout="vertical"
                  margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="region" type="category" axisLine={false} tickLine={false}
                    tick={{ fontSize: 11, fill: '#6b7280' }} width={88} />
                  <Tooltip content={<Tip unit="%" />} />
                  <Bar dataKey="visitas" name="Participación" fill="#10b981" radius={[0, 4, 4, 0]} barSize={14}
                    label={{ position: 'right', fontSize: 11, fill: '#6b7280', formatter: (v: number) => `${v}%` }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {(ultimo?.fuentes ?? []).length > 0 && (
        <div className="card p-6">
          <h3 className="font-semibold text-text-primary mb-4">
            Fuentes de tráfico — {ultimo?.mes_anio}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ultimo!.fuentes!.map((f, i) => (
              <div key={i} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-gray-600 font-medium">{f.fuente}</span>
                  <span className="text-gray-800 font-bold">{f.visitas}%</span>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(f.visitas, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Vista Social (Facebook / Instagram) ──────────────────────────────────────

function VistaSocial({ datos, accent }: { datos: MetricaSocial[]; accent: string }) {
  const ultimo = datos[datos.length - 1]
  const anterior = datos[datos.length - 2]

  const kpis = useMemo(() => {
    const segActual = ultimo?.seguidores ?? 0
    const segAnterior = anterior?.seguidores ?? 0
    const nuevosSeg = segActual - segAnterior
    const engagement = segActual > 0
      ? parseFloat(((ultimo?.interacciones ?? 0) / segActual * 100).toFixed(2))
      : 0
    const intPorPub = (ultimo?.publicaciones ?? 0) > 0
      ? Math.round((ultimo?.interacciones ?? 0) / ultimo!.publicaciones)
      : 0
    return { segActual, segAnterior, nuevosSeg, engagement, intPorPub }
  }, [datos])

  const labelUltimoMes = ultimo ? formatearMesAnio(ultimo.mes_anio) : '—'
  const labelMesAnterior = anterior ? formatearMesAnio(anterior.mes_anio) : '—'

  if (!datos.length) return <EmptyPeriodo />

  const datosConEngagement = datos.map(d => ({
    ...d,
    engagement: d.seguidores > 0
      ? parseFloat(((d.interacciones / d.seguidores) * 100).toFixed(2))
      : 0,
  }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          titulo="Seguidores"
          valor={kpis.segActual}
          icono="fa-users"
          color="text-indigo-500"
          variacion={variacionPct(kpis.segActual, kpis.segAnterior)}
          subtitulo={labelUltimoMes}
        />
        <KPICard
          titulo="Nuevos seguidores"
          valor={kpis.nuevosSeg >= 0 ? `+${fmtN(kpis.nuevosSeg)}` : fmtN(kpis.nuevosSeg)}
          icono="fa-user-plus"
          color={kpis.nuevosSeg >= 0 ? 'text-green-500' : 'text-red-500'}
          subtitulo={`vs. ${labelMesAnterior}`}
        />
        <KPICard
          titulo="Tasa de interacción"
          valor={kpis.engagement.toFixed(2)}
          unidad="%"
          icono="fa-heart"
          color="text-pink-500"
          subtitulo={labelUltimoMes}
        />
        <KPICard
          titulo="Interacciones/publicación"
          valor={kpis.intPorPub}
          icono="fa-repeat"
          color="text-purple-500"
          subtitulo={labelUltimoMes}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-semibold text-text-primary mb-5">Evolución de seguidores</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={datos} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gSeg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={accent} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="mes_anio" {...AX} />
                <YAxis {...AX} width={56} tickFormatter={fmtN} />
                <Tooltip content={<Tip />} />
                <Area type="monotone" dataKey="seguidores" name="Seguidores"
                  stroke={accent} strokeWidth={2} fill="url(#gSeg)"
                  dot={false} activeDot={{ r: 4, strokeWidth: 0 }} connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-text-primary mb-5">Interacciones por mes</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datos} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="mes_anio" {...AX} />
                <YAxis {...AX} width={50} tickFormatter={fmtN} />
                <Tooltip content={<Tip />} />
                <Bar dataKey="interacciones" name="Interacciones"
                  fill={accent} radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-text-primary mb-1">Tasa de interacción</h3>
          <p className="text-xs text-text-secondary mb-4">Interacciones con el contenido del mes cada 100 seguidores</p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={datosConEngagement} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="mes_anio" {...AX} />
                <YAxis {...AX} width={42} tickFormatter={(v) => `${v}%`} />
                <Tooltip content={<Tip />} />
                <Line type="monotone" dataKey="engagement" name="Tasa de interacción (%)"
                  stroke={accent} strokeWidth={2} dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-text-primary mb-5">Publicaciones por mes</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datos} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="mes_anio" {...AX} />
                <YAxis {...AX} width={38} />
                <Tooltip content={<Tip />} />
                <Bar dataKey="publicaciones" name="Publicaciones"
                  fill={accent} fillOpacity={0.6} radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function DigitalDashboard() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{
    web: MetricaWeb[]
    facebook: MetricaSocial[]
    instagram: MetricaSocial[]
  }>({ web: [], facebook: [], instagram: [] })

  const [canal, setCanal] = useState<Canal>('web')
  const [anoSeleccionado, setAnoSeleccionado] = useState<number | 'todos'>('todos')

  // Carga única al montar — todas las interacciones posteriores son frontend
  useEffect(() => {
    async function fetchAll() {
      const [web, fb, ig] = await Promise.all([
        MetricasService.getMetricas<MetricaWeb>('web'),
        MetricasService.getMetricas<MetricaSocial>('facebook'),
        MetricasService.getMetricas<MetricaSocial>('instagram'),
      ])
      const sorted = {
        web: [...web].sort(sortFn),
        facebook: [...fb].sort(sortFn),
        instagram: [...ig].sort(sortFn),
      }
      setData(sorted)

      // Auto-seleccionar el año más reciente disponible
      const anos = new Set<number>()
      ;[...web, ...fb, ...ig].forEach(d => anos.add(extractAnio(d.mes_anio)))
      const lista = Array.from(anos).filter(a => a > 0).sort((a, b) => b - a)
      if (lista.length > 0) setAnoSeleccionado(lista[0])

      setLoading(false)
    }
    fetchAll()
  }, [])

  const anosDisponibles = useMemo(() => {
    const set = new Set<number>()
    ;[...data.web, ...data.facebook, ...data.instagram]
      .forEach(d => set.add(extractAnio(d.mes_anio)))
    return Array.from(set).filter(a => a > 0).sort((a, b) => b - a)
  }, [data])

  // Filtro por año — puro frontend, sin red
  const filtrar = <T extends { mes_anio: string }>(list: T[]): T[] => {
    if (anoSeleccionado === 'todos') return list
    return list.filter(d => extractAnio(d.mes_anio) === anoSeleccionado)
  }

  const canalActivo = CANALES.find(c => c.key === canal)!

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="section-title mb-1">
          <i className="fa-solid fa-chart-line text-primary mr-2" />
          Canales Digitales
        </h2>
        <p className="text-sm text-text-secondary">
          Indicadores de presencia digital del Observatorio de Turismo
        </p>
      </div>

      {/* Catu Bot tiene su propio tablero, con datos automáticos */}
      <a
        href="/estadisticas/catu"
        className="card card-hover mb-6 p-4 flex items-center gap-3 text-sm"
      >
        <span className="w-9 h-9 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center flex-shrink-0">
          <i className="fa-solid fa-robot" aria-hidden="true" />
        </span>
        <span className="flex-1">
          <span className="block font-semibold text-text-primary">Catu Bot</span>
          <span className="block text-xs text-text-secondary">
            Conversaciones, tópicos y satisfacción, actualizados automáticamente cada hora
          </span>
        </span>
        <i className="fa-solid fa-arrow-right text-text-secondary" aria-hidden="true" />
      </a>

      {/* Tabs de canal + selector de año */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
          {CANALES.map(c => (
            <button
              key={c.key}
              onClick={() => setCanal(c.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                canal === c.key
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <i className={`${c.icono} text-xs ${canal === c.key ? c.color : ''}`} />
              <span className="hidden sm:inline">{c.label}</span>
            </button>
          ))}
        </div>

        {anosDisponibles.length > 1 && (
          <div className="flex gap-1.5 flex-wrap">
            {anosDisponibles.map(a => (
              <button
                key={a}
                onClick={() => setAnoSeleccionado(a)}
                className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                  anoSeleccionado === a
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {a}
              </button>
            ))}
            <button
              onClick={() => setAnoSeleccionado('todos')}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                anoSeleccionado === 'todos'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Todos
            </button>
          </div>
        )}
      </div>

      {/* Indicador del canal activo */}
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center ${canalActivo.color}`}>
          <i className={`${canalActivo.icono} text-sm`} />
        </div>
        <div>
          <h3 className="font-bold text-text-primary">{canalActivo.label}</h3>
          <p className="text-xs text-text-secondary">
            {anoSeleccionado === 'todos' ? 'Todos los períodos' : `Año ${anoSeleccionado}`}
          </p>
        </div>
      </div>

      {/* Vista por canal — switching instantáneo, sin llamadas a la API */}
      {canal === 'web'       && <VistaWeb datos={filtrar(data.web)} />}
      {canal === 'facebook'  && <VistaSocial datos={filtrar(data.facebook)} accent="#4f46e5" />}
      {canal === 'instagram' && <VistaSocial datos={filtrar(data.instagram)} accent="#db2777" />}
    </div>
  )
}
