import { formatearRango } from '@/lib/formato-fechas'
import type { InformeFindeCompleto } from '@/lib/informes-auto/types'
import { etiquetasDe, tituloInforme } from './etiquetas'

/** Portada del PDF (solo impresión). */
export function PortadaInforme({ informe }: { informe: InformeFindeCompleto }) {
  return (
    <div className="portada-informe">
      {/* Fila superior de logos: Secretaría | Asociación (centrada) | Observatorio,
          alineados verticalmente por el centro */}
      <div className="grid grid-cols-3 items-center">
        <img
          src="/logos/secretaria.png"
          alt="Secretaría de Turismo y Desarrollo Económico"
          className="h-12 w-auto justify-self-start"
        />
        <img
          src="/logos/asociacion-hoteles.jpg"
          alt="Asociación de Hoteles, Bares, Confiterías, Restaurantes y Afines de Catamarca"
          className="h-24 w-auto justify-self-center"
        />
        <img
          src="/logos/observatorio.png"
          alt="Observatorio de Turismo Municipal"
          className="h-16 w-auto justify-self-end"
        />
      </div>

      {/* Bloque central: marca del destino + título */}
      <div className="text-center">
        <img
          src="/logos/marca-destino.png"
          alt="San Fernando del Valle de Catamarca"
          className="h-20 w-auto mx-auto mb-8"
        />
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-text-secondary mb-4">
          Informe Estadístico
        </p>
        <h1 className="text-4xl font-bold text-text-primary mb-3">
          {etiquetasDe(informe).portada}
        </h1>
        <h2 className="text-3xl font-bold text-primary mb-6">
          {informe.nombre}
        </h2>
        <div className="w-24 h-1 bg-primary mx-auto mb-6 rounded-full" />
        <p className="text-lg text-text-secondary">
          {formatearRango(informe.fechaInicio, informe.fechaFin)}
        </p>
      </div>

      {/* Pie institucional */}
      <div className="text-center text-sm text-text-secondary space-y-0.5">
        <p className="font-semibold text-text-primary">Observatorio de Turismo Municipal</p>
        <p>Secretaría de Turismo y Desarrollo Económico - Municipalidad de la Capital</p>
        <p>San Fernando del Valle de Catamarca</p>
      </div>
    </div>
  )
}

/** Encabezado reducido de cada página del PDF (solo visible en impresión). */
export function EncabezadoPaginaImpresion({ titulo }: { titulo: string }) {
  return (
    <div className="hidden print:flex items-center justify-between mb-4 pb-3 border-b border-gray-200 gap-3">
      <img src="/logos/secretaria.png" alt="Secretaría" className="h-6 w-auto" />
      <span className="text-xs font-semibold text-text-primary">{titulo}</span>
      <div className="flex items-center gap-2">
        <img src="/logos/marca-destino.png" alt="Marca Destino" className="h-7 w-auto" />
        <img src="/logos/observatorio.png" alt="Observatorio" className="h-7 w-auto" />
      </div>
    </div>
  )
}

/** Encabezado institucional en pantalla (en el PDF lo reemplazan portada + encabezados reducidos). */
export function EncabezadoPantalla({ informe }: { informe: InformeFindeCompleto }) {
  return (
    <div className="print:hidden flex items-center justify-between mb-8 pb-6 border-b-2 border-primary gap-4">
      {/* Logo Secretaría (proporción 6.9:1 → altura menor) */}
      <img
        src="/logos/secretaria.png"
        alt="Secretaría de Turismo y Desarrollo Económico"
        className="h-9 w-auto print:h-10 flex-shrink-0"
      />
      {/* Centro: título + fechas */}
      <div className="text-center flex-1">
        <h1 className="text-xl font-bold text-text-primary mb-1 print:text-2xl">
          {tituloInforme(informe)}
        </h1>
        <p className="text-text-secondary text-xs print:text-sm">
          {formatearRango(informe.fechaInicio, informe.fechaFin)}
        </p>
        <p className="text-text-secondary text-[10px] mt-0.5 print:text-xs">
          Observatorio de Turismo Municipal — San Fernando del Valle de Catamarca
        </p>
      </div>
      {/* Derecha: marca destino + logo observatorio */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <img
          src="/logos/marca-destino.png"
          alt="Marca del Destino"
          className="h-12 w-auto print:h-14"
        />
        <img
          src="/logos/observatorio.png"
          alt="Observatorio de Turismo Municipal"
          className="h-12 w-auto print:h-14"
        />
      </div>
    </div>
  )
}
