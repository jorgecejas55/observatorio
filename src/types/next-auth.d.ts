/**
 * Module augmentation para NextAuth v5 — extiende Session y JWT con claims RBAC.
 *
 * Sin esto, TypeScript no reconoce session.user.rol / session.user.modulos.
 * Se eliminan los @ts-expect-error dispersos por el código.
 */

import type { ModuloKey } from '@/lib/permisos/modulos'

declare module '@auth/core/types' {
  interface User {
    /** Rol global: 'admin' (acceso total), 'operador' (lectura+escritura en módulos), 'lector' (solo lectura) */
    rol?: 'admin' | 'operador' | 'lector'
    /** Lista de módulos permitidos (solo relevante para operador/lector) */
    modulos?: ModuloKey[]
  }
}

declare module '@auth/core/jwt' {
  interface DefaultJWT {
    rol?: 'admin' | 'operador' | 'lector'
    modulos?: ModuloKey[]
    permisosRefreshedAt?: number
  }
}
