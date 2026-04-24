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
    params: { fields: '*,foto_principal.*' },
  },
  atractivos: {
    endpoint: '/items/atractivos_turisticos',
    params: { fields: '*,foto_principal.*' },
  },
  actividades: {
    endpoint: '/items/actividades',
    params: { fields: '*,lugar_realizacion.nombre,foto_principal.*' },
  },
  agencias: {
    endpoint: '/items/agencias_turisticas',
    params: { fields: '*,foto_principal.*' },
  },
  'alquiler-autos': {
    endpoint: '/items/alquiler_autos',
    params: { fields: '*,foto_principal.*' },
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
      next: { revalidate: 60 }, // Se refresca cada 1 minuto
    })

    if (!res.ok) {
      const errorBody = await res.text().catch(() => '')
      console.error(`[oferta/${collection}] Directus ${res.status}:`, errorBody)
      return NextResponse.json({ error: `Error de Directus: ${res.status}`, details: errorBody }, { status: res.status })
    }

    const data = await res.json()
    
    // Normalizar catagoria -> categoria si existe el typo en la base de datos
    if (Array.isArray(data.data)) {
      data.data = data.data.map((item: any) => ({
        ...item,
        categoria: item.categoria || item.catagoria
      }))
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('[oferta API]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
