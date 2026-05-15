'use client'

import { useState } from 'react'
import type { Informe } from '@/lib/types'
import InformeFila from './InformeFila'

type TabOcio = 'periodicos' | 'especiales'

interface Props {
  periodicos: Informe[]
  especiales: Informe[]
}

export default function InformesOcioTabs({ periodicos, especiales }: Props) {
  const [tab, setTab] = useState<TabOcio>('periodicos')

  const tabs: { id: TabOcio; label: string; icon: string; count: number }[] = [
    { id: 'periodicos', label: 'Informes Periódicos', icon: 'fa-chart-line', count: periodicos.length },
    { id: 'especiales', label: 'Informes Especiales', icon: 'fa-magnifying-glass-chart', count: especiales.length },
  ]

  const items = tab === 'periodicos' ? periodicos : especiales

  return (
    <>
      {/* Pestañas */}
      <div className="mb-6 flex gap-1 border-b border-gray-200 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`pb-3 px-4 text-sm font-medium transition-all border-b-2 -mb-px whitespace-nowrap flex-shrink-0 flex items-center gap-2 ${
              tab === t.id
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-text-secondary hover:text-orange-500'
            }`}
          >
            <i className={`fa-solid ${t.icon} text-xs`} />
            {t.label}
            {t.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                tab === t.id
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {items.length === 0 ? (
        <p className="text-sm text-text-secondary italic">
          No hay informes disponibles en esta sección aún.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map(i => (
            <InformeFila key={i.id} informe={i} />
          ))}
        </div>
      )}
    </>
  )
}
