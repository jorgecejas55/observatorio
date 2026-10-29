import Link from 'next/link'
import { formatearRango, tituloRelevamiento } from '@/lib/formato-fechas'
import type { RelevamientoOH } from '@/lib/informes-auto/types'

/** Relevamientos OH cerrados sin informe: atajo al formulario con el relevamiento elegido. */
export default function ListosParaGenerar({ relevamientos }: { relevamientos: RelevamientoOH[] }) {
  if (relevamientos.length === 0) return null
  return (
    <div className="card p-5 mb-6 border border-primary/20">
      <h3 className="font-bold text-text-primary mb-1 flex items-center gap-2 text-sm">
        <i className="fa-solid fa-inbox text-primary" aria-hidden="true" />
        Listos para generar ({relevamientos.length})
      </h3>
      <p className="text-xs text-text-secondary mb-3">
        Relevamientos de ocupación hotelera cerrados que todavía no tienen informe.
      </p>
      <ul className="divide-y divide-gray-100">
        {relevamientos.map(r => (
          <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
            <div>
              <p className="font-medium text-text-primary">{tituloRelevamiento(r.tipo, r.nombre, r.fechaInicio)}</p>
              <p className="text-xs text-text-secondary">{r.tipo} · {formatearRango(r.fechaInicio, r.fechaFin)}</p>
            </div>
            <Link
              href={`/admin/informes-auto/nuevo?relevamiento=${encodeURIComponent(r.id)}`}
              className="btn-outline text-xs py-1 px-3 whitespace-nowrap"
            >
              <i className="fa-solid fa-wand-magic-sparkles mr-1" aria-hidden="true" />
              Generar informe
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
