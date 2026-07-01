// ═══════════════════════════════════════════════════════════════════════════════
// Tipos y constantes compartidos del módulo Casa de Catamarca (BsAs)
// ═══════════════════════════════════════════════════════════════════════════════

import type { Procedencia } from './geografia'

// ─── Opciones de cada pregunta ────────────────────────────────────────────────
// Todas en MAYÚSCULAS para coincidir con valores almacenados en Sheets.

export const RANGOS_EDAD = [
  '18-24', '25-34', '35-49', '50-64', '65+',
] as const

export const VIAJE_CON_OPCIONES = [
  'SOLO/A',
  'EN PAREJA',
  'CON AMIGOS/AS',
  'EN FAMILIA',
  'OTRO',
] as const

export const DURACION_VIAJE = [
  '1-2 DÍAS',
  '3-5 DÍAS',
  'MÁS DE 5 DÍAS',
] as const

export const ETAPA_VIAJE = [
  'RECIÉN EMPIEZO A EXPLORAR',
  'YA DECIDÍ VIAJAR, ESTOY PLANIFICANDO',
  'YA TENGO TODO PLANIFICADO',
] as const

export const CONOCIA_CATAMARCA = [
  'SÍ, YA LA VISITÉ',
  'LA CONOZCO DE NOMBRE PERO NUNCA FUI',
  'NO LA CONOCÍA',
] as const

export const INTERESES_OPCIONES = [
  'NATURALEZA Y PAISAJES',
  'CULTURA E HISTORIA',
  'AVENTURA Y DEPORTES',
  'GASTRONOMÍA',
  'TERMAS Y BIENESTAR',
  'EVENTOS Y FESTIVALES',
  'COMPRAS Y ARTESANÍAS',
  'OTRO',
] as const

export const COMO_SE_ENTERO_OPCIONES = [
  'RECOMENDACIÓN DE AMIGOS/FAMILIARES',
  'REDES SOCIALES',
  'PÁGINAS WEB/BLOGS DE VIAJES',
  'AGENCIA DE VIAJES',
  'FERIA/EVENTO TURÍSTICO',
  'PUBLICIDAD (TV/RADIO/GRÁFICA)',
  'YA LA CONOCÍA DE ANTES',
  'OTRO',
] as const

export const DONDE_BUSCA_INFO_OPCIONES = [
  'GOOGLE/BUSCADORES',
  'INSTAGRAM',
  'FACEBOOK',
  'TIKTOK',
  'YOUTUBE',
  'PÁGINAS OFICIALES DE TURISMO',
  'BLOGS DE VIAJES',
  'AGENCIAS DE VIAJES',
  'OTRO',
] as const

export const REDES_SOCIALES_OPCIONES = [
  'INSTAGRAM',
  'TIKTOK',
  'FACEBOOK',
  'YOUTUBE',
  'OTRA',
] as const

export const INTERES_CAPITAL_OPCIONES = [
  'SÍ',
  'NO',
  'NO LO HABÍA CONSIDERADO',
] as const

export const ACTIVIDADES_CAPITAL_OPCIONES = [
  'RECORRER EL CENTRO HISTÓRICO',
  'VISITAR MUSEOS',
  'GASTRONOMÍA Y VIDA NOCTURNA',
  'COMPRAS Y ARTESANÍAS',
  'PARQUES Y ESPACIOS VERDES',
  'EVENTOS CULTURALES',
  'VISITAS GUIADAS',
  'CIRCUITOS RELIGIOSOS',
  'OTRO',
] as const

export const DIAS_EN_CAPITAL = [
  '1 DÍA (PASO DEL DÍA)',
  '2 DÍAS',
  '3-4 DÍAS',
  '5 O MÁS DÍAS',
] as const

// ─── Tipos del formulario ─────────────────────────────────────────────────────

export type RangoEdad = typeof RANGOS_EDAD[number]
export type ViajeCon = typeof VIAJE_CON_OPCIONES[number]
export type DuracionViaje = typeof DURACION_VIAJE[number]
export type EtapaViaje = typeof ETAPA_VIAJE[number]
export type ConociaCatamarca = typeof CONOCIA_CATAMARCA[number]
export type InteresCapital = typeof INTERES_CAPITAL_OPCIONES[number]
export type DiasEnCapital = typeof DIAS_EN_CAPITAL[number]

export interface FormState {
  // Sección 1 — Sobre vos
  procedencia: Procedencia | ''
  paisOrigen: string
  provinciaOrigen: string
  departamentoOrigen: string
  localidadOrigen: string
  rangoEdad: string
  viajeCon: string
  viajeConOtroTexto: string
  duracionViaje: string

  // Sección 2 — Tu viaje a Catamarca
  etapaViaje: string
  conociaCatamarca: string
  intereses: string[]
  interesesOtroTexto: string
  lugarImperdible: string

  // Sección 3 — Información y decisión
  comoSeEntero: string
  comoSeEnteroOtroTexto: string
  dondeBuscaInfo: string[]
  dondeBuscaInfoOtroTexto: string
  redSocialInspiracion: string
  redSocialOtraTexto: string

  // Sección 4 — Percepción
  dudasDificultades: string
  probabilidadViaje: string  // string porque es select 1-10 o botón, se convierte a Number en payload

  // Sección 5 — Enfoque en capital
  interesCapital: string
  actividadesCapital: string[]
  actividadesCapitalOtroTexto: string
  diasEnCapital: string
  expectativasCapital: string

  // Sección 6 — Oportunidades
  faltaInfo: string
  motivadorDecision: string
  experienciasDeseadas: string

  // Cierre
  aceptaInfo: string
  emailContacto: string

  // Operativo
  responsableCarga: string
}

export const ESTADO_INICIAL: FormState = {
  procedencia: '',
  paisOrigen: '',
  provinciaOrigen: '',
  departamentoOrigen: '',
  localidadOrigen: '',
  rangoEdad: '',
  viajeCon: '',
  viajeConOtroTexto: '',
  duracionViaje: '',
  etapaViaje: '',
  conociaCatamarca: '',
  intereses: [],
  interesesOtroTexto: '',
  lugarImperdible: '',
  comoSeEntero: '',
  comoSeEnteroOtroTexto: '',
  dondeBuscaInfo: [],
  dondeBuscaInfoOtroTexto: '',
  redSocialInspiracion: '',
  redSocialOtraTexto: '',
  dudasDificultades: '',
  probabilidadViaje: '',
  interesCapital: '',
  actividadesCapital: [],
  actividadesCapitalOtroTexto: '',
  diasEnCapital: '',
  expectativasCapital: '',
  faltaInfo: '',
  motivadorDecision: '',
  experienciasDeseadas: '',
  aceptaInfo: '',
  emailContacto: '',
  responsableCarga: '',
}

// ─── Payload para el GAS (claves exactas que espera el escritor) ──────────────

export interface EncuestaPayload {
  timestamp: string
  procedencia: string
  pais_origen: string
  provincia_origen: string
  departamento_origen: string
  localidad_origen: string
  rango_edad: string
  viaje_con: string
  viaje_con_otro_texto: string
  duracion_viaje: string
  etapa_viaje: string
  conocia_catamarca: string
  intereses: string
  intereses_otro_texto: string
  lugar_imperdible: string
  como_se_entero: string
  como_se_entero_otro_texto: string
  donde_busca_info: string
  donde_busca_info_otro_texto: string
  red_social_inspiracion: string
  red_social_otra_texto: string
  dudas_dificultades: string
  probabilidad_viaje: number | string
  interes_capital: string
  actividades_capital: string
  actividades_capital_otro_texto: string
  dias_en_capital: string
  expectativas_capital: string
  falta_info: string
  motivador_decision: string
  experiencias_deseadas: string
  acepta_info: string
  email_contacto: string
  responsable_carga: string
  canal_carga: string
  apiKey: string
}

type ErroresMap = Partial<Record<keyof FormState | 'intereses' | 'actividadesCapital' | 'dondeBuscaInfo', string>>
export type { ErroresMap as Errores }
