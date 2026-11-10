import type { MetadataRoute } from 'next'
import { getInformesAutoPublicados } from '@/lib/informes-auto/publicos'
import { PAGINAS_PUBLICAS, SITE_URL } from '@/lib/seo/paginas-publicas'

// Se regenera cada hora: suma los informes publicados sin necesidad de redeploy
export const revalidate = 3600

function entradasPaginas(): MetadataRoute.Sitemap {
  return Object.entries(PAGINAS_PUBLICAS).map(([ruta, pagina]) => ({
    url: `${SITE_URL}${ruta}`,
    changeFrequency: pagina.frecuencia,
    priority: pagina.prioridad,
  }))
}

/** 'YYYY-MM-DD' si el valor empieza con una fecha ISO; si no, se omite (lastModified es opcional). */
function fechaIso(valor: unknown): string | undefined {
  const fecha = String(valor).slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : undefined
}

/** Informes automáticos publicados; si el GAS falla, el sitemap sale igual con las páginas fijas. */
async function entradasInformes(): Promise<MetadataRoute.Sitemap> {
  try {
    const informes = await getInformesAutoPublicados()
    return informes.map(informe => ({
      url: `${SITE_URL}/informes/ver/${informe.slug}`,
      lastModified: fechaIso(informe.fechaGeneracion),
      changeFrequency: 'yearly',
      priority: 0.8,
    }))
  } catch (error) {
    console.error('[sitemap] No se pudieron leer los informes publicados:', error)
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return [...entradasPaginas(), ...(await entradasInformes())]
}
