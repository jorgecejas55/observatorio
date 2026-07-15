// ==============================================================================
// CONFIG.GS - Configuración del sistema OBS_Admin (permisos de usuarios)
// Backend de usuarios/permisos del Observatorio: rol global + módulos por email.
// ==============================================================================

const CONFIG = {
  // ID de la hoja de cálculo OBS_Admin (crear el spreadsheet y pegar el ID acá)
  SPREADSHEET_ID: 'PENDIENTE_SPREADSHEET_ID',

  // Nombres de las hojas
  SHEETS: {
    USUARIOS: 'Usuarios',
    AUDITORIA: 'Auditoria'
  },

  // API Key compartida con Next.js para proteger el endpoint
  API_KEY: 'obsadmin_338da0a5bf9cb7382dbd54905ef78aecff2854b807fa90f2',

  // Roles válidos del sistema
  ROLES: ['admin', 'operador'],

  // Columnas de cada hoja (índice empezando en 0)
  //
  // Hoja Usuarios:
  // ID, Email (lowercase, clave de upsert), Nombre, Rol (admin|operador),
  // Modulos (CSV), Activo (TRUE/FALSE), CreatedAt, UpdatedAt
  //
  COLS: {
    USUARIOS: {
      ID: 0,
      EMAIL: 1,
      NOMBRE: 2,
      ROL: 3,
      MODULOS: 4,
      ACTIVO: 5,
      CREATED_AT: 6,
      UPDATED_AT: 7
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
 * Valida la API Key contra la configurada
 */
function validateApiKey(apiKey) {
  if (!apiKey || apiKey !== CONFIG.API_KEY) {
    throw new Error('API Key inválida o no proporcionada');
  }
}
