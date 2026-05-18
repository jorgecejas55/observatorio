import type { Informe, CategoriaInforme } from '@/lib/types'
import { LABELS_CATEGORIA } from '@/lib/types'

const BADGE_COLORS: Record<CategoriaInforme, string> = {
  mensual: 'bg-blue-100 text-blue-700',
  trimestral: 'bg-green-100 text-green-700',
  quincenal: 'bg-cyan-100 text-cyan-700',
  finde: 'bg-orange-100 text-orange-700',
  'evento-especifico': 'bg-red-100 text-red-700',
  tematico: 'bg-gray-100 text-gray-700',
  especial: 'bg-purple-100 text-purple-700',
}

interface Props {
  informe: Informe
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export default function InformeFila({ informe }: Props) {
  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
      <i className="fa-regular fa-file-lines text-teal-600 text-2xl flex-shrink-0" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-sm font-semibold text-text-primary truncate">
            {informe.titulo}
          </span>
          <span className={`badge text-xs ${BADGE_COLORS[informe.categoria]}`}>
            {LABELS_CATEGORIA[informe.categoria]}
          </span>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
          <span className="text-xs text-text-secondary">
            <span className="font-medium text-text-secondary/60">Período: </span>
            {informe.periodo}
          </span>
          {informe.fecha && (
            <span className="text-xs text-text-secondary">
              <span className="font-medium text-text-secondary/60">Publicado: </span>
              {formatFecha(informe.fecha)}
            </span>
          )}
        </div>

        {informe.descripcion && (
          <p className="text-xs text-text-secondary mt-1 line-clamp-2">
            <span className="font-medium text-text-secondary/60">Contenido: </span>
            {informe.descripcion}
          </p>
        )}
      </div>

      <a
        href={informe.urlPdf}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-outline text-xs flex items-center gap-1.5 flex-shrink-0"
      >
        <span>Ver informe</span>
        <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" />
      </a>
    </div>
  )
}
