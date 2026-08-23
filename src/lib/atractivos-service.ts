/**
 * Servicio server-side del módulo de Ingresos a Atractivos.
 * Envuelve el cliente GAS genérico e inyecta el `atractivo` en cada llamada.
 * Las API routes quedan delgadas: la lógica de negocio vive acá.
 *
 * Todas las respuestas de listado normalizan los valores leídos del sheet
 * (números vienen como texto por el formato '@' de setCeldaTexto).
 */

import { createGasClient } from '@/lib/gas-client'
import type {
  IngresoAtractivo,
  ActividadEspecialAtractivo,
  ResumenAtractivo,
  SerieAtractivo,
  ApiResponse,
} from '@/lib/types'
import type { AtractivoConIngresos } from '@/lib/atractivos-config'

let _client: ReturnType<typeof createGasClient> | null = null

function getClient() {
  if (!_client) {
    const url = process.env.ATRACTIVOS_GAS_URL
    const apiKey = process.env.ATRACTIVOS_GAS_API_KEY
    if (!url || url.includes('PENDIENTE') || !apiKey) {
      throw new Error('ATRACTIVOS_GAS_URL u ATRACTIVOS_GAS_API_KEY no configuradas')
    }
    // El GAS puede tardar: tryLock(15000) en mutaciones y resumen con cold start
    // (el primer resumen lee las hojas y puede superar los 3,5 s del default).
    _client = createGasClient(url, apiKey, { getTimeoutMs: 20000, postTimeoutMs: 20000 })
  }
  return _client
}

// ── Normalización (texto del sheet → tipos del módulo) ─────────────────────────

function numero(valor: unknown): number {
  const n = Number(valor)
  return Number.isFinite(n) ? n : 0
}

function mapearIngreso(r: Record<string, unknown>): IngresoAtractivo {
  return {
    id: String(r.id ?? ''),
    fecha_hora_registro: String(r.fecha_hora_registro ?? ''),
    fecha_hora_sync: r.fecha_hora_sync ? String(r.fecha_hora_sync) : undefined,
    tipo_visitante: String(r.tipo_visitante ?? ''),
    procedencia: r.procedencia ? String(r.procedencia) : undefined,
    cantidad_personas: numero(r.cantidad_personas),
    motivo: String(r.motivo ?? ''),
    usuario_registro: r.usuario_registro ? String(r.usuario_registro) : undefined,
    activo: r.activo ? String(r.activo) : undefined,
    usuario_modificacion: r.usuario_modificacion ? String(r.usuario_modificacion) : undefined,
    fecha_hora_modificacion: r.fecha_hora_modificacion ? String(r.fecha_hora_modificacion) : undefined,
    id_local: r.id_local ? String(r.id_local) : undefined,
  }
}

function mapearActividad(r: Record<string, unknown>): ActividadEspecialAtractivo {
  return {
    id: String(r.id ?? ''),
    fecha_actividad: String(r.fecha_actividad ?? ''),
    nombre_actividad: String(r.nombre_actividad ?? ''),
    cantidad_total: numero(r.cantidad_total),
    cantidad_turistas: numero(r.cantidad_turistas),
    cantidad_residentes: numero(r.cantidad_residentes),
    observaciones: r.observaciones ? String(r.observaciones) : undefined,
    usuario_registro: r.usuario_registro ? String(r.usuario_registro) : undefined,
    fecha_hora_registro: r.fecha_hora_registro ? String(r.fecha_hora_registro) : undefined,
    fecha_hora_sync: r.fecha_hora_sync ? String(r.fecha_hora_sync) : undefined,
    activo: r.activo ? String(r.activo) : undefined,
    usuario_modificacion: r.usuario_modificacion ? String(r.usuario_modificacion) : undefined,
    fecha_hora_modificacion: r.fecha_hora_modificacion ? String(r.fecha_hora_modificacion) : undefined,
    id_local: r.id_local ? String(r.id_local) : undefined,
  }
}

// ── Ingresos ───────────────────────────────────────────────────────────────────

export interface FiltrosListado {
  desde?: string
  hasta?: string
  limit?: string
}

export async function listarIngresos(
  atractivo: AtractivoConIngresos,
  filtros?: FiltrosListado,
): Promise<IngresoAtractivo[]> {
  const client = getClient()
  const json = await client.get('ingresos/list', { atractivo, ...(filtros || {}) })
  if (!json.success) throw new Error(json.error || 'Error al listar ingresos')
  return ((json.data || []) as Record<string, unknown>[]).map(mapearIngreso)
}

export async function crearIngreso(
  atractivo: AtractivoConIngresos,
  data: Record<string, unknown>,
): Promise<{ id: string; duplicado?: boolean }> {
  const client = getClient()
  const json = await client.post('ingresos/create', { atractivo, ...data })
  if (!json.success) {
    throw new Error(json.error || 'Error al crear ingreso')
  }
  return { id: String(json.data?.id ?? ''), duplicado: !!json.data?.duplicado }
}

export async function actualizarIngreso(
  atractivo: AtractivoConIngresos,
  id: string,
  data: Record<string, unknown>,
): Promise<void> {
  const client = getClient()
  const json = await client.post('ingresos/update', { atractivo, id, ...data })
  if (!json.success) throw new Error(json.error || 'Error al actualizar ingreso')
}

export async function eliminarIngreso(
  atractivo: AtractivoConIngresos,
  id: string,
  usuarioModificacion: string,
): Promise<void> {
  const client = getClient()
  const json = await client.post('ingresos/delete', { atractivo, id, usuario_modificacion: usuarioModificacion })
  if (!json.success) throw new Error(json.error || 'Error al eliminar ingreso')
}

// ── Actividades especiales ─────────────────────────────────────────────────────

export async function listarActividades(
  atractivo: AtractivoConIngresos,
  filtros?: FiltrosListado,
): Promise<ActividadEspecialAtractivo[]> {
  const client = getClient()
  const json = await client.get('actividades/list', { atractivo, ...(filtros || {}) })
  if (!json.success) throw new Error(json.error || 'Error al listar actividades')
  return ((json.data || []) as Record<string, unknown>[]).map(mapearActividad)
}

export async function crearActividad(
  atractivo: AtractivoConIngresos,
  data: Record<string, unknown>,
): Promise<{ id: string; duplicado?: boolean }> {
  const client = getClient()
  const json = await client.post('actividades/create', { atractivo, ...data })
  if (!json.success) {
    throw new Error(json.error || 'Error al crear actividad')
  }
  return { id: String(json.data?.id ?? ''), duplicado: !!json.data?.duplicado }
}

export async function actualizarActividad(
  atractivo: AtractivoConIngresos,
  id: string,
  data: Record<string, unknown>,
): Promise<void> {
  const client = getClient()
  const json = await client.post('actividades/update', { atractivo, id, ...data })
  if (!json.success) throw new Error(json.error || 'Error al actualizar actividad')
}

export async function eliminarActividad(
  atractivo: AtractivoConIngresos,
  id: string,
  usuarioModificacion: string,
): Promise<void> {
  const client = getClient()
  const json = await client.post('actividades/delete', { atractivo, id, usuario_modificacion: usuarioModificacion })
  if (!json.success) throw new Error(json.error || 'Error al eliminar actividad')
}

// ── Resumen del dashboard ──────────────────────────────────────────────────────

export async function getResumen(
  atractivo: AtractivoConIngresos,
): Promise<ApiResponse<ResumenAtractivo>> {
  const client = getClient()
  return client.get('resumen', { atractivo })
}

/** Drill-down bajo demanda: sin `mes` agrega por mes de `anio`; con `mes`, por día. */
export async function getSerie(
  atractivo: AtractivoConIngresos,
  anio: number,
  mes?: number,
): Promise<ApiResponse<SerieAtractivo>> {
  const client = getClient()
  const params: Record<string, string> = { atractivo, anio: String(anio) }
  if (mes) params.mes = String(mes)
  return client.get('serie', params)
}