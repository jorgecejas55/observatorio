'use client'

/**
 * Dashboard de Ocupación Hotelera.
 * Muestra resumen anual: mensuales, especiales, promedio OH.
 * "sin datos ≠ 0%": solo muestra datos de relevamientos efectivamente realizados.
 */

import { useState, useEffect } from 'react'
import { tituloRelevamiento, formatearRango } from '@/lib/formato-fechas'

interface RelevamientoResumen {
  id: string
  nombre: string
  fechaInicio: string
  fechaFin: string
  mes: number
  ohTotal: number
  ohMin: number
  ohMax: number
  ohModa: number
  cantidadRelevados: number
}

interface DashboardData {
  mensuales: RelevamientoResumen[]
  especiales: RelevamientoResumen[]
  resumen: {
    cantidadMensuales: number
    cantidadEspeciales: number
    promedioOHAnual: number
  }
}

const MESES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function TarjetaEstadistica({ label, valor, icono, color }: { label: string; valor: string | number; icono: string; color: string }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${color}`}>
        <i className={`fas ${icono} text-white text-sm`} />
      </div>
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-gray-800">{valor}</p>
      </div>
    </div>
  )
}

function TablaRelevamientos({ datos, tipo }: { datos: RelevamientoResumen[]; tipo: string }) {
  if (datos.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic py-4">
        Sin datos — no hay relevamientos {tipo.toLowerCase()}s cerrados este año.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-200">
          <tr className="text-left text-gray-500 text-xs uppercase tracking-wide">
            <th className="pb-2 font-medium">Nombre</th>
            <th className="pb-2 font-medium">Período</th>
            <th className="pb-2 font-medium text-right">OH Total</th>
            <th className="pb-2 font-medium text-right">Mín</th>
            <th className="pb-2 font-medium text-right">Máx</th>
            <th className="pb-2 font-medium text-right">Moda</th>
            <th className="pb-2 font-medium text-right">Relevados</th>
          </tr>
        </thead>
        <tbody>
          {datos.map((r) => (
            <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
              <td className="py-2 font-medium text-gray-800">{tituloRelevamiento(tipo, r.nombre, r.fechaInicio)}</td>
              <td className="py-2 text-gray-600">{formatearRango(r.fechaInicio, r.fechaFin)}</td>
              <td className="py-2 text-right">
                <span className={`font-semibold ${r.ohTotal > 0 ? 'text-accent' : 'text-gray-400'}`}>
                  {r.ohTotal > 0 ? `${r.ohTotal}%` : '—'}
                </span>
              </td>
              <td className="py-2 text-right text-gray-600">{r.ohMin > 0 ? `${r.ohMin}%` : '—'}</td>
              <td className="py-2 text-right text-gray-600">{r.ohMax > 0 ? `${r.ohMax}%` : '—'}</td>
              <td className="py-2 text-right text-gray-600">{r.ohModa > 0 ? `${r.ohModa}%` : '—'}</td>
              <td className="py-2 text-right text-gray-600">{r.cantidadRelevados || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function DashboardOcupacion() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadDashboard()
  }, [year])

  async function loadDashboard() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/ocupacion/dashboard?year=${year}`)
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setError('Acceso restringido. Solo el administrador puede ver esta sección.')
          return
        }
        throw new Error(`Error ${res.status}`)
      }
      const json = await res.json()
      if (json.error) { setError(json.error); return }
      setData(json)
    } catch (err: any) {
      setError(err.message || 'Error al cargar dashboard')
    } finally {
      setLoading(false)
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
        <span className="ml-3 text-gray-500">Cargando dashboard...</span>
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="card p-6 border-l-4 border-red-400 bg-red-50">
        <p className="text-red-700 flex items-center gap-2">
          <i className="fas fa-exclamation-triangle" /> {error}
        </p>
      </div>
    )
  }

  // ── Empty ────────────────────────────────────────────────────────────────
  if (!data || (data.mensuales.length === 0 && data.especiales.length === 0)) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600">Año:</label>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="input w-24">
            {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="card p-12 text-center">
          <i className="fas fa-chart-bar text-4xl text-gray-300 mb-3 block" />
          <p className="text-gray-500 text-lg">Sin datos para {year}</p>
          <p className="text-gray-400 text-sm mt-1">Los relevamientos cerrados aparecerán aquí automáticamente.</p>
        </div>
      </div>
    )
  }

  // ── Dashboard ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Selector de año */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-600 font-medium">Año:</label>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="input w-24">
          {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <span className="text-xs text-gray-400 ml-2">({data.resumen.cantidadMensuales} mensuales • {data.resumen.cantidadEspeciales} especiales)</span>
      </div>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <TarjetaEstadistica
          label="OH Promedio Anual"
          valor={data.resumen.promedioOHAnual > 0 ? `${data.resumen.promedioOHAnual}%` : '—'}
          icono="fa-chart-line"
          color="bg-blue-500"
        />
        <TarjetaEstadistica
          label="Relev. Mensuales"
          valor={data.resumen.cantidadMensuales}
          icono="fa-calendar-check"
          color="bg-green-500"
        />
        <TarjetaEstadistica
          label="Relev. Especiales"
          valor={data.resumen.cantidadEspeciales}
          icono="fa-calendar-star"
          color="bg-purple-500"
        />
        <TarjetaEstadistica
          label="Año"
          valor={year}
          icono="fa-calendar-alt"
          color="bg-gray-600"
        />
      </div>

      {/* Relevamientos mensuales */}
      <div className="card p-5">
        <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <i className="fas fa-calendar-alt text-green-500" />
          Relevamientos Mensuales
        </h3>
        <TablaRelevamientos datos={data.mensuales} tipo="Mensual" />
      </div>

      {/* Relevamientos especiales */}
      <div className="card p-5">
        <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <i className="fas fa-calendar-star text-purple-500" />
          Relevamientos Especiales (Findes)
        </h3>
        <TablaRelevamientos datos={data.especiales} tipo="Especial" />
      </div>
    </div>
  )
}
