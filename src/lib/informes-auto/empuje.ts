/**
 * Empuje de resultados de informes hacia la planilla histórica maestra
 * (191cjZK9..., hojas indicadores_findes / indicadores_mensual).
 *
 * El sistema es el PRODUCTOR ÚNICO de la serie: al generar/regenerar un
 * informe se hace upsert del registro correspondiente. Las columnas de
 * variación de indicadores_mensual (D, E, G, H) son fórmulas de la propia
 * planilla y NUNCA se tocan (el GAS solo escribe C, F, I, J).
 *
 * Patrón no-bloqueante: si el empuje falla, el informe NO se revierte;
 * el resultado se persiste en datosJSON y la UI ofrece reintentar.
 */

import type { InformeFindeCompleto, ResultadoEmpuje } from '@/lib/informes-auto/types'

const MESES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
]

export async function empujarAPlanillaMaestra(
  informe: InformeFindeCompleto
): Promise<ResultadoEmpuje> {
  const tipo = informe.tipoInforme ?? 'FSL'
  const destino = tipo === 'MENSUAL' ? 'indicadores_mensual' : 'indicadores_findes'
  const fecha = new Date().toISOString()

  const url = process.env.INDICADORES_SCRIPT_URL
  const apiKey = process.env.INDICADORES_GAS_API_KEY

  if (!url || url === 'PENDIENTE') {
    return { ok: false, destino, fecha, error: 'INDICADORES_SCRIPT_URL no configurada' }
  }
  if (!apiKey || apiKey === 'PENDIENTE') {
    return { ok: false, destino, fecha, error: 'INDICADORES_GAS_API_KEY no configurada' }
  }

  const anio = Number(informe.fechaInicio.slice(0, 4))
  const mesNumero = Number(informe.fechaInicio.slice(5, 7))
  const mes = MESES[mesNumero - 1] ?? ''

  const data = {
    anio,
    mes,
    evento: informe.nombre,
    oh: informe.relevamiento.ohTotal,
    estadiaProm: informe.perfil.estadiaSinOutliers.estadiaPromedio,
    visitantes: informe.impacto.visitantesTotales,
    impacto: informe.impacto.impactoTotal,
  }

  const action = tipo === 'MENSUAL' ? 'upsertMensual' : 'upsertFinde'

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ apiKey, action, data }),
      redirect: 'follow',
    })

    const text = await res.text()
    if (text.trim().startsWith('<')) {
      // El GAS devolvió HTML (login/error) con status 200
      return { ok: false, destino, fecha, error: 'El GAS de indicadores devolvió HTML (¿deploy /exec con acceso "Cualquiera"?)' }
    }

    const json = JSON.parse(text)
    if (!json.success) {
      return { ok: false, destino, fecha, error: String(json.error ?? 'Error desconocido del GAS') }
    }
    return { ok: true, destino, fecha }
  } catch (error) {
    return { ok: false, destino, fecha, error: error instanceof Error ? error.message : String(error) }
  }
}
