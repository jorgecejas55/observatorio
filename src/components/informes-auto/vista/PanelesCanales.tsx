/**
 * Un panel por canal digital con todo lo suyo: cifras del mes, evolución
 * del año y rankings. Presentacional, sin hooks.
 */

import { formatearDecimal, formatearEntero, formatearPorcentaje } from '@/lib/formato-numeros'
import type { CatuInforme, RedSocialInforme, WebInforme } from '@/lib/informes-auto/types'
import { BarrasComparadas, BarrasConLinea, COLOR, SoloLineas, leyendaAnios } from './MiniGraficos'
import { CuerpoPanel, Fila, ListaTop, PanelCanal, SIN_DATOS, ValorPrincipal, mostrar } from './PanelCanal'
import Variacion, { VariacionesDelMes } from './Variacion'

/** Meta de satisfacción de Catu (puntaje 1-10). */
const META_SCORE_CATU = 7

export function PanelWeb({ web, anio }: { web: WebInforme; anio: number }) {
  const { visitantes } = web
  return (
    <PanelCanal icono="fa-solid fa-globe" titulo="Sitio web">
      <CuerpoPanel
        cifras={
          <>
            <ValorPrincipal valor={visitantes.actual} etiqueta="visitantes en el mes" />
            <div className="flex flex-col gap-0.5">
              <Variacion actual={visitantes.actual} anterior={visitantes.mesAnterior} etiqueta="vs mes anterior" />
              <Variacion actual={visitantes.actual} anterior={visitantes.anioAnterior} etiqueta="vs mismo mes año anterior" />
            </div>
          </>
        }
        graficos={
          <BarrasComparadas
            titulo="Visitantes por mes"
            actual={web.serie}
            anterior={web.serieAnioAnterior}
            leyenda={leyendaAnios(anio)}
          />
        }
      />
      <div className="grid grid-cols-2 gap-4 print:gap-3">
        <ListaTop titulo="Principales regiones" items={web.topRegiones} />
        <ListaTop titulo="Principales fuentes de tráfico" items={web.topFuentes} />
      </div>
    </PanelCanal>
  )
}

function CifrasRedSocial({ red }: { red: RedSocialInforme }) {
  const nuevos = red.nuevosSeguidores
  return (
    <>
      <ValorPrincipal valor={red.seguidores.actual} etiqueta="seguidores al cierre del mes" />
      <Fila etiqueta="Nuevos seguidores" valor={mostrar(nuevos, v => `${v > 0 ? '+' : ''}${formatearEntero(v)}`)} />
      <Fila etiqueta="Publicaciones" valor={mostrar(red.publicaciones.actual, formatearEntero)}>
        <Variacion actual={red.publicaciones.actual} anterior={red.publicaciones.mesAnterior} />
      </Fila>
      <Fila etiqueta="Interacciones" valor={mostrar(red.interacciones.actual, formatearEntero)}>
        <Variacion actual={red.interacciones.actual} anterior={red.interacciones.mesAnterior} />
      </Fila>
      <Fila etiqueta="Tasa de interacción" valor={mostrar(red.engagement, v => formatearPorcentaje(v, 2))} />
      <Fila etiqueta="Int. por publicación" valor={mostrar(red.interaccionesPorPublicacion, v => formatearDecimal(v))} />
    </>
  )
}

/** Cada red con sus escalas: IG y FB tienen magnitudes distintas. */
export function PanelRedSocial({ red, icono, titulo }: { red: RedSocialInforme; icono: string; titulo: string }) {
  return (
    <PanelCanal icono={icono} titulo={titulo}>
      <CuerpoPanel
        cifras={<CifrasRedSocial red={red} />}
        graficos={
          <>
            <BarrasConLinea
              titulo="Publicaciones e interacciones por publicación"
              barras={red.seriePublicaciones}
              linea={{ puntos: red.serieIntPorPub, color: COLOR.secondary }}
              leyenda={[{ color: COLOR.primary, texto: 'Publicaciones' }, { color: COLOR.secondary, texto: 'Int. por publicación' }]}
            />
            <SoloLineas
              titulo="Seguidores al cierre de cada mes"
              series={[{ puntos: red.serieSeguidores, color: COLOR.primary }]}
            />
          </>
        }
      />
      {red.lectura && <p className="text-[10px] leading-snug text-text-secondary italic">{red.lectura}</p>}
    </PanelCanal>
  )
}

function IconoMeta({ score }: { score: number }) {
  const cumple = score >= META_SCORE_CATU
  return (
    <i
      className={`fa-solid ${cumple ? 'fa-circle-check text-green-600' : 'fa-circle-exclamation text-amber-500'} text-[10px]`}
      aria-label={cumple ? 'Cumple la meta' : 'Debajo de la meta'}
    />
  )
}

function TemasCatu({ temas }: { temas: string[] }) {
  return (
    <div>
      <p className="text-xs font-semibold text-text-secondary mb-1">Temas más consultados</p>
      {temas.length === 0 ? (
        <p className="text-xs italic text-text-secondary">{SIN_DATOS}</p>
      ) : (
        <ol className="text-xs text-text-secondary space-y-0.5 list-decimal list-inside">
          {temas.map(t => <li key={t}>{t}</li>)}
        </ol>
      )}
    </div>
  )
}

export function PanelCatu({ catu, anio }: { catu: CatuInforme; anio: number }) {
  return (
    <PanelCanal icono="fa-solid fa-robot" titulo="Catu (asistente virtual)">
      <CuerpoPanel
        cifras={
          <>
            <ValorPrincipal valor={catu.conversaciones} etiqueta="conversaciones en el mes" />
            <VariacionesDelMes
              actual={catu.conversaciones}
              serie={catu.serie}
              serieAnioAnterior={catu.serieAnioAnterior}
              className="mb-1"
            />
            <Fila etiqueta="Resueltas" valor={mostrar(catu.resolucion, v => formatearPorcentaje(v))} />
            <Fila etiqueta={`Puntaje promedio (meta ≥ ${META_SCORE_CATU})`} valor={mostrar(catu.score, v => formatearDecimal(v))}>
              {catu.score !== null && <IconoMeta score={catu.score} />}
            </Fila>
          </>
        }
        // Temas debajo del gráfico (no a lo ancho): con las variaciones, la columna de cifras
        // creció y el panel tiene que seguir entrando con los demás canales en una hoja
        graficos={
          <>
            <BarrasComparadas
              titulo="Conversaciones por mes"
              actual={catu.serie}
              anterior={catu.serieAnioAnterior}
              leyenda={leyendaAnios(anio)}
            />
            <TemasCatu temas={catu.topTemas} />
          </>
        }
      />
    </PanelCanal>
  )
}
