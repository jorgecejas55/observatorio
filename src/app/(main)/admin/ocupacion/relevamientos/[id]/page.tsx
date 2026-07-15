'use client'

/**
 * Detalle de un relevamiento: datos generales, cargas, y OH por tipo/categoría.
 * "sin datos ≠ 0%": tipos/categorías sin cargas no aparecen en el desglose.
 */

import { useState, useEffect, use } from 'react'
import { tituloRelevamiento, formatearRango, formatearFecha } from '@/lib/formato-fechas'
import type { IndicadoresRelevamiento } from '@/lib/informes-auto/types'

interface Relevamiento {
  id: string
  nombre: string
  tipo: 'Mensual' | 'Especial'
  estado: 'EN_CURSO' | 'CERRADO'
  fechaInicio: string
  fechaFin: string
  ohTotal: number
  ohMin: number
  ohMax: number
  ohModa: number
  cantidadRelevados: number
  usuarioCreador: string
  fechaCreacion: string
  usuarioCierre: string
  fechaCierre: string
}

interface Carga {
  id: string
  AlojamientoID?: string
  alojamientoId?: string
  AlojamientoNombre?: string
  alojamientoNombre?: string
  Tipo?: string
  tipo?: string
  Categoria?: string
  categoria?: string
  PorcentajeOH?: number
  porcentajeOH?: number
  CapacidadHab?: number
  capacidadHab?: number
  UsuarioCarga?: string
  usuarioCarga?: string
  FechaCarga?: string
  fechaCarga?: string
  HoraCarga?: string
  horaCarga?: string
}

interface GrupoTipoCat {
  tipoCategoria: string
  tipo: string
  categoria: string
  oh: number
  cantidad: number
}

export default function RelevamientoDetalle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [relevamiento, setRelevamiento] = useState<Relevamiento | null>(null)
  const [cargas, setCargas] = useState<Carga[]>([])
  const [grupos, setGrupos] = useState<GrupoTipoCat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [indicadores, setIndicadores] = useState<IndicadoresRelevamiento | null>(null)
  const [recalculando, setRecalculando] = useState(false)

  useEffect(() => {
    loadDetalle()
  }, [id])

  async function loadDetalle() {
    setLoading(true)
    setError('')
    try {
      const [resRel, resCargas] = await Promise.all([
        fetch(`/api/ocupacion/relevamientos/activo`), // fallback: buscar en listado
        fetch(`/api/ocupacion/cargas?relevamientoId=${id}`),
      ])

      // Buscar relevamiento por ID en el listado general
      const resList = await fetch(`/api/ocupacion/relevamientos?`)
      if (resList.ok) {
        const list = await resList.json()
        const found = (list.data || []).find((r: any) => String(r.id) === String(id))
        if (found) setRelevamiento(found)
      }

      if (resCargas.ok) {
        const json = await resCargas.json()
        if (json.success) {
          setCargas(json.data || [])
          // Calcular OH por tipo/categoría desde snapshots
          calcularGrupos(json.data || [])
        }
      }

      // Cargar indicadores si el relevamiento está cerrado
      try {
        const resInd = await fetch(`/api/ocupacion/relevamientos/${id}/indicadores`)
        if (resInd.ok) {
          const indJson = await resInd.json()
          if (indJson.success && indJson.data?.datosJSON) {
            setIndicadores(indJson.data.datosJSON)
          } else if (indJson.data?.global) {
            // Si no hay datosJSON pero tiene datos escalares (formato plano)
            setIndicadores(indJson.data)
          }
        }
      } catch {
        // Silencioso: los indicadores son opcionales
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function recalcularIndicadores() {
    setRecalculando(true)
    try {
      const res = await fetch(`/api/ocupacion/relevamientos/${id}/indicadores`, { method: 'POST' })
      const json = await res.json()
      if (json.success && json.data) {
        setIndicadores(json.data)
      }
    } catch (err) {
      console.error('Error al recalcular indicadores:', err)
    } finally {
      setRecalculando(false)
    }
  }

  function calcularGrupos(cargasList: Carga[]) {
    const stats: Record<string, { tipo: string; categoria: string; habOcupadas: number; habRelevadas: number; cantidad: number }> = {}

    cargasList.forEach((c: any) => {
      const tipo = c.Tipo || c.tipo || 'Sin tipo'
      const categoria = c.Categoria || c.categoria || 'Sin categoría'
      const key = `${tipo} - ${categoria}`
      const capHab = Number(c.CapacidadHab ?? c.capacidadHab ?? 0)
      const pct = Number(c.PorcentajeOH ?? c.porcentajeOH ?? 0)

      if (!stats[key]) stats[key] = { tipo, categoria, habOcupadas: 0, habRelevadas: 0, cantidad: 0 }
      stats[key].habOcupadas += Math.round(capHab * pct / 100)
      stats[key].habRelevadas += capHab
      stats[key].cantidad++
    })

    const result: GrupoTipoCat[] = Object.entries(stats).map(([key, s]) => ({
      tipoCategoria: key,
      tipo: s.tipo,
      categoria: s.categoria,
      oh: s.habRelevadas > 0 ? parseFloat((s.habOcupadas / s.habRelevadas * 100).toFixed(1)) : 0,
      cantidad: s.cantidad,
    }))

    result.sort((a, b) => b.oh - a.oh)
    setGrupos(result)
  }

  // ── Loading / Error / Not Found ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
        <span className="ml-3 text-gray-500">Cargando detalle...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card p-6 border-l-4 border-red-400 bg-red-50">
        <p className="text-red-700"><i className="fas fa-exclamation-triangle mr-2" />{error}</p>
      </div>
    )
  }

  if (!relevamiento) {
    return (
      <div className="card p-12 text-center">
        <i className="fas fa-search text-4xl text-gray-300 mb-3 block" />
        <p className="text-gray-500">Relevamiento no encontrado</p>
        <a href="/admin/ocupacion/relevamientos" className="text-accent text-sm mt-2 inline-block hover:underline">
          ← Volver al listado
        </a>
      </div>
    )
  }

  // ── Detalle ──────────────────────────────────────────────────────────────
  const vivo = relevamiento.estado === 'EN_CURSO'
  const preview = statsDeCargas(cargas)
  const stats = vivo
    ? preview
    : {
        ohTotal: relevamiento.ohTotal,
        ohMin: relevamiento.ohMin,
        ohMax: relevamiento.ohMax,
        ohModa: relevamiento.ohModa,
        relevados: relevamiento.cantidadRelevados,
      }
  const hayStats = !!stats && (stats.relevados ?? 0) > 0
  const fmtPct = (n: number | undefined) => (hayStats ? `${n ?? 0}%` : '—')

  return (
    <div className="space-y-6">
      {/* Header + breadcrumb */}
      <div>
        <a href="/admin/ocupacion/relevamientos" className="text-xs text-gray-400 hover:text-accent transition-colors mb-2 inline-block">
          <i className="fas fa-arrow-left mr-1" />Relevamientos
        </a>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-800">
              {tituloRelevamiento(relevamiento.tipo, relevamiento.nombre, relevamiento.fechaInicio)}
            </h2>
            <p className="text-sm text-gray-500">
              {relevamiento.tipo} • {formatearRango(relevamiento.fechaInicio, relevamiento.fechaFin)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!vivo && indicadores && (
              <a
                href={`/admin/ocupacion/relevamientos/${id}/ficha`}
                className="btn-outline text-xs px-3 py-1.5"
                title="Exportar ficha técnica (PDF)"
              >
                <i className="fas fa-print mr-1" />Ficha técnica
              </a>
            )}
            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
              relevamiento.estado === 'EN_CURSO' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
            }`}>
              {relevamiento.estado === 'EN_CURSO' ? 'EN CURSO' : 'CERRADO'}
            </span>
          </div>
        </div>
      </div>

      {/* Tarjetas de OH */}
      <div>
        {vivo && hayStats && (
          <p className="text-xs text-amber-600 flex items-center gap-1.5 mb-2">
            <i className="fas fa-bolt" />
            Valores preliminares en vivo, calculados sobre las cargas actuales (se recalculan al cerrar el relevamiento).
          </p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <MiniCard label="OH Total" valor={fmtPct(stats?.ohTotal)} color="text-accent" icono="fa-chart-pie" />
          <MiniCard label="OH Mínimo" valor={fmtPct(stats?.ohMin)} color="text-blue-500" icono="fa-arrow-down" />
          <MiniCard label="OH Máximo" valor={fmtPct(stats?.ohMax)} color="text-red-500" icono="fa-arrow-up" />
          <MiniCard label="OH Moda" valor={fmtPct(stats?.ohModa)} color="text-purple-500" icono="fa-chart-simple" />
          <MiniCard label="Relevados" valor={hayStats ? (stats!.relevados ?? 0) : '—'} color="text-gray-600" icono="fa-hotel" />
        </div>
      </div>

      {/* ── Análisis estadístico (solo CERRADO) ─────────────────────────── */}
      {!vivo && (
        <div className="space-y-5">
          {!indicadores ? (
            /* Sin indicadores: aviso + botón recalcular */
            <div className="card p-4 border border-amber-200 bg-amber-50">
              <div className="flex items-center justify-between">
                <p className="text-sm text-amber-700">
                  <i className="fas fa-info-circle mr-2" />
                  Este relevamiento fue cerrado pero sus indicadores estadísticos no fueron calculados.
                </p>
                <button
                  onClick={recalcularIndicadores}
                  disabled={recalculando}
                  className="btn-primary text-xs px-3 py-1.5"
                >
                  {recalculando ? (
                    <><i className="fas fa-spinner fa-spin mr-1" />Calculando...</>
                  ) : (
                    <><i className="fas fa-calculator mr-1" />Calcular indicadores</>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* KPIs avanzados */}
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <i className="fas fa-chart-bar text-accent" />
                  Análisis estadístico
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <MiniCard label="Media simple" valor={`${indicadores.global.mediaSimple}%`} color="text-blue-500" icono="fa-calculator" />
                  <MiniCard label="Mediana" valor={`${indicadores.global.mediana}%`} color="text-indigo-500" icono="fa-chart-line" />
                  <MiniCard
                    label={`Media recortada ${indicadores.global.nRecortados > 0 ? `(-${indicadores.global.nRecortados})` : ''}`}
                    valor={`${indicadores.global.mediaRecortada}%`}
                    color="text-teal-500"
                    icono="fa-scissors"
                  />
                  <MiniCard label="Desvío estándar" valor={`${indicadores.global.desvioEstandar}`} color="text-purple-500" icono="fa-arrow-right-arrow-left" />
                  <MiniCard label="Coef. variación" valor={`${indicadores.global.coeficienteVariacion}%`} color="text-gray-500" icono="fa-percent" />
                </div>
              </div>

              {/* Baja actividad + cobertura */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={`card p-4 border-l-4 ${
                  indicadores.bajaActividad.porcentaje > 30 ? 'border-red-400 bg-red-50' :
                  indicadores.bajaActividad.porcentaje > 0 ? 'border-amber-400 bg-amber-50' :
                  'border-green-400 bg-green-50'
                }`}>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Baja actividad comercial</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {indicadores.bajaActividad.cantidad} <span className="text-sm font-normal text-gray-500">de {indicadores.global.n}</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    {indicadores.bajaActividad.porcentaje}% con OH &lt; {indicadores.bajaActividad.umbral}%
                  </p>
                  <p className="text-xs text-gray-400 mt-1 italic" title="Indicador de diagnóstico de gestión — no revela identidades">
                    <i className="fas fa-info-circle mr-1" />
                    Establecimientos con ocupación inferior al umbral. Indicador de diagnóstico, sin identidades.
                  </p>
                </div>

                <div className="card p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Cobertura</p>
                  {indicadores.cobertura !== null ? (
                    <>
                      <p className="text-2xl font-bold text-gray-800">{indicadores.cobertura}%</p>
                      <p className="text-sm text-gray-600">
                        {indicadores.global.n} de {indicadores.totalAlojamientosActivos} alojamientos activos
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400">Sin datos del padrón</p>
                  )}
                </div>
              </div>

              {/* Distribución por rangos */}
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">Distribución por rangos de ocupación</h3>
                <div className="space-y-2">
                  {indicadores.distribucionRangos.rangos.map((r) => (
                    <div key={r.etiqueta} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-16 text-right">{r.etiqueta}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            r.desde >= 75 ? 'bg-green-500' :
                            r.desde >= 50 ? 'bg-blue-500' :
                            r.desde >= 25 ? 'bg-amber-500' :
                            'bg-red-400'
                          }`}
                          style={{ width: `${Math.max(r.porcentaje, 2)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600 w-16">{r.cantidad} ({r.porcentaje}%)</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Picos por grupo */}
              {indicadores.picos.porTipo.length > 0 && (
                <div className="card p-5">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">
                    Picos de ocupación por grupo
                    {indicadores.picos.picoMaximo && (
                      <span className="text-xs text-gray-400 font-normal ml-2">
                        — Máximo global: {indicadores.picos.picoMaximo.tipoCategoria} ({indicadores.picos.picoMaximo.ohMaximo}%)
                      </span>
                    )}
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-gray-200">
                        <tr className="text-left text-gray-500 text-xs uppercase tracking-wide">
                          <th className="pb-2 font-medium">Grupo</th>
                          <th className="pb-2 font-medium text-right">OH máximo</th>
                          <th className="pb-2 font-medium text-right">Establecimientos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {indicadores.picos.porTipo.map((p) => (
                          <tr key={p.tipoCategoria} className="border-b border-gray-50">
                            <td className="py-2 text-gray-700">{p.tipoCategoria}</td>
                            <td className="py-2 text-right">
                              <span className="font-semibold text-accent">{p.ohMaximo}%</span>
                            </td>
                            <td className="py-2 text-right text-gray-600">{p.cantidadAlojamientos}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* OH por tipo/categoría */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <i className="fas fa-layer-group text-accent" />
          OH por tipo y categoría
          <span className="text-xs text-gray-400 font-normal">(solo grupos relevados — sin datos no es 0%)</span>
        </h3>

        {/* Mostrar grupos desde indicadores si están disponibles (CERRADO), sino client-side */}
        {(indicadores?.porGrupo && indicadores.porGrupo.length > 0) ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200">
                <tr className="text-left text-gray-500 text-xs uppercase tracking-wide">
                  <th className="pb-2 font-medium">Grupo</th>
                  <th className="pb-2 font-medium text-right">OH ponderada</th>
                  <th className="pb-2 font-medium text-right">Mín</th>
                  <th className="pb-2 font-medium text-right">Máx</th>
                  <th className="pb-2 font-medium text-right">n</th>
                  <th className="pb-2 font-medium text-right">Participación</th>
                </tr>
              </thead>
              <tbody>
                {indicadores.porGrupo.map((g) => (
                  <tr key={g.tipoCategoria} className="border-b border-gray-50">
                    <td className="py-2 text-gray-700">{g.tipoCategoria}</td>
                    <td className="py-2 text-right">
                      <span className={`font-semibold ${g.estadisticas.mediaPonderada > 0 ? 'text-accent' : 'text-gray-400'}`}>
                        {g.estadisticas.mediaPonderada > 0 ? `${g.estadisticas.mediaPonderada}%` : '—'}
                      </span>
                    </td>
                    <td className="py-2 text-right text-gray-600">{g.estadisticas.minimo}%</td>
                    <td className="py-2 text-right text-gray-600">{g.estadisticas.maximo}%</td>
                    <td className="py-2 text-right text-gray-600">{g.estadisticas.n}</td>
                    <td className="py-2 text-right text-gray-500 text-xs">{g.participacionHabitaciones}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : grupos.length === 0 ? (
          <p className="text-sm text-gray-400 italic py-2">
            {cargas.length === 0 ? 'Sin cargas todavía.' : 'Sin datos para desglosar por tipo/categoría.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200">
                <tr className="text-left text-gray-500 text-xs uppercase tracking-wide">
                  <th className="pb-2 font-medium">Tipo</th>
                  <th className="pb-2 font-medium">Categoría</th>
                  <th className="pb-2 font-medium text-right">OH</th>
                  <th className="pb-2 font-medium text-right">Alojamientos</th>
                </tr>
              </thead>
              <tbody>
                {grupos.map((g) => (
                  <tr key={g.tipoCategoria} className="border-b border-gray-50">
                    <td className="py-2 text-gray-700">{g.tipo}</td>
                    <td className="py-2 text-gray-500">{g.categoria}</td>
                    <td className="py-2 text-right">
                      <span className={`font-semibold ${g.oh > 0 ? 'text-accent' : 'text-gray-400'}`}>
                        {g.oh > 0 ? `${g.oh}%` : '—'}
                      </span>
                    </td>
                    <td className="py-2 text-right text-gray-600">{g.cantidad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Listado de cargas */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <i className="fas fa-list text-accent" />
            Cargas ({cargas.length})
          </h3>
          {relevamiento.estado === 'EN_CURSO' && (
            <a href="/admin/ocupacion/carga" className="btn-primary text-xs px-3 py-1.5">
              <i className="fas fa-plus mr-1" />Nueva carga
            </a>
          )}
        </div>

        {cargas.length === 0 ? (
          <p className="text-sm text-gray-400 italic py-2">
            No hay cargas registradas para este relevamiento.
            {relevamiento.estado === 'EN_CURSO' && ' Usá el botón "Nueva carga" o andá a la sección Carga OH.'}
          </p>
        ) : (
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 sticky top-0 bg-white">
                <tr className="text-left text-gray-500 text-xs uppercase tracking-wide">
                  <th className="pb-2 font-medium">Alojamiento</th>
                  <th className="pb-2 font-medium">Tipo</th>
                  <th className="pb-2 font-medium">Categoría</th>
                  <th className="pb-2 font-medium text-right">% OH</th>
                  <th className="pb-2 font-medium text-right">Cap. Hab.</th>
                  <th className="pb-2 font-medium">Cargado por</th>
                </tr>
              </thead>
              <tbody>
                {cargas.map((c: any, idx: number) => (
                  <tr key={c.ID || c.id || idx} className="border-b border-gray-50">
                    <td className="py-2 font-medium text-gray-800">{c.AlojamientoNombre || c.alojamientoNombre}</td>
                    <td className="py-2 text-gray-600">{c.Tipo || c.tipo || '—'}</td>
                    <td className="py-2 text-gray-600">{c.Categoria || c.categoria || '—'}</td>
                    <td className="py-2 text-right">
                      <span className={`font-semibold ${(c.PorcentajeOH ?? c.porcentajeOH) > 0 ? 'text-accent' : 'text-gray-400'}`}>
                        {c.PorcentajeOH ?? c.porcentajeOH ?? 0}%
                      </span>
                    </td>
                    <td className="py-2 text-right text-gray-600">{c.CapacidadHab ?? c.capacidadHab ?? '—'}</td>
                    <td className="py-2 text-gray-500 text-xs">{c.UsuarioCarga || c.usuarioCarga || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="text-xs text-gray-400 space-y-1">
        <p>Creado por {relevamiento.usuarioCreador || '—'} el {formatearFecha(relevamiento.fechaCreacion)}</p>
        {relevamiento.estado === 'CERRADO' && (
          <p>Cerrado por {relevamiento.usuarioCierre || '—'} el {formatearFecha(relevamiento.fechaCierre)}</p>
        )}
      </div>
    </div>
  )
}

function MiniCard({ label, valor, color, icono }: { label: string; valor: string | number; color: string; icono: string }) {
  return (
    <div className="card p-3 text-center">
      <i className={`fas ${icono} ${color} text-lg mb-1 block`} />
      <p className="text-2xl font-bold text-gray-800">{valor}</p>
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
    </div>
  )
}

/**
 * Estadísticas previas de OH calculadas en vivo desde las cargas (mientras el
 * relevamiento está EN CURSO). OH total ponderado por capacidad de habitaciones;
 * min/max/moda sobre los porcentajes cargados. Devuelve null si no hay cargas
 * ("sin datos ≠ 0%").
 */
function statsDeCargas(lista: Carga[]) {
  if (!lista.length) return null
  let ocupadas = 0
  let capTotal = 0
  const pcts: number[] = []
  for (const c of lista) {
    const cap = Number((c as any).CapacidadHab ?? c.capacidadHab ?? 0)
    const p = Number((c as any).PorcentajeOH ?? c.porcentajeOH ?? 0)
    ocupadas += (cap * p) / 100
    capTotal += cap
    pcts.push(p)
  }
  const freq: Record<number, number> = {}
  let ohModa = pcts[0]
  let maxFreq = 0
  for (const p of pcts) {
    freq[p] = (freq[p] || 0) + 1
    if (freq[p] > maxFreq) {
      maxFreq = freq[p]
      ohModa = p
    }
  }
  return {
    ohTotal: capTotal > 0 ? parseFloat(((ocupadas / capTotal) * 100).toFixed(1)) : 0,
    ohMin: Math.min(...pcts),
    ohMax: Math.max(...pcts),
    ohModa,
    relevados: lista.length,
  }
}
