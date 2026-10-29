import type { RelevamientoOH } from '@/lib/informes-auto/types'

export type EstadoFuente = 'ok' | 'falta' | 'aviso' | 'cargando' | 'info'

const ICONOS: Record<EstadoFuente, string> = {
  ok: 'fa-circle-check text-green-600',
  falta: 'fa-circle-xmark text-red-500',
  aviso: 'fa-triangle-exclamation text-amber-500',
  cargando: 'fa-spinner fa-spin text-text-secondary',
  info: 'fa-circle-info text-accent',
}

export function ItemFuente({ estado, texto, children }: {
  estado: EstadoFuente
  texto: string
  children?: React.ReactNode
}) {
  return (
    <li className="flex items-start gap-2">
      <i className={`fa-solid ${ICONOS[estado]} mt-0.5`} aria-hidden="true" />
      <span>
        {texto}
        {children}
      </span>
    </li>
  )
}

interface Props {
  relevamiento: RelevamientoOH
  datosBase: { nEncuestas: number } | null
  cargandoDatosBase: boolean
  /** Ítems extra según el tipo (p. ej. canales digitales del mes en MENSUAL). */
  children?: React.ReactNode
}

function estadoPerfil(datosBase: Props['datosBase'], cargando: boolean): [EstadoFuente, string] {
  if (cargando) return ['cargando', 'Encuestas de perfil del visitante: consultando…']
  if (!datosBase) return ['aviso', 'Encuestas de perfil del visitante: no se pudieron consultar']
  if (datosBase.nEncuestas === 0) return ['falta', 'Encuestas de perfil del visitante: ninguna en el período']
  return ['ok', `Encuestas de perfil del visitante: ${datosBase.nEncuestas.toLocaleString('es-AR')}`]
}

/** Qué fuentes del período están listas antes de calcular. */
export default function ChecklistFuentes({ relevamiento, datosBase, cargandoDatosBase, children }: Props) {
  const cerrado = relevamiento.estado === 'CERRADO'
  const [estadoEncuestas, textoEncuestas] = estadoPerfil(datosBase, cargandoDatosBase)

  return (
    <div className="mt-4 p-4 rounded-lg bg-gray-50 border border-gray-200">
      <p className="text-xs font-semibold text-text-primary mb-2">Fuentes del período</p>
      <ul className="space-y-1.5 text-xs text-text-secondary">
        <ItemFuente
          estado={cerrado ? 'ok' : 'aviso'}
          texto={cerrado ? 'Ocupación hotelera: relevamiento cerrado' : 'Ocupación hotelera: relevamiento EN CURSO (datos no finales)'}
        />
        <ItemFuente estado={estadoEncuestas} texto={textoEncuestas} />
        <ItemFuente estado="info" texto="Ingresos a atractivos y museos: se consultan al calcular" />
        {children}
      </ul>
    </div>
  )
}
