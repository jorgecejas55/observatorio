/**
 * GOOGLE APPS SCRIPT - MÉTRICAS DIGITALES (Web, FB, IG, Catu)
 * Sistema de registro de métricas mensuales para el Observatorio Turístico
 *
 * INSTRUCCIONES DE DEPLOY:
 * 1. Abrir Google Sheet: https://docs.google.com/spreadsheets/d/1uz4cjCgqeESX-keLDcJyEI46crdyVqV4w6zQalZq_8o/edit
 * 2. Extensiones > Apps Script
 * 3. Pegar este código completo
 * 4. Ejecutar función setup() UNA VEZ para inicializar las hojas
 * 5. Desplegar > Nueva implementación > Tipo: Aplicación web
 *    - Ejecutar como: Yo
 *    - Acceso: Cualquier persona
 * 6. Copiar URL y agregar a .env.local como METRICAS_DIGITALES_SCRIPT_URL
 */

var SHEET_ID = '1uz4cjCgqeESX-keLDcJyEI46crdyVqV4w6zQalZq_8o';

var SHEETS = {
  WEB: 'metricas_web',
  WEB_REGIONES: 'metricas_web_regiones',
  WEB_FUENTES: 'metricas_web_fuentes',
  FACEBOOK: 'metricas_facebook',
  INSTAGRAM: 'metricas_instagram',
  CATU: 'metricas_catu'
};

var CACHE_DURATION = 300;

// =================================================================================
// SEGURIDAD & MIDDLEWARE
// =================================================================================

function checkAuth(e) {
  // TODO Fase 3: descomentar cuando se configure GAS_API_KEY en Properties
  // var props = PropertiesService.getScriptProperties();
  // var API_KEY = props.getProperty('GAS_API_KEY');
  // var keyRecibida = e.parameter.api_key || (e.postData ? JSON.parse(e.postData.contents).api_key : null);
  // if (!API_KEY || keyRecibida !== API_KEY) {
  //   throw new Error('No autorizado');
  // }
  return true;
}

// =================================================================================
// MANEJO DE CACHÉ
// =================================================================================

function getCachedData(key) {
  try {
    var cache = CacheService.getScriptCache();
    var cached = cache.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (e) {
    Logger.log('getCachedData error: ' + e.toString());
    return null;
  }
}

function setCachedData(key, data) {
  try {
    var cache = CacheService.getScriptCache();
    cache.put(key, JSON.stringify(data), CACHE_DURATION);
  } catch (e) {
    Logger.log('setCachedData error: ' + e.toString());
  }
}

function invalidateCache(canal) {
  try {
    var cache = CacheService.getScriptCache();
    cache.remove(canal + '_list');
  } catch (e) {
    Logger.log('invalidateCache error: ' + e.toString());
  }
}

// =================================================================================
// PUNTO DE ENTRADA GET (Lecturas)
// =================================================================================

function doGet(e) {
  try {
    checkAuth(e);
    var action = e.parameter.action;
    var canal = e.parameter.canal;

    Logger.log('doGet - action: ' + action + ', canal: ' + canal);

    if (action === 'getMetricas') {
      var cacheKey = canal + '_list';
      var data = getCachedData(cacheKey);

      if (!data) {
        data = fetchCanalData(canal);
        setCachedData(cacheKey, data);
      }
      return returnJSON({ success: true, data: data });
    }

    return returnJSON({ success: false, error: 'Acción GET no reconocida: ' + action });
  } catch (error) {
    Logger.log('ERROR doGet: ' + error.toString());
    return returnJSON({ success: false, error: 'Error interno de lectura' });
  }
}

// =================================================================================
// PUNTO DE ENTRADA POST (Escrituras)
// =================================================================================

function doPost(e) {
  var lock = LockService.getScriptLock();
  var lockAcquired = lock.tryLock(10000);
  Logger.log('doPost - lock acquired: ' + lockAcquired);

  try {
    checkAuth(e);

    // Verificar que llegó el body
    if (!e.postData || !e.postData.contents) {
      Logger.log('ERROR doPost: e.postData es null o vacío');
      return returnJSON({ success: false, error: 'Sin datos en la solicitud' });
    }

    Logger.log('doPost - body recibido: ' + e.postData.contents.substring(0, 200));

    var params = JSON.parse(e.postData.contents);
    var action = params.action;
    var canal = params.canal;

    Logger.log('doPost - action: ' + action + ', canal: ' + canal);

    if (action === 'create') {
      var result = createMetrica(canal, params.data);
      invalidateCache(canal);
      return returnJSON({ success: true, data: result });
    }

    if (action === 'update') {
      var result = updateMetrica(canal, params.id, params.data);
      invalidateCache(canal);
      return returnJSON({ success: true, data: result });
    }

    if (action === 'delete') {
      deleteMetrica(canal, params.id);
      invalidateCache(canal);
      return returnJSON({ success: true, message: 'Registro eliminado' });
    }

    Logger.log('doPost - acción no reconocida: ' + action);
    return returnJSON({ success: false, error: 'Acción no reconocida: ' + action });

  } catch (error) {
    Logger.log('ERROR doPost: ' + error.toString() + ' | Stack: ' + error.stack);
    return returnJSON({ success: false, error: 'Error: ' + error.message });
  } finally {
    if (lockAcquired) lock.releaseLock();
  }
}

// =================================================================================
// LÓGICA ESPECÍFICA POR CANAL
// =================================================================================

function fetchCanalData(canal) {
  var sheetName = SHEETS[canal.toUpperCase()];
  if (!sheetName) throw new Error('Canal no válido: ' + canal);

  var mainData = getSheetData(sheetName);

  if (canal === 'web') {
    var regiones = getSheetData(SHEETS.WEB_REGIONES);
    var fuentes = getSheetData(SHEETS.WEB_FUENTES);

    return mainData.map(function(item) {
      return Object.assign({}, item, {
        regiones: regiones.filter(function(r) { return r.web_id === item.id; }),
        fuentes: fuentes.filter(function(f) { return f.web_id === item.id; })
      });
    });
  }

  return mainData;
}

function createMetrica(canal, data) {
  Logger.log('createMetrica - canal: ' + canal + ', data: ' + JSON.stringify(data));

  var sheetName = SHEETS[canal.toUpperCase()];
  if (!sheetName) throw new Error('Canal no válido: ' + canal);

  var id = Utilities.getUuid();
  var timestamp = new Date().toISOString();

  if (canal === 'web') {
    var regiones = data.regiones || [];
    var fuentes = data.fuentes || [];
    var webMain = {
      id: id,
      mes_anio: data.mes_anio,
      visitantes: data.visitantes,
      timestamp: timestamp,
      usuario_registro: data.usuario_registro || ''
    };

    Logger.log('createMetrica web - guardando main: ' + JSON.stringify(webMain));
    saveRow(SHEETS.WEB, webMain);

    regiones.forEach(function(r) {
      saveRow(SHEETS.WEB_REGIONES, { id: Utilities.getUuid(), web_id: id, region: r.region, visitas: r.visitas });
    });
    fuentes.forEach(function(f) {
      saveRow(SHEETS.WEB_FUENTES, { id: Utilities.getUuid(), web_id: id, fuente: f.fuente, visitas: f.visitas });
    });

    return webMain;
  }

  var record = {
    id: id,
    mes_anio: data.mes_anio,
    timestamp: timestamp,
    usuario_registro: data.usuario_registro || ''
  };

  if (canal === 'facebook' || canal === 'instagram') {
    record.seguidores = data.seguidores;
    record.interacciones = data.interacciones;
    record.publicaciones = data.publicaciones;
  } else if (canal === 'catu') {
    record.conversaciones = data.conversaciones;
    record.mensajes = data.mensajes;
    record.puntuacion_promedio = data.puntuacion_promedio;
    record.tasa_resolucion = data.tasa_resolucion;
  }

  Logger.log('createMetrica - guardando: ' + JSON.stringify(record));
  saveRow(sheetName, record);
  return record;
}

function updateMetrica(canal, id, data) {
  Logger.log('updateMetrica - canal: ' + canal + ', id: ' + id);

  var sheetName = SHEETS[canal.toUpperCase()];
  if (!sheetName) throw new Error('Canal no válido: ' + canal);

  if (canal === 'web') {
    var regiones = data.regiones || [];
    var fuentes = data.fuentes || [];
    var webMain = {
      mes_anio: data.mes_anio,
      visitantes: data.visitantes,
      usuario_registro: data.usuario_registro || ''
    };

    updateRow(SHEETS.WEB, id, webMain);
    clearRelational(SHEETS.WEB_REGIONES, 'web_id', id);
    clearRelational(SHEETS.WEB_FUENTES, 'web_id', id);

    regiones.forEach(function(r) {
      saveRow(SHEETS.WEB_REGIONES, { id: Utilities.getUuid(), web_id: id, region: r.region, visitas: r.visitas });
    });
    fuentes.forEach(function(f) {
      saveRow(SHEETS.WEB_FUENTES, { id: Utilities.getUuid(), web_id: id, fuente: f.fuente, visitas: f.visitas });
    });
  } else {
    updateRow(sheetName, id, data);
  }

  return { id: id };
}

function deleteMetrica(canal, id) {
  Logger.log('deleteMetrica - canal: ' + canal + ', id: ' + id);

  var sheetName = SHEETS[canal.toUpperCase()];
  if (!sheetName) throw new Error('Canal no válido: ' + canal);

  deleteRow(sheetName, id);

  if (canal === 'web') {
    clearRelational(SHEETS.WEB_REGIONES, 'web_id', id);
    clearRelational(SHEETS.WEB_FUENTES, 'web_id', id);
  }
}

// =================================================================================
// UTILIDADES DB (Genéricas)
// =================================================================================

function getSheetData(sheetName) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var ws = ss.getSheetByName(sheetName);

  if (!ws) {
    Logger.log('getSheetData - hoja no encontrada: ' + sheetName);
    throw new Error('Hoja no encontrada: ' + sheetName);
  }

  var lastRow = ws.getLastRow();
  if (lastRow <= 1) return [];

  var data = ws.getDataRange().getValues();
  var headers = data.shift();

  return data.map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) { obj[h] = row[i]; });
    return obj;
  });
}

function saveRow(sheetName, dataObj) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var ws = ss.getSheetByName(sheetName);

  if (!ws) {
    Logger.log('saveRow - hoja no encontrada: ' + sheetName);
    throw new Error('Hoja no encontrada: ' + sheetName);
  }

  var lastCol = ws.getLastColumn();
  if (lastCol === 0) {
    Logger.log('saveRow - hoja sin columnas: ' + sheetName);
    throw new Error('Hoja sin cabeceras: ' + sheetName);
  }

  var headers = ws.getRange(1, 1, 1, lastCol).getValues()[0];
  var row = headers.map(function(h) { return dataObj[h] !== undefined ? dataObj[h] : ''; });

  Logger.log('saveRow - ' + sheetName + ' | headers: ' + JSON.stringify(headers) + ' | row: ' + JSON.stringify(row));
  ws.appendRow(row);
}

function updateRow(sheetName, id, dataObj) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var ws = ss.getSheetByName(sheetName);

  if (!ws) throw new Error('Hoja no encontrada: ' + sheetName);

  var data = ws.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf('id');

  if (idCol === -1) throw new Error('Columna id no encontrada en: ' + sheetName);

  for (var i = 1; i < data.length; i++) {
    if (data[i][idCol] === id) {
      var rowNum = i + 1;
      headers.forEach(function(h, colIdx) {
        if (dataObj[h] !== undefined) {
          ws.getRange(rowNum, colIdx + 1).setValue(dataObj[h]);
        }
      });
      return;
    }
  }

  Logger.log('updateRow - id no encontrado: ' + id + ' en ' + sheetName);
}

function deleteRow(sheetName, id) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var ws = ss.getSheetByName(sheetName);

  if (!ws) throw new Error('Hoja no encontrada: ' + sheetName);

  var data = ws.getDataRange().getValues();
  var idCol = data[0].indexOf('id');

  if (idCol === -1) throw new Error('Columna id no encontrada en: ' + sheetName);

  for (var i = 1; i < data.length; i++) {
    if (data[i][idCol] === id) {
      ws.deleteRow(i + 1);
      return;
    }
  }

  Logger.log('deleteRow - id no encontrado: ' + id);
}

function clearRelational(sheetName, fkColName, fkValue) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var ws = ss.getSheetByName(sheetName);

  if (!ws) throw new Error('Hoja no encontrada: ' + sheetName);

  var data = ws.getDataRange().getValues();
  if (data.length <= 1) return;

  var fkCol = data[0].indexOf(fkColName);
  if (fkCol === -1) throw new Error('Columna ' + fkColName + ' no encontrada en: ' + sheetName);

  for (var i = data.length - 1; i >= 1; i--) {
    if (data[i][fkCol] === fkValue) {
      ws.deleteRow(i + 1);
    }
  }
}

function returnJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// =================================================================================
// SETUP INICIAL
// =================================================================================

function setup() {
  var ss = SpreadsheetApp.openById(SHEET_ID);

  var config = [
    { name: SHEETS.WEB,          color: '#4285f4', headers: ['id', 'mes_anio', 'visitantes', 'timestamp', 'usuario_registro'] },
    { name: SHEETS.WEB_REGIONES, color: '#4285f4', headers: ['id', 'web_id', 'region', 'visitas'] },
    { name: SHEETS.WEB_FUENTES,  color: '#4285f4', headers: ['id', 'web_id', 'fuente', 'visitas'] },
    { name: SHEETS.FACEBOOK,     color: '#3b5998', headers: ['id', 'mes_anio', 'seguidores', 'interacciones', 'publicaciones', 'timestamp', 'usuario_registro'] },
    { name: SHEETS.INSTAGRAM,    color: '#c13584', headers: ['id', 'mes_anio', 'seguidores', 'interacciones', 'publicaciones', 'timestamp', 'usuario_registro'] },
    { name: SHEETS.CATU,         color: '#ff9900', headers: ['id', 'mes_anio', 'conversaciones', 'mensajes', 'puntuacion_promedio', 'tasa_resolucion', 'timestamp', 'usuario_registro'] }
  ];

  config.forEach(function(conf) {
    var ws = ss.getSheetByName(conf.name);
    if (!ws) ws = ss.insertSheet(conf.name);

    if (ws.getLastRow() === 0) {
      ws.appendRow(conf.headers);
      ws.getRange(1, 1, 1, conf.headers.length)
        .setFontWeight('bold')
        .setBackground(conf.color)
        .setFontColor('#ffffff');
      ws.setFrozenRows(1);
      Logger.log('Hoja creada: ' + conf.name);
    } else {
      Logger.log('Hoja ya existía: ' + conf.name);
    }
  });

  Logger.log('Setup completado.');
}
