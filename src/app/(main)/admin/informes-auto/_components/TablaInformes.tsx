import Link from 'next/link'
import EstadoInformeBadge, { normalizarEstado } from '@/components/informes-auto/EstadoInformeBadge'
import { formatearRango } from '@/lib/formato-fechas'
import { tipoDesdeSlug, type ResumenInforme } from '@/lib/informes-auto/listado'
import type { TipoInforme } from '@/lib/informes-auto/types'

export const ETIQUETAS_TIPO: Record<TipoInforme, string> = {
  MENSUAL: 'Mensual',
  FSL: 'Fin de semana largo',
  EVENTO: 'Evento',
}

function formatearGeneracion(fecha: string): string {
  return fecha ? new Date(fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
}

export default function TablaInformes({ informes }: { informes: ResumenInforme[] }) {
  if (informes.length === 0) {
    return <p className="text-xs text-text-secondary py-4">No hay informes con esos filtros.</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-xs text-text-secondary">
            <th className="text-left py-2 px-2 font-medium">Nombre</th>
            <th className="text-left py-2 px-2 font-medium">Tipo</th>
            <th className="text-left py-2 px-2 font-medium">Período</th>
            <th className="text-left py-2 px-2 font-medium">Estado</th>
            <th className="text-left py-2 px-2 font-medium">Generado</th>
            <th className="text-right py-2 px-2 font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {informes.map(inf => (
            <tr key={inf.id} className="hover:bg-gray-50 transition-colors">
              <td className="py-2 px-2 font-medium text-text-primary">{inf.nombre}</td>
              <td className="py-2 px-2 text-xs text-text-secondary">{ETIQUETAS_TIPO[tipoDesdeSlug(inf.slug)]}</td>
              <td className="py-2 px-2 text-xs text-text-secondary">{formatearRango(inf.fechaInicio, inf.fechaFin)}</td>
              <td className="py-2 px-2"><EstadoInformeBadge estado={inf.estado} /></td>
              <td className="py-2 px-2 text-xs text-text-secondary">{formatearGeneracion(inf.fechaGeneracion)}</td>
              <td className="py-2 px-2 text-right whitespace-nowrap space-x-1.5">
                <Link href={`/admin/informes-auto/${inf.id}`} className="btn-outline text-xs py-1 px-3">
                  <i className="fa-solid fa-eye mr-1" aria-hidden="true" />
                  Abrir
                </Link>
                {normalizarEstado(inf.estado) !== 'borrador' && (
                  <Link
                    href={`/informes/ver/${inf.slug}`}
                    target="_blank"
                    className="btn-outline text-xs py-1 px-3"
                    title="Versión pública (lo último publicado)"
                  >
                    <i className="fa-solid fa-globe mr-1" aria-hidden="true" />
                    Pública
                  </Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
