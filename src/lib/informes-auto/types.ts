// ── Sistema OH ────────────────────────────────────────────────────────────────

export interface RelevamientoOH {
  id: string
  nombre: string
  tipo: 'Mensual' | 'Especial'
  estado: 'EN_CURSO' | 'CERRADO'
  fechaInicio: string
  fechaFin: string
  ohTotal: number
  ohRegistrado: number
  ohNoRegistrado: number
  ohEnTramite: number
  ohMin: number
  ohMax: number
  cantidadRelevados: number
  cantidadRegistrados: number
  // Metadata opcional (presente en relevamientos cerrados / vista detalle)
  ohModa?: number
  usuarioCreador?: string
  fechaCreacion?: string
  usuarioCierre?: string
  fechaCierre?: string
}

export interface CargaOH {
  alojamientoId: string
  alojamientoNombre: string
  estadoRegistro: 'REGISTRADO' | 'NO_REGISTRADO' | 'EN_TRAMITE'
  porcentajeOH: number
  capacidadHab: number
}

export interface AlojamientoOH {
  id: string
  nombre: string
  tipo: string
  categoria: string
  capacidadHab: number
  capacidadPlazas: number
  estadoRegistro: string
  estado: string
}

// ── Cálculos ──────────────────────────────────────────────────────────────────

export interface OHPorTipo {
  tipo: string
  ohPorcentaje: number
  habitacionesRelevadas: number
  habitacionesOcupadas: number
}

// ── Picos de ocupación (máximos por establecimiento, agrupados por tipo+categoría) ──

export interface PicoOcupacion {
  tipoCategoria: string          // etiqueta tipo+categoría (ej. "Hotel 3 estrellas", "Apart Hotel")
  ohMaximo: number               // OH máximo alcanzado por un alojamiento de ese grupo
  cantidadAlojamientos: number   // alojamientos del grupo con datos (para preservar anonimato)
}

export interface PicosOcupacion {
  picoMaximo: { tipoCategoria: string; ohMaximo: number } | null  // mayor pico del relevamiento
  porTipo: PicoOcupacion[]                                        // máximo por grupo, desc
}

export interface ResultadoEstadiaSinOutliers {
  estadiaPromedio: number
  n: number
  nExcluidas: number
}

export interface InputsImpactoEconomico {
  plazasDisponibles: number
  duracionPeriodo: number           // noches
  ohPorcentaje: number
  estadiaPromedio: number
  gastoDiarioTuristas: number
  gastoDiarioExcursionistas: number
  porcentajeExcursionistas: number  // % sobre turistas alojados (histórico: 10%-80%)
}

export interface ResultadoImpactoEconomico {
  pernoctesEnOferta: number
  pernoctesConsumidos: number
  turistasAlojados: number
  excursionistas: number
  visitantesTotales: number
  impactoTuristas: number
  impactoExcursionistas: number
  impactoTotal: number
}

// ── Perfil del visitante ──────────────────────────────────────────────────────

export interface DatosPerfilVisitante {
  totalEncuestas: number
  estadiaSinOutliers: ResultadoEstadiaSinOutliers
  procedencia: Record<'NACIONAL' | 'PROVINCIAL' | 'INTERNACIONAL', number>
  provinciasFrecuentes: Array<{ nombre: string; cantidad: number }>
  motivosVisita: Array<{ nombre: string; cantidad: number }>
  gruposViaje: Array<{ nombre: string; cantidad: number }>
  mediosTransporte: Array<{ nombre: string; cantidad: number }>
  tiposAlojamiento: Array<{ nombre: string; cantidad: number }>
  primeraVez: Record<string, number>    // claves normalizadas: 'SÍ', 'NO'
  otrosDestinos: Record<string, number>  // claves normalizadas: 'SÍ', 'NO'
  recomendaria: Record<string, number>   // claves normalizadas: 'SÍ', 'NO'
  volveria: Record<string, number>       // claves normalizadas: 'SÍ', 'NO'
}

// ── Tipo de informe ───────────────────────────────────────────────────────────

/** FSL: fin de semana largo · EVENTO: evento con nombre propio · MENSUAL: mes calendario */
export type TipoInforme = 'FSL' | 'EVENTO' | 'MENSUAL'

// ── Registro de la planilla histórica maestra (191cjZK9...) ───────────────────

export interface RegistroMaestro {
  id: string                        // determinístico: finde-<año>-<slug> | mensual-<año>-<mm>
  tipoPeriodo: 'FSL' | 'MENSUAL'    // hoja de origen: indicadores_findes | indicadores_mensual
  anio: number
  mes: string                       // nombre del mes en mayúsculas (como figura en la planilla)
  mesNumero: number | null
  nombre: string                    // evento (findes) o "Mes Año" (mensual)
  oh: number | null
  estadiaProm: number | null
  visitantes: number | null
  impacto: number | null
  fila: number                      // orden dentro de su hoja (cronológico)
}

// ── Comparativa ──────────────────────────────────────────────────────────────

export interface PeriodoComparativo {
  relevamiento: RelevamientoOH | null
  impactoTotal: number | null
  gastoDiarioTuristas: number | null
  visitantes?: number | null        // visitantes del registro maestro (si existen)
  registroMaestroId?: string        // trazabilidad: contra qué registro se comparó
  advertencia?: string
}

// ── Informe completo ──────────────────────────────────────────────────────────

export interface InformeFindeCompleto {
  id: string
  slug: string
  nombre: string
  tipoInforme?: TipoInforme         // ausente en informes viejos → se asume 'FSL'
  fechaInicio: string
  fechaFin: string
  fechaGeneracion: string
  usuarioGenerador: string          // email del usuario que generó el informe
  estado: 'borrador' | 'publicado'

  // Datos del período actual
  relevamiento: RelevamientoOH
  ohPorTipo: OHPorTipo[]
  picos: PicosOcupacion
  perfil: DatosPerfilVisitante
  impacto: ResultadoImpactoEconomico

  // Inputs manuales registrados
  gastoDiarioTuristas: number
  gastoDiarioExcursionistas: number
  /** % de excursionistas sobre turistas (informes nuevos; ausente en viejos) */
  porcentajeExcursionistas?: number
  /** Cantidad de excursionistas: calculada (informes nuevos) o cargada a mano (viejos) */
  excursionistasManual: number

  // Comparativas
  comparativaUltimoFinde: PeriodoComparativo
  comparativaAnioAnterior: PeriodoComparativo

  // Reporte de prensa generado por IA (editable)
  tituloPrensa: string
  bajadaPrensa: string
  reportePrensa: string

  // Propuesta de actividades vigentes durante el finde
  actividades: ResumenActividades

  // Resultado del empuje a la planilla histórica maestra (191cjZK9...)
  empujeMaestra?: ResultadoEmpuje

  // Referencia al informe público (post-publicación)
  idInformePublico?: string
}

// ── Empuje a la planilla histórica maestra ────────────────────────────────────

export interface ResultadoEmpuje {
  ok: boolean
  destino: 'indicadores_findes' | 'indicadores_mensual'
  fecha: string                     // ISO
  error?: string
}

// ── Sugerencia (último informe del mismo tipo en DatosInformes) ────────────────

export interface SugerenciaHistorial {
  evento: string
  anio: number
  gastoDiarioTuristas: number
  gastoDiarioExcursionistas: number
  /** null en informes viejos sin el dato (se deriva de excursionistas/turistas si se puede) */
  porcentajeExcursionistas: number | null
  excursionistas: number
  turistasAlojados: number
}

// ── Payload del formulario ────────────────────────────────────────────────────

/** Valor especial de comparativa manual: omitir el bloque comparativo */
export const COMPARATIVA_NINGUNA = 'NINGUNA'

export interface GenerarInformePayload {
  relevamientoId?: string                 // ID del relevamiento OH (preferido; fechas como fallback)
  tipoInforme?: TipoInforme               // ausente → 'FSL' (compat)
  nombre: string
  fechaInicio: string
  fechaFin: string
  gastoDiarioTuristas: number
  gastoDiarioExcursionistas: number
  porcentajeExcursionistas: number        // % sobre turistas alojados
  comparativaManualUltimoFinde?: string   // ID de registro maestro (anula auto-detección) o 'NINGUNA'
  comparativaManualAnioAnterior?: string  // ID de registro maestro (anula Jaccard) o 'NINGUNA'
}

// ── Actividades ──────────────────────────────────────────────────────────────

export interface ResumenActividades {
  total: number
  porTematica: Array<{ nombre: string; cantidad: number }>
  permanentes: number
  ocasionales: number
  destacadas: string[]
  /** Nombres de actividades vigentes, priorizados: ocasionales → destacadas → permanentes (tope ~15) */
  nombres?: string[]
}

// ── Tendencia del año en curso ─────────────────────────────────────────────────

export interface FindeTendencia {
  evento: string
  oh: number
  estadia_prom: number
  visitantes: number
}

// ── Indicadores Bloque A (Estadísticos de Ocupación Hotelera) ─────────────────

/** Estadísticos de las OH individuales de un relevamiento */
export interface EstadisticasOH {
  mediaSimple: number          // OH-05: promedio aritmético de porcentajes
  mediaPonderada: number       // OH-06: por capacidad (= ohTotal del relevamiento)
  mediana: number              // robusto: percentil 50
  mediaRecortada: number       // robusto: media excluyendo fuera de media ± 2,5σ
  nRecortados: number          // cuántas cargas excluyó el recorte (transparencia)
  desvioEstandar: number       // OH-07: σ poblacional de los porcentajes
  coeficienteVariacion: number // OH-08: σ / mediaSimple × 100 (0 si media = 0)
  minimo: number               // OH-02
  maximo: number               // OH-03
  moda: number                 // OH-04
  n: number                    // OH-09: cantidad de cargas válidas
}

/** Baja actividad comercial (indicador propio del Observatorio) */
export interface BajaActividadComercial {
  umbral: number               // % (default UMBRAL_BAJA_ACTIVIDAD = 10)
  cantidad: number             // establecimientos con OH < umbral
  porcentaje: number           // % sobre el total de relevados
}

/** Estadísticos por grupo tipo-categoría (OH-14) */
export interface EstadisticasOHPorGrupo {
  tipoCategoria: string
  estadisticas: EstadisticasOH
  habitacionesRelevadas: number
  habitacionesOcupadas: number
  participacionHabitaciones: number  // OH-15: % del total de habitaciones relevadas
}

/** Distribución de cargas por rango de OH */
export interface DistribucionRangosOH {
  rangos: Array<{
    etiqueta: string      // '0-25%', '25-50%', '50-75%', '75-100%'
    desde: number
    hasta: number
    cantidad: number
    porcentaje: number    // % de cargas en este rango
  }>
  total: number
}

/** Fila completa de indicadores de un relevamiento (lo que se persiste) */
export interface IndicadoresRelevamiento {
  relevamientoId: string
  fechaCalculo: string             // yyyy-MM-dd (texto)
  global: EstadisticasOH
  bajaActividad: BajaActividadComercial
  cobertura: number | null         // OH-10 (null si no se conoce el padrón)
  totalAlojamientosActivos: number | null
  habitacionesRelevadas: number    // OH-26 (en habitaciones)
  habitacionesOcupadas: number     // OH-27
  porGrupo: EstadisticasOHPorGrupo[]
  distribucionRangos: DistribucionRangosOH
  picos: PicosOcupacion            // OH-16 (reutiliza tipo existente)
}
