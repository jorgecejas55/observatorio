import {
  RESPUESTA_FAVORABLE,
  porcentajeDe,
  porcentajeSobreRespondentes,
  totalRespuestas,
  type RespuestaSiNo,
} from '@/lib/indicadores-perfil'
import type { DatosPerfilVisitante } from '@/lib/informes-auto/types'

type Item = { nombre: string; cantidad: number }

/** Top 5 de una pregunta, con % sobre quienes la contestaron. */
function BarrasTop5({ titulo, items, colorBarra, anchoEtiqueta }: {
  titulo: string
  items: Item[]
  colorBarra: string
  anchoEtiqueta: 'w-20' | 'w-32'
}) {
  const total = totalRespuestas(items)
  return (
    <div>
      <p className="text-xs font-semibold text-text-secondary mb-2">{titulo}</p>
      {items.slice(0, 5).map(item => (
        <div key={item.nombre} className="flex items-center gap-2 mb-1 text-xs">
          <span className={`${anchoEtiqueta} truncate text-text-secondary`}>{item.nombre}</span>
          <div className="flex-1 bg-gray-200 rounded-full h-3.5">
            <div
              className={`${colorBarra} h-3 rounded-full`}
              style={{ width: `${porcentajeDe(item.cantidad, total)}%` }}
            />
          </div>
          <span className="w-10 text-right text-text-primary font-semibold">
            {porcentajeDe(item.cantidad, total)}%
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
      <div className="flex gap-3 text-sm">
        {cajas.map(({ clave, etiqueta, color }) => (
          <div key={clave} className={`flex-1 ${estilos[color][0]} rounded-lg p-3 text-center`}>
            <p className={`text-2xl font-bold ${estilos[color][1]}`}>
              {porcentajeSobreRespondentes(perfil.procedencia, clave)}%
            </p>
            <p className={`text-xs ${estilos[color][1]}`}>{etiqueta}</p>
          </div>
        ))}
      </div>
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
        <p className={clase('SI')}>Sí: {porcentajeSobreRespondentes(respuestas, 'SI')}%</p>
        <p className={clase('NO')}>No: {porcentajeSobreRespondentes(respuestas, 'NO')}%</p>
      </div>
    </div>
  )
}

function IndicadorPositivo({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center">
      <p className="text-xs text-text-secondary mb-1">{titulo}</p>
      <p className="text-lg font-bold text-green-600">{texto}</p>
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
        <BarrasTop5 titulo="Top 5 provincias de origen" items={perfil.provinciasFrecuentes} colorBarra="bg-primary" anchoEtiqueta="w-20" />
        <BarrasTop5 titulo="Principal motivo de visita" items={perfil.motivosVisita} colorBarra="bg-accent" anchoEtiqueta="w-32" />
        <BarrasTop5 titulo="Grupo de viaje" items={perfil.gruposViaje} colorBarra="bg-orange-500" anchoEtiqueta="w-20" />
        <BarrasTop5 titulo="Medio de transporte" items={perfil.mediosTransporte} colorBarra="bg-teal-600" anchoEtiqueta="w-32" />
        <BarrasTop5 titulo="Tipo de alojamiento elegido" items={perfil.tiposAlojamiento} colorBarra="bg-amber-500" anchoEtiqueta="w-32" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 print:grid-cols-4 gap-3 mt-4 evitar-corte">
        <IndicadorSiNo titulo="¿Primera vez en SFVC?" respuestas={perfil.primeraVez} favorable={RESPUESTA_FAVORABLE.primeraVez} />
        <IndicadorSiNo titulo="¿Pensó en otros destinos?" respuestas={perfil.otrosDestinos} favorable={RESPUESTA_FAVORABLE.otrosDestinos} />
        <IndicadorPositivo titulo="¿Recomendaría SFVC?" texto={`Sí: ${porcentajeSobreRespondentes(perfil.recomendaria, 'SI')}%`} />
        {/* volveria usa escala distinta: "MUY PROBABLE" / "POCO PROBABLE" */}
        <IndicadorPositivo titulo="¿Volvería a SFVC?" texto={`Muy probable: ${porcentajeSobreRespondentes(perfil.volveria, 'MUY PROBABLE')}%`} />
      </div>
    </div>
  )
}
