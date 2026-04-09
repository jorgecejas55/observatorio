'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer, Legend,
} from 'recharts'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ItemConteo { nombre: string; cantidad: number }

interface DashboardStats {
  total: number
  aniosDisponibles: number[]
  porProcedencia:          ItemConteo[]
  paisesFrecuentes:        ItemConteo[]
  provinciasFrecuentes:    ItemConteo[]
  departamentosFrecuentes: ItemConteo[]
  motivosVisita:           ItemConteo[]
  gruposViaje:             ItemConteo[]
  mediosTransporte:        ItemConteo[]
  tiposAlojamiento:        ItemConteo[]
  primeraVez:              Record<string, number>
  otrosDestinos:           Record<string, number>
  recomendaria:            Record<string, number>
  volveria:                Record<string, number>
  edadPromedio:            number | null
  estadiaPromedio:         number | null
  edadPorProcedencia:      Record<string, number>
  estadiaPorProcedencia:   Record<string, number>
  valoraciones:            Record<string, number | null>
}

interface Filtros {
  fechaDesde: string
  fechaHasta: string
  procedencia: string
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const ANIO_ACTUAL = new Date().getFullYear()

const PROCEDENCIAS_FILTRO = [
  { value: '',              label: 'Todas' },
  { value: 'NACIONAL',     label: 'Nacional' },
  { value: 'PROVINCIAL',   label: 'Provincial' },
  { value: 'INTERNACIONAL',label: 'Internacional' },
]

const DIMENSIONES_LABEL: Record<string, string> = {
  alojamiento:     'Alojamiento',
  gastronomia:     'Gastronomía',
  calidad_precio:  'Calidad/Precio',
  hospitalidad:    'Hospitalidad',
  seguridad:       'Seguridad',
  info_turistica:  'Info. Turística',
  senaletica:      'Señalética',
  oferta_cultural: 'Oferta Cultural',
  estadia_general: 'Estadía General',
}

const COLORES_PROCEDENCIA: Record<string, string> = {
  NACIONAL:      '#db2777',
  PROVINCIAL:    '#f97316',
  INTERNACIONAL: '#0ea5e9',
}

const COLORES_PIE = ['#db2777', '#f97316', '#0ea5e9', '#10b981', '#8b5cf6', '#6b7280']

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function KPI({ label, value, sub }: { label: string; value: string | number | null; sub?: string }) {
  return (
    <div className="card p-5 flex flex-col gap-1">
      <p className="text-xs font-bold uppercase tracking-wider text-text-secondary">{label}</p>
      <p className="text-3xl font-extrabold text-text-primary">
        {value ?? <span className="text-gray-300">—</span>}
      </p>
      {sub && <p className="text-xs text-text-secondary">{sub}</p>}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary mb-3 flex items-center gap-2">
      <span className="w-4 h-0.5 bg-primary rounded-full" />
      {children}
    </h3>
  )
}

function ChartCard({ title, children, full }: { title: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={`card p-5 ${full ? 'col-span-full' : ''}`}>
      <p className="text-sm font-semibold text-text-primary mb-4">{title}</p>
      {children}
    </div>
  )
}

/** Convierte un array de conteos a porcentajes (relativo a la suma del propio array) */
function toPct(items: ItemConteo[]): ItemConteo[] {
  const sum = items.reduce((s, d) => s + d.cantidad, 0)
  if (sum === 0) return items
  return items.map(d => ({ ...d, cantidad: Math.round(d.cantidad / sum * 1000) / 10 }))
}

/** Toma los primeros n ítems y calcula el % relativo al total del array completo */
function topNPct(items: ItemConteo[], n: number): ItemConteo[] {
  const sum = items.reduce((s, d) => s + d.cantidad, 0)
  if (sum === 0) return items.slice(0, n)
  return items.slice(0, n).map(d => ({ ...d, cantidad: Math.round(d.cantidad / sum * 1000) / 10 }))
}

/** Gráfico de barras horizontales genérico */
function BarH({ data, color = '#db2777', domain, unit = '%' }: {
  data: ItemConteo[]; color?: string; domain?: [number, number]; unit?: string
}) {
  if (!data || data.length === 0) return <EmptyChart />
  const height = Math.max(180, data.length * 32)
  const axisDomain = domain ?? (unit === '%' ? [0, 100] as [number, number] : undefined)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 48, top: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
        <XAxis
          type="number"
          tick={{ fontSize: 11 }}
          domain={axisDomain}
          tickFormatter={unit === '%' ? (v: number) => `${v}%` : undefined}
        />
        <YAxis type="category" dataKey="nombre" tick={{ fontSize: 10 }} width={110} />
        <Tooltip
          formatter={(v: number) => [
            unit === '%' ? `${v.toLocaleString('es-AR')}%` : v.toLocaleString('es-AR'),
            '',
          ]}
        />
        <Bar dataKey="cantidad" fill={color} radius={[0, 4, 4, 0]}
          label={{ position: 'right', fontSize: 11, formatter: (v: number) => unit === '%' ? `${v}%` : v }}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Gráfico de torta genérico — muestra porcentajes */
function PieG({ data, colors = COLORES_PIE }: { data: { name: string; value: number }[]; colors?: string[] }) {
  if (!data || data.length === 0) return <EmptyChart />
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%" cy="50%"
          innerRadius={55} outerRadius={85}
          dataKey="value"
          label={({ value }) => total ? `${Math.round(value / total * 100)}%` : ''}
          labelLine={true}
        >
          {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
        </Pie>
        <Legend formatter={(v) => <span style={{ fontSize: 12 }}>{v}</span>} />
        <Tooltip formatter={(v: number) => [
          total ? `${Math.round(v / total * 100)}%` : '—', ''
        ]} />
      </PieChart>
    </ResponsiveContainer>
  )
}

function EmptyChart() {
  return (
    <div className="h-24 flex items-center justify-center text-sm text-text-secondary">
      Sin datos para el período seleccionado
    </div>
  )
}

function LoadingChart() {
  return <div className="h-24 bg-gray-100 animate-pulse rounded-lg" />
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function PerfilVisitantePage() {
  const [filtros, setFiltros] = useState<Filtros>({
    fechaDesde: `${ANIO_ACTUAL}-01-01`,
    fechaHasta: `${ANIO_ACTUAL}-12-31`,
    procedencia: '',
  })
  const [pendiente, setPendiente] = useState<Filtros>(filtros)
  const [stats, setStats]     = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [anioActivo, setAnioActivo] = useState<number | 'todos' | 'custom'>(ANIO_ACTUAL)

  const fetchStats = useCallback(async (f: Filtros) => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (f.fechaDesde)  params.set('fechaDesde',  f.fechaDesde)
      if (f.fechaHasta)  params.set('fechaHasta',  f.fechaHasta)
      if (f.procedencia) params.set('procedencia', f.procedencia)

      const res  = await fetch(`/api/ocio/dashboard?${params}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setStats(data)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStats(filtros) }, [])

  // ─── Handlers de filtros ────────────────────────────────────────────────

  function seleccionarAnio(anio: number | 'todos') {
    setAnioActivo(anio)
    let f: Filtros
    if (anio === 'todos') {
      f = { ...pendiente, fechaDesde: '', fechaHasta: '' }
    } else {
      f = { ...pendiente, fechaDesde: `${anio}-01-01`, fechaHasta: `${anio}-12-31` }
    }
    setPendiente(f)
    setFiltros(f)
    fetchStats(f)
  }

  function seleccionarProcedencia(proc: string) {
    const f = { ...pendiente, procedencia: proc }
    setPendiente(f)
    setFiltros(f)
    fetchStats(f)
  }

  function aplicarFechas() {
    setAnioActivo('custom')
    const f = { ...pendiente }
    setFiltros(f)
    fetchStats(f)
  }

  // ─── Datos derivados ────────────────────────────────────────────────────

  const anios = stats?.aniosDisponibles ?? []

  const dataProcedencia = stats?.porProcedencia.map(d => ({
    name: d.nombre, value: d.cantidad,
  })) ?? []

  const dataValoraciones = stats
    ? Object.entries(stats.valoraciones)
        .filter(([, v]) => v !== null)
        .map(([k, v]) => ({ nombre: DIMENSIONES_LABEL[k] ?? k, cantidad: v as number }))
        .sort((a, b) => b.cantidad - a.cantidad)
    : []

  const mostrarPaises    = !filtros.procedencia || filtros.procedencia === 'INTERNACIONAL'
  const mostrarProvincias = !filtros.procedencia || filtros.procedencia === 'NACIONAL'
  const mostrarDeptos    = !filtros.procedencia || filtros.procedencia === 'PROVINCIAL'

  const dataPrimeraVez = stats
    ? Object.entries(stats.primeraVez).map(([k, v]) => ({ name: k, value: v }))
    : []
  const dataOtrosDestinos = stats
    ? Object.entries(stats.otrosDestinos).map(([k, v]) => ({ name: k, value: v }))
    : []
  const dataRecomendaria = stats
    ? Object.entries(stats.recomendaria).map(([k, v]) => ({ name: k, value: v }))
    : []
  const dataVolveria = stats
    ? Object.entries(stats.volveria).map(([k, v]) => ({ name: k, value: v }))
    : []

  // ─── Datos memoizados con porcentajes ───────────────────────────────────

  const paisesPct = useMemo(() =>
    topNPct(stats?.paisesFrecuentes ?? [], 5)
  , [stats?.paisesFrecuentes])

  const provinciasPct = useMemo(() =>
    topNPct(stats?.provinciasFrecuentes ?? [], 5)
  , [stats?.provinciasFrecuentes])

  const deptosPct = useMemo(() =>
    topNPct(stats?.departamentosFrecuentes ?? [], 5)
  , [stats?.departamentosFrecuentes])

  const motivosPct = useMemo(() =>
    toPct(stats?.motivosVisita ?? [])
  , [stats?.motivosVisita])

  const gruposPct = useMemo(() =>
    toPct(stats?.gruposViaje ?? [])
  , [stats?.gruposViaje])

  const transportePct = useMemo(() =>
    toPct(stats?.mediosTransporte ?? [])
  , [stats?.mediosTransporte])

  const alojamientoPct = useMemo(() =>
    toPct(stats?.tiposAlojamiento ?? [])
  , [stats?.tiposAlojamiento])

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div>
      <h2 className="section-title">Perfil del Visitante</h2>
      <p className="text-sm text-text-secondary -mt-6 mb-8">
        San Fernando del Valle de Catamarca · Encuesta permanente
      </p>

      {/* ── Filtros ─────────────────────────────────────────────────────── */}
      <div className="card p-5 mb-6">
        <div className="flex flex-col gap-4">

          {/* Botones de año */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider w-full sm:w-auto">Año</span>
            {anios.map(a => (
              <button
                key={a}
                onClick={() => seleccionarAnio(a)}
                className={`btn text-sm px-4 py-1.5 ${anioActivo === a ? 'btn-primary' : 'btn-ghost border border-gray-200'}`}
              >
                {a}
              </button>
            ))}
            <button
              onClick={() => seleccionarAnio('todos')}
              className={`btn text-sm px-4 py-1.5 ${anioActivo === 'todos' ? 'btn-primary' : 'btn-ghost border border-gray-200'}`}
            >
              Todos
            </button>
          </div>

          {/* Rango de fechas personalizado */}
          <div className="flex flex-wrap items-end gap-3">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider self-center">Rango</span>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={pendiente.fechaDesde}
                onChange={e => setPendiente(f => ({ ...f, fechaDesde: e.target.value }))}
                className="input py-1.5 text-sm w-36"
              />
              <span className="text-text-secondary text-sm">—</span>
              <input
                type="date"
                value={pendiente.fechaHasta}
                onChange={e => setPendiente(f => ({ ...f, fechaHasta: e.target.value }))}
                className="input py-1.5 text-sm w-36"
              />
            </div>
            <button onClick={aplicarFechas} className="btn-outline text-sm py-1.5 px-4">
              Aplicar
            </button>
          </div>

          {/* Filtro procedencia */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider w-full sm:w-auto">Procedencia</span>
            {PROCEDENCIAS_FILTRO.map(p => (
              <button
                key={p.value}
                onClick={() => seleccionarProcedencia(p.value)}
                className={`btn text-sm px-4 py-1.5 ${filtros.procedencia === p.value ? 'btn-primary' : 'btn-ghost border border-gray-200'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Estado de carga / error ────────────────────────────────────── */}
      {error && (
        <div className="card p-5 mb-6 bg-red-50 border-red-200 text-red-700 text-sm flex items-center gap-2">
          <i className="fa-solid fa-circle-xmark" />
          {error}
        </div>
      )}

      {/* ── KPIs ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KPI
          label="Total encuestas"
          value={loading ? '…' : stats?.total.toLocaleString('es-AR') ?? '—'}
        />
        <KPI
          label="Edad promedio"
          value={loading ? '…' : stats?.edadPromedio ? `${stats.edadPromedio} años` : '—'}
        />
        <KPI
          label="Estadía promedio"
          value={loading ? '…' : stats?.estadiaPromedio ? `${stats.estadiaPromedio} noches` : '—'}
        />
        <KPI
          label="Primera visita"
          value={loading ? '…' : (() => {
            if (!stats) return '—'
            const si  = stats.primeraVez['SÍ'] ?? stats.primeraVez['SI'] ?? 0
            const tot = Object.values(stats.primeraVez).reduce((a, b) => a + b, 0)
            return tot > 0 ? `${Math.round(si / tot * 100)}%` : '—'
          })()}
          sub="visitantes nuevos"
        />
      </div>

      {/* ── Origen ──────────────────────────────────────────────────────── */}
      <SectionTitle>Origen</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">

        <ChartCard title="Procedencia">
          {loading ? <LoadingChart /> : <PieG data={dataProcedencia} colors={Object.values(COLORES_PROCEDENCIA)} />}
        </ChartCard>

        {mostrarPaises && (
          <ChartCard title="Países de origen (top 5)" full={!mostrarProvincias && !mostrarDeptos}>
            {loading ? <LoadingChart /> : <BarH data={paisesPct} color="#0ea5e9" />}
          </ChartCard>
        )}

        {mostrarProvincias && (
          <ChartCard title="Provincias de origen (top 5)">
            {loading ? <LoadingChart /> : <BarH data={provinciasPct} color="#db2777" />}
          </ChartCard>
        )}

        {mostrarDeptos && (
          <ChartCard title="Departamentos de origen (top 5)">
            {loading ? <LoadingChart /> : <BarH data={deptosPct} color="#f97316" />}
          </ChartCard>
        )}
      </div>

      {/* ── Viaje ───────────────────────────────────────────────────────── */}
      <SectionTitle>Características del Viaje</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">

        <ChartCard title="Principal motivo de visita">
          {loading ? <LoadingChart /> : <BarH data={motivosPct} color="#db2777" />}
        </ChartCard>

        <ChartCard title="Grupo de viaje">
          {loading ? <LoadingChart /> : <BarH data={gruposPct} color="#8b5cf6" />}
        </ChartCard>

        <ChartCard title="Medio de transporte para llegar">
          {loading ? <LoadingChart /> : <BarH data={transportePct} color="#f97316" />}
        </ChartCard>

        <ChartCard title="Tipo de alojamiento">
          {loading ? <LoadingChart /> : <BarH data={alojamientoPct} color="#0ea5e9" />}
        </ChartCard>
      </div>

      {/* ── Estadía y edad por procedencia ─────────────────────────────── */}
      {stats && (Object.keys(stats.estadiaPorProcedencia).length > 0 || Object.keys(stats.edadPorProcedencia).length > 0) && (
        <>
          <SectionTitle>Promedios por Procedencia</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <ChartCard title="Estadía promedio por procedencia (noches)">
              {loading ? <LoadingChart /> : (
                <BarH
                  data={Object.entries(stats.estadiaPorProcedencia).map(([k, v]) => ({ nombre: k, cantidad: v }))}
                  color="#10b981"
                  unit="noches"
                />
              )}
            </ChartCard>
            <ChartCard title="Edad promedio por procedencia (años)">
              {loading ? <LoadingChart /> : (
                <BarH
                  data={Object.entries(stats.edadPorProcedencia).map(([k, v]) => ({ nombre: k, cantidad: v }))}
                  color="#f97316"
                  unit="años"
                />
              )}
            </ChartCard>
          </div>
        </>
      )}

      {/* ── Satisfacción ────────────────────────────────────────────────── */}
      <SectionTitle>Satisfacción y Comportamiento</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <ChartCard title="¿Primera vez en SFVC?">
          {loading ? <LoadingChart /> : <PieG data={dataPrimeraVez} />}
        </ChartCard>
        <ChartCard title="¿Pensó en otros destinos?">
          {loading ? <LoadingChart /> : <PieG data={dataOtrosDestinos} />}
        </ChartCard>
        <ChartCard title="¿Recomendaría SFVC?">
          {loading ? <LoadingChart /> : <PieG data={dataRecomendaria} colors={['#10b981', '#f97316', '#ef4444']} />}
        </ChartCard>
        <ChartCard title="¿Volvería a SFVC?">
          {loading ? <LoadingChart /> : <PieG data={dataVolveria} colors={['#10b981', '#f97316', '#ef4444']} />}
        </ChartCard>
      </div>

      {/* ── Valoraciones ────────────────────────────────────────────────── */}
      <SectionTitle>Valoración del Destino (escala 1–5)</SectionTitle>
      <ChartCard title="Promedio de valoraciones por dimensión">
        {loading ? <LoadingChart /> : (
          <BarH data={dataValoraciones} color="#db2777" domain={[0, 5]} unit="pts" />
        )}
      </ChartCard>

    </div>
  )
}
