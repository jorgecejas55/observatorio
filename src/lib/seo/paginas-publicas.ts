/**
 * Fuente única de las páginas públicas indexables: la usan los layouts de cada
 * ruta (metadata) y el sitemap. Al agregar una vista pública nueva, sumarla acá.
 */

import type { Metadata, MetadataRoute } from 'next'

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://observatorio.sfvc.tur.ar'
export const SITE_NAME = 'Observatorio de Turismo · Catamarca Capital'

/**
 * Base de Open Graph: Next reemplaza (no fusiona) el objeto openGraph del padre,
 * así que cada página tiene que repetir estos campos.
 */
export const OPEN_GRAPH_BASE = {
  type: 'website',
  locale: 'es_AR',
  siteName: SITE_NAME,
  images: ['/opengraph-image'],
} satisfies Metadata['openGraph']

type Frecuencia = NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>

interface PaginaPublica {
  titulo: string
  descripcion: string
  prioridad: number
  frecuencia: Frecuencia
}

export const PAGINAS_PUBLICAS = {
  '/dashboard': {
    titulo: 'Estadísticas de turismo de San Fernando del Valle de Catamarca',
    descripcion:
      'Indicadores turísticos de la ciudad de Catamarca: ocupación hotelera, estadía promedio y otros indicadores de demanda. Datos oficiales del Observatorio Municipal de Turismo.',
    prioridad: 1,
    frecuencia: 'weekly',
  },
  '/informes': {
    titulo: 'Informes técnicos de turismo',
    descripcion:
      'Informes periódicos y especiales sobre el turismo en San Fernando del Valle de Catamarca: turismo de ocio, fines de semana largos, eventos y turismo de reuniones (MICE).',
    prioridad: 0.9,
    frecuencia: 'weekly',
  },
  '/informes/ocio': {
    titulo: 'Informes de turismo de ocio',
    descripcion:
      'Informes mensuales, de fines de semana largos y temáticos sobre ocupación hotelera, perfil del visitante y atractivos de la ciudad de Catamarca.',
    prioridad: 0.9,
    frecuencia: 'weekly',
  },
  '/informes/mice': {
    titulo: 'Informes de turismo de reuniones (MICE)',
    descripcion:
      'Informes trimestrales del turismo de eventos y reuniones en San Fernando del Valle de Catamarca.',
    prioridad: 0.7,
    frecuencia: 'monthly',
  },
  '/estadisticas/perfil-visitante': {
    titulo: 'Perfil del visitante',
    descripcion:
      'Quiénes visitan la ciudad de Catamarca: procedencia, motivo y características del viaje, según las encuestas del Observatorio Municipal de Turismo.',
    prioridad: 0.8,
    frecuencia: 'monthly',
  },
  '/estadisticas/eventos': {
    titulo: 'Estadísticas de eventos turísticos',
    descripcion:
      'Eventos con impacto turístico en San Fernando del Valle de Catamarca: asistentes, procedencia y resultados de las encuestas de demanda.',
    prioridad: 0.7,
    frecuencia: 'monthly',
  },
  '/estadisticas/digital': {
    titulo: 'Canales digitales de turismo',
    descripcion:
      'Visitas al sitio web turístico y desempeño en Instagram y Facebook de Catamarca Capital, mes a mes.',
    prioridad: 0.6,
    frecuencia: 'monthly',
  },
  '/estadisticas/catu': {
    titulo: 'Catu, asistente virtual de turismo',
    descripcion:
      'Consultas recibidas por Catu, el asistente virtual de turismo de Catamarca Capital: conversaciones, temas más consultados y resolución.',
    prioridad: 0.5,
    frecuencia: 'weekly',
  },
  '/oferta': {
    titulo: 'Estructura de la oferta turística',
    descripcion:
      'Alojamientos, gastronomía, agencias, alquiler de autos, actividades y atractivos de San Fernando del Valle de Catamarca.',
    prioridad: 0.7,
    frecuencia: 'monthly',
  },
  '/oferta/alojamientos': {
    titulo: 'Alojamientos no registrados',
    descripcion:
      'Relevamiento de la oferta de alojamiento turístico no registrada en la ciudad de Catamarca.',
    prioridad: 0.5,
    frecuencia: 'monthly',
  },
  '/oferta/cobertura-transporte': {
    titulo: 'Cobertura de transporte',
    descripcion:
      'Cobertura del transporte público en la zona turística de San Fernando del Valle de Catamarca.',
    prioridad: 0.5,
    frecuencia: 'yearly',
  },
  '/accesibilidad': {
    titulo: 'Accesibilidad turística de los atractivos',
    descripcion:
      'Inventario de accesibilidad de los atractivos turísticos relevados en San Fernando del Valle de Catamarca.',
    prioridad: 0.6,
    frecuencia: 'monthly',
  },
  '/accesibilidad-gastronomica': {
    titulo: 'Accesibilidad en gastronomía',
    descripcion:
      'Relevamiento de accesibilidad en los establecimientos gastronómicos de la ciudad de Catamarca.',
    prioridad: 0.5,
    frecuencia: 'monthly',
  },
} satisfies Record<string, PaginaPublica>

export type RutaPublica = keyof typeof PAGINAS_PUBLICAS

/**
 * Título completo con el nombre del sitio. Se usa `absolute` porque un layout
 * intermedio con título propio corta la herencia del template del layout raíz
 * (pasaba en /oferta/alojamientos y /accesibilidad/[id]).
 */
export function tituloCompleto(titulo: string): { absolute: string } {
  return { absolute: `${titulo} | ${SITE_NAME}` }
}

/** Metadata (título, descripción, canonical y Open Graph) de una página pública. */
export function metadataDePagina(ruta: RutaPublica): Metadata {
  const { titulo, descripcion } = PAGINAS_PUBLICAS[ruta]
  return {
    title: tituloCompleto(titulo),
    description: descripcion,
    alternates: { canonical: ruta },
    openGraph: { ...OPEN_GRAPH_BASE, title: titulo, description: descripcion, url: ruta },
  }
}
