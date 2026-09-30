import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { getPermisosCached } from '@/lib/permisos/obs-admin-service'
import {
  aplicarResultadoPermisos,
  debeRefrescarPermisos,
  type ResultadoConsultaPermisos,
} from '@/lib/permisos/refresco'

// ── Anti-lockout ─────────────────────────────────────────────────────────────────
// Este email es super-admin incondicional: se evalúa ANTES de consultar GAS.
// Una caída del backend nunca bloquea al administrador.
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'jorgecejas55@gmail.com').toLowerCase().trim()

// ── Resolución de permisos ───────────────────────────────────────────────────────
async function resolverPermisos(email: string): Promise<ResultadoConsultaPermisos> {
  // 1. Bypass: ADMIN_EMAIL es admin incondicional (no depende de GAS)
  if (email.toLowerCase().trim() === ADMIN_EMAIL) {
    return { ok: true, rol: 'admin', modulos: [] }
  }

  // 2. Consultar GAS (con caché de 10 min)
  try {
    const permisos = await getPermisosCached(email)
    if (permisos && permisos.activo) {
      return { ok: true, rol: permisos.rol, modulos: permisos.modulos }
    }
    // 3. Usuario desconocido o inactivo → lector sin módulos
    return { ok: true, rol: 'lector', modulos: [] }
  } catch (error) {
    // GAS caído o lento: no es "sin permisos", el jwt conserva los claims previos
    console.error('[auth] Error resolviendo permisos para', email, error)
    return { ok: false }
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      const ahora = Date.now()
      if (token.email && debeRefrescarPermisos(token, ahora, !!account)) {
        const resultado = await resolverPermisos(token.email)
        Object.assign(token, aplicarResultadoPermisos(token, resultado, ahora))
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
