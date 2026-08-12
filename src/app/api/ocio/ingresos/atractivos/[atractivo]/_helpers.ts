/**
 * Gate compartido para las API routes del módulo de Ingresos a Atractivos.
 * Unifica: validación de atractivo (allowlist → 404), gate RBAC de lectura
 * o escritura según el módulo asignado a ese atractivo.
 */

import { NextResponse } from 'next/server'
import { requireAcceso, requireEscritura } from '@/lib/permisos'
import {
  esAtractivoConIngresos,
  MODULO_DE_ATRACTIVO,
  type AtractivoConIngresos,
} from '@/lib/atractivos-config'

type GateResult =
  | { atractivo: AtractivoConIngresos; userEmail: string | null | undefined }
  | { error: NextResponse }

/**
 * Valida el atractivo y aplica el gate RBAC correspondiente.
 * Devuelve `{ atractivo, userEmail }` o `{ error }`; el caller debe early-return con el error.
 * userEmail sale de la sesión en el servidor (nunca del body).
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

  return { atractivo, userEmail: session?.user?.email }
}