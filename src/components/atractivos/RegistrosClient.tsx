'use client'

import { useState } from 'react'
import TablaRegistros from './TablaRegistros'
import type { AtractivoConIngresos } from '@/lib/atractivos-config'

type Pestaña = 'ingresos' | 'actividades'

interface Props {
  atractivo: AtractivoConIngresos
}

export default function RegistrosClient({ atractivo }: Props) {
  const [pestaña, setPestaña] = useState<Pestaña>('ingresos')

  const tabCls = (activa: boolean) =>
    `px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors touch-manipulation ${
      activa ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-text-secondary hover:border-primary/50'
    }`

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setPestaña('ingresos')} className={tabCls(pestaña === 'ingresos')}>
          <i className="fa-solid fa-arrow-right-to-bracket mr-1.5" /> Ingresos
        </button>
        <button type="button" onClick={() => setPestaña('actividades')} className={tabCls(pestaña === 'actividades')}>
          <i className="fa-solid fa-star mr-1.5" /> Actividades especiales
        </button>
      </div>

      {pestaña === 'ingresos' ? (
        <TablaRegistros atractivo={atractivo} tipo="ingreso" />
      ) : (
        <TablaRegistros atractivo={atractivo} tipo="actividad" />
      )}
    </div>
  )
}
