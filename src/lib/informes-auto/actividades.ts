/**
 * Consulta de actividades vigentes desde Directus.
 * Server-side, tolerante a fallos.
 */

export interface ResumenActividades {
  total: number
  porTematica: Array<{ nombre: string; cantidad: number }>
  permanentes: number
  ocasionales: number
  destacadas: string[]
}

interface ActividadDirectus {
  id: number
  nombre_de_la_actividad: string
  tipo_de_actividad: 'Permanente' | 'Ocasional' | null
  fecha_inicio: string | null      // YYYY-MM-DD
  fecha_fin: string | null         // YYYY-MM-DD
  Dias_y_horarios: string | null
  tematicas_: number[] | null      // array de IDs → colección tematicas
  status: string
  destacado: boolean | null
}

interface TematicaDirectus {
  id: number
  nombre: string
}

/**
 * Determina si una actividad está vigente durante el período [fechaInicio, fechaFin].
 *
 * Criterio:
 * - Permanente: sin fechas (oferta continua) o su rango solapa [WI, WF].
 * - Ocasional: solo si tiene fechas explícitas que solapan [WI, WF].
 *   (Una ocasional sin fecha NO se asume vigente.)
 */
function estaVigente(
  actividad: ActividadDirectus,
  fechaInicio: string,
  fechaFin: string
): boolean {
  if (actividad.status !== 'published') return false

  const tipo = actividad.tipo_de_actividad
  const ini = actividad.fecha_inicio
  const fin = actividad.fecha_fin

  // Sin tipo definido → incluir como permanente (comportamiento tolerante)
  if (!tipo || tipo === 'Permanente') {
    // Si tiene fechas, debe solapar; si no, vigente siempre (oferta continua)
    if (!ini) return true
    return ini <= fechaFin && (!fin || fin >= fechaInicio)
  }

  if (tipo === 'Ocasional') {
    // Ocasional SIN fechas → no se asume vigente
    if (!ini && !fin) return false
    // Ocasional con fechas → debe solapar
    return !!(ini && ini <= fechaFin && (!fin || fin >= fechaInicio))
  }

  return false
}

/**
 * Obtiene las actividades vigentes durante el período dado.
 * Tolerante a fallos: si Directus no responde, devuelve resumen vacío.
 */
export async function getActividadesVigentes(
  fechaInicio: string,
  fechaFin: string
): Promise<ResumenActividades> {
  const directusUrl = process.env.DIRECTUS_URL
  const directusToken = process.env.DIRECTUS_TOKEN

  const vacio: ResumenActividades = {
    total: 0,
    porTematica: [],
    permanentes: 0,
    ocasionales: 0,
    destacadas: [],
  }

  if (!directusUrl || !directusToken) return vacio

  try {
    // Fetch de actividades
    const actUrl = new URL(`${directusUrl}/items/actividades`)
    actUrl.searchParams.set('limit', '-1')
    actUrl.searchParams.set('filter[status][_eq]', 'published')
    // Traer solo campos necesarios
    actUrl.searchParams.set('fields', 'id,nombre_de_la_actividad,tipo_de_actividad,fecha_inicio,fecha_fin,Dias_y_horarios,tematicas_,destacado')

    const actRes = await fetch(actUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${directusToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!actRes.ok) {
      console.warn('[actividades] Directus devolvió error:', actRes.status)
      return vacio
    }

    const actJson = await actRes.json()
    const actividades: ActividadDirectus[] = actJson.data ?? []

    // Filtrar por vigencia
    const vigentes = actividades.filter(a => estaVigente(a, fechaInicio, fechaFin))

    // Fetch de temáticas para mapear IDs → nombres
    const tematicasMap = new Map<number, string>()
    try {
      const temUrl = new URL(`${directusUrl}/items/tematicas`)
      temUrl.searchParams.set('limit', '-1')
      temUrl.searchParams.set('fields', 'id,nombre')

      const temRes = await fetch(temUrl.toString(), {
        headers: {
          'Authorization': `Bearer ${directusToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (temRes.ok) {
        const temJson = await temRes.json()
        const tematicas: TematicaDirectus[] = temJson.data ?? []
        for (const t of tematicas) {
          tematicasMap.set(t.id, t.nombre)
        }
      }
    } catch {
      // Tolerante: si no se pueden obtener temáticas, seguimos sin nombres
    }

    // Contar por temática
    const conteoTematica = new Map<string, number>()
    for (const a of vigentes) {
      const ids = a.tematicas_ ?? []
      for (const tid of ids) {
        const nombre = tematicasMap.get(tid) ?? `Temática #${tid}`
        conteoTematica.set(nombre, (conteoTematica.get(nombre) ?? 0) + 1)
      }
    }

    const porTematica = Array.from(conteoTematica.entries())
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)

    const permanentes = vigentes.filter(a => a.tipo_de_actividad === 'Permanente' || !a.tipo_de_actividad).length
    const ocasionales = vigentes.filter(a => a.tipo_de_actividad === 'Ocasional').length

    const destacadas = vigentes
      .filter(a => a.destacado)
      .slice(0, 5)
      .map(a => a.nombre_de_la_actividad)

    return {
      total: vigentes.length,
      porTematica,
      permanentes,
      ocasionales,
      destacadas,
    }
  } catch (error) {
    console.warn('[actividades] Error consultando Directus:', error)
    return vacio
  }
}
