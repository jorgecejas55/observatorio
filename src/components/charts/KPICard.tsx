interface KPICardProps {
  titulo: string
  valor: string | number
  unidad?: string
  variacion?: number // % positivo o negativo
  icono: string
  color?: string
}

export default function KPICard({
  titulo,
  valor,
  unidad,
  variacion,
  icono,
  color = 'text-primary',
}: KPICardProps) {
  const variacionPositiva = variacion !== undefined && variacion >= 0

  return (
    <div className="card p-6 card-hover">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center ${color}`}>
          <i className={`fa-solid ${icono} text-xl`} />
        </div>
        {variacion !== undefined && (
          <span
            className={`badge ${variacionPositiva ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}
          >
            <i className={`fa-solid fa-arrow-${variacionPositiva ? 'up' : 'down'} text-[10px] mr-1`} />
            {Math.abs(variacion)}%
          </span>
        )}
      </div>
      <p className="text-text-secondary text-sm mb-1">{titulo}</p>
      <p className="text-3xl font-bold text-text-primary">
        {typeof valor === 'number' ? valor.toLocaleString('es-AR') : valor}
        {unidad && <span className="text-base font-normal text-text-secondary ml-1">{unidad}</span>}
      </p>
    </div>
  )
}
