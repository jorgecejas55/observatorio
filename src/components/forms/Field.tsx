'use client'

/**
 * Envuelve un campo de formulario con label, hint opcional y mensaje de error.
 * El `data-error` en el mensaje de error permite auto-scroll al primer error.
 * Extraído de ocio/encuesta — reutilizable en todos los formularios del sistema.
 */
export function Field({ label, required, error, hint, children }: {
  label: string
  required?: boolean
  error?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="label">
        {label}{required && <span className="text-primary ml-0.5">*</span>}
      </label>
      {hint && <p className="text-xs text-text-secondary -mt-0.5 mb-0.5">{hint}</p>}
      {children}
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1" data-error>
          <i className="fa-solid fa-triangle-exclamation text-[10px]" />{error}
        </p>
      )}
    </div>
  )
}
