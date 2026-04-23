/**
 * Tipos para la integración con Directus
 */

export interface DirectusFile {
  id: string
  storage: string
  filename_disk: string
  filename_download: string
  title: string
  type: string
  folder: string
  filesize: number
  width?: number
  height?: number
}

export interface DirectusServiceRel {
  servicios_id: {
    nombre_del_servicio: string
  }
}

export interface DirectusLocation {
  type: string
  coordinates: [number, number] // [lng, lat]
}

export interface AlojamientoDirectus {
  id: number
  status: string
  nombre: string
  tipo_de_alojamiento: string // Campo real de Directus
  categoria?: string          // Campo real de Directus
  direccion: string
  telefono?: string
  email?: string
  web?: string
  descripcion?: string
  foto_principal?: DirectusFile | string
  servicios?: DirectusServiceRel[]
  ubicacion?: DirectusLocation | string
  capacidad_de_habitaciones?: number // Campo real de Directus
  capacidad_plazas?: number           // Campo real de Directus
}

export interface GastronomiaDirectus {
  id: number
  status: string
  nombre?: string       // Algunos pueden tener nombre
  denominacion?: string // Otros denominacion (Gastronomía)
  tipo: string
  especialidad?: string
  direccion: string
  telefono?: string
  descripcion?: string
  foto_principal?: DirectusFile | string
  ubicacion?: DirectusLocation | string
  categoria?: string
  capacidad?: number
  opciones_de_menu?: string[] // Campo de tipo array con strings como "Menú para celíacos"
}

export interface AtractivoDirectus {
  id: number
  status: string
  nombre: string
  descripcion?: string
  direccion?: string
  foto_principal?: DirectusFile
  ubicacion?: DirectusLocation | string
}

export interface ActividadDirectus {
  id: number
  status: string
  nombre: string
  descripcion?: string
  lugar_realizacion?: {
    nombre: string
  }
  foto_principal?: DirectusFile
}

export interface ServicioGeneralDirectus {
  id: number
  status: string
  nombre: string
  categoria: 'agencia' | 'transporte' | 'alquiler_autos' | 'otros'
  direccion?: string
  telefono?: string
  email?: string
  web?: string
  descripcion?: string
  foto_principal?: DirectusFile
}

export interface DirectusResponse<T> {
  data: T[]
}

export interface DirectusSingleResponse<T> {
  data: T
}
