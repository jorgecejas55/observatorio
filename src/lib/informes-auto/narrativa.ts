/**
 * Generación de reporte de prensa asistido por IA (Claude API).
 * Prompt builder tipado + parser de respuesta con etiquetas XML.
 * Solo se usa server-side desde API Routes.
 */

import type { InformeFindeCompleto, FindeTendencia, ResumenActividades } from '@/lib/informes-auto/types'

// ── Prompt Builder ─────────────────────────────────────────────────────────────

export function construirPromptReporte(
  informe: InformeFindeCompleto,
  tendencia?: FindeTendencia[],
  resumenActividades?: ResumenActividades
): string {
  const { nombre, fechaInicio, fechaFin, relevamiento, ohPorTipo, picos, perfil, impacto, comparativaUltimoFinde, comparativaAnioAnterior } = informe

  const fechaIni = new Date(fechaInicio).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })
  const fechaEnd = new Date(fechaFin).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
  const year = fechaInicio.slice(0, 4)

  const ohPorTipoStr = ohPorTipo
    .map(g => `  - ${g.tipo}: ${g.ohPorcentaje}%`)
    .join('\n')

  // Top 1-2 tipos de alojamiento para la apertura institucional
  const topAlojamientos = [...ohPorTipo]
    .sort((a, b) => b.ohPorcentaje - a.ohPorcentaje)
    .slice(0, 2)

  const topProvincias = perfil.provinciasFrecuentes.slice(0, 3)
    .map(p => `  - ${p.nombre} (${perfil.totalEncuestas > 0 ? Math.round(p.cantidad / perfil.totalEncuestas * 100) : 0}%)`)
    .join('\n')

  const topMotivos = perfil.motivosVisita.slice(0, 3)
    .map(m => `  - ${m.nombre} (${perfil.totalEncuestas > 0 ? Math.round(m.cantidad / perfil.totalEncuestas * 100) : 0}%)`)
    .join('\n')

  const topGrupos = perfil.gruposViaje.slice(0, 3)
    .map(g => `  - ${g.nombre} (${perfil.totalEncuestas > 0 ? Math.round(g.cantidad / perfil.totalEncuestas * 100) : 0}%)`)
    .join('\n')

  const topTransporte = perfil.mediosTransporte.slice(0, 3)
    .map(t => `  - ${t.nombre} (${perfil.totalEncuestas > 0 ? Math.round(t.cantidad / perfil.totalEncuestas * 100) : 0}%)`)
    .join('\n')

  const pctPrimeraVez = perfil.totalEncuestas > 0
    ? Math.round((perfil.primeraVez['SI'] ?? 0) / perfil.totalEncuestas * 100)
    : 0
  const pctNoOtrosDestinos = perfil.totalEncuestas > 0
    ? Math.round((perfil.otrosDestinos['NO'] ?? 0) / perfil.totalEncuestas * 100)
    : 0
  const pctRecomendaria = perfil.totalEncuestas > 0
    ? Math.round((perfil.recomendaria?.['SI'] ?? 0) / perfil.totalEncuestas * 100)
    : 0
  const pctVolveria = perfil.totalEncuestas > 0
    ? Math.round(((perfil.volveria?.['MUY PROBABLE'] ?? 0) / perfil.totalEncuestas) * 100)
    : 0

  const compUltimo = comparativaUltimoFinde.relevamiento
    ? `- Último finde del año: "${comparativaUltimoFinde.relevamiento.nombre}" (OH: ${comparativaUltimoFinde.relevamiento.ohTotal}%)`
    : '- Último finde del año: no disponible'

  const compAnterior = comparativaAnioAnterior.relevamiento
    ? `- Mismo finde año anterior: "${comparativaAnioAnterior.relevamiento.nombre}" (OH: ${comparativaAnioAnterior.relevamiento.ohTotal}%)`
    : comparativaAnioAnterior.advertencia
      ? `- Mismo finde año anterior: no disponible (${comparativaAnioAnterior.advertencia})`
      : '- Mismo finde año anterior: no disponible'

  // ── Tendencia del año en curso ──────────────────────────────────────────────
  let tendenciaStr = ''
  if (tendencia && tendencia.length > 0) {
    const lineasTendencia = tendencia.map(f =>
      `  - "${f.evento}": OH ${f.oh}%, estadía ${f.estadia_prom} noches, ${f.visitantes.toLocaleString('es-AR')} visitantes`
    ).join('\n')

    const promOH = Math.round(tendencia.reduce((s, f) => s + f.oh, 0) / tendencia.length)
    const promEstadia = (tendencia.reduce((s, f) => s + f.estadia_prom, 0) / tendencia.length).toFixed(1)

    tendenciaStr = `
## Tendencia del año en curso (${year})
Registros de fines de semana largos de ${year} anteriores al actual, ordenados cronológicamente:
${lineasTendencia}

Promedios parciales del año (sin contar este finde): OH ${promOH}%, estadía ${promEstadia} noches.`
  }

  // ── Propuesta de actividades ────────────────────────────────────────────────
  let actividadesStr = ''
  if (resumenActividades && resumenActividades.total > 0) {
    const tematicasTop = resumenActividades.porTematica.slice(0, 3)
      .map(t => `${t.nombre} (${t.cantidad})`)
      .join(', ')
    const destacadasStr = resumenActividades.destacadas.length > 0
      ? `\nActividades destacadas: ${resumenActividades.destacadas.join('; ')}.`
      : ''

    actividadesStr = `
## Propuesta de actividades durante el finde
La Secretaría de Turismo y Desarrollo Económico puso a disposición ${resumenActividades.total} actividades vigentes durante este fin de semana (${resumenActividades.permanentes} permanentes y ${resumenActividades.ocasionales} ocasionales).
Principales temáticas: ${tematicasTop}.${destacadasStr}

Mencioná a nivel general la oferta de actividades que la Secretaría puso a disposición durante el finde, sin enumerar cada actividad. Destacá la diversidad de la propuesta y su aporte a la experiencia turística.`
  }

  // ── Picos de ocupación ───────────────────────────────────────────────────────────
  let picosStr = ''
  if (picos && picos.picoMaximo) {
    const topPicos = picos.porTipo.slice(0, 3)
      .map(p => `  - ${p.tipoCategoria}: pico de ${p.ohMaximo}%`)
      .join('\n')
    picosStr = `
## Picos de ocupación (máximos por establecimiento — SIN nombres)
Pico máximo del relevamiento: ${picos.picoMaximo.ohMaximo}% (alcanzado por alojamientos del tipo "${picos.picoMaximo.tipoCategoria}").
Máximos por tipo y categoría:
${topPicos}

Al describir la ocupación hotelera del fin de semana, además del promedio (${relevamiento.ohTotal}%), mencioná que se registraron picos de hasta ${picos.picoMaximo.ohMaximo}% en algunos alojamientos del tipo "${picos.picoMaximo.tipoCategoria}". Podés citar uno o dos máximos adicionales por tipo/categoría. REGLA ESTRICTA: referite SIEMPRE solo al tipo y la categoría del alojamiento, NUNCA al nombre de ningún establecimiento.`
  }

  return `Sos el equipo de comunicación del Observatorio de Turismo Municipal de San Fernando del Valle de Catamarca (SFVC), Argentina. Redactá una gacetilla de prensa profesional sobre el desempeño turístico de un fin de semana largo, lista para enviar al área de Comunicación y derivar a diarios digitales.

## Tono y estilo
- Periodístico, accesible, español argentino.
- Lenguaje ciudadano: que cualquier vecino o vecina de Catamarca entienda el impacto del turismo en su ciudad.
- Criterio técnico pero sin tecnicismos excesivos.
- Destacar lo positivo sin ocultar comparativas desfavorables.
- NO incluir sugerencias, recomendaciones ni desafíos a futuro (son cuestiones técnicas internas).
- NUNCA menciones el nombre de un alojamiento. Al referirte a ocupación, picos o tipologías, usá SOLO el tipo y la categoría (ej. "hoteles de 3 estrellas", "apart hoteles").

## Mención institucional obligatoria
En el párrafo de apertura, mencionar SIEMPRE que el estudio de Ocupación Hotelera es realizado en conjunto entre el Observatorio de Turismo Municipal, dependiente de la Secretaría de Turismo y Desarrollo Económico de la Municipalidad de San Fernando del Valle de Catamarca, y la Asociación Civil de Empresarios Hoteleros y Gastronómicos de Catamarca.

## Datos del período
- Nombre del fin de semana: "${nombre}"
- Fechas: ${fechaIni} al ${fechaEnd}
- Año: ${year}

## Indicadores principales
- Ocupación hotelera total: ${relevamiento.ohTotal}%
- Estadía promedio: ${perfil.estadiaSinOutliers.estadiaPromedio.toFixed(1)} noches (basada en ${perfil.estadiaSinOutliers.n} encuestas)
- Visitantes totales estimados: ${impacto.visitantesTotales.toLocaleString('es-AR')}
  - Turistas alojados: ${impacto.turistasAlojados.toLocaleString('es-AR')}
  - Excursionistas: ${impacto.excursionistas.toLocaleString('es-AR')}
- Impacto económico total estimado: $${impacto.impactoTotal.toLocaleString('es-AR')}
- Gasto diario promedio por turista: $${informe.gastoDiarioTuristas.toLocaleString('es-AR')}
- Gasto diario promedio por excursionista: $${informe.gastoDiarioExcursionistas.toLocaleString('es-AR')}

## Ocupación hotelera por tipo de alojamiento
${ohPorTipoStr}
Tipología más elegida: ${topAlojamientos.map(t => `${t.tipo} (${t.ohPorcentaje}%)`).join(' y ')}
${picosStr}

## Perfil del visitante (${perfil.totalEncuestas} encuestas)
- Procedencia nacional: ${perfil.totalEncuestas > 0 ? Math.round((perfil.procedencia.NACIONAL ?? 0) / perfil.totalEncuestas * 100) : 0}%
- Procedencia provincial: ${perfil.totalEncuestas > 0 ? Math.round((perfil.procedencia.PROVINCIAL ?? 0) / perfil.totalEncuestas * 100) : 0}%
- Procedencia internacional: ${perfil.totalEncuestas > 0 ? Math.round((perfil.procedencia.INTERNACIONAL ?? 0) / perfil.totalEncuestas * 100) : 0}%
- Top 3 provincias de origen:\n${topProvincias}
- Principal motivo de visita:\n${topMotivos}
- Grupo de viaje:\n${topGrupos}
- Medio de transporte:\n${topTransporte}
- Primera vez en SFVC: ${pctPrimeraVez}%
- No consideró otros destinos: ${pctNoOtrosDestinos}%
- Recomendaría SFVC: ${pctRecomendaria}%
- Volvería a SFVC (muy probable): ${pctVolveria}%
${tendenciaStr}
${actividadesStr}

## Comparativas
${compUltimo}
${compAnterior}

## Estructura de la gacetilla
Redactá siguiendo EXACTAMENTE esta anatomía:

1. **Titular** — frase de impacto con la cifra principal de ocupación o visitantes.
2. **Bajada / copete** — 2 líneas con visitantes + gasto diario promedio.
3. **Párrafo de apertura institucional** — Secretaría de Turismo y Desarrollo Económico + Observatorio + Asociación de Empresarios Hoteleros y Gastronómicos; período; impacto económico estimado; visitantes totales; estadía promedio; ocupación hotelera; y tipología de alojamiento más elegida (top 1–2 de OH por tipo).
4. **Párrafo de permanencia + gasto** — la estadía promedio como indicador de posicionamiento y el gasto diario por visitante, con sectores movilizados (alojamiento, gastronomía, comercio, servicios).
5. **Subtítulo "Perfil del Turista"** + 1–2 párrafos — grupo de viaje, transporte, procedencia (% nacional + provincias top), motivo de visita principal (y religioso si aplica).
6. **Párrafo de posicionamiento** — % primera vez en SFVC, % que no consideró otros destinos, % que recomendaría y volvería.
7. **Párrafo de propuesta de actividades** (si hay datos disponibles) — a nivel general, la oferta que la Secretaría puso a disposición durante el finde, sin enumerar cada actividad.
8. **Párrafo de cierre / comparativa** — variación respecto del finde largo anterior, en tono institucional. Sin sugerencias ni desafíos.
9. **Línea final fija:** "Por más información, consultar en https://observatorio.sfvc.tur.ar/".

## Instrucciones de salida
Respondé EXACTAMENTE con el siguiente formato XML. No agregues texto fuera de las etiquetas.

<titulo>
Frase de impacto con la cifra principal. Máximo una línea.
</titulo>

<bajada>
Dos líneas con visitantes + gasto diario promedio. Resumen atractivo para el copete.
</bajada>

<reporte_prensa>
Cuerpo completo de la gacetilla (párrafos 3 al 9 de la estructura anterior). Incluir la mención institucional obligatoria en el primer párrafo. NO incluir título ni bajada acá (ya van en sus propias etiquetas). La última línea debe ser siempre: "Por más información, consultar en https://observatorio.sfvc.tur.ar/".
</reporte_prensa>`
}

// ── Parser de Respuesta ────────────────────────────────────────────────────────

export function parsearReporteIA(respuesta: string): {
  titulo: string
  bajada: string
  reportePrensa: string
} {
  const tituloMatch = respuesta.match(/<titulo>([\s\S]*?)<\/titulo>/)
  const bajadaMatch = respuesta.match(/<bajada>([\s\S]*?)<\/bajada>/)
  const reporteMatch = respuesta.match(/<reporte_prensa>([\s\S]*?)<\/reporte_prensa>/)

  return {
    titulo: tituloMatch?.[1]?.trim() ?? '',
    bajada: bajadaMatch?.[1]?.trim() ?? '',
    reportePrensa: reporteMatch?.[1]?.trim() ?? respuesta.trim(),
  }
}

// ── Llamada a API de IA (Anthropic o DeepSeek) ────────────────────────────────

export async function generarReporteConIA(
  informe: InformeFindeCompleto,
  tendencia?: FindeTendencia[],
  resumenActividades?: ResumenActividades
): Promise<{
  titulo: string
  bajada: string
  reportePrensa: string
  generadoConIA: boolean
}> {
  const prompt = construirPromptReporte(informe, tendencia, resumenActividades)

  // DeepSeek como proveedor primario (Anthropic suele estar sin crédito).
  const deepseekKey = process.env.DEEPSEEK_API_KEY
  if (deepseekKey && deepseekKey !== 'PENDIENTE') {
    const result = await llamarDeepSeek(prompt, deepseekKey)
    if (result) return { ...result, generadoConIA: true }
  }

  // Fallback a Anthropic (se usa cuando haya créditos cargados).
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (anthropicKey && anthropicKey !== 'PENDIENTE') {
    const result = await llamarAnthropic(prompt, anthropicKey)
    if (result) return { ...result, generadoConIA: true }
  }

  console.warn('Ningún proveedor de IA generó contenido — usando placeholder (no se persistirá)')
  return { ...generarPlaceholder(informe), generadoConIA: false }
}

async function llamarAnthropic(prompt: string, apiKey: string): Promise<{
  titulo: string
  bajada: string
  reportePrensa: string
} | null> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Claude API error:', response.status, errText.slice(0, 300))
      return null
    }

    const json = await response.json()
    const texto = json.content?.[0]?.text ?? ''
    return parsearReporteIA(texto)
  } catch (error) {
    console.error('Error llamando a Claude API:', error)
    return null
  }
}

async function llamarDeepSeek(prompt: string, apiKey: string): Promise<{
  titulo: string
  bajada: string
  reportePrensa: string
} | null> {
  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        max_tokens: 3000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('DeepSeek API error:', response.status, errText.slice(0, 300))
      return null
    }

    const json = await response.json()
    const texto = json.choices?.[0]?.message?.content ?? ''
    return parsearReporteIA(texto)
  } catch (error) {
    console.error('Error llamando a DeepSeek API:', error)
    return null
  }
}

function generarPlaceholder(informe: InformeFindeCompleto): {
  titulo: string
  bajada: string
  reportePrensa: string
} {
  const ohTotal = informe.relevamiento.ohTotal
  const visitantes = informe.impacto.visitantesTotales.toLocaleString('es-AR')
  const impactoTotal = informe.impacto.impactoTotal.toLocaleString('es-AR')

  return {
    titulo: `${informe.nombre}: San Fernando del Valle de Catamarca registró un ${ohTotal}% de ocupación hotelera`,
    bajada: `Durante "${informe.nombre}" se recibieron ${visitantes} visitantes, con un gasto diario promedio de $${informe.gastoDiarioTuristas.toLocaleString('es-AR')} por turista.`,
    reportePrensa: `[Reporte de prensa pendiente de generación con IA — configurar ANTHROPIC_API_KEY en .env.local]\n\nLa Secretaría de Turismo y Desarrollo Económico de la Municipalidad de San Fernando del Valle de Catamarca, a través del Observatorio de Turismo Municipal y en conjunto con la Asociación Civil de Empresarios Hoteleros y Gastronómicos de Catamarca, informa que durante "${informe.nombre}" se registró una ocupación hotelera del ${ohTotal}%, con un impacto económico estimado de $${impactoTotal}.\n\nPor más información, consultar en https://observatorio.sfvc.tur.ar/.`,
  }
}
