import { SkeletonCard, SkeletonChart } from '@/components/shared/SkeletonLoader'

/** Silueta de la vista de un canal mientras llegan sus datos. */
export function EsqueletoCanal() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Cargando datos del canal">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <SkeletonChart height={260} />
    </div>
  )
}

interface ErrorCanalProps {
  mensaje: string
  onReintentar: () => void
}

export function ErrorCanal({ mensaje, onReintentar }: ErrorCanalProps) {
  return (
    <div className="card p-8 text-center" role="alert">
      <i className="fa-solid fa-triangle-exclamation text-3xl text-amber-500 mb-3" aria-hidden="true" />
      <p className="font-semibold text-text-primary">{mensaje}</p>
      <p className="text-sm text-text-secondary mt-1">Probá de nuevo en unos segundos.</p>
      <button onClick={onReintentar} className="btn-outline text-sm mt-4 inline-flex items-center gap-2">
        <i className="fa-solid fa-rotate-right" aria-hidden="true" /> Reintentar
      </button>
    </div>
  )
}
