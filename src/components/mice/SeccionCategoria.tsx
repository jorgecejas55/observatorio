import type { CategoriaMice } from '@/data/mice-ecosistema'
import TarjetaContacto from './TarjetaContacto'

export default function SeccionCategoria({ categoria }: { categoria: CategoriaMice }) {
  const tieneContactos = categoria.contactos.length > 0

  return (
    <section id={categoria.id} className="scroll-mt-4">
      <h3 className="flex items-center gap-2 text-base font-bold text-text-primary mb-3">
        <i className={`fa-solid ${categoria.icono} text-primary`} aria-hidden="true" />
        {categoria.titulo}
        {tieneContactos && <span className="text-xs font-normal text-text-secondary">({categoria.contactos.length})</span>}
      </h3>

      {tieneContactos ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {categoria.contactos.map((contacto, indice) => (
            // El nombre se repite (ej. varias áreas del mismo ministerio): se suma el índice
            <TarjetaContacto key={`${contacto.nombre}-${indice}`} contacto={contacto} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-text-secondary italic">Información en carga.</p>
      )}
    </section>
  )
}
