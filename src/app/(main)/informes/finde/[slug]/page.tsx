import { permanentRedirect } from 'next/navigation'

/** Ruta vieja (placeholder): la vista pública de informes vive en /informes/ver/[slug]. */
export default async function InformeFindeRedirect({ params }: { params: Promise<{ slug: string }> }) {
  permanentRedirect(`/informes/ver/${(await params).slug}`)
}
