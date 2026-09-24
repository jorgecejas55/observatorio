'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { tieneAcceso } from '@/lib/permisos'
import { RESPUESTA_FAVORABLE, porcentajeDe, porcentajeSobreRespondentes, totalRespuestas, type RespuestaSiNo } from '@/lib/indicadores-perfil'
import { formatearFechaLarga, tituloRelevamiento } from '@/lib/formato-fechas'
import type {
  SugerenciaHistorial,
  RelevamientoOH,
  InformeFindeCompleto,
  RegistroMaestro,
  TipoInforme,
} from '@/lib/informes-auto/types'

// ── Estados del flujo ─────────────────────────────────────────────────────────

type PasoEstado = 'idle' | 'cargando' | 'seleccionado' | 'calculando' | 'revisando' | 'confirmando' | 'completado' | 'error'

// ── Helpers ───────────────────────────────────────────────────────────────────

// Acepta tanto fechas texto yyyy-MM-dd (relevamientos) como ISO completo
// que devuelve el GAS para informes guardados (evita "Invalid Date").
function formatearFecha(fecha: string): string {
  if (!fecha) return ''
  return formatearFechaLarga(fecha)
}

function calcularDuracion(inicio: string, fin: string): number {
  const start = new Date(inicio + 'T00:00:00-03:00')
  const end = new Date(fin + 'T00:00:00-03:00')
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
}

const ETIQUETAS_TIPO: Record<TipoInforme, string> = {
  FSL: 'Fin de semana largo',
  EVENTO: 'Evento',
  MENSUAL: 'Mensual',
}

/** Valor especial del selector de comparativas: omitir el bloque comparativo */
const COMPARATIVA_NINGUNA = 'NINGUNA'

interface InformeGuardado {
  id: string
  slug: string
  nombre: string
  fechaInicio: string
  fechaFin: string
  fechaGeneracion: string
  usuarioGenerador: string
  estado: string
  idInformePublico?: string
}

export default function InformesAutoPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // ── Lista de relevamientos ──
  const [relevamientos, setRelevamientos] = useState<RelevamientoOH[]>([])
  const [cargandoRelevamientos, setCargandoRelevamientos] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')

  // ── Relevamiento seleccionado ──
  const [relevamientoId, setRelevamientoId] = useState('')
  const [nombre, setNombre] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [tipoInforme, setTipoInforme] = useState<TipoInforme>('FSL')

  // ── Datos manuales ──
  const [gastoDiarioTuristas, setGastoDiarioTuristas] = useState<number>(0)
  const [gastoDiarioExcursionistas, setGastoDiarioExcursionistas] = useState<number>(0)
  const [porcentajeExcursionistas, setPorcentajeExcursionistas] = useState<number>(0)

  // ── Registros históricos (planilla maestra) para comparativas ──
  const [registrosMaestros, setRegistrosMaestros] = useState<RegistroMaestro[]>([])
  const [comparativaUltimoFindeId, setComparativaUltimoFindeId] = useState('')
  const [comparativaAnioAnteriorId, setComparativaAnioAnteriorId] = useState('')

  // ── Estado ──
  const [paso, setPaso] = useState<PasoEstado>('idle')
  const [sugerenciaHistorial, setSugerenciaHistorial] = useState<SugerenciaHistorial | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  // ── Informe calculado, pendiente de revisión/confirmación ──
  const [informePreview, setInformePreview] = useState<InformeFindeCompleto | null>(null)

  // ── Datos base reales (plazas + estadía) para la estimación de impacto en vivo ──
  const [datosBase, setDatosBase] = useState<{ plazasDisponibles: number; estadiaPromedio: number; nEncuestas: number } | null>(null)
  const [cargandoDatosBase, setCargandoDatosBase] = useState(false)

  // ── Informes generados ──
  const [informesGuardados, setInformesGuardados] = useState<InformeGuardado[]>([])
  const [cargandoGuardados, setCargandoGuardados] = useState(true)

  // Cargar informes guardados al montar
  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/informes-auto')
      .then(async res => {
        if (!res.ok) return
        const json = await res.json()
        setInformesGuardados(json.data ?? [])
      })
      .catch(() => {})
      .finally(() => setCargandoGuardados(false))
  }, [status])

  // Cargar registros de la planilla maestra (para selectores de comparativas)
  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/informes-auto/historicos')
      .then(async res => {
        if (!res.ok) return
        const json = await res.json()
        setRegistrosMaestros(json.data ?? [])
      })
      .catch(() => {})
  }, [status])

  // Sugerencia del último informe DEL MISMO TIPO (gasto diario + % excursionistas)
  useEffect(() => {
    if (status !== 'authenticated') return
    setSugerenciaHistorial(null)
    fetch(`/api/informes-auto/sugerencias?tipo=${tipoInforme}`)
      .then(async res => {
        if (!res.ok) return
        const json = await res.json()
        setSugerenciaHistorial(json.data ?? null)
      })
      .catch(() => {})
  }, [status, tipoInforme])

  // ── Relevamiento seleccionado (derivado) ──
  const relevamientoSeleccionado = useMemo(() => {
    if (!relevamientoId) return null
    return relevamientos.find(r => r.id === relevamientoId) ?? null
  }, [relevamientoId, relevamientos])

  const duracionPeriodo = useMemo(() => {
    if (!fechaInicio || !fechaFin) return 0
    return calcularDuracion(fechaInicio, fechaFin)
  }, [fechaInicio, fechaFin])

  // Registros de la planilla maestra elegibles según tipo de informe
  const registrosComparativa = useMemo(() => {
    const tipoPeriodo = tipoInforme === 'MENSUAL' ? 'MENSUAL' : 'FSL'
    return registrosMaestros.filter(r => r.tipoPeriodo === tipoPeriodo)
  }, [registrosMaestros, tipoInforme])

  const anioInforme = fechaInicio ? Number(fechaInicio.slice(0, 4)) : new Date().getFullYear()
  const registrosMismoAnio = registrosComparativa.filter(r => r.anio === anioInforme)
  const registrosAnioAnterior = registrosComparativa.filter(r => r.anio === anioInforme - 1)
  const registrosAnteriores = registrosComparativa.filter(r => r.anio < anioInforme - 1)

  const etiquetaRegistro = (r: RegistroMaestro) =>
    `${r.nombre} — ${r.anio} — OH: ${r.oh ?? '—'}%${r.visitantes != null ? ` — ${r.visitantes.toLocaleString('es-AR')} visit.` : ''}`

  // ── Cargar relevamientos al montar ──
  useEffect(() => {
    if (status !== 'authenticated') return

    setCargandoRelevamientos(true)
    setErrorCarga('')

    fetch('/api/informes-auto/relevamientos')
      .then(async res => {
        if (res.status === 401 || res.status === 403) {
          redirect('/sin-acceso')
        }
        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          throw new Error(json.error ?? `Error ${res.status}`)
        }
        return res.json()
      })
      .then(json => {
        const data: RelevamientoOH[] = json.data ?? []
        setRelevamientos(data)
        if (data.length === 0) {
          setErrorCarga('No hay relevamientos disponibles en el sistema OH.')
        }
      })
      .catch(err => {
        console.error('Error cargando relevamientos:', err)
        setErrorCarga(err.message ?? 'Error al cargar relevamientos')
      })
      .finally(() => setCargandoRelevamientos(false))
  }, [status])

  // ── Al seleccionar un relevamiento, auto-llenar campos ──
  const handleSeleccionarRelevamiento = useCallback((id: string) => {
    setRelevamientoId(id)
    const rel = relevamientos.find(r => r.id === id)
    if (rel) {
      setNombre(tituloRelevamiento(rel.tipo, rel.nombre, rel.fechaInicio))
      setFechaInicio(rel.fechaInicio)
      setFechaFin(rel.fechaFin)
      // Relevamiento Mensual → informe MENSUAL (automático); Especial → FSL o EVENTO (elige el usuario)
      setTipoInforme(prev => (rel.tipo === 'Mensual' ? 'MENSUAL' : prev === 'MENSUAL' ? 'FSL' : prev))
      setComparativaUltimoFindeId('')
      setComparativaAnioAnteriorId('')
      setPaso('seleccionado')
      setErrorMsg('')
    }
  }, [relevamientos])

  // ── Al fijarse las fechas del período, traer plazas y estadía reales ──
  useEffect(() => {
    if (!fechaInicio || !fechaFin) {
      setDatosBase(null)
      return
    }
    setCargandoDatosBase(true)
    setDatosBase(null)
    fetch(`/api/informes-auto/datos-base?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`)
      .then(async res => {
        if (!res.ok) return null
        const json = await res.json()
        return json.success ? json.data : null
      })
      .then(data => setDatosBase(data))
      .catch(() => setDatosBase(null))
      .finally(() => setCargandoDatosBase(false))
  }, [fechaInicio, fechaFin])

  // ── Cálculo de impacto en tiempo real con datos reales (plazas + estadía) ──
  const impactoEstimado = useMemo(() => {
    if (!relevamientoSeleccionado || !gastoDiarioTuristas || !gastoDiarioExcursionistas || !datosBase) {
      return null
    }

    const { ohTotal } = relevamientoSeleccionado
    const { estadiaPromedio: estadia, plazasDisponibles } = datosBase
    const pernoctesEnOferta = plazasDisponibles * duracionPeriodo
    const pernoctesConsumidos = pernoctesEnOferta * (ohTotal / 100)
    const turistasExactos = estadia > 0 ? pernoctesConsumidos / estadia : 0
    const excursionistasExactos = turistasExactos * (porcentajeExcursionistas / 100)

    const impactoTuristas = pernoctesConsumidos * gastoDiarioTuristas
    const impactoExcursionistas = excursionistasExactos * gastoDiarioExcursionistas
    const impactoTotal = impactoTuristas + impactoExcursionistas

    return {
      turistasAlojados: Math.round(turistasExactos),
      excursionistas: Math.round(excursionistasExactos),
      impactoTuristas: Math.round(impactoTuristas),
      impactoExcursionistas: Math.round(impactoExcursionistas),
      impactoTotal: Math.round(impactoTotal),
    }
  }, [relevamientoSeleccionado, gastoDiarioTuristas, gastoDiarioExcursionistas, porcentajeExcursionistas, duracionPeriodo, datosBase])

  // ── Paso 1: calcular datos e indicadores (sin guardar nada) ──
  const handleCalcular = useCallback(async () => {
    if (!nombre || !fechaInicio || !fechaFin) return
    if (!gastoDiarioTuristas || !gastoDiarioExcursionistas) {
      setErrorMsg('Completá todos los campos de datos manuales')
      return
    }

    setPaso('calculando')
    setErrorMsg('')

    try {
      const res = await fetch('/api/informes-auto/calcular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          relevamientoId,
          tipoInforme,
          nombre,
          fechaInicio,
          fechaFin,
          gastoDiarioTuristas,
          gastoDiarioExcursionistas,
          porcentajeExcursionistas,
          comparativaManualUltimoFinde: comparativaUltimoFindeId || undefined,
          comparativaManualAnioAnterior: comparativaAnioAnteriorId || undefined,
        }),
      })

      const json = await res.json()
      if (!json.success) {
        setPaso('error')
        setErrorMsg(json.error ?? 'Error al calcular el informe')
        return
      }

      setInformePreview(json.data)
      setPaso('revisando')
    } catch {
      setPaso('error')
      setErrorMsg('Error de conexión al calcular el informe')
    }
  }, [relevamientoId, tipoInforme, nombre, fechaInicio, fechaFin, gastoDiarioTuristas, gastoDiarioExcursionistas, porcentajeExcursionistas, comparativaUltimoFindeId, comparativaAnioAnteriorId])

  // ── Paso 2: confirmar — recién acá se guarda y se empuja a la serie histórica ──
  const handleConfirmar = useCallback(async () => {
    if (!informePreview) return

    setPaso('confirmando')
    setErrorMsg('')

    try {
      const res = await fetch('/api/informes-auto/confirmar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ informe: informePreview }),
      })

      const json = await res.json()
      if (!json.success) {
        setPaso('revisando')
        setErrorMsg(json.error ?? 'Error al confirmar el informe')
        return
      }

      const informe: InformeFindeCompleto = json.data
      sessionStorage.setItem(`informe_${informe.id}`, JSON.stringify(informe))
      setPaso('completado')
      router.push(`/admin/informes-auto/${informe.id}`)
    } catch {
      setPaso('revisando')
      setErrorMsg('Error de conexión al confirmar el informe')
    }
  }, [informePreview, router])

  // ── Volver del paso de revisión a editar los datos de entrada ──
  const handleVolverAEditar = useCallback(() => {
    setInformePreview(null)
    setPaso('seleccionado')
    setErrorMsg('')
  }, [])

  // ── Verificación de acceso ──
  if (status === 'loading') {
    return (
      <div className="animate-pulse space-y-4 p-6">
        <div className="h-8 w-64 bg-gray-200 rounded" />
        <div className="h-96 bg-gray-200 rounded-xl" />
      </div>
    )
  }

  if (!session?.user) redirect('/login')
  if (!tieneAcceso(session.user, 'informes-auto')) redirect('/sin-acceso')

  return (
    <div className="max-w-5xl mx-auto">
      {/* ── Encabezado ── */}
      <div className="mb-6">
        <h2 className="section-title mb-1">
          <i className="fa-solid fa-robot text-primary mr-2" />
          Agente de Informes — Ocupación Hotelera
        </h2>
        <p className="text-text-secondary text-sm">
          Seleccioná un relevamiento del sistema de Ocupación Hotelera para generar automáticamente
          el informe estadístico (fin de semana largo, evento o mensual) con indicadores,
          perfil del visitante e impacto económico.
        </p>
      </div>

      {/* ── Sección 1 — Selección del relevamiento ── */}
      <div className="card p-6 mb-6">
        <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center font-bold">1</span>
          Seleccionar relevamiento
        </h3>

        {cargandoRelevamientos ? (
          <div className="flex items-center gap-2 text-sm text-text-secondary py-4">
            <i className="fa-solid fa-spinner fa-spin text-primary" />
            Cargando relevamientos del sistema OH...
          </div>
        ) : errorCarga ? (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm text-red-600">
              <i className="fa-solid fa-circle-exclamation mr-1.5" />
              {errorCarga}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <>
            <select
              className="input w-full"
              value={relevamientoId}
              onChange={e => handleSeleccionarRelevamiento(e.target.value)}
            >
              <option value="">— Seleccionar un relevamiento —</option>
              {relevamientos.map(r => (
                <option key={r.id} value={r.id}>
                  [{r.tipo}] {tituloRelevamiento(r.tipo, r.nombre, r.fechaInicio)} — {formatearFecha(r.fechaInicio)} al {formatearFecha(r.fechaFin)} — OH: {r.ohTotal}% — {r.estado}
                </option>
              ))}
            </select>

            {relevamientoSeleccionado && (
              <div className="mt-4 p-4 rounded-lg bg-green-50 border border-green-200">
                <div className="flex items-center gap-2 text-green-700 font-semibold text-sm">
                  <i className="fa-solid fa-circle-check" />
                  Relevamiento: {tituloRelevamiento(relevamientoSeleccionado.tipo, relevamientoSeleccionado.nombre, relevamientoSeleccionado.fechaInicio)}
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-xs text-green-600">
                  <span>OH Total: <strong>{relevamientoSeleccionado.ohTotal}%</strong></span>
                  <span>Duración: <strong>{duracionPeriodo} noches</strong></span>
                  <span>Estado: <strong>{relevamientoSeleccionado.estado}</strong></span>
                  <span>Establecimientos: <strong>{relevamientoSeleccionado.cantidadRelevados}</strong></span>
                </div>
                {relevamientoSeleccionado.estado === 'EN_CURSO' && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600">
                    <i className="fa-solid fa-triangle-exclamation" />
                    El relevamiento está EN CURSO — los datos pueden no ser finales.
                  </div>
                )}

                {/* ── Tipo de informe ── */}
                <div className="mt-3 pt-3 border-t border-green-200">
                  <p className="text-xs font-semibold text-green-700 mb-2">Tipo de informe</p>
                  {relevamientoSeleccionado.tipo === 'Mensual' ? (
                    <span className="badge bg-blue-100 text-blue-700 text-xs">
                      <i className="fa-solid fa-calendar mr-1" />
                      MENSUAL (automático — relevamiento mensual)
                    </span>
                  ) : (
                    <div className="flex items-center gap-4">
                      {(['FSL', 'EVENTO'] as TipoInforme[]).map(t => (
                        <label key={t} className="flex items-center gap-1.5 text-xs text-green-700 cursor-pointer">
                          <input
                            type="radio"
                            name="tipoInforme"
                            checked={tipoInforme === t}
                            onChange={() => setTipoInforme(t)}
                          />
                          <span className="font-medium">{ETIQUETAS_TIPO[t]}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Sección 2 — Datos manuales ── */}
      <div className="card p-6 mb-6">
        <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center font-bold">2</span>
          Datos manuales
        </h3>

        {sugerenciaHistorial && (
          <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-700">
            <div className="flex items-center justify-between">
              <p>
                <i className="fa-solid fa-lightbulb mr-1.5" />
                <strong>Sugerencia del último informe {ETIQUETAS_TIPO[tipoInforme].toLowerCase()}:</strong>{' '}
                {sugerenciaHistorial.evento} ({sugerenciaHistorial.anio})
              </p>
              <button
                onClick={() => {
                  setGastoDiarioTuristas(sugerenciaHistorial.gastoDiarioTuristas)
                  setGastoDiarioExcursionistas(sugerenciaHistorial.gastoDiarioExcursionistas)
                  if (sugerenciaHistorial.porcentajeExcursionistas != null) {
                    setPorcentajeExcursionistas(sugerenciaHistorial.porcentajeExcursionistas)
                  }
                }}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold whitespace-nowrap ml-3"
              >
                <i className="fa-solid fa-copy mr-1" />
                Usar sugerencias
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">
              Gasto diario turistas (ARS)
              {sugerenciaHistorial && (
                <button
                  onClick={() => setGastoDiarioTuristas(sugerenciaHistorial.gastoDiarioTuristas)}
                  className="ml-2 text-xs text-primary hover:underline"
                >
                  Sug: ${sugerenciaHistorial.gastoDiarioTuristas?.toLocaleString('es-AR')}
                </button>
              )}
            </label>
            <input
              type="number"
              className="input"
              placeholder="Ej: 157720"
              value={gastoDiarioTuristas || ''}
              onChange={e => setGastoDiarioTuristas(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label">
              Gasto diario excursionistas (ARS)
              {sugerenciaHistorial && (
                <button
                  onClick={() => setGastoDiarioExcursionistas(sugerenciaHistorial.gastoDiarioExcursionistas)}
                  className="ml-2 text-xs text-primary hover:underline"
                >
                  Sug: ${sugerenciaHistorial.gastoDiarioExcursionistas?.toLocaleString('es-AR')}
                </button>
              )}
            </label>
            <input
              type="number"
              className="input"
              placeholder="Ej: 45037"
              value={gastoDiarioExcursionistas || ''}
              onChange={e => setGastoDiarioExcursionistas(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label">
              Excursionistas (% sobre turistas)
              {sugerenciaHistorial?.porcentajeExcursionistas != null && (
                <button
                  onClick={() => setPorcentajeExcursionistas(sugerenciaHistorial.porcentajeExcursionistas!)}
                  className="ml-2 text-xs text-primary hover:underline"
                >
                  Sug: {sugerenciaHistorial.porcentajeExcursionistas}%
                </button>
              )}
            </label>
            <input
              type="number"
              min={0}
              max={100}
              className="input"
              placeholder="Ej: 80"
              value={porcentajeExcursionistas || ''}
              onChange={e => setPorcentajeExcursionistas(Number(e.target.value))}
            />
            {impactoEstimado && porcentajeExcursionistas > 0 && (
              <p className="text-xs text-text-secondary mt-1">
                ≈ {impactoEstimado.excursionistas.toLocaleString('es-AR')} excursionistas
                ({impactoEstimado.turistasAlojados.toLocaleString('es-AR')} turistas × {porcentajeExcursionistas}%)
              </p>
            )}
          </div>
        </div>

        {/* Cálculo en tiempo real, con datos reales de plazas y estadía */}
        {relevamientoSeleccionado && cargandoDatosBase && (
          <div className="mt-4 flex items-center gap-2 text-xs text-text-secondary py-3">
            <i className="fa-solid fa-spinner fa-spin text-accent" />
            Cargando plazas disponibles y estadía real del período...
          </div>
        )}

        {relevamientoSeleccionado && datosBase && datosBase.nEncuestas === 0 && (
          <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
            <i className="fa-solid fa-triangle-exclamation mr-1.5" />
            No hay encuestas de perfil del visitante cargadas para este período — no se puede estimar la estadía ni el impacto todavía.
          </div>
        )}

        {impactoEstimado && (
          <div className="mt-4 p-4 rounded-lg bg-accent/5 border border-accent/20">
            <div className="flex items-center gap-2 text-sm font-bold text-text-primary mb-3">
              <i className="fa-solid fa-calculator text-accent" />
              Impacto estimado: ${impactoEstimado.impactoTotal.toLocaleString('es-AR')}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-text-secondary">
              <p>
                {impactoEstimado.turistasAlojados.toLocaleString('es-AR')} turistas × ${gastoDiarioTuristas?.toLocaleString('es-AR') || '—'} × ~{datosBase!.estadiaPromedio.toFixed(1)} noches = ${impactoEstimado.impactoTuristas.toLocaleString('es-AR')}
              </p>
              <p>
                {impactoEstimado.excursionistas.toLocaleString('es-AR')} excursionistas ({porcentajeExcursionistas}%) × ${gastoDiarioExcursionistas?.toLocaleString('es-AR') || '—'} = ${impactoEstimado.impactoExcursionistas.toLocaleString('es-AR')}
              </p>
            </div>
            <p className="text-xs text-text-secondary mt-2">
              <i className="fa-solid fa-circle-check mr-1 text-green-600" />
              Calculado con datos reales: {datosBase!.plazasDisponibles.toLocaleString('es-AR')} plazas disponibles y estadía de {datosBase!.nEncuestas} encuestas del período.
            </p>
          </div>
        )}
      </div>

      {/* ── Sección 3 — Comparativas (opcional) ── */}
      {relevamientoSeleccionado && (
        <div className="card p-6 mb-6">
          <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center font-bold">3</span>
            Comparativas (opcional)
          </h3>
          <p className="text-xs text-text-secondary mb-4">
            Los períodos comparativos salen de la serie histórica del Observatorio
            (planilla de indicadores). Si no elegís ninguno, el sistema hace la detección automática
            {tipoInforme === 'MENSUAL' ? ' (mes anterior y mismo mes del año anterior).' : ' (período anterior y mismo período del año anterior).'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">
                {tipoInforme === 'MENSUAL' ? 'Mes anterior' : 'Período inmediatamente anterior'}
                <span className="text-xs text-text-secondary ml-1">(automático si se deja vacío)</span>
              </label>
              <select
                className="input w-full"
                value={comparativaUltimoFindeId}
                onChange={e => setComparativaUltimoFindeId(e.target.value)}
              >
                <option value="">— Automático —</option>
                <option value={COMPARATIVA_NINGUNA}>— Sin comparativa —</option>
                {registrosMismoAnio.length > 0 && (
                  <optgroup label={`Mismo año (${anioInforme})`}>
                    {registrosMismoAnio.map(r => (
                      <option key={r.id} value={r.id}>{etiquetaRegistro(r)}</option>
                    ))}
                  </optgroup>
                )}
                {registrosAnioAnterior.length > 0 && (
                  <optgroup label={`Año anterior (${anioInforme - 1})`}>
                    {registrosAnioAnterior.map(r => (
                      <option key={r.id} value={r.id}>{etiquetaRegistro(r)}</option>
                    ))}
                  </optgroup>
                )}
                {registrosAnteriores.length > 0 && (
                  <optgroup label="Años anteriores">
                    {registrosAnteriores.map(r => (
                      <option key={r.id} value={r.id}>{etiquetaRegistro(r)}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
            <div>
              <label className="label">
                {tipoInforme === 'MENSUAL' ? 'Mismo mes año anterior' : 'Mismo período año anterior'}
                <span className="text-xs text-text-secondary ml-1">(automático si se deja vacío)</span>
              </label>
              <select
                className="input w-full"
                value={comparativaAnioAnteriorId}
                onChange={e => setComparativaAnioAnteriorId(e.target.value)}
              >
                <option value="">— Automático —</option>
                <option value={COMPARATIVA_NINGUNA}>— Sin comparativa —</option>
                {registrosAnioAnterior.length > 0 && (
                  <optgroup label={`Año anterior (${anioInforme - 1})`}>
                    {registrosAnioAnterior.map(r => (
                      <option key={r.id} value={r.id}>{etiquetaRegistro(r)}</option>
                    ))}
                  </optgroup>
                )}
                {registrosMismoAnio.length > 0 && (
                  <optgroup label={`Mismo año (${anioInforme})`}>
                    {registrosMismoAnio.map(r => (
                      <option key={r.id} value={r.id}>{etiquetaRegistro(r)}</option>
                    ))}
                  </optgroup>
                )}
                {registrosAnteriores.length > 0 && (
                  <optgroup label="Años anteriores">
                    {registrosAnteriores.map(r => (
                      <option key={r.id} value={r.id}>{etiquetaRegistro(r)}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ── Sección 4 — Calcular datos ── */}
      {paso !== 'revisando' && paso !== 'confirmando' && paso !== 'completado' && (
        <div className="card p-6 mb-6">
          <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center font-bold">4</span>
            Calcular datos del informe
          </h3>

          {paso === 'calculando' ? (
            <div className="flex flex-col items-center py-8">
              <div className="flex items-center gap-3 mb-4">
                <i className="fa-solid fa-spinner fa-spin text-2xl text-primary" />
                <span className="text-sm font-semibold text-text-primary">Calculando indicadores...</span>
              </div>
              <p className="text-xs text-text-secondary">
                Obteniendo datos del sistema de ocupación hotelera, encuestas de perfil del visitante,
                comparativas y actividades vigentes.
              </p>
            </div>
          ) : (
            <div>
              <button
                onClick={handleCalcular}
                disabled={
                  paso !== 'seleccionado' ||
                  !nombre ||
                  !gastoDiarioTuristas ||
                  !gastoDiarioExcursionistas
                }
                className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i className="fa-solid fa-calculator" />
                Calcular y revisar informe {ETIQUETAS_TIPO[tipoInforme].toLowerCase()}
              </button>

              {paso !== 'seleccionado' && (
                <p className="text-xs text-text-secondary mt-2">
                  {cargandoRelevamientos ? 'Cargando datos del sistema OH...' :
                   !relevamientoId ? 'Seleccioná un relevamiento para continuar.' :
                   'Completá los datos manuales para continuar.'}
                </p>
              )}

              {errorMsg && paso === 'error' && (
                <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-sm text-red-600">
                    <i className="fa-solid fa-circle-exclamation mr-1.5" />
                    {errorMsg}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Sección 5 — Revisar datos e indicadores antes de confirmar ── */}
      {informePreview && (paso === 'revisando' || paso === 'confirmando') && (
        <div className="card p-6 mb-6 border-2 border-primary/20">
          <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center font-bold">5</span>
            Revisar datos e indicadores
          </h3>
          <p className="text-xs text-text-secondary mb-4">
            Todavía no se guardó nada. Revisá que los datos sean correctos antes de confirmar.
          </p>

          {/* KPIs principales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <div className="bg-primary/5 rounded-lg p-3 text-center">
              <p className="text-[11px] text-text-secondary mb-1">Ocupación Hotelera</p>
              <p className="text-2xl font-bold text-primary">{informePreview.relevamiento.ohTotal}%</p>
            </div>
            <div className="bg-primary/5 rounded-lg p-3 text-center">
              <p className="text-[11px] text-text-secondary mb-1">Estadía Promedio</p>
              <p className="text-2xl font-bold text-primary">
                {informePreview.perfil.estadiaSinOutliers.estadiaPromedio.toFixed(1)}
              </p>
            </div>
            <div className="bg-primary/5 rounded-lg p-3 text-center">
              <p className="text-[11px] text-text-secondary mb-1">Visitantes Totales</p>
              <p className="text-2xl font-bold text-primary">
                {informePreview.impacto.visitantesTotales.toLocaleString('es-AR')}
              </p>
            </div>
            <div className="bg-primary/5 rounded-lg p-3 text-center">
              <p className="text-[11px] text-text-secondary mb-1">Impacto Económico</p>
              <p className="text-xl font-bold text-primary">
                ${informePreview.impacto.impactoTotal.toLocaleString('es-AR')}
              </p>
            </div>
          </div>

          {/* OH por tipo */}
          {informePreview.ohPorTipo.filter(t => t.habitacionesRelevadas > 0).length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold text-text-secondary mb-2">Ocupación por tipo de alojamiento</p>
              <div className="space-y-1.5">
                {informePreview.ohPorTipo.filter(t => t.habitacionesRelevadas > 0).map(t => (
                  <div key={t.tipo} className="flex items-center gap-2 text-xs">
                    <span className="w-32 text-text-secondary truncate">{t.tipo}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-3">
                      <div className="bg-primary h-3 rounded-full" style={{ width: `${Math.min(t.ohPorcentaje, 100)}%` }} />
                    </div>
                    <span className="w-10 text-right font-semibold text-text-primary">{t.ohPorcentaje}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Picos de ocupación */}
          {informePreview.picos.picoMaximo && (
            <p className="text-xs text-text-secondary mb-5">
              <i className="fa-solid fa-arrow-trend-up mr-1.5 text-primary" />
              Pico máximo: <strong>{informePreview.picos.picoMaximo.ohMaximo}%</strong> ({informePreview.picos.picoMaximo.tipoCategoria})
            </p>
          )}

          {/* Perfil del visitante */}
          <div className="mb-5">
            <p className="text-xs font-semibold text-text-secondary mb-2">
              Perfil del visitante ({informePreview.perfil.totalEncuestas} encuestas)
            </p>
            {informePreview.perfil.totalEncuestas === 0 ? (
              <p className="text-xs text-amber-600">
                <i className="fa-solid fa-triangle-exclamation mr-1" />
                No hay encuestas cargadas para este período.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-blue-50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-blue-600">
                    {porcentajeSobreRespondentes(informePreview.perfil.procedencia, 'NACIONAL')}%
                  </p>
                  <p className="text-blue-600">Nacional</p>
                </div>
                <div className="bg-green-50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-green-600">
                    {porcentajeSobreRespondentes(informePreview.perfil.procedencia, 'PROVINCIAL')}%
                  </p>
                  <p className="text-green-600">Provincial</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-purple-600">
                    {porcentajeSobreRespondentes(informePreview.perfil.procedencia, 'INTERNACIONAL')}%
                  </p>
                  <p className="text-purple-600">Internacional</p>
                </div>
              </div>
            )}

            {informePreview.perfil.totalEncuestas > 0 && (() => {
              const p = informePreview.perfil
              // Cada porcentaje es sobre quienes contestaron esa pregunta
              const listar = (items: Array<{ nombre: string; cantidad: number }>) =>
                items.slice(0, 3).map(i => `${i.nombre} (${porcentajeDe(i.cantidad, totalRespuestas(items))}%)`).join(', ') || '—'
              // Solo sobre quienes contestaron la pregunta (se ignoran las encuestas sin dato)
              const pctSiNo = porcentajeSobreRespondentes
              // La respuesta favorable para el destino se resalta en verde
              const siNo = (obj: Record<string, number>, favorable: RespuestaSiNo) => (
                <>
                  <span className={favorable === 'SI' ? 'text-green-600 font-semibold' : ''}>Sí {pctSiNo(obj, 'SI')}%</span>
                  {' / '}
                  <span className={favorable === 'NO' ? 'text-green-600 font-semibold' : ''}>No {pctSiNo(obj, 'NO')}%</span>
                </>
              )

              return (
                <dl className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                  <div className="flex justify-between gap-2"><dt className="text-text-secondary">Top provincias</dt><dd className="text-right text-text-primary">{listar(p.provinciasFrecuentes)}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-text-secondary">Motivo de visita</dt><dd className="text-right text-text-primary">{listar(p.motivosVisita)}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-text-secondary">Grupo de viaje</dt><dd className="text-right text-text-primary">{listar(p.gruposViaje)}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-text-secondary">Medio de transporte</dt><dd className="text-right text-text-primary">{listar(p.mediosTransporte)}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-text-secondary">Tipo de alojamiento</dt><dd className="text-right text-text-primary">{listar(p.tiposAlojamiento)}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-text-secondary">Primera vez en SFVC</dt><dd className="text-right text-text-primary">{siNo(p.primeraVez, RESPUESTA_FAVORABLE.primeraVez)}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-text-secondary">Consideró otros destinos</dt><dd className="text-right text-text-primary">{siNo(p.otrosDestinos, RESPUESTA_FAVORABLE.otrosDestinos)}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-text-secondary">Recomendaría SFVC</dt><dd className="text-right text-text-primary">Sí {pctSiNo(p.recomendaria, 'SI')}%</dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-text-secondary">Volvería (muy probable)</dt><dd className="text-right text-text-primary">{pctSiNo(p.volveria, 'MUY PROBABLE')}%</dd></div>
                </dl>
              )
            })()}
          </div>

          {/* Comparativas */}
          <div className="mb-5">
            <p className="text-xs font-semibold text-text-secondary mb-2">Comparativas</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              {[informePreview.comparativaUltimoFinde, informePreview.comparativaAnioAnterior].map((c, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-2.5">
                  {c.relevamiento ? (
                    <>
                      <p className="font-semibold text-text-primary">{c.relevamiento.nombre}</p>
                      <p className="text-text-secondary">
                        OH {c.relevamiento.ohTotal}%
                        {c.visitantes != null && ` · ${c.visitantes.toLocaleString('es-AR')} visitantes`}
                        {c.impactoTotal != null && ` · $${c.impactoTotal.toLocaleString('es-AR')}`}
                      </p>
                    </>
                  ) : (
                    <span className="text-text-secondary">
                      {i === 0 ? 'Período anterior' : 'Año anterior'}: {c.advertencia ?? 'sin datos'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Ingresos a atractivos (Casa de la Puna, Pueblo Perdido, museos) */}
          <div className="mb-5">
            <p className="text-xs font-semibold text-text-secondary mb-2">
              Ingresos a atractivos ({informePreview.ingresosAtractivos.totalPersonas.toLocaleString('es-AR')} personas en el período)
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              {informePreview.ingresosAtractivos.porAtractivo.map(a => (
                <div key={a.atractivo} className={`rounded-lg p-2.5 ${a.incompleto ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'}`}>
                  <p className="font-semibold text-text-primary">{a.personas.toLocaleString('es-AR')}</p>
                  <p className="text-text-secondary truncate">{a.nombre}</p>
                  {a.incompleto && (
                    <p className="text-amber-700 mt-1">
                      <i className="fa-solid fa-triangle-exclamation mr-1" />
                      No se pudo leer todo. Volvé a calcular.
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Actividades especiales (Casa de la Puna / Pueblo Perdido) */}
          {informePreview.ingresosAtractivos.actividadesEspeciales.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold text-text-secondary mb-2">
                <i className="fa-solid fa-calendar-days mr-1.5 text-primary" />
                {informePreview.ingresosAtractivos.actividadesEspeciales.length} actividades especiales en el período
              </p>
              <ul className="text-xs text-text-secondary space-y-0.5">
                {informePreview.ingresosAtractivos.actividadesEspeciales.map((act, i) => (
                  <li key={i}>
                    {formatearFecha(act.fecha)} — {act.nombre} ({act.cantidadTotal.toLocaleString('es-AR')} personas
                    {act.cantidadTuristas !== undefined && `: ${act.cantidadTuristas.toLocaleString('es-AR')} turistas, ${(act.cantidadResidentes ?? 0).toLocaleString('es-AR')} residentes`})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">
                <i className="fa-solid fa-circle-exclamation mr-1.5" />
                {errorMsg}
              </p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleConfirmar}
              disabled={paso === 'confirmando'}
              className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {paso === 'confirmando' ? (
                <><i className="fa-solid fa-spinner fa-spin" /> Guardando...</>
              ) : (
                <><i className="fa-solid fa-check" /> Confirmar y guardar informe</>
              )}
            </button>
            <button
              onClick={handleVolverAEditar}
              disabled={paso === 'confirmando'}
              className="btn-outline text-sm disabled:opacity-50"
            >
              Volver a editar datos
            </button>
          </div>
        </div>
      )}

      {/* ── Informes generados ── */}
      <div className="card p-6 mb-6">
        <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2">
          <i className="fa-solid fa-clock-rotate-left text-text-secondary" />
          Informes generados
        </h3>

        {cargandoGuardados ? (
          <div className="flex items-center gap-2 text-sm text-text-secondary py-4">
            <i className="fa-solid fa-spinner fa-spin text-primary" />
            Cargando informes guardados...
          </div>
        ) : informesGuardados.length === 0 ? (
          <p className="text-xs text-text-secondary py-4">
            No hay informes guardados todavía. Generá uno para que aparezca acá.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-text-secondary">
                  <th className="text-left py-2 px-2 font-medium">Nombre</th>
                  <th className="text-left py-2 px-2 font-medium">Período</th>
                  <th className="text-left py-2 px-2 font-medium">Estado</th>
                  <th className="text-left py-2 px-2 font-medium">Generado</th>
                  <th className="text-right py-2 px-2 font-medium">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {informesGuardados.map((inf) => (
                  <tr key={inf.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-2 px-2 font-medium text-text-primary">{inf.nombre}</td>
                    <td className="py-2 px-2 text-text-secondary text-xs">
                      {formatearFecha(inf.fechaInicio)} al {formatearFecha(inf.fechaFin)}
                    </td>
                    <td className="py-2 px-2">
                      <span className={`badge text-[10px] ${
                        inf.estado === 'publicado' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {inf.estado}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-text-secondary text-xs">
                      {inf.fechaGeneracion ? new Date(inf.fechaGeneracion).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' }) : '—'}
                    </td>
                    <td className="py-2 px-2 text-right">
                      <button
                        onClick={() => router.push(`/admin/informes-auto/${inf.id}`)}
                        className="btn-outline text-xs py-1 px-3"
                      >
                        <i className="fa-solid fa-eye mr-1" />
                        Abrir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
