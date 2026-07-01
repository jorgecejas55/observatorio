/**
 * Vista pública de informe de fin de semana largo.
 * Server Component — datos via GAS (Phase 6).
 * Por ahora muestra un placeholder.
 */

import { LABELS_CATEGORIA } from '@/lib/types'

export const revalidate = 3600 // 1 hora

export default async function InformeFindePublicoPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  // TODO Phase 6: obtener datos de GAS por slug
  // const informe = await getInformeFindePorSlug(slug)

  return (
    <div className="max-w-4xl mx-auto py-16 text-center">
      <i className="fa-solid fa-file-lines text-4xl text-text-secondary mb-4" />
      <h2 className="text-lg font-bold text-text-primary mb-2">Informe no disponible</h2>
      <p className="text-sm text-text-secondary">
        El informe solicitado ({slug}) no está disponible aún. La vista pública se habilitará en la Fase 6.
      </p>
      <a href="/informes/ocio" className="btn-primary mt-6 inline-flex items-center gap-2">
        <i className="fa-solid fa-arrow-left" />
        Ver todos los informes
      </a>
    </div>
  )
}
