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
  EstadisticasOH,
  BajaActividadComercial,
  EstadisticasOHPorGrupo,
  DistribucionRangosOH,
  IndicadoresRelevamiento,
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

// ── Indicadores Bloque A ──────────────────────────────────────────────────────

/** Umbral de baja actividad comercial (%). Revisable por la Universidad. */
export const UMBRAL_BAJA_ACTIVIDAD = 10

/**
 * Calcula todos los estadísticos de las OH individuales.
 * OH-02 a OH-09 + mediana + media recortada.
 * Excluye cargas con capacidadHab <= 0.
 */
export function calcularEstadisticasOH(
  cargas: { porcentajeOH: number; capacidadHab: number }[]
): EstadisticasOH {
  // Excluir cargas sin capacidad real
  const validas = cargas.filter(c => c.capacidadHab > 0)
  const n = validas.length

  if (n === 0) {
    return {
      mediaSimple: 0, mediaPonderada: 0, mediana: 0, mediaRecortada: 0,
      nRecortados: 0, desvioEstandar: 0, coeficienteVariacion: 0,
      minimo: 0, maximo: 0, moda: 0, n: 0,
    }
  }

  const porcentajes = validas.map(c => c.porcentajeOH)

  // Media simple (OH-05)
  const mediaSimple = Math.round((porcentajes.reduce((a, b) => a + b, 0) / n) * 10) / 10

  // Media ponderada por capacidadHab (OH-06)
  const totalHab = validas.reduce((s, c) => s + c.capacidadHab, 0)
  const totalHabOcupadas = validas.reduce((s, c) => s + c.capacidadHab * c.porcentajeOH / 100, 0)
  const mediaPonderada = totalHab > 0
    ? Math.round((totalHabOcupadas / totalHab) * 1000) / 10
    : 0

  // Min, Max (OH-02, OH-03)
  const minimo = Math.min(...porcentajes)
  const maximo = Math.max(...porcentajes)

  // Moda (OH-04)
  const freq: Record<number, number> = {}
  let maxFreq = 0, moda = porcentajes[0]
  for (const p of porcentajes) {
    freq[p] = (freq[p] || 0) + 1
    if (freq[p] > maxFreq) { maxFreq = freq[p]; moda = p }
  }

  // Desvío estándar poblacional (÷ n) — OH-07
  const varianza = porcentajes.reduce((acc, v) => acc + Math.pow(v - mediaSimple, 2), 0) / n
  const desvioEstandar = Math.round(Math.sqrt(varianza) * 10) / 10

  // Coeficiente de variación — OH-08
  const coeficienteVariacion = mediaSimple > 0
    ? Math.round((desvioEstandar / mediaSimple) * 1000) / 10
    : 0

  // Mediana
  const sorted = [...porcentajes].sort((a, b) => a - b)
  let mediana: number
  if (n % 2 === 0) {
    mediana = Math.round(((sorted[n / 2 - 1] + sorted[n / 2]) / 2) * 10) / 10
  } else {
    mediana = Math.round(sorted[Math.floor(n / 2)] * 10) / 10
  }

  // Media recortada (± 2.5σ)
  const mediaRecortadaData = calcularMediaRecortada(porcentajes, mediaSimple, desvioEstandar)

  return {
    mediaSimple,
    mediaPonderada,
    mediana,
    mediaRecortada: mediaRecortadaData.media,
    nRecortados: mediaRecortadaData.nRecortados,
    desvioEstandar,
    coeficienteVariacion,
    minimo,
    maximo,
    moda,
    n,
  }
}

/**
 * Calcula la media excluyendo valores fuera de media ± 2.5σ.
 * Consistente con calcularEstadiaSinOutliers.
 * Si el recorte excluye todo, devuelve la media simple.
 */
function calcularMediaRecortada(
  porcentajes: number[],
  media: number,
  std: number
): { media: number; nRecortados: number } {
  if (std === 0 || porcentajes.length <= 2) {
    return { media, nRecortados: 0 }
  }

  const recortados = porcentajes.filter(v => Math.abs(v - media) <= 2.5 * std)

  if (recortados.length === 0) {
    return { media, nRecortados: 0 }
  }

  const mediaRecortada = Math.round(
    (recortados.reduce((a, b) => a + b, 0) / recortados.length) * 10
  ) / 10

  return {
    media: mediaRecortada,
    nRecortados: porcentajes.length - recortados.length,
  }
}

/**
 * Calcula el indicador de baja actividad comercial.
 * % de establecimientos con OH estrictamente < umbral.
 */
export function calcularBajaActividad(
  porcentajes: number[],
  umbral: number = UMBRAL_BAJA_ACTIVIDAD
): BajaActividadComercial {
  if (porcentajes.length === 0) {
    return { umbral, cantidad: 0, porcentaje: 0 }
  }

  const cantidad = porcentajes.filter(p => p < umbral).length
  const porcentaje = Math.round((cantidad / porcentajes.length) * 1000) / 10

  return { umbral, cantidad, porcentaje }
}

/**
 * Calcula estadísticos por grupo tipo-categoría.
 * OH-11 a OH-15. Solo grupos con datos aparecen.
 * Reutiliza GRUPOS_OH y etiquetaGrupoAlojamiento.
 */
export function calcularEstadisticasPorGrupo(
  cargas: CargaOH[],
  alojamientos: AlojamientoOH[]
): EstadisticasOHPorGrupo[] {
  // Construir mapa de alojamiento por ID
  const alojMap = new Map<string, AlojamientoOH>()
  for (const a of alojamientos) alojMap.set(a.id, a)

  // Agrupar cargas por grupo
  const cargasPorGrupo = new Map<string, { porcentajeOH: number; capacidadHab: number }[]>()
  for (const c of cargas) {
    if (c.capacidadHab <= 0) continue
    const aloj = alojMap.get(c.alojamientoId)
    if (!aloj) continue
    const grupo = etiquetaGrupoAlojamiento(aloj)
    if (!cargasPorGrupo.has(grupo)) cargasPorGrupo.set(grupo, [])
    cargasPorGrupo.get(grupo)!.push({ porcentajeOH: c.porcentajeOH, capacidadHab: c.capacidadHab })
  }

  // Total de habitaciones relevadas (para calcular participación)
  let totalHabRelevadas = 0
  for (const [, cargasGrupo] of cargasPorGrupo) {
    totalHabRelevadas += cargasGrupo.reduce((s, c) => s + c.capacidadHab, 0)
  }

  // Calcular estadísticos para cada grupo
  const resultado: EstadisticasOHPorGrupo[] = []
  for (const [grupo, cargasGrupo] of cargasPorGrupo) {
    if (cargasGrupo.length === 0) continue

    const stats = calcularEstadisticasOH(cargasGrupo)
    const habRelevadas = cargasGrupo.reduce((s, c) => s + c.capacidadHab, 0)
    const habOcupadas = cargasGrupo.reduce((s, c) => s + (c.capacidadHab * c.porcentajeOH / 100), 0)
    const participacion = totalHabRelevadas > 0
      ? Math.round((habRelevadas / totalHabRelevadas) * 1000) / 10
      : 0

    resultado.push({
      tipoCategoria: grupo,
      estadisticas: stats,
      habitacionesRelevadas: habRelevadas,
      habitacionesOcupadas: Math.round(habOcupadas),
      participacionHabitaciones: participacion,
    })
  }

  // Ordenar por OH ponderada descendente
  resultado.sort((a, b) => b.estadisticas.mediaPonderada - a.estadisticas.mediaPonderada)
  return resultado
}

/**
 * Distribución de cargas en 4 rangos de OH.
 * Intervalos: [0,25) [25,50) [50,75) [75,100]
 */
export function calcularDistribucionRangos(porcentajes: number[]): DistribucionRangosOH {
  const rangos = [
    { etiqueta: '0-25%', desde: 0, hasta: 25, cantidad: 0, porcentaje: 0 },
    { etiqueta: '25-50%', desde: 25, hasta: 50, cantidad: 0, porcentaje: 0 },
    { etiqueta: '50-75%', desde: 50, hasta: 75, cantidad: 0, porcentaje: 0 },
    { etiqueta: '75-100%', desde: 75, hasta: 100, cantidad: 0, porcentaje: 0 },
  ]

  const total = porcentajes.length

  for (const p of porcentajes) {
    if (p < 25) rangos[0].cantidad++
    else if (p < 50) rangos[1].cantidad++
    else if (p < 75) rangos[2].cantidad++
    else rangos[3].cantidad++
  }

  if (total > 0) {
    for (const r of rangos) {
      r.porcentaje = Math.round((r.cantidad / total) * 1000) / 10
    }
  }

  return { rangos, total }
}

/**
 * Calcula la cobertura del relevamiento (OH-10).
 * Retorna null si no se conoce el padrón de alojamientos activos.
 */
export function calcularCobertura(
  cantidadRelevados: number,
  totalActivos: number
): number | null {
  if (totalActivos <= 0) return null
  return Math.round((cantidadRelevados / totalActivos) * 1000) / 10
}

/**
 * Orquestador: calcula todos los indicadores de un relevamiento.
 * Toma los datos crudos y produce el objeto IndicadoresRelevamiento completo.
 */
export function calcularIndicadoresRelevamiento(
  relevamientoId: string,
  cargas: CargaOH[],
  alojamientos: AlojamientoOH[],
  totalActivos?: number
): IndicadoresRelevamiento {
  // Filtrar cargas válidas
  const cargasValidas = cargas.filter(c => c.capacidadHab > 0)
  const porcentajes = cargasValidas.map(c => c.porcentajeOH)

  // Estadísticos globales
  const global = calcularEstadisticasOH(cargas)

  // Baja actividad comercial
  const bajaActividad = calcularBajaActividad(porcentajes)

  // Cobertura
  const cobertura = totalActivos !== undefined
    ? calcularCobertura(cargasValidas.length, totalActivos)
    : null

  // Habitaciones
  const habitacionesRelevadas = cargasValidas.reduce((s, c) => s + c.capacidadHab, 0)
  const habitacionesOcupadas = Math.round(
    cargasValidas.reduce((s, c) => s + c.capacidadHab * c.porcentajeOH / 100, 0)
  )

  // Por grupo
  const porGrupo = calcularEstadisticasPorGrupo(cargas, alojamientos)

  // Distribución por rangos
  const distribucionRangos = calcularDistribucionRangos(porcentajes)

  // Picos
  const picos = calcularPicosOcupacion(cargas, alojamientos)

  const hoy = new Date()
  const fechaCalculo = hoy.getFullYear() + '-' +
    String(hoy.getMonth() + 1).padStart(2, '0') + '-' +
    String(hoy.getDate()).padStart(2, '0')

  return {
    relevamientoId,
    fechaCalculo,
    global,
    bajaActividad,
    cobertura,
    totalAlojamientosActivos: totalActivos ?? null,
    habitacionesRelevadas,
    habitacionesOcupadas,
    porGrupo,
    distribucionRangos,
    picos,
  }
}
