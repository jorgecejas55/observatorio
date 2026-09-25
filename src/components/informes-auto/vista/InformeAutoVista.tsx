/**
 * Cuerpo del informe automático (pantalla + PDF de 3 páginas + portada).
 * Presentacional puro, sin hooks: lo usan la página de administración
 * (cliente) y la vista pública /informes/ver/[slug] (servidor).
 */

import SeccionIngresosAtractivos from '@/components/informes/SeccionIngresosAtractivos'
import type { InformeFindeCompleto } from '@/lib/informes-auto/types'
import { EncabezadoPaginaImpresion, EncabezadoPantalla, PortadaInforme } from './Encabezados'
import { KpisInforme, OhPorTipoAlojamiento, TablaComparativas } from './ResumenOcupacion'
import PerfilVisitante from './PerfilVisitante'
import { tituloInforme } from './etiquetas'

// El server de Vercel corre en UTC: la fecha de generación se muestra en hora argentina
const ZONA_HORARIA = 'America/Argentina/Catamarca'

function NotaMetodologica({ informe }: { informe: InformeFindeCompleto }) {
  const generado = new Date(informe.fechaGeneracion).toLocaleDateString('es-AR', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: ZONA_HORARIA,
  })
  return (
    <div className="bg-gray-50 rounded-xl p-6 text-xs text-text-secondary seccion-informe print:text-[10px]">
      <h3 className="font-bold text-text-primary mb-2 flex items-center gap-2">
        <i className="fa-solid fa-microscope text-text-secondary" />
        Nota Metodológica
      </h3>
      <ul className="space-y-1 list-disc list-inside">
        <li>
          Estadía promedio calculada sobre encuestas realizadas en los principales
          Atractivos turísticos de la ciudad ({informe.perfil.estadiaSinOutliers.nExcluidas} valores
          atípicos excluidos con umbral ±2.5σ).
        </li>
        <li>
          Cobertura del relevamiento de ocupación hotelera: {informe.relevamiento.cantidadRelevados} alojamientos.
        </li>
        <li>
          Ingresos a atractivos: registros cargados en el sistema del Observatorio (Casa de la Puna
          y Pueblo Perdido, incluidas sus actividades especiales) y en los registros de visitas de
          los museos municipales, filtrados por las fechas del período.
        </li>
        <li>
          Impacto económico estimado en base a estudios y relevamientos en campo realizados
          por el Observatorio de Turismo Municipal, considerando precios en servicios de
          alojamiento, gastronomía y comercios de productos regionales.
        </li>
        <li>Generado el {generado}.</li>
      </ul>
    </div>
  )
}

export default function InformeAutoVista({ informe }: { informe: InformeFindeCompleto }) {
  const titulo = tituloInforme(informe)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-8 print:shadow-none print:border-0 print:rounded-none print:p-0 print:m-0 print:max-w-none print:w-full">
      <PortadaInforme informe={informe} />

      <div className="pagina-1">
        <EncabezadoPaginaImpresion titulo={titulo} />
        <EncabezadoPantalla informe={informe} />
        <KpisInforme informe={informe} />
        <TablaComparativas informe={informe} />
        <OhPorTipoAlojamiento informe={informe} />
      </div>

      <div className="pagina-2">
        <EncabezadoPaginaImpresion titulo={titulo} />
        <PerfilVisitante perfil={informe.perfil} />
      </div>

      <div className="pagina-3">
        <EncabezadoPaginaImpresion titulo={titulo} />
        <SeccionIngresosAtractivos ingresos={informe.ingresosAtractivos} />
        <NotaMetodologica informe={informe} />
      </div>
    </div>
  )
}
