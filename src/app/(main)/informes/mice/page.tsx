import type { Informe } from '@/lib/types'
import { getInformes } from '@/lib/informes'
import InformeFila from '@/components/informes/InformeFila'

export default async function MicePage() {
  const todos = await getInformes()
  const informes = todos.filter((i: Informe) => i.tipo === 'mice')

  return (
    <div>
      <h2 className="section-title">Turismo MICE</h2>
      <p className="text-text-secondary text-sm mb-6">
        Informes trimestrales del turismo de eventos y reuniones en San Fernando del Valle de
        Catamarca.
      </p>

      <section>
        <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2">
          <i className="fa-solid fa-calendar-star text-purple-500" />
          Informes Trimestrales
        </h3>

        {informes.length === 0 ? (
          <p className="text-sm text-text-secondary italic">
            No hay informes disponibles en esta sección aún.
          </p>
        ) : (
          <div className="space-y-3">
            {informes.map(i => (
              <InformeFila key={i.id} informe={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
