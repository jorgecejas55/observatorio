/**
 * Cliente para la API centralizada de Google Apps Script.
 * Solo se usa server-side (API Routes o Server Components) para no exponer claves.
 */

const GAS_URL = process.env.GOOGLE_APPS_SCRIPT_URL ?? ''
const API_KEY = process.env.GAS_API_KEY ?? ''

interface GasPostPayload {
  modulo: string
  accion: string
  datos: Record<string, unknown>
}

async function gasPost(payload: GasPostPayload): Promise<{ success: boolean; error?: string }> {
  if (!GAS_URL) throw new Error('GOOGLE_APPS_SCRIPT_URL no configurada')

  const res = await fetch(GAS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) throw new Error(`Error GAS: ${res.status} ${res.statusText}`)
  return res.json()
}

async function gasGet<T>(
  modulo: string,
  accion: string,
  params: Record<string, string> = {}
): Promise<T> {
  if (!GAS_URL) throw new Error('GOOGLE_APPS_SCRIPT_URL no configurada')

  const url = new URL(GAS_URL)
  url.searchParams.set('modulo', modulo)
  url.searchParams.set('accion', accion)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const res = await fetch(url.toString(), {
    headers: { 'X-API-Key': API_KEY },
    next: { revalidate: 300 }, // cache 5 minutos
  })

  if (!res.ok) throw new Error(`Error GAS: ${res.status} ${res.statusText}`)
  return res.json()
}

// ─── Turismo de Ocio ─────────────────────────────────────────────────────────

export const ocioApi = {
  registrarIngreso: (datos: Record<string, unknown>) =>
    gasPost({ modulo: 'ocio', accion: 'ingreso_atractivo', datos }),

  registrarCamping: (datos: Record<string, unknown>) =>
    gasPost({ modulo: 'ocio', accion: 'ingreso_camping', datos }),

  enviarEncuestaTurista: (datos: Record<string, unknown>) =>
    gasPost({ modulo: 'ocio', accion: 'encuesta_turista', datos }),
}

// ─── Eventos ─────────────────────────────────────────────────────────────────

export const eventosApi = {
  registrarEvento: (datos: Record<string, unknown>) =>
    gasPost({ modulo: 'eventos', accion: 'registro_evento', datos }),

  enviarEncuestaDemanda: (datos: Record<string, unknown>) =>
    gasPost({ modulo: 'eventos', accion: 'encuesta_demanda', datos }),
}

// ─── Oferta ──────────────────────────────────────────────────────────────────

export const ofertaApi = {
  registrarAlojamiento: (datos: Record<string, unknown>) =>
    gasPost({ modulo: 'oferta', accion: 'alojamiento_temporario', datos }),
}

// ─── Calidad ─────────────────────────────────────────────────────────────────

export const calidadApi = {
  encuestaAtractivo: (datos: Record<string, unknown>) =>
    gasPost({ modulo: 'calidad', accion: 'calidad_atractivo', datos }),

  encuestaServicios: (datos: Record<string, unknown>) =>
    gasPost({ modulo: 'calidad', accion: 'calidad_servicios', datos }),

  encuestaBus: (datos: Record<string, unknown>) =>
    gasPost({ modulo: 'calidad', accion: 'calidad_bus', datos }),

  encuestaPercepcion: (datos: Record<string, unknown>) =>
    gasPost({ modulo: 'calidad', accion: 'percepcion_social', datos }),
}

// ─── Estadísticas (GET) ──────────────────────────────────────────────────────

export const estadisticasApi = {
  getIndicadoresMensuales: (periodo?: string) =>
    gasGet<unknown[]>('estadisticas', 'indicadores_mensuales', periodo ? { periodo } : {}),

  getIngresosPorAtractivo: (periodo?: string) =>
    gasGet<unknown[]>('estadisticas', 'ingresos_atractivos', periodo ? { periodo } : {}),

  getResumenDashboard: () =>
    gasGet<unknown>('estadisticas', 'resumen_dashboard'),
}
