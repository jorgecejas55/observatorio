// ==============================================================================
// SETUP.GS — Configuración inicial (ejecutar UNA VEZ en una planilla nueva
// para crear las hojas con headers). Idempotente: no toca hojas que ya
// tienen datos.
// ==============================================================================

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // ============= HOJA EVENTOS =============
  let wsEventos = ss.getSheetByName(SHEETS.EVENTOS);
  if (!wsEventos) {
    wsEventos = ss.insertSheet(SHEETS.EVENTOS);
  }

  if (wsEventos.getLastRow() === 0) {
    const headers = [
      'id', 'estado', 'fuente', 'denominacion', 'generador', 'origen', 'tipo',
      'subtipo', 'sede', 'tipo_sede', 'fecha_inicio', 'fecha_fin', 'duracion',
      'periodicidad', 'referente', 'email', 'telefono', 'prioridad',
      'aprobacion_agenda', 'solicita_asistencia', 'detalles_asistencia_solicitada',
      'detalles_asistencia_asignada', 'derivado', 'detalles_derivacion',
      'presencia_fisica', 'total_asistentes', 'total_residentes',
      'total_no_residentes', 'inversion_stde', 'inversion_generador',
      'recaudacion', 'observaciones', 'creado_por', 'fecha_creacion',
      'modificado_por', 'fecha_modificacion'
    ];
    wsEventos.appendRow(headers);
    wsEventos.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#4285f4').setFontColor('#ffffff');
    wsEventos.setFrozenRows(1);
    Logger.log('✅ Hoja "eventos" creada con ' + headers.length + ' columnas');
  } else {
    Logger.log('⚠️ Hoja "eventos" ya existe con datos — no se modifican headers');
  }

  // ============= HOJA USUARIOS =============
  let wsUsuarios = ss.getSheetByName(SHEETS.USUARIOS);
  if (!wsUsuarios) {
    wsUsuarios = ss.insertSheet(SHEETS.USUARIOS);
  }

  if (wsUsuarios.getLastRow() === 0) {
    wsUsuarios.appendRow(['id', 'email', 'password', 'nombre', 'apellido', 'rol', 'created_at', 'last_login']);
    wsUsuarios.getRange(1, 1, 1, 8).setFontWeight('bold').setBackground('#34a853').setFontColor('#ffffff');
    wsUsuarios.setFrozenRows(1);

    wsUsuarios.appendRow([Utilities.getUuid(), 'admin@admin.com', '123456', 'Admin', 'User', 'admin', new Date(), '']);
    Logger.log('✅ Hoja "usuarios" creada con usuario admin@admin.com / 123456');
  } else {
    Logger.log('⚠️ Hoja "usuarios" ya existe con datos — no se modifican headers');
  }

  // ============= HOJA CONFIG (opcional) =============
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
  Logger.log('Siguiente paso: Implementar > Administrar implementaciones >');
  Logger.log('Editar implementación (lápiz) > Versión: Nueva > Implementar.');
  Logger.log('Si la URL cambia, actualizar EVENTOS_SCRIPT_URL en .env.local y');
  Logger.log('reiniciar el servidor de desarrollo (Next no relee env en caliente).');
  Logger.log('========================================');
}
