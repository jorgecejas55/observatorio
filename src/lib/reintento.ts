/**
 * Un reintento ante fallas transitorias de los GAS (HTML 404, cold start de
 * ~15 s). Evita informes y dashboards con ceros falsos.
 */
export async function conReintento<T>(operacion: () => Promise<T>): Promise<T> {
  try {
    return await operacion()
  } catch {
    return await operacion()
  }
}
