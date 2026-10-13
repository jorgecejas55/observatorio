/**
 * Empuje de resultados de informes hacia la planilla histórica maestra
 * (191cjZK9..., hojas indicadores_findes / indicadores_mensual).
 *
 * El sistema es el PRODUCTOR ÚNICO de la serie: al PUBLICAR un informe se
 * hace upsert del registro correspondiente. Las columnas de
 * variación de indicadores_mensual (D, E, G, H) son fórmulas de la propia
 * planilla y NUNCA se tocan (el GAS solo escribe C, F, I, J).
 *
 * Si el empuje falla, la publicación se aborta (el informe no queda como
 * publicado) y la UI muestra el error para reintentar.
 */

import type { InformeFindeCompleto, ResultadoEmpuje } from '@/lib/informes-auto/types'
import { valoresParaMaestra } from './publicacion'

async function llamarGasIndicadores(body: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
  const url = process.env.INDICADORES_SCRIPT_URL
  const apiKey = process.env.INDICADORES_GAS_API_KEY
  if (!url || url === 'PENDIENTE') return { ok: false, error: 'INDICADORES_SCRIPT_URL no configurada' }
  if (!apiKey || apiKey === 'PENDIENTE') return { ok: false, error: 'INDICADORES_GAS_API_KEY no configurada' }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ apiKey, ...body }),
    redirect: 'follow',
  })
  const text = await res.text()
  if (text.trim().startsWith('<')) return { ok: false, error: 'El GAS de indicadores devolvió HTML' }
  const json = JSON.parse(text)
  if (!json.success) return { ok: false, error: String(json.error ?? 'Error desconocido del GAS') }
  return { ok: true }
}

export async function empujarAPlanillaMaestra(
  informe: InformeFindeCompleto
): Promise<ResultadoEmpuje> {
  const tipo = informe.tipoInforme ?? 'FSL'
  const destino = tipo === 'MENSUAL' ? 'indicadores_mensual' : 'indicadores_findes'
  const fecha = new Date().toISOString()

  const action = tipo === 'MENSUAL' ? 'upsertMensual' : 'upsertFinde'
  const data = valoresParaMaestra(informe)

  try {
    const resultado = await llamarGasIndicadores({ action, data })
    if (!resultado.ok) return { ok: false, destino, fecha, error: resultado.error }
    return { ok: true, destino, fecha }
  } catch (error) {
    return { ok: false, destino, fecha, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Actualiza el nombre del evento en indicadores_findes sin cambiar los valores numéricos.
 * Solo aplica a informes FSL/EVENTO que ya fueron publicados.
 */
export async function empujarRenombreFinde(
  informe: InformeFindeCompleto,
  nombreNuevo: string
): Promise<ResultadoEmpuje> {
  const fecha = new Date().toISOString()

  if (!informe.publicacion) {
    return { ok: false, destino: 'indicadores_findes', fecha, error: 'El informe no tiene datos de publicación previos' }
  }

  const vals = informe.publicacion.valores
  const data = {
    anio: vals.anio,
    mes: vals.mes,
    evento: nombreNuevo,
    eventoAnterior: informe.nombre,
    oh: vals.oh,
    estadiaProm: vals.estadiaProm,
    visitantes: vals.visitantes,
    impacto: vals.impacto,
  }

  try {
    const resultado = await llamarGasIndicadores({ action: 'upsertFinde', data })
    if (!resultado.ok) return { ok: false, destino: 'indicadores_findes', fecha, error: resultado.error }
    return { ok: true, destino: 'indicadores_findes', fecha }
  } catch (error) {
    return { ok: false, destino: 'indicadores_findes', fecha, error: error instanceof Error ? error.message : String(error) }
  }
}
