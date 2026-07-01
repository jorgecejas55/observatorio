/**
 * Lista de emails autorizados para acceder al dashboard de Casa de Catamarca.
 *
 * Opción A: lista en código (rápido, primero).
 * Si la lista cambia con frecuencia, migrar a Opción B (hoja _AccesoDashboard en Sheets).
 */

export const EMAILS_CASA_CATAMARCA: readonly string[] = [
  'jorgecejas55@gmail.com',
  // Agregar emails de operativos de la Casa de Catamarca en BsAs
] as const

export function tieneAccesoCasaCatamarca(email?: string | null): boolean {
  return !!email && (EMAILS_CASA_CATAMARCA as readonly string[]).includes(email)
}
