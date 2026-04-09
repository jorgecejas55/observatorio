'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts'
import { SkeletonCard, SkeletonChart, SkeletonFilters } from '@/components/shared/SkeletonLoader'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface SerieTemporalItem {
  mes: string
  cantidad?: number
  asistentes?: number
}

interface CategoriaItem {
  nombre: string
  cantidad?: number
  porcentaje?: number
  duracion?: number
  asistentes?: number
}

interface DashboardEventosData {
  success: boolean
  total: number
  totalAsistentes: number
  duracionMedia: number
  eventosPorMes: SerieTemporalItem[]
  asistentesPorMes: SerieTemporalItem[]
  porcentajesPorOrigen: CategoriaItem[]
  porcentajesPorTipo: CategoriaItem[]
  duracionPorTipo: CategoriaItem[]
  duracionPorOrigen: CategoriaItem[]
  asistentesPorOrigen: CategoriaItem[]
  asistentesPorTipo: CategoriaItem[]
}

interface Filtros {
  fechaDesde: string
  fechaHasta: string
  tipo: string
  origen: string
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const COLORES_PIE = ['#db2777', '#f97316', '#0ea5e9', '#10b981', '#8b5cf6', '#6b7280', '#ef4444', '#14b8a6']

// Tipos y orígenes (extraídos de los datos reales)
const TIPOS_EVENTO = [
  'Congresos y convenciones',
  'Culturales y deportivos',
  'Ferias y exposiciones'
]

const ORIGENES_EVENTO = [
  'Académica',
  'Asociativa',
  'Corporativa',
  'Gubernamental',
  'Mixto',
  'Otro'
]

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function KPI({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card p-5 flex flex-col gap-1">
      <p className="text-xs font-bold uppercase tracking-wider text-text-secondary">{label}</p>
      <p className="text-3xl font-extrabold text-text-primary">{value}</p>
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

// ─── Página principal ─────────────────────────────────────────────────────────

export default function DashboardEventosPage() {
  const [data, setData] = useState<DashboardEventosData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [filtros, setFiltros] = useState<Filtros>({
    fechaDesde: '',
    fechaHasta: '',
    tipo: '',
    origen: ''
  })

  const [filtrosAplicados, setFiltrosAplicados] = useState<Filtros>({
    fechaDesde: '',
    fechaHasta: '',
    tipo: '',
    origen: ''
  })

  // ── Cargar datos ──────────────────────────────────────────────────────────

  async function cargarDatos() {
    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams()
      if (filtrosAplicados.fechaDesde) params.set('fechaDesde', filtrosAplicados.fechaDesde)
      if (filtrosAplicados.fechaHasta) params.set('fechaHasta', filtrosAplicados.fechaHasta)
      if (filtrosAplicados.tipo) params.set('tipo', filtrosAplicados.tipo)
      if (filtrosAplicados.origen) params.set('origen', filtrosAplicados.origen)

      const url = `/api/eventos/dashboard?${params.toString()}`
      const res = await fetch(url)

      if (!res.ok) throw new Error('Error al cargar datos')

      const json = await res.json()

      if (!json.success) {
        throw new Error(json.error || 'Error en la respuesta')
      }

      setData(json)
    } catch (err) {
      console.error(err)
      setError('No se pudieron cargar las estadísticas. Verificá la conexión.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [filtrosAplicados])

  // ── Handlers ──────────────────────────────────────────────────────────────

  function aplicarFiltros() {
    setFiltrosAplicados({ ...filtros })
  }

  function limpiarFiltros() {
    const filtrosVacios = { fechaDesde: '', fechaHasta: '', tipo: '', origen: '' }
    setFiltros(filtrosVacios)
    setFiltrosAplicados(filtrosVacios)
  }

  // ── Helpers de formato ────────────────────────────────────────────────────

  function formatearNumero(num: number): string {
    return num.toLocaleString('es-AR')
  }

  function formatearMes(mes: string): string {
    const [año, mesNum] = mes.split('-')
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    return `${meses[parseInt(mesNum) - 1]} ${año}`
  }

  // ── Memorizar si hay filtros activos ──────────────────────────────────────

  const hayFiltrosActivos = useMemo(() => {
    return !!(filtrosAplicados.fechaDesde || filtrosAplicados.fechaHasta ||
      filtrosAplicados.tipo || filtrosAplicados.origen)
  }, [filtrosAplicados])

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading && !data) {
    return (
      <div className="space-y-6">
        {/* Encabezado skeleton */}
        <div>
          <div className="h-8 bg-gray-200 rounded w-64 mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
        </div>

        {/* Filtros skeleton */}
        <SkeletonFilters />

        {/* KPIs skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>

        {/* Gráficos skeleton */}
        <SkeletonChart height={350} />
        <SkeletonChart height={350} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SkeletonChart height={300} />
          <SkeletonChart height={300} />
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="card p-6 border-red-200 bg-red-50">
        <div className="flex items-start gap-3">
          <i className="fa-solid fa-triangle-exclamation text-red-500 text-xl mt-1" />
          <div className="flex-1">
            <p className="font-semibold text-red-700 mb-1">Error al cargar datos</p>
            <p className="text-sm text-red-600 mb-3">{error}</p>
            <button onClick={cargarDatos} className="btn-ghost text-red-600 text-sm">
              <i className="fa-solid fa-rotate-right" /> Reintentar
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  // Si no hay datos
  const sinDatos = data.total === 0

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h1 className="section-title">Dashboard de Eventos Turísticos</h1>
        <p className="text-text-secondary text-sm -mt-6">
          {sinDatos ? (
            <>
              No se encontraron eventos
              {hayFiltrosActivos && <span className="text-primary font-medium"> con los filtros aplicados</span>}
            </>
          ) : (
            <>
              Estadísticas agregadas de {formatearNumero(data.total)} evento{data.total !== 1 ? 's' : ''} registrado{data.total !== 1 ? 's' : ''}
              {hayFiltrosActivos && <span className="text-primary font-medium"> (con filtros aplicados)</span>}
            </>
          )}
        </p>
      </div>

      {/* Filtros */}
      <div className="card p-4">
        <div className="space-y-3">
          {/* Fila 1: Fechas */}
          <div className="flex flex-wrap gap-3 items-center">
            <label htmlFor="fechaDesde" className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Rango de fechas:
            </label>
            <input
              type="date"
              id="fechaDesde"
              value={filtros.fechaDesde}
              onChange={(e) => setFiltros({ ...filtros, fechaDesde: e.target.value })}
              className="input w-auto"
              placeholder="Desde"
              aria-label="Fecha desde"
            />
            <span className="text-text-secondary" aria-hidden="true">→</span>
            <input
              type="date"
              id="fechaHasta"
              value={filtros.fechaHasta}
              onChange={(e) => setFiltros({ ...filtros, fechaHasta: e.target.value })}
              className="input w-auto"
              placeholder="Hasta"
              aria-label="Fecha hasta"
            />
          </div>

          {/* Fila 2: Tipo y Origen */}
          <div className="flex flex-wrap gap-3">
            <select
              id="filtroTipo"
              value={filtros.tipo}
              onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
              className="input bg-white w-auto min-w-64"
              aria-label="Filtrar por tipo de evento"
            >
              <option value="">Todos los tipos</option>
              {TIPOS_EVENTO.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <select
              id="filtroOrigen"
              value={filtros.origen}
              onChange={(e) => setFiltros({ ...filtros, origen: e.target.value })}
              className="input bg-white w-auto min-w-52"
              aria-label="Filtrar por origen del evento"
            >
              <option value="">Todos los orígenes</option>
              {ORIGENES_EVENTO.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          {/* Fila 3: Botones */}
          <div className="flex gap-3">
            <button
              onClick={aplicarFiltros}
              className="btn-primary"
              aria-label="Aplicar filtros seleccionados"
            >
              <i className="fa-solid fa-filter" aria-hidden="true" /> Aplicar filtros
            </button>
            {hayFiltrosActivos && (
              <button
                onClick={limpiarFiltros}
                className="btn-ghost text-red-500 hover:bg-red-50"
                aria-label="Limpiar todos los filtros"
              >
                <i className="fa-solid fa-filter-circle-xmark" aria-hidden="true" /> Limpiar filtros
              </button>
            )}
            <button
              onClick={cargarDatos}
              className="btn-ghost ml-auto"
              title="Actualizar datos"
              aria-label="Actualizar datos del dashboard"
              disabled={loading}
            >
              <i className={`fa-solid fa-rotate-right ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Mensaje sin datos */}
      {sinDatos && (
        <div className="card p-8 text-center border-2 border-dashed border-gray-200">
          <i className="fa-solid fa-calendar-xmark text-5xl text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            No se encontraron eventos
          </h3>
          <p className="text-text-secondary mb-4">
            {hayFiltrosActivos
              ? 'Intentá ajustar los filtros para ver resultados.'
              : 'Todavía no hay eventos registrados en el sistema.'}
          </p>
          {hayFiltrosActivos && (
            <button onClick={limpiarFiltros} className="btn-primary">
              <i className="fa-solid fa-filter-circle-xmark" aria-hidden="true" /> Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* Cards KPI */}
      {!sinDatos && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPI
            label="Total de eventos"
            value={formatearNumero(data.total)}
          />
          <KPI
            label="Total de asistentes"
            value={formatearNumero(data.totalAsistentes)}
          />
          <KPI
            label="Duración media"
            value={`${data.duracionMedia} días`}
          />
        </div>
      )}

      {/* Gráficos - solo si hay datos */}
      {!sinDatos && (
        <>
          {/* Evolución temporal */}
          <div>
            <SectionTitle>Evolución temporal</SectionTitle>
            <div className="space-y-4">
              {/* Gráfico 1: Eventos por mes */}
              <ChartCard title="Eventos por mes" full>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={data.eventosPorMes}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="mes"
                      tick={{ fontSize: 12 }}
                      tickFormatter={formatearMes}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      labelFormatter={formatearMes}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="cantidad"
                      stroke="#db2777"
                      strokeWidth={2}
                      dot={{ fill: '#db2777', r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Eventos"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Gráfico 2: Asistentes por mes */}
              <ChartCard title="Asistentes por mes" full>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={data.asistentesPorMes}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="mes"
                      tick={{ fontSize: 12 }}
                      tickFormatter={formatearMes}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      labelFormatter={formatearMes}
                      formatter={(value: number) => formatearNumero(value)}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="asistentes"
                      stroke="#0ea5e9"
                      strokeWidth={2}
                      dot={{ fill: '#0ea5e9', r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Asistentes"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </div>

          {/* Distribución de eventos */}
          <div>
            <SectionTitle>Distribución de eventos</SectionTitle>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Gráfico 3: % eventos por origen */}
              <ChartCard title="Distribución por origen del evento">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.porcentajesPorOrigen}
                      dataKey="porcentaje"
                      nameKey="nombre"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      label={(entry) => `${entry.porcentaje}%`}
                      labelLine={false}
                    >
                      {data.porcentajesPorOrigen.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORES_PIE[index % COLORES_PIE.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string, props: any) => [
                        `${value}% (${props.payload.cantidad} eventos)`,
                        name
                      ]}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value, entry: any) => `${value} (${entry.payload.cantidad})`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Gráfico 4: % eventos por tipo */}
              <ChartCard title="Distribución por tipo de evento">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.porcentajesPorTipo}
                      dataKey="porcentaje"
                      nameKey="nombre"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      label={(entry) => `${entry.porcentaje}%`}
                      labelLine={false}
                    >
                      {data.porcentajesPorTipo.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORES_PIE[index % COLORES_PIE.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string, props: any) => [
                        `${value}% (${props.payload.cantidad} eventos)`,
                        name
                      ]}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value, entry: any) => `${value} (${entry.payload.cantidad})`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </div>

          {/* Duración promedio */}
          <div>
            <SectionTitle>Duración promedio de eventos</SectionTitle>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Gráfico 5: Duración por tipo */}
              <ChartCard title="Duración promedio por tipo de evento">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={data.duracionPorTipo} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fontSize: 12 }} label={{ value: 'Días', position: 'insideBottom', offset: -5 }} />
                    <YAxis
                      type="category"
                      dataKey="nombre"
                      tick={{ fontSize: 11 }}
                      width={150}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${value} días`, 'Duración promedio']}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="duracion" fill="#f97316" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Gráfico 6: Duración por origen */}
              <ChartCard title="Duración promedio por origen del evento">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={data.duracionPorOrigen} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fontSize: 12 }} label={{ value: 'Días', position: 'insideBottom', offset: -5 }} />
                    <YAxis
                      type="category"
                      dataKey="nombre"
                      tick={{ fontSize: 11 }}
                      width={100}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${value} días`, 'Duración promedio']}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="duracion" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </div>

          {/* Análisis de asistencia */}
          <div>
            <SectionTitle>Análisis de asistencia</SectionTitle>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Gráfico 7: Asistentes por origen */}
              <ChartCard title="Asistentes por origen del evento">
                <ResponsiveContainer width="100%" height={350}>
                  <RadarChart data={data.asistentesPorOrigen}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis
                      dataKey="nombre"
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 'auto']}
                      tick={{ fontSize: 10 }}
                    />
                    <Radar
                      name="Asistentes"
                      dataKey="asistentes"
                      stroke="#db2777"
                      fill="#db2777"
                      fillOpacity={0.6}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatearNumero(value), 'Asistentes']}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Gráfico 8: Asistentes por tipo */}
              <ChartCard title="Asistentes por tipo de evento">
                <ResponsiveContainer width="100%" height={350}>
                  <RadarChart data={data.asistentesPorTipo}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis
                      dataKey="nombre"
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 'auto']}
                      tick={{ fontSize: 10 }}
                    />
                    <Radar
                      name="Asistentes"
                      dataKey="asistentes"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.6}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatearNumero(value), 'Asistentes']}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </div>
        </>
      )}

      {/* Footer informativo */}
      <div className="card p-4 bg-gray-50 border-gray-200">
        <div className="flex items-start gap-3">
          <i className="fa-solid fa-info-circle text-primary text-lg mt-0.5" />
          <div className="text-sm text-text-secondary">
            <p className="font-semibold text-text-primary mb-1">Fuente de datos</p>
            <p>
              Las estadísticas se calculan en base a los eventos registrados en el sistema.
              Los datos se actualizan automáticamente cada 5 minutos.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
