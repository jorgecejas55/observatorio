import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'secondary' | 'ghost'
  loading?: boolean
}

export default function Button({
  variant = 'primary',
  loading = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const base = `btn-${variant}`

  return (
    <button
      className={`${base} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <i className="fa-solid fa-spinner fa-spin" />}
      {children}
    </button>
  )
}
