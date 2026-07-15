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
  excursionistas: number            // número absoluto
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

// ── Comparativa ──────────────────────────────────────────────────────────────

export interface PeriodoComparativo {
  relevamiento: RelevamientoOH | null
  impactoTotal: number | null
  gastoDiarioTuristas: number | null
  advertencia?: string
}

// ── Informe completo ──────────────────────────────────────────────────────────

export interface InformeFindeCompleto {
  id: string
  slug: string
  nombre: string
  fechaInicio: string
  fechaFin: string
  fechaGeneracion: string
  usuarioGenerador: string          // siempre 'jorgecejas55@gmail.com'
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

  // Referencia al informe público (post-publicación)
  idInformePublico?: string
}

// ── Registros del historial ───────────────────────────────────────────────────

export interface RegistroHistorial {
  anio: number
  tipo: string
  evento: string
  ohPorcentaje: number
  estadiaPromedio: number
  turistasAlojados: number
  excursionistas: number
  visitantesTotales: number
  gastoDiarioTuristas: number
  gastoDiarioExcursionistas: number
  impactoTotal: number
}

// ── Sugerencia del historial (último registro) ─────────────────────────────────

export interface SugerenciaHistorial {
  evento: string
  anio: number
  gastoDiarioTuristas: number
  gastoDiarioExcursionistas: number
  excursionistas: number
  turistasAlojados: number
}

// ── Payload del formulario ────────────────────────────────────────────────────

export interface GenerarInformePayload {
  nombre: string
  fechaInicio: string
  fechaFin: string
  gastoDiarioTuristas: number
  gastoDiarioExcursionistas: number
  excursionistas: number
  comparativaManualUltimoFinde?: string   // ID de relevamiento OH para último finde del año (anula auto-detección)
  comparativaManualAnioAnterior?: string  // ID de relevamiento OH para mismo finde año anterior (anula Jaccard)
}

// ── Actividades ──────────────────────────────────────────────────────────────

export interface ResumenActividades {
  total: number
  porTematica: Array<{ nombre: string; cantidad: number }>
  permanentes: number
  ocasionales: number
  destacadas: string[]
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
