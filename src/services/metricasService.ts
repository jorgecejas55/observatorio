/**
 * Servicio para la gestión de métricas digitales (Web, Redes Sociales, Bot)
 */

export type CanalDigital = 'web' | 'facebook' | 'instagram' | 'catu'

export interface MetricaBase {
  id?: string
  mes_anio: string
  timestamp?: string
  usuario_registro?: string
}

export interface MetricaWeb extends MetricaBase {
  visitantes: number
  regiones?: { region: string; visitas: number }[]
  fuentes?: { fuente: string; visitas: number }[]
}

export interface MetricaSocial extends MetricaBase {
  seguidores: number
  interacciones: number
  publicaciones: number
}

export interface MetricaCatu extends MetricaBase {
  conversaciones: number
  mensajes: number
  puntuacion_promedio: number
  tasa_resolucion: number
}

const MetricasService = {
  /**
   * Obtener métricas de un canal específico
   */
  async getMetricas<T = any>(canal: CanalDigital): Promise<T[]> {
    try {
      const res = await fetch(`/api/metricas/${canal}`)
      const result = await res.json()
      if (result.success) return result.data
      return []
    } catch (error) {
      console.error(`Error al obtener métricas de ${canal}:`, error)
      return []
    }
  },

  /**
   * Crear un nuevo registro de métricas
   */
  async createMetrica(canal: CanalDigital, data: any) {
    try {
      const res = await fetch(`/api/metricas/${canal}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      return await res.json()
    } catch (error) {
      console.error(`Error al crear métrica de ${canal}:`, error)
      return { success: false, error: 'Error de conexión' }
    }
  },

  /**
   * Actualizar un registro existente
   */
  async updateMetrica(canal: CanalDigital, id: string, data: any) {
    try {
      const res = await fetch(`/api/metricas/${canal}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...data })
      })
      return await res.json()
    } catch (error) {
      console.error(`Error al actualizar métrica de ${canal}:`, error)
      return { success: false, error: 'Error de conexión' }
    }
  },

  /**
   * Eliminar un registro
   */
  async deleteMetrica(canal: CanalDigital, id: string) {
    try {
      const res = await fetch(`/api/metricas/${canal}?id=${id}`, {
        method: 'DELETE'
      })
      return await res.json()
    } catch (error) {
      console.error(`Error al eliminar métrica de ${canal}:`, error)
      return { success: false, error: 'Error de conexión' }
    }
  }
}

export default MetricasService
