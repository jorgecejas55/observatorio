import { metadataDePagina } from '@/lib/seo/paginas-publicas'

// La página es client component: la metadata para buscadores se declara acá
export const metadata = metadataDePagina('/accesibilidad-gastronomica')

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
