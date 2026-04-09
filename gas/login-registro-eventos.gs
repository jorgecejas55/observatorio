/**
 * SERVICIO BACKEND EN GOOGLE SHEETS - VERSIÓN CORREGIDA
 * Copiar este código en un proyecto de Apps Script vinculado a tu hoja de cálculo.
 *
 * INSTRUCCIONES:
 * 1. Abrir tu Google Sheet
 * 2. Extensiones > Apps Script
 * 3. Pegar este código completo
 * 4. Ejecutar la función setup() UNA VEZ para crear las hojas con headers
 * 5. Desplegar > Nueva implementación > Tipo: Aplicación web
 *    - Ejecutar como: Yo
 *    - Acceso: Cualquier persona
 * 6. Copiar la URL de la web app y ponerla en VITE_APPS_SCRIPT_URL
 */

// NOMBRE DE LAS HOJAS
const SHEETS = {
  EVENTOS: 'eventos',
  USUARIOS: 'usuarios',
  CONFIG: 'config' // opcional
};

// =================================================================================
// FUNCIÓN DO GET (Manejo de lecturas)
// =================================================================================
function doGet(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const action = e.parameter.action;

    // 1. Obtener eventos (con filtros opcionales)
    if (action === 'getEventos') {
      const data = getSheetData(SHEETS.EVENTOS);
      return returnJSON({ success: true, data: data });
    }

    // 2. Login (verificar usuario)
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

    // 3. Dashboard de Eventos (estadísticas agregadas)
    if (action === 'getDashboardEventos') {
      const fechaDesde = e.parameter.fechaDesde || '';
      const fechaHasta = e.parameter.fechaHasta || '';
      const tipo = e.parameter.tipo || '';
      const origen = e.parameter.origen || '';

      // Intentar cache primero (5 minutos)
      const cacheKey = 'dash-eventos|' + fechaDesde + '|' + fechaHasta + '|' + tipo + '|' + origen;
      const cache = CacheService.getScriptCache();
      const cached = cache.get(cacheKey);

      if (cached) {
        return ContentService
          .createTextOutput(cached)
          .setMimeType(ContentService.MimeType.JSON);
      }

      // Calcular estadísticas
      const stats = calcularDashboardEventos(fechaDesde, fechaHasta, tipo, origen);

      // Guardar en cache (300 segundos = 5 minutos)
      const output = JSON.stringify(stats);
      cache.put(cacheKey, output, 300);

      return ContentService
        .createTextOutput(output)
        .setMimeType(ContentService.MimeType.JSON);
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

    // 1. Crear Evento
    if (action === 'createEvento') {
      const newEvent = createRow(SHEETS.EVENTOS, params.data);
      return returnJSON({ success: true, data: newEvent });
    }

    // 2. Actualizar Evento
    if (action === 'updateEvento') {
      const updatedEvent = updateRow(SHEETS.EVENTOS, params.id, params.data);
      return returnJSON({ success: true, data: updatedEvent });
    }

    // 3. Eliminar Evento
    if (action === 'deleteEvento') {
      const result = deleteRow(SHEETS.EVENTOS, params.id);
      return returnJSON({ success: true, message: 'Eliminado' });
    }

    // 4. Crear Usuario (Admin)
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

/** Verificar credenciales de usuario */
function verifyUser(email, password) {
  const users = getSheetData(SHEETS.USUARIOS);
  const user = users.find(u => u.email === email && u.password === password);

  if (user) {
    // No devolver password
    const { password, ...safeUser } = user;
    return safeUser;
  }
  return null;
}

/** Crear nueva fila */
function createRow(sheetName, dataObj) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ws = ss.getSheetByName(sheetName);

  if (!ws) throw new Error(`Hoja "${sheetName}" no encontrada`);

  // Asegurar ID
  if (!dataObj.id) {
    dataObj.id = Utilities.getUuid();
  }

  // Headers actuales
  const headers = ws.getRange(1, 1, 1, ws.getLastColumn()).getValues()[0];
  const newRow = [];

  headers.forEach(header => {
    // Convertir null/undefined a string vacío, mantener valores falsy como 0
    let value = dataObj[header];
    if (value === null || value === undefined) {
      value = '';
    }
    newRow.push(value);
  });

  // Log para debugging (opcional - comentar después de probar)
  Logger.log('Creating row with data: ' + JSON.stringify(dataObj));
  Logger.log('Headers: ' + JSON.stringify(headers));
  Logger.log('New row: ' + JSON.stringify(newRow));

  ws.appendRow(newRow);
  return dataObj;
}

/** Actualizar fila por ID */
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

  return { ...dataObj, id };
}

/** Eliminar fila por ID */
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
// CONFIGURACIÓN INICIAL (Ejecutar UNA VEZ para crear hojas y headers)
// =================================================================================
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // ============= HOJA EVENTOS =============
  let wsEventos = ss.getSheetByName(SHEETS.EVENTOS);
  if (!wsEventos) {
    wsEventos = ss.insertSheet(SHEETS.EVENTOS);
  }

  // Verificar si ya tiene headers
  if (wsEventos.getLastRow() === 0) {
    // TODOS los campos necesarios para el frontend (40 columnas)
    wsEventos.appendRow([
      'id',
      'estado',
      'fuente',
      'denominacion',
      'generador',
      'origen',
      'tipo',
      'subtipo',
      'sede',
      'tipo_sede',
      'fecha_inicio',
      'fecha_fin',
      'duracion',
      'periodicidad',
      'referente',
      'email',
      'telefono',
      'prioridad',
      'aprobacion_agenda',
      'solicita_asistencia',
      'detalles_asistencia_solicitada',
      'detalles_asistencia_asignada',
      'derivado',
      'detalles_derivacion',
      'presencia_fisica',
      'total_asistentes',
      'total_residentes',
      'total_no_residentes',
      'inversion_stde',
      'inversion_generador',
      'recaudacion',
      'observaciones',
      'creado_por',
      'fecha_creacion',
      'modificado_por',
      'fecha_modificacion'
    ]);

    // Formatear header
    wsEventos.getRange(1, 1, 1, 36).setFontWeight('bold').setBackground('#4285f4').setFontColor('#ffffff');
    wsEventos.setFrozenRows(1);

    Logger.log('✅ Hoja "eventos" creada con 36 columnas');
  } else {
    Logger.log('⚠️ Hoja "eventos" ya existe con datos');
  }

  // ============= HOJA USUARIOS =============
  let wsUsuarios = ss.getSheetByName(SHEETS.USUARIOS);
  if (!wsUsuarios) {
    wsUsuarios = ss.insertSheet(SHEETS.USUARIOS);
  }

  // Verificar si ya tiene headers
  if (wsUsuarios.getLastRow() === 0) {
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
      'admin@admin.com',
      '123456',
      'Admin',
      'User',
      'admin',
      new Date(),
      ''
    ]);

    Logger.log('✅ Hoja "usuarios" creada con usuario admin@admin.com / 123456');
  } else {
    Logger.log('⚠️ Hoja "usuarios" ya existe con datos');
  }

  // ============= HOJA CONFIG (Opcional) =============
  let wsConfig = ss.getSheetByName(SHEETS.CONFIG);
  if (!wsConfig) {
    wsConfig = ss.insertSheet(SHEETS.CONFIG);
    wsConfig.appendRow(['clave', 'valor']);
    wsConfig.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground('#fbbc04').setFontColor('#000000');
    wsConfig.setFrozenRows(1);
    Logger.log('✅ Hoja "config" creada');
  }

  Logger.log('========================================');
  Logger.log('✅ SETUP COMPLETADO');
  Logger.log('========================================');
  Logger.log('Siguiente paso:');
  Logger.log('1. Desplegar > Nueva implementación');
  Logger.log('2. Tipo: Aplicación web');
  Logger.log('3. Ejecutar como: Yo');
  Logger.log('4. Acceso: Cualquier persona');
  Logger.log('5. Copiar URL y agregarla a VITE_APPS_SCRIPT_URL');
  Logger.log('========================================');
}

// =================================================================================
// FUNCIONES DE DASHBOARD (Agregaciones y estadísticas)
// =================================================================================

/**
 * Calcula todas las estadísticas para el dashboard de eventos
 */
function calcularDashboardEventos(fechaDesde, fechaHasta, tipo, origen) {
  const todosLosEventos = getSheetData(SHEETS.EVENTOS);

  // Filtrar eventos según parámetros
  const eventosFiltrados = filtrarEventos(todosLosEventos, fechaDesde, fechaHasta, tipo, origen);

  // Calcular estadísticas
  const totalEventos = eventosFiltrados.length;
  const totalAsistentes = calcularTotalAsistentes(eventosFiltrados);
  const duracionMedia = calcularDuracionMedia(eventosFiltrados);

  // Series temporales
  const eventosPorMes = contarEventosPorMes(eventosFiltrados);
  const asistentesPorMes = contarAsistentesPorMes(eventosFiltrados);

  // Distribuciones porcentuales
  const porcentajesPorOrigen = calcularPorcentajes(eventosFiltrados, 'origen');
  const porcentajesPorTipo = calcularPorcentajes(eventosFiltrados, 'tipo');

  // Promedios por categoría
  const duracionPorTipo = calcularDuracionPromedioPorCategoria(eventosFiltrados, 'tipo');
  const duracionPorOrigen = calcularDuracionPromedioPorCategoria(eventosFiltrados, 'origen');

  // Asistentes por categoría (para gráficos radiales)
  const asistentesPorOrigen = calcularAsistentesPorCategoria(eventosFiltrados, 'origen');
  const asistentesPorTipo = calcularAsistentesPorCategoria(eventosFiltrados, 'tipo');

  return {
    success: true,
    total: totalEventos,
    totalAsistentes: totalAsistentes,
    duracionMedia: duracionMedia,
    eventosPorMes: eventosPorMes,
    asistentesPorMes: asistentesPorMes,
    porcentajesPorOrigen: porcentajesPorOrigen,
    porcentajesPorTipo: porcentajesPorTipo,
    duracionPorTipo: duracionPorTipo,
    duracionPorOrigen: duracionPorOrigen,
    asistentesPorOrigen: asistentesPorOrigen,
    asistentesPorTipo: asistentesPorTipo
  };
}

/**
 * Filtra eventos según parámetros de fecha, tipo y origen
 */
function filtrarEventos(eventos, fechaDesde, fechaHasta, tipo, origen) {
  return eventos.filter(function(evento) {
    // Filtro por fecha_inicio
    if (fechaDesde && evento.fecha_inicio && evento.fecha_inicio < fechaDesde) {
      return false;
    }
    if (fechaHasta && evento.fecha_inicio && evento.fecha_inicio > fechaHasta) {
      return false;
    }

    // Filtro por tipo
    if (tipo && evento.tipo !== tipo) {
      return false;
    }

    // Filtro por origen
    if (origen && evento.origen !== origen) {
      return false;
    }

    return true;
  });
}

/**
 * Calcula el total de asistentes sumando total_asistentes de todos los eventos
 */
function calcularTotalAsistentes(eventos) {
  return eventos.reduce(function(sum, evento) {
    const asistentes = parseInt(evento.total_asistentes) || 0;
    return sum + asistentes;
  }, 0);
}

/**
 * Calcula la duración media de los eventos en días
 */
function calcularDuracionMedia(eventos) {
  if (eventos.length === 0) return 0;

  const totalDias = eventos.reduce(function(sum, evento) {
    const duracion = parseFloat(evento.duracion) || 0;
    return sum + duracion;
  }, 0);

  return Math.round((totalDias / eventos.length) * 10) / 10; // 1 decimal
}

/**
 * Cuenta eventos por mes, retorna [{mes: 'YYYY-MM', cantidad: N}, ...]
 */
function contarEventosPorMes(eventos) {
  const conteo = {};

  eventos.forEach(function(evento) {
    if (!evento.fecha_inicio) return;

    // Extraer año-mes (YYYY-MM)
    const mes = evento.fecha_inicio.substring(0, 7);
    conteo[mes] = (conteo[mes] || 0) + 1;
  });

  // Convertir a array y ordenar por fecha
  const resultado = Object.keys(conteo).map(function(mes) {
    return { mes: mes, cantidad: conteo[mes] };
  });

  resultado.sort(function(a, b) {
    return a.mes.localeCompare(b.mes);
  });

  return resultado;
}

/**
 * Suma asistentes por mes, retorna [{mes: 'YYYY-MM', asistentes: N}, ...]
 */
function contarAsistentesPorMes(eventos) {
  const conteo = {};

  eventos.forEach(function(evento) {
    if (!evento.fecha_inicio) return;

    const mes = evento.fecha_inicio.substring(0, 7);
    const asistentes = parseInt(evento.total_asistentes) || 0;
    conteo[mes] = (conteo[mes] || 0) + asistentes;
  });

  const resultado = Object.keys(conteo).map(function(mes) {
    return { mes: mes, asistentes: conteo[mes] };
  });

  resultado.sort(function(a, b) {
    return a.mes.localeCompare(b.mes);
  });

  return resultado;
}

/**
 * Calcula porcentajes de eventos por una categoría (tipo u origen)
 * Retorna [{nombre: 'X', cantidad: N, porcentaje: P}, ...]
 */
function calcularPorcentajes(eventos, campo) {
  if (eventos.length === 0) return [];

  const conteo = {};

  eventos.forEach(function(evento) {
    const valor = evento[campo] || 'Sin especificar';
    conteo[valor] = (conteo[valor] || 0) + 1;
  });

  const total = eventos.length;
  const resultado = Object.keys(conteo).map(function(nombre) {
    const cantidad = conteo[nombre];
    const porcentaje = Math.round((cantidad / total) * 100 * 10) / 10; // 1 decimal
    return { nombre: nombre, cantidad: cantidad, porcentaje: porcentaje };
  });

  // Ordenar por cantidad descendente
  resultado.sort(function(a, b) {
    return b.cantidad - a.cantidad;
  });

  return resultado;
}

/**
 * Calcula duración promedio por categoría (tipo u origen)
 * Retorna [{nombre: 'X', duracion: D}, ...]
 */
function calcularDuracionPromedioPorCategoria(eventos, campo) {
  const sumas = {};
  const conteos = {};

  eventos.forEach(function(evento) {
    const nombre = evento[campo] || 'Sin especificar';
    const duracion = parseFloat(evento.duracion) || 0;

    sumas[nombre] = (sumas[nombre] || 0) + duracion;
    conteos[nombre] = (conteos[nombre] || 0) + 1;
  });

  const resultado = Object.keys(sumas).map(function(nombre) {
    const promedio = conteos[nombre] > 0
      ? Math.round((sumas[nombre] / conteos[nombre]) * 10) / 10
      : 0;
    return { nombre: nombre, duracion: promedio };
  });

  // Ordenar por duración descendente
  resultado.sort(function(a, b) {
    return b.duracion - a.duracion;
  });

  return resultado;
}

/**
 * Suma asistentes por categoría (tipo u origen)
 * Retorna [{nombre: 'X', asistentes: N}, ...]
 */
function calcularAsistentesPorCategoria(eventos, campo) {
  const sumas = {};

  eventos.forEach(function(evento) {
    const nombre = evento[campo] || 'Sin especificar';
    const asistentes = parseInt(evento.total_asistentes) || 0;
    sumas[nombre] = (sumas[nombre] || 0) + asistentes;
  });

  const resultado = Object.keys(sumas).map(function(nombre) {
    return { nombre: nombre, asistentes: sumas[nombre] };
  });

  // Ordenar por asistentes descendente
  resultado.sort(function(a, b) {
    return b.asistentes - a.asistentes;
  });

  return resultado;
}

// =================================================================================
// FUNCIÓN DE PRUEBA (opcional - para testing)
// =================================================================================
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