import type { Metadata } from 'next'
import { METADATA_SIN_INDEXAR } from '@/lib/seo/sin-indexar'
import { CATEGORIAS_MICE, CONTACTO_OBSERVATORIO, GRUPOS_MICE, PRESENTACION_MICE } from '@/data/mice-ecosistema'
import SeccionCategoria from '@/components/mice/SeccionCategoria'

// URL impresa en el QR del programa de distinciones: NO mover esta ruta.
// Fuera de (main) a propósito: página liviana para celular, sin sidebar ni sesión.
export const metadata: Metadata = {
  ...METADATA_SIN_INDEXAR,
  title: PRESENTACION_MICE.titulo,
  description: PRESENTACION_MICE.bajada,
}

export default function EcosistemaMicePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <img src="/logos/secretaria.png" alt="Secretaría de Turismo y Desarrollo Económico" className="h-10 w-auto" />
          <img src="/logos/observatorio.png" alt="Observatorio de Turismo Municipal" className="h-12 w-auto" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Turismo de reuniones · MICE</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mt-1">{PRESENTACION_MICE.titulo}</h1>
        <p className="text-text-secondary mt-3">{PRESENTACION_MICE.bajada}</p>

        {PRESENTACION_MICE.enActualizacion && (
          <p className="mt-4 rounded-xl bg-accent/10 text-sm text-text-primary px-4 py-3">
            <i className="fa-solid fa-circle-info text-accent mr-2" aria-hidden="true" />
            Estamos completando la información de este directorio. Volvé a visitarlo en unos días.
          </p>
        )}

        <nav aria-label="Categorías" className="mt-6 flex flex-wrap gap-2">
          {CATEGORIAS_MICE.map(categoria => (
            <a
              key={categoria.id}
              href={`#${categoria.id}`}
              className="rounded-full bg-white border border-gray-200 px-3 py-1.5 text-xs font-medium text-text-primary hover:border-primary hover:text-primary"
            >
              {categoria.titulo}
            </a>
          ))}
        </nav>

        <div className="mt-8 flex flex-col gap-12">
          {GRUPOS_MICE.map(grupo => (
            <div key={grupo.id}>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary border-b border-gray-200 pb-2 mb-5">
                {grupo.titulo}
              </h2>
              <div className="flex flex-col gap-8">
                {CATEGORIAS_MICE.filter(categoria => categoria.grupo === grupo.id).map(categoria => (
                  <SeccionCategoria key={categoria.id} categoria={categoria} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-gray-100 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-6 text-center text-xs text-text-secondary">
          <img src="/logos/marca-destino.png" alt="Catamarca Capital" className="h-10 w-auto mx-auto mb-3" />
          {CONTACTO_OBSERVATORIO.area}
        </div>
      </footer>
    </div>
  )
}
