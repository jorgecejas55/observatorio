import {
  RESPUESTA_FAVORABLE,
  porcentajeDe,
  porcentajeSobreRespondentes,
  totalRespuestas,
  type RespuestaSiNo,
} from '@/lib/indicadores-perfil'
import { formatearPorcentaje } from '@/lib/formato-numeros'
import { etiquetaPerfil, unirVariantes } from '@/lib/informes-auto/etiquetas-perfil'
import { iconoPerfil, type CategoriaPerfil } from '@/lib/informes-auto/iconos-perfil'
import type { DatosPerfilVisitante } from '@/lib/informes-auto/types'

const pct = (valor: number) => formatearPorcentaje(valor, 0)

type Item = { nombre: string; cantidad: number }

function IconoRespuesta({ categoria, respuesta }: { categoria?: CategoriaPerfil; respuesta: string }) {
  const icono = categoria && iconoPerfil(categoria, respuesta)
  if (!icono) return null
  return <i className={`fa-solid ${icono} text-secondary text-[12px] w-4 text-center flex-shrink-0`} aria-hidden="true" />
}

/** Top 5 de una pregunta, con % sobre quienes la contestaron. */
function BarrasTop5({ titulo, items, colorBarra, categoria, nombrePropio = false }: {
  titulo: string
  items: Item[]
  colorBarra: string
  categoria?: CategoriaPerfil
  nombrePropio?: boolean
}) {
  const unidos = unirVariantes(items)
  const total = totalRespuestas(unidos)
  return (
    <div>
      <p className="text-xs font-semibold text-text-secondary mb-2">{titulo}</p>
      {unidos.slice(0, 5).map(item => (
        <div key={item.nombre} className="flex items-center gap-2 mb-1 text-xs">
          <span className="w-32 print:w-40 flex items-center gap-1 text-text-secondary leading-tight">
            <IconoRespuesta categoria={categoria} respuesta={item.nombre} />
            {etiquetaPerfil(item.nombre, nombrePropio)}
          </span>
          <div className="flex-1 bg-gray-200 rounded-full h-3.5">
            <div
              className={`${colorBarra} h-3 rounded-full`}
              style={{ width: `${porcentajeDe(item.cantidad, total)}%` }}
            />
          </div>
          <span className="w-12 text-right text-text-primary font-semibold">
            {pct(porcentajeDe(item.cantidad, total))}
          </span>
        </div>
      ))}
    </div>
  )
}

function Procedencia({ perfil }: { perfil: DatosPerfilVisitante }) {
  const cajas = [
    { clave: 'NACIONAL', etiqueta: 'Nacional', color: 'blue' },
    { clave: 'PROVINCIAL', etiqueta: 'Provincial', color: 'green' },
    { clave: 'INTERNACIONAL', etiqueta: 'Internacional', color: 'purple' },
  ] as const
  // Clases completas (no interpoladas) para que Tailwind las detecte
  const estilos = {
    blue: ['bg-blue-50', 'text-blue-600'],
    green: ['bg-green-50', 'text-green-600'],
    purple: ['bg-purple-50', 'text-purple-600'],
  }
  return (
    <div>
      <p className="text-xs font-semibold text-text-secondary mb-2">Procedencia</p>
      <div className="flex gap-2 sm:gap-3 text-sm">
        {cajas.map(({ clave, etiqueta, color }) => (
          <div key={clave} className={`flex-1 min-w-0 ${estilos[color][0]} rounded-lg p-2 sm:p-3 text-center`}>
            <p className={`text-xl sm:text-2xl font-bold ${estilos[color][1]}`}>
              {pct(porcentajeSobreRespondentes(perfil.procedencia, clave))}
            </p>
            <p className={`text-[11px] sm:text-xs ${estilos[color][1]} flex flex-wrap items-center justify-center gap-1`}>
              <i className={`fa-solid ${iconoPerfil('procedencia', clave)}`} aria-hidden="true" />
              {etiqueta}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Barra 100 % apilada: parte favorable en verde, el resto en gris. */
function BarraApilada({ favorable }: { favorable: number }) {
  return (
    <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-300 mt-1.5 mx-auto max-w-[10rem]">
      <div className="bg-green-500" style={{ width: `${favorable}%` }} />
    </div>
  )
}

/** Indicador Sí/No: la respuesta favorable para el destino va en verde, la otra en gris */
function IndicadorSiNo({ titulo, respuestas, favorable }: {
  titulo: string
  respuestas: Record<string, number>
  favorable: RespuestaSiNo
}) {
  const clase = (respuesta: RespuestaSiNo) =>
    `text-lg font-bold ${respuesta === favorable ? 'text-green-600' : 'text-text-secondary'}`
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center">
      <p className="text-xs text-text-secondary mb-1">{titulo}</p>
      <div className="flex justify-center gap-4">
        <p className={clase('SI')}>Sí: {pct(porcentajeSobreRespondentes(respuestas, 'SI'))}</p>
        <p className={clase('NO')}>No: {pct(porcentajeSobreRespondentes(respuestas, 'NO'))}</p>
      </div>
      <BarraApilada favorable={porcentajeSobreRespondentes(respuestas, favorable)} />
    </div>
  )
}

function IndicadorPositivo({ titulo, etiqueta, porcentaje }: { titulo: string; etiqueta: string; porcentaje: number }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center">
      <p className="text-xs text-text-secondary mb-1">{titulo}</p>
      <p className="text-lg font-bold text-green-600">{etiqueta}: {pct(porcentaje)}</p>
      <BarraApilada favorable={porcentaje} />
    </div>
  )
}

/**
 * Perfil del visitante. Cada porcentaje se calcula sobre quienes contestaron
 * esa pregunta (ej.: la provincia de origen solo la informan nacionales/provinciales).
 */
export default function PerfilVisitante({ perfil }: { perfil: DatosPerfilVisitante }) {
  if (perfil.totalEncuestas <= 0) return null

  return (
    <div className="mb-8">
      <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2">
        <i className="fa-solid fa-user-group text-primary text-sm" />
        Perfil del Visitante
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-3 gap-6">
        <Procedencia perfil={perfil} />
        <BarrasTop5 titulo="Top 5 provincias de origen" items={perfil.provinciasFrecuentes} colorBarra="bg-primary" nombrePropio />
        <BarrasTop5 titulo="Principal motivo de visita" items={perfil.motivosVisita} colorBarra="bg-accent" />
        <BarrasTop5 titulo="Grupo de viaje" items={perfil.gruposViaje} colorBarra="bg-orange-500" categoria="grupo" />
        <BarrasTop5 titulo="Medio de transporte" items={perfil.mediosTransporte} colorBarra="bg-teal-600" categoria="transporte" />
        <BarrasTop5 titulo="Tipo de alojamiento elegido" items={perfil.tiposAlojamiento} colorBarra="bg-amber-500" categoria="alojamiento" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 print:grid-cols-4 gap-3 mt-4 evitar-corte">
        <IndicadorSiNo titulo="¿Primera vez en SFVC?" respuestas={perfil.primeraVez} favorable={RESPUESTA_FAVORABLE.primeraVez} />
        <IndicadorSiNo titulo="¿Pensó en otros destinos?" respuestas={perfil.otrosDestinos} favorable={RESPUESTA_FAVORABLE.otrosDestinos} />
        <IndicadorPositivo titulo="¿Recomendaría SFVC?" etiqueta="Sí" porcentaje={porcentajeSobreRespondentes(perfil.recomendaria, 'SI')} />
        {/* volveria usa escala distinta: "MUY PROBABLE" / "POCO PROBABLE" */}
        <IndicadorPositivo titulo="¿Volvería a SFVC?" etiqueta="Muy probable" porcentaje={porcentajeSobreRespondentes(perfil.volveria, 'MUY PROBABLE')} />
      </div>
    </div>
  )
}
