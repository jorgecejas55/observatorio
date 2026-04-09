/**
 * Google Apps Script — Indicadores Mensuales · Estadísticas del Destino
 * ───────────────────────────────────────────────────────────────────────
 * Escribe en la hoja "indicadores_mensual" de la planilla de estadísticas.
 * Solo escribe los valores base (AÑO, MES, OH, ESTADÍA); las columnas de
 * variación (D, E, G, H) quedan vacías para que las fórmulas existentes
 * en la planilla las calculen automáticamente.
 *
 * ── PASOS PARA ACTIVAR ────────────────────────────────────────────────────────
 *  1. Abrí la planilla:
 *     https://docs.google.com/spreadsheets/d/191cjZK9uQTPYARqAD9UYgvWjyZAJ_DDgAgip4ZkznGU
 *  2. Extensiones → Apps Script → pegá este código (reemplazá todo)
 *  3. Implementar → Nueva implementación → Tipo: Aplicación web
 *     - Ejecutar como: Yo (tu cuenta de Google)
 *     - Quién tiene acceso: Cualquier usuario
 *  4. Copiá la URL y colocala en observatorio-app/.env.local:
 *     INDICADORES_SCRIPT_URL=https://script.google.com/macros/s/.../exec
 *
 * ── ESTRUCTURA DE COLUMNAS ────────────────────────────────────────────────────
 *  A: AÑO
 *  B: MES
 *  C: OH (%)
 *  D: OH % VAR. MENSUAL  ← fórmula, se deja vacío
 *  E: OH % VAR. AÑO ANT. ← fórmula, se deja vacío
 *  F: ESTADÍA PROM. (noches)
 *  G: ESTADÍA % VAR. MENSUAL  ← fórmula, se deja vacío
 *  H: ESTADÍA % VAR. AÑO ANT. ← fórmula, se deja vacío
 */

var SPREADSHEET_ID = '191cjZK9uQTPYARqAD9UYgvWjyZAJ_DDgAgip4ZkznGU'
var SHEET_NAME     = 'indicadores_mensual'

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents)
    var sheet   = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME)

    if (!sheet) {
      throw new Error('No se encontró la hoja "' + SHEET_NAME + '".')
    }

    // Validaciones básicas
    if (!payload.ano || !payload.mes) {
      throw new Error('Faltan campos obligatorios: ano, mes.')
    }
    if (payload.oh === undefined || payload.oh === null) {
      throw new Error('Falta el campo oh.')
    }
    if (payload.estadia_prom === undefined || payload.estadia_prom === null) {
      throw new Error('Falta el campo estadia_prom.')
    }

    // Solo escribimos las columnas de datos base; las de variación tienen fórmulas
    var row = [
      payload.ano,           // A — AÑO
      payload.mes,           // B — MES
      payload.oh,            // C — OH%
      '',                    // D — VAR. MENSUAL (fórmula)
      '',                    // E — VAR. ANUAL (fórmula)
      payload.estadia_prom,  // F — ESTADÍA PROM.
    ]

    sheet.appendRow(row)

    return respuesta({ success: true })

  } catch (err) {
    return respuesta({ success: false, error: err.message })
  }
}

function respuesta(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON)
}
