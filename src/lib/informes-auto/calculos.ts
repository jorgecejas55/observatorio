/**
 * Motor de cálculo del módulo de informes de fines de semana largos.
 * Todas las funciones son puras — no dependen de efectos secundarios.
 */

import type {
  CargaOH,
  AlojamientoOH,
  OHPorTipo,
  PicosOcupacion,
  PicoOcupacion,
  ResultadoEstadiaSinOutliers,
  InputsImpactoEconomico,
  ResultadoImpactoEconomico,
} from '@/lib/informes-auto/types'

// ── Estadía promedio sin outliers ─────────────────────────────────────────────

export function calcularEstadiaSinOutliers(valores: number[]): ResultadoEstadiaSinOutliers {
  // 1. Excluir valores <= 0
  const sinCero = valores.filter(v => v > 0)

  if (sinCero.length === 0) {
    return { estadiaPromedio: 0, n: 0, nExcluidas: valores.length }
  }

  // 2. Calcular media y desvío estándar
  const media = sinCero.reduce((a, b) => a + b, 0) / sinCero.length
  const varianza = sinCero.reduce((acc, v) => acc + Math.pow(v - media, 2), 0) / sinCero.length
  const std = Math.sqrt(varianza)

  // 3. Excluir fuera de media ± 2.5σ
  const limpios = sinCero.filter(v => Math.abs(v - media) <= 2.5 * std)

  if (limpios.length === 0) {
    // Si todos fueron excluidos, usar todos los > 0
    const promedio = Math.round((media * 10)) / 10
    return { estadiaPromedio: promedio, n: sinCero.length, nExcluidas: valores.length - sinCero.length }
  }

  const promedio = limpios.reduce((a, b) => a + b, 0) / limpios.length
  return {
    estadiaPromedio: Math.round(promedio * 10) / 10,
    n: limpios.length,
    nExcluidas: valores.length - limpios.length,
  }
}

// ── OH por tipo de alojamiento ─────────────────────────────────────────────────

const GRUPOS_OH: Record<string, (a: AlojamientoOH) => boolean> = {
  'Hotel 4 estrellas':  a => a.tipo === 'Hotel' && a.categoria === '4 estrellas',
  'Hotel 3 estrellas':  a => a.tipo === 'Hotel' && a.categoria === '3 estrellas',
  'Hotel 2 estrellas':  a => a.tipo === 'Hotel' && a.categoria === '2 estrellas',
  'Hotel 1 estrella':   a => a.tipo === 'Hotel' && a.categoria === '1 estrella',
  'Apart Hotel':        a => a.tipo === 'Apart Hotel',
  'Cabañas y Residenciales': a => a.tipo === 'Cabañas' || a.tipo === 'Residencial Cat.A' || a.tipo === 'Residencial Cat.B' || a.tipo === 'Residencial Cat.S' || a.tipo === 'Residencial Cat.',
  'Hostel':             a => a.tipo === 'Hostel',
}

export function calcularOHPorTipo(cargas: CargaOH[], alojamientos: AlojamientoOH[]): OHPorTipo[] {
  // Construir mapa de alojamiento por ID para el join
  const alojamientoMap = new Map<string, AlojamientoOH>()
  for (const a of alojamientos) {
    alojamientoMap.set(a.id, a)
  }

  // Agrupar cargas por tipo de alojamiento
  const gruposHab: Record<string, number> = {}
  const gruposOcupadas: Record<string, number> = {}
  const otrosHab: number[] = []
  const otrosOcupadas: number[] = []
  let contadorPorTipo: Record<string, number> = {}

  for (const carga of cargas) {
    const aloj = alojamientoMap.get(carga.alojamientoId)
    if (!aloj) continue

    let grupo: string | null = null
    for (const [nombre, fn] of Object.entries(GRUPOS_OH)) {
      if (fn(aloj)) {
        grupo = nombre
        break
      }
    }

    const habOcupadas = carga.capacidadHab * carga.porcentajeOH / 100

    if (grupo) {
      gruposHab[grupo] = (gruposHab[grupo] ?? 0) + carga.capacidadHab
      gruposOcupadas[grupo] = (gruposOcupadas[grupo] ?? 0) + habOcupadas
      contadorPorTipo[grupo] = (contadorPorTipo[grupo] ?? 0) + 1
    } else {
      otrosHab.push(carga.capacidadHab)
      otrosOcupadas.push(habOcupadas)
    }
  }

  const resultado: OHPorTipo[] = []

  // Calcular OH para cada grupo definido
  for (const nombre of Object.keys(GRUPOS_OH)) {
    const hab = gruposHab[nombre] ?? 0
    const ocupadas = gruposOcupadas[nombre] ?? 0
    const oh = hab > 0 ? Math.round((ocupadas / hab) * 1000) / 10 : 0
    resultado.push({
      tipo: nombre,
      ohPorcentaje: oh,
      habitacionesRelevadas: hab,
      habitacionesOcupadas: Math.round(ocupadas),
    })
  }

  // Grupo "Otros" — tipos con < 3 cargas
  if (otrosHab.length > 0 && otrosHab.length < 3) {
    const totalHab = otrosHab.reduce((a, b) => a + b, 0)
    const totalOcupadas = otrosOcupadas.reduce((a, b) => a + b, 0)
    const oh = totalHab > 0 ? Math.round((totalOcupadas / totalHab) * 1000) / 10 : 0
    resultado.push({
      tipo: 'Otros',
      ohPorcentaje: oh,
      habitacionesRelevadas: totalHab,
      habitacionesOcupadas: Math.round(totalOcupadas),
    })
  }

  // Ordenar por OH descendente
  resultado.sort((a, b) => b.ohPorcentaje - a.ohPorcentaje)

  return resultado
}

// ── Etiqueta de grupo (tipo + categoría) de un alojamiento ────────────────────

export function etiquetaGrupoAlojamiento(a: AlojamientoOH): string {
  for (const [nombre, fn] of Object.entries(GRUPOS_OH)) {
    if (fn(a)) return nombre
  }
  return 'Otros'
}

// ── Picos de ocupación (máximos por establecimiento, sin nombres) ─────────────

/**
 * Calcula los picos de ocupación: el OH máximo alcanzado por algún establecimiento,
 * agrupado por tipo + categoría. NUNCA expone nombres de alojamientos.
 */
export function calcularPicosOcupacion(cargas: CargaOH[], alojamientos: AlojamientoOH[]): PicosOcupacion {
  const alojamientoMap = new Map<string, AlojamientoOH>()
  for (const a of alojamientos) {
    alojamientoMap.set(a.id, a)
  }

  const maxPorGrupo = new Map<string, number>()
  const countPorGrupo = new Map<string, number>()
  let picoMaximo: { tipoCategoria: string; ohMaximo: number } | null = null

  for (const carga of cargas) {
    const aloj = alojamientoMap.get(carga.alojamientoId)
    if (!aloj) continue
    if (carga.capacidadHab <= 0) continue // ignorar cargas sin capacidad real

    const grupo = etiquetaGrupoAlojamiento(aloj)
    const oh = carga.porcentajeOH

    countPorGrupo.set(grupo, (countPorGrupo.get(grupo) ?? 0) + 1)
    if (oh > (maxPorGrupo.get(grupo) ?? -1)) maxPorGrupo.set(grupo, oh)
    if (!picoMaximo || oh > picoMaximo.ohMaximo) {
      picoMaximo = { tipoCategoria: grupo, ohMaximo: oh }
    }
  }

  const porTipo: PicoOcupacion[] = Array.from(maxPorGrupo.entries())
    .map(([tipoCategoria, ohMaximo]) => ({
      tipoCategoria,
      ohMaximo: Math.round(ohMaximo * 10) / 10,
      cantidadAlojamientos: countPorGrupo.get(tipoCategoria) ?? 0,
    }))
    .sort((a, b) => b.ohMaximo - a.ohMaximo)

  return {
    picoMaximo: picoMaximo
      ? { tipoCategoria: picoMaximo.tipoCategoria, ohMaximo: Math.round(picoMaximo.ohMaximo * 10) / 10 }
      : null,
    porTipo,
  }
}

// ── Impacto económico ──────────────────────────────────────────────────────────

export function calcularImpactoEconomico(inputs: InputsImpactoEconomico): ResultadoImpactoEconomico {
  const {
    plazasDisponibles,
    duracionPeriodo,
    ohPorcentaje,
    estadiaPromedio,
    gastoDiarioTuristas,
    gastoDiarioExcursionistas,
    excursionistas,
  } = inputs

  const pernoctesEnOferta = plazasDisponibles * duracionPeriodo
  const pernoctesConsumidos = pernoctesEnOferta * (ohPorcentaje / 100)
  const turistasAlojados = estadiaPromedio > 0
    ? Math.round(pernoctesConsumidos / estadiaPromedio)
    : 0
  const visitantesTotales = turistasAlojados + excursionistas

  const impactoTuristas = turistasAlojados * estadiaPromedio * gastoDiarioTuristas
  const impactoExcursionistas = excursionistas * 1 * gastoDiarioExcursionistas
  const impactoTotal = impactoTuristas + impactoExcursionistas

  return {
    pernoctesEnOferta,
    pernoctesConsumidos: Math.round(pernoctesConsumidos),
    turistasAlojados,
    excursionistas,
    visitantesTotales,
    impactoTuristas: Math.round(impactoTuristas),
    impactoExcursionistas: Math.round(impactoExcursionistas),
    impactoTotal: Math.round(impactoTotal),
  }
}

// ── Variación porcentual ──────────────────────────────────────────────────────

export function variacion(actual: number, anterior: number): number | null {
  if (anterior === 0) return null
  return Math.round(((actual - anterior) / anterior) * 1000) / 10
}

// ── Días entre fechas ─────────────────────────────────────────────────────────

export function calcularDiasEntreFechas(inicio: string, fin: string): number {
  const start = new Date(inicio + 'T00:00:00-03:00')
  const end = new Date(fin + 'T00:00:00-03:00')
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
}
