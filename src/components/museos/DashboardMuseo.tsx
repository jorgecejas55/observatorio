'use client'

import React, { useState, useMemo, useCallback } from 'react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface VisitaOcasional {
  id?: string
  Fecha: string
  'Procedencia '?: string
  'Lugar de procedencia '?: string
  'Total de personas': number
  motivo_visita?: string
  canal_difusion?: string
}

interface VisitaInstitucional {
  id?: string
  fecha_visita: string
  procedencia_institucion: string
  tipo_institucion: string
  subtipo_institucion: string
  nombre_institucion: string
  cantidad_asistentes: number
}

interface DashboardMuseoProps {
  ocasionales: VisitaOcasional[]
  institucionales: VisitaInstitucional[]
}

const COLORS_PIE = ['#db2777', '#f97316', '#0ea5e9', '#10b981', '#8b5cf6', '#6b7280']

// ── Componente SelectAno ──────────────────────────────────────────────────
function SelectAno({ value, onChange, anos }: {
  value: string
  onChange: (v: string) => void
  anos: number[]
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

export default function DashboardMuseo({ ocasionales, institucionales }: DashboardMuseoProps) {
  // ── Extraer años disponibles (useMemo) ────────────────────────────────────
  const anosDisponibles = useMemo(() => {
    const anos = new Set<number>()

    ocasionales.forEach(v => {
      if (v.Fecha) {
        const ano = parseInt(v.Fecha.substring(0, 4))
        if (!isNaN(ano)) anos.add(ano)
      }
    })

    institucionales.forEach(v => {
      if (v.fecha_visita) {
        const ano = parseInt(v.fecha_visita.substring(0, 4))
        if (!isNaN(ano)) anos.add(ano)
      }
    })

    return Array.from(anos).sort((a, b) => b - a) // Desc
  }, [ocasionales, institucionales])

  // ── Estado filtros ────────────────────────────────────────────────────────
  const [anoSeleccionado, setAnoSeleccionado] = useState<string>('todos')
  const [fechaDesde, setFechaDesde] = useState<string>('')
  const [fechaHasta, setFechaHasta] = useState<string>('')

  // ── Limpiar filtros (useCallback) ─────────────────────────────────────────
  const limpiarFiltros = useCallback(() => {
    setAnoSeleccionado('todos')
    setFechaDesde('')
    setFechaHasta('')
  }, [])

  // ── Hay filtros activos (useMemo) ─────────────────────────────────────────
  const hayFiltrosActivos = useMemo(() => {
    return anoSeleccionado !== 'todos' || fechaDesde !== '' || fechaHasta !== ''
  }, [anoSeleccionado, fechaDesde, fechaHasta])

  // ── Filtrar datos (useMemo) ───────────────────────────────────────────────
  const ocasionalesFiltradas = useMemo(() => {
    return ocasionales.filter(v => {
      if (!v.Fecha) return false

      // Filtro año
      if (anoSeleccionado !== 'todos') {
        const ano = v.Fecha.substring(0, 4)
        if (ano !== anoSeleccionado) return false
      }

      // Filtro periodo
      if (fechaDesde && v.Fecha < fechaDesde) return false
      if (fechaHasta && v.Fecha > fechaHasta) return false

      return true
    })
  }, [ocasionales, anoSeleccionado, fechaDesde, fechaHasta])

  const institucionalesFiltradas = useMemo(() => {
    return institucionales.filter(v => {
      if (!v.fecha_visita) return false

      // Filtro año
      if (anoSeleccionado !== 'todos') {
        const ano = v.fecha_visita.substring(0, 4)
        if (ano !== anoSeleccionado) return false
      }

      // Filtro periodo
      if (fechaDesde && v.fecha_visita < fechaDesde) return false
      if (fechaHasta && v.fecha_visita > fechaHasta) return false

      return true
    })
  }, [institucionales, anoSeleccionado, fechaDesde, fechaHasta])

  // ── KPIs (useMemo) ────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const totalOcasionales = ocasionalesFiltradas.reduce((sum, v) => sum + (v['Total de personas'] || 0), 0)
    const totalInstitucionales = institucionalesFiltradas.reduce((sum, v) => sum + (v.cantidad_asistentes || 0), 0)
    const totalVisitas = totalOcasionales + totalInstitucionales

    // Promedio diario
    const todasFechas = [
      ...ocasionalesFiltradas.map(v => v.Fecha),
      ...institucionalesFiltradas.map(v => v.fecha_visita)
    ].filter(Boolean)

    let promedioDia = 0
    if (todasFechas.length > 0) {
      const fechasOrdenadas = todasFechas.sort()
      const primera = new Date(fechasOrdenadas[0])
      const ultima = new Date(fechasOrdenadas[fechasOrdenadas.length - 1])
      const dias = Math.ceil((ultima.getTime() - primera.getTime()) / (1000 * 60 * 60 * 24)) + 1
      promedioDia = dias > 0 ? Math.round(totalVisitas / dias) : 0
    }

    return {
      totalVisitas,
      totalOcasionales,
      totalInstitucionales,
      promedioDia
    }
  }, [ocasionalesFiltradas, institucionalesFiltradas])

  // ── Visitas ocasionales por mes (useMemo) ─────────────────────────────────
  const visitasOcasionalesPorMes = useMemo(() => {
    const meses: Record<string, number> = {}

    ocasionalesFiltradas.forEach(v => {
      if (v.Fecha) {
        const mes = v.Fecha.substring(0, 7) // YYYY-MM
        if (!meses[mes]) meses[mes] = 0
        meses[mes] += v['Total de personas'] || 0
      }
    })

    return Object.entries(meses)
      .map(([mes, total]) => ({ mes, total }))
      .sort((a, b) => a.mes.localeCompare(b.mes))
  }, [ocasionalesFiltradas])

  // ── Visitas institucionales por mes (useMemo) ─────────────────────────────
  const visitasInstitucionalesPorMes = useMemo(() => {
    const meses: Record<string, number> = {}

    institucionalesFiltradas.forEach(v => {
      if (v.fecha_visita) {
        const mes = v.fecha_visita.substring(0, 7)
        if (!meses[mes]) meses[mes] = 0
        meses[mes] += v.cantidad_asistentes || 0
      }
    })

    return Object.entries(meses)
      .map(([mes, total]) => ({ mes, total }))
      .sort((a, b) => a.mes.localeCompare(b.mes))
  }, [institucionalesFiltradas])

  // ── Procedencia ocasionales / institucionales, por separado (useMemo) ──────
  const procedenciaOcasionalesData = useMemo(() => {
    const conteo: Record<string, number> = {}
    ocasionalesFiltradas.forEach(v => {
      const proc = (v['Procedencia '] || 'Sin especificar').trim()
      conteo[proc] = (conteo[proc] || 0) + (v['Total de personas'] || 0)
    })
    return Object.entries(conteo)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [ocasionalesFiltradas])

  const procedenciaInstitucionalesData = useMemo(() => {
    const conteo: Record<string, number> = {}
    institucionalesFiltradas.forEach(v => {
      const proc = v.procedencia_institucion || 'Sin especificar'
      conteo[proc] = (conteo[proc] || 0) + (v.cantidad_asistentes || 0)
    })
    return Object.entries(conteo)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [institucionalesFiltradas])

  // ── Top 5 lugares de procedencia (país / provincia / departamento) ─────────
  // 'Lugar de procedencia ' solo se completa cuando 'Procedencia ' es
  // Internacional/Nacional/Provincial (el Form la oculta para 'Residente').
  const top5LugaresPorCategoria = useMemo(() => {
    function top5(categoria: 'Internacional' | 'Nacional' | 'Provincial') {
      const conteo: Record<string, number> = {}
      let total = 0
      ocasionalesFiltradas.forEach(v => {
        if ((v['Procedencia '] || '').trim() !== categoria) return
        const lugar = (v['Lugar de procedencia '] || 'Sin especificar').trim()
        const personas = v['Total de personas'] || 0
        conteo[lugar] = (conteo[lugar] || 0) + personas
        total += personas
      })
      return Object.entries(conteo)
        .map(([name, value]) => ({ name, value, pct: total ? Math.round((value / total) * 100) : 0 }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)
    }
    return {
      paises: top5('Internacional'),
      provincias: top5('Nacional'),
      departamentos: top5('Provincial'),
    }
  }, [ocasionalesFiltradas])

  // ── Tipo institución, en % del total institucional (useMemo) ───────────────
  const tipoInstitucionData = useMemo(() => {
    const conteo: Record<string, number> = {}
    let total = 0

    institucionalesFiltradas.forEach(v => {
      const tipo = v.tipo_institucion || 'Sin especificar'
      const asistentes = v.cantidad_asistentes || 0
      conteo[tipo] = (conteo[tipo] || 0) + asistentes
      total += asistentes
    })

    return Object.entries(conteo)
      .map(([name, value]) => ({ name, value, pct: total ? Math.round((value / total) * 100) : 0 }))
      .sort((a, b) => b.value - a.value)
  }, [institucionalesFiltradas])

  // ── Canal difusión, en % de las visitas ocasionales que lo mencionan ───────
  // Una visita puede citar varios canales — los % no suman 100, cada barra es
  // "% de visitas ocasionales que mencionan este canal".
  const canalDifusionData = useMemo(() => {
    const conteo: Record<string, number> = {}
    const totalVisitas = ocasionalesFiltradas.length

    ocasionalesFiltradas.forEach(v => {
      if (v.canal_difusion) {
        const canales = v.canal_difusion.split(',').map(c => c.trim())
        canales.forEach(canal => {
          if (canal) {
            conteo[canal] = (conteo[canal] || 0) + 1
          }
        })
      }
    })

    return Object.entries(conteo)
      .map(([name, value]) => ({ name, value, pct: totalVisitas ? Math.round((value / totalVisitas) * 100) : 0 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [ocasionalesFiltradas])

  return (
    <div className="space-y-6">
      {/* ── Filtros ───────────────────────────────────────────────────────── */}
      <div className="card p-5 md:p-6">
        <h3 className="text-base font-semibold text-text-primary mb-4">
          Filtros de Periodo
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Filtro por Año */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary block mb-2">
              Filtrar por año:
            </label>
            <SelectAno
              value={anoSeleccionado}
              onChange={setAnoSeleccionado}
              anos={anosDisponibles}
            />
          </div>

          {/* Filtro por Rango de Fechas */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary block mb-2">
              O filtrar por rango específico:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="input bg-white text-sm py-1.5"
                placeholder="Desde"
                aria-label="Fecha desde"
              />
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="input bg-white text-sm py-1.5"
                placeholder="Hasta"
                aria-label="Fecha hasta"
              />
            </div>
          </div>
        </div>

        {/* Botón Limpiar */}
        {hayFiltrosActivos && (
          <div className="mt-4">
            <button
              onClick={limpiarFiltros}
              className="btn-secondary text-sm"
              aria-label="Limpiar todos los filtros"
            >
              <i className="fa-solid fa-times" aria-hidden="true" /> Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* ── KPIs ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-secondary">Total Visitantes</span>
            <i className="fa-solid fa-users text-primary text-xl" />
          </div>
          <p className="text-3xl font-bold text-text-primary">{kpis.totalVisitas.toLocaleString()}</p>
          <p className="text-xs text-text-secondary mt-1">
            Ocasionales + Institucionales
            {hayFiltrosActivos && <span className="text-primary font-medium"> (filtrado)</span>}
          </p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-secondary">Visitas Ocasionales</span>
            <i className="fa-solid fa-user text-blue-600 text-xl" />
          </div>
          <p className="text-3xl font-bold text-text-primary">{kpis.totalOcasionales.toLocaleString()}</p>
          <p className="text-xs text-text-secondary mt-1">
            {ocasionalesFiltradas.length} registros
          </p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-secondary">Visitas Institucionales</span>
            <i className="fa-solid fa-building text-green-600 text-xl" />
          </div>
          <p className="text-3xl font-bold text-text-primary">{kpis.totalInstitucionales.toLocaleString()}</p>
          <p className="text-xs text-text-secondary mt-1">
            {institucionalesFiltradas.length} registros
          </p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-secondary">Promedio / Día</span>
            <i className="fa-solid fa-chart-line text-orange-600 text-xl" />
          </div>
          <p className="text-3xl font-bold text-text-primary">{kpis.promedioDia}</p>
          <p className="text-xs text-text-secondary mt-1">
            Visitantes por día
          </p>
        </div>
      </div>

      {/* ── Gráfico Visitas Ocasionales ───────────────────────────────────── */}
      <div className="card p-5 md:p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Visitas Ocasionales por Mes
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={visitasOcasionalesPorMes} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
              <defs>
                <linearGradient id="gradOcasionales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke="#E5E7EB" />
              <XAxis
                dataKey="mes"
                tick={{ fontSize: 11, fill: '#6B7280' }}
                angle={-45}
                textAnchor="end"
                height={70}
                interval={0}
              />
              <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#3B82F6"
                strokeWidth={2}
                fill="url(#gradOcasionales)"
                dot={false}
                activeDot={{ r: 4 }}
                name="Visitantes"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Gráfico Visitas Institucionales ───────────────────────────────── */}
      <div className="card p-5 md:p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Visitas Institucionales por Mes
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={visitasInstitucionalesPorMes} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
              <defs>
                <linearGradient id="gradInstitucionales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke="#E5E7EB" />
              <XAxis
                dataKey="mes"
                tick={{ fontSize: 11, fill: '#6B7280' }}
                angle={-45}
                textAnchor="end"
                height={70}
                interval={0}
              />
              <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#10B981"
                strokeWidth={2}
                fill="url(#gradInstitucionales)"
                dot={false}
                activeDot={{ r: 4 }}
                name="Visitantes"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Procedencia: ocasionales vs institucionales, por separado ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">
            Procedencia · Visitas Ocasionales
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={procedenciaOcasionalesData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                dataKey="value"
                label={({ value }) => {
                  const total = procedenciaOcasionalesData.reduce((s, d) => s + d.value, 0)
                  return total ? `${Math.round(value / total * 100)}%` : ''
                }}
                labelLine={true}
              >
                {procedenciaOcasionalesData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} />
                ))}
              </Pie>
              <Legend formatter={(v) => <span style={{ fontSize: 12 }}>{v}</span>} />
              <Tooltip formatter={(v: number) => {
                const total = procedenciaOcasionalesData.reduce((s, d) => s + d.value, 0)
                return [total ? `${Math.round((v / total) * 100)}%` : '—', '']
              }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">
            Procedencia · Visitas Institucionales
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={procedenciaInstitucionalesData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                dataKey="value"
                label={({ value }) => {
                  const total = procedenciaInstitucionalesData.reduce((s, d) => s + d.value, 0)
                  return total ? `${Math.round(value / total * 100)}%` : ''
                }}
                labelLine={true}
              >
                {procedenciaInstitucionalesData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} />
                ))}
              </Pie>
              <Legend formatter={(v) => <span style={{ fontSize: 12 }}>{v}</span>} />
              <Tooltip formatter={(v: number) => {
                const total = procedenciaInstitucionalesData.reduce((s, d) => s + d.value, 0)
                return [total ? `${Math.round((v / total) * 100)}%` : '—', '']
              }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Top 5 lugares de procedencia (solo visitas ocasionales) ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {([
          { key: 'paises', titulo: 'Top 5 Países (Internacional)', color: '#db2777' },
          { key: 'provincias', titulo: 'Top 5 Provincias (Nacional)', color: '#0ea5e9' },
          { key: 'departamentos', titulo: 'Top 5 Departamentos (Provincial)', color: '#10b981' },
        ] as const).map(({ key, titulo, color }) => {
          const datos = top5LugaresPorCategoria[key]
          if (datos.length === 0) return null
          return (
            <div key={key} className="card p-6">
              <h3 className="text-base font-semibold text-text-primary mb-4">{titulo}</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={datos} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: '#6B7280' }} />
                  <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11, fill: '#6B7280' }} />
                  <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v: number) => [`${v}%`, 'Personas']} />
                  <Bar dataKey="pct" fill={color} name="% del total" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )
        })}
      </div>

      {/* ── Tipo de institución / canal de difusión, en % ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tipo de Institución */}
        {tipoInstitucionData.length > 0 && (
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              Tipo de Institución
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={tipoInstitucionData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: '#6B7280' }} />
                <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 11, fill: '#6B7280' }} />
                <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v: number) => [`${v}%`, 'Visitantes']} />
                <Bar dataKey="pct" fill="#10B981" name="% de visitantes" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Canal de Difusión */}
        {canalDifusionData.length > 0 && (
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              Canal de Difusión (Top 8)
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={canalDifusionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} angle={-45} textAnchor="end" height={100} />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: '#6B7280' }} />
                <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v: number) => [`${v}%`, 'Visitas que lo mencionan']} />
                <Bar dataKey="pct" fill="#F59E0B" name="% de visitas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
