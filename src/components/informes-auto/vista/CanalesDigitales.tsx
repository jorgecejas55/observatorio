/**
 * Página 4 del informe MENSUAL: un panel por canal (sitio web, Catu,
 * Instagram, Facebook) con sus cifras, evolución y rankings agrupados.
 * Presentacional, sin hooks (lo usan la vista admin y la pública).
 */

import type { CanalesDigitalesInforme } from '@/lib/informes-auto/types'
import { PanelCatu, PanelRedSocial, PanelWeb } from './PanelesCanales'

export default function CanalesDigitales({ canales }: { canales: CanalesDigitalesInforme }) {
  const { anio } = canales.periodo
  const { web, instagram, facebook, catu } = canales
  return (
    <div className="mb-8 print:mb-4">
      <h3 className="font-bold text-text-primary mb-4 print:mb-3 flex items-center gap-2">
        <i className="fa-solid fa-mobile-screen text-primary text-sm" />
        Canales Digitales
      </h3>

      {/* Fila 1: canales propios · fila 2: redes, lado a lado para compararlas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 print:grid-cols-2 gap-4 print:gap-3">
        {web && <PanelWeb web={web} anio={anio} />}
        {catu && <PanelCatu catu={catu} anio={anio} />}
        {instagram && <PanelRedSocial red={instagram} icono="fa-brands fa-instagram" titulo="Instagram" />}
        {facebook && <PanelRedSocial red={facebook} icono="fa-brands fa-facebook" titulo="Facebook" />}
      </div>

      <p className="mt-3 text-[10px] text-text-secondary leading-snug">
        <strong>Tasa de interacción:</strong> interacciones con el contenido del mes cada 100 seguidores
        (una misma cuenta puede interactuar varias veces y se incluyen interacciones de cuentas que no
        siguen la página). <strong>Interacciones por publicación:</strong> respuesta promedio que
        obtuvo cada publicación. En los gráficos de barras, el mes del informe se destaca en color pleno.
      </p>
    </div>
  )
}
