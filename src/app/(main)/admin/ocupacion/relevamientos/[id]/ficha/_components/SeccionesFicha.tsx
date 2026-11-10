/**
 * Secciones de la ficha técnica de ocupación hotelera. Presentacionales, con
 * las mismas piezas visuales que los informes automáticos (Kpi, TituloSeccion,
 * barras OH) para que ficha e informe se lean como una misma familia.
 */

import BarrasHorizontalesOH from '@/components/informes-auto/vista/BarrasHorizontalesOH'
import Kpi from '@/components/informes-auto/vista/Kpi'
import { Fila } from '@/components/informes-auto/vista/PanelCanal'
import TituloSeccion from '@/components/informes-auto/vista/TituloSeccion'
import { formatearDecimal, formatearEntero, formatearPorcentaje } from '@/lib/formato-numeros'
import type { EstadisticasOHPorGrupo, IndicadoresRelevamiento } from '@/lib/informes-auto/types'

type Props = { ind: IndicadoresRelevamiento }

// El servidor/navegador puede estar en otra zona: la fecha se muestra en hora de Catamarca
const ZONA_HORARIA = 'America/Argentina/Catamarca'

export function fechaGeneracion(): string {
  return new Date().toLocaleDateString('es-AR', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: ZONA_HORARIA,
  })
}

function BloqueFilas({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="border border-gray-200 rounded-xl p-4 print:p-3">
      <p className="text-xs font-semibold text-text-secondary mb-1">{titulo}</p>
      {children}
    </div>
  )
}

/** KPIs destacados + tendencia central y dispersión en bloques compactos. */
export function IndicadoresGlobales({ ind }: Props) {
  const { global } = ind
  return (
    <div className="mb-6 print:mb-4 evitar-corte">
      <TituloSeccion icono="fa-chart-simple">Indicadores globales</TituloSeccion>
      <div className="grid grid-cols-2 sm:grid-cols-4 print:grid-cols-4 gap-3 mb-4">
        <Kpi titulo="OH ponderada (oficial)" icono="fa-bed" valor={formatearPorcentaje(global.mediaPonderada)} />
        <Kpi titulo="Establecimientos relevados" icono="fa-hotel" valor={formatearEntero(global.n)} />
        <Kpi
          titulo="Cobertura"
          icono="fa-chart-pie"
          valor={ind.cobertura === null ? '—' : formatearPorcentaje(ind.cobertura)}
          nota={ind.totalAlojamientosActivos ? `${formatearEntero(global.n)} de ${formatearEntero(ind.totalAlojamientosActivos)} activos` : undefined}
        />
        <Kpi titulo="Habitaciones relevadas" icono="fa-door-closed" valor={formatearEntero(ind.habitacionesRelevadas)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-3">
        <BloqueFilas titulo="Tendencia central">
          <Fila etiqueta="Media simple" valor={formatearPorcentaje(global.mediaSimple)} />
          <Fila etiqueta="Mediana" valor={formatearPorcentaje(global.mediana)} />
          <Fila etiqueta="Media recortada" valor={formatearPorcentaje(global.mediaRecortada)}>
            {global.nRecortados > 0 && (
              <span className="text-[10px] text-text-secondary">(−{global.nRecortados})</span>
            )}
          </Fila>
          <Fila etiqueta="Moda" valor={formatearPorcentaje(global.moda)} />
        </BloqueFilas>
        <BloqueFilas titulo="Dispersión">
          <Fila etiqueta="Desvío estándar" valor={`${formatearDecimal(global.desvioEstandar)} p. p.`} />
          <Fila etiqueta="Coeficiente de variación" valor={formatearPorcentaje(global.coeficienteVariacion)} />
          <Fila etiqueta="Mínimo" valor={formatearPorcentaje(global.minimo)} />
          <Fila etiqueta="Máximo" valor={formatearPorcentaje(global.maximo)} />
        </BloqueFilas>
      </div>
    </div>
  )
}

export function BajaActividad({ ind }: Props) {
  const { bajaActividad, global } = ind
  return (
    <div className="bg-primary/5 rounded-xl p-4 print:p-3 evitar-corte">
      <TituloSeccion icono="fa-store-slash" className="mb-1 text-sm">Indicador de baja actividad comercial</TituloSeccion>
      <p className="text-sm text-text-primary">
        <strong>{formatearEntero(bajaActividad.cantidad)}</strong> de {formatearEntero(global.n)} establecimientos
        ({formatearPorcentaje(bajaActividad.porcentaje)}) registraron ocupación inferior
        al {formatearPorcentaje(bajaActividad.umbral, 0)}.
      </p>
      {/* Barra 100 % apilada: bajo el umbral en color de marca, el resto en gris */}
      <div className="flex h-2 rounded-full overflow-hidden bg-gray-300 mt-2 max-w-md">
        <div className="bg-primary" style={{ width: `${Math.min(bajaActividad.porcentaje, 100)}%` }} />
      </div>
      <p className="text-xs text-text-secondary mt-2">
        Indicador de diagnóstico de gestión para la Asociación de Hoteles. No revela identidades.
      </p>
    </div>
  )
}

const tieneDatos = (g: EstadisticasOHPorGrupo) => g.estadisticas.mediaPonderada > 0

function detalleGrupo(g: EstadisticasOHPorGrupo): string | undefined {
  if (!tieneDatos(g)) return undefined
  const { n, minimo, maximo } = g.estadisticas
  return `n ${formatearEntero(n)} · ${formatearDecimal(minimo)}–${formatearPorcentaje(maximo)}`
}

/** Barras con referencia al OH general + tabla de detalle (participación). */
export function OhPorGrupo({ ind }: Props) {
  return (
    <div className="evitar-corte">
      <TituloSeccion icono="fa-layer-group">Ocupación hotelera por grupo tipo-categoría</TituloSeccion>
      <BarrasHorizontalesOH
        items={ind.porGrupo.map(g => ({
          etiqueta: g.tipoCategoria,
          valor: tieneDatos(g) ? g.estadisticas.mediaPonderada : null,
          detalle: detalleGrupo(g),
        }))}
        referencia={ind.global.mediaPonderada}
      />

      <div className="overflow-x-auto print:overflow-visible mt-4">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b-2 border-gray-200 text-left text-text-secondary">
              <th className="py-1.5 pr-3 font-semibold">Grupo</th>
              <th className="py-1.5 pr-3 font-semibold text-right">OH ponderada</th>
              <th className="py-1.5 pr-3 font-semibold text-right">Mín</th>
              <th className="py-1.5 pr-3 font-semibold text-right">Máx</th>
              <th className="py-1.5 pr-3 font-semibold text-right">n</th>
              <th className="py-1.5 font-semibold text-right">Participación hab.</th>
            </tr>
          </thead>
          <tbody>
            {ind.porGrupo.map(g => (
              <tr key={g.tipoCategoria} className="border-b border-gray-100">
                <td className="py-1 pr-3 text-text-primary">{g.tipoCategoria}</td>
                <td className="py-1 pr-3 text-right font-semibold text-text-primary whitespace-nowrap">
                  {tieneDatos(g) ? formatearPorcentaje(g.estadisticas.mediaPonderada) : '—'}
                </td>
                <td className="py-1 pr-3 text-right text-text-secondary whitespace-nowrap">{formatearPorcentaje(g.estadisticas.minimo)}</td>
                <td className="py-1 pr-3 text-right text-text-secondary whitespace-nowrap">{formatearPorcentaje(g.estadisticas.maximo)}</td>
                <td className="py-1 pr-3 text-right text-text-secondary">{formatearEntero(g.estadisticas.n)}</td>
                <td className="py-1 text-right text-text-secondary whitespace-nowrap">{formatearPorcentaje(g.participacionHabitaciones)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-text-secondary italic mt-1">Solo se muestran los grupos con datos. Sin datos ≠ 0 %.</p>
    </div>
  )
}

// Escala tonal de la marca: el rango más alto, en color pleno
const TONOS_RANGO = ['bg-primary/25', 'bg-primary/50', 'bg-primary/75', 'bg-primary']

export function DistribucionRangos({ ind }: Props) {
  const { rangos } = ind.distribucionRangos
  return (
    <div className="mb-6 print:mb-4 evitar-corte">
      <TituloSeccion icono="fa-chart-bar">Distribución por rangos de ocupación</TituloSeccion>
      <div className="space-y-2">
        {rangos.map((r, i) => (
          <div key={r.etiqueta} className="flex items-center gap-3">
            <span className="text-xs text-text-secondary w-16 flex-shrink-0">{r.etiqueta.replace('%', ' %')}</span>
            <div className="flex-1 bg-gray-100 h-5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${TONOS_RANGO[Math.min(i, TONOS_RANGO.length - 1)]}`}
                style={{ width: `${Math.max(r.porcentaje, 2)}%` }}
              />
            </div>
            <span className="text-xs text-text-primary w-24 text-right whitespace-nowrap">
              <strong>{formatearEntero(r.cantidad)}</strong> ({formatearPorcentaje(r.porcentaje)})
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function PicosPorGrupo({ ind }: Props) {
  const { picos } = ind
  if (picos.porTipo.length === 0) return null
  return (
    <div className="evitar-corte">
      <TituloSeccion icono="fa-arrow-trend-up" className="mb-2">Picos de ocupación por grupo</TituloSeccion>
      {picos.picoMaximo && (
        <p className="text-xs text-text-secondary mb-2">
          Máximo global: <strong className="text-text-primary">{picos.picoMaximo.tipoCategoria}</strong> ({formatearPorcentaje(picos.picoMaximo.ohMaximo)})
        </p>
      )}
      <div className="overflow-x-auto print:overflow-visible">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b-2 border-gray-200 text-left text-text-secondary">
              <th className="py-1.5 pr-3 font-semibold">Grupo</th>
              <th className="py-1.5 pr-3 font-semibold text-right">OH máximo</th>
              <th className="py-1.5 font-semibold text-right">Establecimientos</th>
            </tr>
          </thead>
          <tbody>
            {picos.porTipo.map(p => (
              <tr key={p.tipoCategoria} className="border-b border-gray-100">
                <td className="py-1 pr-3 text-text-primary">{p.tipoCategoria}</td>
                <td className="py-1 pr-3 text-right font-semibold text-text-primary whitespace-nowrap">{formatearPorcentaje(p.ohMaximo)}</td>
                <td className="py-1 text-right text-text-secondary">{formatearEntero(p.cantidadAlojamientos)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function NotaMetodologicaFicha({ ind }: Props) {
  return (
    <div className="bg-gray-50 rounded-xl p-6 print:p-4 text-xs text-text-secondary print:text-[10px] evitar-corte">
      <h3 className="font-bold text-text-primary mb-2 flex items-center gap-2">
        <i className="fa-solid fa-microscope text-text-secondary" aria-hidden="true" />
        Nota Metodológica
      </h3>
      <div className="space-y-1.5 leading-relaxed">
        <p><strong>OH ponderada (oficial):</strong> porcentaje de habitaciones ocupadas sobre el total de habitaciones relevadas, ponderado por la capacidad de cada establecimiento. Incluye todos los datos registrados.</p>
        <p><strong>Media simple:</strong> promedio aritmético de los porcentajes de ocupación de cada establecimiento, sin ponderar por capacidad.</p>
        <p><strong>Mediana:</strong> percentil 50 de los porcentajes de ocupación. Robusta ante valores extremos.</p>
        <p><strong>Media recortada:</strong> media excluyendo valores fuera del rango media ± 2,5 desvíos estándar (criterio simétrico y automático, consistente con el cálculo de estadía promedio). El número de excluidos se informa entre paréntesis. Si el recorte excluye todas las observaciones, se reporta la media simple.</p>
        <p><strong>Desvío estándar:</strong> se expresa en puntos porcentuales (p. p.) de ocupación.</p>
        <p><strong>Baja actividad comercial:</strong> indicador propio del Observatorio. Porcentaje de establecimientos relevados cuya ocupación es estrictamente inferior al umbral del {formatearPorcentaje(ind.bajaActividad.umbral, 0)}. Refleja establecimientos con actividad comercial reducida. Este indicador no revela la identidad de los establecimientos.</p>
        <p><strong>Sin datos ≠ 0 %:</strong> los establecimientos sin carga explícita no participan en los cálculos. La ausencia de carga no se interpreta como ocupación 0 %.</p>
        <p><strong>Anonimato:</strong> por regla del Observatorio, los indicadores desagregados por grupo no exponen nombres de establecimientos individuales.</p>
        <p className="pt-1">Documento generado el {fechaGeneracion()} por el Observatorio de Turismo Municipal de San Fernando del Valle de Catamarca. Uso interno y para la Asociación de Hoteles.</p>
      </div>
    </div>
  )
}
