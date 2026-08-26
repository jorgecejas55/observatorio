// ==============================================================================
// TESTS.GS — Funciones de prueba manual (ejecutar desde el editor de Apps
// Script, no expuestas por doGet/doPost).
// ==============================================================================

function testGetEventos() {
  const eventos = getSheetData(SHEETS.EVENTOS);
  Logger.log('Total eventos: ' + eventos.length);
  Logger.log(eventos);
}

function testLogin() {
  const user = verifyUser('admin@admin.com', '123456');
  Logger.log(user);
}

function testDashboard() {
  const stats = calcularDashboardEventos('', '', '', '');
  Logger.log('Dashboard stats:');
  Logger.log(JSON.stringify(stats, null, 2));
}

/**
 * Diagnóstico de por qué appendRow no incrementa getLastRow(): protecciones,
 * filtros, usuario que ejecuta, y una escritura directa de control que NO
 * pasa por createRow (para aislar si el problema es el código o la hoja).
 */
function testDiagnosticoEscritura() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Logger.log('Spreadsheet: ' + ss.getName() + ' | ID: ' + ss.getId());

  const ws = ss.getSheetByName(SHEETS.EVENTOS);
  if (!ws) {
    Logger.log('❌ No se encontró la hoja "eventos". Hojas disponibles: ' + ss.getSheets().map(s => s.getName()).join(', '));
    return;
  }

  Logger.log('getLastRow() = ' + ws.getLastRow());
  Logger.log('getLastColumn() = ' + ws.getLastColumn());
  Logger.log('getMaxRows() = ' + ws.getMaxRows());
  Logger.log('getDataRange().getNumRows() = ' + ws.getDataRange().getNumRows());

  const protHoja = ws.getProtections(SpreadsheetApp.ProtectionType.SHEET);
  Logger.log('Protecciones de hoja completa: ' + protHoja.length);
  protHoja.forEach(p => {
    let editores = [];
    try { editores = p.getEditors().map(e => e.getEmail()); } catch (e) { editores = ['(no se pudo leer)']; }
    Logger.log(' - editable por: ' + editores.join(', ') + ' | dueño puede editar igual: ' + !p.canEdit());
  });

  const protRango = ws.getProtections(SpreadsheetApp.ProtectionType.RANGE);
  Logger.log('Rangos protegidos parciales: ' + protRango.length);
  protRango.forEach(p => {
    let editores = [];
    try { editores = p.getEditors().map(e => e.getEmail()); } catch (e) { editores = ['(no se pudo leer)']; }
    Logger.log(' - ' + p.getRange().getA1Notation() + ' editable por: ' + editores.join(', '));
  });

  const filtro = ws.getFilter();
  Logger.log('Filtro activo en la hoja: ' + (filtro ? filtro.getRange().getA1Notation() : 'ninguno'));

  Logger.log('Usuario efectivo ejecutando el script: ' + Session.getEffectiveUser().getEmail());
  try {
    Logger.log('Usuario activo (sesión): ' + Session.getActiveUser().getEmail());
  } catch (e) {
    Logger.log('Usuario activo (sesión): no disponible en este contexto');
  }

  // Escritura directa de control, sin pasar por createRow/Datos.gs
  const filaAntes = ws.getLastRow();
  ws.appendRow(['DIAG-' + new Date().getTime(), 'TEST-DIAGNOSTICO']);
  SpreadsheetApp.flush();
  const filaDespues = ws.getLastRow();
  Logger.log('Escritura directa — fila antes: ' + filaAntes + ' | fila después: ' + filaDespues);

  if (filaDespues > filaAntes) {
    Logger.log('✅ La escritura directa SÍ incrementó getLastRow(). Borrando fila de prueba...');
    ws.deleteRow(filaDespues);
    SpreadsheetApp.flush();
  } else {
    Logger.log('❌ La escritura directa TAMPOCO incrementó getLastRow(). El problema es de la hoja/permisos, no del código de Datos.gs.');
  }
}

/** Prueba end-to-end de escritura: crea, verifica y borra un evento de prueba. */
function testCreateRowRoundtrip() {
  const antes = getSheetData(SHEETS.EVENTOS).length;

  const creado = createRow(SHEETS.EVENTOS, {
    estado: 'Registrado',
    denominacion: '__TEST__ borrar si aparece',
    tipo: 'Incentivo'
  });

  const despues = getSheetData(SHEETS.EVENTOS).length;
  if (despues !== antes + 1) {
    throw new Error('testCreateRowRoundtrip: se esperaba ' + (antes + 1) + ' filas, hay ' + despues);
  }

  deleteRow(SHEETS.EVENTOS, creado.id);
  Logger.log('✅ testCreateRowRoundtrip OK: escritura y borrado confirmados.');
}
