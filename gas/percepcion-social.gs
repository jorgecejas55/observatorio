/**
 * ============================================
 * GOOGLE APPS SCRIPT - ENCUESTA TURISMO SFVC
 * ============================================
 * 
 * Este script recibe los datos del formulario web
 * y los almacena en Google Sheets
 * 
 * INSTRUCCIONES DE CONFIGURACIÓN:
 * 
 * 1. Crear nueva Google Sheet con el nombre "Encuesta Percepción Social Turismo"
 * 2. Abrir Extensions > Apps Script
 * 3. Copiar este código completo
 * 4. Hacer clic en "Deploy" > "New deployment"
 * 5. Tipo: Web app
 * 6. Execute as: Me
 * 7. Who has access: Anyone
 * 8. Copiar la URL del deployment
 * 9. Pegar esa URL en PERCEPCION_SCRIPT_URL del archivo .env.local
 *
 * NOTA TÉCNICA:
 * El script usa e.parameter para leer los datos, por lo que el cliente
 * debe enviar los datos como application/x-www-form-urlencoded (NO JSON).
 * El archivo /api/calidad/percepcion/route.ts ya está configurado para esto.
 */

// ============================================
// CONFIGURACIÓN
// ============================================

const SHEET_NAME = 'Respuestas';
const LOG_SHEET_NAME = 'Registro';

// ============================================
// FUNCIÓN PRINCIPAL - POST
// ============================================

function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      setupSheet(sheet);
    }
    
    // Lee los datos enviados como form-urlencoded (e.parameter)
    const formData = e.parameter;
    
    if (!formData || Object.keys(formData).length === 0) {
      return createResponse('error', 'No se recibieron datos');
    }
    
    const rowData = [
      new Date(),
      formData.sector || '',
      formData.edad || '',
      formData.ciudad_turistica || '',
      formData.frecuencia_interaccion || '',
      formData.definicion || '',
      formData.representacion_turistica || '',
      formData.conocimiento_actividades || '',
      formData.canales_info || '',
      formData.beneficio_principal || '',
      formData.atractivo_impulsar || '',
      formData.propuesta || ''
    ];
    
    sheet.appendRow(rowData);
    logEvent('Respuesta recibida', 'success');
    return createResponse('success', 'Respuesta guardada correctamente');
    
  } catch (error) {
    logEvent('Error: ' + error.toString(), 'error');
    return createResponse('error', error.toString());
  }
}

// ============================================
// FUNCIÓN PRINCIPAL - GET (para pruebas)
// ============================================

function doGet(e) {
  return createResponse('info', 'API de Encuesta de Percepción Social del Turismo activa');
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function createResponse(status, message) {
  const response = {
    status: status,
    message: message,
    timestamp: new Date().toISOString()
  };
  
  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

function setupSheet(sheet) {
  const headers = [
    'Fecha y Hora',
    'Sector de la ciudad',
    'Edad',
    '¿Es ciudad turística?',
    'Frecuencia de interacción',
    'Definición en una palabra',
    'Representación turística',
    'Conocimiento de actividades',
    'Canales de información',
    'Beneficio principal',
    'Atractivo/Evento a impulsar',
    'Propuesta o sugerencia'
  ];

  sheet.appendRow(headers);

  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#0077b6');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
  headerRange.setHorizontalAlignment('center');

  sheet.setColumnWidth(1, 180);
  sheet.setColumnWidth(2, 120);
  sheet.setColumnWidth(3, 80);
  sheet.setColumnWidth(4, 130);
  sheet.setColumnWidth(5, 140);
  sheet.setColumnWidth(6, 150);
  sheet.setColumnWidth(7, 200);
  sheet.setColumnWidth(8, 150);
  sheet.setColumnWidth(9, 280);
  sheet.setColumnWidth(10, 300);
  sheet.setColumnWidth(11, 250);
  sheet.setColumnWidth(12, 300);
  
  sheet.setFrozenRows(1);
}

function logEvent(message, type) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let logSheet = ss.getSheetByName(LOG_SHEET_NAME);
    
    if (!logSheet) {
      logSheet = ss.insertSheet(LOG_SHEET_NAME);
      logSheet.appendRow(['Fecha y Hora', 'Tipo', 'Mensaje']);
      const headerRange = logSheet.getRange(1, 1, 1, 3);
      headerRange.setBackground('#023e8a');
      headerRange.setFontColor('#ffffff');
      headerRange.setFontWeight('bold');
      logSheet.setColumnWidth(1, 180);
      logSheet.setColumnWidth(2, 100);
      logSheet.setColumnWidth(3, 400);
    }
    
    logSheet.appendRow([new Date(), type.toUpperCase(), message]);
    
  } catch (error) {
    console.error('Error al escribir en log:', error);
  }
}

// ============================================
// FUNCIONES PARA ANÁLISIS DE DATOS
// ============================================

function createSummarySheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dataSheet = ss.getSheetByName(SHEET_NAME);
  
  if (!dataSheet) {
    Browser.msgBox('No hay datos para analizar');
    return;
  }
  
  let summarySheet = ss.getSheetByName('Resumen');
  if (summarySheet) {
    summarySheet.clear();
  } else {
    summarySheet = ss.insertSheet('Resumen');
  }
  
  summarySheet.getRange('A1').setValue('RESUMEN DE ENCUESTA - PERCEPCIÓN SOCIAL DEL TURISMO');
  summarySheet.getRange('A1:D1').merge();
  summarySheet.getRange('A1').setBackground('#0077b6').setFontColor('#ffffff').setFontWeight('bold').setFontSize(14);
  
  let row = 3;
  
  const totalResponses = dataSheet.getLastRow() - 1;
  summarySheet.getRange(`A${row}`).setValue('Total de respuestas:');
  summarySheet.getRange(`B${row}`).setValue(totalResponses);
  summarySheet.getRange(`A${row}:B${row}`).setFontWeight('bold');
  
  row += 2;
  
  summarySheet.getRange(`A${row}`).setValue('DISTRIBUCIÓN POR SECTOR');
  summarySheet.getRange(`A${row}:B${row}`).setBackground('#00b5db').setFontColor('#ffffff').setFontWeight('bold');
  row++;
  
  const sectors = ['Norte', 'Sur', 'Este', 'Oeste', 'Centro'];
  sectors.forEach(sector => {
    const count = countOccurrences(dataSheet, 2, sector);
    summarySheet.getRange(`A${row}`).setValue(sector);
    summarySheet.getRange(`B${row}`).setValue(count);
    summarySheet.getRange(`C${row}`).setValue((count / totalResponses * 100).toFixed(1) + '%');
    row++;
  });
  
  row += 2;
  
  summarySheet.getRange(`A${row}`).setValue('¿ES CIUDAD TURÍSTICA?');
  summarySheet.getRange(`A${row}:B${row}`).setBackground('#00b5db').setFontColor('#ffffff').setFontWeight('bold');
  row++;
  
  ['Sí', 'No', 'Tal vez'].forEach(option => {
    const count = countOccurrences(dataSheet, 4, option);
    summarySheet.getRange(`A${row}`).setValue(option);
    summarySheet.getRange(`B${row}`).setValue(count);
    summarySheet.getRange(`C${row}`).setValue((count / totalResponses * 100).toFixed(1) + '%');
    row++;
  });
  
  summarySheet.autoResizeColumns(1, 3);
  Browser.msgBox('Resumen creado exitosamente');
}

function countOccurrences(sheet, column, value) {
  const data = sheet.getRange(2, column, sheet.getLastRow() - 1, 1).getValues();
  return data.filter(row => row[0] === value).length;
}

function exportToCSV() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    Browser.msgBox('No hay datos para exportar');
    return;
  }
  
  const data = sheet.getDataRange().getValues();
  let csv = '';
  
  data.forEach(row => {
    csv += row.map(cell => `"${cell}"`).join(',') + '\n';
  });
  
  const folder = DriveApp.getRootFolder();
  const fileName = `Encuesta_Turismo_${new Date().toISOString().split('T')[0]}.csv`;
  const file = folder.createFile(fileName, csv, MimeType.CSV);
  
  Browser.msgBox(`Archivo exportado: ${file.getUrl()}`);
}

// ============================================
// MENÚ PERSONALIZADO
// ============================================

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📊 Análisis de Encuesta')
    .addItem('Crear Resumen', 'createSummarySheet')
    .addItem('Exportar a CSV', 'exportToCSV')
    .addSeparator()
    .addItem('Limpiar Log', 'clearLog')
    .addToUi();
}

function clearLog() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName(LOG_SHEET_NAME);
  
  if (logSheet) {
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert('¿Estás seguro?', '¿Deseas limpiar todo el registro de eventos?', ui.ButtonSet.YES_NO);
    
    if (response === ui.Button.YES) {
      logSheet.clear();
      logSheet.appendRow(['Fecha y Hora', 'Tipo', 'Mensaje']);
      const headerRange = logSheet.getRange(1, 1, 1, 3);
      headerRange.setBackground('#023e8a');
      headerRange.setFontColor('#ffffff');
      headerRange.setFontWeight('bold');
      ui.alert('Log limpiado correctamente');
    }
  }
}
