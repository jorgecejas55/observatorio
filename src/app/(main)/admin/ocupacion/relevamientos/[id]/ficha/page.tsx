'use client'

/**
 * Ficha técnica de ocupación hotelera — print-friendly A4 APAISADO,
 * de la misma familia visual que los informes-auto (portada, encabezados,
 * paleta, títulos y KPIs compartidos): portada de hoja completa + 3 páginas
 * de datos con encabezado reducido.
 * Se abre desde el detalle de relevamiento. Usar Ctrl+P para exportar PDF.
 */

import { useState, useEffect, use } from 'react'
import {
  EncabezadoPaginaImpresion,
  EncabezadoPantallaDocumento,
  PortadaDocumento,
} from '@/components/informes-auto/vista/Encabezados'
import { tituloRelevamiento, formatearRango, formatearFecha } from '@/lib/formato-fechas'
import type { IndicadoresRelevamiento } from '@/lib/informes-auto/types'
import {
  BajaActividad,
  DistribucionRangos,
  IndicadoresGlobales,
  NotaMetodologicaFicha,
  OhPorGrupo,
  PicosPorGrupo,
} from './_components/SeccionesFicha'

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
        <p className="text-text-secondary">Cargando ficha técnica...</p>
      </div>
    )
  }

  if (!rel || !ind) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-text-secondary">No se pudieron cargar los datos de la ficha.</p>
        <a href={`/admin/ocupacion/relevamientos/${id}`} className="text-primary text-sm hover:underline">
          ← Volver al detalle
        </a>
      </div>
    )
  }

  const titulo = tituloRelevamiento(rel.tipo, rel.nombre, rel.fechaInicio)
  const rango = formatearRango(rel.fechaInicio, rel.fechaFin)
  const tituloPaginas = `Ficha Técnica de Ocupación Hotelera — ${titulo}`

  return (
    <>
      {/* Acciones (solo pantalla): barra estática para no tapar el encabezado en el celular */}
      <div className="no-print max-w-5xl mx-auto flex flex-wrap justify-end gap-2 mb-4">
        <a href={`/admin/ocupacion/relevamientos/${id}`} className="btn-outline min-h-[44px]">
          ← Volver al detalle
        </a>
        <button type="button" onClick={() => window.print()} className="btn-primary min-h-[44px]">
          <i className="fa-solid fa-print" aria-hidden="true" />
          Imprimir / PDF
        </button>
      </div>

      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-8 mb-8 print:shadow-none print:border-0 print:rounded-none print:p-0 print:m-0 print:max-w-none print:w-full">
        <PortadaDocumento etiqueta="Ficha Técnica" titulo="Ocupación Hotelera" subtitulo={titulo} rango={rango} />

        {/* ── PÁGINA 1: identificación + indicadores globales ────────────── */}
        <div className="pagina-1">
          <EncabezadoPaginaImpresion titulo={tituloPaginas} />
          <EncabezadoPantallaDocumento titulo="Ficha Técnica de Ocupación Hotelera" rango={rango} />

          <div className="mb-6 print:mb-4 evitar-corte">
            <h2 className="text-base font-bold text-text-primary mb-2">{titulo}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-3 gap-x-6 gap-y-1 text-sm text-text-primary">
              <p><span className="text-text-secondary">Tipo:</span> {rel.tipo}</p>
              <p><span className="text-text-secondary">Período:</span> {rango}</p>
              <p><span className="text-text-secondary">Estado:</span> CERRADO</p>
              <p><span className="text-text-secondary">Fecha de cierre:</span> {formatearFecha(rel.fechaCierre)}</p>
              <p className="break-words"><span className="text-text-secondary">Cerrado por:</span> {rel.usuarioCierre || '—'}</p>
              <p><span className="text-text-secondary">Indicadores calculados:</span> {formatearFecha(ind.fechaCalculo)}</p>
            </div>
          </div>

          <IndicadoresGlobales ind={ind} />
          <BajaActividad ind={ind} />
        </div>

        {/* ── PÁGINA 2: OH por grupo tipo-categoría ───────────────────────── */}
        <div className="pagina-2 mt-8 print:mt-0">
          <EncabezadoPaginaImpresion titulo={tituloPaginas} />
          <OhPorGrupo ind={ind} />
        </div>

        {/* ── PÁGINA 3: distribución + picos | nota metodológica ─────────── */}
        <div className="pagina-3 mt-8 print:mt-0">
          <EncabezadoPaginaImpresion titulo={tituloPaginas} />
          <div className="grid grid-cols-1 print:grid-cols-2 gap-6 print:gap-8">
            <div>
              <DistribucionRangos ind={ind} />
              <PicosPorGrupo ind={ind} />
            </div>
            <NotaMetodologicaFicha ind={ind} />
          </div>
        </div>
      </div>
    </>
  )
}
