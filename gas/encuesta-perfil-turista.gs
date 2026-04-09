/**
 * Google Apps Script — Encuesta Perfil del Turista (Permanente)
 * ──────────────────────────────────────────────────────────────
 * Escribe en la hoja "Respuestas de formulario 1" de la planilla,
 * mapeando cada campo al número de columna correcto según los encabezados
 * de la fila 1. Los datos de la app se integran con los de Google Forms
 * sin modificar el orden ni el formato de las filas existentes.
 *
 * ── PASOS PARA ACTIVAR ────────────────────────────────────────────────────────
 *  1. Abrí la planilla:
 *     https://docs.google.com/spreadsheets/d/1M3mPZnra9Wu5E-RvCp6X_MgV3_MliypCOOPeMzdbNF0
 *  2. Extensiones → Apps Script → pegá este código (reemplazá todo el contenido)
 *  3. Implementar → Nueva implementación → Tipo: Aplicación web
 *     - Ejecutar como: Yo (tu cuenta de Google)
 *     - Quién tiene acceso: Cualquier usuario
 *  4. Copiá la URL y colocala en observatorio-app/.env.local:
 *     ENCUESTA_PERFIL_SCRIPT_URL=https://script.google.com/macros/s/.../exec
 *
 * ── SOBRE "MARCA TEMPORAL" ────────────────────────────────────────────────────
 *  La columna A guarda la fecha/hora del registro.
 *  El script la completa con la hora exacta del envío desde la app,
 *  con el mismo formato que usa Google Forms: DD/MM/YYYY HH:mm:ss
 *
 * ── NOTAS SOBRE ENCABEZADOS ───────────────────────────────────────────────────
 *  - "GRUPO DE VIAJE " (col 7) tiene un espacio final — así está en la hoja.
 *  - Las columnas de valoración tienen DOBLE ESPACIO después de la coma:
 *    "EN UNA ESCALA DEL 1 AL 5,  ¿CÓMO..."
 *  - "¿CU ES EL PRINCIPAL MEDIO DE MOVILIDAD..." (col 15) tiene una tilde
 *    faltante — así aparece en la hoja exportada.
 *  Verificados contra el archivo XLSX exportado de la planilla.
 */

var SPREADSHEET_ID = '1M3mPZnra9Wu5E-RvCp6X_MgV3_MliypCOOPeMzdbNF0'
var SHEET_NAME     = 'Respuestas de formulario 1'
var TIMEZONE       = 'America/Argentina/Catamarca'

/**
 * Mapeo: encabezado EXACTO de la hoja (fila 1) → clave del payload JSON.
 *
 * IMPORTANTE: Los encabezados deben coincidir carácter a carácter con los
 * de la fila 1 de la hoja (tildes, espacios y mayúsculas incluidos).
 */
var COLUMNAS = {
  // Col A — fecha/hora del registro (se convierte a Date real)
  'Marca temporal':                       'timestamp',

  // Col B — procedencia
  'PROCEDENCIA':                          'procedencia',

  // Col C–E — origen condicional (solo una tendrá valor por encuesta)
  '¿CUAL ES SU PAIS DE ORIGEN?':          'pais_origen',
  '¿CUAL ES SU PROVINCIA DE ORIGEN?':     'provincia_origen',
  '¿CUAL ES SU DEPARTAMENTO DE ORIGEN?':  'departamento_origen',

  // Col F — transporte
  'MEDIO DE TRANSPORTE UTILIZADO PARA ARRIBAR A ESTA CIUDAD': 'medio_transporte',

  // Col G — grupo de viaje (espacio final intencional — así está en la hoja)
  'GRUPO DE VIAJE ':                      'grupo_viaje',

  // Col H — cantidad de personas
  '¿CUANTAS PERSONAS INTEGRAN SU GRUPO DE VIAJE? Inclúyase en el conteo': 'cantidad_personas',

  // Col I — motivo
  'PRINCIPAL MOTIVO DE SU VISITA A LA CIUDAD': 'motivo_visita',

  // Col J — tipo de alojamiento
  'TIPO DE ALOJAMIENTO QUE ELIGIÓ':       'tipo_alojamiento',

  // Col K — cantidad de noches
  'CANTIDAD DE NOCHES QUE SE ALOJA':      'cantidad_noches',

  // Col L — lugar de captación
  'LUGAR DONDE FUE CAPTADO EL DATO':      'lugar_captado',

  // Col M — edad
  'EDAD':                                 'edad',

  // Col N — comentarios
  'COMENTARIOS Y/O SUGERENCIAS':          'comentarios',

  // Col O — movilidad en la ciudad (encabezado con tilde faltante — así está en la hoja)
  '¿CU ES EL PRINCIPAL MEDIO DE MOVILIDAD QUE USA PARA RECORRER LA CIUDAD?': 'movilidad_ciudad',

  // Col P — primera vez
  '¿VISITA LA CIUDAD POR PRIMERA VEZ?':   'primera_vez',

  // Col Q — otros destinos
  '¿PENSÓ EN OTROS DESTINOS ANTES QUE EN SFVC?': 'otros_destinos',

  // Col R — factores de decisión (valores separados por coma)
  '¿QUÉ LO AYUDÓ A DECIDIR POR SFVC?':   'factores_decision',

  // Col S–AA — matriz de valoración (doble espacio después de la coma)
  'EN UNA ESCALA DEL 1 AL 5,  ¿CÓMO VALORA LOS SIGUIENTES ASPECTOS? [SERVICIOS DE ALOJAMIENTO]':          'sat_alojamiento',
  'EN UNA ESCALA DEL 1 AL 5,  ¿CÓMO VALORA LOS SIGUIENTES ASPECTOS? [SERVICIOS DE GASTRONOMÍA]':          'sat_gastronomia',
  'EN UNA ESCALA DEL 1 AL 5,  ¿CÓMO VALORA LOS SIGUIENTES ASPECTOS? [RELACION CALIDAD/PRECIO DEL DESTINO]': 'sat_calidad_precio',
  'EN UNA ESCALA DEL 1 AL 5,  ¿CÓMO VALORA LOS SIGUIENTES ASPECTOS? [HOSPITALIDAD/TRATO RECIBIDO]':       'sat_hospitalidad',
  'EN UNA ESCALA DEL 1 AL 5,  ¿CÓMO VALORA LOS SIGUIENTES ASPECTOS? [SEGURIDAD DEL DESTINO]':             'sat_seguridad',
  'EN UNA ESCALA DEL 1 AL 5,  ¿CÓMO VALORA LOS SIGUIENTES ASPECTOS? [INFORMACIÓN TURÍSTICA DISPONIBLE]':  'sat_info_turistica',
  'EN UNA ESCALA DEL 1 AL 5,  ¿CÓMO VALORA LOS SIGUIENTES ASPECTOS? [SEÑALÉTICA Y CARTELERÍA DE ACCESO]': 'sat_senaletica',
  'EN UNA ESCALA DEL 1 AL 5,  ¿CÓMO VALORA LOS SIGUIENTES ASPECTOS? [OFERTA CULTURAL Y DE ENTRETENIMIENTO]': 'sat_oferta_cultural',
  'EN UNA ESCALA DEL 1 AL 5,  ¿CÓMO VALORA LOS SIGUIENTES ASPECTOS? [ESTADÍA GENERAL EN EL DESTINO]':    'sat_estadia_general',

  // Col AB — volvería
  '¿VISITARÍA SFVC NUEVAMENTE?':          'volveria',

  // Col AC — recomendaría
  '¿RECOMENDARÍA VISITAR SFVC?':          'recomendaria',

  // Col AD — responsable de carga
  'RESPONSABLE DE CARGA':                 'responsable_carga',
}

// ─── Punto de entrada ─────────────────────────────────────────────────────────

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents)
    var sheet   = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME)

    if (!sheet) {
      throw new Error('No se encontró la hoja "' + SHEET_NAME + '".')
    }

    var lastCol = sheet.getLastColumn()
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0]
    var row     = buildRow(payload, headers)

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
  var ahora = payload.timestamp ? new Date(payload.timestamp) : new Date()

  var row = []
  for (var i = 0; i < headers.length; i++) {
    var header   = String(headers[i])
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
