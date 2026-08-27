/**
 * Module augmentation para NextAuth v5 — extiende Session y JWT con claims RBAC.
 *
 * Sin esto, TypeScript no reconoce session.user.rol / session.user.modulos.
 * Se eliminan los @ts-expect-error dispersos por el código.
 */

import type { ModuloKey, Rol } from '@/lib/permisos/modulos'

declare module '@auth/core/types' {
  interface User {
    /** Rol global — ver semántica de cada valor en src/lib/permisos/modulos.ts */
    rol?: Rol
    /** Lista de módulos permitidos (solo relevante para operador/cargador/lector) */
    modulos?: ModuloKey[]
  }
}

declare module '@auth/core/jwt' {
  interface DefaultJWT {
    rol?: Rol
    modulos?: ModuloKey[]
    permisosRefreshedAt?: number
  }
}
