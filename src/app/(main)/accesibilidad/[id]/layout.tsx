import type { Metadata } from 'next'
import { OPEN_GRAPH_BASE, tituloCompleto } from '@/lib/seo/paginas-publicas'

interface Props {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

// Canonical propio: sin esto heredaría el de /accesibilidad y Google trataría las fichas como duplicados
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ruta = `/accesibilidad/${(await params).id}`
  return {
    title: tituloCompleto('Ficha de accesibilidad de atractivo'),
    description:
      'Condiciones de accesibilidad de un atractivo turístico de San Fernando del Valle de Catamarca, según el relevamiento del Observatorio Municipal de Turismo.',
    alternates: { canonical: ruta },
    openGraph: { ...OPEN_GRAPH_BASE, url: ruta },
  }
}

export default function Layout({ children }: Props) {
  return children
}
