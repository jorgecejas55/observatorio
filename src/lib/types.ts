// ─── Roles ────────────────────────────────────────────────────────────────────

export type Rol = 'operador' | 'tecnico' | 'admin'

export interface Usuario {
  id: string
  email: string
  nombre: string
  rol: Rol
  activo: boolean
}

// ─── Atractivos ───────────────────────────────────────────────────────────────

export type AtractivoId =
  | 'pueblo-perdido'
  | 'casa-la-puna'
  | 'cabina-info'
  | 'casa-turismo'
  | 'museo-adan-quiroga'
  | 'museo-virgen-valle'
  | 'museo-casa-caravati'

export const ATRACTIVOS: Record<AtractivoId, string> = {
  'pueblo-perdido': 'Pueblo Perdido de la Quebrada',
  'casa-la-puna': 'Casa de La Puna',
  'cabina-info': 'Oficina de Información — Cabina',
  'casa-turismo': 'Casa de Turismo',
  'museo-adan-quiroga': 'Museo Arqueológico Adán Quiroga',
  'museo-virgen-valle': 'Museo de la Virgen del Valle',
  'museo-casa-caravati': 'Museo de la Ciudad - Casa Caravati',
}

// ─── Ocio / Demanda ───────────────────────────────────────────────────────────

export interface RegistroIngreso {
  fecha: string
  atractivo: AtractivoId
  cantidad: number
  observaciones?: string
  usuario: string
  timestamp: string
}

export interface RegistroCamping {
  fecha: string
  cantidadPersonas: number
  cantidadCarpas: number
  cantidadAutocaravanas: number
  observaciones?: string
  usuario: string
  timestamp: string
}

export interface EncuestaTurista {
  fecha: string
  procedencia: string
  edad: string
  genero: string
  nivelEducativo: string
  motivoViaje: string
  composicionGrupo: string
  cantidadPersonas: number
  cantidadNoches: number
  tipoAlojamiento: string
  gastoEstimado?: number
  medioTransporte: string
  fuenteInformacion: string
  satisfaccionGeneral: number // 1-5
  observaciones?: string
  encuestador: string
  timestamp: string
}

// ─── Eventos ──────────────────────────────────────────────────────────────────

export interface RegistroEvento {
  nombre: string
  fecha: string
  fechaFin?: string
  lugar: string
  tipoEvento: string
  capacidadEstimada?: number
  asistentesForaneos?: number
  asistentesLocales?: number
  descripcion?: string
  usuario: string
  timestamp: string
}

export interface EncuestaDemandaEvento {
  fecha: string
  evento: string
  procedencia: string
  edad: string
  genero: string
  motivoVisita: string
  primerVez: boolean
  cantidadNoches: number
  tipoAlojamiento: string
  gastoEstimado?: number
  satisfaccionEvento: number
  satisfaccionDestino: number
  observaciones?: string
  encuestador: string
  timestamp: string
}

// ─── Oferta ───────────────────────────────────────────────────────────────────

export interface AlojamientoTemporario {
  nombre: string
  tipo: string
  direccion: string
  capacidadPersonas: number
  cantidadUnidades: number
  contacto?: string
  plataformas?: string[]
  habilitado?: boolean
  observaciones?: string
  usuario: string
  timestamp: string
}

// ─── Calidad ──────────────────────────────────────────────────────────────────

export interface CalidadAtractivo {
  fecha: string
  atractivo: string
  senalizacion: number
  limpieza: number
  atencionPersonal: number
  infraestructura: number
  accesibilidad: number
  satisfaccionGeneral: number
  recomendaria: boolean
  comentarios?: string
  encuestador: string
  timestamp: string
}

export interface CalidadBus {
  fecha: string
  recorrido: string
  puntualidad: number
  limpieza: number
  atencionChofer: number
  informacionBrindada: number
  relacionCalidadPrecio: number
  satisfaccionGeneral: number
  recomendaria: boolean
  comentarios?: string
  deviceFingerprint?: string
  timestamp: string
}

export interface PercepcionSocial {
  fecha: string
  barrio?: string
  edad: string
  genero: string
  impactoPositivoTurismo: number
  impactoNegativoTurismo: number
  seguridadPublica: number
  serviciosPublicos: number
  empleoGenerado: number
  satisfaccionGeneral: number
  sugerencias?: string
  encuestador: string
  timestamp: string
}

// ─── Estadísticas ─────────────────────────────────────────────────────────────

export interface IndicadorMensual {
  periodo: string // YYYY-MM
  tipo: 'mensual' | 'feriado' | 'evento'
  eventoNombre?: string
  ocupacionHotelera: number // porcentaje
  estadiaMedia: number // noches
  variacionMensual: number // % vs mismo mes año anterior
  cantidadVisitantes: number
  impactoEconomico?: number
  observaciones?: string
  usuario: string
  timestamp: string
}

export interface IngresoMensualAtractivo {
  periodo: string
  atractivo: AtractivoId
  totalVisitantes: number
  tipo: 'mensual' | 'feriado' | 'evento'
  eventoNombre?: string
  observaciones?: string
  usuario: string
  timestamp: string
}

// ─── API ──────────────────────────────────────────────────────────────────────

export interface ApiResponse<T = void> {
  success: boolean
  data?: T
  error?: string
}
