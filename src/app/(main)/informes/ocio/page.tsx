import type { Informe } from '@/lib/types'
import { getInformes } from '@/lib/informes'
import { getInformesAutoPublicados, tipoDesdeSlug } from '@/lib/informes-auto/publicos'
import { unificarInformesOcio, type InformeAutoPublico } from '@/lib/informes-ocio-unificar'
import InformesOcioTabs from '@/components/informes/InformesOcioTabs'

/** Informes automáticos publicados; si el GAS falla, la página sigue con los PDF manuales. */
async function getAutosPublicados(): Promise<InformeAutoPublico[]> {
  try {
    const metas = await getInformesAutoPublicados()
    return metas.map(m => ({
      id: m.id,
      slug: m.slug,
      nombre: m.nombre,
      tipo: tipoDesdeSlug(m.slug),
      fechaInicio: String(m.fechaInicio).slice(0, 10),
      fechaFin: String(m.fechaFin).slice(0, 10),
      fechaGeneracion: String(m.fechaGeneracion),
    }))
  } catch (error) {
    console.error('[informes/ocio] No se pudieron leer los informes automáticos:', error)
    return []
  }
}

export default async function OcioPage() {
  const [todos, autos] = await Promise.all([getInformes(), getAutosPublicados()])
  const informes = unificarInformesOcio(todos.filter((i: Informe) => i.tipo === 'ocio'), autos)
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
