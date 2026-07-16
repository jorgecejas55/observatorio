/**
 * Sugerencias de gasto diario y % de excursionistas para el formulario.
 *
 * Fuente: el último informe guardado DEL MISMO TIPO en la hoja DatosInformes
 * (GAS informes-auto). Reemplaza al viejo circuito HISTORIAL_IMPACTO_GAS_URL /
 * gas/historial-impacto.gs (planilla del gasto, abandonada).
 */

import type { SugerenciaHistorial, TipoInforme, InformeFindeCompleto } from '@/lib/informes-auto/types'

const GAS_URL = process.env.INFORMES_AUTO_SCRIPT_URL

async function gasGet(action: string, id?: string): Promise<any> {
  if (!GAS_URL || GAS_URL === 'PENDIENTE') {
    throw new Error('INFORMES_AUTO_SCRIPT_URL no configurada')
  }
  const url = new URL(GAS_URL)
  url.searchParams.set('action', action)
  if (id) url.searchParams.set('id', id)
  const res = await fetch(url.toString())
  return res.json()
}

/** Cuántos informes recientes revisar como máximo buscando uno del mismo tipo. */
const MAX_INFORMES_A_REVISAR = 8

export async function getSugerenciaUltimoInforme(
  tipo: TipoInforme
): Promise<SugerenciaHistorial | null> {
  try {
    const lista = await gasGet('listar')
    const informes: Array<{ id: string }> = lista?.data ?? []

    for (const item of informes.slice(0, MAX_INFORMES_A_REVISAR)) {
      let datos: InformeFindeCompleto | null = null
      try {
        const detalle = await gasGet('obtener', item.id)
        datos = detalle?.data?.datos ?? null
      } catch {
        continue
      }
      if (!datos || !datos.gastoDiarioTuristas) continue

      const tipoInforme: TipoInforme = datos.tipoInforme ?? 'FSL'
      if (tipoInforme !== tipo) continue

      // % de excursionistas: directo en informes nuevos; derivado en viejos
      const turistas = datos.impacto?.turistasAlojados ?? 0
      const excursionistas = datos.excursionistasManual ?? datos.impacto?.excursionistas ?? 0
      let porcentaje: number | null = datos.porcentajeExcursionistas ?? null
      if (porcentaje == null && turistas > 0 && excursionistas > 0) {
        porcentaje = Math.round((excursionistas / turistas) * 100)
      }

      return {
        evento: datos.nombre,
        anio: Number(String(datos.fechaInicio ?? '').slice(0, 4)) || 0,
        gastoDiarioTuristas: datos.gastoDiarioTuristas,
        gastoDiarioExcursionistas: datos.gastoDiarioExcursionistas,
        porcentajeExcursionistas: porcentaje,
        excursionistas,
        turistasAlojados: turistas,
      }
    }

    return null
  } catch (error) {
    console.error('Error buscando sugerencia del último informe:', error)
    return null
  }
}
