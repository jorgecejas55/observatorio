/**
 * Funciones de control de acceso (RBAC) para el sistema.
 *
 * Regla: rol === 'admin'    → acceso total (lectura + escritura).
 *        rol === 'operador' → lectura + escritura en módulos asignados.
 *        rol === 'lector'   → solo lectura en módulos asignados.
 *
 * Anti-lockout: ADMIN_EMAIL (env) es super-admin incondicional,
 * evaluado ANTES de consultar GAS — caída del backend nunca bloquea al admin.
 */

import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'
import type { ModuloKey } from '@/lib/permisos/modulos'

// ── Tipos de sesión extendida ────────────────────────────────────────────────────

export interface SessionUser {
  name?: string | null
  email?: string | null
  image?: string | null
  rol?: 'admin' | 'operador' | 'lector'
  modulos?: ModuloKey[]
}

// ── Bypass de administrador ─────────────────────────────────────────────────────

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'jorgecejas55@gmail.com'

function esAdminEmail(email?: string | null): boolean {
  return !!email && email.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim()
}

// ── Checks puros (sin efectos secundarios) ───────────────────────────────────────

/** Verifica si el usuario tiene rol admin (o es el ADMIN_EMAIL) */
export function esAdmin(user?: SessionUser | null): boolean {
  if (!user?.email) return false
  if (esAdminEmail(user.email)) return true
  return user.rol === 'admin'
}

/** Verifica si el usuario puede escribir (crear/editar/eliminar). Admin y operador pueden, lector no. Client-safe. */
export function puedeEscribir(user?: SessionUser | null): boolean {
  if (!user?.email) return false
  // admin (rol) + ADMIN_EMAIL bypass
  if (esAdmin(user)) return true
  return user.rol === 'operador'
}

/** Verifica si el usuario tiene acceso a un módulo específico */
export function tieneAcceso(user: SessionUser | null | undefined, modulo: ModuloKey): boolean {
  if (!user?.email) return false
  // Admin global (rol o email) tiene acceso a todo
  if (esAdmin(user)) return true
  // Operador o lector: solo si el módulo está en su lista
  return (user.modulos || []).includes(modulo)
}

// ── Gates para API Routes ───────────────────────────────────────────────────────

/**
 * Gate para API routes (lectura). Devuelve la sesión si el usuario tiene acceso
 * al módulo, o una NextResponse de error (401/403) si no.
 */
export async function requireAcceso(modulo: ModuloKey) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  if (!tieneAcceso(session.user as SessionUser, modulo)) {
    return NextResponse.json({ error: 'Acceso restringido a este módulo' }, { status: 403 })
  }

  return session
}

/**
 * Gate para API routes con escritura. Igual que requireAcceso pero además
 * verifica que el usuario pueda escribir (no lector).
 */
export async function requireEscritura(modulo: ModuloKey) {
  const session = await requireAcceso(modulo)
  if (session instanceof NextResponse) return session

  if (!puedeEscribir(session.user as SessionUser)) {
    return NextResponse.json({ error: 'Solo lectura — no tenés permisos para modificar' }, { status: 403 })
  }

  return session
}

// ── Gates para páginas / layouts ─────────────────────────────────────────────────

/**
 * Gate para páginas y layouts. Redirige a /login si no hay sesión,
 * o a /sin-acceso si no tiene el módulo.
 */
export async function requireAccesoPage(modulo: ModuloKey) {
  const session = await auth()
  if (!session?.user?.email) {
    redirect('/login')
  }

  if (!tieneAcceso(session.user as SessionUser, modulo)) {
    redirect('/sin-acceso')
  }
}
