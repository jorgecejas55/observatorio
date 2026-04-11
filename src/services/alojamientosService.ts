// Servicio para interactuar con el Google Apps Script de alojamientos no registrados

const ALOJAMIENTOS_URL = process.env.NEXT_PUBLIC_ALOJAMIENTOS_SCRIPT_URL || ''

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

const AlojamientosService = {
  /**
   * Helper para peticiones GET
   */
  async _requestGet(params: Record<string, string>): Promise<any> {
    if (!ALOJAMIENTOS_URL) {
      throw new Error('URL del script no configurada (NEXT_PUBLIC_ALOJAMIENTOS_SCRIPT_URL)')
    }

    const url = new URL(ALOJAMIENTOS_URL)
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
    })

    return response.json()
  },

  /**
   * Helper para peticiones POST
   */
  async _requestPost(payload: any): Promise<any> {
    if (!ALOJAMIENTOS_URL) {
      throw new Error('URL del script no configurada (NEXT_PUBLIC_ALOJAMIENTOS_SCRIPT_URL)')
    }

    const response = await fetch(ALOJAMIENTOS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    })

    return response.json()
  },

  /**
   * Obtener todos los alojamientos
   */
  async getAlojamientos(): Promise<Alojamiento[]> {
    try {
      const result = await this._requestGet({ action: 'getAlojamientos' })
      if (result.success) {
        return result.data
      } else {
        throw new Error(result.message || 'Error al obtener alojamientos')
      }
    } catch (error) {
      console.error('Error en getAlojamientos:', error)
      throw error
    }
  },

  /**
   * Obtener datos para el mapa (lat/lng parseadas)
   */
  async getMapData(): Promise<AlojamientoMapData[]> {
    try {
      const result = await this._requestGet({ action: 'getMapData' })
      if (result.success) {
        return result.data
      } else {
        throw new Error(result.message || 'Error al obtener datos del mapa')
      }
    } catch (error) {
      console.error('Error en getMapData:', error)
      throw error
    }
  },

  /**
   * Obtener un alojamiento por ID
   */
  async getAlojamiento(id: string): Promise<Alojamiento> {
    try {
      const result = await this._requestGet({ action: 'getAlojamiento', id })
      if (result.success) {
        return result.data
      } else {
        throw new Error(result.message || 'Alojamiento no encontrado')
      }
    } catch (error) {
      console.error('Error en getAlojamiento:', error)
      throw error
    }
  },

  /**
   * Crear nuevo alojamiento
   */
  async createAlojamiento(data: Partial<Alojamiento>, creadoPor: string): Promise<Alojamiento> {
    try {
      const result = await this._requestPost({
        action: 'createAlojamiento',
        data,
        creado_por: creadoPor,
      })

      if (result.success) {
        return result.data
      } else {
        throw new Error(result.message || 'Error al crear alojamiento')
      }
    } catch (error) {
      console.error('Error en createAlojamiento:', error)
      throw error
    }
  },

  /**
   * Actualizar alojamiento existente
   */
  async updateAlojamiento(id: string, data: Partial<Alojamiento>, modificadoPor: string): Promise<Alojamiento> {
    try {
      const result = await this._requestPost({
        action: 'updateAlojamiento',
        id,
        data,
        modificado_por: modificadoPor,
      })

      if (result.success) {
        return result.data
      } else {
        throw new Error(result.message || 'Error al actualizar alojamiento')
      }
    } catch (error) {
      console.error('Error en updateAlojamiento:', error)
      throw error
    }
  },

  /**
   * Eliminar alojamiento
   */
  async deleteAlojamiento(id: string): Promise<boolean> {
    try {
      const result = await this._requestPost({
        action: 'deleteAlojamiento',
        id,
      })

      if (result.success) {
        return true
      } else {
        throw new Error(result.message || 'Error al eliminar alojamiento')
      }
    } catch (error) {
      console.error('Error en deleteAlojamiento:', error)
      throw error
    }
  },
}

export default AlojamientosService
