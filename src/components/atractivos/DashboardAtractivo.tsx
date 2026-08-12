'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import {
  ResponsiveContainer,
  LineChart,
  Line,
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
} from 'recharts'
import KpisAtractivo from './KpisAtractivo'
import { useSession } from 'next-auth/react'
import { puedeEscribir } from '@/lib/permisos'
import type { AtractivoConIngresos } from '@/lib/atractivos-config'
import type { ResumenAtractivo } from '@/lib/types'

const COLORS_PIE = ['#f97316', '#0ea5e9', '#10b981', '#8b5cf6', '#eab308', '#ef4444', '#64748b']
const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

interface DashboardAtractivoProps {
  atractivo: AtractivoConIngresos
}

export default function DashboardAtractivo({ atractivo }: DashboardAtractivoProps) {
  const { data: session } = useSession()
  const escribir = puedeEscribir(session?.user as never)

  const [resumen, setResumen] = useState<ResumenAtractivo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/ocio/ingresos/atractivos/${atractivo}/resumen`)
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Error')
      setResumen(data.data)
    } catch (err) {
      setError('No se pudo cargar el resumen. Verificá la conexión y/o la configuración del módulo.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [atractivo])

  useEffect(() => {
    cargar()
  }, [cargar])

  const serie = useMemo(() => {
    if (!resumen) return []
    return resumen.serieAnual.map((s) => ({
      mes: MESES_CORTOS[s.mes - 1],
      personas: s.personas,
      actividades: s.personasActividades,
    }))
  }, [resumen])

  const porMotivo = useMemo(() => (resumen?.porMotivo || []).slice().sort((a, b) => b.personas - a.personas), [resumen])
  const porTipo = useMemo(
    () => (resumen?.porTipoVisitante || []).slice().sort((a, b) => b.personas - a.personas),
    [resumen],
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-text-secondary">Cargando indicadores...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card p-6 flex items-center gap-3 border-red-200 bg-red-50">
        <i className="fa-solid fa-triangle-exclamation text-red-500" />
        <p className="text-sm text-red-700 flex-1">{error}</p>
        <button onClick={cargar} className="btn-ghost text-red-600 text-xs">
          <i className="fa-solid fa-rotate-right" /> Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {resumen && <KpisAtractivo resumen={resumen} />}

      {escribir && (
        <div className="print:hidden flex flex-wrap gap-2">
          <Link href={`/ocio/ingresos/${atractivo}/cargar`} className="btn-primary">
            <i className="fa-solid fa-plus" /> Cargar ingreso
          </Link>
          <Link href={`/ocio/ingresos/${atractivo}/actividades`} className="btn-secondary">
            <i className="fa-solid fa-star" /> Actividades especiales
          </Link>
          <Link href={`/ocio/ingresos/${atractivo}/registros`} className="btn-secondary">
            <i className="fa-solid fa-list" /> Ver registros
          </Link>
        </div>
      )}

      {/* Serie mensual */}
      <div className="card p-5">
        <h3 className="text-base font-semibold text-text-primary mb-4">
          <i className="fa-solid fa-chart-line text-primary mr-2" />
          Personas por mes · {resumen?.anio}
        </h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={serie} margin={{ top: 10, right: 20, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="personas" name="Visitas" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="actividades" name="Actividades" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Por motivo */}
        <div className="card p-5">
          <h3 className="text-base font-semibold text-text-primary mb-4">
            <i className="fa-solid fa-tags text-primary mr-2" />
            Personas por motivo
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porMotivo} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                <YAxis type="category" dataKey="motivo" width={110} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="personas" name="Personas" fill="#f97316" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Por tipo de visitante */}
        <div className="card p-5">
          <h3 className="text-base font-semibold text-text-primary mb-4">
            <i className="fa-solid fa-user-group text-primary mr-2" />
            Visitantes por tipo
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={porTipo}
                  dataKey="personas"
                  nameKey="tipo_visitante"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {porTipo.map((_, i) => (
                    <Cell key={i} fill={COLORS_PIE[i % COLORS_PIE.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}