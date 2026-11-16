import type { Metadata } from 'next'
import { METADATA_SIN_INDEXAR } from '@/lib/seo/sin-indexar'
import { CATEGORIAS_MICE, CONTACTO_OBSERVATORIO, GRUPOS_MICE, PRESENTACION_MICE } from '@/data/mice-ecosistema'
import { contarContactos } from '@/lib/mice/filtrar'
import DirectorioMice from '@/components/mice/DirectorioMice'

// URL impresa en el QR del programa de distinciones: NO mover esta ruta.
// Fuera de (main) a propósito: página liviana para celular, sin sidebar ni sesión.
export const metadata: Metadata = {
  ...METADATA_SIN_INDEXAR,
  title: PRESENTACION_MICE.titulo,
  description: PRESENTACION_MICE.bajada,
}

function Cifra({ valor, etiqueta }: { valor: number; etiqueta: string }) {
  return (
    <div className="card px-4 py-3 flex-1">
      <p className="text-2xl font-black text-primary leading-none">{valor}</p>
      <p className="text-xs text-text-secondary mt-1">{etiqueta}</p>
    </div>
  )
}

export default function EcosistemaMicePage() {
  return (
    <div id="inicio" className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <img src="/logos/secretaria.png" alt="Secretaría de Turismo y Desarrollo Económico" className="h-8 sm:h-10 w-auto" />
          <img src="/logos/observatorio.png" alt="Observatorio de Turismo Municipal" className="h-9 sm:h-12 w-auto" />
        </div>
      </header>

      <section className="bg-gradient-to-br from-primary/10 via-white to-accent/10 border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 pt-7 pb-6">
          <span className="badge bg-primary text-white">
            <i className="fa-solid fa-briefcase mr-1.5" aria-hidden="true" />
            Turismo de reuniones
          </span>
          <h1 className="section-title !text-2xl sm:!text-3xl !mb-4 mt-3 leading-tight">{PRESENTACION_MICE.titulo}</h1>
          <p className="text-text-secondary leading-relaxed">{PRESENTACION_MICE.bajada}</p>

          <div className="flex gap-3 mt-5">
            <Cifra valor={contarContactos(CATEGORIAS_MICE)} etiqueta="contactos" />
            <Cifra valor={CATEGORIAS_MICE.length} etiqueta="rubros" />
          </div>

          {PRESENTACION_MICE.enActualizacion && (
            <p className="mt-4 flex gap-2 text-sm text-text-secondary">
              <i className="fa-solid fa-circle-info text-accent mt-0.5" aria-hidden="true" />
              Estamos completando la información. Volvé a visitarlo en unos días.
            </p>
          )}
        </div>
      </section>

      <main className="max-w-3xl mx-auto px-4 pb-16">
        <DirectorioMice grupos={GRUPOS_MICE} categorias={CATEGORIAS_MICE} />
      </main>

      <a
        href="#inicio"
        aria-label="Volver arriba"
        className="fixed bottom-5 right-5 z-30 w-12 h-12 rounded-full bg-primary text-white shadow-lg flex items-center justify-center hover:bg-primary-hover"
      >
        <i className="fa-solid fa-arrow-up" aria-hidden="true" />
      </a>

      <footer className="border-t border-gray-100 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-8 text-center text-xs text-text-secondary">
          <div className="flex items-center justify-center gap-6 mb-4">
            <img src="/logos/marca-destino.png" alt="Catamarca Capital" className="h-10 w-auto" />
            <img src="/logos/observatorio.png" alt="Observatorio de Turismo Municipal" className="h-10 w-auto" />
          </div>
          {CONTACTO_OBSERVATORIO.area}
        </div>
      </footer>
    </div>
  )
}
