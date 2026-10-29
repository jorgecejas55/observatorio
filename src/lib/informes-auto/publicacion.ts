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

// ── Huella del contenido publicado ────────────────────────────────────────────

/** Metadatos que no se ven en el informe: no cuentan como "cambio sin publicar". */
const CAMPOS_NO_VISIBLES = [
  'id', 'estado', 'publicacion', 'empujeMaestra', 'idInformePublico', 'fechaGeneracion', 'usuarioGenerador',
] as const

/** Límite de la celda de Sheets (50.000) con margen para el resto del JSON. */
const MAX_CARACTERES_CELDA = 45_000

/** JSON con claves ordenadas: el mismo contenido da el mismo texto aunque cambie el orden. */
function serializarEstable(valor: unknown): string {
  if (Array.isArray(valor)) return `[${valor.map(serializarEstable).join(',')}]`
  if (valor && typeof valor === 'object') {
    const claves = Object.keys(valor).filter(k => (valor as Record<string, unknown>)[k] !== undefined).sort()
    return `{${claves.map(k => `${JSON.stringify(k)}:${serializarEstable((valor as Record<string, unknown>)[k])}`).join(',')}}`
  }
  return JSON.stringify(valor) ?? 'null'
}

/** Hash de 53 bits (cyrb53): detecta cambios, sin dependencias ni node:crypto. */
function hash53(texto: string): string {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < texto.length; i++) {
    const c = texto.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 2654435761)
    h2 = Math.imul(h2 ^ c, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16)
}

export function huellaPublicable(informe: InformeFindeCompleto): string {
  const visible: Record<string, unknown> = { ...informe }
  for (const campo of CAMPOS_NO_VISIBLES) delete visible[campo]
  return hash53(serializarEstable(visible))
}

/** Lo publicado tal cual se ve (sin metadatos de publicación anidados). */
function copiaPublicable(informe: InformeFindeCompleto): InformeFindeCompleto {
  const { publicacion: _publicacion, empujeMaestra: _empuje, ...copia } = informe
  return copia as InformeFindeCompleto
}

/**
 * Registro de publicación: valores del dashboard, huella del contenido y, si
 * entra en la celda de Sheets, la copia que sirve la vista pública.
 */
export function registrarPublicacion(
  informe: InformeFindeCompleto,
  fecha: string,
  usuario: string,
): PublicacionInforme {
  const base: PublicacionInforme = {
    fecha,
    usuario,
    valores: valoresParaMaestra(informe),
    huella: huellaPublicable(informe),
  }
  const conCopia: PublicacionInforme = { ...base, snapshot: copiaPublicable(informe) }
  const tamanio = JSON.stringify({ ...informe, publicacion: conCopia }).length
  return tamanio <= MAX_CARACTERES_CELDA ? conCopia : base
}

/**
 * Tras renombrar: la copia pública toma el nombre nuevo (el nombre es
 * identidad, no un cambio de contenido). Los valores del dashboard los
 * actualiza quien empuja el renombre a la planilla maestra.
 */
export function renombrarCopiaPublicada(publicacion: PublicacionInforme, nombre: string): PublicacionInforme {
  if (!publicacion.snapshot) return publicacion
  const snapshot = { ...publicacion.snapshot, nombre }
  return { ...publicacion, snapshot, huella: huellaPublicable(snapshot) }
}

/**
 * Estado de un informe después de recalcularlo, regenerarlo o renombrarlo: un
 * borrador sigue borrador; uno publicado pasa a "cambios sin publicar" si
 * cambió cualquier cosa visible (o, en publicaciones viejas sin huella, si
 * cambiaron los valores del dashboard).
 */
export function estadoTrasCambio(
  estadoPrevio: EstadoInforme,
  publicacion: PublicacionInforme | undefined,
  informeNuevo: InformeFindeCompleto,
): EstadoInforme {
  if (estadoPrevio === 'borrador' || !publicacion) return estadoPrevio
  const sinCambios = publicacion.huella
    ? publicacion.huella === huellaPublicable(informeNuevo)
    : mismosValores(publicacion.valores, valoresParaMaestra(informeNuevo))
  return sinCambios ? 'publicado' : 'cambios-sin-publicar'
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
