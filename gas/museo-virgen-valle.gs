/**
 * GOOGLE APPS SCRIPT - MUSEO DE LA VIRGEN DEL VALLE
 * Sistema de registro de visitas ocasionales e institucionales
 *
 * INSTRUCCIONES DE DEPLOY:
 * 1. Abrir Google Sheet: https://docs.google.com/spreadsheets/d/1lEjhsZkcWmE5Rp1IuYc9_LHRKIebURXqdkXHp6sTPEk/edit
 * 2. Extensiones > Apps Script
 * 3. Pegar este código completo
 * 4. Ejecutar función setup() UNA VEZ (crea hojas nuevas y agrega columnas)
 * 5. Desplegar > Nueva implementación > Tipo: Aplicación web
 *    - Ejecutar como: Yo
 *    - Acceso: Cualquier persona
 * 6. Copiar URL y agregar a .env.local como MUSEO_VIRGEN_VALLE_SCRIPT_URL
 */

// ID del Google Sheet (configuración)
const SHEET_ID = '1lEjhsZkcWmE5Rp1IuYc9_LHRKIebURXqdkXHp6sTPEk';

// Nombres de las hojas
const SHEETS = {
  OCASIONALES: 'Respuestas de formulario 1',  // Hoja existente de Google Forms
  INSTITUCIONALES: 'visitas_institucionales',  // Hoja nueva
  USUARIOS: 'usuarios'                         // Hoja nueva
};

// Configuración de caché (5 minutos = 300 segundos)
const CACHE_DURATION = 300;

// =================================================================================
// FUNCIONES DE CACHÉ (mejora rendimiento)
// =================================================================================
function getCachedData(key) {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(key);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      Logger.log('Error parseando caché: ' + e.toString());
      return null;
    }
  }
  return null;
}

function setCachedData(key, data) {
  const cache = CacheService.getScriptCache();
  try {
    cache.put(key, JSON.stringify(data), CACHE_DURATION);
  } catch (e) {
    Logger.log('Error guardando en caché: ' + e.toString());
  }
}

function invalidateCache(key) {
  const cache = CacheService.getScriptCache();
  cache.remove(key);
}

// =================================================================================
// FUNCIÓN DO GET (Manejo de lecturas)
// =================================================================================
function doGet(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const action = e.parameter.action;

    // 1. Login (verificar usuario)
    if (action === 'login') {
      const email = e.parameter.email;
      const password = e.parameter.password;
      const user = verifyUser(email, password);

      if (user) {
        // Registrar último ingreso
        try {
          updateRow(SHEETS.USUARIOS, user.id, { last_login: new Date().toISOString() });
        } catch (err) {
          Logger.log('No se pudo actualizar last_login: ' + err.toString());
        }

        return returnJSON({ success: true, user: user });
      } else {
        return returnJSON({ success: false, message: 'Credenciales inválidas' });
      }
    }

    // 2. Obtener visitas ocasionales (con caché)
    if (action === 'getOcasionales') {
      const cacheKey = 'ocasionales_list';
      let data = getCachedData(cacheKey);

      if (!data) {
        data = getSheetData(SHEETS.OCASIONALES);
        setCachedData(cacheKey, data);
      }

      return returnJSON({ success: true, data: data });
    }

    // 3. Obtener visitas institucionales (con caché)
    if (action === 'getInstitucionales') {
      const cacheKey = 'institucionales_list';
      let data = getCachedData(cacheKey);

      if (!data) {
        data = getSheetData(SHEETS.INSTITUCIONALES);
        setCachedData(cacheKey, data);
      }

      return returnJSON({ success: true, data: data });
    }

    return returnJSON({ success: false, message: 'Acción no reconocida' });

  } catch (error) {
    Logger.log('Error en doGet: ' + error.toString());
    return returnJSON({ success: false, error: error.toString() });
  } finally {
    lock.releaseLock();
  }
}

// =================================================================================
// FUNCIÓN DO POST (Manejo de escrituras)
// =================================================================================
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const params = JSON.parse(e.postData.contents);
    const action = params.action;

    // ── CRUD Visitas Ocasionales ──
    if (action === 'createOcasional') {
      const newVisit = createRow(SHEETS.OCASIONALES, params.data);
      invalidateCache('ocasionales_list'); // Invalidar caché
      return returnJSON({ success: true, data: newVisit });
    }

    if (action === 'updateOcasional') {
      const updatedVisit = updateRow(SHEETS.OCASIONALES, params.id, params.data);
      invalidateCache('ocasionales_list'); // Invalidar caché
      return returnJSON({ success: true, data: updatedVisit });
    }

    if (action === 'deleteOcasional') {
      deleteRow(SHEETS.OCASIONALES, params.id);
      invalidateCache('ocasionales_list'); // Invalidar caché
      return returnJSON({ success: true, message: 'Visita eliminada' });
    }

    // ── CRUD Visitas Institucionales ──
    if (action === 'createInstitucional') {
      const newVisit = createRow(SHEETS.INSTITUCIONALES, params.data);
      invalidateCache('institucionales_list'); // Invalidar caché
      return returnJSON({ success: true, data: newVisit });
    }

    if (action === 'updateInstitucional') {
      const updatedVisit = updateRow(SHEETS.INSTITUCIONALES, params.id, params.data);
      invalidateCache('institucionales_list'); // Invalidar caché
      return returnJSON({ success: true, data: updatedVisit });
    }

    if (action === 'deleteInstitucional') {
      deleteRow(SHEETS.INSTITUCIONALES, params.id);
      invalidateCache('institucionales_list'); // Invalidar caché
      return returnJSON({ success: true, message: 'Visita institucional eliminada' });
    }

    // ── Crear Usuario (Admin) ──
    if (action === 'createUser') {
      const newUser = createRow(SHEETS.USUARIOS, params.data);
      return returnJSON({ success: true, data: newUser });
    }

    return returnJSON({ success: false, message: 'Acción POST no reconocida' });

  } catch (error) {
    Logger.log('Error en doPost: ' + error.toString());
    return returnJSON({ success: false, error: error.toString() });
  } finally {
    lock.releaseLock();
  }
}

// =================================================================================
// UTILIDADES DB
// =================================================================================

/** Obtener datos de una hoja como array de objetos */
function getSheetData(sheetName) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const ws = ss.getSheetByName(sheetName);

  if (!ws) throw new Error('Hoja "' + sheetName + '" no encontrada');

  const data = ws.getDataRange().getValues();
  if (data.length === 0) return [];

  const headers = data.shift(); // Primera fila son headers

  return data.map(function(row) {
    var obj = {};
    headers.forEach(function(header, index) {
      // Convertir fechas a ISO string
      if (row[index] instanceof Date) {
        obj[header] = row[index].toISOString().split('T')[0]; // YYYY-MM-DD
      } else {
        obj[header] = row[index];
      }
    });
    return obj;
  });
}

/** Verificar credenciales de usuario */
function verifyUser(email, password) {
  const users = getSheetData(SHEETS.USUARIOS);
  const user = users.find(function(u) {
    // Convertir ambos a string para comparar (la hoja puede guardar números como number)
    return u.email === email && String(u.password) === String(password);
  });

  if (user) {
    // No devolver password
    var safeUser = {};
    for (var key in user) {
      if (key !== 'password') {
        safeUser[key] = user[key];
      }
    }
    return safeUser;
  }
  return null;
}

/** Crear nueva fila */
function createRow(sheetName, dataObj) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const ws = ss.getSheetByName(sheetName);

  if (!ws) throw new Error('Hoja "' + sheetName + '" no encontrada');

  // Asegurar ID
  if (!dataObj.id) {
    dataObj.id = Utilities.getUuid();
  }

  // Headers actuales
  const headers = ws.getRange(1, 1, 1, ws.getLastColumn()).getValues()[0];
  const newRow = [];

  headers.forEach(function(header) {
    var value = dataObj[header];
    if (value === null || value === undefined) {
      value = '';
    }
    newRow.push(value);
  });

  ws.appendRow(newRow);
  return dataObj;
}

/** Actualizar fila por ID */
function updateRow(sheetName, id, dataObj) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const ws = ss.getSheetByName(sheetName);

  if (!ws) throw new Error('Hoja "' + sheetName + '" no encontrada');

  const data = ws.getDataRange().getValues();
  if (data.length === 0) throw new Error('La hoja está vacía');

  const headers = data[0];
  const idColIndex = headers.indexOf('id');

  if (idColIndex === -1) throw new Error('Columna "id" no encontrada');

  // Buscar índice de la fila
  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][idColIndex] == id) {
      rowIndex = i + 1; // +1 porque sheet es 1-based
      break;
    }
  }

  if (rowIndex === -1) throw new Error('Registro no encontrado para actualizar');

  // Actualizar celdas
  const currentRow = data[rowIndex - 1];
  const updatedRow = [];

  headers.forEach(function(header, colIndex) {
    var newValue = dataObj[header];

    // Si no viene en el update, mantener valor anterior
    if (newValue === undefined) {
      newValue = currentRow[colIndex];
    } else if (newValue === null) {
      newValue = '';
    }

    updatedRow.push(newValue);
  });

  ws.getRange(rowIndex, 1, 1, updatedRow.length).setValues([updatedRow]);

  return Object.assign({}, dataObj, { id: id });
}

/** Eliminar fila por ID */
function deleteRow(sheetName, id) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const ws = ss.getSheetByName(sheetName);

  if (!ws) throw new Error('Hoja "' + sheetName + '" no encontrada');

  const data = ws.getDataRange().getValues();
  if (data.length === 0) throw new Error('La hoja está vacía');

  const headers = data[0];
  const idColIndex = headers.indexOf('id');

  if (idColIndex === -1) throw new Error('Columna "id" no encontrada');

  for (var i = 1; i < data.length; i++) {
    if (data[i][idColIndex] == id) {
      ws.deleteRow(i + 1);
      return true;
    }
  }

  throw new Error('Registro no encontrado para eliminar');
}

/** Respuesta JSON estándar */
function returnJSON(object) {
  return ContentService
    .createTextOutput(JSON.stringify(object))
    .setMimeType(ContentService.MimeType.JSON);
}

// =================================================================================
// CONFIGURACIÓN INICIAL (Ejecutar UNA VEZ)
// =================================================================================
function setup() {
  const ss = SpreadsheetApp.openById(SHEET_ID);

  Logger.log('=== SETUP MUSEO VIRGEN DEL VALLE ===');

  // ============= HOJA VISITAS INSTITUCIONALES (NUEVA) =============
  var wsInst = ss.getSheetByName(SHEETS.INSTITUCIONALES);
  if (!wsInst) {
    wsInst = ss.insertSheet(SHEETS.INSTITUCIONALES);
    Logger.log('✅ Hoja "' + SHEETS.INSTITUCIONALES + '" creada');
  }

  if (wsInst.getLastRow() === 0) {
    wsInst.appendRow([
      'id',
      'fecha_visita',
      'procedencia_institucion',
      'tipo_institucion',
      'subtipo_institucion',
      'nombre_institucion',
      'cantidad_asistentes',
      'timestamp',
      'usuario_registro'
    ]);

    wsInst.getRange(1, 1, 1, 9).setFontWeight('bold').setBackground('#34a853').setFontColor('#ffffff');
    wsInst.setFrozenRows(1);
    Logger.log('✅ Headers de "' + SHEETS.INSTITUCIONALES + '" configurados');
  } else {
    Logger.log('⚠️ Hoja "' + SHEETS.INSTITUCIONALES + '" ya tiene datos');
  }

  // ============= HOJA USUARIOS (NUEVA) =============
  var wsUsers = ss.getSheetByName(SHEETS.USUARIOS);
  if (!wsUsers) {
    wsUsers = ss.insertSheet(SHEETS.USUARIOS);
    Logger.log('✅ Hoja "' + SHEETS.USUARIOS + '" creada');
  }

  if (wsUsers.getLastRow() === 0) {
    wsUsers.appendRow([
      'id',
      'email',
      'password',
      'nombre',
      'apellido',
      'rol',
      'created_at',
      'last_login'
    ]);

    wsUsers.getRange(1, 1, 1, 8).setFontWeight('bold').setBackground('#1e88e5').setFontColor('#ffffff');
    wsUsers.setFrozenRows(1);

    // Crear usuario admin default
    wsUsers.appendRow([
      Utilities.getUuid(),
      'admin@virgen-valle.com',
      '123456',
      'Admin',
      'Museo',
      'admin',
      new Date(),
      ''
    ]);

    Logger.log('✅ Hoja "' + SHEETS.USUARIOS + '" creada con usuario admin@virgen-valle.com / 123456');
  } else {
    Logger.log('⚠️ Hoja "' + SHEETS.USUARIOS + '" ya tiene datos');
  }

  // ============= AGREGAR COLUMNAS A HOJA EXISTENTE "Respuestas de formulario 1" =============
  var wsOcas = ss.getSheetByName(SHEETS.OCASIONALES);
  if (!wsOcas) {
    Logger.log('❌ ERROR: Hoja "' + SHEETS.OCASIONALES + '" no existe. Crearla manualmente primero.');
  } else {
    const headers = wsOcas.getRange(1, 1, 1, wsOcas.getLastColumn()).getValues()[0];
    Logger.log('Headers actuales en "' + SHEETS.OCASIONALES + '": ' + headers.join(', '));

    // Verificar si ya tiene las columnas nuevas
    if (headers.indexOf('id') === -1) {
      // Agregar columnas: id, motivo_visita, canal_difusion, usuario_registro
      const lastCol = wsOcas.getLastColumn();
      wsOcas.getRange(1, lastCol + 1, 1, 4).setValues([['id', 'motivo_visita', 'canal_difusion', 'usuario_registro']]);
      wsOcas.getRange(1, lastCol + 1, 1, 4).setFontWeight('bold').setBackground('#f4b400').setFontColor('#000000');
      Logger.log('✅ Columnas nuevas agregadas a "' + SHEETS.OCASIONALES + '"');
    } else {
      Logger.log('⚠️ La hoja "' + SHEETS.OCASIONALES + '" ya tiene las columnas nuevas');
    }
  }

  Logger.log('========================================');
  Logger.log('✅ SETUP COMPLETADO');
  Logger.log('========================================');
  Logger.log('Siguiente paso:');
  Logger.log('1. Desplegar > Nueva implementación > Aplicación web');
  Logger.log('2. Ejecutar como: Yo');
  Logger.log('3. Acceso: Cualquier persona');
  Logger.log('4. Copiar URL y agregarla a .env.local');
  Logger.log('========================================');
}

// =================================================================================
// FUNCIÓN PARA GENERAR IDs FALTANTES (Ejecutar UNA VEZ después del setup)
// =================================================================================
function generarIDsFaltantes() {
  const ss = SpreadsheetApp.openById(SHEET_ID);

  Logger.log('=== GENERANDO IDs FALTANTES ===');

  // ============= VISITAS OCASIONALES =============
  var wsOcas = ss.getSheetByName(SHEETS.OCASIONALES);
  if (wsOcas) {
    var dataOcas = wsOcas.getDataRange().getValues();
    var headersOcas = dataOcas[0];
    var idColIndex = headersOcas.indexOf('id');

    if (idColIndex === -1) {
      Logger.log('❌ ERROR: Columna "id" no encontrada en ' + SHEETS.OCASIONALES);
      Logger.log('Ejecutá primero la función setup()');
      return;
    }

    var idsGenerados = 0;

    // Empezar desde la fila 2 (índice 1) para saltar headers
    for (var i = 1; i < dataOcas.length; i++) {
      var idActual = dataOcas[i][idColIndex];

      // Si la celda está vacía, generar UUID
      if (!idActual || idActual === '') {
        var nuevoID = Utilities.getUuid();
        wsOcas.getRange(i + 1, idColIndex + 1).setValue(nuevoID);
        idsGenerados++;
      }
    }

    Logger.log('✅ Visitas ocasionales: ' + idsGenerados + ' IDs generados');
  }

  // ============= VISITAS INSTITUCIONALES =============
  var wsInst = ss.getSheetByName(SHEETS.INSTITUCIONALES);
  if (wsInst && wsInst.getLastRow() > 1) {
    var dataInst = wsInst.getDataRange().getValues();
    var headersInst = dataInst[0];
    var idColIndexInst = headersInst.indexOf('id');

    if (idColIndexInst === -1) {
      Logger.log('❌ ERROR: Columna "id" no encontrada en ' + SHEETS.INSTITUCIONALES);
      return;
    }

    var idsGeneradosInst = 0;

    for (var j = 1; j < dataInst.length; j++) {
      var idActualInst = dataInst[j][idColIndexInst];

      if (!idActualInst || idActualInst === '') {
        var nuevoIDInst = Utilities.getUuid();
        wsInst.getRange(j + 1, idColIndexInst + 1).setValue(nuevoIDInst);
        idsGeneradosInst++;
      }
    }

    Logger.log('✅ Visitas institucionales: ' + idsGeneradosInst + ' IDs generados');
  } else {
    Logger.log('⚠️ Hoja de visitas institucionales vacía o no existe');
  }

  Logger.log('========================================');
  Logger.log('✅ GENERACIÓN DE IDs COMPLETADA');
  Logger.log('========================================');

  // Invalidar caché para que los nuevos IDs se reflejen
  invalidateCache('ocasionales_list');
  invalidateCache('institucionales_list');
}

// =================================================================================
// FUNCIONES DE PRUEBA
// =================================================================================
function testGetOcasionales() {
  const data = getSheetData(SHEETS.OCASIONALES);
  Logger.log('Total visitas ocasionales: ' + data.length);
  if (data.length > 0) {
    Logger.log('Primera visita:');
    Logger.log(JSON.stringify(data[0], null, 2));
  }
}

function testLogin() {
  const user = verifyUser('admin@virgen-valle.com', '123456');
  Logger.log('Login test:');
  Logger.log(user);
}

function testListarUsuarios() {
  const users = getSheetData(SHEETS.USUARIOS);
  Logger.log('=== USUARIOS EN LA HOJA ===');
  Logger.log('Total usuarios: ' + users.length);
  users.forEach(function(user, index) {
    Logger.log('Usuario ' + (index + 1) + ':');
    Logger.log('  Email: ' + user.email);
    Logger.log('  Password: ' + user.password);
    Logger.log('  Nombre: ' + user.nombre);
    Logger.log('  Rol: ' + user.rol);
  });
}

function testVerificarHojas() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const hojas = ss.getSheets();
  Logger.log('=== HOJAS EN EL SPREADSHEET ===');
  hojas.forEach(function(hoja) {
    Logger.log('- ' + hoja.getName());
  });
}

function testLoginDetallado() {
  Logger.log('=== TEST LOGIN DETALLADO ===');

  const email = 'admin@virgen-valle.com';
  const password = '123456';

  Logger.log('Buscando usuario con:');
  Logger.log('  Email: "' + email + '"');
  Logger.log('  Password: "' + password + '"');

  const users = getSheetData(SHEETS.USUARIOS);
  Logger.log('\nUsuarios encontrados: ' + users.length);

  users.forEach(function(user, index) {
    Logger.log('\n--- Usuario ' + (index + 1) + ' ---');
    Logger.log('Email en hoja: "' + user.email + '"');
    Logger.log('Email coincide: ' + (user.email === email));
    Logger.log('Password en hoja: "' + user.password + '"');
    Logger.log('Password coincide: ' + (user.password === password));
    Logger.log('Ambos coinciden: ' + (user.email === email && user.password === password));
  });

  const user = users.find(function(u) {
    return u.email === email && u.password === password;
  });

  Logger.log('\n=== RESULTADO ===');
  if (user) {
    Logger.log('✅ Usuario encontrado:');
    Logger.log(JSON.stringify(user, null, 2));
  } else {
    Logger.log('❌ Usuario NO encontrado');
  }
}
