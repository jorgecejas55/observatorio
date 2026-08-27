/**
 * Servicio server-only para consultar permisos desde el GAS OBS_Admin.
 *
 * - getPermisosDeUsuario(email): consulta el GAS, normaliza, valida módulos.
 * - getPermisosCached(email): caché en memoria con TTL 10 min, fallback a stale.
 * - getUsuariosAdmin / upsertUsuarioAdmin / desactivarUsuarioAdmin: CRUD para el panel.
 */

import { createGasClient } from '@/lib/gas-client'
import { esModuloValido, ROLES, type ModuloKey, type Rol } from '@/lib/permisos/modulos'

// ── Cliente GAS (inicialización lazy) ────────────────────────────────────────────

let _client: ReturnType<typeof createGasClient> | null = null

export function isObsAdminConfigured(): boolean {
  const url = process.env.OBS_ADMIN_GAS_URL
  const apiKey = process.env.OBS_ADMIN_GAS_API_KEY
  return !!(url && !url.includes('PENDIENTE') && apiKey)
}

function getClient() {
  if (!_client) {
    const url = process.env.OBS_ADMIN_GAS_URL
    const apiKey = process.env.OBS_ADMIN_GAS_API_KEY
    if (!url || !apiKey) {
      throw new Error('OBS_ADMIN_GAS_URL u OBS_ADMIN_GAS_API_KEY no configuradas')
    }
    _client = createGasClient(url, apiKey)
  }
  return _client
}

// ── Tipos ────────────────────────────────────────────────────────────────────────

export interface PermisosUsuario {
  email: string
  nombre: string
  rol: Rol
  modulos: ModuloKey[]
  activo: boolean
}

export interface UsuarioAdmin {
  id: number
  email: string
  nombre: string
  rol: string
  modulos: string[]
  activo: boolean
  createdAt: string
  updatedAt: string
}

// ── Normalización ────────────────────────────────────────────────────────────────

function normalizarEmail(email: string): string {
  return email.toLowerCase().trim()
}

function filtrarModulosValidos(raw: string[]): ModuloKey[] {
  return raw.filter(esModuloValido)
}

// ── Consulta de permisos ─────────────────────────────────────────────────────────

/**
 * Consulta los permisos de un usuario desde el GAS OBS_Admin.
 * - Email normalizado (lowercase + trim).
 * - Módulos filtrados contra el registro canónico (claves obsoletas se ignoran).
 * - activo=false ⇒ devuelve null (usuario inactivo equivale a no existir).
 * - Usuario no encontrado ⇒ devuelve null.
 */
export async function getPermisosDeUsuario(email: string): Promise<PermisosUsuario | null> {
  const emailNorm = normalizarEmail(email)
  if (!emailNorm) return null

  try {
    const client = getClient()
    const json = await client.get('usuarios/get', { email: emailNorm })

    if (!json.success || !json.data) return null

    const data = json.data
    const activo = data.Activo === true || String(data.Activo).toUpperCase() === 'TRUE'

    if (!activo) return null

    const modulosRaw: string[] = Array.isArray(data.Modulos) ? data.Modulos : []

    return {
      email: normalizarEmail(String(data.Email || '')),
      nombre: String(data.Nombre || ''),
      rol: ROLES.includes(data.Rol as Rol) ? (data.Rol as Rol) : 'operador',
      modulos: filtrarModulosValidos(modulosRaw),
      activo: true,
    }
  } catch (error) {
    console.error('[obs-admin] Error consultando permisos:', error)
    throw error // dejamos que el caller decida (auth.ts usa fallback)
  }
}

// ── Caché en memoria ─────────────────────────────────────────────────────────────

interface CacheEntry {
  permisos: PermisosUsuario | null
  fetchedAt: number
}

const cache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutos

/**
 * Consulta permisos con caché en memoria (TTL 10 min).
 * Si el GAS falla y hay un valor stale en caché, lo devuelve como fallback
 * (usuario autenticado no pierde acceso por caída transitoria del GAS).
 */
export async function getPermisosCached(email: string): Promise<PermisosUsuario | null> {
  const emailNorm = normalizarEmail(email)
  if (!emailNorm) return null

  // Si GAS no está configurado, no intentar consultar
  if (!isObsAdminConfigured()) return null

  const cached = cache.get(emailNorm)
  const now = Date.now()

  // Si el caché está fresco, devolverlo
  if (cached && (now - cached.fetchedAt) < CACHE_TTL_MS) {
    return cached.permisos
  }

  try {
    const permisos = await getPermisosDeUsuario(emailNorm)
    cache.set(emailNorm, { permisos, fetchedAt: now })
    return permisos
  } catch (error) {
    console.error('[obs-admin] Error en getPermisosCached:', error)

    // Fallback a valor stale si existe
    if (cached) {
      console.warn('[obs-admin] Usando caché stale para', emailNorm)
      return cached.permisos
    }

    throw error
  }
}

// ── CRUD para el panel de administración ─────────────────────────────────────────

export async function getUsuariosAdmin(): Promise<UsuarioAdmin[]> {
  const client = getClient()
  const json = await client.get('usuarios/list')
  if (!json.success) throw new Error(json.error || 'Error al listar usuarios')
  // Mapear PascalCase (GAS) → camelCase (TS)
  return ((json.data || []) as Record<string, unknown>[]).map((u) => ({
    id: Number(u.ID ?? u.id ?? 0),
    email: String(u.Email ?? u.email ?? ''),
    nombre: String(u.Nombre ?? u.nombre ?? ''),
    rol: String(u.Rol ?? u.rol ?? 'operador'),
    modulos: (Array.isArray(u.Modulos) ? u.Modulos : Array.isArray(u.modulos) ? u.modulos : []) as string[],
    activo: (u.Activo ?? u.activo) === true || String(u.Activo ?? u.activo).toUpperCase() === 'TRUE',
    createdAt: String(u.CreatedAt ?? u.createdAt ?? ''),
    updatedAt: String(u.UpdatedAt ?? u.updatedAt ?? ''),
  }))
}

export async function upsertUsuarioAdmin(data: {
  email: string
  nombre: string
  rol: Rol
  modulos: ModuloKey[]
  activo: boolean
  actorEmail: string
  oldEmail?: string
}) {
  const client = getClient()
  const json = await client.post('usuarios/upsert', data as unknown as Record<string, unknown>)
  if (!json.success) throw new Error(json.error || 'Error al guardar usuario')

  // Invalidar caché del usuario afectado (viejo y nuevo email si cambió)
  cache.delete(normalizarEmail(data.email))
  if (data.oldEmail) cache.delete(normalizarEmail(data.oldEmail))

  return json
}

export async function desactivarUsuarioAdmin(email: string, actorEmail: string) {
  const client = getClient()
  const json = await client.post('usuarios/delete', { email, actorEmail })
  if (!json.success) throw new Error(json.error || 'Error al desactivar usuario')

  // Invalidar caché
  cache.delete(normalizarEmail(email))

  return json
}

/** Limpia toda la caché (útil para tests o force-reload) */
export function clearPermisosCache() {
  cache.clear()
}
