/**
 * Gate compartido para las API routes del módulo de Ingresos a Atractivos.
 * Unifica: validación de atractivo (allowlist → 404), gate RBAC de lectura
 * o escritura según el módulo asignado a ese atractivo.
 */

import { NextResponse } from 'next/server'
import { requireAcceso, requireEscritura, esAdmin, type SessionUser } from '@/lib/permisos'
import {
  esAtractivoConIngresos,
  MODULO_DE_ATRACTIVO,
  type AtractivoConIngresos,
} from '@/lib/atractivos-config'

type GateResult =
  | { atractivo: AtractivoConIngresos; userEmail: string | null | undefined; esAdmin: boolean }
  | { error: NextResponse }

/**
 * Valida el atractivo y aplica el gate RBAC correspondiente.
 * Devuelve `{ atractivo, userEmail, esAdmin }` o `{ error }`; el caller debe early-return con el error.
 * userEmail/esAdmin salen de la sesión en el servidor (nunca del body) — es lo que
 * habilita, por ejemplo, editar fecha_hora_registro solo para admin (ver ingresos/[id]/route.ts).
 */
export async function gateAtractivo(
  atractivo: string,
  requiereEscritura: boolean,
): Promise<GateResult> {
  if (!esAtractivoConIngresos(atractivo)) {
    return { error: NextResponse.json({ error: 'Atractivo no encontrado' }, { status: 404 }) }
  }

  const session = requiereEscritura
    ? await requireEscritura(MODULO_DE_ATRACTIVO[atractivo])
    : await requireAcceso(MODULO_DE_ATRACTIVO[atractivo])

  if (session instanceof NextResponse) {
    return { error: session }
  }

  return {
    atractivo,
    userEmail: session?.user?.email,
    esAdmin: esAdmin(session?.user as SessionUser),
  }
}