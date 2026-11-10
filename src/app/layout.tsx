import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Analytics } from '@vercel/analytics/next'
import ServiceWorkerRegister from '@/components/shared/ServiceWorkerRegister'
import { OPEN_GRAPH_BASE, SITE_NAME, SITE_URL } from '@/lib/seo/paginas-publicas'

const DESCRIPCION_SITIO =
  'Estadísticas e informes oficiales de turismo de San Fernando del Valle de Catamarca: ocupación hotelera, perfil del visitante, eventos y oferta turística. Observatorio Municipal de Turismo.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: DESCRIPCION_SITIO,
  applicationName: SITE_NAME,
  openGraph: {
    ...OPEN_GRAPH_BASE,
    title: SITE_NAME,
    description: DESCRIPCION_SITIO,
  },
  twitter: { card: 'summary_large_image' },
  verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
}

// Datos estructurados (schema.org): identifica al sitio como organismo público para los buscadores
const ORGANIZACION_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'GovernmentOrganization',
  name: 'Observatorio Municipal de Turismo de San Fernando del Valle de Catamarca',
  url: SITE_URL,
  logo: `${SITE_URL}/logos/observatorio_cuadrado_color.png`,
  areaServed: 'San Fernando del Valle de Catamarca, Catamarca, Argentina',
  parentOrganization: {
    '@type': 'GovernmentOrganization',
    name: 'Municipalidad de San Fernando del Valle de Catamarca',
  },
}

export const viewport: Viewport = {
  themeColor: '#1e79b8',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
          integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZACION_JSON_LD) }}
        />
        {children}
        <ServiceWorkerRegister />
        <Analytics />
      </body>
    </html>
  )
}
