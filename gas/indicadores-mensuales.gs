/**
 * Google Apps Script — Indicadores · Planilla histórica maestra
 * ───────────────────────────────────────────────────────────────────────
 * Escribe en la planilla de estadísticas del destino (191cjZK9...):
 *   - "indicadores_mensual": serie mensual de OH/estadía + visitantes/impacto
 *   - "indicadores_findes":  serie de findes largos y eventos
 *
 * Acciones POST:
 *   1. (legacy, sin action) carga manual desde /estadisticas/indicadores:
 *      { ano, mes, oh, estadia_prom }  → appendRow en indicadores_mensual
 *   2. { apiKey, action: 'upsertMensual', data: { anio, mes, oh, estadiaProm, visitantes, impacto } }
 *      → upsert por AÑO+MES. Escribe SOLO C (OH), F (ESTADÍA), I (VISITANTES),
 *        J (IMPACTO). Las columnas D, E, G, H son FÓRMULAS de la planilla y
 *        NUNCA se tocan.
 *   3. { apiKey, action: 'upsertFinde', data: { anio, mes, evento, oh, estadiaProm, visitantes, impacto } }
 *      → upsert por AÑO + slug(EVENTO) en indicadores_findes
 *        (A AÑO | B MES | C EVENTO | D OH | E ESTADÍA | F VISITANTES | G IMPACTO).
 *
 * ── PASOS PARA (RE)ACTIVAR ────────────────────────────────────────────────────
 *  1. Abrí la planilla:
 *     https://docs.google.com/spreadsheets/d/191cjZK9uQTPYARqAD9UYgvWjyZAJ_DDgAgip4ZkznGU
 *  2. Extensiones → Apps Script → pegá este código (reemplazá todo)
 *  3. Reemplazá API_KEY por un secreto real (el mismo que INDICADORES_GAS_API_KEY)
 *  4. Implementar → Nueva implementación → Aplicación web
 *     - Ejecutar como: Yo · Acceso: Cualquier usuario
 *  5. En observatorio-app/.env.local:
 *     INDICADORES_SCRIPT_URL=https://script.google.com/macros/s/.../exec
 *     INDICADORES_GAS_API_KEY=<el mismo secreto del paso 3>
 *
 * ── ESTRUCTURA indicadores_mensual ────────────────────────────────────────────
 *  A: AÑO
 *  B: MES
 *  C: OH (%)
 *  D: OH % VAR. MENSUAL   ← fórmula, NO tocar
 *  E: OH % VAR. AÑO ANT.  ← fórmula, NO tocar
 *  F: ESTADÍA PROM. (noches)
 *  G: ESTADÍA % VAR. MENSUAL   ← fórmula, NO tocar
 *  H: ESTADÍA % VAR. AÑO ANT.  ← fórmula, NO tocar
 *  I: VISITANTES
 *  J: IMPACTO ECONÓMICO
 */

var SPREADSHEET_ID = '191cjZK9uQTPYARqAD9UYgvWjyZAJ_DDgAgip4ZkznGU'
var SHEET_MENSUAL  = 'indicadores_mensual'
var SHEET_FINDES   = 'indicadores_findes'

// Secreto compartido con Next.js (INDICADORES_GAS_API_KEY). Solo para los upsert.
var API_KEY = 'PENDIENTE_API_KEY'

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents)

    // ── Acciones nuevas (empuje desde informes-auto, protegidas por apiKey) ──
    if (payload.action === 'upsertMensual' || payload.action === 'upsertFinde') {
      if (!payload.apiKey || payload.apiKey !== API_KEY) {
        throw new Error('API Key inválida o no proporcionada.')
      }
      var data = payload.data || {}
      if (payload.action === 'upsertMensual') {
        return respuesta(upsertMensual(data))
      }
      return respuesta(upsertFinde(data))
    }

    // ── Acción legacy: carga manual de indicadores mensuales ──
    return respuesta(cargaLegacy(payload))

  } catch (err) {
    return respuesta({ success: false, error: err.message })
  }
}

// ── Carga manual legacy (formulario /estadisticas/indicadores) ────────────────

function cargaLegacy(payload) {
  var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_MENSUAL)
  if (!sheet) {
    throw new Error('No se encontró la hoja "' + SHEET_MENSUAL + '".')
  }

  if (!payload.ano || !payload.mes) {
    throw new Error('Faltan campos obligatorios: ano, mes.')
  }
  if (payload.oh === undefined || payload.oh === null) {
    throw new Error('Falta el campo oh.')
  }
  if (payload.estadia_prom === undefined || payload.estadia_prom === null) {
    throw new Error('Falta el campo estadia_prom.')
  }

  // Solo columnas de datos base; las de variación tienen fórmulas
  sheet.appendRow([
    payload.ano,           // A — AÑO
    payload.mes,           // B — MES
    payload.oh,            // C — OH%
    '',                    // D — VAR. MENSUAL (fórmula)
    '',                    // E — VAR. ANUAL (fórmula)
    payload.estadia_prom,  // F — ESTADÍA PROM.
  ])

  return { success: true }
}

// ── Upsert mensual (empuje de informes MENSUAL) ───────────────────────────────

function upsertMensual(data) {
  var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_MENSUAL)
  if (!sheet) throw new Error('No se encontró la hoja "' + SHEET_MENSUAL + '".')

  if (!data.anio || !data.mes) throw new Error('Faltan campos: anio, mes.')

  var valores = sheet.getDataRange().getValues()
  var filaExistente = -1 // índice 1-based de la fila en la hoja

  for (var i = 1; i < valores.length; i++) {
    var anioFila = Number(valores[i][0])
    var mesFila = normalizarMes(valores[i][1])
    if (anioFila === Number(data.anio) && mesFila === normalizarMes(data.mes)) {
      filaExistente = i + 1
      break
    }
  }

  if (filaExistente !== -1) {
    // SOLO C, F, I, J — las columnas D, E, G, H son fórmulas de la planilla
    sheet.getRange(filaExistente, 3).setValue(data.oh)           // C — OH
    sheet.getRange(filaExistente, 6).setValue(data.estadiaProm)  // F — ESTADÍA
    sheet.getRange(filaExistente, 9).setValue(data.visitantes)   // I — VISITANTES
    sheet.getRange(filaExistente, 10).setValue(data.impacto)     // J — IMPACTO
    return { success: true, data: { hoja: SHEET_MENSUAL, fila: filaExistente, actualizado: true } }
  }

  sheet.appendRow([
    data.anio,         // A
    data.mes,          // B
    data.oh,           // C
    '',                // D — fórmula
    '',                // E — fórmula
    data.estadiaProm,  // F
    '',                // G — fórmula
    '',                // H — fórmula
    data.visitantes,   // I
    data.impacto,      // J
  ])
  return { success: true, data: { hoja: SHEET_MENSUAL, fila: sheet.getLastRow(), actualizado: false } }
}

// ── Upsert finde/evento (empuje de informes FSL y EVENTO) ─────────────────────

function upsertFinde(data) {
  var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_FINDES)
  if (!sheet) throw new Error('No se encontró la hoja "' + SHEET_FINDES + '".')

  if (!data.anio || !data.evento) throw new Error('Faltan campos: anio, evento.')

  var slugNuevo = slug(data.evento)
  var valores = sheet.getDataRange().getValues()
  var filaExistente = -1

  for (var i = 1; i < valores.length; i++) {
    var anioFila = Number(valores[i][0])
    if (anioFila === Number(data.anio) && slug(String(valores[i][2])) === slugNuevo) {
      filaExistente = i + 1
      break
    }
  }

  if (filaExistente !== -1) {
    sheet.getRange(filaExistente, 2).setValue(data.mes)          // B — MES
    sheet.getRange(filaExistente, 4).setValue(data.oh)           // D — OH
    sheet.getRange(filaExistente, 5).setValue(data.estadiaProm)  // E — ESTADÍA
    sheet.getRange(filaExistente, 6).setValue(data.visitantes)   // F — VISITANTES
    sheet.getRange(filaExistente, 7).setValue(data.impacto)      // G — IMPACTO
    return { success: true, data: { hoja: SHEET_FINDES, fila: filaExistente, actualizado: true } }
  }

  sheet.appendRow([
    data.anio,         // A
    data.mes,          // B
    data.evento,       // C
    data.oh,           // D
    data.estadiaProm,  // E
    data.visitantes,   // F
    data.impacto,      // G
  ])
  return { success: true, data: { hoja: SHEET_FINDES, fila: sheet.getLastRow(), actualizado: false } }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Normaliza nombre de mes para comparar: mayúsculas, sin acentos ni espacios. */
function normalizarMes(mes) {
  return String(mes || '')
    .toUpperCase()
    .replace(/[ÁÀÄÂ]/g, 'A').replace(/[ÉÈËÊ]/g, 'E').replace(/[ÍÌÏÎ]/g, 'I')
    .replace(/[ÓÒÖÔ]/g, 'O').replace(/[ÚÙÜÛ]/g, 'U')
    .replace(/\s+/g, '')
}

/** Slug de evento para el matching del upsert (mismo criterio que Next.js). */
function slug(texto) {
  return String(texto || '')
    .toLowerCase()
    .replace(/[áàäâ]/g, 'a').replace(/[éèëê]/g, 'e').replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o').replace(/[úùüû]/g, 'u').replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function respuesta(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON)
}
