'use client'

/**
 * Ficha técnica de ocupación hotelera — página print-friendly A4 vertical.
 * Se abre desde el detalle de relevamiento. Usar Ctrl+P para exportar PDF.
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
  usuarioCierre: string
  fechaCierre: string
  cantidadRelevados: number
}

export default function FichaTecnicaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [rel, setRel] = useState<Relevamiento | null>(null)
  const [ind, setInd] = useState<IndicadoresRelevamiento | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [resRel, resInd] = await Promise.all([
          fetch('/api/ocupacion/relevamientos?'),
          fetch(`/api/ocupacion/relevamientos/${id}/indicadores`),
        ])

        if (resRel.ok) {
          const list = await resRel.json()
          const found = (list.data || []).find((r: any) => String(r.id) === String(id))
          if (found) setRel(found)
        }

        if (resInd.ok) {
          const json = await resInd.json()
          if (json.success && json.data?.datosJSON) {
            setInd(json.data.datosJSON)
          } else if (json.data?.global) {
            setInd(json.data as unknown as IndicadoresRelevamiento)
          }
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Cargando ficha técnica...</p>
      </div>
    )
  }

  if (!rel || !ind) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-gray-500">No se pudieron cargar los datos de la ficha.</p>
        <a href={`/admin/ocupacion/relevamientos/${id}`} className="text-accent text-sm hover:underline">
          ← Volver al detalle
        </a>
      </div>
    )
  }

  const hoy = new Date().toLocaleDateString('es-AR')

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          html, body, main, #__next, [data-app-root] { background: white !important; }
          header[data-app-header], aside[data-app-sidebar], nav[data-app-nav],
          .no-print, nav, .sidebar, [class*="sidebar"], [class*="Sidebar"] { display: none !important; }
          main { margin-left: 0 !important; padding-top: 0 !important; background: white !important; }
          .card { box-shadow: none !important; border: 1px solid #e5e7eb !important; }
          .page-break { page-break-after: always; }
          .bg-amber-50 { background-color: #fffbeb !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .bg-green-50 { background-color: #f0fdf4 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .bg-red-50 { background-color: #fef2f2 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .bg-gray-50, .bg-gray-100, [class*="bg-gray-"] { background: white !important; }
          @page { size: A4 portrait; margin: 1.5cm; }
        }
      `}</style>

      {/* Botón imprimir (solo pantalla) */}
      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        <a
          href={`/admin/ocupacion/relevamientos/${id}`}
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm shadow-sm hover:bg-gray-50"
        >
          ← Volver al detalle
        </a>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-accent text-white rounded-lg text-sm shadow-sm hover:bg-accent/90"
        >
          <i className="fas fa-print mr-1.5" />
          Imprimir / PDF
        </button>
      </div>

      {/* ── PÁGINA 1 ─────────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto py-8 print:py-0">
        {/* Encabezado institucional */}
        <div className="text-center mb-6 pb-4 border-b-2 border-gray-300">
          <div className="flex items-center justify-between mb-4">
            <img src="/logos/secretaria.png" alt="Secretaría" className="h-12 print:h-16 object-contain" />
            <img src="/logos/marca-destino.png" alt="Marca Destino" className="h-12 print:h-16 object-contain" />
            <img src="/logos/observatorio.png" alt="Observatorio" className="h-12 print:h-16 object-contain" />
          </div>
          <h1 className="text-lg font-bold text-gray-800">Ficha Técnica de Ocupación Hotelera</h1>
          <p className="text-xs text-gray-500 mt-1">Municipalidad de la Capital — Secretaría de Turismo y Desarrollo Económico</p>
        </div>

        {/* Identificación */}
        <div className="mb-5">
          <h2 className="text-base font-bold text-gray-800 mb-2">
            {tituloRelevamiento(rel.tipo, rel.nombre, rel.fechaInicio)}
          </h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <p><span className="text-gray-500">Tipo:</span> {rel.tipo}</p>
            <p><span className="text-gray-500">Período:</span> {formatearRango(rel.fechaInicio, rel.fechaFin)}</p>
            <p><span className="text-gray-500">Estado:</span> CERRADO</p>
            <p><span className="text-gray-500">Fecha de cierre:</span> {formatearFecha(rel.fechaCierre)}</p>
            <p><span className="text-gray-500">Cerrado por:</span> {rel.usuarioCierre || '—'}</p>
            <p><span className="text-gray-500">Indicadores calculados:</span> {ind.fechaCalculo}</p>
          </div>
        </div>

        {/* KPIs globales */}
        <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Indicadores globales</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <KpiFicha label="OH ponderada (oficial)" valor={`${ind.global.mediaPonderada}%`} />
          <KpiFicha label="Media simple" valor={`${ind.global.mediaSimple}%`} />
          <KpiFicha label="Mediana" valor={`${ind.global.mediana}%`} />
          <KpiFicha label={`Media recortada`} valor={`${ind.global.mediaRecortada}%`} nota={ind.global.nRecortados > 0 ? `(−${ind.global.nRecortados})` : ''} />
          <KpiFicha label="Desvío estándar" valor={`${ind.global.desvioEstandar}`} />
          <KpiFicha label="Coef. variación" valor={`${ind.global.coeficienteVariacion}%`} />
          <KpiFicha label="Mínimo" valor={`${ind.global.minimo}%`} />
          <KpiFicha label="Máximo" valor={`${ind.global.maximo}%`} />
          <KpiFicha label="Moda" valor={`${ind.global.moda}%`} />
          <KpiFicha label="Cantidad relevados" valor={`${ind.global.n}`} />
          {ind.cobertura !== null && (
            <KpiFicha label="Cobertura" valor={`${ind.cobertura}%`} nota={`${ind.global.n} / ${ind.totalAlojamientosActivos}`} />
          )}
          <KpiFicha label="Hab. relevadas" valor={`${ind.habitacionesRelevadas}`} />
        </div>

        {/* Baja actividad */}
        <div className={`p-4 rounded-lg border mb-5 ${
          ind.bajaActividad.porcentaje > 30 ? 'bg-red-50 border-red-200' :
          ind.bajaActividad.porcentaje > 0 ? 'bg-amber-50 border-amber-200' :
          'bg-green-50 border-green-200'
        }`}>
          <h3 className="text-sm font-bold text-gray-700 mb-1">Indicador de baja actividad comercial</h3>
          <p className="text-base">
            <strong>{ind.bajaActividad.cantidad}</strong> de {ind.global.n} establecimientos ({ind.bajaActividad.porcentaje}%)
            registraron ocupación inferior al {ind.bajaActividad.umbral}%.
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Indicador de diagnóstico de gestión para la Asociación de Hoteles. No revela identidades.
            Indicador de diagnóstico de gestión. No revela identidades.
          </p>
        </div>

        {/* Tabla por grupo */}
        <h3 className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">OH por grupo tipo-categoría</h3>
        <table className="w-full text-sm mb-5">
          <thead>
            <tr className="border-b-2 border-gray-300 text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="pb-1 font-medium">Grupo</th>
              <th className="pb-1 font-medium text-right">OH ponderada</th>
              <th className="pb-1 font-medium text-right">Mín</th>
              <th className="pb-1 font-medium text-right">Máx</th>
              <th className="pb-1 font-medium text-right">n</th>
              <th className="pb-1 font-medium text-right">Participación</th>
            </tr>
          </thead>
          <tbody>
            {ind.porGrupo.map((g) => (
              <tr key={g.tipoCategoria} className="border-b border-gray-100">
                <td className="py-1.5 text-gray-700">{g.tipoCategoria}</td>
                <td className="py-1.5 text-right font-semibold text-gray-800">
                  {g.estadisticas.mediaPonderada > 0 ? `${g.estadisticas.mediaPonderada}%` : '—'}
                </td>
                <td className="py-1.5 text-right text-gray-600">{g.estadisticas.minimo}%</td>
                <td className="py-1.5 text-right text-gray-600">{g.estadisticas.maximo}%</td>
                <td className="py-1.5 text-right text-gray-600">{g.estadisticas.n}</td>
                <td className="py-1.5 text-right text-gray-500 text-xs">{g.participacionHabitaciones}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-gray-400 italic">Solo se muestran los grupos con datos. Sin datos ≠ 0%.</p>
      </div>

      {/* ── SALTO DE PÁGINA ──────────────────────────────────────────────── */}
      <div className="page-break" />

      {/* ── PÁGINA 2 ─────────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto py-8 print:py-0">
        {/* Distribución por rangos */}
        <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Distribución por rangos de ocupación</h3>
        <div className="space-y-2 mb-5">
          {ind.distribucionRangos.rangos.map((r) => (
            <div key={r.etiqueta} className="flex items-center gap-3">
              <span className="text-sm text-gray-600 w-20">{r.etiqueta}</span>
              <div className="flex-1 bg-gray-200 h-5 rounded">
                <div
                  className={`h-full rounded ${
                    r.desde >= 75 ? 'bg-green-500' :
                    r.desde >= 50 ? 'bg-blue-500' :
                    r.desde >= 25 ? 'bg-amber-500' :
                    'bg-red-400'
                  }`}
                  style={{ width: `${Math.max(r.porcentaje, 2)}%`, printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
                />
              </div>
              <span className="text-sm text-gray-700 w-24 text-right">{r.cantidad} ({r.porcentaje}%)</span>
            </div>
          ))}
        </div>

        {/* Picos */}
        {ind.picos.porTipo.length > 0 && (
          <>
            <h3 className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Picos de ocupación por grupo</h3>
            {ind.picos.picoMaximo && (
              <p className="text-xs text-gray-500 mb-2">
                Máximo global: <strong>{ind.picos.picoMaximo.tipoCategoria}</strong> ({ind.picos.picoMaximo.ohMaximo}%)
              </p>
            )}
            <table className="w-full text-sm mb-5">
              <thead>
                <tr className="border-b-2 border-gray-300 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="pb-1 font-medium">Grupo</th>
                  <th className="pb-1 font-medium text-right">OH máximo</th>
                  <th className="pb-1 font-medium text-right">Establecimientos</th>
                </tr>
              </thead>
              <tbody>
                {ind.picos.porTipo.map((p) => (
                  <tr key={p.tipoCategoria} className="border-b border-gray-100">
                    <td className="py-1.5 text-gray-700">{p.tipoCategoria}</td>
                    <td className="py-1.5 text-right font-semibold text-gray-800">{p.ohMaximo}%</td>
                    <td className="py-1.5 text-right text-gray-600">{p.cantidadAlojamientos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Nota metodológica */}
        <div className="mt-6 pt-4 border-t border-gray-300">
          <h3 className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Nota metodológica</h3>
          <div className="text-xs text-gray-600 space-y-1.5 leading-relaxed">
            <p><strong>OH ponderada (oficial):</strong> porcentaje de habitaciones ocupadas sobre el total de habitaciones relevadas, ponderado por la capacidad de cada establecimiento. Incluye todos los datos registrados.</p>
            <p><strong>Media simple:</strong> promedio aritmético de los porcentajes de ocupación de cada establecimiento, sin ponderar por capacidad.</p>
            <p><strong>Mediana:</strong> percentil 50 de los porcentajes de ocupación. Robusta ante valores extremos.</p>
            <p><strong>Media recortada:</strong> media excluyendo valores fuera del rango media ± 2,5 desvíos estándar (criterio simétrico y automático, consistente con el cálculo de estadía promedio). El número de excluidos se informa entre paréntesis. Si el recorte excluye todas las observaciones, se reporta la media simple.</p>
            <p><strong>Baja actividad comercial:</strong> indicador propio del Observatorio. Porcentaje de establecimientos relevados cuya ocupación es estrictamente inferior al umbral del {ind.bajaActividad.umbral}%. Refleja establecimientos con actividad comercial reducida. Este indicador no revela la identidad de los establecimientos.</p>
            <p><strong>Sin datos ≠ 0%:</strong> los establecimientos sin carga explícita no participan en los cálculos. La ausencia de carga no se interpreta como ocupación 0%.</p>
            <p><strong>Anonimato:</strong> por regla del Observatorio, los indicadores desagregados por grupo no exponen nombres de establecimientos individuales.</p>
            <p className="mt-2 text-gray-400">Documento generado el {hoy} por el Observatorio de Turismo Municipal de San Fernando del Valle de Catamarca. Uso interno y para la Asociación de Hoteles.</p>
          </div>
        </div>
      </div>
    </>
  )
}

function KpiFicha({ label, valor, nota }: { label: string; valor: string; nota?: string }) {
  return (
    <div className="card p-3 text-center">
      <p className="text-lg font-bold text-gray-800">
        {valor}
        {nota && <span className="text-xs text-gray-400 ml-0.5">{nota}</span>}
      </p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}
