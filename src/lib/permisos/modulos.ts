/**
 * Registro canónico de módulos del sistema.
 * Cada módulo define su label y las rutas (páginas + APIs) que cubre.
 */

export const MODULOS = {
  'ocupacion': {
    label: 'Ocupación Hotelera',
    rutas: ['/admin/ocupacion', '/api/ocupacion'],
  },
  'atractivos-casa-puna': {
    label: 'Atractivo Casa de la Puna',
    rutas: ['/ocio/ingresos/casa-la-puna', '/api/ocio/ingresos/atractivos/casa-la-puna'],
  },
  'atractivos-pueblo-perdido': {
    label: 'Atractivo Pueblo Perdido',
    rutas: ['/ocio/ingresos/pueblo-perdido', '/api/ocio/ingresos/atractivos/pueblo-perdido'],
  },
  'informes-auto': {
    label: 'Agente de informes',
    rutas: ['/admin/informes-auto', '/api/informes-auto'],
  },
  'casa-catamarca': {
    label: 'Casa de Catamarca (panel)',
    rutas: ['/casa-catamarca/dashboard', '/api/casa-catamarca/dashboard', '/api/casa-catamarca/export'],
  },
  'usuarios': {
    label: 'Gestión de usuarios',
    rutas: ['/admin/usuarios', '/api/admin/usuarios'],
  },
  'metricas': {
    label: 'Métricas',
    rutas: ['/admin/metricas'],
  },
  'informes': {
    label: 'Carga de informes',
    rutas: ['/admin/informes'],
  },
  'config': {
    label: 'Configuración',
    rutas: ['/admin/config'],
  },
  'eventos': {
    label: 'Registro de Eventos',
    rutas: ['/eventos/registro', '/api/eventos'],
  },
} as const

export type ModuloKey = keyof typeof MODULOS

/**
 * Rol global del usuario.
 * - admin: acceso total (lectura + escritura).
 * - operador: lectura + escritura en sus módulos, incluye gestión (dashboard, editar, borrar).
 * - cargador: solo alta (crear) en sus módulos — pensado para quien carga formularios en el
 *   campo (ej. guías de atractivos). No ve dashboard/listados de gestión, no edita ni borra.
 * - lector: solo lectura en sus módulos.
 */
export type Rol = 'admin' | 'operador' | 'cargador' | 'lector'

export const ROLES: readonly Rol[] = ['admin', 'operador', 'cargador', 'lector'] as const

/** Lista de claves de módulo válidas para validación rápida */
export const MODULO_KEYS = Object.keys(MODULOS) as ModuloKey[]

/** Valida si un string es una clave de módulo válida */
export function esModuloValido(key: string): key is ModuloKey {
  return MODULO_KEYS.includes(key as ModuloKey)
}
