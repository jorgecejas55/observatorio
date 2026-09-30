/**
 * Refresco de los claims RBAC guardados en el JWT (lógica pura, sin I/O).
 *
 * Una falla del GAS OBS_Admin (timeout en frío, caída) NO equivale a
 * "usuario sin permisos": se conservan los claims que ya tenía el token y se
 * reintenta pronto. Antes, un timeout dejaba al usuario como lector sin
 * módulos durante 10 minutos.
 */

import type { ModuloKey, Rol } from './modulos'

export const PERMISOS_TTL_MS = 10 * 60 * 1000
export const PERMISOS_REINTENTO_MS = 30 * 1000

export interface ClaimsPermisos {
  rol?: Rol
  modulos?: ModuloKey[]
  permisosVencenEn?: number
}

/** ok:false = no se pudo consultar (distinto de "usuario no encontrado"). */
export type ResultadoConsultaPermisos =
  | { ok: true; rol: Rol; modulos: ModuloKey[] }
  | { ok: false }

export function debeRefrescarPermisos(
  token: ClaimsPermisos,
  ahora: number,
  esInicioSesion: boolean,
): boolean {
  if (esInicioSesion || !token.rol || !token.permisosVencenEn) return true
  return ahora >= token.permisosVencenEn
}

export function aplicarResultadoPermisos(
  token: ClaimsPermisos,
  resultado: ResultadoConsultaPermisos,
  ahora: number,
): Required<ClaimsPermisos> {
  if (resultado.ok) {
    return { rol: resultado.rol, modulos: resultado.modulos, permisosVencenEn: ahora + PERMISOS_TTL_MS }
  }
  // Fail-closed solo para quien nunca tuvo claims; el resto conserva los suyos.
  return {
    rol: token.rol ?? 'lector',
    modulos: token.modulos ?? [],
    permisosVencenEn: ahora + PERMISOS_REINTENTO_MS,
  }
}
