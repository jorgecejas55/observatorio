// ==============================================================================
// DRIVE.GS — Gestión de archivos en Google Drive para eventos turísticos.
//
// Los archivos se guardan en subcarpetas por evento dentro de DRIVE_FOLDER_ID.
// La lista de archivos se persiste en la columna "archivos_drive" del evento
// como un JSON array con { fileId, url, nombre }.
// ==============================================================================

/**
 * Sube un archivo a Drive y actualiza "archivos_drive" en la fila del evento.
 */
function subirArchivoEvento(eventoId, base64, mimeType, nombre) {
  var rootFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);

  var eventoFolder;
  var iter = rootFolder.getFoldersByName(eventoId);
  if (iter.hasNext()) {
    eventoFolder = iter.next();
  } else {
    eventoFolder = rootFolder.createFolder(eventoId);
  }

  var blob = Utilities.newBlob(Utilities.base64Decode(base64), mimeType, nombre);
  var file = eventoFolder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  var nuevoArchivo = {
    fileId: file.getId(),
    url: 'https://drive.google.com/file/d/' + file.getId() + '/view',
    nombre: nombre
  };

  // Leer archivos actuales y agregar el nuevo
  var archivos = leerArchivosEvento(eventoId);
  archivos.push(nuevoArchivo);
  updateRow(SHEETS.EVENTOS, eventoId, { archivos_drive: JSON.stringify(archivos) });

  return { archivos: archivos };
}

/**
 * Mueve un archivo a la papelera y lo quita de la lista del evento.
 */
function eliminarArchivoEvento(eventoId, fileId) {
  try {
    DriveApp.getFileById(fileId).setTrashed(true);
  } catch (err) {
    Logger.log('No se pudo mover a papelera el archivo ' + fileId + ': ' + err.toString());
  }

  var archivos = leerArchivosEvento(eventoId).filter(function(a) { return a.fileId !== fileId; });
  updateRow(SHEETS.EVENTOS, eventoId, { archivos_drive: JSON.stringify(archivos) });

  return { archivos: archivos };
}

/** Lee el array de archivos del evento desde la hoja. */
function leerArchivosEvento(eventoId) {
  var eventos = getSheetData(SHEETS.EVENTOS);
  var evento = eventos.filter(function(e) { return e.id === eventoId; })[0];
  if (!evento || !evento.archivos_drive) return [];
  try {
    return JSON.parse(evento.archivos_drive);
  } catch (e) {
    return [];
  }
}

/**
 * Agrega la columna "archivos_drive" a la hoja de eventos si no existe.
 * Ejecutar una sola vez desde el editor de Apps Script.
 */
function setupColumnArchivosDrive() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ws = ss.getSheetByName(SHEETS.EVENTOS);
  if (!ws) { Logger.log('Hoja eventos no encontrada'); return; }

  var headers = ws.getRange(1, 1, 1, ws.getLastColumn()).getValues()[0];
  if (headers.indexOf('archivos_drive') !== -1) {
    Logger.log('La columna archivos_drive ya existe');
    return;
  }

  var newCol = ws.getLastColumn() + 1;
  ws.getRange(1, newCol).setValue('archivos_drive');
  Logger.log('Columna archivos_drive agregada en columna ' + newCol);
}
