'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts'
import MetricasService from '@/services/metricasService'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import KPICard from '@/components/charts/KPICard'

export default function DigitalDashboard() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{
    web: any[],
    facebook: any[],
    instagram: any[],
    catu: any[]
  }>({ web: [], facebook: [], instagram: [], catu: [] })

  useEffect(() => {
    async function fetchAll() {
      setLoading(true)
      const [web, fb, ig, catu] = await Promise.all([
        MetricasService.getMetricas('web'),
        MetricasService.getMetricas('facebook'),
        MetricasService.getMetricas('instagram'),
        MetricasService.getMetricas('catu')
      ])
      
      const sortFn = (a: any, b: any) => {
        const [ma, ya] = a.mes_anio.split('/').map(Number)
        const [mb, yb] = b.mes_anio.split('/').map(Number)
        return ya !== yb ? ya - yb : ma - mb
      }

      setData({
        web: web.sort(sortFn),
        facebook: fb.sort(sortFn),
        instagram: ig.sort(sortFn),
        catu: catu.sort(sortFn)
      })
      setLoading(false)
    }
    fetchAll()
  }, [])

  // Cálculos para KPIs (último mes vs anterior)
  const stats = useMemo(() => {
    const getLatest = (list: any[]) => list[list.length - 1] || {}
    const getPrev = (list: any[]) => list[list.length - 2] || {}
    const variacion = (current: number, prev: number) =>
      prev === 0 ? undefined : Math.round(((current - prev) / prev) * 100)

    const webLatest = getLatest(data.web)
    const fbLatest = getLatest(data.facebook)
    const igLatest = getLatest(data.instagram)
    const catuLatest = getLatest(data.catu)

    const webCurrent = webLatest.visitantes || 0
    const fbCurrent = fbLatest.seguidores || 0
    const igCurrent = igLatest.seguidores || 0
    const catuCurrent = catuLatest.tasa_resolucion || 0

    return {
      web: { current: webCurrent, variacion: variacion(webCurrent, getPrev(data.web).visitantes || 0) },
      fb: { current: fbCurrent, variacion: variacion(fbCurrent, getPrev(data.facebook).seguidores || 0) },
      ig: { current: igCurrent, variacion: variacion(igCurrent, getPrev(data.instagram).seguidores || 0) },
      catu: { current: catuCurrent, variacion: variacion(catuCurrent, getPrev(data.catu).tasa_resolucion || 0) }
    }
  }, [data])

  if (loading) return <div className="flex h-96 items-center justify-center"><LoadingSpinner /></div>

  const hasData = data.web.length > 0 || data.facebook.length > 0 || data.instagram.length > 0 || data.catu.length > 0

  if (!hasData) {
    return (
      <div className="max-w-6xl mx-auto py-12 px-4 text-center">
        <i className="fa-solid fa-chart-line text-6xl text-gray-200 mb-4"></i>
        <h2 className="text-2xl font-bold text-gray-400">Sin datos para mostrar</h2>
        <p className="text-gray-500 mt-2">Carga métricas en el panel de administración para ver la evolución.</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <header className="mb-8">
        <h1 className="text-3xl font-black text-text-primary mb-2">Dashboard Digital</h1>
        <p className="text-text-secondary font-medium uppercase text-xs tracking-widest">Estado y evolución de canales digitales</p>
      </header>

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard
          titulo="Visitantes Web"
          valor={stats.web.current}
          icono="fa-globe"
          color="text-blue-600"
          variacion={stats.web.variacion}
        />
        <KPICard
          titulo="Seguidores FB"
          valor={stats.fb.current}
          icono="fa-facebook"
          color="text-indigo-600"
          variacion={stats.fb.variacion}
        />
        <KPICard
          titulo="Seguidores IG"
          valor={stats.ig.current}
          icono="fa-instagram"
          color="text-pink-600"
          variacion={stats.ig.variacion}
        />
        <KPICard
          titulo="Resolución Catu"
          valor={stats.catu.current}
          unidad="%"
          icono="fa-robot"
          color="text-orange-500"
          variacion={stats.catu.variacion}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Gráfico Web */}
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <i className="fa-solid fa-globe text-blue-500"></i> Evolución Web
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.web}>
                <defs>
                  <linearGradient id="colorWeb" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="mes_anio" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} />
                <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                <Area type="monotone" dataKey="visitantes" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorWeb)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico Redes Sociales (Comparativo Interacciones) */}
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <i className="fa-solid fa-share-nodes text-indigo-500"></i> Interacciones Redes
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="mes_anio" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} allowDuplicatedCategory={false} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} />
                <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                <Area data={data.facebook} type="monotone" dataKey="interacciones" name="Facebook" stroke="#3b5998" strokeWidth={3} fill="none" />
                <Area data={data.instagram} type="monotone" dataKey="interacciones" name="Instagram" stroke="#c13584" strokeWidth={3} fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500"><span className="w-3 h-3 rounded-full bg-[#3b5998]"></span> Facebook</div>
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500"><span className="w-3 h-3 rounded-full bg-[#c13584]"></span> Instagram</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Catu Bot Detail */}
        <div className="card p-6 lg:col-span-1">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <i className="fa-solid fa-robot text-orange-500"></i> Catu Bot: Calidad
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.catu}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="mes_anio" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} />
                <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                <Bar dataKey="puntuacion_promedio" name="Puntuación" radius={[4, 4, 0, 0]}>
                  {data.catu.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.puntuacion_promedio > 4 ? '#10b981' : '#f59e0b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-4">Puntuación promedio de usuarios (1-5)</p>
        </div>

        {/* Web Detail - Top Regiones (del último mes) */}
        <div className="card p-6 lg:col-span-2">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <i className="fa-solid fa-map-location-dot text-green-500"></i> Top Regiones - {data.web[data.web.length-1]?.mes_anio}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.web[data.web.length-1]?.regiones || []} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis dataKey="region" type="category" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 'bold'}} width={100} />
                  <Tooltip />
                  <Bar dataKey="visitas" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-bold text-gray-500 border-b pb-2">Fuentes de tráfico</p>
              {(data.web[data.web.length-1]?.fuentes || []).map((f: any, i: number) => (
                <div key={i} className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 truncate mr-4">{f.fuente}</span>
                  <span className="font-black text-primary">{f.visitas.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
