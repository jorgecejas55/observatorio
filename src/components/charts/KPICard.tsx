interface KPICardProps {
  titulo: string
  valor: string | number
  unidad?: string
  variacion?: number | null // % positivo o negativo (null/undefined = sin comparación)
  variacionSufijo?: string // por defecto '%'; p. ej. ' pp' o ' pts'
  variacionInvertida?: boolean // true si subir es malo (se pinta en rojo)
  variacionTitulo?: string // texto del tooltip del badge
  icono: string
  color?: string
  subtitulo?: string
}

export default function KPICard({
  titulo,
  valor,
  unidad,
  variacion,
  variacionSufijo = '%',
  variacionInvertida = false,
  variacionTitulo,
  icono,
  color = 'text-primary',
  subtitulo,
}: KPICardProps) {
  const hayVariacion = variacion !== undefined && variacion !== null
  const variacionPositiva = hayVariacion && variacion >= 0
  const variacionBuena = variacionInvertida ? !variacionPositiva : variacionPositiva

  return (
    <div className="card p-6 card-hover">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center ${color}`}>
          <i className={`${icono.includes(' ') ? '' : 'fa-solid '}${icono} text-xl`} />
        </div>
        {hayVariacion && (
          <span
            className={`badge ${
              variacion === 0
                ? 'bg-gray-100 text-gray-600'
                : variacionBuena ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
            }`}
            title={variacionTitulo}
          >
            {variacion !== 0 && (
              <i className={`fa-solid fa-arrow-${variacionPositiva ? 'up' : 'down'} text-[10px] mr-1`} />
            )}
            {Math.abs(variacion).toLocaleString('es-AR')}{variacionSufijo}
          </span>
        )}
      </div>
      <p className="text-text-secondary text-sm mb-1">{titulo}</p>
      <p className="text-3xl font-bold text-text-primary">
        {typeof valor === 'number' ? valor.toLocaleString('es-AR') : valor}
        {unidad && <span className="text-base font-normal text-text-secondary ml-1">{unidad}</span>}
      </p>
      {subtitulo && (
        <p className="text-xs text-text-secondary mt-1 flex items-center gap-1">
          <i className="fa-solid fa-calendar-day text-[10px] opacity-60" />
          {subtitulo}
        </p>
      )}
    </div>
  )
}
