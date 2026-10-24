/**
 * API de gestión de usuarios (RBAC).
 *
 * GET   /api/admin/usuarios        — listar usuarios
 * POST  /api/admin/usuarios        — crear/actualizar usuario
 * DELETE /api/admin/usuarios       — desactivar usuario (soft-delete)
 *
 * Gate: requireAcceso('usuarios') — solo usuarios con módulo "usuarios".
 * Regla adicional: solo admin puede crear/editar/desactivar.
 * Mutaciones protegidas con rate-limit.
 */

import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { requireAcceso, esAdmin } from '@/lib/permisos'
import type { SessionUser } from '@/lib/permisos'
import {
  getUsuariosAdmin,
  upsertUsuarioAdmin,
  desactivarUsuarioAdmin,
  setPasswordAdmin,
  isObsAdminConfigured,
} from '@/lib/permisos/obs-admin-service'
import { conReintento } from '@/lib/reintento'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { esModuloValido, MODULO_KEYS, ROLES, type Rol } from '@/lib/permisos/modulos'

// ── GET: listar usuarios ────────────────────────────────────────────────────────

export async function GET() {
  const session = await requireAcceso('usuarios')
  if (session instanceof NextResponse) return session

  // GAS no configurado aún — devolver vacío sin error
  if (!isObsAdminConfigured()) {
    return NextResponse.json({
      success: true,
      data: [],
      warning: 'OBS_Admin GAS no configurado. Configurá OBS_ADMIN_GAS_URL y OBS_ADMIN_GAS_API_KEY.',
    })
  }

  try {
    const usuarios = await conReintento(() => getUsuariosAdmin())
    return NextResponse.json({ success: true, data: usuarios })
  } catch (error) {
    console.error('[admin/usuarios GET]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al listar usuarios' },
      { status: 500 },
    )
  }
}

// ── POST: crear/actualizar usuario ──────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await requireAcceso('usuarios')
  if (session instanceof NextResponse) return session

  // Solo admin puede cambiar roles/crear usuarios
  if (!esAdmin(session.user as SessionUser)) {
    return NextResponse.json({ error: 'Solo un administrador puede gestionar usuarios' }, { status: 403 })
  }

  if (!isObsAdminConfigured()) {
    return NextResponse.json({ error: 'OBS_Admin GAS no configurado' }, { status: 503 })
  }

  // Rate limit
  const ip = getClientIp(req)
  if (!checkRateLimit(ip, 10, 60 * 1000)) {
    return NextResponse.json({ error: 'Demasiadas solicitudes. Esperá un minuto.' }, { status: 429 })
  }

  try {
    const body = await req.json()
    const { email, nombre, rol, modulos, activo, oldEmail, password } = body

    // Validaciones
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 })
    }

    if (rol && !ROLES.includes(rol)) {
      return NextResponse.json({ error: `Rol inválido. Válidos: ${ROLES.join(', ')}` }, { status: 400 })
    }

    if (password !== undefined && (typeof password !== 'string' || password.length < 6)) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
    }

    // Validar módulos contra el registro canónico
    const modulosValidos = Array.isArray(modulos)
      ? modulos.filter((m: unknown) => typeof m === 'string' && esModuloValido(m))
      : []

    const emailNorm = email.toLowerCase().trim()
    const actorEmail = session.user?.email || 'sistema'

    const result = await upsertUsuarioAdmin({
      email: emailNorm,
      nombre: nombre || '',
      rol: rol || 'operador',
      modulos: modulosValidos,
      activo: activo !== false,
      actorEmail,
      oldEmail: oldEmail || undefined,
    })

    // Si viene contraseña, hashearla y guardarla
    if (password) {
      const passwordHash = await hash(password, 12)
      await setPasswordAdmin(emailNorm, passwordHash, actorEmail)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[admin/usuarios POST]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al guardar usuario' },
      { status: 500 },
    )
  }
}

// ── DELETE: desactivar usuario ──────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const session = await requireAcceso('usuarios')
  if (session instanceof NextResponse) return session

  // Solo admin puede desactivar
  if (!esAdmin(session.user as SessionUser)) {
    return NextResponse.json({ error: 'Solo un administrador puede gestionar usuarios' }, { status: 403 })
  }

  if (!isObsAdminConfigured()) {
    return NextResponse.json({ error: 'OBS_Admin GAS no configurado' }, { status: 503 })
  }

  // Rate limit
  const ip = getClientIp(req)
  if (!checkRateLimit(ip, 10, 60 * 1000)) {
    return NextResponse.json({ error: 'Demasiadas solicitudes. Esperá un minuto.' }, { status: 429 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get('email')
    if (!email) {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 })
    }

    const result = await desactivarUsuarioAdmin(
      email.toLowerCase().trim(),
      session.user?.email || 'sistema',
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('[admin/usuarios DELETE]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al desactivar usuario' },
      { status: 500 },
    )
  }
}
