import type { DatosPerfilVisitante } from './types'

// ── Obtener datos del perfil del visitante ─────────────────────────────────────

export async function fetchPerfil(fechaDesde: string, fechaHasta: string): Promise<DatosPerfilVisitante | null> {
  try {
    const baseUrl = process.env.DASHBOARD_PERFIL_SCRIPT_URL
    if (!baseUrl) {
      console.error('[fetchPerfil] DASHBOARD_PERFIL_SCRIPT_URL no configurada')
      return null
    }

    const url = new URL(baseUrl)
    url.searchParams.set('fechaDesde', fechaDesde)
    url.searchParams.set('fechaHasta', fechaHasta)

    const res = await fetch(url.toString(), { cache: 'no-store' })
    if (!res.ok) {
      console.error(`[fetchPerfil] GAS respondió ${res.status} para ${fechaDesde}..${fechaHasta}`)
      return null
    }

    const json = await res.json()
    const d = json.data ?? json

    // Estadía: API devuelve estadiaPromedio pre-calculado (sin datos crudos para outliers)
    const estadiaPromedio = Number(d.estadiaPromedio ?? 0)
    const estadiaSinOutliers = {
      estadiaPromedio: Math.round(estadiaPromedio * 10) / 10,
      n: Number(d.total ?? 0),
      nExcluidas: 0, // sin datos crudos, no podemos contar exclusiones
    }

    // Procedencia: API devuelve array [{nombre, cantidad}], convertir a objeto
    const procArray: Array<{ nombre: string; cantidad: number }> = d.porProcedencia ?? d.procedencia ?? []
    const procMap: Record<string, number> = {}
    if (Array.isArray(procArray)) {
      for (const p of procArray) {
        procMap[String(p.nombre ?? '').toUpperCase()] = Number(p.cantidad ?? 0)
      }
    }

    // Normalizar claves de objetos Sí/No (API devuelve mayúsculas, a veces sin tilde: SÍ, SI, NO)
    const normalizarSiNo = (obj: Record<string, number> | undefined): Record<string, number> => {
      if (!obj) return {}
      const out: Record<string, number> = {}
      for (const [k, v] of Object.entries(obj)) {
        // Quitar tildes y normalizar a mayúsculas
        const key = String(k ?? '')
          .toUpperCase()
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, '') // quitar acentos
          .trim()
        out[key] = Number(v ?? 0)
      }
      return out
    }

    return {
      totalEncuestas: Number(d.total ?? 0),
      estadiaSinOutliers,
      procedencia: {
        NACIONAL: procMap['NACIONAL'] ?? 0,
        PROVINCIAL: procMap['PROVINCIAL'] ?? 0,
        INTERNACIONAL: procMap['INTERNACIONAL'] ?? 0,
      },
      provinciasFrecuentes: (d.provinciasFrecuentes ?? d.provincias ?? []).map(
        (p: { nombre: string; cantidad: number }) => ({
          nombre: String(p.nombre ?? ''),
          cantidad: Number(p.cantidad ?? 0),
        })
      ),
      motivosVisita: (d.motivosVisita ?? d.motivos ?? []).map(
        (m: { nombre: string; cantidad: number }) => ({
          nombre: String(m.nombre ?? ''),
          cantidad: Number(m.cantidad ?? 0),
        })
      ),
      gruposViaje: (d.gruposViaje ?? d.grupos ?? []).map(
        (g: { nombre: string; cantidad: number }) => ({
          nombre: String(g.nombre ?? ''),
          cantidad: Number(g.cantidad ?? 0),
        })
      ),
      mediosTransporte: (d.mediosTransporte ?? d.transporte ?? []).map(
        (t: { nombre: string; cantidad: number }) => ({
          nombre: String(t.nombre ?? ''),
          cantidad: Number(t.cantidad ?? 0),
        })
      ),
      tiposAlojamiento: (d.tiposAlojamiento ?? d.alojamiento ?? []).map(
        (a: { nombre: string; cantidad: number }) => ({
          nombre: String(a.nombre ?? ''),
          cantidad: Number(a.cantidad ?? 0),
        })
      ),
      primeraVez: normalizarSiNo(d.primeraVez),
      otrosDestinos: normalizarSiNo(d.otrosDestinos),
      recomendaria: normalizarSiNo(d.recomendaria),
      volveria: normalizarSiNo(d.volveria),
    }
  } catch (error) {
    console.error(`[fetchPerfil] Error para ${fechaDesde}..${fechaHasta}:`, error)
    return null
  }
}
