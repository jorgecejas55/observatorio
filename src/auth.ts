import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import type { Rol } from '@/lib/types'

// Lista de emails autorizados y sus roles.
// Reemplazar con un lookup en Google Sheets (OBS_Admin) cuando el sistema esté en producción.
const ROLES_ESTATICOS: Record<string, Rol> = {
  // 'email@municipalidadcapital.gob.ar': 'admin',
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user?.email) {
        const rol = ROLES_ESTATICOS[session.user.email] ?? 'operador'
        // @ts-expect-error — extendemos la sesión con el rol
        session.user.rol = rol
      }
      return session
    },
    async jwt({ token, account }) {
      return token
    },
  },
  pages: {
    signIn: '/login',
  },
})
