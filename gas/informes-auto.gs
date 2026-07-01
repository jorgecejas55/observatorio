/**
 * GAS de persistencia para el módulo de informes automáticos.
 *
 * SETUP:
 * 1. Crear nueva planilla Google Sheets "Informes Automáticos Observatorio"
 * 2. Crear dos hojas: "InformesAuto" y "DatosInformes"
 * 3. En "InformesAuto", fila 1:
 *    id | slug | nombre | fechaInicio | fechaFin | fechaGeneracion | usuarioGenerador | tituloPrensa | reportePrensa | estado | idInformePublico
 * 4. En "DatosInformes", fila 1:
 *    id | datosJSON
 * 5. Implementar → Nueva implementación → Ejecutar como: Yo → Acceso: Cualquiera
 * 6. Copiar URL de la Web App y configurar INFORMES_AUTO_SCRIPT_URL en .env.local
 * 7. Generar un secret aleatorio y configurar INFORMES_AUTO_SCRIPT_SECRET en .env.local
 *
 * Endpoints:
 *   GET  ?action=listar
 *   GET  ?action=obtener&id=<id>
 *   POST { action:'guardar', secret, data }
 *   POST { action:'actualizarReporte', secret, id, tituloPrensa, bajadaPrensa, reportePrensa }
 *   POST { action:'publicar', secret, id, idInformePublico }
 */

const SECRET = 'e7a3f1c89b2d4e6a8f0c1d2e3a4b5c6d7e8f9a0b1c2d'

function doGet(e) {
  const action = e?.parameter?.action ?? ''
  const id = e?.parameter?.id ?? ''

  if (action === 'listar') return listar()
  if (action === 'obtener' && id) return obtener(id)
  return responder({ error: 'Acción no válida' })
}

function doPost(e) {
  let body
  try {
    body = JSON.parse(e.postData?.contents ?? '{}')
  } catch {
    return responder({ error: 'JSON inválido' })
  }

  if (body.secret !== SECRET) {
    return responder({ error: 'No autorizado' })
  }

  if (body.action === 'guardar' && body.data) return guardar(body.data)
  if (body.action === 'actualizarReporte' && body.id) return actualizarReporte(body)
  if (body.action === 'publicar' && body.id) return publicar(body)

  return responder({ error: 'Acción no válida' })
}

// ── Listar todos los informes (sin datosJSON) ──────────────────────────────────

function listar() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('InformesAuto')
  if (!sheet) return responder({ error: 'Hoja InformesAuto no encontrada' })

  const data = sheet.getDataRange().getValues()
  if (data.length <= 1) return responder({ data: [] })

  const headers = data[0]
  const result = data.slice(1)
    .filter(row => row[0]) // solo filas con ID
    .map(row => ({
      id: row[0],
      slug: row[1],
      nombre: row[2],
      fechaInicio: row[3],
      fechaFin: row[4],
      fechaGeneracion: row[5],
      usuarioGenerador: row[6],
      estado: row[9] || 'borrador',
      idInformePublico: row[10] || '',
    }))
    .reverse() // más recientes primero

  return responder({ data: result })
}

// ── Obtener informe completo ──────────────────────────────────────────────────

function obtener(id) {
  const sheetMeta = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('InformesAuto')
  const sheetDatos = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('DatosInformes')

  if (!sheetMeta || !sheetDatos) return responder({ error: 'Hojas no encontradas' })

  // Buscar en metadatos
  const metaData = sheetMeta.getDataRange().getValues()
  const headers = metaData[0]
  const metaRow = metaData.slice(1).find(row => String(row[0]) === String(id))

  if (!metaRow) return responder({ error: 'Informe no encontrado' })

  const metadata = {
    id: metaRow[0],
    slug: metaRow[1],
    nombre: metaRow[2],
    fechaInicio: metaRow[3],
    fechaFin: metaRow[4],
    fechaGeneracion: metaRow[5],
    usuarioGenerador: metaRow[6],
    tituloPrensa: metaRow[7] || '',
    reportePrensa: metaRow[8] || '',
    estado: metaRow[9] || 'borrador',
    idInformePublico: metaRow[10] || '',
  }

  // Buscar datosJSON
  const datosData = sheetDatos.getDataRange().getValues()
  const datosRow = datosData.slice(1).find(row => String(row[0]) === String(id))

  let datos = null
  if (datosRow && datosRow[1]) {
    try {
      datos = JSON.parse(datosRow[1])
    } catch {
      datos = null
    }
  }

  return responder({ data: { ...metadata, datos } })
}

// ── Guardar o actualizar informe (upsert por slug) ────────────────────────────

function guardar(data) {
  const sheetMeta = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('InformesAuto')
  const sheetDatos = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('DatosInformes')

  if (!sheetMeta || !sheetDatos) return responder({ error: 'Hojas no encontradas' })

  const id = data.id
  const slug = data.slug

  const metaData = sheetMeta.getDataRange().getValues()
  // Buscar fila existente por slug
  const existenteIdx = metaData.slice(1).findIndex(row =>
    String(row[1]) === String(slug)
  )

  if (existenteIdx !== -1) {
    // ── Upsert: actualizar fila existente ──
    const existenteId = String(metaData[existenteIdx + 1][0])
    const actualRow = existenteIdx + 2 // +2: slice(1) + filas empiezan en 1

    // Actualizar metadatos
    sheetMeta.getRange(actualRow, 1).setValue(data.id)           // id (nuevo)
    sheetMeta.getRange(actualRow, 2).setValue(data.slug)
    sheetMeta.getRange(actualRow, 3).setValue(data.nombre)
    sheetMeta.getRange(actualRow, 4).setValue(data.fechaInicio)
    sheetMeta.getRange(actualRow, 5).setValue(data.fechaFin)
    sheetMeta.getRange(actualRow, 6).setValue(data.fechaGeneracion)
    sheetMeta.getRange(actualRow, 7).setValue(data.usuarioGenerador)
    sheetMeta.getRange(actualRow, 8).setValue(data.tituloPrensa || '')
    sheetMeta.getRange(actualRow, 9).setValue(data.reportePrensa || '')
    sheetMeta.getRange(actualRow, 10).setValue(data.estado || 'borrador')
    sheetMeta.getRange(actualRow, 11).setValue(data.idInformePublico || '')

    // Actualizar datosJSON
    const datosData = sheetDatos.getDataRange().getValues()
    const datosRowIdx = datosData.slice(1).findIndex(row => String(row[0]) === String(existenteId))
    if (datosRowIdx !== -1) {
      sheetDatos.getRange(datosRowIdx + 2, 1).setValue(data.id)  // actualizar ID también
      sheetDatos.getRange(datosRowIdx + 2, 2).setValue(JSON.stringify(data))
    }

    return responder({ success: true, data: { id: data.id, slug, actualizado: true } })
  }

  // Guardar metadatos nuevos
  sheetMeta.appendRow([
    data.id,
    data.slug,
    data.nombre,
    data.fechaInicio,
    data.fechaFin,
    data.fechaGeneracion,
    data.usuarioGenerador,
    data.tituloPrensa || '',
    data.reportePrensa || '',
    data.estado || 'borrador',
    data.idInformePublico || '',
  ])

  // Guardar datos completos
  sheetDatos.appendRow([
    data.id,
    JSON.stringify(data),
  ])

  return responder({ success: true, data: { id, slug, actualizado: false } })
}

// ── Actualizar reporte de prensa ──────────────────────────────────────────────

function actualizarReporte(body) {
  const sheetMeta = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('InformesAuto')
  const sheetDatos = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('DatosInformes')

  if (!sheetMeta || !sheetDatos) return responder({ error: 'Hojas no encontradas' })

  const data = sheetMeta.getDataRange().getValues()
  const rowIndex = data.slice(1).findIndex(row => String(row[0]) === String(body.id))

  if (rowIndex === -1) return responder({ error: 'Informe no encontrado' })

  const actualRow = rowIndex + 2 // +2 porque slice(1) y las filas empiezan en 1

  // Actualizar tituloPrensa (col H = 8) y reportePrensa (col I = 9)
  if (body.tituloPrensa !== undefined) {
    sheetMeta.getRange(actualRow, 8).setValue(body.tituloPrensa)
  }
  if (body.reportePrensa !== undefined) {
    sheetMeta.getRange(actualRow, 9).setValue(body.reportePrensa)
  }

  // También actualizar en DatosInformes (bajadaPrensa vive solo en el JSON)
  const datosData = sheetDatos.getDataRange().getValues()
  const datosRowIdx = datosData.slice(1).findIndex(row => String(row[0]) === String(body.id))
  if (datosRowIdx !== -1) {
    try {
      const jsonStr = datosData[datosRowIdx + 1][1]
      const datos = JSON.parse(jsonStr)
      if (body.tituloPrensa !== undefined) datos.tituloPrensa = body.tituloPrensa
      if (body.bajadaPrensa !== undefined) datos.bajadaPrensa = body.bajadaPrensa
      if (body.reportePrensa !== undefined) datos.reportePrensa = body.reportePrensa
      sheetDatos.getRange(datosRowIdx + 2, 2).setValue(JSON.stringify(datos))
    } catch {
      // ignorar error de parseo
    }
  }

  return responder({ success: true })
}

// ── Publicar informe ──────────────────────────────────────────────────────────

function publicar(body) {
  const sheetMeta = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('InformesAuto')

  if (!sheetMeta) return responder({ error: 'Hoja InformesAuto no encontrada' })

  const data = sheetMeta.getDataRange().getValues()
  const rowIndex = data.slice(1).findIndex(row => String(row[0]) === String(body.id))

  if (rowIndex === -1) return responder({ error: 'Informe no encontrado' })

  const actualRow = rowIndex + 2

  // Actualizar estado (col J = 10) y idInformePublico (col K = 11)
  sheetMeta.getRange(actualRow, 10).setValue('publicado')
  if (body.idInformePublico) {
    sheetMeta.getRange(actualRow, 11).setValue(body.idInformePublico)
  }

  return responder({ success: true })
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function responder(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON)
}
