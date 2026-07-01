// ==============================================================================
// CONFIG.GS - Configuración del Sistema de Ocupación Hotelera (Observatorio)
// Versión recortada: solo Capital, sin Alojamientos/Auth/Municipios
// ==============================================================================

const CONFIG = {
  // ID de la hoja de cálculo (NUEVO sheet del Observatorio)
  SPREADSHEET_ID: 'PENDIENTE_CREAR_SPREADSHEET',

  // Nombres de las hojas
  SHEETS: {
    RELEVAMIENTOS: 'Relevamientos',
    CARGAS: 'CargasOH',
    AUDITORIA: 'Auditoria'
  },

  // API Key compartida con Next.js para proteger el endpoint
  API_KEY: 'PENDIENTE_CONFIGURAR_API_KEY',

  // Estados de relevamiento
  ESTADOS_RELEVAMIENTO: {
    EN_CURSO: 'EN_CURSO',
    CERRADO: 'CERRADO'
  },

  // Columnas de cada hoja (índice empezando en 0)
  //
  // Hoja Relevamientos:
  // ID, Tipo, Nombre, FechaInicio, FechaFin, Estado, FechaCreacion,
  // UsuarioCreador, FechaCierre, UsuarioCierre, OHTotal, OHMin, OHMax,
  // OHModa, CantidadRelevados
  //
  COLS: {
    RELEVAMIENTOS: {
      ID: 0,
      TIPO: 1,
      NOMBRE: 2,
      FECHA_INICIO: 3,
      FECHA_FIN: 4,
      ESTADO: 5,
      FECHA_CREACION: 6,
      USUARIO_CREADOR: 7,
      FECHA_CIERRE: 8,
      USUARIO_CIERRE: 9,
      OH_TOTAL: 10,
      OH_MIN: 11,
      OH_MAX: 12,
      OH_MODA: 13,
      CANTIDAD_RELEVADOS: 14
    },

    // Hoja CargasOH:
    // ID, RelevamientoID, AlojamientoID, AlojamientoNombre, Tipo,
    // Categoria, PorcentajeOH, FechaCarga, HoraCarga, UsuarioCarga,
    // CapacidadHab
    //
    // Tipo y Categoria son snapshot del alojamiento al momento de la carga.
    // Permiten calcular OH por tipo/categoría sin JOIN con Alojamientos
    // y respetar el principio "sin datos ≠ 0%".
    //
    CARGAS: {
      ID: 0,
      RELEVAMIENTO_ID: 1,
      ALOJAMIENTO_ID: 2,
      ALOJAMIENTO_NOMBRE: 3,
      TIPO: 4,
      CATEGORIA: 5,
      PORCENTAJE_OH: 6,
      FECHA_CARGA: 7,
      HORA_CARGA: 8,
      USUARIO_CARGA: 9,
      CAPACIDAD_HAB: 10
    },

    // Hoja Auditoria:
    // Timestamp, Email, Accion, Detalle
    AUDITORIA: {
      TIMESTAMP: 0,
      EMAIL: 1,
      ACCION: 2,
      DETALLE: 3
    }
  }
};

/**
 * Obtiene el objeto Spreadsheet
 */
function getSpreadsheet() {
  try {
    return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  } catch (e) {
    throw new Error('No se pudo acceder a la hoja de cálculo. Verifica el SPREADSHEET_ID: ' + e.message);
  }
}

/**
 * Obtiene una hoja específica por nombre
 */
function getSheet(sheetName) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    throw new Error('No se encontró la hoja: ' + sheetName);
  }

  return sheet;
}

/**
 * Obtiene el siguiente ID disponible en una hoja
 */
function getNextId(sheetName) {
  const sheet = getSheet(sheetName);
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return 1;
  }

  const lastId = sheet.getRange(lastRow, 1).getValue();
  return parseInt(lastId) + 1;
}

/**
 * Convierte una fila de datos en objeto con headers
 */
function rowToObject(headers, row) {
  const obj = {};
  for (let i = 0; i < headers.length; i++) {
    if (headers[i]) {
      obj[headers[i]] = row[i] !== undefined && row[i] !== null ? row[i] : '';
    }
  }
  return obj;
}

/**
 * Obtiene la fecha y hora actual formateadas
 */
function getCurrentDateTime() {
  const now = new Date();
  return {
    date: Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    time: Utilities.formatDate(now, Session.getScriptTimeZone(), 'HH:mm:ss'),
    datetime: Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss')
  };
}

/**
 * Escribe un valor como TEXTO en una celda (formato '@'), evitando que Sheets
 * lo convierta a Date/número. Se usa para fechas 'yyyy-MM-dd' y horas 'HH:mm:ss'
 * de modo que siempre se lean con el mismo formato (sin ISO ni timezone).
 */
function setCeldaTexto(sheet, rowNum, col0, valor) {
  var cell = sheet.getRange(rowNum, col0 + 1);
  cell.setNumberFormat('@');
  cell.setValue(String(valor == null ? '' : valor));
}

/**
 * Valida la API Key contra la configurada
 */
function validateApiKey(apiKey) {
  if (!apiKey || apiKey !== CONFIG.API_KEY) {
    throw new Error('API Key inválida o no proporcionada');
  }
}
