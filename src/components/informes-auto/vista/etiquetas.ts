import type { InformeFindeCompleto, TipoInforme } from '@/lib/informes-auto/types'

export const ETIQUETAS_TIPO: Record<TipoInforme, { portada: string; header: string }> = {
  FSL: { portada: 'Fin de Semana Largo', header: 'Informe Fin de Semana Largo' },
  EVENTO: { portada: 'Evento Turístico', header: 'Informe de Evento' },
  MENSUAL: { portada: 'Informe Estadístico Mensual', header: 'Informe Mensual' },
}

export function etiquetasDe(informe: InformeFindeCompleto) {
  return ETIQUETAS_TIPO[informe.tipoInforme ?? 'FSL']
}

/** Título de los encabezados: "Informe Mensual — Agosto 2026". */
export function tituloInforme(informe: InformeFindeCompleto): string {
  return `${etiquetasDe(informe).header} — ${informe.nombre}`
}
