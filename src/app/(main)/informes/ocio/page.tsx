import type { Informe } from '@/lib/types'
import { getInformes } from '@/lib/informes'
import InformesOcioTabs from '@/components/informes/InformesOcioTabs'

export default async function OcioPage() {
  const todos = await getInformes()
  const informes = todos.filter((i: Informe) => i.tipo === 'ocio')
  const periodicos = informes.filter(i => i.subcategoria === 'periodico')
  const especiales = informes.filter(i => i.subcategoria === 'especial')

  return (
    <div>
      <h2 className="section-title">Turismo de Ocio</h2>
      <p className="text-text-secondary text-sm mb-6">
        Informes periódicos y especiales del turismo de ocio en San Fernando del Valle de Catamarca.
      </p>

      <InformesOcioTabs periodicos={periodicos} especiales={especiales} />
    </div>
  )
}
