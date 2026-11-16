import type { CategoriaMice } from '@/data/mice-ecosistema'
import FilaContacto from './FilaContacto'

export default function SeccionCategoria({ categoria }: { categoria: CategoriaMice }) {
  const cantidad = categoria.contactos.length

  return (
    // scroll-mt: deja lugar para el buscador fijo al saltar desde el índice
    <section id={categoria.id} className="card scroll-mt-24">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50/60">
        <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 flex-shrink-0">
          <i className={`fa-solid ${categoria.icono} text-primary`} aria-hidden="true" />
        </span>
        <h3 className="flex-1 font-bold text-text-primary leading-tight">{categoria.titulo}</h3>
        {cantidad > 0 && <span className="badge bg-primary/10 text-primary">{cantidad}</span>}
      </header>

      {cantidad > 0 ? (
        <ul className="divide-y divide-gray-100">
          {categoria.contactos.map((contacto, indice) => (
            // El nombre se repite (ej. varias áreas del mismo ministerio): se suma el índice
            <FilaContacto key={`${contacto.nombre}-${indice}`} contacto={contacto} />
          ))}
        </ul>
      ) : (
        <p className="px-4 py-4 text-sm text-text-secondary italic">Información en carga.</p>
      )}
    </section>
  )
}
