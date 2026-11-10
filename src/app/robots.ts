import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo/paginas-publicas'

// Pantallas internas y formularios de carga: no aportan a la búsqueda pública
const RUTAS_PRIVADAS = [
  '/admin',
  '/api',
  '/login',
  '/sin-acceso',
  '/ocio/encuesta',
  '/ocio/ingresos',
  '/ocio/camping',
  '/eventos',
  '/casa-catamarca',
  '/calidad',
  '/estadisticas/indicadores',
]

export default function robots(): MetadataRoute.Robots {
  // Los deploys de preview (*.vercel.app) no se indexan: duplicarían el sitio oficial
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') {
    return { rules: { userAgent: '*', disallow: '/' } }
  }
  return {
    rules: { userAgent: '*', allow: '/', disallow: RUTAS_PRIVADAS },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
