'use client'

import { useSession } from 'next-auth/react'
import { redirect, useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { tieneAcceso } from '@/lib/permisos'
import { formatearRango } from '@/lib/formato-fechas'
import type { InformeFindeCompleto, TipoInforme } from '@/lib/informes-auto/types'
import { LABELS_CATEGORIA } from '@/lib/types'
import { RESPUESTA_FAVORABLE, porcentajeDe, porcentajeSobreRespondentes, totalRespuestas, type RespuestaSiNo } from '@/lib/indicadores-perfil'
import SeccionIngresosAtractivos from '@/components/informes/SeccionIngresosAtractivos'
import PanelPublicacion from '@/components/informes-auto/PanelPublicacion'

const ETIQUETAS_TIPO: Record<TipoInforme, { portada: string; header: string }> = {
  FSL: { portada: 'Fin de Semana Largo', header: 'Informe Fin de Semana Largo' },
  EVENTO: { portada: 'Evento Turístico', header: 'Informe de Evento' },
  MENSUAL: { portada: 'Informe Estadístico Mensual', header: 'Informe Mensual' },
}

export default function InformeAutoDetallePage() {
  const { data: session, status } = useSession()
  const params = useParams()
  const id = params.id as string

  const [informe, setInforme] = useState<InformeFindeCompleto | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{ mensaje: string; tipo: 'success' | 'error' } | null>(null)
  const [recalculando, setRecalculando] = useState(false)

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
        const informeCompleto: InformeFindeCompleto = respuesta.datos
          ? { ...respuesta.datos }   // datosJSON tiene el objeto completo
          : { ...respuesta }          // fallback si no hay datos separados

        // Informes generados antes de incorporar ingresos a atractivos
        if (!informeCompleto.ingresosAtractivos) {
          informeCompleto.ingresosAtractivos = { porAtractivo: [], totalPersonas: 0, actividadesEspeciales: [] }
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
  if (!tieneAcceso(session.user, 'informes-auto')) redirect('/sin-acceso')

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
  const etiquetaTipo = ETIQUETAS_TIPO[informe.tipoInforme ?? 'FSL']

  // ── Acciones ──
  const exportarPDF = () => window.print()

  const recalcularDatos = async () => {
    setRecalculando(true)
    try {
      const res = await fetch(`/api/informes-auto/${id}/recalcular`, { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (json.success && json.data) {
        setInforme(json.data)
        sessionStorage.setItem(`informe_${id}`, JSON.stringify(json.data))
        setToast({
          mensaje: json.data.estado === 'cambios-sin-publicar'
            ? 'Datos recalculados. Hay cambios sin publicar: el dashboard muestra los valores anteriores'
            : 'Datos recalculados desde el sistema OH',
          tipo: 'success',
        })
      } else {
        setToast({ mensaje: json.error ?? 'No se pudo recalcular', tipo: 'error' })
      }
    } catch {
      setToast({ mensaje: 'Error de conexión al recalcular', tipo: 'error' })
    } finally {
      setRecalculando(false)
    }
  }

  const totalEncuestas = perfil.totalEncuestas
  // Calcular porcentajes (claves normalizadas sin tilde: SI, NO)
  // Estos porcentajes se calculan solo sobre quienes contestaron cada pregunta
  const pctPrimeraVezSi = porcentajeSobreRespondentes(perfil.primeraVez, 'SI')
  const pctPrimeraVezNo = porcentajeSobreRespondentes(perfil.primeraVez, 'NO')
  const pctOtrosDestinosSi = porcentajeSobreRespondentes(perfil.otrosDestinos, 'SI')
  const pctOtrosDestinosNo = porcentajeSobreRespondentes(perfil.otrosDestinos, 'NO')
  const pctRecomendariaSi = porcentajeSobreRespondentes(perfil.recomendaria, 'SI')
  // volveria usa escala distinta: "MUY PROBABLE" / "POCO PROBABLE"
  const pctVolveriaMuyProbable = porcentajeSobreRespondentes(perfil.volveria, 'MUY PROBABLE')
  // Cada gráfico se calcula sobre quienes contestaron esa pregunta (ej.: la
  // provincia de origen solo la informan visitantes nacionales/provinciales)
  const pctNacional = porcentajeSobreRespondentes(perfil.procedencia, 'NACIONAL')
  const pctProvincial = porcentajeSobreRespondentes(perfil.procedencia, 'PROVINCIAL')
  const pctInternacional = porcentajeSobreRespondentes(perfil.procedencia, 'INTERNACIONAL')
  const totalProvincias = totalRespuestas(perfil.provinciasFrecuentes)
  const totalMotivos = totalRespuestas(perfil.motivosVisita)
  const totalGrupos = totalRespuestas(perfil.gruposViaje)
  const totalTransportes = totalRespuestas(perfil.mediosTransporte)
  const totalAlojamientos = totalRespuestas(perfil.tiposAlojamiento)

  return (
    <div className="max-w-5xl mx-auto print:max-w-none">
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
            onClick={recalcularDatos}
            disabled={recalculando}
            title="Recalcula OH por tipo, picos, perfil, impacto e ingresos a atractivos desde las fuentes. No cambia el dashboard hasta que se vuelva a publicar."
            className="btn-outline text-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            <i className={`fa-solid ${recalculando ? 'fa-spinner fa-spin' : 'fa-rotate'}`} />
            {recalculando ? 'Recalculando...' : 'Recalcular datos'}
          </button>
          <button
            onClick={exportarPDF}
            className="btn-outline text-sm flex items-center gap-1.5"
          >
            <i className="fa-solid fa-print" />
            Exportar PDF
          </button>
        </div>
      </div>

      <PanelPublicacion
        informe={informe}
        onPublicado={publicado => {
          setInforme(publicado)
          sessionStorage.setItem(`informe_${id}`, JSON.stringify(publicado))
          setToast({ mensaje: 'Informe publicado: el dashboard ya muestra sus valores', tipo: 'success' })
        }}
        onError={mensaje => setToast({ mensaje, tipo: 'error' })}
      />

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

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-8 print:shadow-none print:border-0 print:rounded-none print:p-0 print:m-0 print:max-w-none print:w-full">
        {/* ── 0. PORTADA (solo impresión) ── */}
        <div className="portada-informe">
          {/* Fila superior de logos: Secretaría | Asociación (centrada) | Observatorio,
              alineados verticalmente por el centro */}
          <div className="grid grid-cols-3 items-center">
            <img
              src="/logos/secretaria.png"
              alt="Secretaría de Turismo y Desarrollo Económico"
              className="h-12 w-auto justify-self-start"
            />
            <img
              src="/logos/asociacion-hoteles.jpg"
              alt="Asociación de Hoteles, Bares, Confiterías, Restaurantes y Afines de Catamarca"
              className="h-24 w-auto justify-self-center"
            />
            <img
              src="/logos/observatorio.png"
              alt="Observatorio de Turismo Municipal"
              className="h-16 w-auto justify-self-end"
            />
          </div>

          {/* Bloque central: marca del destino + título */}
          <div className="text-center">
            <img
              src="/logos/marca-destino.png"
              alt="San Fernando del Valle de Catamarca"
              className="h-20 w-auto mx-auto mb-8"
            />
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-text-secondary mb-4">
              Informe Estadístico
            </p>
            <h1 className="text-4xl font-bold text-text-primary mb-3">
              {etiquetaTipo.portada}
            </h1>
            <h2 className="text-3xl font-bold text-primary mb-6">
              {informe.nombre}
            </h2>
            <div className="w-24 h-1 bg-primary mx-auto mb-6 rounded-full" />
            <p className="text-lg text-text-secondary">
              {formatearRango(informe.fechaInicio, informe.fechaFin)}
            </p>
          </div>

          {/* Pie institucional */}
          <div className="text-center text-sm text-text-secondary space-y-0.5">
            <p className="font-semibold text-text-primary">Observatorio de Turismo Municipal</p>
            <p>Secretaría de Turismo y Desarrollo Económico - Municipalidad de la Capital</p>
            <p>San Fernando del Valle de Catamarca</p>
          </div>
        </div>

        <div className="pagina-1">
        {/* Encabezado reducido página de datos (solo impresión) */}
        <div className="hidden print:flex items-center justify-between mb-4 pb-3 border-b border-gray-200 gap-3">
          <img src="/logos/secretaria.png" alt="Secretaría" className="h-6 w-auto" />
          <span className="text-xs font-semibold text-text-primary">
            {etiquetaTipo.header} — {informe.nombre}
          </span>
          <div className="flex items-center gap-2">
            <img src="/logos/marca-destino.png" alt="Marca Destino" className="h-7 w-auto" />
            <img src="/logos/observatorio.png" alt="Observatorio" className="h-7 w-auto" />
          </div>
        </div>
        {/* ── 1. Encabezado institucional (solo pantalla; en el PDF lo reemplazan portada + encabezados reducidos) ── */}
        <div className="print:hidden flex items-center justify-between mb-8 pb-6 border-b-2 border-primary gap-4">
          {/* Logo Secretaría (proporción 6.9:1 → altura menor) */}
          <img
            src="/logos/secretaria.png"
            alt="Secretaría de Turismo y Desarrollo Económico"
            className="h-9 w-auto print:h-10 flex-shrink-0"
          />
          {/* Centro: título + fechas */}
          <div className="text-center flex-1">
            <h1 className="text-xl font-bold text-text-primary mb-1 print:text-2xl">
              {etiquetaTipo.header} — {informe.nombre}
            </h1>
            <p className="text-text-secondary text-xs print:text-sm">
              {formatearRango(informe.fechaInicio, informe.fechaFin)}
            </p>
            <p className="text-text-secondary text-[10px] mt-0.5 print:text-xs">
              Observatorio de Turismo Municipal — San Fernando del Valle de Catamarca
            </p>
          </div>
          {/* Derecha: marca destino + logo observatorio */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <img
              src="/logos/marca-destino.png"
              alt="Marca del Destino"
              className="h-12 w-auto print:h-14"
            />
            <img
              src="/logos/observatorio.png"
              alt="Observatorio de Turismo Municipal"
              className="h-12 w-auto print:h-14"
            />
          </div>
        </div>

        {/* ── 2. KPIs principales ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 print:grid-cols-4 gap-4 print:gap-3 mb-8 print:mb-6 evitar-corte">
          <div className="bg-primary/5 rounded-xl p-4 print:p-3 text-center print:border print:border-gray-200">
            <p className="text-xs text-text-secondary mb-1">Ocupación Hotelera</p>
            <p className="text-3xl font-bold text-primary">{relevamiento.ohTotal}%</p>
          </div>
          <div className="bg-primary/5 rounded-xl p-4 print:p-3 text-center print:border print:border-gray-200">
            <p className="text-xs text-text-secondary mb-1">Estadía Promedio</p>
            <p className="text-3xl font-bold text-primary">
              {perfil.estadiaSinOutliers.estadiaPromedio.toFixed(1)}
            </p>
          </div>
          <div className="bg-primary/5 rounded-xl p-4 print:p-3 text-center print:border print:border-gray-200">
            <p className="text-xs text-text-secondary mb-1">Visitantes Totales</p>
            <p className="text-3xl font-bold text-primary">
              {impacto.visitantesTotales.toLocaleString('es-AR')}
            </p>
          </div>
          <div className="bg-primary/5 rounded-xl p-4 print:p-3 text-center print:border print:border-gray-200">
            <p className="text-xs text-text-secondary mb-1">Impacto Económico</p>
            <p className="text-2xl font-bold text-primary">
              ${impacto.impactoTotal.toLocaleString('es-AR')}
            </p>
          </div>
        </div>

        {/* ── 3. Tabla Comparativa ── */}
        <div className="mb-8 print:mb-6 evitar-corte">
          <h3 className="font-bold text-text-primary mb-3 flex items-center gap-2">
            <i className="fa-solid fa-scale-balanced text-primary text-sm" />
            Comparativas
          </h3>
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-2 px-3 text-text-secondary font-medium">Indicador</th>
                  <th className="text-center py-2 px-3 text-text-primary font-semibold">
                    {informe.nombre}
                  </th>
                  <th className="text-center py-2 px-3 text-text-secondary font-medium">
                    <span className="whitespace-normal text-xs print:text-[10px]">
                      {comparativaUltimoFinde.relevamiento?.nombre ?? 'Último finde del año'}
                    </span>
                  </th>
                  <th className="text-center py-2 px-3 text-text-secondary font-medium">
                    <span className="whitespace-normal text-xs print:text-[10px]">
                      {comparativaAnioAnterior.relevamiento
                        ? (informe.tipoInforme === 'MENSUAL'
                            ? comparativaAnioAnterior.relevamiento.nombre
                            : `${comparativaAnioAnterior.relevamiento.nombre} ${comparativaAnioAnterior.relevamiento.fechaFin.slice(0, 4)}`)
                        : 'Año anterior'}
                    </span>
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
                  <td className="text-center py-2 px-3 text-text-secondary">
                    {comparativaUltimoFinde.visitantes ? comparativaUltimoFinde.visitantes.toLocaleString('es-AR') : '—'}
                  </td>
                  <td className="text-center py-2 px-3 text-text-secondary">
                    {comparativaAnioAnterior.visitantes ? comparativaAnioAnterior.visitantes.toLocaleString('es-AR') : '—'}
                  </td>
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
        {(() => {
          const ohPorTipoConDatos = ohPorTipo.filter(
            item => item.habitacionesRelevadas > 0 && item.ohPorcentaje > 0
          )
          if (ohPorTipoConDatos.length === 0) return null
          return (
            <div className="mb-8 print:mb-0 evitar-corte">
              <h3 className="font-bold text-text-primary mb-3 flex items-center gap-2">
                <i className="fa-solid fa-hotel text-primary text-sm" />
                Ocupación Hotelera por Tipo de Alojamiento
              </h3>
              <div className="space-y-2">
                {ohPorTipoConDatos.map((item) => (
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
          )
        })()}
        </div>{/* cierre pagina-1 */}

        <div className="pagina-2">
        <EncabezadoPaginaImpresion titulo={`${etiquetaTipo.header} — ${informe.nombre}`} />
        {/* ── 5. Perfil del Visitante ── */}
        {perfil.totalEncuestas > 0 && (
          <div className="mb-8">
            <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2">
              <i className="fa-solid fa-user-group text-primary text-sm" />
              Perfil del Visitante
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-3 gap-6">
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
                      {pctProvincial}%
                    </p>
                    <p className="text-xs text-green-600">Provincial</p>
                  </div>
                  <div className="flex-1 bg-purple-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-purple-600">
                      {pctInternacional}%
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
                    <div className="flex-1 bg-gray-200 rounded-full h-3.5">
                      <div
                        className="bg-primary h-3 rounded-full"
                        style={{ width: `${porcentajeDe(p.cantidad, totalProvincias)}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-text-primary font-semibold">
                      {porcentajeDe(p.cantidad, totalProvincias)}%
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
                    <div className="flex-1 bg-gray-200 rounded-full h-3.5">
                      <div
                        className="bg-accent h-3 rounded-full"
                        style={{ width: `${porcentajeDe(m.cantidad, totalMotivos)}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-text-primary font-semibold">
                      {porcentajeDe(m.cantidad, totalMotivos)}%
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
                    <div className="flex-1 bg-gray-200 rounded-full h-3.5">
                      <div
                        className="bg-orange-500 h-3 rounded-full"
                        style={{ width: `${porcentajeDe(g.cantidad, totalGrupos)}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-text-primary font-semibold">
                      {porcentajeDe(g.cantidad, totalGrupos)}%
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
                    <div className="flex-1 bg-gray-200 rounded-full h-3.5">
                      <div
                        className="bg-teal-600 h-3 rounded-full"
                        style={{ width: `${porcentajeDe(t.cantidad, totalTransportes)}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-text-primary font-semibold">
                      {porcentajeDe(t.cantidad, totalTransportes)}%
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
                    <div className="flex-1 bg-gray-200 rounded-full h-3.5">
                      <div
                        className="bg-amber-500 h-3 rounded-full"
                        style={{ width: `${porcentajeDe(a.cantidad, totalAlojamientos)}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-text-primary font-semibold">
                      {porcentajeDe(a.cantidad, totalAlojamientos)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Indicadores Sí/No */}
            <div className="grid grid-cols-2 md:grid-cols-4 print:grid-cols-4 gap-3 mt-4 evitar-corte">
              <IndicadorSiNo
                titulo="¿Primera vez en SFVC?"
                pctSi={pctPrimeraVezSi}
                pctNo={pctPrimeraVezNo}
                favorable={RESPUESTA_FAVORABLE.primeraVez}
              />
              <IndicadorSiNo
                titulo="¿Pensó en otros destinos?"
                pctSi={pctOtrosDestinosSi}
                pctNo={pctOtrosDestinosNo}
                favorable={RESPUESTA_FAVORABLE.otrosDestinos}
              />
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

        </div>{/* cierre pagina-2 */}

        <div className="pagina-3">
        <EncabezadoPaginaImpresion titulo={`${etiquetaTipo.header} — ${informe.nombre}`} />
        {/* ── 6. Ingresos a atractivos ── */}
        <SeccionIngresosAtractivos ingresos={informe.ingresosAtractivos} />

        {/* ── 7. Nota Metodológica ── */}
        <div className="bg-gray-50 rounded-xl p-6 text-xs text-text-secondary seccion-informe print:text-[10px]">
          <h3 className="font-bold text-text-primary mb-2 flex items-center gap-2">
            <i className="fa-solid fa-microscope text-text-secondary" />
            Nota Metodológica
          </h3>
          <ul className="space-y-1 list-disc list-inside">
            <li>
              Estadía promedio calculada sobre encuestas realizadas en los principales
              Atractivos turísticos de la ciudad ({perfil.estadiaSinOutliers.nExcluidas} valores
              atípicos excluidos con umbral ±2.5σ).
            </li>
            <li>
              Cobertura del relevamiento de ocupación hotelera: {relevamiento.cantidadRelevados} alojamientos.
            </li>
            <li>
              Ingresos a atractivos: registros cargados en el sistema del Observatorio (Casa de la Puna
              y Pueblo Perdido, incluidas sus actividades especiales) y en los registros de visitas de
              los museos municipales, filtrados por las fechas del período.
            </li>
            <li>
              Impacto económico estimado en base a estudios y relevamientos en campo realizados
              por el Observatorio de Turismo Municipal, considerando precios en servicios de
              alojamiento, gastronomía y comercios de productos regionales.
            </li>
            <li>
              Generado el {new Date(informe.fechaGeneracion).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              {' '}por {informe.usuarioGenerador}.
            </li>
          </ul>
        </div>

        </div>{/* cierre pagina-3 */}
      </div>{/* cierre card principal */}

    </div>
  )
}

/** Indicador Sí/No: la respuesta favorable para el destino va en verde, la otra en gris */
function IndicadorSiNo({ titulo, pctSi, pctNo, favorable }: {
  titulo: string
  pctSi: number
  pctNo: number
  favorable: RespuestaSiNo
}) {
  const clase = (respuesta: RespuestaSiNo) =>
    `text-lg font-bold ${respuesta === favorable ? 'text-green-600' : 'text-text-secondary'}`
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center">
      <p className="text-xs text-text-secondary mb-1">{titulo}</p>
      <div className="flex justify-center gap-4">
        <p className={clase('SI')}>Sí: {pctSi}%</p>
        <p className={clase('NO')}>No: {pctNo}%</p>
      </div>
    </div>
  )
}

/** Encabezado reducido de las páginas 2 y 3 (solo visible en impresión) */
function EncabezadoPaginaImpresion({ titulo }: { titulo: string }) {
  return (
    <div className="hidden print:flex items-center justify-between mb-4 pb-3 border-b border-gray-200 gap-3">
      <img src="/logos/secretaria.png" alt="Secretaría" className="h-6 w-auto" />
      <span className="text-xs font-semibold text-text-primary">{titulo}</span>
      <div className="flex items-center gap-2">
        <img src="/logos/marca-destino.png" alt="Marca Destino" className="h-7 w-auto" />
        <img src="/logos/observatorio.png" alt="Observatorio" className="h-7 w-auto" />
      </div>
    </div>
  )
}
