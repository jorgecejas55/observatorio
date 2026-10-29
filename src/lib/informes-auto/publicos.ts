/**
 * Informes automáticos visibles al público (Informes Técnicos y /informes/ver).
 *
 * La vista pública sirve la copia guardada al publicar (publicacion.snapshot):
 * aunque después se recalcule el informe ("cambios sin publicar") o se vacíe
 * la caché, se ve lo publicado. Publicaciones viejas sin copia caen a la
 * última versión guardada (comportamiento anterior).
 * Caché sin vencimiento, invalidada al publicar o renombrar (revalidateTag).
 */

import { unstable_cache } from 'next/cache'
import { listarInformes, obtenerInforme, type MetaInforme } from './gas'
import { normalizarInforme } from './normalizar'
import type { EstadoInforme, InformeFindeCompleto } from './types'

export const TAG_INFORMES_PUBLICOS = 'informes-auto-publicos'

const ESTADOS_PUBLICOS: EstadoInforme[] = ['publicado', 'cambios-sin-publicar']

export { tipoDesdeSlug } from './listado'

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
    if (!guardado) return null
    const publicado = guardado.datos.publicacion?.snapshot
    return normalizarInforme(publicado ? { ...publicado, estado: guardado.meta.estado } : guardado.datos)
  },
  ['informe-auto-publicado'],
  { tags: [TAG_INFORMES_PUBLICOS], revalidate: false },
)
