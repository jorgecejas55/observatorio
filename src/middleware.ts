// El middleware no redirige por diseño: toda la protección de rutas está en los
// gates de layouts/páginas (requireAccesoPage) y de API routes (requireAcceso /
// requireEscritura), con RBAC por módulo vía GAS OBS_Admin.
// ── Rutas de acceso público (sin autenticación) ──
//   /estadisticas/perfil-visitante  — dashboard público de perfil del visitante
//   /api/ocio/dashboard             — API que alimenta el dashboard público
// const PUBLIC_PATHS = ['/estadisticas/perfil-visitante', '/login']

export default function middleware() {
  // sin redirecciones — todas las rutas accesibles
  // La protección real está en las API routes de ocupacion
}
