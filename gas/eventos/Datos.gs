// ==============================================================================
// DATOS.GS — Utilidades genéricas de lectura/escritura sobre hojas del
// spreadsheet (getSheetData / createRow / updateRow / deleteRow).
//
// Todas leen los headers reales de la fila 1 en runtime — no una lista fija —
// así que toleran columnas heredadas que ya no se usan (ver Config.gs).
// ==============================================================================

/** Obtener datos de una hoja como array de objetos. */
function getSheetData(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ws = ss.getSheetByName(sheetName);

  if (!ws) throw new Error(`Hoja "${sheetName}" no encontrada`);

  const data = ws.getDataRange().getValues();
  if (data.length === 0) return [];

  const headers = data.shift(); // Primera fila son headers

  return data.map(row => {
    let obj = {};
    headers.forEach((header, index) => {
      // Convertir fechas a ISO string si es necesario
      if (row[index] instanceof Date) {
        obj[header] = row[index].toISOString().split('T')[0]; // YYYY-MM-DD
      } else {
        obj[header] = row[index];
      }
    });
    return obj;
  });
}

/** Crear nueva fila. Lanza error si no puede confirmar que la fila quedó escrita. */
function createRow(sheetName, dataObj) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ws = ss.getSheetByName(sheetName);

  if (!ws) throw new Error(`Hoja "${sheetName}" no encontrada`);

  // Asegurar ID
  if (!dataObj.id) {
    dataObj.id = Utilities.getUuid();
  }

  // Headers actuales
  const lastCol = ws.getLastColumn();
  if (lastCol === 0) {
    throw new Error(`Hoja "${sheetName}" no tiene headers (fila 1 vacía). Ejecutar setup().`);
  }
  const headers = ws.getRange(1, 1, 1, lastCol).getValues()[0];
  if (headers.every(h => h === '')) {
    throw new Error(`Hoja "${sheetName}" tiene headers vacíos. Ejecutar setup().`);
  }

  const newRow = [];
  headers.forEach(header => {
    // Convertir null/undefined a string vacío, mantener valores falsy como 0
    let value = dataObj[header];
    if (value === null || value === undefined) {
      value = '';
    }
    newRow.push(value);
  });

  // NO usar ws.appendRow(): con un filtro activo en la hoja (Datos > Crear un
  // filtro) appendRow() falla en silencio y no agrega nada, sin lanzar error
  // (bug conocido de Apps Script). Escribir explícitamente en la fila
  // siguiente con setValues() evita ese problema.
  const rowsAntes = ws.getLastRow();
  const filaNueva = rowsAntes + 1;
  ws.getRange(filaNueva, 1, 1, newRow.length).setValues([newRow]);
  SpreadsheetApp.flush(); // fuerza a persistir el write antes de responder

  // Verificar que realmente se agregó la fila (detecta no-ops silenciosos)
  const rowsDespues = ws.getLastRow();
  if (rowsDespues <= rowsAntes) {
    throw new Error(`No se pudo agregar la fila en "${sheetName}" (la escritura no incrementó el total de filas).`);
  }

  return dataObj;
}

/** Actualizar fila por ID. */
function updateRow(sheetName, id, dataObj) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ws = ss.getSheetByName(sheetName);

  if (!ws) throw new Error(`Hoja "${sheetName}" no encontrada`);

  const data = ws.getDataRange().getValues();
  if (data.length === 0) throw new Error('La hoja está vacía');

  const headers = data[0];
  const idColIndex = headers.indexOf('id');

  if (idColIndex === -1) throw new Error('Columna "id" no encontrada');

  // Buscar índice de la fila
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][idColIndex] == id) {
      rowIndex = i + 1; // +1 porque sheet es 1-based
      break;
    }
  }

  if (rowIndex === -1) throw new Error('Registro no encontrado para actualizar');

  // Actualizar celdas (mantener valores anteriores si no se especifica nuevo valor)
  const currentRow = data[rowIndex - 1];
  const updatedRow = [];

  // Campos de auditoría que NUNCA deben sobrescribirse
  const protectedFields = ['creado_por', 'fecha_creacion'];

  headers.forEach((header, colIndex) => {
    let newValue = dataObj[header];

    // PROTECCIÓN: Nunca sobrescribir campos de auditoría de creación
    if (protectedFields.includes(header)) {
      newValue = currentRow[colIndex];
    }
    // Si no viene en el update (undefined), mantener valor anterior
    // Pero SI permitir null y '' para borrar datos
    else if (newValue === undefined) {
      newValue = currentRow[colIndex];
    }
    // Si es null o '', convertir a string vacío para permitir borrado
    else if (newValue === null) {
      newValue = '';
    }

    updatedRow.push(newValue);
  });

  ws.getRange(rowIndex, 1, 1, updatedRow.length).setValues([updatedRow]);
  SpreadsheetApp.flush(); // fuerza a persistir el write antes de responder

  return { ...dataObj, id };
}

/** Eliminar fila por ID. */
function deleteRow(sheetName, id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ws = ss.getSheetByName(sheetName);

  if (!ws) throw new Error(`Hoja "${sheetName}" no encontrada`);

  const data = ws.getDataRange().getValues();
  if (data.length === 0) throw new Error('La hoja está vacía');

  const headers = data[0];
  const idColIndex = headers.indexOf('id');

  if (idColIndex === -1) throw new Error('Columna "id" no encontrada');

  for (let i = 1; i < data.length; i++) {
    if (data[i][idColIndex] == id) {
      ws.deleteRow(i + 1);
      SpreadsheetApp.flush();
      return true;
    }
  }

  throw new Error('Registro no encontrado para eliminar');
}
