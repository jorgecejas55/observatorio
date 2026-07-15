/**
 * Lista de emails autorizados para acceder al módulo de Ocupación Hotelera.
 *
 * Solución transitoria hasta implementar RBAC por módulo (OBS_Admin).
 * Agregar/quitar emails acá; los checks de layout, API routes y Sidebar
 * usan tieneAccesoOcupacion().
 */

export const EMAILS_OCUPACION: readonly string[] = [
  'jorgecejas55@gmail.com',
  'vazquezmarcelacelestina@gmail.com',
  'romis.segura@gmail.com',
  'hotelesybarescatamarca2022@gmail.com',
] as const

export function tieneAccesoOcupacion(email?: string | null): boolean {
  return !!email && (EMAILS_OCUPACION as readonly string[]).includes(email.toLowerCase().trim())
}
