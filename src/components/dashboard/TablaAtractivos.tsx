'use client'

import type { IndicadorAtractivo } from '@/lib/indicadores/types'
import TarjetaTabla from './TarjetaTabla'
import { useTablaPorAnio } from './useTablaPorAnio'

type ColumnaAtractivo = 'casa_puna' | 'pueblo_perdido' | 'casa_sfvc' | 'casa_caravati' | 'museo_virgen' | 'museo_quiroga'

const COLUMNAS: { clave: ColumnaAtractivo; titulo: string }[] = [
  { clave: 'casa_puna', titulo: 'Casa de la Puna' },
  { clave: 'pueblo_perdido', titulo: 'Pueblo Perdido' },
  { clave: 'casa_sfvc', titulo: 'Casa SFVC' },
  { clave: 'casa_caravati', titulo: 'Casa Caravati' },
  { clave: 'museo_virgen', titulo: 'Museo Virgen' },
  { clave: 'museo_quiroga', titulo: 'Museo A.Q.' },
]

function EtiquetaEstado({ item }: { item: IndicadorAtractivo }) {
  if (item.incompleto) {
    return <span className="badge text-[10px] bg-red-100 text-red-700 ml-2" title="Alguna fuente no respondió; recargá más tarde">incompleto</span>
  }
  if (item.parcial) {
    return <span className="badge text-[10px] bg-amber-100 text-amber-700 ml-2" title="Mes en curso">parcial</span>
  }
  return null
}

export default function TablaAtractivos({ historico }: { historico: IndicadorAtractivo[] }) {
  const { anio, setAnio, anios, filas } = useTablaPorAnio(historico)
  // Casa SFVC no tiene registro digital: se oculta en los años sin ningún dato
  const columnas = COLUMNAS.filter(c => filas.some(f => f[c.clave] !== null))
  const hayEnVivo = filas.some(f => f.origen === 'vivo')
  const primerMesEnVivo = historico.find(f => f.origen === 'vivo')

  return (
    <TarjetaTabla
      titulo="Datos Mensuales de Atractivos"
      anios={anios}
      anio={anio}
      onCambiarAnio={setAnio}
      encabezados={['Período', ...columnas.map(c => c.titulo)]}
      pie={hayEnVivo && primerMesEnVivo
        ? `Desde ${primerMesEnVivo.mes.toLowerCase()} de ${primerMesEnVivo.ano} los totales se calculan automáticamente a partir de los registros de ingresos (incluye actividades especiales) y de visitas a museos.`
        : undefined}
    >
      {filas.map(item => (
        <tr key={`${item.ano}-${item.mes}`} className="border-b border-gray-100 hover:bg-gray-50">
          <td className="px-3 py-3 font-medium whitespace-nowrap">
            {item.mes} {item.ano}
            <EtiquetaEstado item={item} />
          </td>
          {columnas.map(c => (
            <td key={c.clave} className="px-2 py-3">
              {item[c.clave] === null ? '—' : item[c.clave]!.toLocaleString('es-AR')}
            </td>
          ))}
        </tr>
      ))}
    </TarjetaTabla>
  )
}
