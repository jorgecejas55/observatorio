import {
  AlojamientoDirectus,
  GastronomiaDirectus,
  AtractivoDirectus,
  ActividadDirectus,
  ServicioGeneralDirectus,
  DirectusResponse,
} from '@/lib/types/directus'

// Solo la URL base es pública — se usa únicamente para construir URLs de imágenes
const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'https://turismo.apps.cc.gob.ar'

const DirectusService = {
  async _fetch<T>(collection: string): Promise<T[]> {
    const response = await fetch(`/api/oferta/${collection}`)

    if (!response.ok) {
      throw new Error(`Error al obtener ${collection} (${response.status})`)
    }

    const result: DirectusResponse<T> = await response.json()
    return result.data
  },

  getImageUrl(id: string | undefined): string {
    if (!id) return '/placeholder-image.jpg'
    return `${DIRECTUS_URL}/assets/${id}`
  },

  async getAlojamientos(): Promise<AlojamientoDirectus[]> {
    return this._fetch<AlojamientoDirectus>('alojamientos')
  },

  async getGastronomia(): Promise<GastronomiaDirectus[]> {
    return this._fetch<GastronomiaDirectus>('gastronomia')
  },

  async getAtractivos(): Promise<AtractivoDirectus[]> {
    return this._fetch<AtractivoDirectus>('atractivos')
  },

  async getActividades(): Promise<ActividadDirectus[]> {
    return this._fetch<ActividadDirectus>('actividades')
  },

  async getServiciosGenerales(categoria?: string): Promise<ServicioGeneralDirectus[]> {
    if (categoria === 'Agencias de Viajes') return this._fetch<ServicioGeneralDirectus>('agencias')
    if (categoria === 'Alquiler de Vehículos') return this._fetch<ServicioGeneralDirectus>('alquiler-autos')
    return this._fetch<ServicioGeneralDirectus>('agencias')
  },
}

export default DirectusService
