'use client'

import type { ResumenAtractivo } from '@/lib/types'

interface KpisAtractivoProps {
  resumen: ResumenAtractivo
}

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const formatearNumero = (n: number) => new Intl.NumberFormat('es-AR').format(n || 0)

export default function KpisAtractivo({ resumen }: KpisAtractivoProps) {
  const { hoy, mesEnCurso, totalAnio } = resumen
  const mesLabel = MESES[mesEnCurso.mes - 1] ?? ''

  // Promedio diario del año en curso: total del año / días transcurridos desde
  // el 1° de enero hasta hoy (mismo criterio que el promedio/día de museos).
  const diasTranscurridos = Math.floor(
    (new Date(hoy.fecha).getTime() - new Date(resumen.anio, 0, 1).getTime()) / 86400000,
  ) + 1
  const promedioDia = diasTranscurridos > 0 ? Math.round(totalAnio.personasTotal / diasTranscurridos) : 0

  const cards = [
    {
      label: 'Hoy',
      value: formatearNumero(hoy.personasTotal),
      sub: `${formatearNumero(hoy.personas)} visitas · ${formatearNumero(hoy.personasActividades)} actividades`,
      icon: 'fa-calendar-day',
      color: 'bg-orange-100 text-orange-500',
    },
    {
      label: `${mesLabel} · visitas`,
      value: formatearNumero(mesEnCurso.personas),
      sub: `${formatearNumero(mesEnCurso.ingresos)} ingresos`,
      icon: 'fa-users',
      color: 'bg-sky-100 text-sky-600',
    },
    {
      label: `${mesLabel} · actividades`,
      value: formatearNumero(mesEnCurso.personasActividades),
      sub: `${formatearNumero(mesEnCurso.actividades)} actividad(es)`,
      icon: 'fa-star',
      color: 'bg-purple-100 text-purple-600',
    },
    {
      label: `${resumen.anio} · total`,
      value: formatearNumero(totalAnio.personasTotal),
      sub: `${formatearNumero(totalAnio.personas)} visitas · ${formatearNumero(totalAnio.personasActividades)} actividades`,
      icon: 'fa-chart-line',
      color: 'bg-green-100 text-green-600',
    },
    {
      label: 'Promedio / día',
      value: formatearNumero(promedioDia),
      sub: `Sobre ${formatearNumero(diasTranscurridos)} días transcurridos de ${resumen.anio}`,
      icon: 'fa-calendar-week',
      color: 'bg-sky-100 text-sky-600',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center ${card.color}`}>
              <i className={`fa-solid ${card.icon} text-sm`} />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              {card.label}
            </p>
          </div>
          <p className="text-3xl font-bold text-text-primary">
            {card.value} <span className="text-sm font-medium text-text-secondary">personas</span>
          </p>
          <p className="text-xs text-text-secondary mt-1">{card.sub}</p>
        </div>
      ))}
    </div>
  )
}