'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  AccAtractivoDirectus,
  AccOpcion,
  Dimension,
  DIMENSIONES,
  calcularCumplimiento,
  calcularCumplimientoGeneral,
  nivelAccesibilidad,
} from '@/lib/accesibilidad'

const DIRECTUS_ASSETS = 'https://turismo.apps.cc.gob.ar/assets'

// ─── Helpers UI ───────────────────────────────────────────────────────────────

function chipOpcion(val: AccOpcion) {
  if (val === 'Sí')        return { icon: 'fa-check', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' }
  if (val === 'No')        return { icon: 'fa-xmark', cls: 'bg-red-50 text-red-600 border border-red-200' }
  if (val === 'No aplica') return { icon: 'fa-minus', cls: 'bg-gray-50 text-gray-400 border border-gray-200' }
  return                          { icon: 'fa-question', cls: 'bg-gray-50 text-gray-400 border border-gray-200' }
}

function Indicador({ label, val }: { label: string; val: AccOpcion }) {
  const { icon, cls } = chipOpcion(val)
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs ${cls}`}>
        <i className={`fa-solid ${icon}`} />
      </span>
      <span className="text-sm text-text-primary">{label}</span>
    </div>
  )
}

function GaleriaFotos({ ids, titulo }: { ids: string[]; titulo: string }) {
  if (ids.length === 0) return null
  return (
    <div className="mt-3 no-print">
      <p className="text-xs font-medium text-text-secondary mb-2">
        <i className="fa-solid fa-images mr-1" />
        {titulo}
      </p>
      <div className="flex gap-2 flex-wrap">
        {ids.map(id => (
          <a
            key={id}
            href={`${DIRECTUS_ASSETS}/${id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-20 h-20 rounded-lg overflow-hidden border border-gray-200 hover:border-primary/40 transition-colors flex-shrink-0"
          >
            <img
              src={`${DIRECTUS_ASSETS}/${id}?width=160&height=160&fit=cover`}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </a>
        ))}
      </div>
    </div>
  )
}

function BarraCumplimiento({ pct, color }: { pct: number | null; color: string }) {
  return (
    <div className="flex items-center gap-3 mt-1 mb-3">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        {pct !== null && (
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        )}
      </div>
      <span className="text-sm font-bold tabular-nums w-10 text-right" style={{ color }}>
        {pct !== null ? `${pct}%` : '—'}
      </span>
    </div>
  )
}

function SeccionDimension({
  dim,
  registro,
}: {
  dim: Dimension
  registro: AccAtractivoDirectus
}) {
  const pct = calcularCumplimiento(registro, dim)
  const nivel = nivelAccesibilidad(pct)
  const fotosKey = dim.fotosKey as keyof AccAtractivoDirectus
  const fotos = (registro[fotosKey] as { directus_files_id: string }[] | undefined) ?? []
  const fotoIds = fotos.map(f => f.directus_files_id).filter(Boolean)

  return (
    <div className="card overflow-hidden" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
      <div className="px-5 py-3 flex items-center gap-3 border-b border-gray-100" style={{ backgroundColor: `${dim.color}10` }}>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0"
          style={{ backgroundColor: dim.color }}
        >
          <i className={`fa-solid ${dim.icon}`} />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-text-primary">{dim.label}</h3>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${nivel.bg} ${nivel.textColor}`}>
          {nivel.label}
        </span>
      </div>

      <div className="px-5 pt-3 pb-4">
        <BarraCumplimiento pct={pct} color={dim.color} />
        <div className="divide-y divide-gray-50">
          {dim.campos.map((campo, i) => (
            <Indicador
              key={campo as string}
              label={dim.labels[i]}
              val={registro[campo] as AccOpcion}
            />
          ))}
        </div>
        <GaleriaFotos ids={fotoIds} titulo="Fotos de evidencia" />
      </div>
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function AccesibilidadDetallePage() {
  const { id } = useParams<{ id: string }>()
  const [registro, setRegistro] = useState<AccAtractivoDirectus | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/accesibilidad/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.data) setRegistro(data.data)
        else setError(data.error ?? 'No se encontró el registro')
      })
      .catch(() => setError('Error al conectar con el servidor'))
      .finally(() => setCargando(false))
  }, [id])

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-text-secondary">
          <i className="fa-solid fa-spinner fa-spin text-3xl text-primary mb-4 block" />
          <p>Cargando detalle...</p>
        </div>
      </div>
    )
  }

  if (error || !registro) {
    return (
      <div className="card p-8 text-center">
        <i className="fa-solid fa-triangle-exclamation text-red-500 text-3xl mb-4 block" />
        <p className="text-red-700 font-medium">{error ?? 'Registro no encontrado'}</p>
        <Link href="/accesibilidad" className="btn-ghost text-primary mt-4 text-sm inline-flex items-center gap-2">
          <i className="fa-solid fa-arrow-left" /> Volver al inventario
        </Link>
      </div>
    )
  }

  const atractivo = registro.atractivo_id
  const fotoId = atractivo?.foto_principal?.id
  const pctGeneral = calcularCumplimientoGeneral(registro)
  const nivelGeneral = nivelAccesibilidad(pctGeneral)

  const tieneValoracion = registro.val_movilidad || registro.val_visual ||
    registro.val_auditiva || registro.val_cognitiva || registro.val_general

  const fecha = registro.date_created
    ? new Date(registro.date_created).toLocaleDateString('es-AR', {
        day: '2-digit', month: 'long', year: 'numeric',
      })
    : null

  const ahora = new Date()
  const fechaGeneracion = ahora.toLocaleDateString('es-AR', {
    day: '2-digit', month: 'long', year: 'numeric',
  }) + ' ' + ahora.toLocaleTimeString('es-AR', {
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="max-w-3xl">
      {/* ── Print CSS ── */}
      <style>{`
        @media print {
          header, aside { display: none !important; }
          main { margin-left: 0 !important; padding-top: 0 !important; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .card { box-shadow: none !important; border: 1px solid #e5e7eb !important; }
          body { font-size: 10pt; color: #111; }
          @page { margin: 1.5cm; size: A4 portrait; }
        }
        .print-only { display: none; }
      `}</style>

      {/* ── Encabezado institucional (solo print) ── */}
      <div className="print-only" style={{ borderBottom: '2px solid #374151', paddingBottom: '8px', marginBottom: '16px' }}>
        <p style={{ fontWeight: 700, fontSize: '10pt', margin: 0 }}>
          Municipalidad de la Capital · Secretaría de Turismo y Desarrollo Económico
        </p>
        <p style={{ fontSize: '9pt', margin: '2px 0 0 0', color: '#374151' }}>
          Observatorio Municipal de Turismo — Ficha de Accesibilidad Turística
        </p>
        <p style={{ fontSize: '8pt', margin: '4px 0 0 0', color: '#6b7280' }}>
          Generado: {fechaGeneracion}
        </p>
      </div>

      {/* ── Nav (pantalla) ── */}
      <div className="no-print flex items-center justify-between mb-5">
        <Link
          href="/accesibilidad"
          className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-primary transition-colors"
        >
          <i className="fa-solid fa-arrow-left text-xs" />
          Volver al inventario
        </Link>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-text-secondary hover:text-primary hover:border-primary/40 text-sm font-medium transition-colors"
        >
          <i className="fa-solid fa-print" />
          Imprimir / PDF
        </button>
      </div>

      {/* ── Header del atractivo ── */}
      <div className="card overflow-hidden mb-5" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        {fotoId && (
          <div className="h-48 overflow-hidden no-print">
            <img
              src={`${DIRECTUS_ASSETS}/${fotoId}?width=800&height=192&fit=cover`}
              alt={atractivo.nombre}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-xl font-bold text-text-primary">{atractivo?.nombre}</h2>
              {atractivo?.tipo_atractivos && (
                <p className="text-sm text-text-secondary mt-0.5">{atractivo.tipo_atractivos}</p>
              )}
              <div className="flex flex-wrap gap-2 mt-2 text-xs text-text-secondary">
                {registro.Estado && (
                  <span className="flex items-center gap-1">
                    <i className="fa-solid fa-circle text-[6px]" />
                    {registro.Estado}
                  </span>
                )}
                {registro.metodo_relevamiento && (
                  <span className="flex items-center gap-1">
                    <i className="fa-solid fa-clipboard-check text-[10px]" />
                    {registro.metodo_relevamiento}
                  </span>
                )}
                {fecha && (
                  <span className="flex items-center gap-1">
                    <i className="fa-solid fa-calendar text-[10px]" />
                    {fecha}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <span className="text-4xl font-bold tabular-nums" style={{ color: nivelGeneral.color }}>
                {pctGeneral !== null ? `${pctGeneral}%` : '—'}
              </span>
              <div className="mt-1">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${nivelGeneral.bg} ${nivelGeneral.textColor}`}>
                  {nivelGeneral.label}
                </span>
              </div>
              <p className="text-[10px] text-text-secondary mt-1">Cumplimiento general</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Resumen por dimensión ── */}
      <div className="card p-5 mb-5" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        <h3 className="text-sm font-semibold text-text-primary mb-4">Resumen por dimensión</h3>
        <div className="flex flex-col gap-2">
          {DIMENSIONES.map(dim => {
            const pct = calcularCumplimiento(registro, dim)
            const nivel = nivelAccesibilidad(pct)
            return (
              <div key={dim.key} className="flex items-center gap-3">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] flex-shrink-0"
                  style={{ backgroundColor: dim.color }}
                >
                  <i className={`fa-solid ${dim.icon}`} />
                </div>
                <span className="text-sm text-text-secondary w-36 shrink-0">{dim.label}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  {pct !== null && (
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: dim.color }}
                    />
                  )}
                </div>
                <span className="text-sm font-bold tabular-nums w-10 text-right" style={{ color: nivel.color }}>
                  {pct !== null ? `${pct}%` : '—'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Detalle por dimensión ── */}
      <div className="flex flex-col gap-4 mb-5">
        {DIMENSIONES.map(dim => (
          <SeccionDimension key={dim.key} dim={dim} registro={registro} />
        ))}
      </div>

      {/* ── Valoración técnica ── */}
      {tieneValoracion && (
        <div className="card p-5 mb-5" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <h3 className="text-sm font-semibold text-text-primary mb-3">
            <i className="fa-solid fa-star-half-stroke text-amber-500 mr-2" />
            Valoración técnica
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { key: 'val_movilidad', label: 'Movilidad', icon: 'fa-wheelchair' },
              { key: 'val_visual', label: 'Visual', icon: 'fa-eye' },
              { key: 'val_auditiva', label: 'Auditiva', icon: 'fa-ear-deaf' },
              { key: 'val_cognitiva', label: 'Cognitiva', icon: 'fa-brain' },
              { key: 'val_general', label: 'General', icon: 'fa-star' },
            ].map(({ key, label, icon }) => {
              const val = registro[key as keyof AccAtractivoDirectus] as string | null
              return (
                <div key={key} className="text-center p-3 rounded-lg bg-gray-50">
                  <i className={`fa-solid ${icon} text-text-secondary mb-1 block text-sm`} />
                  <p className="text-xs text-text-secondary">{label}</p>
                  <p className="text-sm font-semibold text-text-primary mt-0.5">{val ?? '—'}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Fotos generales (solo pantalla) ── */}
      {(registro.foto_acceso || registro.foto_bano) && (
        <div className="card p-5 mb-5 no-print">
          <h3 className="text-sm font-semibold text-text-primary mb-3">
            <i className="fa-solid fa-camera text-text-secondary mr-2" />
            Fotos generales
          </h3>
          <div className="flex gap-3">
            {registro.foto_acceso && (
              <div>
                <p className="text-xs text-text-secondary mb-1">Acceso</p>
                <a href={`${DIRECTUS_ASSETS}/${registro.foto_acceso}`} target="_blank" rel="noopener noreferrer">
                  <img
                    src={`${DIRECTUS_ASSETS}/${registro.foto_acceso}?width=200&height=150&fit=cover`}
                    alt="Foto acceso"
                    className="w-32 h-24 object-cover rounded-lg border border-gray-200 hover:opacity-90 transition-opacity"
                  />
                </a>
              </div>
            )}
            {registro.foto_bano && (
              <div>
                <p className="text-xs text-text-secondary mb-1">Baño</p>
                <a href={`${DIRECTUS_ASSETS}/${registro.foto_bano}`} target="_blank" rel="noopener noreferrer">
                  <img
                    src={`${DIRECTUS_ASSETS}/${registro.foto_bano}?width=200&height=150&fit=cover`}
                    alt="Foto baño"
                    className="w-32 h-24 object-cover rounded-lg border border-gray-200 hover:opacity-90 transition-opacity"
                  />
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Observaciones ── */}
      {registro.observaciones && (
        <div className="card p-5 mb-5" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <h3 className="text-sm font-semibold text-text-primary mb-2">
            <i className="fa-solid fa-note-sticky text-text-secondary mr-2" />
            Observaciones
          </h3>
          <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
            {registro.observaciones}
          </p>
        </div>
      )}
    </div>
  )
}
