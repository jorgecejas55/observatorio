import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

// ─── Input ────────────────────────────────────────────────────────────────────

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export function InputField({ label, error, className = '', ...props }: InputFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="label">
        {label}
        {props.required && <span className="text-primary ml-0.5">*</span>}
      </label>
      <input className={`input ${error ? 'border-red-400 focus:border-red-400 focus:ring-red-200' : ''} ${className}`} {...props} />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ─── Select ───────────────────────────────────────────────────────────────────

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  options: { value: string; label: string }[]
  error?: string
}

export function SelectField({ label, options, error, className = '', ...props }: SelectFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="label">
        {label}
        {props.required && <span className="text-primary ml-0.5">*</span>}
      </label>
      <select
        className={`input bg-white ${error ? 'border-red-400' : ''} ${className}`}
        {...props}
      >
        <option value="">— Seleccioná una opción —</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ─── Textarea ─────────────────────────────────────────────────────────────────

interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
}

export function TextareaField({ label, error, className = '', ...props }: TextareaFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="label">
        {label}
        {props.required && <span className="text-primary ml-0.5">*</span>}
      </label>
      <textarea
        className={`input resize-none ${error ? 'border-red-400' : ''} ${className}`}
        rows={3}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ─── Rating (escala 1-5) ──────────────────────────────────────────────────────

interface RatingFieldProps {
  label: string
  name: string
  value: number
  onChange: (value: number) => void
  required?: boolean
}

export function RatingField({ label, name, value, onChange, required }: RatingFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="label">
        {label}
        {required && <span className="text-primary ml-0.5">*</span>}
      </label>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`w-10 h-10 rounded-full font-bold text-sm border-2 transition-all duration-200 ${
              value >= n
                ? 'bg-primary border-primary text-white'
                : 'border-gray-300 text-gray-400 hover:border-primary hover:text-primary'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <input type="hidden" name={name} value={value} />
    </div>
  )
}
