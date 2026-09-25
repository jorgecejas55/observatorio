/**
 * Une los informes de ocio cargados a mano (PDF, gas/informes.gs) con los
 * informes automáticos publicados. Si ambos cubren el mismo período se
 * muestra una sola fila con los dos enlaces (PDF + informe web).
 *
 * Puro: sin fetch, para poder testearlo.
 */

import { formatearMesAnio, formatearRango } from '@/lib/formato-fechas'
import { numeroDeMes } from '@/lib/indicadores/periodos'
import { solapamientoNombres } from '@/lib/informes-auto/publicacion'
import type { TipoInforme as TipoInformeAuto } from '@/lib/informes-auto/types'
import type { CategoriaInforme, Informe } from '@/lib/types'

/** Datos mínimos de un informe automático publicado. */
export interface InformeAutoPublico {
  id: string
  slug: string
  nombre: string
  tipo: TipoInformeAuto
  fechaInicio: string   // YYYY-MM-DD
  fechaFin: string
  fechaGeneracion: string
}

const SIMILITUD_MINIMA = 0.6
const CATEGORIAS_ESPECIALES: CategoriaInforme[] = ['finde', 'evento-especifico', 'tematico', 'especial']

const CATEGORIA_AUTO: Record<TipoInformeAuto, CategoriaInforme> = {
  MENSUAL: 'mensual',
  FSL: 'finde',
  EVENTO: 'evento-especifico',
}

function anioDelTexto(texto: string): number | null {
  const m = texto.match(/\b(20\d{2})\b/)
  return m ? Number(m[1]) : null
}

function mesDelTexto(texto: string): number {
  for (const palabra of texto.split(/[^A-Za-zÁÉÍÓÚáéíóúñÑ]+/)) {
    const mes = numeroDeMes(palabra)
    if (mes > 0) return mes
  }
  return 0
}

function anioDeManual(manual: Informe): number | null {
  return anioDelTexto(`${manual.titulo} ${manual.periodo}`) ?? anioDelTexto(String(manual.fecha))
}

export function urlInformeAuto(auto: InformeAutoPublico): string {
  return `/informes/ver/${auto.slug}`
}

/** ¿El PDF manual cubre el mismo período que el informe automático? */
export function mismoPeriodo(manual: Informe, auto: InformeAutoPublico): boolean {
  const anio = Number(auto.fechaInicio.slice(0, 4))
  if (anioDeManual(manual) !== anio) return false

  if (auto.tipo === 'MENSUAL') {
    return manual.categoria === 'mensual'
      && mesDelTexto(`${manual.periodo} ${manual.titulo}`) === Number(auto.fechaInicio.slice(5, 7))
  }
  return CATEGORIAS_ESPECIALES.includes(manual.categoria)
    && solapamientoNombres(manual.titulo, auto.nombre) >= SIMILITUD_MINIMA
}

/** Informe automático sin PDF manual → fila propia con enlace al informe web. */
export function informeDesdeAuto(auto: InformeAutoPublico): Informe {
  const anio = auto.fechaInicio.slice(0, 4)
  const mensual = auto.tipo === 'MENSUAL'
  const titulo = mensual
    ? `Informe Estadístico Mensual - ${formatearMesAnio(auto.fechaInicio)}`
    : auto.nombre.includes(anio) ? auto.nombre : `${auto.nombre} ${anio}`

  return {
    id: auto.id,
    titulo,
    descripcion: 'Ocupación hotelera, perfil del visitante, impacto económico e ingresos a atractivos.',
    tipo: 'ocio',
    subcategoria: mensual ? 'periodico' : 'especial',
    categoria: CATEGORIA_AUTO[auto.tipo],
    periodo: mensual ? formatearMesAnio(auto.fechaInicio).toLowerCase() : formatearRango(auto.fechaInicio, auto.fechaFin),
    fecha: auto.fechaGeneracion,
    urlPdf: '',
    urlWeb: urlInformeAuto(auto),
  }
}

/** Manuales + automáticos, sin duplicar períodos, del más reciente al más viejo. */
export function unificarInformesOcio(manuales: Informe[], autos: InformeAutoPublico[]): Informe[] {
  const resultado = manuales.map(m => ({ ...m }))
  for (const auto of autos) {
    const coincidente = resultado.find(m => !m.urlWeb && m.urlPdf && mismoPeriodo(m, auto))
    if (coincidente) coincidente.urlWeb = urlInformeAuto(auto)
    else resultado.push(informeDesdeAuto(auto))
  }
  return resultado.sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))
}
