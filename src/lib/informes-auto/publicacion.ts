/**
 * Reglas puras de publicación de informes-auto.
 *
 * Publicar = oficial: recién al publicar los valores del informe llegan a la
 * planilla maestra (dashboard) y el informe aparece en Informes Técnicos.
 */

import { MESES } from '@/lib/indicadores/periodos'
import { slugRegistro } from './comparativas'
import type {
  EstadoInforme,
  InformeFindeCompleto,
  PublicacionInforme,
  RegistroMaestro,
  ValoresMaestra,
} from './types'

/** Solapamiento mínimo de palabras significativas para advertir un posible duplicado. */
const UMBRAL_DUPLICADO = 0.6

/** Palabras que no distinguen un evento de otro ("Finde XL Día de la …"). */
const PALABRAS_GENERICAS = new Set(['finde', 'xl', 'fin', 'de', 'la', 'el', 'los', 'las', 'del', 'y', 'al', 'dia', 'semana', 'largo', 'fiesta', 'fiestas'])

function palabrasSignificativas(nombre: string): Set<string> {
  return new Set(slugRegistro(nombre).split('-').filter(p => p.length > 1 && !PALABRAS_GENERICAS.has(p) && !/^\d+$/.test(p)))
}

/** |A ∩ B| / min(|A|, |B|): detecta un nombre acortado o ampliado del mismo evento. */
export function solapamientoNombres(a: string, b: string): number {
  const pa = palabrasSignificativas(a)
  const pb = palabrasSignificativas(b)
  if (pa.size === 0 || pb.size === 0) return 0
  const comunes = [...pa].filter(p => pb.has(p)).length
  return comunes / Math.min(pa.size, pb.size)
}

export function valoresParaMaestra(informe: InformeFindeCompleto): ValoresMaestra {
  return {
    anio: Number(informe.fechaInicio.slice(0, 4)),
    mes: MESES[Number(informe.fechaInicio.slice(5, 7)) - 1] ?? '',
    evento: informe.nombre,
    oh: informe.relevamiento.ohTotal,
    estadiaProm: informe.perfil.estadiaSinOutliers.estadiaPromedio,
    visitantes: informe.impacto.visitantesTotales,
    impacto: informe.impacto.impactoTotal,
  }
}

export function mismosValores(a: ValoresMaestra, b: ValoresMaestra): boolean {
  return (Object.keys(a) as (keyof ValoresMaestra)[]).every(k => a[k] === b[k])
}

/**
 * Estado de un informe después de recalcularlo o regenerarlo: un borrador
 * sigue borrador; uno publicado pasa a "cambios sin publicar" solo si los
 * valores que ve el dashboard cambiaron.
 */
export function estadoTrasCambio(
  estadoPrevio: EstadoInforme,
  publicacion: PublicacionInforme | undefined,
  informeNuevo: InformeFindeCompleto,
): EstadoInforme {
  if (estadoPrevio === 'borrador' || !publicacion) return estadoPrevio
  return mismosValores(publicacion.valores, valoresParaMaestra(informeNuevo))
    ? 'publicado'
    : 'cambios-sin-publicar'
}

export interface ComparacionMaestra {
  /** Fila que el empuje va a actualizar (null = se agrega una fila nueva). */
  actual: RegistroMaestro | null
  /** Otras filas del mismo mes con nombre parecido: probable duplicado por renombre. */
  posiblesDuplicados: RegistroMaestro[]
}

/** Replica el criterio de upsert del GAS de indicadores para anticipar qué fila se toca. */
export function compararConMaestra(
  informe: InformeFindeCompleto,
  registros: RegistroMaestro[],
): ComparacionMaestra {
  const valores = valoresParaMaestra(informe)
  const mensual = (informe.tipoInforme ?? 'FSL') === 'MENSUAL'

  if (mensual) {
    const mesNumero = MESES.indexOf(valores.mes as typeof MESES[number]) + 1
    const actual = registros.find(r =>
      r.tipoPeriodo === 'MENSUAL' && r.anio === valores.anio && r.mesNumero === mesNumero) ?? null
    return { actual, posiblesDuplicados: [] }
  }

  const findesDelAnio = registros.filter(r => r.tipoPeriodo === 'FSL' && r.anio === valores.anio)
  const slug = slugRegistro(valores.evento)
  const actual = findesDelAnio.find(r => slugRegistro(r.nombre) === slug) ?? null
  // Un renombre conserva el mes: solo se comparan eventos del mismo mes
  const mesNumero = Number(informe.fechaInicio.slice(5, 7))
  const posiblesDuplicados = findesDelAnio.filter(r =>
    r.mesNumero === mesNumero &&
    slugRegistro(r.nombre) !== slug &&
    solapamientoNombres(r.nombre, valores.evento) >= UMBRAL_DUPLICADO)

  return { actual, posiblesDuplicados }
}
