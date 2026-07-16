import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { getPermisosCached } from '@/lib/permisos/obs-admin-service'
import type { ModuloKey } from '@/lib/permisos/modulos'

// ── Anti-lockout ─────────────────────────────────────────────────────────────────
// Este email es super-admin incondicional: se evalúa ANTES de consultar GAS.
// Una caída del backend nunca bloquea al administrador.
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'jorgecejas55@gmail.com').toLowerCase().trim()

// ── Refresh de permisos ──────────────────────────────────────────────────────────
const PERMISOS_TTL_MS = 10 * 60 * 1000 // 10 minutos

async function resolverPermisos(
  email: string,
): Promise<{ rol: 'admin' | 'operador' | 'lector'; modulos: ModuloKey[] }> {
  // 1. Bypass: ADMIN_EMAIL es admin incondicional (no depende de GAS)
  if (email.toLowerCase().trim() === ADMIN_EMAIL) {
    return { rol: 'admin', modulos: [] }
  }

  // 2. Consultar GAS (con caché de 10 min)
  try {
    const permisos = await getPermisosCached(email)
    if (permisos && permisos.activo) {
      return { rol: permisos.rol, modulos: permisos.modulos }
    }
  } catch (error) {
    console.error('[auth] Error resolviendo permisos para', email, error)
  }

  // 3. Fail-closed: usuario desconocido, inactivo, o GAS caído → lector sin módulos
  return { rol: 'lector', modulos: [] }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Refresh si: sign-in, sin claims, TTL vencido, o modulos vacíos sin ser admin (c/30s)
      const modulosVacios = !token.modulos || token.modulos.length === 0
      const ttlVencio = token.permisosRefreshedAt
        ? (Date.now() - token.permisosRefreshedAt) > PERMISOS_TTL_MS
        : true
      const retryModulos = modulosVacios && token.rol !== 'admin'
        && (ttlVencio || !token.permisosRefreshedAt) // solo reintenta si pasó TTL
      const necesitaRefresh =
        !!account || !token.rol || ttlVencio || retryModulos

      if (necesitaRefresh && token.email) {
        const { rol, modulos } = await resolverPermisos(token.email)
        token.rol = rol
        token.modulos = modulos
        token.permisosRefreshedAt = Date.now()
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.rol = token.rol || 'lector'
        session.user.modulos = token.modulos || []
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
})
