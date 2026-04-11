/**
 * GOOGLE APPS SCRIPT — ALOJAMIENTOS NO REGISTRADOS
 * Sistema de gestión de alojamientos turísticos no registrados oficialmente
 *
 * CARACTERÍSTICAS:
 * - Hoja "usuarios" en el MISMO Google Sheet para autenticación
 * - CRUD completo de alojamientos
 * - Endpoint especial para datos del mapa (parsea coordenadas)
 * - Validación de campos obligatorios
 *
 * INSTRUCCIONES DE DEPLOY:
 * 1. Abrir el Google Sheet que YA TIENE los datos de alojamientos
 *    URL: https://docs.google.com/spreadsheets/d/TU_ID_AQUI
 * 2. Verificar que existe la hoja con los datos (cualquier nombre, se configura abajo)
 * 3. Extensiones > Apps Script > pegar este código
 * 4. Ejecutar setup() UNA VEZ para crear la hoja "usuarios"
 * 5. Implementar > Nueva implementación > Aplicación web
 *    - Ejecutar como: Yo
 *    - Acceso: Cualquier persona
 * 6. Copiar URL a .env.local como NEXT_PUBLIC_ALOJAMIENTOS_SCRIPT_URL
 *
 * IMPORTANTE: Todo está en el MISMO Google Sheet (una hoja para alojamientos,
 * otra para usuarios). NO se necesitan archivos separados.
 */

// CONFIGURACIÓN - CAMBIAR SEGÚN TUS NOMBRES DE HOJAS
const SHEETS = {
  ALOJAMIENTOS: 'Respuestas de formulario 1',  // ← Cambiar por el nombre real de tu hoja
  USUARIOS: 'usuarios'  // Esta se crea con setup()
};

// =================================================================================
// FUNCIÓN DO GET (Lecturas)
// =================================================================================
function doGet(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const action = e.parameter.action;

    // 1. Login (verifica en hoja usuarios)
    if (action === 'login') {
      const email = e.parameter.email;
      const password = e.parameter.password;
      const user = verifyUser(email, password);

      if (user) {
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

    // 2. Obtener todos los alojamientos
    if (action === 'getAlojamientos') {
      const data = getSheetData(SHEETS.ALOJAMIENTOS);
      // Mapear a nombres limpios para el frontend
      const dataMapeada = data.map(function(aloj) {
        return mapearCamposDesdeSheet(aloj);
      });
      return returnJSON({ success: true, data: dataMapeada });
    }

    // 3. Obtener datos para el mapa (con coordenadas parseadas)
    if (action === 'getMapData') {
      const alojamientos = getSheetData(SHEETS.ALOJAMIENTOS);
      const mapData = alojamientos.map(function(aloj) {
        // Buscar la columna de coordenadas (puede tener espacios/saltos de línea)
        var coordenadasValue = aloj['  Coordenadas (latitud, longitud)  \n']
                            || aloj['Coordenadas (latitud, longitud)']
                            || aloj['coordenadas']
                            || '';

        const coords = parseCoordenadas(coordenadasValue);

        // Buscar otros campos con nombres posibles
        var nombreValue = aloj['Nombre del alojamiento   \n'] || aloj['nombre'] || aloj['Nombre'] || '';
        var tipoValue = aloj['Tipo de alojamiento  '] || aloj['tipo'] || aloj['Tipo'] || '';
        var direccionValue = aloj['Direcci\u00f3n  \n\n'] || aloj['direccion'] || aloj['Dirección'] || '';

        // Parsear números (pueden venir con saltos de línea o espacios)
        var habitacionesRaw = aloj['Cantidad de habitaciones  \n'] || aloj['habitaciones'] || '';
        var plazasRaw = aloj['Cantidad de plazas totales  \n'] || aloj['plazas'] || '';
        var precioRaw = aloj['Precio base doble por noche (ARS)  '] || aloj['precio'] || '';

        var habitacionesValue = parseFloat(String(habitacionesRaw).replace(/[\n\r\s]/g, '')) || null;
        var plazasValue = parseFloat(String(plazasRaw).replace(/[\n\r\s]/g, '')) || null;
        var precioValue = parseFloat(String(precioRaw).replace(/[\n\r\s]/g, '')) || null;

        return {
          id: aloj.id,
          nombre: nombreValue,
          tipo: tipoValue,
          direccion: direccionValue,
          lat: coords.lat,
          lng: coords.lng,
          habitaciones: habitacionesValue,
          plazas: plazasValue,
          precio: precioValue
        };
      }).filter(function(item) {
        // Filtrar solo items con coordenadas válidas
        return item.lat !== null && item.lng !== null;
      });

      return returnJSON({ success: true, data: mapData });
    }

    // 4. Obtener un alojamiento por ID
    if (action === 'getAlojamiento') {
      const id = e.parameter.id;
      const alojamientos = getSheetData(SHEETS.ALOJAMIENTOS);
      const alojamiento = alojamientos.find(function(a) { return a.id === id; });

      if (alojamiento) {
        // Mapear a nombres limpios para el frontend
        const alojamientoMapeado = mapearCamposDesdeSheet(alojamiento);
        return returnJSON({ success: true, data: alojamientoMapeado });
      } else {
        return returnJSON({ success: false, message: 'Alojamiento no encontrado' });
      }
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
// FUNCIÓN DO POST (Escrituras)
// =================================================================================
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const params = JSON.parse(e.postData.contents);
    const action = params.action;

    // 1. Crear alojamiento
    if (action === 'createAlojamiento') {
      // Validar campos obligatorios
      const required = ['nombre', 'tipo', 'direccion', 'coordenadas'];
      for (var i = 0; i < required.length; i++) {
        if (!params.data[required[i]]) {
          return returnJSON({
            success: false,
            message: 'Campo obligatorio faltante: ' + required[i]
          });
        }
      }

      // Validar formato de coordenadas
      const coords = parseCoordenadas(params.data.coordenadas);
      if (coords.lat === null || coords.lng === null) {
        return returnJSON({
          success: false,
          message: 'Formato de coordenadas inválido. Use: lat, lng'
        });
      }

      // Agregar timestamp y metadata
      params.data.timestamp = new Date();
      params.data.creado_por = params.creado_por || 'sistema';
      params.data.fecha_creacion = new Date();

      // Mapear campos a nombres reales del Sheet
      const dataMapeada = mapearCamposASheet(params.data);

      const newAlojamiento = createRow(SHEETS.ALOJAMIENTOS, dataMapeada);
      return returnJSON({ success: true, data: newAlojamiento });
    }

    // 2. Actualizar alojamiento
    if (action === 'updateAlojamiento') {
      // Agregar metadata de modificación
      params.data.modificado_por = params.modificado_por || 'sistema';
      params.data.fecha_modificacion = new Date();

      // Mapear campos a nombres reales del Sheet
      const dataMapeada = mapearCamposASheet(params.data);

      const updated = updateRow(SHEETS.ALOJAMIENTOS, params.id, dataMapeada);
      return returnJSON({ success: true, data: updated });
    }

    // 3. Eliminar alojamiento
    if (action === 'deleteAlojamiento') {
      deleteRow(SHEETS.ALOJAMIENTOS, params.id);
      return returnJSON({ success: true, message: 'Alojamiento eliminado' });
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

/**
 * Mapear nombres de campos limpios a nombres reales de columnas del Sheet
 */
function mapearCamposASheet(data) {
  const mapa = {
    'timestamp': 'Marca temporal',
    'nombre': 'Nombre del alojamiento   \n',
    'tipo': 'Tipo de alojamiento  ',
    'direccion': 'Direcci\u00f3n  \n\n',
    'coordenadas': '  Coordenadas (latitud, longitud)  \n',
    'estado': 'Estado del alojamiento  ',
    'propietario': 'Nombre del/la propietario / responsable \n',
    'telefono': 'Tel\u00e9fono / Celular de contacto\n\n',
    'email': 'Email\n',
    'redes_sociales': 'Redes Sociales',
    'habitaciones': 'Cantidad de habitaciones  \n',
    'plazas': 'Cantidad de plazas totales  \n',
    'tipo_unidades': 'Tipo de unidades  ',
    'precio': 'Precio base doble por noche (ARS)  ',
    'servicios': 'Servicios',
    'movilidad_reducida': '\u00bfEs Apto para personas con movilidad reducida?  ',
    'horario_ingreso': 'Horario de ingreso  ',
    'horario_salida': 'Horario de salida  ',
    'observaciones': 'Observaciones'
  };

  var resultado = {};

  // Mantener campos del sistema (id, creado_por, etc) tal cual
  if (data.id) resultado.id = data.id;
  if (data.creado_por) resultado.creado_por = data.creado_por;
  if (data.fecha_creacion) resultado.fecha_creacion = data.fecha_creacion;
  if (data.modificado_por) resultado.modificado_por = data.modificado_por;
  if (data.fecha_modificacion) resultado.fecha_modificacion = data.fecha_modificacion;

  // Mapear campos de datos
  for (var campo in data) {
    if (mapa[campo]) {
      resultado[mapa[campo]] = data[campo];
    }
  }

  return resultado;
}

/**
 * Mapear nombres de columnas del Sheet a nombres limpios para el frontend
 */
function mapearCamposDesdeSheet(data) {
  var resultado = {
    id: data.id || '',
    timestamp: data['Marca temporal'] || '',
    nombre: data['Nombre del alojamiento   \n'] || '',
    tipo: data['Tipo de alojamiento  '] || '',
    direccion: data['Direcci\u00f3n  \n\n'] || '',
    coordenadas: data['  Coordenadas (latitud, longitud)  \n'] || '',
    estado: data['Estado del alojamiento  '] || '',
    propietario: data['Nombre del/la propietario / responsable \n'] || '',
    telefono: data['Tel\u00e9fono / Celular de contacto\n\n'] || '',
    email: data['Email\n'] || '',
    redes_sociales: data['Redes Sociales'] || '',
    habitaciones: data['Cantidad de habitaciones  \n'] || '',
    plazas: data['Cantidad de plazas totales  \n'] || '',
    tipo_unidades: data['Tipo de unidades  '] || '',
    precio: data['Precio base doble por noche (ARS)  '] || '',
    servicios: data['Servicios'] || '',
    movilidad_reducida: data['\u00bfEs Apto para personas con movilidad reducida?  '] || '',
    horario_ingreso: data['Horario de ingreso  '] || '',
    horario_salida: data['Horario de salida  '] || '',
    observaciones: data['Observaciones'] || ''
  };

  // Campos del sistema
  if (data.creado_por) resultado.creado_por = data.creado_por;
  if (data.fecha_creacion) resultado.fecha_creacion = data.fecha_creacion;
  if (data.modificado_por) resultado.modificado_por = data.modificado_por;
  if (data.fecha_modificacion) resultado.fecha_modificacion = data.fecha_modificacion;

  return resultado;
}

/** Obtener datos de una hoja como array de objetos */
function getSheetData(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ws = ss.getSheetByName(sheetName);

  if (!ws) throw new Error('Hoja "' + sheetName + '" no encontrada');

  const data = ws.getDataRange().getValues();
  if (data.length === 0) return [];

  const headers = data.shift();

  return data.map(function(row) {
    var obj = {};
    headers.forEach(function(header, index) {
      if (row[index] instanceof Date) {
        obj[header] = row[index].toISOString().split('T')[0];
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
    return u.email === email && u.password === password;
  });

  if (user) {
    const { password, ...safeUser } = user;
    return safeUser;
  }
  return null;
}

/** Crear nueva fila */
function createRow(sheetName, dataObj) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ws = ss.getSheetByName(sheetName);

  if (!ws) throw new Error('Hoja "' + sheetName + '" no encontrada');

  // Asegurar ID
  if (!dataObj.id) {
    dataObj.id = Utilities.getUuid();
  }

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
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ws = ss.getSheetByName(sheetName);

  if (!ws) throw new Error('Hoja "' + sheetName + '" no encontrada');

  const data = ws.getDataRange().getValues();
  if (data.length === 0) throw new Error('La hoja está vacía');

  const headers = data[0];
  const idColIndex = headers.indexOf('id');

  if (idColIndex === -1) throw new Error('Columna "id" no encontrada');

  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][idColIndex] == id) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) throw new Error('Registro no encontrado');

  const currentRow = data[rowIndex - 1];
  const updatedRow = [];
  const protectedFields = ['creado_por', 'fecha_creacion', 'timestamp'];

  headers.forEach(function(header, colIndex) {
    var newValue = dataObj[header];

    if (protectedFields.includes(header)) {
      newValue = currentRow[colIndex];
    } else if (newValue === undefined) {
      newValue = currentRow[colIndex];
    } else if (newValue === null) {
      newValue = '';
    }

    updatedRow.push(newValue);
  });

  ws.getRange(rowIndex, 1, 1, updatedRow.length).setValues([updatedRow]);

  return { ...dataObj, id: id };
}

/** Eliminar fila por ID */
function deleteRow(sheetName, id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
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

/** Parsear coordenadas del formato "lat, lng" a objeto {lat, lng} */
function parseCoordenadas(coordenadasStr) {
  if (!coordenadasStr) return { lat: null, lng: null };

  try {
    // Formato esperado: "-28.472570592785047, -65.78672579338392"
    const partes = String(coordenadasStr).split(',');

    if (partes.length !== 2) return { lat: null, lng: null };

    const lat = parseFloat(partes[0].trim());
    const lng = parseFloat(partes[1].trim());

    if (isNaN(lat) || isNaN(lng)) return { lat: null, lng: null };

    return { lat: lat, lng: lng };
  } catch (e) {
    Logger.log('Error parseando coordenadas: ' + e.toString());
    return { lat: null, lng: null };
  }
}

/** Respuesta JSON estándar */
function returnJSON(object) {
  return ContentService
    .createTextOutput(JSON.stringify(object))
    .setMimeType(ContentService.MimeType.JSON);
}

// =================================================================================
// SETUP INICIAL (Ejecutar UNA VEZ)
// =================================================================================
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  Logger.log('========================================');
  Logger.log('INICIANDO SETUP - ALOJAMIENTOS NO REGISTRADOS');
  Logger.log('========================================');

  // ============= VERIFICAR HOJA ALOJAMIENTOS =============
  var wsAlojamientos = ss.getSheetByName(SHEETS.ALOJAMIENTOS);

  if (!wsAlojamientos) {
    Logger.log('❌ ERROR: Hoja "' + SHEETS.ALOJAMIENTOS + '" NO encontrada');
    Logger.log('   Verifica el nombre en la constante SHEETS.ALOJAMIENTOS');
    Logger.log('   Hojas disponibles:');
    ss.getSheets().forEach(function(sheet) {
      Logger.log('   - ' + sheet.getName());
    });
    return;
  }

  Logger.log('✅ Hoja "' + SHEETS.ALOJAMIENTOS + '" encontrada');
  Logger.log('   Total de filas: ' + wsAlojamientos.getLastRow());
  Logger.log('   Total de columnas: ' + wsAlojamientos.getLastColumn());

  // Mostrar headers actuales
  if (wsAlojamientos.getLastRow() > 0) {
    var headers = wsAlojamientos.getRange(1, 1, 1, wsAlojamientos.getLastColumn()).getValues()[0];
    Logger.log('   Headers actuales: ' + headers.join(', '));
  }

  // ============= CREAR HOJA USUARIOS SI NO EXISTE =============
  var wsUsuarios = ss.getSheetByName(SHEETS.USUARIOS);

  if (!wsUsuarios) {
    Logger.log('📝 Creando hoja "' + SHEETS.USUARIOS + '"...');
    wsUsuarios = ss.insertSheet(SHEETS.USUARIOS);

    // Crear headers
    wsUsuarios.appendRow([
      'id',
      'email',
      'password',
      'nombre',
      'apellido',
      'rol',
      'created_at',
      'last_login'
    ]);

    // Formatear header
    wsUsuarios.getRange(1, 1, 1, 8).setFontWeight('bold').setBackground('#34a853').setFontColor('#ffffff');
    wsUsuarios.setFrozenRows(1);

    // Crear usuario admin default
    wsUsuarios.appendRow([
      Utilities.getUuid(),
      'admin@observatorio.com',
      'admin123',
      'Administrador',
      'Observatorio',
      'admin',
      new Date(),
      ''
    ]);

    Logger.log('✅ Hoja "usuarios" creada');
    Logger.log('   👤 Usuario creado: admin@observatorio.com / admin123');
  } else {
    Logger.log('✅ Hoja "usuarios" ya existe');
    Logger.log('   Total usuarios: ' + (wsUsuarios.getLastRow() - 1));
  }

  // ============= INSTRUCCIONES FINALES =============
  Logger.log('');
  Logger.log('========================================');
  Logger.log('✅ SETUP COMPLETADO');
  Logger.log('========================================');
  Logger.log('');
  Logger.log('📋 CHECKLIST:');
  Logger.log('   [✓] Hoja de alojamientos verificada');
  Logger.log('   [✓] Hoja de usuarios lista');
  Logger.log('');
  Logger.log('🚀 SIGUIENTE PASO - DEPLOY:');
  Logger.log('   1. Menú: Implementar > Nueva implementación');
  Logger.log('   2. Tipo: Aplicación web');
  Logger.log('   3. Ejecutar como: Yo');
  Logger.log('   4. Quién tiene acceso: Cualquier persona');
  Logger.log('   5. Click en Implementar');
  Logger.log('   6. Copiar la URL generada');
  Logger.log('   7. Agregar a .env.local:');
  Logger.log('      NEXT_PUBLIC_ALOJAMIENTOS_SCRIPT_URL=URL_COPIADA');
  Logger.log('');
  Logger.log('⚠️  IMPORTANTE:');
  Logger.log('   Si los datos de alojamientos NO tienen columna "id",');
  Logger.log('   ejecutar la función agregarColumnasNecesarias()');
  Logger.log('========================================');
}

// =================================================================================
// AGREGAR COLUMNAS NECESARIAS (Opcional - ejecutar si falta 'id')
// =================================================================================
function agregarColumnasNecesarias() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ws = ss.getSheetByName(SHEETS.ALOJAMIENTOS);

  if (!ws) {
    Logger.log('❌ Hoja no encontrada');
    return;
  }

  // Leer headers actuales
  const headers = ws.getRange(1, 1, 1, ws.getLastColumn()).getValues()[0];
  Logger.log('Headers actuales: ' + headers.join(', '));

  // Verificar si falta columna 'id'
  if (headers.indexOf('id') === -1) {
    Logger.log('⚠️  Columna "id" no encontrada. Agregándola...');

    // Insertar columna 'id' al inicio
    ws.insertColumnBefore(1);
    ws.getRange(1, 1).setValue('id').setFontWeight('bold').setBackground('#0f9d58').setFontColor('#ffffff');

    // Generar IDs para todas las filas existentes
    const numFilas = ws.getLastRow() - 1; // Sin contar header
    if (numFilas > 0) {
      const ids = [];
      for (var i = 0; i < numFilas; i++) {
        ids.push([Utilities.getUuid()]);
      }
      ws.getRange(2, 1, numFilas, 1).setValues(ids);
      Logger.log('✅ Agregados ' + numFilas + ' IDs');
    }
  }

  // Verificar otras columnas útiles
  const columnasUtiles = ['creado_por', 'fecha_creacion', 'modificado_por', 'fecha_modificacion'];
  columnasUtiles.forEach(function(col) {
    if (headers.indexOf(col) === -1) {
      Logger.log('ℹ️  Columna "' + col + '" no encontrada (opcional, se puede agregar manualmente)');
    }
  });

  Logger.log('✅ Verificación completada');
}

// =================================================================================
// FUNCIONES DE PRUEBA
// =================================================================================
function testGetAlojamientos() {
  const alojamientos = getSheetData(SHEETS.ALOJAMIENTOS);
  Logger.log('Total alojamientos: ' + alojamientos.length);
  Logger.log(alojamientos[0]);
}

function testMapData() {
  const e = { parameter: { action: 'getMapData' } };
  const result = doGet(e);
  Logger.log(result.getContent());
}

function testParseCoordenadas() {
  const test1 = parseCoordenadas('-28.472570592785047, -65.78672579338392');
  Logger.log('Test 1:', test1);

  const test2 = parseCoordenadas('invalido');
  Logger.log('Test 2:', test2);
}

function testColumnas() {
  const alojamientos = getSheetData(SHEETS.ALOJAMIENTOS);

  Logger.log('========================================');
  Logger.log('TEST DE LECTURA DE COLUMNAS');
  Logger.log('========================================');
  Logger.log('Total alojamientos: ' + alojamientos.length);

  if (alojamientos.length > 0) {
    Logger.log('');
    Logger.log('--- PRIMER ALOJAMIENTO ---');
    var primer = alojamientos[0];

    Logger.log('Headers disponibles:');
    for (var key in primer) {
      Logger.log('  "' + key + '" = ' + primer[key]);
    }

    Logger.log('');
    Logger.log('--- TEST getMapData ---');
    var e = { parameter: { action: 'getMapData' } };
    var result = doGet(e);
    var data = JSON.parse(result.getContent());

    Logger.log('Success: ' + data.success);
    Logger.log('Total items: ' + (data.data ? data.data.length : 0));

    if (data.data && data.data.length > 0) {
      Logger.log('Primer item del mapa:');
      Logger.log(JSON.stringify(data.data[0], null, 2));
    }

    Logger.log('');
    Logger.log('--- TEST getAlojamientos (mapeado) ---');
    var e2 = { parameter: { action: 'getAlojamientos' } };
    var result2 = doGet(e2);
    var data2 = JSON.parse(result2.getContent());

    if (data2.data && data2.data.length > 0) {
      Logger.log('Primer alojamiento mapeado:');
      Logger.log('  nombre: ' + data2.data[0].nombre);
      Logger.log('  tipo: ' + data2.data[0].tipo);
      Logger.log('  direccion: ' + data2.data[0].direccion);
      Logger.log('  coordenadas: ' + data2.data[0].coordenadas);
    }
  }

  Logger.log('========================================');
}

function testMapeo() {
  Logger.log('========================================');
  Logger.log('TEST DE MAPEO DE CAMPOS');
  Logger.log('========================================');

  // Test 1: Mapear desde datos limpios a Sheet
  var datosLimpios = {
    id: 'test-123',
    nombre: 'Test Alojamiento',
    tipo: 'Casa',
    direccion: 'Av. Test 123',
    coordenadas: '-28.469, -65.779',
    habitaciones: 3,
    plazas: 6,
    creado_por: 'test_user'
  };

  Logger.log('--- Datos limpios originales ---');
  Logger.log(JSON.stringify(datosLimpios, null, 2));

  var datosMapeadosASheet = mapearCamposASheet(datosLimpios);
  Logger.log('');
  Logger.log('--- Datos mapeados para Sheet ---');
  Logger.log(JSON.stringify(datosMapeadosASheet, null, 2));

  // Test 2: Mapear desde Sheet a datos limpios
  var datosDesdeSheet = mapearCamposDesdeSheet(datosMapeadosASheet);
  Logger.log('');
  Logger.log('--- Datos mapeados de vuelta a limpio ---');
  Logger.log(JSON.stringify(datosDesdeSheet, null, 2));

  Logger.log('');
  Logger.log('Verificar que los valores se mantienen:');
  Logger.log('  nombre original: ' + datosLimpios.nombre);
  Logger.log('  nombre final: ' + datosDesdeSheet.nombre);
  Logger.log('  Match: ' + (datosLimpios.nombre === datosDesdeSheet.nombre ? 'SI' : 'NO'));

  Logger.log('========================================');
}
