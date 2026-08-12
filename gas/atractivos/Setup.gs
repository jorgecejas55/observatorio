// ==============================================================================
// SETUP.GS — Crea las 3 hojas con los headers exactos si faltan.
// Se ejecuta a mano desde el editor (no es endpoint). Evita que un header
// tipeado a mano rompa el mapeo header ↔ clave interna.
// ==============================================================================

/** Crea (si falta) una hoja con sus headers en negrita y froze de fila 1. */
function crearHojaSiNoExiste(ss, nombre, headers) {
  var hoja = ss.getSheetByName(nombre);
  if (hoja) {
    Logger.log('ℹ️ Hoja "' + nombre + '" ya existe — no se modificó.');
    return;
  }

  hoja = ss.insertSheet(nombre);
  hoja.appendRow(headers);
  hoja.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#f97316')
    .setFontColor('#ffffff');
  hoja.setFrozenRows(1);
  Logger.log('✅ Hoja "' + nombre + '" creada con headers exactos.');
}

/** Crea las 3 hojas de un atractivo. */
function setupPlanilla(atractivo) {
  if (!atractivoValido(atractivo)) throw new Error('atractivo_invalido: ' + atractivo);

  var ss = getSpreadsheetDe(atractivo);
  crearHojaSiNoExiste(ss, SHEETS.INGRESOS, HEADERS_INGRESOS);
  crearHojaSiNoExiste(ss, SHEETS.ACTIVIDADES, HEADERS_ACTIVIDADES);
  crearHojaSiNoExiste(ss, SHEETS.HISTORICO, HEADERS_HISTORICO);

  Logger.log('✅ Setup completo para "' + atractivo + '".');
}

/** Crea las 3 hojas en ambas planillas (casa-la-puna y pueblo-perdido). */
function setupAmbasPlanillas() {
  Object.keys(ATRACTIVOS).forEach(function (a) {
    setupPlanilla(a);
  });
}