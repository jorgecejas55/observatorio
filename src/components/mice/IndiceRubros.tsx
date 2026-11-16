import type { CategoriaMice, GrupoMice } from '@/data/mice-ecosistema'

interface IndiceRubrosProps {
  grupos: { id: GrupoMice; titulo: string }[]
  categorias: CategoriaMice[]
}

export default function IndiceRubros({ grupos, categorias }: IndiceRubrosProps) {
  return (
    <nav aria-label="Rubros del directorio" className="flex flex-col gap-5">
      {grupos.map(grupo => (
        <div key={grupo.id}>
          <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">{grupo.titulo}</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {categorias.filter(categoria => categoria.grupo === grupo.id).map(categoria => (
              <a
                key={categoria.id}
                href={`#${categoria.id}`}
                className="card flex items-center gap-2.5 p-3 hover:border-primary/40 hover:shadow-md transition-all"
              >
                <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 flex-shrink-0">
                  <i className={`fa-solid ${categoria.icono} text-primary text-sm`} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-text-primary leading-tight">{categoria.titulo}</span>
                  <span className="block text-xs text-text-secondary mt-0.5">{categoria.contactos.length} contactos</span>
                </span>
              </a>
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
}
