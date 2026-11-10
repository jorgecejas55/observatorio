import { describirFaltante } from '@/lib/informes-auto/canales-digitales-calculo'
import { diferenciasConPlanilla } from '@/lib/informes-auto/evolucion-atractivos-calculo'
import { formatearEntero } from '@/lib/formato-numeros'
import type { InformeFindeCompleto } from '@/lib/informes-auto/types'

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

/** Solo MENSUAL: series que no se pudieron armar y diferencias con la planilla histórica. */
function avisosEvolucion(informe: InformeFindeCompleto): string[] {
  if (informe.tipoInforme !== 'MENSUAL') return []
  const avisos: string[] = []
  if (!informe.evolucionOcupacion) {
    avisos.push('No se pudo leer la planilla maestra: la evolución de ocupación y estadía no se incluye. Volvé a calcular.')
  }
  const evolucion = informe.ingresosAtractivos.evolucion
  if (!evolucion) {
    avisos.push('No se pudo leer la planilla de atractivos: las cards se verán sin evolución mensual. Volvé a calcular.')
    return avisos
  }
  const mes = MESES[evolucion.periodo.mes - 1]
  for (const d of diferenciasConPlanilla(evolucion, informe.ingresosAtractivos.porAtractivo)) {
    avisos.push(`${d.nombre}: el informe registra ${formatearEntero(d.informe)} y la planilla histórica ${formatearEntero(d.planilla)} para ${mes}.`)
  }
  for (const e of evolucion.porAtractivo.filter(x => x.incompleto)) {
    const nombre = informe.ingresosAtractivos.porAtractivo.find(a => a.atractivo === e.atractivo)?.nombre ?? e.atractivo
    avisos.push(`${nombre}: la evolución mensual es parcial (no respondió el sistema).`)
  }
  return avisos
}

/** Datos faltantes o leídos a medias que conviene revisar antes de guardar. */
export function advertenciasDe(informe: InformeFindeCompleto): string[] {
  const avisos: string[] = []
  if (informe.relevamiento.estado === 'EN_CURSO') {
    avisos.push('El relevamiento de ocupación hotelera sigue EN CURSO: los datos pueden no ser finales.')
  }
  if (informe.perfil.totalEncuestas === 0) {
    avisos.push('No hay encuestas de perfil del visitante en el período: estadía, visitantes e impacto salen en cero.')
  }
  for (const a of informe.ingresosAtractivos.porAtractivo.filter(x => x.incompleto)) {
    avisos.push(`${a.nombre}: no se pudo leer todo (dato parcial). Volvé a calcular.`)
  }
  const comparativas = [
    ['Período anterior', informe.comparativaUltimoFinde],
    ['Año anterior', informe.comparativaAnioAnterior],
  ] as const
  for (const [etiqueta, c] of comparativas) {
    if (c.advertencia) avisos.push(`${etiqueta}: ${c.advertencia}`)
  }
  for (const faltante of informe.canalesDigitales?.faltantes ?? []) {
    avisos.push(`${describirFaltante(faltante)}. En el informe se verá "sin datos".`)
  }
  avisos.push(...avisosEvolucion(informe))
  return avisos
}

export default function AdvertenciasRevision({ informe }: { informe: InformeFindeCompleto }) {
  const avisos = advertenciasDe(informe)
  if (avisos.length === 0) {
    return (
      <p className="mb-4 text-xs text-green-700">
        <i className="fa-solid fa-circle-check mr-1.5" aria-hidden="true" />
        Todas las fuentes se leyeron completas.
      </p>
    )
  }
  return (
    <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
      <p className="text-xs font-semibold text-amber-800 mb-1">
        <i className="fa-solid fa-triangle-exclamation mr-1.5" aria-hidden="true" />
        Revisá antes de confirmar
      </p>
      <ul className="list-disc list-inside text-xs text-amber-800 space-y-0.5">
        {avisos.map(aviso => <li key={aviso}>{aviso}</li>)}
      </ul>
    </div>
  )
}
