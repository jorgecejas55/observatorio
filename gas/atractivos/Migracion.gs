// ==============================================================================
// MIGRACION.GS — Volcado one-shot del histórico legacy a la hoja "Histórico".
// Se ejecuta a mano desde el editor (NO son endpoints). Las planillas legacy
// SOLO se leen; nunca se modifican.
//
// Flujo obligatorio:
//   1. verificarHeadersLegacy()        → loguea los headers reales (con JSON.stringify)
//   2. Comparar contra MAPEO_LEGACY (Config.gs) y corregir el mapeo si difiere
//   3. migrarHistoricoCasaPuna() / migrarHistoricoPuebloPerdido()  (sin argumentos)
//   4. Para actividades especiales: verificarActividadesLegacy() → migrarActividadesHistorico()
//
// La escritura es MASIVA (setValues en chunks), no appendRow por fila:
// evita el "Exceeded maximum execution time" con planillas legacy grandes.
// Antes de escribir se reemplazan SOLO las filas del mismo `origen` → volver a
// correr es seguro (no duplica filas si una corrida anterior se cortó por
// timeout) y una migración no pisa a la otra sobre la misma hoja Histórico.
// ==============================================================================

/** Loguea los headers reales de cada hoja legacy (paso previo obligatorio). */
function verificarHeadersLegacy() {
  Object.keys(LEGACY).forEach(function (a) {
    try {
      var hoja = SpreadsheetApp.openById(LEGACY[a].spreadsheetId).getSheetByName(LEGACY[a].hoja);
      if (!hoja) {
        Logger.log('⚠️ [legacy ' + a + '] hoja no encontrada: ' + LEGACY[a].hoja);
        return;
      }
      var headers = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0];
      Logger.log('[legacy ' + a + '] headers = ' + JSON.stringify(headers));
    } catch (e) {
      Logger.log('⚠️ [legacy ' + a + '] ERROR al leer: ' + e.toString());
    }
  });

  Logger.log('Luego correr verificarActividadesLegacy() para la planilla de actividades.');
}

/** Loguea los headers de la planilla legacy de actividades especiales (por gid). */
function verificarActividadesLegacy() {
  var hoja = abrirHojaLegacyPorGid(LEGACY_ACTIVIDADES);
  if (!hoja) {
    Logger.log('⚠️ No se encontró la hoja con gid ' + LEGACY_ACTIVIDADES.gid);
    return;
  }
  var headers = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0];
  Logger.log('[legacy actividades] headers = ' + JSON.stringify(headers));
}

/** Abre la hoja legacy por gid (los nombres pueden no coincidir). */
function abrirHojaLegacyPorGid(legacy) {
  var ss = SpreadsheetApp.openById(legacy.spreadsheetId);
  var hojas = ss.getSheets();
  for (var i = 0; i < hojas.length; i++) {
    if (hojas[i].getSheetId() === legacy.gid) return hojas[i];
  }
  return null;
}

/**
 * Resuelve el mapeo clave interna → índice de columna (0-based) usando el
 * header LEGACY del mapeo. Se hace trim del header real: los legacy tienen
 * doble espacio final en algunas columnas. Nunca se altera la hoja real.
 */
function mapeoLegacyNormalizado(map, headersLegacy) {
  var limpios = headersLegacy.map(function (h) {
    return String(h).trim();
  });
  var resultado = {};
  for (var clave in map) {
    resultado[clave] = limpios.indexOf(map[clave]);
  }
  return resultado;
}

/**
 * Fecha legacy → 'yyyy-MM-dd', o '' si la celda no es una fecha real.
 * Es deliberadamente ESTRICTA: debajo de los datos, las hojas legacy tienen
 * bloques de resumen/pivot armados a mano ("Casa de la Puna | 555", "ene | 555").
 * Con una validación laxa esas filas entrarían al Histórico como si fueran
 * registros. Devolver '' hace que la fila se descarte.
 * Acepta Date (lo que devuelve Sheets con formato fecha) y texto d/M/yyyy o
 * yyyy-MM-dd.
 */
function fechaLegacyISO(valor) {
  if (valor instanceof Date && !isNaN(valor.getTime())) {
    return Utilities.formatDate(valor, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  var texto = String(valor == null ? '' : valor).trim();
  if (!texto) return '';

  var iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[1] + '-' + iso[2] + '-' + iso[3];

  var dmy = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmy) {
    var dia = dmy[1].length === 1 ? '0' + dmy[1] : dmy[1];
    var mes = dmy[2].length === 1 ? '0' + dmy[2] : dmy[2];
    return dmy[3] + '-' + mes + '-' + dia;
  }
  return '';
}

/**
 * Cantidad legacy → entero, o NaN si no hay número.
 * ⚠️ No usar parseInt directo: los totales grandes están cargados con separador
 * de miles ("1.546", "3.867") y parseInt('3.867') devuelve 3 — subconteo grave
 * y silencioso. Se eliminan puntos y espacios; la coma decimal se corta.
 */
function enteroLegacy(valor) {
  if (typeof valor === 'number') return Math.round(valor);
  var texto = String(valor == null ? '' : valor).trim();
  if (!texto) return NaN;
  texto = texto.replace(/[.\s]/g, '').split(',')[0];
  if (!/^\d+$/.test(texto)) return NaN;
  return parseInt(texto, 10);
}

/**
 * Escribe filas [fecha, cantidad_personas, origen] en Histórico de forma masiva.
 * - Reemplaza SOLO las filas cuyo `origen` coincide con el de esta migración y
 *   preserva las de otros orígenes: la hoja Histórico de Casa de la Puna recibe
 *   dos migraciones distintas (visitas guiadas y actividades especiales) y
 *   limpiar toda la hoja borraría la corrida anterior.
 * - Idempotente: volver a correr la misma migración no duplica filas.
 * - Setea formato de texto en las 3 columnas (fechas no se convierten a Date).
 * - Escribe por chunks de ≤ 8000 filas (límite de celdas por setValues).
 */
function escribirFilasHistorico(hoja, filas, origen) {
  if (!filas.length) return 0;

  // Filas ya existentes de OTROS orígenes: se conservan tal cual.
  var conservadas = [];
  var ultimaFila = hoja.getLastRow();
  if (ultimaFila > 1) {
    var previas = hoja.getRange(2, 1, ultimaFila - 1, 3).getValues();
    for (var p = 0; p < previas.length; p++) {
      var fechaPrevia = previas[p][0];
      if (fechaPrevia === '' || fechaPrevia === null) continue;
      if (String(previas[p][2]) === String(origen)) continue;
      conservadas.push([previas[p][0], previas[p][1], previas[p][2]]);
    }
    hoja.getRange(2, 1, ultimaFila - 1, 3).clearContent();
  }

  var todas = conservadas.concat(filas);

  var CHUNK = 8000;
  for (var i = 0; i < todas.length; i += CHUNK) {
    var bloque = todas.slice(i, i + CHUNK);
    var rango = hoja.getRange(2 + i, 1, bloque.length, 3);
    rango.setNumberFormat('@');
    rango.setValues(bloque);
  }
  return filas.length;
}

/** Migra visitas guiadas de la planilla legacy al Histórico del atractivo. */
function migrarHistorico(atractivo) {
  var legacy = LEGACY[atractivo];
  if (!legacy) throw new Error('atractivo_invalido: ' + atractivo);

  var hojaLegacy = SpreadsheetApp.openById(legacy.spreadsheetId).getSheetByName(legacy.hoja);
  if (!hojaLegacy) throw new Error('hoja_legacy_no_encontrada: ' + legacy.hoja);

  var headersLegacy = hojaLegacy.getRange(1, 1, 1, hojaLegacy.getLastColumn()).getValues()[0];
  var map = mapeoLegacyNormalizado(MAPEO_LEGACY[atractivo], headersLegacy);
  var fechaIdx = map['fecha'];
  var cantidadIdx = map['cantidad_personas'];

  if (fechaIdx < 0 || cantidadIdx < 0) {
    throw new Error(
      'No se encontraron las columnas esperadas (fecha=' + fechaIdx + ', cantidad=' + cantidadIdx +
      '). Correr verificarHeadersLegacy() y ajustar MAPEO_LEGACY en Config.gs.'
    );
  }

  var ultimaFila = hojaLegacy.getLastRow();
  if (ultimaFila <= 1) {
    Logger.log('⚠️ [migrarHistorico ' + atractivo + '] sin datos que migrar.');
    return { success: true, data: { migradas: 0 } };
  }

  // Leer TODO una sola vez y construir en memoria.
  var valores = hojaLegacy.getRange(2, 1, ultimaFila - 1, headersLegacy.length).getValues();
  var filas = [];
  var descartadas = 0;
  for (var r = 0; r < valores.length; r++) {
    // fechaLegacyISO/enteroLegacy son estrictas a propósito: descartan el bloque
    // de resumen manual que vive debajo de los datos y evitan que "1.546" se lea
    // como 1 (ver comentarios de los helpers).
    var fecha = fechaLegacyISO(valores[r][fechaIdx]);
    var cantidad = enteroLegacy(valores[r][cantidadIdx]);
    if (!fecha || isNaN(cantidad) || cantidad < 1) { descartadas++; continue; }
    filas.push([fecha, cantidad, legacy.origen]);
  }
  Logger.log('[migrarHistorico ' + atractivo + '] filas descartadas (resumen/vacías): ' + descartadas);

  var hojaHistorico = getSheetDe(atractivo, SHEETS.HISTORICO);
  var migradas = escribirFilasHistorico(hojaHistorico, filas, legacy.origen);

  // El total histórico está cacheado 6 h: sin esto el dashboard seguiría
  // mostrando el número previo a la migración durante horas.
  invalidarHistorico(atractivo);
  invalidarResumen(atractivo);

  Logger.log('✅ [migrarHistorico ' + atractivo + '] filas migradas: ' + migradas);
  return { success: true, data: { migradas: migradas } };
}

/**
 * Migra el histórico de actividades especiales (planilla 1iIO6ko…, gid).
 *
 * La hoja legacy NO es de un solo atractivo: la columna 'Atractivo' mezcla
 * Casa de la Puna, Pueblo Perdido y otros espacios que no son de este módulo
 * (Casa de SFVC, Dique el Jumeal, Seminario Diocesano…). Cada fila se rutea a
 * la hoja Histórico del atractivo que corresponde, y lo demás se descarta.
 *
 * ⚠️ Confirmar MAPEO_LEGACY_ACTIVIDADES con verificarActividadesLegacy() antes.
 */
function migrarActividadesHistorico() {
  var hojaLegacy = abrirHojaLegacyPorGid(LEGACY_ACTIVIDADES);
  if (!hojaLegacy) throw new Error('hoja_actividades_legacy_no_encontrada');

  var headersLegacy = hojaLegacy.getRange(1, 1, 1, hojaLegacy.getLastColumn()).getValues()[0];
  var map = mapeoLegacyNormalizado(MAPEO_LEGACY_ACTIVIDADES, headersLegacy);
  var fechaIdx = map['fecha'];
  var cantidadIdx = map['cantidad_personas'];
  var atractivoIdx = map['atractivo'];

  if (fechaIdx < 0 || cantidadIdx < 0 || atractivoIdx < 0) {
    throw new Error(
      'No se encontraron las columnas esperadas (fecha=' + fechaIdx +
      ', cantidad=' + cantidadIdx + ', atractivo=' + atractivoIdx +
      '). Headers reales: ' + JSON.stringify(headersLegacy) +
      ' — ajustar MAPEO_LEGACY_ACTIVIDADES en Config.gs.'
    );
  }

  var ultimaFila = hojaLegacy.getLastRow();
  if (ultimaFila <= 1) {
    Logger.log('⚠️ [migrarActividadesHistorico] sin datos que migrar.');
    return { success: true, data: { migradas: 0 } };
  }

  var valores = hojaLegacy.getRange(2, 1, ultimaFila - 1, headersLegacy.length).getValues();
  var porAtractivo = {};
  var descartadas = { fecha: 0, cantidad: 0, otroAtractivo: {} };

  for (var r = 0; r < valores.length; r++) {
    var fecha = fechaLegacyISO(valores[r][fechaIdx]);
    if (!fecha) { descartadas.fecha++; continue; }

    var cantidad = enteroLegacy(valores[r][cantidadIdx]);
    if (isNaN(cantidad) || cantidad < 1) { descartadas.cantidad++; continue; }

    var nombre = String(valores[r][atractivoIdx] || '').trim().toLowerCase();
    var atractivo = ATRACTIVO_LEGACY_NOMBRES[nombre];
    if (!atractivo) {
      descartadas.otroAtractivo[nombre] = (descartadas.otroAtractivo[nombre] || 0) + 1;
      continue;
    }

    if (!porAtractivo[atractivo]) porAtractivo[atractivo] = [];
    porAtractivo[atractivo].push([fecha, cantidad, LEGACY_ACTIVIDADES.origen]);
  }

  var total = 0;
  Object.keys(porAtractivo).forEach(function (atractivo) {
    var hoja = getSheetDe(atractivo, SHEETS.HISTORICO);
    var migradas = escribirFilasHistorico(hoja, porAtractivo[atractivo], LEGACY_ACTIVIDADES.origen);
    total += migradas;
    invalidarHistorico(atractivo);
    invalidarResumen(atractivo);
    Logger.log('✅ [migrarActividadesHistorico] ' + atractivo + ': ' + migradas + ' filas');
  });

  Logger.log(
    'Descartadas → sin fecha válida (incluye bloques de resumen): ' + descartadas.fecha +
    ' · sin cantidad válida: ' + descartadas.cantidad +
    ' · de otros espacios: ' + JSON.stringify(descartadas.otroAtractivo)
  );
  Logger.log('✅ [migrarActividadesHistorico] total migrado: ' + total);
  return { success: true, data: { migradas: total } };
}

// ── Wrappers sin argumentos (para correr desde el editor) ────────────────────
// El dropdown de Apps Script ejecuta la función seleccionada SIN argumentos,
// por eso migrarHistorico('casa-la-puna') no se puede correr directo con "Ejecutar".
// Usar estas: migrarHistoricoCasaPuna() / migrarHistoricoPuebloPerdido().

function migrarHistoricoCasaPuna() {
  return migrarHistorico('casa-la-puna');
}

function migrarHistoricoPuebloPerdido() {
  return migrarHistorico('pueblo-perdido');
}