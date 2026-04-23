import { NextResponse } from 'next/server'

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'https://turismo.apps.cc.gob.ar'
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN || ''

const COLLECTIONS: Record<string, { endpoint: string; params: Record<string, string> }> = {
  alojamientos: {
    endpoint: '/items/alojamientos',
    params: { fields: '*,servicios.servicios_id.nombre_del_servicio,foto_principal.*' },
  },
  gastronomia: {
    endpoint: '/items/gastronomia',
    params: { fields: '*.*' },
  },
  atractivos: {
    endpoint: '/items/atractivos_turisticos',
    params: { fields: '*.*' },
  },
  actividades: {
    endpoint: '/items/actividades',
    params: { fields: '*,lugar_realizacion.nombre,foto_principal.*' },
  },
  agencias: {
    endpoint: '/items/servicios_generales',
    params: { fields: '*.*', 'filter[catagoria][_eq]': 'Agencias de Viajes' },
  },
  'alquiler-autos': {
    endpoint: '/items/servicios_generales',
    params: { fields: '*.*', 'filter[catagoria][_eq]': 'Alquiler de Vehículos' },
  },
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ collection: string }> }
) {
  try {
    const { collection } = await params
    const config = COLLECTIONS[collection]

    if (!config) {
      return NextResponse.json({ error: 'Colección no válida' }, { status: 400 })
    }

    const url = new URL(`${DIRECTUS_URL}${config.endpoint}`)
    url.searchParams.set('filter[status][_eq]', 'published')
    url.searchParams.set('limit', '-1')
    Object.entries(config.params).forEach(([k, v]) => url.searchParams.set(k, v))

    const res = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${DIRECTUS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      console.error(`[oferta/${collection}] Directus error ${res.status}`)
      return NextResponse.json({ error: 'Error al obtener datos' }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    console.error('[oferta API]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
