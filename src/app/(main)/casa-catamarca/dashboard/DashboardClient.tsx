'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts'

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface ItemConteo { nombre: string; cantidad: number }

interface DashboardStats {
  total: number
  aniosDisponibles: number[]
  probabilidadPromedio: number | null
  porcentajeInteresadosCapital: number
  porcentajeAceptaInfo: number
  // Procedencia y geografía
  porProcedencia: ItemConteo[]
  porPais: ItemConteo[]
  porProvincia: ItemConteo[]
  porPartidoBsAs: ItemConteo[]
  porBarrioCaba: ItemConteo[]
  // Distribuciones
  porRangoEdad: ItemConteo[]
  porViajeCon: ItemConteo[]
  porDuracionViaje: ItemConteo[]
  porEtapaViaje: ItemConteo[]
  porConociaCatamarca: ItemConteo[]
  porInteresCapital: ItemConteo[]
  porDiasEnCapital: ItemConteo[]
  porAceptaInfo: ItemConteo[]
  // Multi-respuesta
  interesesEnCatamarca: ItemConteo[]
  actividadesCapital: ItemConteo[]
  dondeBuscaInfo: ItemConteo[]
  comoSeEntero: ItemConteo[]
  redSocialInspiracion: ItemConteo[]
  // Top textos
  topLugaresImperdibles: Array<{ texto: string; count: number }>
}

// ─── Constantes ─────────────────────────────────────────────────────────────

const ANIO_ACTUAL = new Date().getFullYear()

const COLORES_PIE = ['#db2777', '#f97316', '#0ea5e9', '#10b981', '#8b5cf6', '#6b7280', '#f59e0b', '#ef4444']

// ─── Sub-componentes ────────────────────────────────────────────────────────

function KPI({ label, value, sub }: { label: string; value: string; sub?: string }) {
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

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <p className="text-sm font-semibold text-text-primary mb-4">{title}</p>
      {children}
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-40 text-text-secondary text-sm">
      Sin datos en este rango
    </div>
  )
}

/** Barras horizontales genéricas */
function BarH({ data, color = '#db2777', unit = '' }: {
  data: ItemConteo[]; color?: string; unit?: string
}) {
  if (!data || data.length === 0) return <EmptyChart />
  const height = Math.max(180, data.length * 30)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 48, top: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="nombre" tick={{ fontSize: 10 }} width={130} />
        <Tooltip formatter={(v: number) => [v.toLocaleString('es-AR'), '']} />
        <Bar dataKey="cantidad" fill={color} radius={[0, 4, 4, 0]}
          label={{ position: 'right', fontSize: 10,
            formatter: (v: number) => unit ? `${v}${unit}` : v.toLocaleString('es-AR')
          }}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Torta simple */
function PieG({ data, colors = COLORES_PIE }: { data: { name: string; value: number }[]; colors?: string[] }) {
  if (!data || data.length === 0) return <EmptyChart />
  const dataPos = data.filter(d => d.value > 0)
  if (dataPos.length === 0) return <EmptyChart />

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={dataPos}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
          label={({ name, value, percent }) => {
            const pct = Math.round(percent * 100)
            return pct >= 5 ? `${name}: ${pct}%` : ''
          }}
          labelLine={false}
        >
          {dataPos.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number) => [v.toLocaleString('es-AR'), '']} />
      </PieChart>
    </ResponsiveContainer>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────

export function DashboardClient() {
  const [data, setData] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fechaDesde, setFechaDesde] = useState(`${ANIO_ACTUAL}-01-01`)
  const [fechaHasta, setFechaHasta] = useState(`${ANIO_ACTUAL}-12-31`)
  const [yearFilter, setYearFilter] = useState(ANIO_ACTUAL)

  const fetchStats = useCallback(async (desde: string, hasta: string) => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (desde) params.set('fechaDesde', desde)
      if (hasta) params.set('fechaHasta', hasta)

      const res = await fetch(`/api/casa-catamarca/dashboard?${params}`)
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setError('Acceso restringido. Solicitá autorización al Observatorio.')
          return
        }
        throw new Error(`Error ${res.status}`)
      }
      const json = await res.json()
      if (json.error) { setError(json.error); return }
      setData(json)
    } catch (err: any) {
      setError(err.message || 'Error al cargar estadísticas')
    } finally {
      setLoading(false)
    }
  }, [])

  // Carga inicial
  useEffect(() => {
    fetchStats(fechaDesde, fechaHasta)
  }, [])

  // Cambio de año rápido
  function setYear(y: number) {
    setYearFilter(y)
    const desde = `${y}-01-01`
    const hasta = `${y}-12-31`
    setFechaDesde(desde)
    setFechaHasta(hasta)
    fetchStats(desde, hasta)
  }

  function aplicarFiltros() {
    fetchStats(fechaDesde, fechaHasta)
  }

  function limpiarFiltros() {
    setFechaDesde('')
    setFechaHasta('')
    setYearFilter(ANIO_ACTUAL)
    fetchStats('', '')
  }

  function descargarExcel() {
    const params = new URLSearchParams()
    if (fechaDesde) params.set('fechaDesde', fechaDesde)
    if (fechaHasta) params.set('fechaHasta', fechaHasta)
    window.location.href = `/api/casa-catamarca/export?${params}`
  }

  // ── Datos para gráficos (memoizados) ────────────────────────────────────

  const pieProcedencia = useMemo(() =>
    data?.porProcedencia?.map(d => ({ name: d.nombre, value: d.cantidad })) ?? [],
  [data])

  const pieInteresCapital = useMemo(() =>
    data?.porInteresCapital?.map(d => ({ name: d.nombre, value: d.cantidad })) ?? [],
  [data])

  const pieEtapaViaje = useMemo(() =>
    data?.porEtapaViaje?.map(d => ({ name: d.nombre, value: d.cantidad })) ?? [],
  [data])

  const pieViajeCon = useMemo(() =>
    data?.porViajeCon?.map(d => ({ name: d.nombre, value: d.cantidad })) ?? [],
  [data])

  const pieConociaCatamarca = useMemo(() =>
    data?.porConociaCatamarca?.map(d => ({ name: d.nombre, value: d.cantidad })) ?? [],
  [data])

  const pieAceptaInfo = useMemo(() =>
    data?.porAceptaInfo?.map(d => ({ name: d.nombre, value: d.cantidad })) ?? [],
  [data])

  // Datos de años disponibles
  const anios = useMemo(() => {
    const disponibles = data?.aniosDisponibles ?? []
    if (disponibles.length === 0) return [ANIO_ACTUAL]
    return disponibles
  }, [data])

  // ── Loading ────────────────────────────────────────────────────────────
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
        <span className="ml-3 text-gray-500">Cargando estadísticas...</span>
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="card p-6 border-l-4 border-red-400 bg-red-50">
        <p className="text-red-700 flex items-center gap-2">
          <i className="fas fa-exclamation-triangle" /> {error}
        </p>
      </div>
    )
  }

  // ── Dashboard ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="card p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-text-secondary uppercase">Año:</label>
            <div className="flex gap-1">
              {anios.map(y => (
                <button
                  key={y}
                  onClick={() => setYear(y)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border-2 transition-all
                    ${yearFilter === y && fechaDesde.startsWith(String(y))
                      ? 'bg-primary border-primary text-white'
                      : 'bg-white border-gray-200 text-text-secondary hover:border-primary/40'
                    }`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-text-secondary uppercase">Desde:</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={e => setFechaDesde(e.target.value)}
              className="input text-sm w-40"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-text-secondary uppercase">Hasta:</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={e => setFechaHasta(e.target.value)}
              className="input text-sm w-40"
            />
          </div>

          <button onClick={aplicarFiltros} className="btn-primary px-4 py-2 text-sm">
            <i className="fa-solid fa-filter mr-1.5" />
            Aplicar
          </button>

          <button onClick={limpiarFiltros} className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            Limpiar
          </button>

          <button onClick={descargarExcel} className="btn-primary px-4 py-2 text-sm ml-auto">
            <i className="fa-solid fa-file-excel mr-1.5" />
            Descargar Excel
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI
          label="Total encuestas"
          value={data?.total?.toLocaleString('es-AR') ?? '0'}
          sub="En el período seleccionado"
        />
        <KPI
          label="Prob. de viaje (prom.)"
          value={data?.probabilidadPromedio != null ? `${data.probabilidadPromedio}/10` : '—'}
          sub="Escala 1 a 10"
        />
        <KPI
          label="Interés en capital"
          value={data?.porcentajeInteresadosCapital != null ? `${data.porcentajeInteresadosCapital}%` : '—'}
          sub="% que respondió SÍ"
        />
        <KPI
          label="Aceptan info turística"
          value={data?.porcentajeAceptaInfo != null ? `${data.porcentajeAceptaInfo}%` : '—'}
          sub="% que dejó email"
        />
      </div>

      {/* Sin datos */}
      {(!data || data.total === 0) && (
        <div className="card p-12 text-center">
          <i className="fa-solid fa-chart-bar text-4xl text-gray-300 mb-3 block" />
          <p className="text-gray-500 text-lg">Sin datos en este rango</p>
          <p className="text-gray-400 text-sm mt-1">Probá con otro período o cargá la primera encuesta.</p>
        </div>
      )}

      {data && data.total > 0 && (
        <>
          {/* Procedencia */}
          <SectionTitle>Procedencia y origen geográfico</SectionTitle>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Procedencia">
              <PieG data={pieProcedencia} />
            </ChartCard>
            <ChartCard title="Top provincias de origen (NACIONAL)">
              <BarH data={data.porProvincia.slice(0, 10)} color="#f97316" />
            </ChartCard>
            {data.porPartidoBsAs.length > 0 && (
              <ChartCard title="Top partidos de Buenos Aires">
                <BarH data={data.porPartidoBsAs.slice(0, 12)} color="#0ea5e9" />
              </ChartCard>
            )}
            {data.porBarrioCaba.length > 0 && (
              <ChartCard title="Top barrios de CABA">
                <BarH data={data.porBarrioCaba.slice(0, 12)} color="#10b981" />
              </ChartCard>
            )}
            <ChartCard title="Top países (INTERNACIONAL)">
              <BarH data={data.porPais.slice(0, 10)} color="#8b5cf6" />
            </ChartCard>
          </div>

          {/* Perfil del visitante */}
          <SectionTitle>Perfil del potencial visitante</SectionTitle>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Rango de edad">
              <BarH data={data.porRangoEdad} color="#db2777" />
            </ChartCard>
            <ChartCard title="Etapa del viaje">
              <PieG data={pieEtapaViaje} />
            </ChartCard>
            <ChartCard title="¿Con quién viajaría?">
              <PieG data={pieViajeCon} />
            </ChartCard>
            <ChartCard title="Duración del viaje">
              <BarH data={data.porDuracionViaje} color="#f97316" />
            </ChartCard>
            <ChartCard title="¿Conocía Catamarca antes?">
              <PieG data={pieConociaCatamarca} />
            </ChartCard>
          </div>

          {/* Enfoque capital */}
          <SectionTitle>Enfoque en la capital</SectionTitle>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="¿Le interesa visitar la capital?">
              <PieG data={pieInteresCapital} />
            </ChartCard>
            <ChartCard title="Días que se quedaría en la capital">
              <BarH data={data.porDiasEnCapital} color="#10b981" />
            </ChartCard>
            <ChartCard title="Actividades en la capital (múltiple)">
              <BarH data={data.actividadesCapital.slice(0, 9)} color="#0ea5e9" />
            </ChartCard>
          </div>

          {/* Multi-respuesta */}
          <SectionTitle>Intereses, información y decisión</SectionTitle>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Intereses en Catamarca (respuesta múltiple)">
              <BarH data={data.interesesEnCatamarca.slice(0, 8)} color="#db2777" />
            </ChartCard>
            <ChartCard title="¿Cómo se enteró de Catamarca?">
              <BarH data={data.comoSeEntero.slice(0, 8)} color="#8b5cf6" />
            </ChartCard>
            <ChartCard title="¿Dónde busca info de viajes? (múltiple)">
              <BarH data={data.dondeBuscaInfo.slice(0, 9)} color="#f97316" />
            </ChartCard>
            <ChartCard title="Red social de inspiración">
              <BarH data={data.redSocialInspiracion.slice(0, 5)} color="#10b981" />
            </ChartCard>
            <ChartCard title="¿Acepta recibir info turística?">
              <PieG data={pieAceptaInfo} />
            </ChartCard>
          </div>

          {/* Top textos libres */}
          {data.topLugaresImperdibles && data.topLugaresImperdibles.length > 0 && (
            <>
              <SectionTitle>Lugares que querrían conocer (top menciones)</SectionTitle>
              <div className="card p-5">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-200">
                      <tr className="text-left text-gray-500 text-xs uppercase tracking-wide">
                        <th className="pb-2 font-medium w-12">#</th>
                        <th className="pb-2 font-medium">Lugar</th>
                        <th className="pb-2 font-medium text-right">Menciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topLugaresImperdibles.map((item, i) => (
                        <tr key={item.texto} className="border-b border-gray-50">
                          <td className="py-2 text-gray-400 text-xs">{i + 1}</td>
                          <td className="py-2 text-gray-800">{item.texto}</td>
                          <td className="py-2 text-right font-semibold text-gray-700">{item.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
