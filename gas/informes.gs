/* =============================================
   GOOGLE APPS SCRIPT - INFORMES TÉCNICOS
   Sistema de gestión de informes PDF (Ocio + MICE)
   ============================================= */

const SHEET_NAME = 'Informes'
const SECRET = PropertiesService.getScriptProperties().getProperty('SECRET')

function doGet(e) {
  try {
    const action = e.parameter.action
    if (action === 'listar') return listarInformes()
    return responder({ error: 'Acción no reconocida' }, 400)
  } catch (err) {
    return responder({ error: 'Error: ' + err.message }, 500)
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents)
    if (body.secret !== SECRET) return responder({ error: 'No autorizado' }, 403)
    const action = body.action
    if (action === 'agregar') return agregarInforme(body.data)
    if (action === 'editar') return editarInforme(body.id, body.data)
    if (action === 'eliminar') return eliminarInforme(body.id)
    return responder({ error: 'Acción no reconocida' }, 400)
  } catch (err) {
    return responder({ error: 'Error: ' + err.message }, 500)
  }
}

function obtenerHoja() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  let sheet = ss.getSheetByName(SHEET_NAME)
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME)
    inicializarHoja(sheet)
  }
  return sheet
}

function inicializarHoja(sheet) {
  const encabezados = [
    'id', 'titulo', 'descripcion', 'tipo', 'subcategoria',
    'categoria', 'periodo', 'fecha', 'urlPdf', 'usuario', 'timestamp',
  ]
  sheet.appendRow(encabezados)
  sheet.getRange(1, 1, 1, encabezados.length)
    .setFontWeight('bold')
    .setBackground('#0f4c94')
    .setFontColor('#FFFFFF')

  // Forzar formato texto para evitar auto-conversión a fecha
  sheet.getRange(2, 2, sheet.getMaxRows(), 1).setNumberFormat('@') // titulo
  sheet.getRange(2, 3, sheet.getMaxRows(), 1).setNumberFormat('@') // descripcion
  sheet.getRange(2, 7, sheet.getMaxRows(), 1).setNumberFormat('@') // periodo
}

/**
 * Si Sheets convirtió texto a Date, lo devolvemos como string legible.
 * Solo se usa en columnas de texto (titulo, periodo).
 * La columna fecha se maneja aparte.
 */
function aTexto(valor) {
  if (valor instanceof Date) {
    return Utilities.formatDate(valor, 'GMT', 'MMMM yyyy')
  }
  return valor
}

function listarInformes() {
  const sheet = obtenerHoja()
  if (!sheet) return responder({ error: 'Hoja Informes no encontrada' }, 500)

  const rows = sheet.getDataRange().getValues()
  const headers = rows[0]
  const informes = rows.slice(1)
    .filter(function(r) { return r[0] !== '' })
    .map(function(r) {
      var obj = {}
      for (var i = 0; i < headers.length; i++) {
        var h = headers[i]
        var v = r[i]
        // Columna fecha: formatear como YYYY-MM-DD si es Date
        if (h === 'fecha' && v instanceof Date) {
          obj[h] = Utilities.formatDate(v, 'GMT', 'yyyy-MM-dd')
        } else if (h === 'fecha' && typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
          obj[h] = v.substring(0, 10)
        } else if (h === 'titulo' || h === 'periodo') {
          obj[h] = aTexto(v)
        } else {
          obj[h] = v
        }
      }
      return obj
    })
    .sort(function(a, b) { return new Date(b.fecha) - new Date(a.fecha) })
  return responder({ data: informes })
}

function agregarInforme(data) {
  const sheet = obtenerHoja()

  var id = Utilities.getUuid()
  var timestamp = new Date().toISOString()
  sheet.appendRow([
    id, data.titulo, data.descripcion || '', data.tipo,
    data.subcategoria, data.categoria, data.periodo,
    data.fecha, data.urlPdf, data.usuario, timestamp,
  ])
  // Forzar texto plano en columnas que Sheets podría convertir a fecha
  var fila = sheet.getLastRow()
  sheet.getRange(fila, 2).setNumberFormat('@') // titulo
  sheet.getRange(fila, 7).setNumberFormat('@') // periodo
  return responder({ success: true, id })
}

function editarInforme(id, data) {
  const sheet = obtenerHoja()
  var rows = sheet.getDataRange().getValues()
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) {
      var fila = i + 1
      sheet.getRange(fila, 2).setValue(data.titulo)
      sheet.getRange(fila, 2).setNumberFormat('@')
      sheet.getRange(fila, 3).setValue(data.descripcion || '')
      sheet.getRange(fila, 4).setValue(data.tipo)
      sheet.getRange(fila, 5).setValue(data.subcategoria)
      sheet.getRange(fila, 6).setValue(data.categoria)
      sheet.getRange(fila, 7).setValue(data.periodo)
      sheet.getRange(fila, 7).setNumberFormat('@')
      sheet.getRange(fila, 8).setValue(data.fecha)
      sheet.getRange(fila, 9).setValue(data.urlPdf)
      return responder({ success: true })
    }
  }
  return responder({ error: 'Informe no encontrado' }, 404)
}

function eliminarInforme(id) {
  const sheet = obtenerHoja()

  var rows = sheet.getDataRange().getValues()
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) {
      sheet.deleteRow(i + 1)
      return responder({ success: true })
    }
  }
  return responder({ error: 'Informe no encontrado' }, 404)
}

function responder(obj, code) {
  code = code || 200
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON)
}
