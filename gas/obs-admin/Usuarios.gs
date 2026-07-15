// ==============================================================================
// USUARIOS.GS — CRUD de usuarios y permisos por módulo (OBS_Admin)
// Email en lowercase es la clave de upsert. Modulos se persiste como CSV.
// ==============================================================================

/**
 * Normaliza un email: lowercase + trim. Devuelve '' si no es válido.
 */
function normalizarEmail(email) {
  if (!email || typeof email !== 'string') return '';
  return email.toLowerCase().trim();
}

/**
 * Convierte array de módulos → CSV para persistir.
 */
function modulosToCsv(modulos) {
  if (!modulos || !Array.isArray(modulos)) return '';
  return modulos
    .map(function (m) { return String(m).trim(); })
    .filter(function (m) { return m !== ''; })
    .join(',');
}

/**
 * Convierte CSV persistido → array de módulos.
 */
function csvToModulos(csv) {
  if (!csv || typeof csv !== 'string') return [];
  return csv
    .split(',')
    .map(function (m) { return m.trim(); })
    .filter(function (m) { return m !== ''; });
}

/**
 * Convierte una fila de Usuarios en objeto de respuesta (Modulos como array,
 * Activo como boolean).
 */
function usuarioRowToObject(headers, row) {
  var obj = rowToObject(headers, row);
  obj.Modulos = csvToModulos(String(obj.Modulos || ''));
  obj.Activo = String(obj.Activo).toUpperCase() === 'TRUE';
  return obj;
}

/**
 * Lista todos los usuarios (activos e inactivos — el panel muestra ambos).
 */
function getUsuarios() {
  var sheet = getSheet(CONFIG.SHEETS.USUARIOS);
  var data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    return { success: true, data: [], count: 0 };
  }

  var headers = data[0];
  var result = [];

  for (var i = 1; i < data.length; i++) {
    if (!data[i][CONFIG.COLS.USUARIOS.EMAIL]) continue;
    result.push(usuarioRowToObject(headers, data[i]));
  }

  return { success: true, data: result, count: result.length };
}

/**
 * Busca un usuario por email (normalizado). Devuelve data:null si no existe —
 * el consumidor (Next.js) decide el fail-closed.
 */
function getUsuarioByEmail(email) {
  var emailNorm = normalizarEmail(email);
  if (!emailNorm) {
    return { success: false, error: 'Email requerido' };
  }

  var sheet = getSheet(CONFIG.SHEETS.USUARIOS);
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var emailCol = CONFIG.COLS.USUARIOS.EMAIL;

  for (var i = 1; i < data.length; i++) {
    if (normalizarEmail(String(data[i][emailCol])) === emailNorm) {
      return { success: true, data: usuarioRowToObject(headers, data[i]) };
    }
  }

  return { success: true, data: null };
}

/**
 * Crea o actualiza un usuario (upsert por email normalizado).
 * data: { email, nombre, rol, modulos[], activo, actorEmail }
 */
function upsertUsuario(data) {
  var emailNorm = normalizarEmail(data.email);
  if (!emailNorm) {
    return { success: false, error: 'Email requerido' };
  }

  var rol = String(data.rol || 'operador').toLowerCase().trim();
  if (CONFIG.ROLES.indexOf(rol) === -1) {
    return { success: false, error: 'Rol inválido: ' + rol + '. Válidos: ' + CONFIG.ROLES.join(', ') };
  }

  var actorEmail = normalizarEmail(data.actorEmail) || 'sistema';
  var nombre = String(data.nombre || '').trim();
  var modulosCsv = modulosToCsv(data.modulos);
  var activo = data.activo === false ? 'FALSE' : 'TRUE';

  var sheet = getSheet(CONFIG.SHEETS.USUARIOS);
  var rows = sheet.getDataRange().getValues();
  var emailCol = CONFIG.COLS.USUARIOS.EMAIL;
  var dateTime = getCurrentDateTime();

  // Buscar fila existente (upsert)
  var existingRow = -1;
  for (var i = 1; i < rows.length; i++) {
    if (normalizarEmail(String(rows[i][emailCol])) === emailNorm) {
      existingRow = i + 1; // 1-based
      break;
    }
  }

  if (existingRow > 0) {
    // Actualizar fila existente (conserva ID y CreatedAt)
    sheet.getRange(existingRow, CONFIG.COLS.USUARIOS.NOMBRE + 1).setValue(nombre);
    sheet.getRange(existingRow, CONFIG.COLS.USUARIOS.ROL + 1).setValue(rol);
    sheet.getRange(existingRow, CONFIG.COLS.USUARIOS.MODULOS + 1).setValue(modulosCsv);
    sheet.getRange(existingRow, CONFIG.COLS.USUARIOS.ACTIVO + 1).setValue(activo);
    sheet.getRange(existingRow, CONFIG.COLS.USUARIOS.UPDATED_AT + 1).setValue(dateTime.datetime);

    logAudit(actorEmail, 'usuario_actualizado',
      'Actualizó ' + emailNorm + ' — rol: ' + rol + ', modulos: [' + modulosCsv + '], activo: ' + activo);

    return { success: true, email: emailNorm, message: 'Usuario actualizado exitosamente' };
  }

  // Insertar nuevo usuario
  var row = [];
  row[CONFIG.COLS.USUARIOS.ID] = getNextId(CONFIG.SHEETS.USUARIOS);
  row[CONFIG.COLS.USUARIOS.EMAIL] = emailNorm;
  row[CONFIG.COLS.USUARIOS.NOMBRE] = nombre;
  row[CONFIG.COLS.USUARIOS.ROL] = rol;
  row[CONFIG.COLS.USUARIOS.MODULOS] = modulosCsv;
  row[CONFIG.COLS.USUARIOS.ACTIVO] = activo;
  row[CONFIG.COLS.USUARIOS.CREATED_AT] = dateTime.datetime;
  row[CONFIG.COLS.USUARIOS.UPDATED_AT] = dateTime.datetime;

  sheet.appendRow(row);

  logAudit(actorEmail, 'usuario_creado',
    'Creó ' + emailNorm + ' — rol: ' + rol + ', modulos: [' + modulosCsv + '], activo: ' + activo);

  return { success: true, email: emailNorm, message: 'Usuario creado exitosamente' };
}

/**
 * Desactiva un usuario (soft-delete: Activo=FALSE). No borra la fila.
 */
function desactivarUsuario(email, actorEmail) {
  var emailNorm = normalizarEmail(email);
  if (!emailNorm) {
    return { success: false, error: 'Email requerido' };
  }

  var actor = normalizarEmail(actorEmail) || 'sistema';
  var sheet = getSheet(CONFIG.SHEETS.USUARIOS);
  var rows = sheet.getDataRange().getValues();
  var emailCol = CONFIG.COLS.USUARIOS.EMAIL;

  for (var i = 1; i < rows.length; i++) {
    if (normalizarEmail(String(rows[i][emailCol])) === emailNorm) {
      var rowNum = i + 1; // 1-based
      sheet.getRange(rowNum, CONFIG.COLS.USUARIOS.ACTIVO + 1).setValue('FALSE');
      sheet.getRange(rowNum, CONFIG.COLS.USUARIOS.UPDATED_AT + 1).setValue(getCurrentDateTime().datetime);

      logAudit(actor, 'usuario_desactivado', 'Desactivó ' + emailNorm);

      return { success: true, email: emailNorm, message: 'Usuario desactivado exitosamente' };
    }
  }

  return { success: false, error: 'Usuario no encontrado: ' + emailNorm };
}

/**
 * Registra una acción en la hoja Auditoria.
 */
function logAudit(email, accion, detalle) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.AUDITORIA);
    sheet.appendRow([
      getCurrentDateTime().datetime,
      email || 'sistema',
      accion || '',
      detalle || ''
    ]);
  } catch (e) {
    // La auditoría nunca debe romper la operación principal
    Logger.log('ERROR en logAudit: ' + e.toString());
  }
}
