/**
 * GAS de solo lectura para el historial de impacto económico.
 * Desplegar en la planilla 1VwwQ0F-zXOwFxaKsZ09xlf1XnxOLJZVOti73Q2B3S70
 * y usar la URL resultante como HISTORIAL_IMPACTO_GAS_URL en .env.local.
 *
 * Deploy: Implementar → Nueva implementación → Ejecutar como: Yo → Acceso: Cualquiera
 */

function doGet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('PRINCIPAL')
  const data = sheet.getDataRange().getValues()

  // Buscar última fila de tipo EVENTO con valores en col M (índice 12) y N (índice 13)
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][1] === 'EVENTO' && data[i][12] && data[i][13]) {
      return responder({
        evento: data[i][2],
        anio: data[i][0],
        gastoDiarioTuristas: data[i][12],
        gastoDiarioExcursionistas: data[i][13],
        excursionistas: data[i][10],
        turistasAlojados: data[i][9]
      })
    }
  }

  return responder({ error: 'Sin datos de tipo EVENTO con valores de gasto' })
}

function responder(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON)
}
