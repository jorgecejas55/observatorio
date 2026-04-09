import { ATRACTIVOS } from '@/lib/types'
import Badge from '@/components/ui/Badge'

export default function IngresosPage() {
  return (
    <div>
      <h2 className="section-title">Registro de Ingresos a Atractivos</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(ATRACTIVOS).map(([id, nombre]) => (
          <a
            key={id}
            href={`/ocio/ingresos/${id}`}
            className="card p-6 card-hover flex flex-col gap-3 group"
          >
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <i className="fa-solid fa-landmark text-orange-500" />
            </div>
            <div>
              <p className="font-semibold text-text-primary group-hover:text-primary transition-colors">
                {nombre}
              </p>
              <Badge color="orange">Atractivo</Badge>
            </div>
            <p className="text-xs text-text-secondary flex items-center gap-1 mt-auto">
              Registrar ingresos de hoy
              <i className="fa-solid fa-arrow-right text-primary" />
            </p>
          </a>
        ))}

        {/* Camping */}
        <a
          href="/ocio/camping"
          className="card p-6 card-hover flex flex-col gap-3 group"
        >
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <i className="fa-solid fa-campground text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-text-primary group-hover:text-primary transition-colors">
              Camping Municipal
            </p>
            <Badge color="green">Camping</Badge>
          </div>
          <p className="text-xs text-text-secondary flex items-center gap-1 mt-auto">
            Registrar ingresos de hoy
            <i className="fa-solid fa-arrow-right text-primary" />
          </p>
        </a>
      </div>
    </div>
  )
}
