import Link from 'next/link'

export default function InformesLandingPage() {
  return (
    <div>
      <h2 className="section-title">Informes Técnicos</h2>
      <p className="text-text-secondary text-sm mb-6">
        Informes periódicos y especiales del turismo en el destino, elaborados por el Observatorio
        Municipal de Turismo.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/informes/ocio"
          className="card card-hover p-8 group border-t-4 border-t-orange-500"
        >
          <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <i className="fa-solid fa-umbrella-beach text-orange-500 text-xl" />
          </div>
          <h3 className="text-lg font-bold text-text-primary mb-2">Turismo de Ocio</h3>
          <p className="text-sm text-text-secondary mb-3">
            Informes periódicos y especiales del turismo de ocio en el destino
          </p>
          <p className="text-xs text-text-secondary/70">
            Mensuales · Trimestrales · Fines de semana largos · Temáticos
          </p>
        </Link>

        <Link
          href="/informes/mice"
          className="card card-hover p-8 group border-t-4 border-t-purple-500"
        >
          <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <i className="fa-solid fa-calendar-star text-purple-500 text-xl" />
          </div>
          <h3 className="text-lg font-bold text-text-primary mb-2">Turismo MICE</h3>
          <p className="text-sm text-text-secondary mb-3">
            Informes trimestrales del turismo de eventos y reuniones
          </p>
          <p className="text-xs text-text-secondary/70">Trimestrales</p>
        </Link>
      </div>
    </div>
  )
}
