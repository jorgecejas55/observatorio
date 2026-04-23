export interface Alojamiento {
  id: string
  timestamp: string
  nombre: string
  tipo: string
  direccion: string
  coordenadas: string
  estado?: string
  propietario?: string
  telefono?: string
  email?: string
  redes_sociales?: string
  habitaciones?: number
  plazas?: number
  tipo_unidades?: string
  precio?: number
  servicios?: string
  movilidad_reducida?: string
  horario_ingreso?: string
  horario_salida?: string
  observaciones?: string
  creado_por?: string
  fecha_creacion?: string
  modificado_por?: string
  fecha_modificacion?: string
}

export interface AlojamientoMapData {
  id: string
  nombre: string
  tipo: string
  direccion: string
  lat: number
  lng: number
  habitaciones?: number
  plazas?: number
  precio?: number
}

async function apiGet(action: string, params: Record<string, string> = {}): Promise<any> {
  const url = new URL('/api/alojamientos', window.location.origin)
  url.searchParams.set('action', action)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString())
  return res.json()
}

async function apiPost(body: object): Promise<any> {
  const res = await fetch('/api/alojamientos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

const AlojamientosService = {
  async getAlojamientos(): Promise<Alojamiento[]> {
    const result = await apiGet('getAlojamientos')
    if (result.success) return result.data
    throw new Error(result.message || 'Error al obtener alojamientos')
  },

  async getMapData(): Promise<AlojamientoMapData[]> {
    const result = await apiGet('getMapData')
    if (result.success) return result.data
    throw new Error(result.message || 'Error al obtener datos del mapa')
  },

  async getAlojamiento(id: string): Promise<Alojamiento> {
    const result = await apiGet('getAlojamiento', { id })
    if (result.success) return result.data
    throw new Error(result.message || 'Alojamiento no encontrado')
  },

  async createAlojamiento(data: Partial<Alojamiento>, creadoPor: string): Promise<Alojamiento> {
    const result = await apiPost({ action: 'createAlojamiento', data, creado_por: creadoPor })
    if (result.success) return result.data
    throw new Error(result.message || 'Error al crear alojamiento')
  },

  async updateAlojamiento(id: string, data: Partial<Alojamiento>, modificadoPor: string): Promise<Alojamiento> {
    const result = await apiPost({ action: 'updateAlojamiento', id, data, modificado_por: modificadoPor })
    if (result.success) return result.data
    throw new Error(result.message || 'Error al actualizar alojamiento')
  },

  async deleteAlojamiento(id: string): Promise<boolean> {
    const result = await apiPost({ action: 'deleteAlojamiento', id })
    if (result.success) return true
    throw new Error(result.message || 'Error al eliminar alojamiento')
  },
}

export default AlojamientosService
