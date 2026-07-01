'use client'

/**
 * Grupo de checkboxes con diseño de cards seleccionables.
 * Soporta labels y hints personalizados por opción.
 * 2 columnas en desktop, 1 en mobile.
 * Extraído de ocio/encuesta — reutilizable en todos los formularios.
 */
export function CheckboxGroup({ options, selected, onChange, labels, hints }: {
  options: string[]
  selected: string[]
  onChange: (v: string[]) => void
  labels?: Record<string, string>
  hints?: Record<string, string>
}) {
  const toggle = (op: string) => {
    onChange(selected.includes(op) ? selected.filter(x => x !== op) : [...selected, op])
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {options.map(op => {
        const checked = selected.includes(op)
        const displayLabel = labels?.[op] ?? op
        const hint = hints?.[op]
        return (
          <label
            key={op}
            className={`flex items-start gap-2.5 cursor-pointer rounded-xl border-2 px-4 py-2.5 text-sm transition-all select-none
              ${checked
                ? 'border-primary bg-primary/5 font-semibold text-primary'
                : 'border-gray-200 bg-white text-text-primary hover:border-primary/40'
              }`}
          >
            <span className={`w-4 h-4 mt-0.5 rounded-lg border-2 flex-shrink-0 flex items-center justify-center
              ${checked ? 'border-primary bg-primary' : 'border-gray-300 bg-white'}`}>
              {checked && <i className="fa-solid fa-check text-white text-[10px]" />}
            </span>
            <input type="checkbox" value={op} checked={checked}
              onChange={() => toggle(op)} className="sr-only" />
            <span className="flex flex-col">
              <span>{displayLabel}</span>
              {hint && <span className="text-xs font-normal text-text-secondary mt-0.5">{hint}</span>}
            </span>
          </label>
        )
      })}
    </div>
  )
}
