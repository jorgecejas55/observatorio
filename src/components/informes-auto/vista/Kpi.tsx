/** Cifra destacada con ícono (informes automáticos y ficha técnica OH). */
export default function Kpi({ titulo, valor, icono, chico = false, nota }: {
  titulo: string
  valor: string
  icono: string
  chico?: boolean
  /** Aclaración debajo de la cifra (p. ej. "45 de 60 activos") */
  nota?: string
}) {
  return (
    <div className="bg-primary/5 rounded-xl p-4 print:p-3 text-center print:border print:border-gray-200">
      <p className="text-xs text-text-secondary mb-1 flex items-center justify-center gap-1.5">
        <i className={`fa-solid ${icono} text-secondary`} aria-hidden="true" />
        {titulo}
      </p>
      <p className={`${chico ? 'text-base sm:text-2xl' : 'text-2xl sm:text-3xl'} font-bold text-primary whitespace-nowrap`}>{valor}</p>
      {nota && <p className="text-[10px] text-text-secondary mt-0.5">{nota}</p>}
    </div>
  )
}
