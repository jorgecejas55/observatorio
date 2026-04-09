export const ESTADOS = ['Registrado', 'Confirmado', 'En progreso', 'Finalizado', 'Cancelado'] as const
export type Estado = typeof ESTADOS[number]

export const FUENTES = [
  'Acercamiento del generador',
  'Relevamiento STDE',
  'A través de asociación o generador',
  'A través de organizador',
  'A través de área de gobierno provincial',
  'A través de área de gobierno municipal',
  'Otra',
] as const

export const ORIGENES = ['Asociativa', 'Corporativa', 'Gubernamental', 'Académica', 'Mixto', 'Otro'] as const

export const TIPOS = [
  'Congresos y convenciones',
  'Ferias y exposiciones',
  'Culturales y deportivos',
  'Incentivo',
] as const
export type Tipo = typeof TIPOS[number]

export const SUBTIPOS: Record<Tipo, string[]> = {
  'Congresos y convenciones': ['Congreso', 'Convención', 'Seminario', 'Jornada', 'Conferencia', 'Encuentro', 'Simposio', 'Foro', 'Asamblea'],
  'Ferias y exposiciones': ['Feria', 'Exposición', 'Workshop'],
  'Culturales y deportivos': ['Deportivo internacional', 'Deportivo Nacional', 'Deportivo Regional/interprovincial', 'Deportivo Provincial', 'Cultural'],
  'Incentivo': ['Incentivo'],
}

export const TIPOS_SEDE = [
  'Salón/espacio de organismo público',
  'Salón/espacio privado',
  'Salón/espacio de asociación u organización',
  'Espacio público',
  'Otro',
] as const

export const PERIODICIDADES = ['Único', 'Anual', 'Bianual', 'Itinerante'] as const
export const PRIORIDADES = ['Alta', 'Media', 'Baja'] as const
export const SI_NO = ['Sí', 'No'] as const

// ─── Tipo del dominio ─────────────────────────────────────────────────────────

export interface Evento {
  id: string
  estado: string
  fuente: string
  denominacion: string
  generador: string
  origen: string
  tipo: string
  subtipo: string
  sede: string
  tipoSede: string
  fechaInicio: string
  fechaFin: string
  duracion: string
  periodicidad: string
  referente: string
  email: string
  telefono: string
  // Evaluación
  prioridad: string
  aprobacionAgenda: string
  solicitaAsistencia: string
  detallesAsistenciaSolicitada: string
  detallesAsistenciaAsignada: string
  derivado: string
  detallesDerivacion: string
  presenciaFisica: string
  // Resultados
  totalAsistentes: string
  totalResidentes: string
  totalNoResidentes: string
  inversionSTDE: string
  inversionGenerador: string
  recaudacion: string
  observaciones: string
  // Auditoría
  creadoPor: string
  fechaCreacion: string
  modificadoPor: string
  fechaModificacion: string
}

export const EVENTO_VACIO: Omit<Evento, 'id' | 'creadoPor' | 'fechaCreacion' | 'modificadoPor' | 'fechaModificacion'> = {
  estado: 'Registrado',
  fuente: '',
  denominacion: '',
  generador: '',
  origen: '',
  tipo: '',
  subtipo: '',
  sede: '',
  tipoSede: '',
  fechaInicio: '',
  fechaFin: '',
  duracion: '',
  periodicidad: '',
  referente: '',
  email: '',
  telefono: '',
  prioridad: '',
  aprobacionAgenda: '',
  solicitaAsistencia: '',
  detallesAsistenciaSolicitada: '',
  detallesAsistenciaAsignada: '',
  derivado: '',
  detallesDerivacion: '',
  presenciaFisica: '',
  totalAsistentes: '',
  totalResidentes: '',
  totalNoResidentes: '',
  inversionSTDE: '',
  inversionGenerador: '',
  recaudacion: '',
  observaciones: '',
}

// Badge colors por estado
export const ESTADO_COLORS: Record<string, string> = {
  'Registrado':   'bg-gray-100 text-gray-700',
  'Confirmado':   'bg-blue-100 text-blue-700',
  'En progreso':  'bg-orange-100 text-orange-700',
  'Finalizado':   'bg-green-100 text-green-700',
  'Cancelado':    'bg-red-100 text-red-600',
}
