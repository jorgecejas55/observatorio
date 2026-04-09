'use client'

import Link from 'next/link'
import { useEffect, useState, useMemo } from 'react'
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────

interface IndicadorMensual {
  ano: number; mes: string
  oh: number; oh_var_mensual: number | null; oh_var_anual: number | null
  estadia_prom: number; estadia_var_mensual: number | null; estadia_var_anual: number | null
}

interface DatosAPI {
  success: boolean
  ultimo: IndicadorMensual
  promedios2024: { oh: number; estadia: number; meses: number }
  promedios2025: { oh: number; estadia: number; meses: number }
  promedios2026?: { oh: number; estadia: number; meses: number }
  historico: IndicadorMensual[]
  total_registros: number
}

interface IndicadorFinde {
  ano: number; mes: string; evento: string
  oh: number; estadia_prom: number; visitantes: number
}

interface DatosAPIFindes {
  success: boolean
  historico: IndicadorFinde[]
  resumen2024: { promedio_oh: number; total_visitantes: number; cantidad_findes: number }
  resumen2025: { promedio_oh: number; total_visitantes: number; cantidad_findes: number }
  resumen2026?: { promedio_oh: number; total_visitantes: number; cantidad_findes: number }
}

interface IndicadorAtractivo {
  ano: number; mes: string
  casa_puna: number; pueblo_perdido: number; casa_sfvc: number
  casa_caravati: number; museo_virgen: number; museo_quiroga: number
}

type TabType = 'mensual' | 'findes' | 'atractivos'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COLORES_ATRACTIVOS = ['#00b5db', '#ffd51f', '#e6007e', '#f49534', '#002454', '#4ade80']

const NOMBRES_ATRACTIVOS = [
  'Casa de la Puna', 'Pueblo Perdido', 'Casa SFVC',
  'Casa Caravatí', 'Museo Virgen', 'Museo A. Quiroga',
] as const

function filtrarPorAno<T extends { ano: number }>(lista: T[], ano: string): T[] {
  return ano === 'todos' ? lista : lista.filter(d => d.ano === parseInt(ano))
}

function Variacion({ valor }: { valor: number | null }) {
  if (valor === null) return null
  const pos = valor >= 0
  return (
    <div className={`mt-2 flex items-center gap-1.5 text-sm ${pos ? 'text-green-600' : 'text-red-600'}`}>
      <span className="flex items-center justify-center rounded-full bg-current/10 px-1.5 py-0.5 text-xs font-medium">
        {pos ? '↑' : '↓'} {Math.abs(valor).toFixed(1)}%
      </span>
      <span className="text-xs text-text-secondary">vs mes anterior</span>
    </div>
  )
}

function SelectAno({ value, onChange, anos }: {
  value: string; onChange: (v: string) => void; anos: number[]
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-text-secondary">Año:</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="input bg-white w-auto text-sm py-1.5"
      >
        <option value="todos">Todos los años</option>
        {anos.map(ano => <option key={ano} value={ano}>{ano}</option>)}
      </select>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [datos, setDatos] = useState<DatosAPI | null>(null)
  const [datosFindes, setDatosFindes] = useState<DatosAPIFindes | null>(null)
  const [datosAtractivos, setDatosAtractivos] = useState<{ historico: IndicadorAtractivo[] } | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('mensual')

  // Filtros — Mensual
  const [anoGraficoOH, setAnoGraficoOH] = useState('todos')
  const [anoGraficoEstadia, setAnoGraficoEstadia] = useState('todos')
  const [anoTabla, setAnoTabla] = useState('todos')

  // Filtros — Findes
  const [anoFindes, setAnoFindes] = useState('todos')
  const [anoGraficoFindesOH, setAnoGraficoFindesOH] = useState('todos')
  const [anoGraficoFindesEstadia, setAnoGraficoFindesEstadia] = useState('todos')

  // Filtros — Atractivos
  const [anoAtractivosChart, setAnoAtractivosChart] = useState('todos')
  const [anoAtractivosTable, setAnoAtractivosTable] = useState('todos')

  useEffect(() => {
    const controller = new AbortController()

    const cargar = async () => {
      try {
        setCargando(true)
        const [resMensual, resFindes, resAtractivos] = await Promise.all([
          fetch('/api/indicadores', { signal: controller.signal }),
          fetch('/api/indicadores/findes', { signal: controller.signal }),
          fetch('/api/indicadores/atractivos', { signal: controller.signal }),
        ])
        const [dataMensual, dataFindes, dataAtractivos] = await Promise.all([
          resMensual.json(),
          resFindes.json(),
          resAtractivos.json(),
        ])
        if (dataMensual.success) setDatos(dataMensual)
        if (dataFindes.success) setDatosFindes(dataFindes)
        if (dataAtractivos.success) setDatosAtractivos(dataAtractivos)
        setError(null)
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setError('No se pudieron cargar los datos')
          console.error(err)
        }
      } finally {
        setCargando(false)
      }
    }

    cargar()
    const intervalo = setInterval(cargar, 300000)

    return () => {
      controller.abort()
      clearInterval(intervalo)
    }
  }, [])

  // ── Años disponibles ─────────────────────────────────────────────────────

  const anosDisponibles = useMemo(() =>
    datos ? [...new Set(datos.historico.map(d => d.ano))].sort() as number[] : []
  , [datos])

  const anosFindesDisponibles = useMemo(() =>
    datosFindes ? [...new Set(datosFindes.historico.map(d => d.ano))].sort() as number[] : []
  , [datosFindes])

  const anosAtractivosDisponibles = useMemo(() =>
    datosAtractivos ? [...new Set(datosAtractivos.historico.map(d => d.ano))].sort() as number[] : []
  , [datosAtractivos])

  // ── Datos derivados — Mensual ────────────────────────────────────────────

  const ohChartData = useMemo(() =>
    filtrarPorAno(datos?.historico ?? [], anoGraficoOH)
      .map(d => ({ label: `${d.mes.substring(0, 3)} ${d.ano}`, oh: d.oh }))
  , [datos, anoGraficoOH])

  const estadiaChartData = useMemo(() =>
    filtrarPorAno(datos?.historico ?? [], anoGraficoEstadia)
      .map(d => ({ label: `${d.mes.substring(0, 3)} ${d.ano}`, estadia: d.estadia_prom }))
  , [datos, anoGraficoEstadia])

  const tablaData = useMemo(() =>
    [...filtrarPorAno(datos?.historico ?? [], anoTabla)]
      .sort((a, b) => {
        if (b.ano !== a.ano) return b.ano - a.ano
        const ordenMeses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE']
        return ordenMeses.indexOf(b.mes) - ordenMeses.indexOf(a.mes)
      })
      .slice(0, 12)
  , [datos, anoTabla])

  // ── Datos derivados — Findes ──────────────────────────────────────────────

  const findesOHData = useMemo(() =>
    filtrarPorAno(datosFindes?.historico ?? [], anoGraficoFindesOH)
      .map(d => ({ label: `${d.evento} (${d.ano})`, oh: d.oh }))
  , [datosFindes, anoGraficoFindesOH])

  const findesEstadiaData = useMemo(() =>
    filtrarPorAno(datosFindes?.historico ?? [], anoGraficoFindesEstadia)
      .map(d => ({ label: `${d.evento} (${d.ano})`, estadia: d.estadia_prom }))
  , [datosFindes, anoGraficoFindesEstadia])

  const findesTablaData = useMemo(() =>
    [...filtrarPorAno(datosFindes?.historico ?? [], anoFindes)]
      .sort((a, b) => b.ano - a.ano)
  , [datosFindes, anoFindes])

  // ── Datos derivados — Atractivos ─────────────────────────────────────────

  const atractivosChartData = useMemo(() =>
    filtrarPorAno(datosAtractivos?.historico ?? [], anoAtractivosChart)
      .map(d => ({
        label: `${d.mes.substring(0, 3)} ${d.ano}`,
        'Casa de la Puna': d.casa_puna,
        'Pueblo Perdido': d.pueblo_perdido,
        'Casa SFVC': d.casa_sfvc,
        'Casa Caravatí': d.casa_caravati,
        'Museo Virgen': d.museo_virgen,
        'Museo A. Quiroga': d.museo_quiroga,
      }))
  , [datosAtractivos, anoAtractivosChart])

  const atractivosTablaData = useMemo(() =>
    [...filtrarPorAno(datosAtractivos?.historico ?? [], anoAtractivosTable)].reverse()
  , [datosAtractivos, anoAtractivosTable])

  // ── Loading / error states ───────────────────────────────────────────────

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-text-secondary">
          <i className="fa-solid fa-spinner fa-spin text-3xl text-primary mb-4 block" />
          <p>Cargando indicadores...</p>
        </div>
      </div>
    )
  }

  if (error || !datos) {
    return (
      <div className="card p-8 text-center">
        <i className="fa-solid fa-triangle-exclamation text-red-500 text-3xl mb-4 block" />
        <p className="text-red-700 font-medium">{error || 'Error al cargar datos'}</p>
        <button
          onClick={() => window.location.reload()}
          className="btn-ghost text-primary mt-4 text-sm"
        >
          <i className="fa-solid fa-rotate-right" /> Reintentar
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Encabezado */}
      <div className="mb-6">
        <h2 className="section-title">Indicadores Turísticos</h2>
        <p className="text-text-secondary text-sm -mt-6">
          Observatorio de Turismo Municipal - SFVC —
          Datos actualizados: {datos.ultimo.mes} {datos.ultimo.ano}
        </p>
      </div>

      {/* Acceso rápido — Perfil del Visitante */}
      <Link
        href="/estadisticas/perfil-visitante"
        className="flex items-center justify-between gap-4 card p-4 mb-6 hover:border-primary/30 hover:shadow-md transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <i className="fa-solid fa-chart-bar text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary group-hover:text-primary transition-colors">
              Perfil del Visitante
            </p>
            <p className="text-xs text-text-secondary">
              Encuesta permanente · origen, motivos, alojamiento, valoraciones
            </p>
          </div>
        </div>
        <i className="fa-solid fa-arrow-right text-text-secondary group-hover:text-primary group-hover:translate-x-1 transition-all text-sm flex-shrink-0" />
      </Link>

      {/* Pestañas */}
      <div className="mb-6 flex gap-1 border-b border-gray-200 overflow-x-auto">
        {([
          ['mensual', 'Indicadores Mensuales'],
          ['findes', 'Fines de Semana Largos'],
          ['atractivos', 'Atractivos Turísticos'],
        ] as [TabType, string][]).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 px-4 text-sm font-medium transition-all border-b-2 -mb-px whitespace-nowrap flex-shrink-0 ${activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-primary'
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── PESTAÑA: MENSUAL ──────────────────────────────────────────────── */}
      {activeTab === 'mensual' && (
        <>
          {/* KPI Cards */}
          <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${datos.promedios2026?.meses > 0 ? 'xl:grid-cols-5' : 'xl:grid-cols-4'} mb-6`}>
            <div className="card p-5 md:p-6">
              <div className="flex items-end justify-between">
                <div>
                  <span className="text-sm text-text-secondary">Ocupación Hotelera</span>
                  <h4 className="mt-2 text-2xl font-bold text-text-primary">
                    {datos.ultimo.oh.toFixed(1)}%
                  </h4>
                  <Variacion valor={datos.ultimo.oh_var_mensual} />
                </div>
                <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl">
                  <i className="fa-solid fa-bed text-primary text-xl" />
                </div>
              </div>
            </div>

            <div className="card p-5 md:p-6">
              <div className="flex items-end justify-between">
                <div>
                  <span className="text-sm text-text-secondary">Estadía Promedio</span>
                  <h4 className="mt-2 text-2xl font-bold text-text-primary">
                    {datos.ultimo.estadia_prom.toFixed(1)} días
                  </h4>
                  <Variacion valor={datos.ultimo.estadia_var_mensual} />
                </div>
                <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl">
                  <i className="fa-solid fa-moon text-orange-500 text-xl" />
                </div>
              </div>
            </div>

            <div className="card p-5 md:p-6">
              <div className="flex items-end justify-between">
                <div>
                  <span className="text-sm text-text-secondary">Promedio OH 2024</span>
                  <h4 className="mt-2 text-2xl font-bold text-text-primary">
                    {datos.promedios2024.oh.toFixed(1)}%
                  </h4>
                  <div className="mt-2 flex flex-col gap-0.5">
                    <span className="text-xs text-text-secondary">
                      Estadía: {datos.promedios2024.estadia.toFixed(1)} días
                    </span>
                    <span className="text-xs text-gray-400">
                      ({datos.promedios2024.meses} meses)
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl">
                  <i className="fa-solid fa-chart-line text-accent text-xl" />
                </div>
              </div>
            </div>

            <div className="card p-5 md:p-6">
              <div className="flex items-end justify-between">
                <div>
                  <span className="text-sm text-text-secondary">Promedio OH 2025</span>
                  <h4 className="mt-2 text-2xl font-bold text-text-primary">
                    {datos.promedios2025.oh.toFixed(1)}%
                  </h4>
                  <div className="mt-2 flex flex-col gap-0.5">
                    <span className="text-xs text-text-secondary">
                      Estadía: {datos.promedios2025.estadia.toFixed(1)} días
                    </span>
                    <span className="text-xs text-gray-400">
                      ({datos.promedios2025.meses} meses acumulados)
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl">
                  <i className="fa-solid fa-chart-line text-green-600 text-xl" />
                </div>
              </div>
            </div>

            {datos.promedios2026 && datos.promedios2026.meses > 0 && (
              <div className="card p-5 md:p-6">
                <div className="flex items-end justify-between">
                  <div>
                    <span className="text-sm text-text-secondary">Promedio OH 2026</span>
                    <h4 className="mt-2 text-2xl font-bold text-text-primary">
                      {datos.promedios2026.oh.toFixed(1)}%
                    </h4>
                    <div className="mt-2 flex flex-col gap-0.5">
                      <span className="text-xs text-text-secondary">
                        Estadía: {datos.promedios2026.estadia.toFixed(1)} días
                      </span>
                      <span className="text-xs text-gray-400">
                        ({datos.promedios2026.meses} meses acumulados)
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl">
                    <i className="fa-solid fa-chart-line text-blue-600 text-xl" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Gráfico OH% */}
          <div className="card p-5 md:p-6 mb-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
              <h3 className="text-lg font-semibold text-text-primary">Evolución Ocupación Hotelera</h3>
              <SelectAno value={anoGraficoOH} onChange={setAnoGraficoOH} anos={anosDisponibles} />
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={ohChartData} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
                  <defs>
                    <linearGradient id="gradOH" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e6007e" stopOpacity={0.7} />
                      <stop offset="95%" stopColor="#e6007e" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="#E5E7EB" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B7280' }} angle={-45} textAnchor="end" height={70} interval={0} />
                  <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} unit="%" domain={[0, 100]} />
                  <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, 'Ocupación Hotelera']} contentStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="oh" stroke="#e6007e" strokeWidth={2} fill="url(#gradOH)" dot={false} activeDot={{ r: 4 }} name="Ocupación Hotelera" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico Estadía */}
          <div className="card p-5 md:p-6 mb-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
              <h3 className="text-lg font-semibold text-text-primary">Evolución Estadía Promedio</h3>
              <SelectAno value={anoGraficoEstadia} onChange={setAnoGraficoEstadia} anos={anosDisponibles} />
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={estadiaChartData} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
                  <defs>
                    <linearGradient id="gradEstadia" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00b5db" stopOpacity={0.7} />
                      <stop offset="95%" stopColor="#00b5db" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="#E5E7EB" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B7280' }} angle={-45} textAnchor="end" height={70} interval={0} />
                  <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
                  <Tooltip formatter={(v: number) => [`${v.toFixed(1)} días`, 'Estadía Promedio']} contentStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="estadia" stroke="#00b5db" strokeWidth={2} fill="url(#gradEstadia)" dot={false} activeDot={{ r: 4 }} name="Estadía Promedio" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabla datos mensuales */}
          <div className="card p-5 md:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
              <h3 className="text-lg font-semibold text-text-primary">Datos Mensuales</h3>
              <SelectAno value={anoTabla} onChange={setAnoTabla} anos={anosDisponibles} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full table-auto text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left border-y border-gray-200">
                    <th className="px-4 py-3 font-medium text-text-secondary">Período</th>
                    <th className="px-4 py-3 font-medium text-text-secondary">OH %</th>
                    <th className="px-4 py-3 font-medium text-text-secondary">Var. Mensual OH</th>
                    <th className="px-4 py-3 font-medium text-text-secondary">Estadía (días)</th>
                    <th className="px-4 py-3 font-medium text-text-secondary">Var. Mensual Estadía</th>
                  </tr>
                </thead>
                <tbody>
                  {tablaData.map((item, i) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">{item.mes} {item.ano}</td>
                      <td className="px-4 py-3">{item.oh.toFixed(1)}%</td>
                      <td className={`px-4 py-3 font-semibold ${item.oh_var_mensual === null ? '' : item.oh_var_mensual >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {item.oh_var_mensual !== null
                          ? `${item.oh_var_mensual >= 0 ? '+' : ''}${item.oh_var_mensual.toFixed(1)}%`
                          : '—'}
                      </td>
                      <td className="px-4 py-3">{item.estadia_prom.toFixed(1)} días</td>
                      <td className={`px-4 py-3 font-semibold ${item.estadia_var_mensual === null ? '' : item.estadia_var_mensual >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {item.estadia_var_mensual !== null
                          ? `${item.estadia_var_mensual >= 0 ? '+' : ''}${item.estadia_var_mensual.toFixed(1)}%`
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── PESTAÑA: FINDES ───────────────────────────────────────────────── */}
      {activeTab === 'findes' && (
        datosFindes ? (
          <>
            {/* Summary cards */}
            <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${datosFindes.resumen2026?.cantidad_findes > 0 ? 'lg:grid-cols-3' : ''} mb-6`}>
              <div className="card p-5 md:p-6">
                <span className="text-sm text-text-secondary">Promedio OH 2024</span>
                <h4 className="mt-2 text-2xl font-bold text-text-primary">
                  {datosFindes.resumen2024.promedio_oh.toFixed(1)}%
                </h4>
                <div className="mt-2 flex flex-col gap-0.5">
                  <span className="text-xs text-text-secondary">
                    {datosFindes.resumen2024.cantidad_findes} Fines de Semana y Eventos
                  </span>
                  <span className="text-xs text-gray-400">
                    Total Visitantes: {datosFindes.resumen2024.total_visitantes.toLocaleString('es-AR')}
                  </span>
                </div>
              </div>
              <div className="card p-5 md:p-6">
                <span className="text-sm text-text-secondary">Promedio OH 2025</span>
                <h4 className="mt-2 text-2xl font-bold text-text-primary">
                  {datosFindes.resumen2025.promedio_oh.toFixed(1)}%
                </h4>
                <div className="mt-2 flex flex-col gap-0.5">
                  <span className="text-xs text-text-secondary">
                    {datosFindes.resumen2025.cantidad_findes} Fines de Semana y Eventos
                  </span>
                  <span className="text-xs text-gray-400">
                    Total Visitantes: {datosFindes.resumen2025.total_visitantes.toLocaleString('es-AR')}
                  </span>
                </div>
              </div>
              {datosFindes.resumen2026 && datosFindes.resumen2026.cantidad_findes > 0 && (
                <div className="card p-5 md:p-6">
                  <span className="text-sm text-text-secondary">Promedio OH 2026</span>
                  <h4 className="mt-2 text-2xl font-bold text-text-primary">
                    {datosFindes.resumen2026.promedio_oh.toFixed(1)}%
                  </h4>
                  <div className="mt-2 flex flex-col gap-0.5">
                    <span className="text-xs text-text-secondary">
                      {datosFindes.resumen2026.cantidad_findes} Fines de Semana y Eventos
                    </span>
                    <span className="text-xs text-gray-400">
                      Total Visitantes: {datosFindes.resumen2026.total_visitantes.toLocaleString('es-AR')}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Gráfico OH findes */}
            <div className="card p-5 md:p-6 mb-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                <h3 className="text-lg font-semibold text-text-primary">Ocupación por Finde XL</h3>
                <SelectAno value={anoGraficoFindesOH} onChange={setAnoGraficoFindesOH} anos={anosFindesDisponibles} />
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={findesOHData} margin={{ top: 10, right: 10, left: 0, bottom: 90 }}>
                    <defs>
                      <linearGradient id="gradFindesOH" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#e6007e" stopOpacity={0.7} />
                        <stop offset="95%" stopColor="#e6007e" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="#E5E7EB" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6B7280' }} angle={-45} textAnchor="end" height={100} interval={0} />
                    <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} unit="%" domain={[0, 100]} />
                    <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, 'Ocupación']} contentStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="oh" stroke="#e6007e" strokeWidth={2} fill="url(#gradFindesOH)" dot={{ r: 4 }} activeDot={{ r: 5 }} name="Ocupación" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico estadía findes */}
            <div className="card p-5 md:p-6 mb-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                <h3 className="text-lg font-semibold text-text-primary">Estadía Promedio por Finde XL</h3>
                <SelectAno value={anoGraficoFindesEstadia} onChange={setAnoGraficoFindesEstadia} anos={anosFindesDisponibles} />
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={findesEstadiaData} margin={{ top: 10, right: 10, left: 0, bottom: 90 }}>
                    <defs>
                      <linearGradient id="gradFindesEstadia" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00b5db" stopOpacity={0.7} />
                        <stop offset="95%" stopColor="#00b5db" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="#E5E7EB" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6B7280' }} angle={-45} textAnchor="end" height={100} interval={0} />
                    <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
                    <Tooltip formatter={(v: number) => [`${v.toFixed(1)} días`, 'Estadía']} contentStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="estadia" stroke="#00b5db" strokeWidth={2} fill="url(#gradFindesEstadia)" dot={{ r: 4 }} activeDot={{ r: 5 }} name="Estadía" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tabla findes */}
            <div className="card p-5 md:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                <h3 className="text-lg font-semibold text-text-primary">Histórico Fines de Semana Largos</h3>
                <SelectAno value={anoFindes} onChange={setAnoFindes} anos={anosFindesDisponibles} />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full table-auto text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left border-y border-gray-200">
                      <th className="px-4 py-3 font-medium text-text-secondary">Evento</th>
                      <th className="px-4 py-3 font-medium text-text-secondary">Año</th>
                      <th className="px-4 py-3 font-medium text-text-secondary">OH %</th>
                      <th className="px-4 py-3 font-medium text-text-secondary">Estadía</th>
                      <th className="px-4 py-3 font-medium text-text-secondary">Visitantes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {findesTablaData.map((item, i) => (
                      <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-text-primary">
                          {item.evento}
                          <span className="block text-xs text-text-secondary font-normal">{item.mes}</span>
                        </td>
                        <td className="px-4 py-3">{item.ano}</td>
                        <td className="px-4 py-3 text-primary font-bold">{item.oh.toFixed(1)}%</td>
                        <td className="px-4 py-3">{item.estadia_prom.toFixed(1)} días</td>
                        <td className="px-4 py-3">{item.visitantes.toLocaleString('es-AR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="card p-8 text-center text-text-secondary">
            <i className="fa-solid fa-circle-exclamation text-2xl mb-3 block" />
            No hay datos de fines de semana disponibles
          </div>
        )
      )}

      {/* ── PESTAÑA: ATRACTIVOS ───────────────────────────────────────────── */}
      {activeTab === 'atractivos' && (
        datosAtractivos ? (
          <>
            {/* Gráfico líneas multi-serie */}
            <div className="card p-5 md:p-6 mb-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                <h3 className="text-lg font-semibold text-text-primary">Evolución de Visitantes por Atractivo</h3>
                <SelectAno value={anoAtractivosChart} onChange={setAnoAtractivosChart} anos={anosAtractivosDisponibles} />
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={atractivosChartData} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="4 4" stroke="#E5E7EB" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B7280' }} angle={-45} textAnchor="end" height={70} interval={0} />
                    <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    {NOMBRES_ATRACTIVOS.map((nombre, i) => (
                      <Line
                        key={nombre}
                        type="monotone"
                        dataKey={nombre}
                        stroke={COLORES_ATRACTIVOS[i]}
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tabla atractivos */}
            <div className="card p-5 md:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                <h3 className="text-lg font-semibold text-text-primary">Datos Mensuales de Atractivos</h3>
                <SelectAno value={anoAtractivosTable} onChange={setAnoAtractivosTable} anos={anosAtractivosDisponibles} />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full table-auto text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left border-y border-gray-200">
                      <th className="px-3 py-3 font-medium text-text-secondary">Período</th>
                      <th className="px-2 py-3 font-medium text-text-secondary">Casa de la Puna</th>
                      <th className="px-2 py-3 font-medium text-text-secondary">Pueblo Perdido</th>
                      <th className="px-2 py-3 font-medium text-text-secondary">Casa SFVC</th>
                      <th className="px-2 py-3 font-medium text-text-secondary">Casa Caravati</th>
                      <th className="px-2 py-3 font-medium text-text-secondary">Museo Virgen</th>
                      <th className="px-2 py-3 font-medium text-text-secondary">Museo A.Q.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {atractivosTablaData.map((item, i) => (
                      <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-3 py-3 font-medium">{item.mes} {item.ano}</td>
                        <td className="px-2 py-3">{item.casa_puna.toLocaleString('es-AR')}</td>
                        <td className="px-2 py-3">{item.pueblo_perdido.toLocaleString('es-AR')}</td>
                        <td className="px-2 py-3">{item.casa_sfvc.toLocaleString('es-AR')}</td>
                        <td className="px-2 py-3">{item.casa_caravati.toLocaleString('es-AR')}</td>
                        <td className="px-2 py-3">{item.museo_virgen.toLocaleString('es-AR')}</td>
                        <td className="px-2 py-3">{item.museo_quiroga.toLocaleString('es-AR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="card p-8 text-center text-text-secondary">
            <i className="fa-solid fa-circle-exclamation text-2xl mb-3 block" />
            No hay datos de atractivos disponibles
          </div>
        )
      )}
    </div>
  )
}
