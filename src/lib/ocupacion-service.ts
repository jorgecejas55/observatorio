/**
 * Servicio server-side para el Sistema de Ocupación Hotelera (nuevo backend).
 * Reemplaza progresivamente a ocupacion-api.ts (backend viejo GEOIDEAS).
 *
 * - Alojamientos: desde Directus (published, Capital)
 * - Relevamientos / Cargas: desde GAS "Ocupacion" (sheet nuevo del Observatorio)
 * - Credenciales nunca se exponen al cliente
 */

import type { RelevamientoOH, AlojamientoOH } from '@/lib/informes-auto/types'
import type { AlojamientoDirectus } from '@/lib/types/directus'

const GAS_URL = process.env.OCUPACION_GAS_URL
const GAS_API_KEY = process.env.OCUPACION_GAS_API_KEY
const DIRECTUS_URL = process.env.DIRECTUS_URL || 'https://turismo.apps.cc.gob.ar'
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN || ''

// ── Helpers GAS ────────────────────────────────────────────────────────────────

/**
 * Parsea la respuesta del GAS como JSON, pero si recibe HTML (la página de
 * login/autorización o de error de Apps Script, que vienen con status 200),
 * lanza un error legible en vez de reventar con "Unexpected token '<'".
 */
async function parseGasResponse(res: Response, ctx: string) {
  const body = await res.text()
  const looksHtml =
    body.trimStart().startsWith('<') ||
    (res.headers.get('content-type') || '').includes('text/html')

  if (looksHtml) {
    const snippet = body.replace(/\s+/g, ' ').trim().slice(0, 200)
    throw new Error(
      `GAS ${ctx}: el backend devolvió HTML en lugar de JSON (status ${res.status}). ` +
        `Causa típica: la URL es /dev en vez de /exec, o el deployment no es accesible como ` +
        `"Cualquiera" (Ejecutar como: Yo / Quién tiene acceso: Cualquiera), o no se volvió a ` +
        `desplegar tras cambiar el código. Inicio de la respuesta: "${snippet}"`,
    )
  }

  if (!res.ok) {
    throw new Error(`GAS ${ctx}: ${res.status} ${res.statusText} — ${body.slice(0, 200)}`)
  }

  try {
    return JSON.parse(body)
  } catch {
    throw new Error(`GAS ${ctx}: respuesta no es JSON válido — "${body.slice(0, 200)}"`)
  }
}

async function gasGet(path: string, params: Record<string, string> = {}) {
  if (!GAS_URL || GAS_URL.includes('PENDIENTE')) {
    throw new Error('OCUPACION_GAS_URL no configurada')
  }
  const url = new URL(GAS_URL)
  url.searchParams.set('path', path)
  url.searchParams.set('apiKey', GAS_API_KEY || '')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const res = await fetch(url.toString(), { redirect: 'follow' })
  return parseGasResponse(res, `GET ${path}`)
}

async function gasPost(path: string, data: Record<string, unknown>) {
  if (!GAS_URL || GAS_URL.includes('PENDIENTE')) {
    throw new Error('OCUPACION_GAS_URL no configurada')
  }
  const res = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: GAS_API_KEY, path, data }),
    redirect: 'follow',
  })
  return parseGasResponse(res, `POST ${path}`)
}

// ── Alojamientos (Directus) ────────────────────────────────────────────────────

/**
 * Obtiene alojamientos desde Directus (solo published) y los mapea
 * al contrato AlojamientoOH para el sistema de ocupación.
 *
 * capacidad_de_habitaciones null → 0 + log de advertencia.
 */
export async function getAlojamientosParaRelevamiento(): Promise<AlojamientoOH[]> {
  if (!DIRECTUS_TOKEN) {
    throw new Error('DIRECTUS_TOKEN no configurado')
  }

  const url = new URL(`${DIRECTUS_URL}/items/alojamientos`)
  url.searchParams.set('filter[status][_eq]', 'published')
  url.searchParams.set('limit', '-1')
  url.searchParams.set('fields', 'id,nombre,tipo_de_alojamiento,categoria,capacidad_de_habitaciones,capacidad_plazas')

  const res = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${DIRECTUS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    next: { revalidate: 60 },
  })

  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    throw new Error(`Directus alojamientos: ${res.status} — ${errBody}`)
  }

  const json = await res.json()
  const items: AlojamientoDirectus[] = json.data ?? []

  return items.map((a) => {
    if (a.capacidad_de_habitaciones == null || a.capacidad_de_habitaciones === undefined) {
      console.warn(`[ocupacion] Alojamiento "${a.nombre}" (id=${a.id}) sin capacidad_de_habitaciones — usando 0`)
    }

    return {
      id: String(a.id),
      nombre: a.nombre,
      tipo: a.tipo_de_alojamiento || '',
      categoria: (a as any).categoria || (a as any).catagoria || '',
      capacidadHab: a.capacidad_de_habitaciones ?? 0,
      capacidadPlazas: a.capacidad_plazas ?? 0,
      estadoRegistro: 'REGISTRADO',    // compatibilidad con contrato viejo
      estado: 'Activo',
    }
  })
}

// ── Relevamientos ──────────────────────────────────────────────────────────────

export async function getRelevamientos(params?: {
  tipo?: string
  year?: number
  estado?: string
}): Promise<RelevamientoOH[]> {
  const searchParams: Record<string, string> = {}
  if (params?.tipo) searchParams.tipo = params.tipo
  if (params?.year) searchParams.year = String(params.year)
  if (params?.estado) searchParams.estado = params.estado

  const json = await gasGet('relevamientos', searchParams)
  const data = json.data ?? []

  return data.map((r: Record<string, unknown>) => ({
    id: String(r.ID ?? r.id ?? ''),
    nombre: String(r.Nombre ?? r.nombre ?? ''),
    tipo: (String(r.Tipo ?? r.tipo ?? 'Especial')) as RelevamientoOH['tipo'],
    estado: (String(r.Estado ?? r.estado ?? '')) as RelevamientoOH['estado'],
    fechaInicio: String(r.FechaInicio ?? r.fechaInicio ?? '').slice(0, 10),
    fechaFin: String(r.FechaFin ?? r.fechaFin ?? '').slice(0, 10),
    ohTotal: Number(r.OHTotal ?? r.ohTotal ?? 0),
    ohMin: Number(r.OHMin ?? r.ohMin ?? 0),
    ohMax: Number(r.OHMax ?? r.ohMax ?? 0),
    cantidadRelevados: Number(r.CantidadRelevados ?? r.cantidadRelevados ?? 0),
    // Compatibilidad con contrato viejo:
    ohRegistrado: Number(r.OHTotal ?? r.ohTotal ?? 0),
    ohNoRegistrado: 0,
    ohEnTramite: 0,
    cantidadRegistrados: Number(r.CantidadRelevados ?? r.cantidadRelevados ?? 0),
    ohModa: Number(r.OHModa ?? r.ohModa ?? 0),
    usuarioCreador: String(r.UsuarioCreador ?? r.usuarioCreador ?? ''),
    fechaCreacion: String(r.FechaCreacion ?? r.fechaCreacion ?? ''),
    usuarioCierre: String(r.UsuarioCierre ?? r.usuarioCierre ?? ''),
    fechaCierre: String(r.FechaCierre ?? r.fechaCierre ?? ''),
  }))
}

export async function getRelevamientoActivo(): Promise<RelevamientoOH | null> {
  const json = await gasGet('relevamientos/activo')
  if (!json.success || !json.data) return null
  const r = json.data
  return {
    id: String(r.ID ?? r.id ?? ''),
    nombre: String(r.Nombre ?? r.nombre ?? ''),
    tipo: (String(r.Tipo ?? r.tipo ?? 'Especial')) as RelevamientoOH['tipo'],
    estado: (String(r.Estado ?? r.estado ?? '')) as RelevamientoOH['estado'],
    fechaInicio: String(r.FechaInicio ?? r.fechaInicio ?? '').slice(0, 10),
    fechaFin: String(r.FechaFin ?? r.fechaFin ?? '').slice(0, 10),
    ohTotal: Number(r.OHTotal ?? r.ohTotal ?? 0),
    ohMin: Number(r.OHMin ?? r.ohMin ?? 0),
    ohMax: Number(r.OHMax ?? r.ohMax ?? 0),
    cantidadRelevados: Number(r.CantidadRelevados ?? r.cantidadRelevados ?? 0),
    ohRegistrado: Number(r.OHTotal ?? r.ohTotal ?? 0),
    ohNoRegistrado: 0,
    ohEnTramite: 0,
    cantidadRegistrados: Number(r.CantidadRelevados ?? r.cantidadRelevados ?? 0),
    ohModa: Number(r.OHModa ?? r.ohModa ?? 0),
    usuarioCreador: String(r.UsuarioCreador ?? r.usuarioCreador ?? ''),
    fechaCreacion: String(r.FechaCreacion ?? r.fechaCreacion ?? ''),
    usuarioCierre: String(r.UsuarioCierre ?? r.usuarioCierre ?? ''),
    fechaCierre: String(r.FechaCierre ?? r.fechaCierre ?? ''),
  }
}

export async function getRelevamientoPorId(id: string): Promise<RelevamientoOH | null> {
  const json = await gasGet('relevamientos/get', { id })
  if (!json.success || !json.data) return null
  const r = json.data
  return {
    id: String(r.ID ?? r.id ?? ''),
    nombre: String(r.Nombre ?? r.nombre ?? ''),
    tipo: (String(r.Tipo ?? r.tipo ?? 'Especial')) as RelevamientoOH['tipo'],
    estado: (String(r.Estado ?? r.estado ?? '')) as RelevamientoOH['estado'],
    fechaInicio: String(r.FechaInicio ?? r.fechaInicio ?? '').slice(0, 10),
    fechaFin: String(r.FechaFin ?? r.fechaFin ?? '').slice(0, 10),
    ohTotal: Number(r.OHTotal ?? r.ohTotal ?? 0),
    ohMin: Number(r.OHMin ?? r.ohMin ?? 0),
    ohMax: Number(r.OHMax ?? r.ohMax ?? 0),
    cantidadRelevados: Number(r.CantidadRelevados ?? r.cantidadRelevados ?? 0),
    ohRegistrado: Number(r.OHTotal ?? r.ohTotal ?? 0),
    ohNoRegistrado: 0,
    ohEnTramite: 0,
    cantidadRegistrados: Number(r.CantidadRelevados ?? r.cantidadRelevados ?? 0),
    ohModa: Number(r.OHModa ?? r.ohModa ?? 0),
    usuarioCreador: String(r.UsuarioCreador ?? r.usuarioCreador ?? ''),
    fechaCreacion: String(r.FechaCreacion ?? r.fechaCreacion ?? ''),
    usuarioCierre: String(r.UsuarioCierre ?? r.usuarioCierre ?? ''),
    fechaCierre: String(r.FechaCierre ?? r.fechaCierre ?? ''),
  }
}

export async function getRelevamientosEspeciales(year: number): Promise<RelevamientoOH[]> {
  return getRelevamientos({ tipo: 'Especial', year })
}

// ── Cargas ─────────────────────────────────────────────────────────────────────

export interface CargaDetalle {
  id: string
  alojamientoId: string
  alojamientoNombre: string
  tipo: string
  categoria: string
  porcentajeOH: number
  capacidadHab: number
  usuarioCarga: string
  fechaCarga: string
  horaCarga: string
  estadoRegistro: 'REGISTRADO'
}

export async function getCargasDeRelevamiento(id: string): Promise<CargaDetalle[]> {
  const json = await gasGet('cargas/list', { relevamientoId: id })
  const data = json.data ?? []

  // Enriquecemos cada carga con tipo/categoría desde Directus (por alojamientoId).
  // Esto cubre las cargas cuyo snapshot no tenga esos campos (p. ej. cargas
  // previas a guardar Tipo/Categoria en la hoja) sin depender del GAS.
  let alojMap: Record<string, { tipo: string; categoria: string }> = {}
  try {
    const alojamientos = await getAlojamientosParaRelevamiento()
    alojMap = Object.fromEntries(
      alojamientos.map((a) => [String(a.id), { tipo: a.tipo, categoria: a.categoria }]),
    )
  } catch (e) {
    console.warn('[ocupacion] No se pudo enriquecer cargas con Directus:', e)
  }

  return data.map((c: Record<string, unknown>): CargaDetalle => {
    const alojamientoId = String(c.AlojamientoID ?? c.alojamientoId ?? '')
    const dir = alojMap[alojamientoId]
    const tipoSnap = String(c.Tipo ?? c.tipo ?? '')
    const catSnap = String(c.Categoria ?? c.categoria ?? '')
    return {
      id: String(c.ID ?? c.id ?? ''),
      alojamientoId,
      alojamientoNombre: String(c.AlojamientoNombre ?? c.alojamientoNombre ?? ''),
      tipo: tipoSnap || dir?.tipo || '',
      categoria: catSnap || dir?.categoria || '',
      porcentajeOH: Number(c.PorcentajeOH ?? c.porcentajeOH ?? 0),
      capacidadHab: Number(c.CapacidadHab ?? c.capacidadHab ?? 0),
      usuarioCarga: String(c.UsuarioCarga ?? c.usuarioCarga ?? ''),
      fechaCarga: String(c.FechaCarga ?? c.fechaCarga ?? '').slice(0, 10),
      horaCarga: String(c.HoraCarga ?? c.horaCarga ?? ''),
      estadoRegistro: 'REGISTRADO',
    }
  })
}

export async function getCargasVersion(relevamientoId: string) {
  return gasGet('cargas/version', { relevamientoId })
}

export async function getCargasSince(relevamientoId: string, since: number) {
  return gasGet('cargas/since', { relevamientoId, since: String(since) })
}

// ── Dashboard ──────────────────────────────────────────────────────────────────

export async function getDashboardStats(year: number) {
  return gasGet('dashboard/stats', { year: String(year) })
}

// ── Indicadores OH (Bloque A) ──────────────────────────────────────────────────

export async function guardarIndicadoresOH(data: Record<string, unknown>) {
  return gasPost('indicadores/guardar', data)
}

export async function getIndicadoresOH(relevamientoId: string) {
  const json = await gasGet('indicadores/get', { relevamientoId })
  // Parsear datosJSON si viene como string
  if (json.success && json.data) {
    if (json.data.datosJSON && typeof json.data.datosJSON === 'string') {
      try {
        json.data.datosJSON = JSON.parse(json.data.datosJSON)
      } catch { /* mantener como string */ }
    }
    // Normalizar cobertura: vacío → null
    if (json.data.cobertura !== undefined) {
      json.data.cobertura = json.data.cobertura === '' || json.data.cobertura === null
        ? null
        : Number(json.data.cobertura)
    }
  }
  return json
}

export async function listIndicadoresOH(params?: { year?: number }) {
  const searchParams: Record<string, string> = {}
  if (params?.year) searchParams.year = String(params.year)
  return gasGet('indicadores/list', searchParams)
}
