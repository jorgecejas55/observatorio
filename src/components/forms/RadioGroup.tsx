'use client'

/**
 * Grupo de radio buttons con diseño de cards seleccionables.
 * Soporta 1, 2 o 3 columnas (responsive: 1 col en mobile).
 * Extraído de ocio/encuesta — reutilizable en todos los formularios.
 */
export function RadioGroup({ name, options, value, onChange, cols = 1 }: {
  name: string
  options: string[]
  value: string
  onChange: (v: string) => void
  cols?: 1 | 2 | 3
}) {
  const gridClass = cols === 3
    ? 'grid-cols-1 sm:grid-cols-3'
    : cols === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : 'grid-cols-1'

  return (
    <div className={`grid ${gridClass} gap-2`}>
      {options.map(op => (
        <label
          key={op}
          className={`flex items-center gap-2.5 cursor-pointer rounded-xl border-2 px-4 py-2.5 text-sm transition-all select-none
            ${value === op
              ? 'border-primary bg-primary/5 font-semibold text-primary'
              : 'border-gray-200 bg-white text-text-primary hover:border-primary/40'
            }`}
        >
          <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center
            ${value === op ? 'border-primary' : 'border-gray-300'}`}>
            {value === op && <span className="w-2 h-2 rounded-full bg-primary" />}
          </span>
          <input type="radio" name={name} value={op} checked={value === op}
            onChange={() => onChange(op)} className="sr-only" />
          {op}
        </label>
      ))}
    </div>
  )
}
