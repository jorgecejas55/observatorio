// ==============================================================================
// SETUP.GS — Ejecutar UNA VEZ para crear las hojas de OBS_Admin
// ==============================================================================
// Instrucciones:
// 1. Crear un spreadsheet nuevo llamado "OBS_Admin" y copiar su ID en Config.gs
// 2. Crear proyecto de Apps Script y pegar Config.gs, Main.gs, Usuarios.gs y este archivo
// 3. Ejecutar setupObsAdmin() desde el editor (autorizar permisos)
// 4. Verificar en el spreadsheet: hojas "Usuarios" (con el admin sembrado) y "Auditoria"
// 5. Desplegar > Nueva implementación > Aplicación web
//    - Ejecutar como: Yo
//    - Acceso: Cualquier persona
// 6. Copiar la URL /exec → OBS_ADMIN_GAS_URL, y la API key de Config.gs →
//    OBS_ADMIN_GAS_API_KEY (en .env.local y Vercel)
// 7. Eliminar este archivo (o comentarlo) después de ejecutar
// ==============================================================================

// Email del super-admin a sembrar (debe coincidir con ADMIN_EMAIL de Next.js)
var SETUP_ADMIN_EMAIL = 'jorgecejas55@gmail.com';
var SETUP_ADMIN_NOMBRE = 'Jorge Cejas';

function setupObsAdmin() {
  var ss = getSpreadsheet();
  var dateTime = getCurrentDateTime();

  // ── Hoja Usuarios ───────────────────────────────────────────────────────────
  var wsUsuarios = ss.getSheetByName(CONFIG.SHEETS.USUARIOS);
  if (wsUsuarios) {
    Logger.log('⚠️ La hoja "Usuarios" ya existe. No se creó una nueva.');
  } else {
    wsUsuarios = ss.insertSheet(CONFIG.SHEETS.USUARIOS);

    var headersUsuarios = [
      'ID',
      'Email',
      'Nombre',
      'Rol',
      'Modulos',
      'Activo',
      'CreatedAt',
      'UpdatedAt'
    ];

    wsUsuarios.appendRow(headersUsuarios);

    wsUsuarios.getRange(1, 1, 1, headersUsuarios.length)
      .setFontWeight('bold')
      .setBackground('#4285f4')
      .setFontColor('#ffffff');

    wsUsuarios.setFrozenRows(1);

    // Sembrar al administrador como admin activo (anti-lockout inicial).
    // Rol admin no necesita módulos: tieneAcceso() devuelve true por rol.
    wsUsuarios.appendRow([
      1,
      SETUP_ADMIN_EMAIL,
      SETUP_ADMIN_NOMBRE,
      'admin',
      '',
      'TRUE',
      dateTime.datetime,
      dateTime.datetime
    ]);

    wsUsuarios.autoResizeColumns(1, headersUsuarios.length);
    Logger.log('✅ Hoja "Usuarios" creada con el admin sembrado: ' + SETUP_ADMIN_EMAIL);
  }

  // ── Hoja Auditoria ──────────────────────────────────────────────────────────
  var wsAuditoria = ss.getSheetByName(CONFIG.SHEETS.AUDITORIA);
  if (wsAuditoria) {
    Logger.log('⚠️ La hoja "Auditoria" ya existe. No se creó una nueva.');
  } else {
    wsAuditoria = ss.insertSheet(CONFIG.SHEETS.AUDITORIA);

    var headersAuditoria = ['Timestamp', 'Email', 'Accion', 'Detalle'];
    wsAuditoria.appendRow(headersAuditoria);

    wsAuditoria.getRange(1, 1, 1, headersAuditoria.length)
      .setFontWeight('bold')
      .setBackground('#4285f4')
      .setFontColor('#ffffff');

    wsAuditoria.setFrozenRows(1);
    wsAuditoria.autoResizeColumns(1, headersAuditoria.length);
    Logger.log('✅ Hoja "Auditoria" creada');
  }

  // Registrar el setup en auditoría
  logAudit('sistema', 'setup', 'setupObsAdmin ejecutado — admin sembrado: ' + SETUP_ADMIN_EMAIL);

  Logger.log('');
  Logger.log('Siguientes pasos:');
  Logger.log('1. Desplegar > Nueva implementación > Aplicación web');
  Logger.log('2. Ejecutar como: Yo / Acceso: Cualquier persona');
  Logger.log('3. Copiar URL /exec → OBS_ADMIN_GAS_URL (.env.local y Vercel)');
  Logger.log('4. API key de Config.gs → OBS_ADMIN_GAS_API_KEY');
  Logger.log('5. Verificar: <URL>?path=system/health&apiKey=<API_KEY>');
  Logger.log('6. Eliminar o comentar este archivo Setup.gs');
}
