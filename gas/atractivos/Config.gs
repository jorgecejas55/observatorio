// ==============================================================================
// CONFIG.GS — Configuración del módulo de Ingresos a Atractivos
// (Casa de la Puna / Pueblo Perdido de la Quebrada)
//
// - Dos planillas separadas, una por atractivo (aislamiento por planilla).
// - API key en PropertiesService (NUNCA hardcodeada en el repo).
// - Los headers de las hojas nuevas son snake_case y coinciden char a char
//   con las claves internas: la fila 1 la crea setUpPlanilla(), no a mano.
// - Las planillas legacy SOLO se leen en la migración (ver Migracion.gs).
// ==============================================================================

var ATRACTIVOS = {
  'casa-la-puna':   { spreadsheetId: '1KZMXN5plPivEs50Fkx5Ii1I1r6ieZqI1-6DQQZBuFsA' },
  'pueblo-perdido': { spreadsheetId: '18wnei7DLvhHkoF4RaUHlJyg65af9comUFQStE10HJhk' }
};

var SHEETS = {
  INGRESOS: 'Ingresos',
  ACTIVIDADES: 'Actividades Especiales',
  HISTORICO: 'Histórico'
};

// ── Headers exactos de las hojas nuevas (una fila, creados por setupPlanilla) ──

var HEADERS_INGRESOS = [
  'id', 'fecha_hora_registro', 'fecha_hora_sync', 'tipo_visitante',
  'procedencia', 'cantidad_personas', 'motivo', 'usuario_registro',
  'activo', 'usuario_modificacion', 'fecha_hora_modificacion', 'id_local'
];

var HEADERS_ACTIVIDADES = [
  'id', 'fecha_actividad', 'nombre_actividad', 'cantidad_total',
  'cantidad_turistas', 'cantidad_residentes', 'observaciones',
  'usuario_registro', 'fecha_hora_registro', 'fecha_hora_sync',
  'activo', 'usuario_modificacion', 'fecha_hora_modificacion', 'id_local'
];

var HEADERS_HISTORICO = ['fecha', 'cantidad_personas', 'origen'];

// ── Planillas legacy (solo lectura para la migración) ─────────────────────────
// Hoja principal: respuestas del Google Form de visitas guiadas.
var LEGACY = {
  'casa-la-puna': {
    spreadsheetId: '1I_Xcp5zO_zjUVwCdiVp2CjLSwMd-Zuh1rjISFQFGCJE',
    hoja: 'Casa de la Puna',
    origen: 'Casa de la Puna (form legacy)'
  },
  'pueblo-perdido': {
    spreadsheetId: '1I_Xcp5zO_zjUVwCdiVp2CjLSwMd-Zuh1rjISFQFGCJE',
    hoja: 'Pueblo Perdido de la Quebrada',
    origen: 'Pueblo Perdido de la Quebrada (form legacy)'
  }
};

// Histórico de actividades especiales (planilla separada, se abre por gid).
var LEGACY_ACTIVIDADES = {
  spreadsheetId: '1iIO6koMqjm7nfgjHpwlb3ywZ7ipdp-3d6lQQ47MPCAg',
  gid: 898182374,
  hoja: null, // se resuelve por gid en Migracion.gs
  origen: 'Actividades especiales (legacy)'
};

// Mapeo header legacy → clave interna (SOLO lectura de migración).
// Las claves van sin espacios; al leer se hace trim del header real
// (los legacy tienen doble espacio final en algunas columnas).
// ⚠️ Correr verificarHeadersLegacy() y ajustar acá si hace falta; nunca el header real.
var MAPEO_LEGACY = {
  'casa-la-puna': {
    'fecha': 'Fecha',
    'cantidad_personas': 'Cantidad de personas en la visita'
  },
  'pueblo-perdido': {
    'fecha': 'Fecha',
    'cantidad_personas': 'Cantidad de personas en la visita'
  }
};

// Mapeo para la hoja legacy de actividades especiales (gid 898182374).
// Headers reales verificados el 12/08/2026:
//   ["Marca temporal","Fecha ","Atractivo","Actividad","Cantidad de residentes",
//    "Cantidad de turistas","Total de asistentes","Responsable de carga",
//    "Capacidad","Observaciones"]
// El total de la actividad es 'Total de asistentes' (no "Cantidad de personas").
var MAPEO_LEGACY_ACTIVIDADES = {
  'fecha': 'Fecha',
  'cantidad_personas': 'Total de asistentes',
  'atractivo': 'Atractivo',
  'nombre_actividad': 'Actividad',
  'cantidad_turistas': 'Cantidad de turistas',
  'cantidad_residentes': 'Cantidad de residentes',
  'observaciones': 'Observaciones'
};

// La planilla de actividades mezcla varios espacios en la columna 'Atractivo':
// además de los dos del módulo hay "Casa de SFVC", "Dique el Jumeal" y
// "Seminario Diocesano…". Solo se migran los que están acá; el resto se ignora.
// Clave = nombre tal cual figura en la planilla, en minúsculas y sin espacios extra.
var ATRACTIVO_LEGACY_NOMBRES = {
  'casa de la puna': 'casa-la-puna',
  'pueblo perdido de la quebrada': 'pueblo-perdido'
};

/**
 * API key del script (PropertiesService — nunca hardcodeada).
 * Acepta 'ATRACTIVOS_GAS_API_KEY' (coincide con la env de Next) o 'API_KEY'
 * (nombre genérico) por compatibilidad.
 */
function getApiKey() {
  var props = PropertiesService.getScriptProperties();
  return props.getProperty('ATRACTIVOS_GAS_API_KEY') || props.getProperty('API_KEY');
}

/** Abre la planilla de un atractivo validado contra la allowlist (Config). */
function getSpreadsheetDe(atractivo) {
  var cfg = ATRACTIVOS[atractivo];
  if (!cfg) throw new Error('atractivo_invalido'); // clave interna, no texto al usuario
  return SpreadsheetApp.openById(cfg.spreadsheetId);
}

/** Apertura una hoja de un atractivo; error interno si no existe. */
function getSheetDe(atractivo, sheetName) {
  var ss = getSpreadsheetDe(atractivo);
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('hoja_no_encontrada: ' + sheetName);
  return sheet;
}

/** Valida el atractivo contra la allowlist. */
function atractivoValido(atractivo) {
  return !!atractivo && !!ATRACTIVOS[atractivo];
}

// ── Helpers de fechas / texto (patrón gas/ocupacion) ─────────────────────────

/** Fecha y hora actual formateadas en la zona del script. */
function getCurrentDateTime() {
  var now = new Date();
  return {
    date: Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    time: Utilities.formatDate(now, Session.getScriptTimeZone(), 'HH:mm:ss'),
    datetime: Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss')
  };
}

/**
 * Escribe un valor como TEXTO en una celda (formato '@'), evitando que Sheets
 * lo convierta a Date/número. Fechas/horas/cantidades quedan como texto.
 */
function setCeldaTexto(sheet, rowNum, col0, valor) {
  var cell = sheet.getRange(rowNum, col0 + 1);
  cell.setNumberFormat('@');
  cell.setValue(String(valor == null ? '' : valor));
}

/**
 * Normaliza una fecha leída del sheet a texto yyyy-MM-dd.
 * Filas viejas pueden traer Date (coerción de Sheets); las nuevas ya son texto.
 */
function normalizarFechaTexto(valor) {
  if (valor === null || valor === undefined || valor === '') return '';
  if (valor instanceof Date) {
    return Utilities.formatDate(valor, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(valor).substring(0, 10);
}