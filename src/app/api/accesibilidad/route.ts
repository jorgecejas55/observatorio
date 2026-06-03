import { NextResponse } from 'next/server'

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'https://turismo.apps.cc.gob.ar'
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN || ''

const FIELDS_LISTA = [
  'id', 'Estado', 'date_created', 'metodo_relevamiento', 'observaciones',
  'atractivo_id.id', 'atractivo_id.nombre', 'atractivo_id.tipo_atractivos', 'atractivo_id.foto_principal.id',
  'acc_estacionamiento_adaptado', 'acc_sendero_acceso_firme', 'acc_ingreso_sin_escalones',
  'acc_rampa_pendiente_correcta', 'acc_puerta_ingreso_ancho', 'acc_puerta_vidrio_bandas',
  'acc_circulacion_ancho_minimo', 'acc_pisos_antideslizantes', 'acc_cambios_textura_piso',
  'acc_desniveles_resueltos', 'acc_radio_giro_libre', 'acc_mobiliario_descanso',
  'acc_bano_accesible', 'acc_mostrador_adaptado', 'acc_sillas_ruedas_prestamo',
  'acc_visitas_guiadas_accesibles', 'acc_boleteria_prioritaria',
  'acc_mapa_tactico', 'acc_audioguia', 'acc_elementos_tactiles',
  'acc_senalizacion_braille', 'acc_franja_guia_recorrido',
  'acc_videos_subtitulados', 'acc_interprete_lsa', 'acc_aro_magnetico', 'acc_alarmas_visuales',
  'acc_senalizacion_pictogramas', 'acc_informacion_lectura_facil',
  'acc_recorrido_guiado_simple', 'acc_ambiente_sin_sobrestimulacion',
  'val_movilidad', 'val_visual', 'val_auditiva', 'val_cognitiva', 'val_general',
].join(',')

export async function GET() {
  try {
    const url = new URL(`${DIRECTUS_URL}/items/acc_atractivos`)
    url.searchParams.set('fields', FIELDS_LISTA)
    url.searchParams.set('limit', '-1')
    url.searchParams.set('sort', 'atractivo_id.nombre')

    const res = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${DIRECTUS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 300 },
    })

    if (!res.ok) {
      const err = await res.text().catch(() => '')
      console.error('[accesibilidad] Directus error:', res.status, err)
      return NextResponse.json({ error: `Error Directus: ${res.status}` }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    console.error('[accesibilidad]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
