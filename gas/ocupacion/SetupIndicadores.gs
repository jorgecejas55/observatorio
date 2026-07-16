// ==============================================================================
// SETUP INDICADORES.GS — Ejecutar UNA VEZ para crear la hoja IndicadoresOH
// ==============================================================================
// Instrucciones:
// 1. Abrir el editor de Apps Script del proyecto Ocupacion
// 2. Pegar este archivo (o copiar solo la función setupIndicadoresOH)
// 3. Ejecutar setupIndicadoresOH()
// 4. Verificar en el spreadsheet que aparezca la hoja "IndicadoresOH" con headers
// 5. Eliminar este archivo (o comentarlo) después de ejecutar
// ==============================================================================

function setupIndicadoresOH() {
  var ss = SpreadsheetApp.openById('1Nhm3mT1WoqP6aIeNC2dSweOU4plfCevGe2IMWHYwxro');

  // Verificar si ya existe
  var existing = ss.getSheetByName('IndicadoresOH');
  if (existing) {
    Logger.log('⚠️ La hoja "IndicadoresOH" ya existe. No se creó una nueva.');
    Logger.log('Columnas actuales: ' + existing.getLastColumn());
    return;
  }

  // Crear hoja al final
  var ws = ss.insertSheet('IndicadoresOH');

  // Headers (25 columnas: 20 originales + metadata U-Y)
  var headers = [
    'RelevamientoID',
    'FechaCalculo',
    'OHPonderada',
    'OHMediaSimple',
    'OHMediana',
    'OHMediaRecortada',
    'NRecortados',
    'OHMin',
    'OHMax',
    'OHModa',
    'DesvioEstandar',
    'CoefVariacion',
    'CantidadRelevados',
    'BajaActividadCant',
    'BajaActividadPct',
    'UmbralBajaActividad',
    'Cobertura',
    'HabRelevadas',
    'HabOcupadas',
    'DatosJSON',
    'Origen',
    'TipoPeriodo',
    'Nombre',
    'FechaInicio',
    'FechaFin'
  ];

  // Escribir headers
  ws.appendRow(headers);

  // Formatear: negrita, fondo azul, texto blanco, frozen
  ws.getRange(1, 1, 1, 25)
    .setFontWeight('bold')
    .setBackground('#4285f4')
    .setFontColor('#ffffff');

  ws.setFrozenRows(1);

  // Auto-ajustar ancho de columnas (mínimo razonable)
  ws.autoResizeColumns(1, 25);

  Logger.log('✅ Hoja "IndicadoresOH" creada exitosamente con 25 columnas');
  Logger.log('Headers: ' + headers.join(' | '));
  Logger.log('');
  Logger.log('Siguientes pasos:');
  Logger.log('1. Desplegar > Nueva implementación > Aplicación web');
  Logger.log('2. Ejecutar como: Yo');
  Logger.log('3. Acceso: Cualquier persona');
  Logger.log('4. Copiar la nueva URL de la web app');
  Logger.log('5. No olvidar eliminar o comentar este archivo setup');
}
