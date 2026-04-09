'use client'

import { useState, useRef, useEffect } from 'react'

interface ComboboxFieldProps {
  label: string
  options: string[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  error?: string
}

/**
 * Campo de búsqueda con autocompletado.
 * Solo permite seleccionar valores de la lista — no acepta texto libre.
 * Al perder el foco sin haber seleccionado, revierte al último valor válido.
 */
export function ComboboxField({
  label, options, value, onChange, placeholder, required, error,
}: ComboboxFieldProps) {
  const [inputText, setInputText] = useState(value)
  const [open, setOpen]           = useState(false)
  const containerRef              = useRef<HTMLDivElement>(null)

  // Lista filtrada según lo que escribe el usuario
  const filtered = inputText.trim() === ''
    ? options
    : options.filter(o => o.toLowerCase().includes(inputText.toLowerCase()))

  // Sincronizar el texto visible cuando el valor cambia externamente (reset del form)
  useEffect(() => { setInputText(value) }, [value])

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        // Si el texto no coincide con ninguna opción, revertir al valor guardado
        if (!options.includes(inputText)) setInputText(value)
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [inputText, options, value])

  function handleSelect(option: string) {
    onChange(option)
    setInputText(option)
    setOpen(false)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputText(e.target.value)
    setOpen(true)
    if (e.target.value === '') onChange('')
  }

  function handleBlur() {
    // Timeout para que el click en una opción se registre antes del blur
    setTimeout(() => {
      if (!options.includes(inputText)) {
        setInputText(value)
      }
      setOpen(false)
    }, 150)
  }

  return (
    <div className="flex flex-col gap-1" ref={containerRef}>
      <label className="label">
        {label}{required && <span className="text-primary ml-0.5">*</span>}
      </label>

      <div className="relative">
        <input
          type="text"
          value={inputText}
          onChange={handleChange}
          onFocus={() => setOpen(true)}
          onBlur={handleBlur}
          placeholder={placeholder ?? 'Escribí para buscar…'}
          autoComplete="off"
          className={`input pr-8 ${error ? 'border-red-400 focus:border-red-400 focus:ring-red-200' : ''}`}
        />
        <i className={`fa-solid fa-chevron-${open ? 'up' : 'down'} absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none`} />

        {open && filtered.length > 0 && (
          <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
            {filtered.map(option => (
              <li
                key={option}
                onMouseDown={() => handleSelect(option)}
                className={`px-4 py-2.5 text-sm cursor-pointer transition-colors
                  ${value === option
                    ? 'bg-primary/5 text-primary font-semibold'
                    : 'text-text-primary hover:bg-gray-50 hover:text-primary'
                  }`}
              >
                {option}
              </li>
            ))}
          </ul>
        )}

        {open && filtered.length === 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm text-text-secondary">
            No se encontró ningún resultado.
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1" data-error>
          <i className="fa-solid fa-triangle-exclamation text-[10px]" />{error}
        </p>
      )}
    </div>
  )
}
