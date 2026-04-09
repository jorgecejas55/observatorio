/**
 * Google Apps Script — Encuesta de Demanda · Turismo de Eventos
 * ──────────────────────────────────────────────────────────────
 * Escribe en la hoja existente "Respuestas de formulario 1" de la planilla,
 * mapeando cada campo al número de columna correcto según los encabezados
 * de la fila 1. Los datos de nuestra app se integran con los de Google Forms
 * sin modificar el orden ni formato de las filas existentes.
 *
 * ── PASOS PARA ACTIVAR ────────────────────────────────────────────────────────
 *  1. Abrí la planilla:
 *     https://docs.google.com/spreadsheets/d/1DKihpmJyUIEx1QzwY3gxgMcRq2z44GBtW6ekEVkw1Cc
 *  2. Extensiones → Apps Script → pegá este código (reemplazá todo)
 *  3. Antes de deployar: agregá la columna EVENTO en la hoja (puede ir al final,
 *     en la primera columna vacía después de RESPONSABLE DE CARGA).
 *     El script la encontrará automáticamente por nombre.
 *  4. Implementar → Nueva implementación → Tipo: Aplicación web
 *     - Ejecutar como: Yo (tu cuenta de Google)
 *     - Quién tiene acceso: Cualquier usuario
 *  5. Copiá la URL y colocala en observatorio-app/.env.local:
 *     ENCUESTA_DEMANDA_SCRIPT_URL=https://script.google.com/macros/s/...
 *
 * ── SOBRE "MARCA TEMPORAL" ────────────────────────────────────────────────────
 *  La columna A ("Marca temporal") guarda la fecha/hora del registro.
 *  El script la completa con la hora exacta del envío desde la app,
 *  con el mismo formato que usa Google Forms: DD/MM/YYYY HH:mm:ss
 */

var SPREADSHEET_ID = '1DKihpmJyUIEx1QzwY3gxgMcRq2z44GBtW6ekEVkw1Cc'
var SHEET_NAME     = 'Respuestas de formulario 1'
var TIMEZONE       = 'America/Argentina/Catamarca'

/**
 * Mapeo: encabezado EXACTO de la hoja → clave del payload JSON.
 *
 * IMPORTANTE: Los encabezados deben coincidir carácter por carácter
 * con los de la fila 1 de la hoja (tildes, espacios, mayúsculas incluidos).
 * Verificados contra el archivo XLSX exportado.
 *
 * Nota: "GRUPO DE VIAJE " tiene un espacio final — así está en la hoja.
 * Nota: Las columnas de la matriz tienen DOBLE ESPACIO después de la coma.
 */
var COLUMNAS = {
  // Col A — fecha/hora del registro
  'Marca temporal': 'timestamp',

  // Col B–C — preguntas en orden de la hoja (PROCEDENCIA va antes que TIPO en el sheet)
  'PROCEDENCIA':                          'procedencia',
  'TIPO DE PARTICIPANTE':                 'tipo_participante',

  // Col D–F — origen condicional
  '¿CUAL ES SU PAIS DE ORIGEN?':          'pais_origen',
  '¿CUAL ES SU PROVINCIA DE ORIGEN?':     'provincia_origen',
  '¿CUAL ES SU DEPARTAMENTO DE ORIGEN?':  'departamento_origen',

  // Col G–I
  'EDAD':                                 'edad',
  'MEDIO DE TRANSPORTE UTILIZADO PARA ARRIBAR A ESTA CIUDAD': 'medio_transporte',
  'GRUPO DE VIAJE ':                      'grupo_viaje',   // ← espacio final intencional

  // Col J–L
  'TIPO DE ALOJAMIENTO QUE ELIGIÓ':                    'tipo_alojamiento',
  'CANTIDAD DE NOCHES QUE SE ALOJA EN LA CIUDAD':      'cantidad_noches',
  '¿CON QUÉ FRECUENCIA VISITA ESTA CIUDAD?':           'frecuencia_visita',

  // Col M–O
  '¿TIENE PENSADO RECORRER LA CIUDAD?':                'recorrer_ciudad',
  '¿QUÉ ACTIVIDADES REALIZÓ O REALIZARÁ DURANTE SU ESTADÍA?': 'actividades',
  '¿DE QUÉ FORMA ORGANIZÓ EL VIAJE?':                  'forma_organizacion',

  // Col P–U — matriz de evaluación (doble espacio después de la coma)
  'EN UNA ESCALA DEL 1 AL 5,  ¿CÓMO VALORA LOS SIGUIENTES ASPECTOS? [SEDE DE LA REUNIÓN]':          'sat_sede',
  'EN UNA ESCALA DEL 1 AL 5,  ¿CÓMO VALORA LOS SIGUIENTES ASPECTOS? [ORGANIZACIÓN DEL EVENTO]':     'sat_organizacion',
  'EN UNA ESCALA DEL 1 AL 5,  ¿CÓMO VALORA LOS SIGUIENTES ASPECTOS? [SERVICIOS DE ALOJAMIENTO]':    'sat_alojamiento',
  'EN UNA ESCALA DEL 1 AL 5,  ¿CÓMO VALORA LOS SIGUIENTES ASPECTOS? [SERVICIOS DE GASTRONOMÍA]':    'sat_gastronomia',
  'EN UNA ESCALA DEL 1 AL 5,  ¿CÓMO VALORA LOS SIGUIENTES ASPECTOS? [SERVICIOS DE TRANSPORTE]':     'sat_transporte',
  'EN UNA ESCALA DEL 1 AL 5,  ¿CÓMO VALORA LOS SIGUIENTES ASPECTOS? [HOSPITALIDAD/TRATO RECIBIDO]': 'sat_hospitalidad',

  // Col V–X
  '¿VISITARÍA SFVC NUEVAMENTE?':          'volveria',
  '¿RECOMENDARÍA VISITAR SFVC?':          'recomendaria',
  'COMENTARIOS Y/O SUGERENCIAS':          'comentarios',

  // Col Y
  'RESPONSABLE DE CARGA':                 'responsable_carga',

  // Col extra (agregar manualmente al final de la hoja antes de deployar)
  'EVENTO':                               'evento',
}

// ─── Punto de entrada ─────────────────────────────────────────────────────────

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents)
    var sheet   = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME)

    if (!sheet) {
      throw new Error('No se encontró la hoja "' + SHEET_NAME + '".')
    }

    // Leer encabezados actuales (fila 1, todas las columnas)
    var lastCol  = sheet.getLastColumn()
    var headers  = sheet.getRange(1, 1, 1, lastCol).getValues()[0]
    var row      = buildRow(payload, headers)

    sheet.appendRow(row)

    return respuesta({ success: true })

  } catch (err) {
    return respuesta({ success: false, error: err.message })
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Construye la fila respetando el orden de columnas de la hoja.
 * Columnas sin coincidencia en COLUMNAS quedan vacías.
 */
function buildRow(payload, headers) {
  // Convertir timestamp ISO a Date de GAS para que Sheets lo almacene
  // con el mismo formato que Google Forms (DD/MM/YYYY HH:mm:ss)
  var ahora = payload.timestamp ? new Date(payload.timestamp) : new Date()

  var row = []
  for (var i = 0; i < headers.length; i++) {
    var header   = String(headers[i])     // preservar espacios exactos
    var fieldKey = COLUMNAS[header]

    if (fieldKey === undefined) {
      row.push('')
      continue
    }

    if (fieldKey === 'timestamp') {
      // Guardar como fecha real para que Sheets aplique el formato de celda
      row.push(ahora)
      continue
    }

    var val = payload[fieldKey]
    row.push(val !== undefined && val !== null ? val : '')
  }
  return row
}

function respuesta(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON)
}
