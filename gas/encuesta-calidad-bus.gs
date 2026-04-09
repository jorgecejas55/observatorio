/* =============================================
   GOOGLE APPS SCRIPT - ENCUESTA BUS TURÍSTICO
   Sistema con control de duplicados por fingerprint
   VERSIÓN: 3.1 - Dual (HTML antiguo + Next.js)

   Acepta dos formatos de entrada:
   - JSON en e.postData.contents  → Next.js app (API Route)
   - FormData en e.parameter      → sistema HTML anterior (Vercel)
   Ambos sistemas funcionan en paralelo hasta dar de baja el HTML.
   ============================================= */

// ⚙️ CONFIGURACIÓN
const SPREADSHEET_ID = '1uAy6b0BKFqPmaiYbRaqkCwIVqzHVF79O4lHe3xVYrQI';
const SHEET_NAME = 'respuestas';
const HORAS_BLOQUEO = 48;

/**
 * Función principal que maneja las peticiones POST.
 * Los datos llegan como JSON en e.postData.contents.
 */
function doPost(e) {
  try {
    console.log('📥 Recibiendo petición...');

    // ── Parsear datos: JSON (Next.js) o FormData (sistema HTML anterior) ─────
    let data;
    try {
      data = JSON.parse(e.postData.contents);
      console.log('📋 Formato: JSON (Next.js)');
    } catch (_) {
      data = e.parameter;
      console.log('📋 Formato: FormData (sistema HTML)');
    }
    console.log('📋 Action:', data.action || '(envío encuesta)');

    // 1. Acceder a la hoja de cálculo
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      throw new Error(`Hoja "${SHEET_NAME}" no encontrada. Verificá el nombre exacto.`);
    }

    console.log('✅ Hoja encontrada:', sheet.getName());

    // 2. Inicializar encabezados si la hoja está vacía
    if (sheet.getLastRow() === 0) {
      console.log('📄 Hoja vacía - inicializando encabezados...');
      inicializarEncabezados(sheet);
    }

    const fingerprint = data.fingerprint_hash || '';

    // 3. Verificación de duplicado (check_duplicate)
    if (data.action === 'check_duplicate') {
      console.log('🔍 Petición de verificación de duplicado');
      console.log('🔐 Fingerprint:', fingerprint.substring(0, 16) + '...');

      const yaRespondio = verificarDuplicado(sheet, fingerprint);

      if (yaRespondio) {
        console.log('⚠️ Duplicado encontrado - bloqueando');
        return ContentService.createTextOutput(
          JSON.stringify({
            status: 'error',
            message: 'Ya ha completado esta encuesta recientemente.',
            code: 'DUPLICATE_RESPONSE'
          })
        ).setMimeType(ContentService.MimeType.JSON);
      } else {
        console.log('✅ No hay duplicado - puede continuar');
        return ContentService.createTextOutput(
          JSON.stringify({
            status: 'success',
            message: 'Puede responder la encuesta'
          })
        ).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // 4. Envío de encuesta completa
    console.log('📤 Procesando envío de encuesta completa');
    console.log('🔐 Fingerprint:', fingerprint.substring(0, 16) + '...');

    if (!fingerprint) {
      throw new Error('Fingerprint inválido o vacío');
    }

    // Verificar duplicado antes de guardar
    const yaRespondio = verificarDuplicado(sheet, fingerprint);
    if (yaRespondio) {
      console.log('⚠️ Fingerprint duplicado - rechazando envío');
      return ContentService.createTextOutput(
        JSON.stringify({
          status: 'error',
          message: 'Ya ha completado esta encuesta recientemente. Puede responder nuevamente después de 48 horas.',
          code: 'DUPLICATE_RESPONSE'
        })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // Guardar la respuesta
    console.log('✅ Respuesta válida - guardando datos...');
    guardarRespuesta(sheet, data);

    console.log('🎉 Respuesta guardada exitosamente');

    return ContentService.createTextOutput(
      JSON.stringify({
        status: 'success',
        message: 'Encuesta guardada exitosamente'
      })
    ).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error('❌ Error en doPost:', error.toString());
    return ContentService.createTextOutput(
      JSON.stringify({
        status: 'error',
        message: 'Error en el servidor: ' + error.message
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Inicializa los encabezados de la hoja (igual que v2 — compatibilidad con datos existentes)
 */
function inicializarEncabezados(sheet) {
  const encabezados = [
    'id', 'fingerprint_hash', 'ip_address', 'fecha_respuesta',
    'dia_viaje', 'dia_viaje_custom', 'circuito', 'circuito_custom',
    'puntualidad', 'limpieza', 'comodidad', 'audio',
    'guia_claridad', 'guia_conocimiento', 'guia_amabilidad', 'guia_consultas',
    'expectativas', 'duracion', 'calificacion_general',
    'que_gusto', 'que_mejorar', 'recomendaria',
    'created_at', 'updated_at'
  ];

  sheet.appendRow(encabezados);

  const headerRange = sheet.getRange(1, 1, 1, encabezados.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#0f4c94');
  headerRange.setFontColor('#FFFFFF');

  console.log('✅ Encabezados inicializados');
}

/**
 * Verifica si el fingerprint ya existe en las últimas 48 horas.
 * Busca en columna B (fingerprint_hash) y compara con columna D (fecha_respuesta).
 */
function verificarDuplicado(sheet, fingerprint) {
  try {
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return false;

    console.log(`🔍 Buscando duplicados en ${lastRow - 1} filas...`);

    const data = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
    const ahora = new Date();
    const limiteMs = HORAS_BLOQUEO * 60 * 60 * 1000;

    for (let i = data.length - 1; i >= 0; i--) {
      const fingerprintFila = String(data[i][1]).trim();
      const fechaFila = new Date(data[i][3]);

      if (fingerprintFila === fingerprint) {
        const diferenciaMs = ahora - fechaFila;
        const diferenciaHoras = diferenciaMs / (1000 * 60 * 60);

        console.log(`🔍 Fingerprint encontrado en fila ${i + 2} - hace ${diferenciaHoras.toFixed(1)} horas`);

        if (diferenciaMs < limiteMs) {
          console.log('⚠️ DUPLICADO detectado (< 48 horas)');
          return true;
        } else {
          console.log('✅ Respuesta antigua (> 48h) - permitiendo nueva respuesta');
          return false;
        }
      }
    }

    console.log('✅ Fingerprint no encontrado - primera respuesta de este dispositivo');
    return false;

  } catch (error) {
    console.error('❌ Error al verificar duplicado:', error);
    return false; // En caso de error, no bloquear
  }
}

/**
 * Guarda la respuesta en la hoja.
 * Mantiene el formato de la v2 (compatible con datos existentes en la planilla).
 */
function guardarRespuesta(sheet, data) {
  try {
    const id = generarUUID();
    const ahora = new Date();
    const fechaRespuesta = data.fecha_respuesta || ahora.toISOString();
    const createdAt = ahora.toISOString();

    const fila = [
      id,                                           // 1. id
      data.fingerprint_hash || '',                  // 2. fingerprint_hash
      data.ip_address || '',                        // 3. ip_address (vacío desde Next.js — aceptable)
      fechaRespuesta,                               // 4. fecha_respuesta
      data.dia_viaje || '',                         // 5. dia_viaje
      data.dia_viaje_custom || null,                // 6. dia_viaje_custom (no aplica en el form Next.js)
      data.circuito || '',                          // 7. circuito (ya resuelto en la página)
      data.circuito_custom || null,                 // 8. circuito_custom
      parseFloat(data.puntualidad) || 0,            // 9. puntualidad
      parseFloat(data.limpieza) || 0,               // 10. limpieza
      parseFloat(data.comodidad) || 0,              // 11. comodidad
      parseFloat(data.audio) || 0,                  // 12. audio
      parseFloat(data.guia_claridad) || 0,          // 13. guia_claridad
      parseFloat(data.guia_conocimiento) || 0,      // 14. guia_conocimiento
      parseFloat(data.guia_amabilidad) || 0,        // 15. guia_amabilidad
      parseFloat(data.guia_consultas) || 0,         // 16. guia_consultas
      data.expectativas || '',                      // 17. expectativas
      data.duracion || '',                          // 18. duracion
      parseFloat(data.calificacion_general) || 0,   // 19. calificacion_general
      data.que_gusto || null,                       // 20. que_gusto
      data.que_mejorar || null,                     // 21. que_mejorar
      data.recomendaria || '',                      // 22. recomendaria
      createdAt,                                    // 23. created_at
      createdAt,                                    // 24. updated_at
    ];

    console.log('💾 Guardando fila - ID:', id);
    sheet.appendRow(fila);
    console.log('✅ Fila guardada. Total filas:', sheet.getLastRow());

  } catch (error) {
    console.error('❌ Error al guardar respuesta:', error);
    throw error;
  }
}

/**
 * Genera un UUID v4
 */
function generarUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Función de prueba para verificar la configuración
 */
function testConfiguracion() {
  try {
    console.log('🧪 INICIANDO TEST DE CONFIGURACIÓN...');
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    console.log('✅ Conexión exitosa:', ss.getName());
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      console.log('❌ Hoja no encontrada. Hojas disponibles:');
      ss.getSheets().forEach(s => console.log('  -', s.getName()));
      return;
    }
    console.log('✅ Hoja encontrada. Filas:', sheet.getLastRow());
    console.log('🎉 Configuración OK — lista para recibir respuestas desde Next.js');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}
