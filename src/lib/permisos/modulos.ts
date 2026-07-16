/**
 * Registro canónico de módulos del sistema.
 * Cada módulo define su label y las rutas (páginas + APIs) que cubre.
 */

export const MODULOS = {
  'ocupacion': {
    label: 'Ocupación Hotelera',
    rutas: ['/admin/ocupacion', '/api/ocupacion'],
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
} as const

export type ModuloKey = keyof typeof MODULOS

/** Lista de claves de módulo válidas para validación rápida */
export const MODULO_KEYS = Object.keys(MODULOS) as ModuloKey[]

/** Valida si un string es una clave de módulo válida */
export function esModuloValido(key: string): key is ModuloKey {
  return MODULO_KEYS.includes(key as ModuloKey)
}
