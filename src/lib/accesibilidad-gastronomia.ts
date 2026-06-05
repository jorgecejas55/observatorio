export interface GastronomiaAccesibilidadDirectus {
  id: number
  denominacion: string
  tipo: string | null
  direccion: string | null
  foto_principal: string | null
  slug: string | null
  estado: string | null
  especialidad: string | null
  accesibilidad: string[] | null
  acceso_sin_escalones: string | null
  bano_adaptado: string | null
  accesibilidad_general: string | null
  observaciones_accesibilidad: string | null
  opciones_de_menu: string[] | null
}

export function tieneAccesibilidadCargada(r: GastronomiaAccesibilidadDirectus): boolean {
  return !!(
    (Array.isArray(r.accesibilidad) && r.accesibilidad.length > 0) ||
    (r.acceso_sin_escalones && r.acceso_sin_escalones !== 'Sin dato') ||
    (r.bano_adaptado && r.bano_adaptado !== 'Sin dato') ||
    r.accesibilidad_general
  )
}

export function nivelAccesibilidadGastronomia(r: GastronomiaAccesibilidadDirectus): {
  label: string; color: string; bg: string; textColor: string
} {
  switch (r.accesibilidad_general) {
    case 'Plena':
      return { label: 'Plena', color: '#10b981', bg: 'bg-emerald-100', textColor: 'text-emerald-700' }
    case 'Parcial':
      return { label: 'Parcial', color: '#f59e0b', bg: 'bg-amber-100', textColor: 'text-amber-700' }
    case 'En proceso':
      return { label: 'En proceso', color: '#3b82f6', bg: 'bg-blue-100', textColor: 'text-blue-700' }
    default:
      return { label: 'Sin datos', color: '#9ca3af', bg: 'bg-gray-100', textColor: 'text-gray-500' }
  }
}

const LABELS_NECESIDADES: Record<string, string> = {
  'Movilidad Reducida': 'Movilidad',
  'Audición Reducida': 'Audición',
  'Visión Reducida': 'Visión',
}

export function resumenNecesidades(acc: string[] | null): string {
  if (!Array.isArray(acc) || acc.length === 0) return ''
  return acc.map(a => LABELS_NECESIDADES[a] ?? a).join(' · ')
}

const LABELS_MENU: Record<string, string> = {
  'Menú para celíacos': 'Celíaco',
  'Menú vegetariano': 'Vegetariano',
  'Menú vegano': 'Vegano',
}

export function resumenMenusInclusivos(menu: string[] | null): string {
  if (!Array.isArray(menu) || menu.length === 0) return ''
  return menu.map(m => LABELS_MENU[m] ?? m).join(' · ')
}
