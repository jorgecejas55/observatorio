// ==============================================================================
// DATOS.GS — CRUD genérico sobre una hoja, mapeando por header de fila 1.
// Ingresos.gs / Actividades.gs son envoltorios finos (campos + validaciones).
// ==============================================================================

/** Lee los headers de la fila 1. */
function getHeaders(sheet) {
  var ultimaCol = sheet.getLastColumn();
  if (ultimaCol < 1) return [];
  return sheet.getRange(1, 1, 1, ultimaCol).getValues()[0];
}

/** Convierte un bloque de valores en objetos con claves = headers. */
function objetoDesdeFilas(headers, valores) {
  var resultado = [];
  for (var r = 0; r < valores.length; r++) {
    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      var header = headers[c];
      if (!header) continue;
      var v = valores[r][c];
      obj[header] = (v === undefined || v === null) ? '' : v;
    }
    resultado.push(obj);
  }
  return resultado;
}

/** Fila activa = activo !== 'FALSE' (borrado lógico). */
function esFilaActiva(obj) {
  return String(obj.activo).toUpperCase() !== 'FALSE';
}

/**
 * Lista filas activas con filtros opcionales de fecha y tope.
 * - campoFecha: header de fecha a comparar (fecha_hora_registro / fecha_actividad)
 * - filtros.desde / filtros.hasta: 'YYYY-MM-DD' (inclusive)
 * - filtros.limit: tope de filas (default 500)
 * - filtros.sinLimite: true → devuelve todas las coincidencias (uso interno del
 *   resumen; un tope silencioso ahí desvirtuaría los totales del año)
 * Cuando hay tope se conservan las ÚLTIMAS filas coincidentes (las más nuevas):
 * cortar por el principio dejaría los registros recién cargados fuera del listado.
 * Los listados NO se cachean (pueden superar 100 KB); se acotan acá en el servidor.
 */
function listarActivos(sheet, headers, campoFecha, filtros) {
  var ultimaFila = sheet.getLastRow();
  if (ultimaFila <= 1) return [];

  var valores = sheet.getRange(2, 1, ultimaFila - 1, headers.length).getValues();
  var filas = objetoDesdeFilas(headers, valores);

  var desde = filtros.desde || '';
  var hasta = filtros.hasta || '';
  var limit = parseInt(filtros.limit, 10);
  if (isNaN(limit) || limit <= 0) limit = 500;

  var resultado = [];
  for (var i = 0; i < filas.length; i++) {
    var f = filas[i];
    if (!esFilaActiva(f)) continue;
    var fecha = String(f[campoFecha] || '').substring(0, 10);
    if (desde && fecha < desde) continue;
    if (hasta && fecha > hasta) continue;
    resultado.push(f);
  }

  if (filtros.sinLimite || resultado.length <= limit) return resultado;
  return resultado.slice(resultado.length - limit);
}

/** Índice 0-based de un header en la fila de encabezados. */
function indiceDeHeader(headers, nombre) {
  for (var i = 0; i < headers.length; i++) {
    if (String(headers[i]).trim() === nombre) return i;
  }
  return -1;
}

/**
 * Escribe un campo por nombre de header. Si la columna no existe, falla con un
 * error explícito: sin este chequeo indiceDeHeader devuelve -1 y setCeldaTexto
 * termina llamando a getRange(fila, 0), que rompe con "coordinates out of range".
 * (setupPlanilla no toca hojas ya existentes, así que puede faltar una columna.)
 */
function setCampoTexto(sheet, headers, fila, nombre, valor) {
  var idx = indiceDeHeader(headers, nombre);
  if (idx < 0) throw new Error('cabecera no encontrada: ' + nombre);
  setCeldaTexto(sheet, fila, idx, valor);
}

/** Nº de fila (1-based) con ese id, o -1. Lee solo la columna id. */
function buscarFilaPorId(sheet, headers, id) {
  var idxId = indiceDeHeader(headers, 'id');
  if (idxId < 0) throw new Error('cabecera no encontrada: id');
  var ultimaFila = sheet.getLastRow();
  if (ultimaFila <= 1) return -1;

  var ids = sheet.getRange(2, idxId + 1, ultimaFila - 1, 1).getValues();
  for (var r = 0; r < ids.length; r++) {
    if (String(ids[r][0]) === String(id)) return r + 2;
  }
  return -1;
}

/**
 * Nº de fila (1-based) con ese id_local, o -1. Lee solo esa columna.
 * Idempotencia: evita dobles altas cuando el cliente reintenta
 * tras una respuesta ambigua (Fase B offline).
 */
function buscarFilaPorIdLocal(sheet, headers, idLocal) {
  if (!idLocal) return -1;
  var idxIdLocal = indiceDeHeader(headers, 'id_local');
  if (idxIdLocal < 0) return -1;
  var ultimaFila = sheet.getLastRow();
  if (ultimaFila <= 1) return -1;

  var ids = sheet.getRange(2, idxIdLocal + 1, ultimaFila - 1, 1).getValues();
  for (var r = 0; r < ids.length; r++) {
    if (ids[r][0] && String(ids[r][0]) === String(idLocal)) return r + 2;
  }
  return -1;
}

/**
 * Crea una fila nueva (appendRow) y la fuerza a texto (setCeldaTexto).
 * fecha_hora_sync y activo los asigna el servidor; el resto sale de data.
 */
function crearFila(sheet, headers, data, ahora) {
  var valores = [];
  for (var c = 0; c < headers.length; c++) {
    var h = headers[c];
    var v = '';
    if (h === 'fecha_hora_sync') {
      v = ahora.datetime;
    } else if (h === 'activo') {
      v = (data[h] !== undefined && data[h] !== null) ? data[h] : 'TRUE';
    } else if (data[h] !== undefined && data[h] !== null) {
      v = data[h];
    }
    valores.push(v);
  }

  var filaNueva = sheet.getLastRow() + 1;
  sheet.appendRow(valores);
  for (var j = 0; j < headers.length; j++) {
    setCeldaTexto(sheet, filaNueva, j, valores[j]);
  }
  return filaNueva;
}

/** Lee una fila y la devuelve como objeto con claves = headers. */
function leerFila(sheet, headers, filaNum) {
  var valores = sheet.getRange(filaNum, 1, 1, headers.length).getValues()[0];
  return objetoDesdeFilas(headers, [valores])[0];
}

/**
 * Actualiza campos editables de la fila con ese id.
 * Preserva id, fecha_hora_registro, id_local y activo.
 * Asienta fecha_hora_sync + auditoría de modificación.
 */
function actualizarFila(sheet, headers, id, data, ahora) {
  var fila = buscarFilaPorId(sheet, headers, id);
  if (fila < 0) throw new Error('registro_no_encontrado');

  for (var c = 0; c < headers.length; c++) {
    var h = headers[c];
    if (h === 'id' || h === 'fecha_hora_registro' || h === 'id_local' || h === 'activo') continue;
    var v = data[h];
    if (v !== undefined && v !== null) {
      setCeldaTexto(sheet, fila, c, v);
    }
  }
  setCampoTexto(sheet, headers, fila, 'fecha_hora_sync', ahora.datetime);
  setCampoTexto(sheet, headers, fila, 'usuario_modificacion', data.usuario_modificacion || '');
  setCampoTexto(sheet, headers, fila, 'fecha_hora_modificacion', ahora.datetime);
  return fila;
}

/** Baja lógica: activo = FALSE + auditoría de modificación. */
function bajaLogica(sheet, headers, id, usuario) {
  var fila = buscarFilaPorId(sheet, headers, id);
  if (fila < 0) return { success: false, error: 'registro_no_encontrado' };

  var ahora = getCurrentDateTime();
  setCampoTexto(sheet, headers, fila, 'activo', 'FALSE');
  setCampoTexto(sheet, headers, fila, 'usuario_modificacion', usuario || '');
  setCampoTexto(sheet, headers, fila, 'fecha_hora_modificacion', ahora.datetime);
  return { success: true, data: { id: String(id) } };
}

/**
 * Ejecuta una mutación bajo LockService, verificando el retorno de tryLock.
 * El lock amortigua la ráfaga concurrente de tablets (Fase B).
 */
function conLock(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) {
    throw new Error('escritura_en_curso'); // el cliente reintenta
  }
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}