// ==============================================================================
// CONFIG.GS — Configuración del módulo de Registro de Eventos Turísticos
//
// - Una sola planilla, dos hojas activas: "eventos" y "usuarios" (+ "config"
//   opcional, sin uso todavía).
// - La planilla es la ÚNICA fuente de datos del módulo (ya no hay sync con
//   Supabase — se dio de baja).
// - La hoja "eventos" tiene columnas heredadas de esa migración vieja
//   (synced_to_sheets, sheets_row_number, created_at, updated_at, created_by,
//   updated_by) que ya NO se usan. NO tocar/borrar esas columnas sin coordinar
//   con Jorge primero (ver CLAUDE.md raíz del proyecto): createRow/updateRow
//   leen los headers reales de la hoja en runtime, no una lista fija, así que
//   conviven sin romper nada.
// ==============================================================================

var SHEETS = {
  EVENTOS: 'eventos',
  USUARIOS: 'usuarios',
  CONFIG: 'config'
};

/** Respuesta JSON estándar. */
function returnJSON(object) {
  return ContentService
    .createTextOutput(JSON.stringify(object))
    .setMimeType(ContentService.MimeType.JSON);
}
