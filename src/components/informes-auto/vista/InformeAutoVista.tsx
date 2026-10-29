/**
 * Cuerpo del informe automático (pantalla + PDF: portada + 3 páginas, o 4 en
 * los MENSUAL con canales digitales).
 * Presentacional puro, sin hooks: lo usan la página de administración
 * (cliente) y la vista pública /informes/ver/[slug] (servidor).
 */

import SeccionIngresosAtractivos from '@/components/informes/SeccionIngresosAtractivos'
import type { InformeFindeCompleto } from '@/lib/informes-auto/types'
import { EncabezadoPaginaImpresion, EncabezadoPantalla, PortadaInforme } from './Encabezados'
import { KpisInforme, OhPorTipoAlojamiento, TablaComparativas } from './ResumenOcupacion'
import CanalesDigitales from './CanalesDigitales'
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
          Estadía promedio calculada sobre encuestas de perfil del visitante realizadas en los
          principales atractivos turísticos de la ciudad.
        </li>
        <li>
          Cobertura del relevamiento de ocupación hotelera: {informe.relevamiento.cantidadRelevados} alojamientos.
          Relevamiento conjunto con la Asociación Civil de Empresarios Hoteleros y Gastronómicos de la
          provincia de Catamarca.
        </li>
        <li>
          Ingresos a atractivos: registros cargados en el sistema del Observatorio (Casa de la Puna
          y Pueblo Perdido, incluidas sus actividades especiales) y en los registros de visitas de
          los museos municipales, filtrados por las fechas del período.
        </li>
        {informe.canalesDigitales && (
          // TODO(clean): nombres de fuentes a confirmar por Jorge (plan §3.5)
          <li>
            Canales digitales: sitio web según las estadísticas de visitas del sitio; Instagram y
            Facebook según las estadísticas de Meta Business Suite, cargadas mensualmente por el
            Observatorio; Catu según los registros de conversaciones del asistente virtual.
          </li>
        )}
        <li>
          Impacto económico estimado en base a estudios y relevamientos en campo realizados
          por el Observatorio de Turismo Municipal, considerando precios en servicios de
          alojamiento, gastronomía y comercios de productos regionales.
        </li>
        {/* toLocaleString termina en "a. m."/"p. m.": no se agrega otro punto */}
        <li>Generado el {generado}{generado.endsWith('.') ? '' : '.'}</li>
      </ul>
    </div>
  )
}

export default function InformeAutoVista({ informe }: { informe: InformeFindeCompleto }) {
  const titulo = tituloInforme(informe)
  // Solo MENSUAL (web/redes se cargan por mes); ausente en informes viejos
  const canales = informe.tipoInforme === 'MENSUAL' ? informe.canalesDigitales : undefined

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-8 mb-8 print:shadow-none print:border-0 print:rounded-none print:p-0 print:m-0 print:max-w-none print:w-full">
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
        {!canales && <NotaMetodologica informe={informe} />}
      </div>

      {canales && (
        <div className="pagina-4">
          <EncabezadoPaginaImpresion titulo={titulo} />
          <CanalesDigitales canales={canales} />
          <NotaMetodologica informe={informe} />
        </div>
      )}
    </div>
  )
}
