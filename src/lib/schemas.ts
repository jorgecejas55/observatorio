import { z } from 'zod'

export function esObjectoValido(data: unknown): boolean {
  return (
    typeof data === 'object' &&
    data !== null &&
    !Array.isArray(data) &&
    Object.keys(data as object).length > 0
  )
}

// ─── Auth museos ──────────────────────────────────────────────────────────────

export const MuseoAuthSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(200),
})

// ─── Visitas ocasionales ───────────────────────────────────────────────────────

const PROCEDENCIAS_OCASIONAL = ['Internacional', 'Nacional', 'Provincial', 'Residente'] as const

export const VisitaOcasionalSchema = z.object({
  Fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  'Procedencia ': z.enum(PROCEDENCIAS_OCASIONAL),
  'Lugar de procedencia ': z.string().max(100).optional(),
  'Total de personas': z.number().int().min(1).max(10000),
  motivo_visita: z.string().max(200).optional(),
  canal_difusion: z.string().max(500).optional(),
  usuario_registro: z.string().max(200).optional(),
})

// ─── Visitas institucionales ───────────────────────────────────────────────────

const PROCEDENCIAS_INSTITUCIONAL = ['Internacional', 'Nacional', 'Provincial', 'Local'] as const
const TIPOS_INSTITUCION = [
  'Instituciones educativas',
  'Organismos públicos',
  'Organizaciones sociales y comunitarias',
  'Instituciones religiosas',
  'Sector privado / empresas',
  'Turismo organizado',
  'Otros',
] as const

export const VisitaInstitucionalSchema = z.object({
  fecha_visita: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  procedencia_institucion: z.enum(PROCEDENCIAS_INSTITUCIONAL),
  tipo_institucion: z.enum(TIPOS_INSTITUCION),
  subtipo_institucion: z.string().max(100).optional(),
  nombre_institucion: z.string().min(1).max(200),
  cantidad_asistentes: z.number().int().min(1).max(10000),
  usuario_registro: z.string().max(200).optional(),
})

// ─── Eventos ──────────────────────────────────────────────────────────────────

const ESTADOS_EVENTO = ['Registrado', 'Confirmado', 'En progreso', 'Finalizado', 'Cancelado'] as const

// Acepta string | number | null | undefined — necesario porque GAS devuelve números en campos como total_asistentes, duracion, etc.
const stringDesdeGAS = (max: number) => z.preprocess(
  (val) => {
    if (val === null || val === undefined) return ''
    if (typeof val === 'number') return String(val)
    return val
  },
  z.string().max(max)
)

const campo = stringDesdeGAS(500).optional().default('')
const campoLargo = stringDesdeGAS(2000).optional().default('')

export const EventoSchema = z.object({
  _userEmail: z.string().email().optional(),
  estado: z.enum(ESTADOS_EVENTO).default('Registrado'),
  denominacion: z.string().min(1).max(500),
  fuente: campo,
  generador: campo,
  origen: campo,
  tipo: campo,
  subtipo: campo,
  sede: campo,
  tipoSede: campo,
  fechaInicio: campo,
  fechaFin: campo,
  duracion: campo,
  periodicidad: campo,
  referente: campo,
  email: z.union([z.string().email(), z.literal('')]).optional().default(''),
  telefono: campo,
  prioridad: campo,
  aprobacionAgenda: campo,
  solicitaAsistencia: campo,
  detallesAsistenciaSolicitada: campoLargo,
  detallesAsistenciaAsignada: campoLargo,
  derivado: campo,
  detallesDerivacion: campoLargo,
  presenciaFisica: campo,
  totalAsistentes: campo,
  totalResidentes: campo,
  totalNoResidentes: campo,
  inversionSTDE: campo,
  inversionGenerador: campo,
  recaudacion: campo,
  observaciones: campoLargo,
})

// ─── Percepción Social del Residente ─────────────────────────────────────────

const SECTORES_PERCEPCION = ['Norte', 'Sur', 'Este', 'Oeste', 'Centro'] as const
const ESCALA_SATISFACCION_IMPACTO = [
  'Muy satisfecho/a',
  'Satisfecho/a',
  'Ni satisfecho/a ni insatisfecho/a',
  'Insatisfecho/a',
  'Muy insatisfecho/a',
] as const
const ESCALA_SATISFACCION_GESTION = [
  'Muy satisfecho/a',
  'Satisfecho/a',
  'Neutro/a',
  'Insatisfecho/a',
  'Muy insatisfecho/a',
] as const
const BENEFICIOS_PERCEPCION = [
  'Fortalece la imagen, el prestigio y la identidad de la ciudad',
  'Genera empleo y desarrollo económico',
  'Impulsa mejoras en infraestructura y espacios públicos',
  'Incrementa la oferta cultural y de entretenimiento',
] as const

export const PercepcionSocialSchema = z.object({
  sector: z.enum(SECTORES_PERCEPCION),
  edad: z.string().regex(/^\d+$/).refine((v) => { const n = parseInt(v); return n >= 18 && n <= 120 }),
  ciudad_turistica: z.enum(['Sí', 'No', 'Tal vez']),
  frecuencia_interaccion: z.enum(['Frecuentemente', 'Ocasionalmente', 'Nunca']),
  definicion: z.string().min(1).max(50),
  representacion_turistica: z.string().min(1).max(500),
  conocimiento_actividades: z.enum(['Nada', 'Poco', 'Mucho']),
  canales_info: z.string().max(500).optional().default(''),
  beneficio_principal: z.enum(BENEFICIOS_PERCEPCION),
  satisfaccion_impacto: z.enum(ESCALA_SATISFACCION_IMPACTO),
  impactos_negativos: z.string().min(1).max(500),
  gestion_informacion: z.enum(ESCALA_SATISFACCION_GESTION),
  gestion_espacios: z.enum(ESCALA_SATISFACCION_GESTION),
  gestion_participacion: z.enum(ESCALA_SATISFACCION_GESTION),
  gestion_beneficios_locales: z.enum(ESCALA_SATISFACCION_GESTION),
  atractivo_impulsar: z.string().max(500).optional().default(''),
  propuesta: z.string().max(1000).optional().default(''),
  timestamp: z.string().optional(),
})

// ─── Métricas Digitales ────────────────────────────────────────────────────────

const MesAnioSchema = z.string().regex(/^\d{2}\/\d{4}$/, 'Formato debe ser MM/YYYY')

export const MetricaWebSchema = z.object({
  mes_anio: MesAnioSchema,
  visitantes: z.number().int().nonnegative(),
  regiones: z.array(z.object({
    region: z.string().min(1),
    visitas: z.number().int().nonnegative()
  })).max(10).optional(),
  fuentes: z.array(z.object({
    fuente: z.string().min(1),
    visitas: z.number().int().nonnegative()
  })).max(5).optional(),
  usuario_registro: z.string().optional()
})

export const MetricaSocialSchema = z.object({
  mes_anio: MesAnioSchema,
  seguidores: z.number().int().nonnegative(),
  interacciones: z.number().int().nonnegative(),
  publicaciones: z.number().int().nonnegative(),
  usuario_registro: z.string().optional()
})

export const MetricaCatuSchema = z.object({
  mes_anio: MesAnioSchema,
  conversaciones: z.number().int().nonnegative(),
  mensajes: z.number().int().nonnegative(),
  puntuacion_promedio: z.number().min(0).max(10),
  tasa_resolucion: z.number().min(0).max(100),
  usuario_registro: z.string().optional()
})

