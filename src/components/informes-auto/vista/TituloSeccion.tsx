/** Título de sección de los documentos del Observatorio: ícono de marca + texto. */
export default function TituloSeccion({ icono, children, className = 'mb-3' }: {
  icono: string
  children: React.ReactNode
  /** Margen inferior (por defecto mb-3) */
  className?: string
}) {
  return (
    <h3 className={`font-bold text-text-primary flex items-center gap-2 ${className}`}>
      <i className={`fa-solid ${icono} text-primary text-sm`} aria-hidden="true" />
      {children}
    </h3>
  )
}
