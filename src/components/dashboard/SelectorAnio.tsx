'use client'

interface Props {
  anios: number[]
  anio: number | null
  onChange: (anio: number) => void
}

/** Chips de año (más reciente primero) para paginar una tabla. */
export default function SelectorAnio({ anios, anio, onChange }: Props) {
  if (anios.length === 0) return null

  return (
    <div role="group" aria-label="Elegir año" className="flex flex-wrap gap-1.5">
      {anios.map(a => (
        <button
          key={a}
          type="button"
          onClick={() => onChange(a)}
          aria-pressed={a === anio}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
            a === anio
              ? 'bg-primary text-white border-primary'
              : 'bg-white text-text-secondary border-gray-200 hover:border-primary/40 hover:text-primary'
          }`}
        >
          {a}
        </button>
      ))}
    </div>
  )
}
