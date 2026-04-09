/**
 * Helper para parsear respuestas JSON de Google Sheets
 * Extrae el JSON válido de la respuesta envuelta de gviz
 */
export function parseGoogleSheetsJSON(text: string): any {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')

  if (start === -1 || end === -1) {
    throw new Error('Respuesta inválida de Google Sheets: no se encontró JSON')
  }

  return JSON.parse(text.slice(start, end + 1))
}

/**
 * Fetch a Google Sheets con parsing automático
 * @param sheetId - ID de la planilla de Google Sheets
 * @param sheetName - Nombre de la hoja
 * @param revalidate - Segundos de caché (opcional)
 */
export async function fetchGoogleSheet(
  sheetId: string,
  sheetName: string,
  revalidate = 300
): Promise<any> {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`

  const response = await fetch(url, { next: { revalidate } })

  if (!response.ok) {
    throw new Error(`Error al obtener datos de Google Sheets: ${response.statusText}`)
  }

  const text = await response.text()
  return parseGoogleSheetsJSON(text)
}
