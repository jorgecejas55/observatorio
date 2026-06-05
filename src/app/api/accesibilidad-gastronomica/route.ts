import { NextResponse } from 'next/server'

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'https://turismo.apps.cc.gob.ar'
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN || ''

const FIELDS = [
  'id', 'denominacion', 'tipo', 'especialidad', 'direccion', 'foto_principal', 'slug', 'estado',
  'accesibilidad', 'acceso_sin_escalones', 'bano_adaptado',
  'accesibilidad_general', 'observaciones_accesibilidad',
  'opciones_de_menu',
].join(',')

export async function GET() {
  try {
    const url = new URL(`${DIRECTUS_URL}/items/gastronomia`)
    url.searchParams.set('fields', FIELDS)
    url.searchParams.set('limit', '-1')
    url.searchParams.set('sort', 'denominacion')

    const res = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${DIRECTUS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 300 },
    })

    if (!res.ok) {
      const err = await res.text().catch(() => '')
      console.error('[accesibilidad-gastronomica] Directus error:', res.status, err)
      return NextResponse.json({ error: `Error Directus: ${res.status}` }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    console.error('[accesibilidad-gastronomica]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
