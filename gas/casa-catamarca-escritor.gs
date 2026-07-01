/**
 * Google Apps Script — Encuesta Casa de Catamarca (Buenos Aires)
 * ──────────────────────────────────────────────────────────────
 * Escribe en la hoja "Respuestas" de la planilla dedicada,
 * mapeando cada campo al nombre del encabezado en la fila 1.
 *
 * ── PASOS PARA ACTIVAR ────────────────────────────────────────────────────────
 *  1. Crear planilla nueva en Google Sheets:
 *     Nombre: "Observatorio — Encuesta Casa de Catamarca (BsAs)"
 *  2. Extensiones → Apps Script → pegar este código (reemplazar todo)
 *  3. Configurar SPREADSHEET_ID abajo (el ID de la planilla del paso 1)
 *  4. Ejecutar bootstrapColumnas() UNA VEZ desde el editor para crear encabezados
 *  5. Guardar API_KEY en ScriptProperties:
 *       Ejecutar → setApiKey() → ingresar el token cuando pida
 *     O desde el editor: Archivo → Propiedades del proyecto → Propiedades de secuencia de comandos
 *       Agregar propiedad: CASA_CATAMARCA_API_KEY = <token aleatorio largo>
 *  6. Implementar → Nueva implementación → Tipo: Aplicación web
 *     - Ejecutar como: Yo (tu cuenta de Google)
 *     - Quién tiene acceso: Cualquier usuario
 *  7. Copiar URL y colocarla en observatorio-app/.env.local:
 *     CASA_CATAMARCA_SCRIPT_URL=https://script.google.com/macros/s/.../exec
 *
 * ── NOTAS ─────────────────────────────────────────────────────────────────────
 *  - bootstrapColumnas() es IDEMPOTENTE: crea encabezados si la hoja está vacía,
 *    agrega columnas nuevas si faltan, NUNCA borra columnas existentes.
 *  - Columnas de fecha se escriben con setNumberFormat('@') para evitar coerción
 *    a serial numérico con offset de zona horaria.
 *  - La resolución de columnas es POR ENCABEZADO (no por índice), permitiendo
 *    reordenar columnas sin romper el script.
 */

var SPREADSHEET_ID = '<CAMBIAR_POR_ID_DE_LA_PLANILLA>'
var SHEET_NAME     = 'Respuestas'
var TIMEZONE       = 'America/Argentina/Catamarca'

/**
 * Mapeo ORDENADO de columnas: encabezado → clave del payload JSON.
 *
 * Cada entrada: { header, key, formato }
 *   - header:  texto exacto que va en la fila 1 de la hoja
 *   - key:     clave esperada en el JSON del POST
 *   - formato: 'text' → fuerza setNumberFormat('@') antes de escribir
 *              (útil para timestamps y valores que Sheets podría interpretar como fecha)
 */
var COLUMNAS = [
  { header: 'Marca temporal',                       key: 'timestamp',                        formato: 'text' },
  { header: 'Procedencia',                          key: 'procedencia',                      formato: null },
  { header: 'País de origen',                       key: 'pais_origen',                      formato: null },
  { header: 'Provincia de origen',                  key: 'provincia_origen',                 formato: null },
  { header: 'Departamento de origen',               key: 'departamento_origen',              formato: null },
  { header: 'Localidad de origen',                  key: 'localidad_origen',                 formato: null },
  { header: 'Rango de edad',                        key: 'rango_edad',                       formato: null },
  { header: 'Con quién viajaría',                   key: 'viaje_con',                        formato: null },
  { header: 'Con quién viajaría (otro)',            key: 'viaje_con_otro_texto',             formato: null },
  { header: 'Duración habitual del viaje',          key: 'duracion_viaje',                   formato: null },
  { header: 'Etapa respecto al viaje',              key: 'etapa_viaje',                      formato: null },
  { header: 'Conocía Catamarca antes',              key: 'conocia_catamarca',                formato: null },
  { header: 'Intereses en Catamarca',               key: 'intereses',                        formato: null },
  { header: 'Intereses (otro)',                     key: 'intereses_otro_texto',             formato: null },
  { header: 'Lugar que le gustaría conocer',        key: 'lugar_imperdible',                 formato: null },
  { header: 'Cómo se enteró de Catamarca',          key: 'como_se_entero',                   formato: null },
  { header: 'Cómo se enteró (otro)',                key: 'como_se_entero_otro_texto',        formato: null },
  { header: 'Dónde busca info de viajes',           key: 'donde_busca_info',                 formato: null },
  { header: 'Dónde busca info (otro)',              key: 'donde_busca_info_otro_texto',      formato: null },
  { header: 'Red social más usada para inspirarse', key: 'red_social_inspiracion',           formato: null },
  { header: 'Red social (otra)',                    key: 'red_social_otra_texto',            formato: null },
  { header: 'Dudas o dificultades para viajar',     key: 'dudas_dificultades',               formato: null },
  { header: 'Probabilidad de viajar (1-10)',        key: 'probabilidad_viaje',               formato: null },
  { header: 'Interés en visitar la capital',        key: 'interes_capital',                  formato: null },
  { header: 'Actividades en la capital',            key: 'actividades_capital',              formato: null },
  { header: 'Actividades en la capital (otro)',     key: 'actividades_capital_otro_texto',   formato: null },
  { header: 'Días en la capital',                   key: 'dias_en_capital',                  formato: null },
  { header: 'Expectativas en la capital',           key: 'expectativas_capital',             formato: null },
  { header: 'Falta de información sobre Catamarca', key: 'falta_info',                       formato: null },
  { header: 'Qué lo haría decidirse hoy',           key: 'motivador_decision',               formato: null },
  { header: 'Experiencias deseadas',                key: 'experiencias_deseadas',            formato: null },
  { header: 'Acepta recibir info turística',        key: 'acepta_info',                      formato: null },
  { header: 'Email de contacto',                    key: 'email_contacto',                   formato: null },
  { header: 'Responsable de carga',                 key: 'responsable_carga',                formato: null },
  { header: 'Canal de carga',                       key: 'canal_carga',                      formato: null },
  { header: 'ID de respuesta',                      key: 'id',                               formato: null },
]

// ─── Punto de entrada ─────────────────────────────────────────────────────────

function doPost(e) {
  try {
    var API_KEY = PropertiesService.getScriptProperties().getProperty('CASA_CATAMARCA_API_KEY')

    var body = JSON.parse(e.postData.contents)

    // Validar API key
    if (!API_KEY || body.apiKey !== API_KEY) {
      return jsonOut({ ok: false, error: 'unauthorized' })
    }

    var id = Utilities.getUuid()
    var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME)

    if (!sheet) {
      throw new Error('No se encontró la hoja "' + SHEET_NAME + '". Ejecutá bootstrapColumnas() primero.')
    }

    var lastCol = sheet.getLastColumn()
    if (lastCol === 0) {
      throw new Error('La hoja está vacía. Ejecutá bootstrapColumnas() primero.')
    }

    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0]

    // Construir fila mapeando cada encabezado a su clave
    var row = []
    for (var i = 0; i < headers.length; i++) {
      var header = String(headers[i]).trim()
      var found  = false

      for (var j = 0; j < COLUMNAS.length; j++) {
        if (COLUMNAS[j].header === header) {
          var key = COLUMNAS[j].key

          if (key === 'id') {
            row.push(id)
          } else if (key === 'timestamp') {
            // Formatear como texto DD/MM/YYYY HH:mm:ss (hora AR)
            var ts = body[key] ? new Date(body[key]) : new Date()
            var formatted = Utilities.formatDate(ts, TIMEZONE, 'dd/MM/yyyy HH:mm:ss')
            row.push(formatted)
          } else {
            var val = body[key]
            row.push(val !== undefined && val !== null ? val : '')
          }
          found = true
          break
        }
      }

      if (!found) {
        row.push('')
      }
    }

    // Append y corrección de formato texto en columnas marcadas
    var newRowIndex = sheet.getLastRow() + 1
    sheet.appendRow(row)

    // Post-append: forzar formato texto en columnas marcadas como 'text'
    for (var c = 0; c < headers.length; c++) {
      for (var k = 0; k < COLUMNAS.length; k++) {
        if (COLUMNAS[k].header === String(headers[c]).trim() && COLUMNAS[k].formato === 'text') {
          sheet.getRange(newRowIndex, c + 1).setNumberFormat('@')
          break
        }
      }
    }

    return jsonOut({ ok: true, id: id })

  } catch (err) {
    return jsonOut({ ok: false, error: err.message })
  }
}

// ─── Bootstrap de columnas (idempotente) ──────────────────────────────────────

/**
 * Crea o normaliza la fila 1 de la hoja "Respuestas" con los encabezados exactos.
 * - Si la hoja está vacía: escribe todos los encabezados de una vez.
 * - Si la hoja ya tiene encabezados: agrega al final los que falten.
 * - NUNCA borra ni reordena columnas existentes.
 *
 * Se ejecuta MANUALMENTE desde el editor (botón "Ejecutar").
 * Se puede re-ejecutar en el futuro si se agregan columnas al array COLUMNAS.
 */
function bootstrapColumnas() {
  var ss     = SpreadsheetApp.openById(SPREADSHEET_ID)
  var sheet  = ss.getSheetByName(SHEET_NAME)

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME)
  }

  var lastCol = sheet.getLastColumn()

  if (lastCol === 0) {
    // Hoja vacía → escribir todos los encabezados de una vez
    var todos = COLUMNAS.map(function(c) { return c.header })
    sheet.getRange(1, 1, 1, todos.length).setValues([todos])
    sheet.getRange(1, 1, 1, todos.length).setFontWeight('bold')
    Logger.log('bootstrapColumnas: se crearon ' + todos.length + ' columnas.')
    return
  }

  // Hoja con datos → leer encabezados existentes y agregar los que falten
  var existingHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0]
  var existingSet = {}
  for (var i = 0; i < existingHeaders.length; i++) {
    existingSet[String(existingHeaders[i]).trim()] = true
  }

  var faltantes = []
  for (var j = 0; j < COLUMNAS.length; j++) {
    if (!existingSet[COLUMNAS[j].header]) {
      faltantes.push(COLUMNAS[j].header)
    }
  }

  if (faltantes.length === 0) {
    Logger.log('bootstrapColumnas: todos los encabezados ya existen. Nada que hacer.')
    return
  }

  // Agregar faltantes al final
  var startCol = lastCol + 1
  sheet.getRange(1, startCol, 1, faltantes.length).setValues([faltantes])
  sheet.getRange(1, startCol, 1, faltantes.length).setFontWeight('bold')
  Logger.log('bootstrapColumnas: se agregaron ' + faltantes.length + ' columnas nuevas: ' + faltantes.join(', '))
}

// ─── Set API Key ──────────────────────────────────────────────────────────────

/**
 * Guarda la API key en ScriptProperties.
 * Ejecutar UNA VEZ desde el editor (seleccionar función setApiKey → Ejecutar).
 */
function setApiKey() {
  var ui = SpreadsheetApp.getUi()
  var response = ui.prompt(
    'Configurar API Key',
    'Pegá el token CASA_CATAMARCA_API_KEY:',
    ui.ButtonSet.OK_CANCEL
  )

  if (response.getSelectedButton() === ui.Button.OK) {
    var key = response.getResponseText().trim()
    if (key) {
      PropertiesService.getScriptProperties().setProperty('CASA_CATAMARCA_API_KEY', key)
      ui.alert('API Key guardada correctamente.')
    } else {
      ui.alert('Error: la key no puede estar vacía.')
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON)
}
