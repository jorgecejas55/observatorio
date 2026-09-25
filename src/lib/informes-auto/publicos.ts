/**
 * Informes automáticos visibles al público (Informes Técnicos y /informes/ver).
 *
 * Caché sin vencimiento, invalidada solo al publicar (revalidateTag): así la
 * vista pública muestra la versión publicada aunque después se recalcule el
 * informe ("cambios sin publicar") hasta que se vuelva a publicar.
 */

import { unstable_cache } from 'next/cache'
import { listarInformes, obtenerInforme, type MetaInforme } from './gas'
import { normalizarInforme } from './normalizar'
import type { EstadoInforme, InformeFindeCompleto, TipoInforme } from './types'

export const TAG_INFORMES_PUBLICOS = 'informes-auto-publicos'

const ESTADOS_PUBLICOS: EstadoInforme[] = ['publicado', 'cambios-sin-publicar']

/** El tipo sale del slug (ver generarSlug en pipeline.ts): la hoja de metadatos no lo guarda. */
export function tipoDesdeSlug(slug: string): TipoInforme {
  if (slug.startsWith('mensual-')) return 'MENSUAL'
  if (slug.startsWith('evento-')) return 'EVENTO'
  return 'FSL'
}

export const getInformesAutoPublicados = unstable_cache(
  async (): Promise<MetaInforme[]> =>
    (await listarInformes()).filter(m => ESTADOS_PUBLICOS.includes(m.estado)),
  ['informes-auto-publicados'],
  { tags: [TAG_INFORMES_PUBLICOS], revalidate: false },
)

export const getInformeAutoPublicado = unstable_cache(
  async (slug: string): Promise<InformeFindeCompleto | null> => {
    const meta = (await getInformesAutoPublicados()).find(m => m.slug === slug)
    if (!meta) return null
    const guardado = await obtenerInforme(meta.id)
    return guardado ? normalizarInforme(guardado.datos) : null
  },
  ['informe-auto-publicado'],
  { tags: [TAG_INFORMES_PUBLICOS], revalidate: false },
)
