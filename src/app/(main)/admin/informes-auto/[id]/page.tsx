'use client'

import { useSession } from 'next-auth/react'
import { redirect, useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import type { InformeFindeCompleto } from '@/lib/informes-auto/types'
import { LABELS_CATEGORIA } from '@/lib/types'

export default function InformeAutoDetallePage() {
  const { data: session, status } = useSession()
  const params = useParams()
  const id = params.id as string

  const [informe, setInforme] = useState<InformeFindeCompleto | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [editandoTitulo, setEditandoTitulo] = useState(false)
  const [editandoBajada, setEditandoBajada] = useState(false)
  const [editandoReporte, setEditandoReporte] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [toast, setToast] = useState<{ mensaje: string; tipo: 'success' | 'error' } | null>(null)

  useEffect(() => {
    // Intentar cargar de sessionStorage (datos de la generación)
    const cached = sessionStorage.getItem(`informe_${id}`)
    if (cached) {
      try {
        setInforme(JSON.parse(cached))
        setCargando(false)
        return
      } catch {}
    }

    // Fallback: cargar de GAS via API
    fetch(`/api/informes-auto/${id}`)
      .then(async res => {
        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          throw new Error(json.error ?? `Error ${res.status}`)
        }
        return res.json()
      })
      .then(json => {
        const respuesta = json.data
        if (!respuesta) throw new Error('Informe no encontrado')
        // Reconstruir InformeFindeCompleto: el GAS devuelve { ...metadata, datos }
        let informeCompleto: InformeFindeCompleto = respuesta.datos
          ? { ...respuesta.datos }   // datosJSON tiene el objeto completo
          : { ...respuesta }          // fallback si no hay datos separados

        // Migración: informes viejos usaban narrativaInforme / gacetillaPrensa
        const datosRaw = informeCompleto as unknown as Record<string, unknown>
        if (!datosRaw.tituloPrensa && datosRaw.narrativaInforme) {
          informeCompleto.tituloPrensa = String(datosRaw.narrativaInforme || '').split('\n')[0] || informeCompleto.nombre
          informeCompleto.bajadaPrensa = ''
          informeCompleto.reportePrensa = String(datosRaw.narrativaInforme || '') + '\n\n' + String(datosRaw.gacetillaPrensa || '')
          delete (informeCompleto as unknown as Record<string, unknown>).narrativaInforme
          delete (informeCompleto as unknown as Record<string, unknown>).gacetillaPrensa
        }
        // Asegurar que actividades existe
        if (!informeCompleto.actividades) {
          informeCompleto.actividades = { total: 0, porTematica: [], permanentes: 0, ocasionales: 0, destacadas: [] }
        }
        // Asegurar que picos existe (informes generados antes de esta función)
        if (!informeCompleto.picos) {
          informeCompleto.picos = { picoMaximo: null, porTipo: [] }
        }

        setInforme(informeCompleto)
        // Cachear en sessionStorage para próximas visitas
        sessionStorage.setItem(`informe_${id}`, JSON.stringify(informeCompleto))
        setCargando(false)
      })
      .catch(err => {
        console.error('Error cargando informe:', err)
        setCargando(false)
        setError(err.message ?? 'Informe no encontrado. Podés generarlo desde el Agente de Informes.')
      })
  }, [id])

  if (status === 'loading') {
    return (
      <div className="animate-pulse space-y-4 p-6">
        <div className="h-8 w-64 bg-gray-200 rounded" />
        <div className="h-96 bg-gray-200 rounded-xl" />
      </div>
    )
  }

  if (!session?.user) redirect('/login')
  // @ts-expect-error
  if (session.user?.rol !== 'admin') redirect('/sin-acceso')
  if (session.user.email !== 'jorgecejas55@gmail.com') redirect('/sin-acceso')

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-16">
        <i className="fa-solid fa-spinner fa-spin text-2xl text-primary" />
      </div>
    )
  }

  if (!informe) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <i className="fa-solid fa-file-circle-exclamation text-4xl text-text-secondary mb-4" />
        <h2 className="text-lg font-bold text-text-primary mb-2">Informe no encontrado</h2>
        <p className="text-sm text-text-secondary">{error}</p>
        <button
          onClick={() => redirect('/admin/informes-auto')}
          className="btn-primary mt-6"
        >
          ← Volver al agente
        </button>
      </div>
    )
  }

  const { relevamiento, ohPorTipo, perfil, impacto, comparativaUltimoFinde, comparativaAnioAnterior } = informe

  // ── Acciones ──
  const copiarReporte = () => {
    const texto = `${informe.tituloPrensa}\n\n${informe.bajadaPrensa}\n\n${informe.reportePrensa}`
    navigator.clipboard.writeText(texto)
    setToast({ mensaje: 'Reporte de prensa copiado al portapapeles', tipo: 'success' })
  }

  const exportarPDF = () => window.print()

  const guardarCambios = async () => {
    setGuardando(true)
    try {
      await fetch(`/api/informes-auto/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tituloPrensa: informe.tituloPrensa,
          bajadaPrensa: informe.bajadaPrensa,
          reportePrensa: informe.reportePrensa,
        }),
      })
      setToast({ mensaje: 'Cambios guardados', tipo: 'success' })
    } catch {
      setToast({ mensaje: 'Error al guardar', tipo: 'error' })
    } finally {
      setGuardando(false)
    }
  }

  const publicar = async () => {
    if (!confirm('¿Publicar este informe en el módulo de Informes Técnicos?')) return
    setGuardando(true)
    try {
      await fetch(`/api/informes-auto/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'publicar' }),
      })
      setToast({ mensaje: 'Informe publicado', tipo: 'success' })
    } catch {
      setToast({ mensaje: 'Error al publicar', tipo: 'error' })
    } finally {
      setGuardando(false)
    }
  }

  const totalEncuestas = perfil.totalEncuestas
  // Calcular porcentajes (claves normalizadas sin tilde: SI, NO)
  const pctPrimeraVezSi = perfil.totalEncuestas > 0
    ? Math.round((perfil.primeraVez['SI'] ?? 0) / perfil.totalEncuestas * 100)
    : 0
  const pctPrimeraVezNo = perfil.totalEncuestas > 0
    ? Math.round((perfil.primeraVez['NO'] ?? 0) / perfil.totalEncuestas * 100)
    : 0
  const pctOtrosDestinosSi = perfil.totalEncuestas > 0
    ? Math.round((perfil.otrosDestinos['SI'] ?? 0) / perfil.totalEncuestas * 100)
    : 0
  const pctOtrosDestinosNo = perfil.totalEncuestas > 0
    ? Math.round((perfil.otrosDestinos['NO'] ?? 0) / perfil.totalEncuestas * 100)
    : 0
  const pctRecomendariaSi = perfil.totalEncuestas > 0
    ? Math.round((perfil.recomendaria?.['SI'] ?? 0) / perfil.totalEncuestas * 100)
    : 0
  // volveria usa escala distinta: "MUY PROBABLE" / "POCO PROBABLE"
  const pctVolveriaMuyProbable = perfil.totalEncuestas > 0
    ? Math.round(((perfil.volveria?.['MUY PROBABLE'] ?? 0) / perfil.totalEncuestas) * 100)
    : 0
  const pctNacional = perfil.totalEncuestas > 0
    ? Math.round((perfil.procedencia.NACIONAL ?? 0) / perfil.totalEncuestas * 100)
    : 0

  return (
    <div className="max-w-5xl">
      {/* ── Barra de acciones (no-print) ── */}
      <div className="no-print flex items-center justify-between mb-4">
        <button
          onClick={() => redirect('/admin/informes-auto')}
          className="btn-outline text-sm flex items-center gap-1.5"
        >
          <i className="fa-solid fa-arrow-left" />
          Volver al agente
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={copiarReporte}
            className="btn-outline text-sm flex items-center gap-1.5"
          >
            <i className="fa-regular fa-copy" />
            Copiar reporte
          </button>
          <button
            onClick={exportarPDF}
            className="btn-outline text-sm flex items-center gap-1.5"
          >
            <i className="fa-solid fa-print" />
            Exportar PDF
          </button>
          <button
            onClick={guardarCambios}
            disabled={guardando}
            className="btn-outline text-sm flex items-center gap-1.5"
          >
            <i className="fa-solid fa-floppy-disk" />
            Guardar
          </button>
          {informe.estado === 'borrador' && (
            <button
              onClick={publicar}
              disabled={guardando}
              className="btn-primary text-sm flex items-center gap-1.5"
            >
              <i className="fa-solid fa-upload" />
              Publicar
            </button>
          )}
        </div>
      </div>

      {/* ── TOAST ── */}
      {toast && (
        <div className={`no-print fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm font-medium shadow-lg ${
          toast.tipo === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {toast.mensaje}
          <button onClick={() => setToast(null)} className="ml-3 opacity-50 hover:opacity-100">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          INFORME IMPRIMIBLE
          ═══════════════════════════════════════════════════════════════════════ */}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-8 seccion-informe">
        {/* ── 1. Encabezado ── */}
        <div className="text-center mb-8 pb-6 border-b-2 border-primary">
          <div className="flex items-center justify-center gap-4 mb-2">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <i className="fa-solid fa-chart-column text-2xl text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-1">
            Informe Fin de Semana Largo — {informe.nombre}
          </h1>
          <p className="text-text-secondary text-sm">
            {new Date(informe.fechaInicio).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })} al{' '}
            {new Date(informe.fechaFin).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <p className="text-text-secondary text-xs mt-1">
            Observatorio de Turismo Municipal — San Fernando del Valle de Catamarca
          </p>
        </div>

        {/* ── 2. KPIs principales ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-primary/5 rounded-xl p-4 text-center">
            <p className="text-xs text-text-secondary mb-1">Ocupación Hotelera</p>
            <p className="text-3xl font-bold text-primary">{relevamiento.ohTotal}%</p>
          </div>
          <div className="bg-primary/5 rounded-xl p-4 text-center">
            <p className="text-xs text-text-secondary mb-1">Estadía Promedio</p>
            <p className="text-3xl font-bold text-primary">
              {perfil.estadiaSinOutliers.estadiaPromedio.toFixed(1)}
            </p>
          </div>
          <div className="bg-primary/5 rounded-xl p-4 text-center">
            <p className="text-xs text-text-secondary mb-1">Visitantes Totales</p>
            <p className="text-3xl font-bold text-primary">
              {impacto.visitantesTotales.toLocaleString('es-AR')}
            </p>
          </div>
          <div className="bg-primary/5 rounded-xl p-4 text-center">
            <p className="text-xs text-text-secondary mb-1">Impacto Económico</p>
            <p className="text-2xl font-bold text-primary">
              ${impacto.impactoTotal.toLocaleString('es-AR')}
            </p>
          </div>
        </div>

        {/* ── 3. Tabla Comparativa ── */}
        <div className="mb-8">
          <h3 className="font-bold text-text-primary mb-3 flex items-center gap-2">
            <i className="fa-solid fa-scale-balanced text-primary text-sm" />
            Comparativas
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-2 px-3 text-text-secondary font-medium">Indicador</th>
                  <th className="text-center py-2 px-3 text-text-primary font-semibold">
                    {informe.nombre}
                  </th>
                  <th className="text-center py-2 px-3 text-text-secondary font-medium">
                    Último finde año
                  </th>
                  <th className="text-center py-2 px-3 text-text-secondary font-medium">
                    Año anterior
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-2 px-3 font-medium text-text-secondary">OH</td>
                  <td className="text-center py-2 px-3 font-bold text-text-primary">
                    {relevamiento.ohTotal}%
                  </td>
                  <td className="text-center py-2 px-3 text-text-secondary">
                    {comparativaUltimoFinde.relevamiento ? `${comparativaUltimoFinde.relevamiento.ohTotal}%` : '—'}
                  </td>
                  <td className="text-center py-2 px-3 text-text-secondary">
                    {comparativaAnioAnterior.relevamiento ? `${comparativaAnioAnterior.relevamiento.ohTotal}%` : comparativaAnioAnterior.advertencia ? '⚠' : '—'}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium text-text-secondary">Visitantes totales</td>
                  <td className="text-center py-2 px-3 font-bold text-text-primary">
                    {impacto.visitantesTotales.toLocaleString('es-AR')}
                  </td>
                  <td className="text-center py-2 px-3 text-text-secondary">—</td>
                  <td className="text-center py-2 px-3 text-text-secondary">—</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium text-text-secondary">Impacto económico</td>
                  <td className="text-center py-2 px-3 font-bold text-text-primary">
                    ${impacto.impactoTotal.toLocaleString('es-AR')}
                  </td>
                  <td className="text-center py-2 px-3 text-text-secondary">
                    {comparativaUltimoFinde.impactoTotal ? `$${comparativaUltimoFinde.impactoTotal.toLocaleString('es-AR')}` : '—'}
                  </td>
                  <td className="text-center py-2 px-3 text-text-secondary">
                    {comparativaAnioAnterior.impactoTotal ? `$${comparativaAnioAnterior.impactoTotal.toLocaleString('es-AR')}` : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── 4. OH por tipo de alojamiento ── */}
        <div className="mb-8">
          <h3 className="font-bold text-text-primary mb-3 flex items-center gap-2">
            <i className="fa-solid fa-hotel text-primary text-sm" />
            Ocupación Hotelera por Tipo de Alojamiento
          </h3>
          <div className="space-y-2">
            {ohPorTipo.map((item) => (
              <div key={item.tipo} className="flex items-center gap-3">
                <span className="w-36 text-xs text-text-secondary text-right flex-shrink-0">
                  {item.tipo}
                </span>
                <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all"
                    style={{ width: `${Math.min(item.ohPorcentaje, 100)}%` }}
                  />
                </div>
                <span className="w-12 text-xs font-bold text-text-primary text-right">
                  {item.ohPorcentaje}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── 5. Perfil del Visitante ── */}
        {perfil.totalEncuestas > 0 && (
          <div className="mb-8">
            <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2">
              <i className="fa-solid fa-user-group text-primary text-sm" />
              Perfil del Visitante ({perfil.totalEncuestas} encuestas)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Procedencia */}
              <div>
                <p className="text-xs font-semibold text-text-secondary mb-2">Procedencia</p>
                <div className="flex gap-3 text-sm">
                  <div className="flex-1 bg-blue-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600">{pctNacional}%</p>
                    <p className="text-xs text-blue-600">Nacional</p>
                  </div>
                  <div className="flex-1 bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {perfil.totalEncuestas > 0 ? Math.round((perfil.procedencia.PROVINCIAL ?? 0) / perfil.totalEncuestas * 100) : 0}%
                    </p>
                    <p className="text-xs text-green-600">Provincial</p>
                  </div>
                  <div className="flex-1 bg-purple-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-purple-600">
                      {perfil.totalEncuestas > 0 ? Math.round((perfil.procedencia.INTERNACIONAL ?? 0) / perfil.totalEncuestas * 100) : 0}%
                    </p>
                    <p className="text-xs text-purple-600">Internacional</p>
                  </div>
                </div>
              </div>

              {/* Top 5 provincias */}
              <div>
                <p className="text-xs font-semibold text-text-secondary mb-2">Top 5 provincias de origen</p>
                {perfil.provinciasFrecuentes.slice(0, 5).map((p) => (
                  <div key={p.nombre} className="flex items-center gap-2 mb-1 text-xs">
                    <span className="w-20 text-text-secondary truncate">{p.nombre}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-3">
                      <div
                        className="bg-primary/60 h-3 rounded-full"
                        style={{ width: `${perfil.totalEncuestas > 0 ? (p.cantidad / perfil.totalEncuestas * 100) : 0}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-text-primary font-medium">
                      {perfil.totalEncuestas > 0 ? Math.round(p.cantidad / perfil.totalEncuestas * 100) : 0}%
                    </span>
                  </div>
                ))}
              </div>

              {/* Motivo de visita */}
              <div>
                <p className="text-xs font-semibold text-text-secondary mb-2">Principal motivo de visita</p>
                {perfil.motivosVisita.slice(0, 5).map((m) => (
                  <div key={m.nombre} className="flex items-center gap-2 mb-1 text-xs">
                    <span className="w-32 truncate text-text-secondary">{m.nombre}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-3">
                      <div
                        className="bg-accent/60 h-3 rounded-full"
                        style={{ width: `${perfil.totalEncuestas > 0 ? (m.cantidad / perfil.totalEncuestas * 100) : 0}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-text-primary font-medium">
                      {perfil.totalEncuestas > 0 ? Math.round(m.cantidad / perfil.totalEncuestas * 100) : 0}%
                    </span>
                  </div>
                ))}
              </div>

              {/* Grupo de viaje */}
              <div>
                <p className="text-xs font-semibold text-text-secondary mb-2">Grupo de viaje</p>
                {perfil.gruposViaje.slice(0, 5).map((g) => (
                  <div key={g.nombre} className="flex items-center gap-2 mb-1 text-xs">
                    <span className="w-20 truncate text-text-secondary">{g.nombre}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-3">
                      <div
                        className="bg-orange-400/60 h-3 rounded-full"
                        style={{ width: `${perfil.totalEncuestas > 0 ? (g.cantidad / perfil.totalEncuestas * 100) : 0}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-text-primary font-medium">
                      {perfil.totalEncuestas > 0 ? Math.round(g.cantidad / perfil.totalEncuestas * 100) : 0}%
                    </span>
                  </div>
                ))}
              </div>

              {/* Transporte */}
              <div>
                <p className="text-xs font-semibold text-text-secondary mb-2">Medio de transporte</p>
                {perfil.mediosTransporte.slice(0, 5).map((t) => (
                  <div key={t.nombre} className="flex items-center gap-2 mb-1 text-xs">
                    <span className="w-32 truncate text-text-secondary">{t.nombre}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-3">
                      <div
                        className="bg-teal-500/60 h-3 rounded-full"
                        style={{ width: `${perfil.totalEncuestas > 0 ? (t.cantidad / perfil.totalEncuestas * 100) : 0}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-text-primary font-medium">
                      {perfil.totalEncuestas > 0 ? Math.round(t.cantidad / perfil.totalEncuestas * 100) : 0}%
                    </span>
                  </div>
                ))}
              </div>

              {/* Tipo de alojamiento */}
              <div>
                <p className="text-xs font-semibold text-text-secondary mb-2">Tipo de alojamiento elegido</p>
                {perfil.tiposAlojamiento.slice(0, 5).map((a) => (
                  <div key={a.nombre} className="flex items-center gap-2 mb-1 text-xs">
                    <span className="w-32 truncate text-text-secondary">{a.nombre}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-3">
                      <div
                        className="bg-yellow-500/60 h-3 rounded-full"
                        style={{ width: `${perfil.totalEncuestas > 0 ? (a.cantidad / perfil.totalEncuestas * 100) : 0}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-text-primary font-medium">
                      {perfil.totalEncuestas > 0 ? Math.round(a.cantidad / perfil.totalEncuestas * 100) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Indicadores Sí/No */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-text-secondary mb-1">¿Primera vez en SFVC?</p>
                <div className="flex justify-center gap-4">
                  <p className="text-lg font-bold text-green-600">Sí: {pctPrimeraVezSi}%</p>
                  <p className="text-lg font-bold text-text-secondary">No: {pctPrimeraVezNo}%</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-text-secondary mb-1">¿Pensó en otros destinos?</p>
                <div className="flex justify-center gap-4">
                  <p className="text-lg font-bold text-green-600">Sí: {pctOtrosDestinosSi}%</p>
                  <p className="text-lg font-bold text-text-secondary">No: {pctOtrosDestinosNo}%</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-text-secondary mb-1">¿Recomendaría SFVC?</p>
                <p className="text-lg font-bold text-green-600">Sí: {pctRecomendariaSi}%</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-text-secondary mb-1">¿Volvería a SFVC?</p>
                <p className="text-lg font-bold text-green-600">Muy probable: {pctVolveriaMuyProbable}%</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 6. Reporte de Prensa (no se imprime, se copia y envía aparte) ── */}
      <div className="no-print bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-8 seccion-informe">
        <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2">
          <i className="fa-solid fa-newspaper text-primary text-sm" />
          Reporte de Prensa
        </h3>

        {/* Titular */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-text-secondary">Titular</label>
            <button
              onClick={() => setEditandoTitulo(!editandoTitulo)}
              className="no-print btn-ghost text-xs flex items-center gap-1"
            >
              <i className={`fa-solid ${editandoTitulo ? 'fa-xmark' : 'fa-pen'}`} />
              {editandoTitulo ? 'Cancelar' : 'Editar'}
            </button>
          </div>
          {editandoTitulo ? (
            <input
              className="input w-full text-sm font-bold"
              value={informe.tituloPrensa}
              onChange={e => setInforme({ ...informe, tituloPrensa: e.target.value })}
            />
          ) : (
            <h2 className="text-lg font-bold text-text-primary">{informe.tituloPrensa}</h2>
          )}
        </div>

        {/* Bajada */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-text-secondary">Bajada / Copete</label>
            <button
              onClick={() => setEditandoBajada(!editandoBajada)}
              className="no-print btn-ghost text-xs flex items-center gap-1"
            >
              <i className={`fa-solid ${editandoBajada ? 'fa-xmark' : 'fa-pen'}`} />
              {editandoBajada ? 'Cancelar' : 'Editar'}
            </button>
          </div>
          {editandoBajada ? (
            <textarea
              className="input w-full min-h-[60px] text-sm"
              value={informe.bajadaPrensa}
              onChange={e => setInforme({ ...informe, bajadaPrensa: e.target.value })}
            />
          ) : (
            <p className="text-sm text-text-secondary italic">{informe.bajadaPrensa}</p>
          )}
        </div>

        {/* Cuerpo */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-text-secondary">Cuerpo del reporte</label>
            <button
              onClick={() => setEditandoReporte(!editandoReporte)}
              className="no-print btn-ghost text-xs flex items-center gap-1"
            >
              <i className={`fa-solid ${editandoReporte ? 'fa-xmark' : 'fa-pen'}`} />
              {editandoReporte ? 'Cancelar' : 'Editar'}
            </button>
          </div>
          {editandoReporte ? (
            <textarea
              className="input w-full min-h-[200px] text-sm"
              value={informe.reportePrensa}
              onChange={e => setInforme({ ...informe, reportePrensa: e.target.value })}
            />
          ) : (
            <div className="prose prose-sm max-w-none text-text-secondary whitespace-pre-line">
              {informe.reportePrensa}
            </div>
          )}
        </div>
      </div>

      {/* ── 8. Nota Metodológica ── */}
      <div className="bg-gray-50 rounded-xl p-6 mb-8 text-xs text-text-secondary seccion-informe">
        <h3 className="font-bold text-text-primary mb-2 flex items-center gap-2">
          <i className="fa-solid fa-microscope text-text-secondary" />
          Nota Metodológica
        </h3>
        <ul className="space-y-1 list-disc list-inside">
          <li>
            Estadía promedio calculada sobre {perfil.estadiaSinOutliers.n} encuestas válidas
            ({perfil.estadiaSinOutliers.nExcluidas} valores atípicos excluidos con umbral ±2.5σ).
          </li>
          <li>
            Cobertura del relevamiento de ocupación hotelera: {relevamiento.cantidadRelevados} establecimientos
            ({relevamiento.cantidadRegistrados} registrados, {relevamiento.cantidadRelevados - relevamiento.cantidadRegistrados} no registrados/en trámite).
          </li>
          <li>Impacto económico calculado según metodología del Observatorio de Turismo Municipal.</li>
          <li>
            Generado el {new Date(informe.fechaGeneracion).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            {' '}por {informe.usuarioGenerador}.
          </li>
        </ul>
      </div>
    </div>
  )
}
