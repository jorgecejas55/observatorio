// Auth temporalmente deshabilitado para preview.
// Cuando configures Google OAuth en .env.local, reemplazar con:
//
// import { auth } from '@/auth'
// export default auth((req) => {
//   const isPublic = PUBLIC_PATHS.some(p => req.nextUrl.pathname.startsWith(p))
//   if (!isPublic && !req.auth) return Response.redirect(new URL('/login', req.url))
// })
//
// export const config = {
//   matcher: ['/((?!_next/static|_next/image|favicon.ico|api/ocio/dashboard).*)'],
// }

// Rutas de acceso público (sin autenticación):
//   /estadisticas/perfil-visitante  — dashboard público de perfil del visitante
//   /api/ocio/dashboard             — API que alimenta el dashboard público
// const PUBLIC_PATHS = ['/estadisticas/perfil-visitante', '/login']

export default function middleware() {
  // sin redirecciones — todas las rutas accesibles
}
