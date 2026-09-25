/**
 * Cliente del GAS de persistencia de informes-auto (gas/informes-auto.gs).
 *
 * El estado vigente de un informe es el de la hoja de metadatos (InformesAuto):
 * la acción `guardar` del GAS escribe `data.estado` en esa hoja, así que todo
 * guardado debe llevar el estado correcto o el informe vuelve a "borrador".
 */

import type { EstadoInforme, InformeFindeCompleto } from './types'

export interface MetaInforme {
  id: string
  slug: string
  nombre: string
  fechaInicio: string
  fechaFin: string
  fechaGeneracion: string
  usuarioGenerador: string
  estado: EstadoInforme
  idInformePublico: string
}

export interface InformeGuardado {
  meta: MetaInforme
  datos: InformeFindeCompleto
}

export interface ResultadoGuardado {
  success: boolean
  id?: string
  slug?: string
  actualizado?: boolean
  error?: string
}

function configuracion() {
  const url = process.env.INFORMES_AUTO_SCRIPT_URL
  const secret = process.env.INFORMES_AUTO_SCRIPT_SECRET
  if (!url || url === 'PENDIENTE') throw new Error('INFORMES_AUTO_SCRIPT_URL no configurada')
  return { url, secret }
}

async function gasGet(action: string, id?: string) {
  const { url } = configuracion()
  const destino = new URL(url)
  destino.searchParams.set('action', action)
  if (id) destino.searchParams.set('id', id)
  const res = await fetch(destino.toString(), { cache: 'no-store' })
  return res.json()
}

export async function listarInformes(): Promise<MetaInforme[]> {
  const json = await gasGet('listar')
  if (json.error) throw new Error(json.error)
  return json.data ?? []
}

/** Informe completo con su estado real (hoja de metadatos). null si no existe. */
export async function obtenerInforme(id: string): Promise<InformeGuardado | null> {
  const json = await gasGet('obtener', id)
  if (json.error || !json.data?.datos) return null
  const { datos, ...meta } = json.data
  return {
    meta: meta as MetaInforme,
    datos: { ...datos, estado: meta.estado } as InformeFindeCompleto,
  }
}

/** Upsert por slug. El GAS preserva el id original si el slug ya existía. */
export async function guardarInforme(datos: InformeFindeCompleto): Promise<ResultadoGuardado> {
  const { url, secret } = configuracion()
  if (!secret || secret === 'PENDIENTE') throw new Error('INFORMES_AUTO_SCRIPT_SECRET no configurada')
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret, action: 'guardar', data: datos }),
  })
  const json = await res.json()
  if (json.error) return { success: false, error: String(json.error) }
  return { success: true, ...json.data }
}
