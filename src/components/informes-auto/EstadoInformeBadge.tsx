import type { EstadoInforme } from '@/lib/informes-auto/types'

const ESTILOS: Record<EstadoInforme, { etiqueta: string; clases: string; icono: string; ayuda: string }> = {
  borrador: {
    etiqueta: 'Borrador',
    clases: 'bg-gray-100 text-gray-700',
    icono: 'fa-pen',
    ayuda: 'Todavía no está en el dashboard',
  },
  publicado: {
    etiqueta: 'Publicado',
    clases: 'bg-green-100 text-green-700',
    icono: 'fa-check',
    ayuda: 'Sus valores están en el dashboard',
  },
  'cambios-sin-publicar': {
    etiqueta: 'Cambios sin publicar',
    clases: 'bg-amber-100 text-amber-800',
    icono: 'fa-rotate',
    ayuda: 'Se recalculó después de publicar: el dashboard muestra los valores anteriores',
  },
}

/** Estado desconocido (informes viejos, celdas vacías) se trata como borrador. */
export function normalizarEstado(estado: string | undefined): EstadoInforme {
  return estado && estado in ESTILOS ? estado as EstadoInforme : 'borrador'
}

export default function EstadoInformeBadge({ estado }: { estado: string | undefined }) {
  const { etiqueta, clases, icono, ayuda } = ESTILOS[normalizarEstado(estado)]
  return (
    <span className={`badge text-[10px] inline-flex items-center gap-1 ${clases}`} title={ayuda}>
      <i className={`fa-solid ${icono}`} aria-hidden="true" />
      {etiqueta}
    </span>
  )
}
