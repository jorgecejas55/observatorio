/**
 * GOOGLE APPS SCRIPT — CATU BOT ANALYTICS
 * Observatorio de Turismo Municipal — SFVC
 *
 * Proyecto propio (separado de metricas-webredes-api) con planilla propia.
 * Sincroniza las conversaciones del panel de Catu a Google Sheets cada hora
 * y expone métricas pre-computadas vía Web App (doGet).
 *
 * PUESTA EN MARCHA (una sola vez, desde el editor):
 *   1. Ejecutar inicializar()  → crea hojas, genera el token, hace la carga
 *      inicial y activa la sincronización horaria. El token queda en el
 *      registro de ejecución: copiarlo a CATU_GAS_TOKEN (.env.local + Vercel).
 *   2. Desplegar como Aplicación web (Ejecutar como: Yo · Acceso: Cualquiera).
 *
 * Decisiones de datos:
 *   - Fechas siempre como TEXTO (formato '@') para evitar que Sheets las convierta.
 *   - El día de cada conversación se calcula en hora de Argentina (no UTC).
 *   - Sentimiento normalizado a Positivo / Neutral / Negativo / Sin dato.
 *   - Tópicos normalizados (mayúsculas, tildes, espacios); se muestra la
 *     variante más frecuente de cada uno.
 *   - "Sin dato" nunca se cuenta como 0.
 */

var CATU = {
  PANEL_URL: 'https://n8n.cc.gob.ar/webhook/panel-catu',
  SHEET_ID: '1mgMCJIL-VGWIMT6ymaNBCrplF9EKfQSBSMAnVeoARnk',
  TZ: 'America/Argentina/Catamarca',
  EMAIL_ALERTAS: 'jorgecejas55@gmail.com',
  HORAS_ENTRE_ALERTAS: 6,
  TOP_TOPICOS: 50,
  LOTE_ESCRITURA: 400,
  CACHE_SEG: 600,
  CACHE_KEY: 'catu_dashboard_v2'
};

var CATU_HOJAS = {
  CONV: 'conversaciones',
  TOPICOS: 'topicos',
  AGG_DIARIO: 'agg_diario',
  AGG_TOPICOS: 'agg_topicos',
  AGG_SENT: 'agg_sentimiento',
  AGG_TOP_DIA: 'agg_topicos_diario',
  LOG: 'log_sync'
};

// Columnas livianas primero (se leen en cada sync); textos pesados al final.
var CATU_HEADERS = {
  CONV: ['id', 'session_id', 'fecha', 'start_ts', 'end_ts', 'message_count',
         'conversation_score', 'is_resolved', 'needs_notification', 'missing_information',
         'sentimiento', 'sentimiento_original', 'notification_reason', 'conversation_title',
         'executive_summary', 'missing_information_details', 'sentiment_tags_json',
         'topicos_json', 'analysis_per_turn_json', 'synced_at'],
  TOPICOS: ['id_conv', 'fecha', 'anio', 'topico', 'topico_original', 'conversation_score', 'is_resolved'],
  AGG_DIARIO: ['fecha', 'conversaciones', 'mensajes_total', 'score_suma', 'score_n', 'score_prom',
               'resueltas', 'requieren_atencion', 'info_faltante',
               'sent_positivo', 'sent_neutral', 'sent_negativo', 'sent_sin_dato'],
  AGG_TOPICOS: ['anio', 'topico', 'total', 'resueltas', 'no_resueltas', 'score_prom', 'ultima_fecha'],
  AGG_SENT: ['anio', 'sentimiento', 'total', 'porcentaje'],
  AGG_TOP_DIA: ['fecha', 'topico', 'total', 'resueltas', 'score_suma', 'score_n'],
  LOG: ['timestamp', 'estado', 'total_panel', 'nuevos', 'actualizados', 'duracion_ms', 'error']
};

// Índices (0-based) en la hoja de conversaciones
var CC = {
  ID: 0, SESSION: 1, FECHA: 2, START: 3, END: 4, MSG: 5, SCORE: 6, RESUELTA: 7,
  ATENCION: 8, FALTANTE: 9, SENT: 10, SENT_ORIG: 11, NOTIF: 12, TITULO: 13,
  RESUMEN: 14, FALTANTE_DET: 15, TAGS: 16, TOPICOS: 17, ANALISIS: 18, SYNCED: 19
};
var CC_LIVIANAS = 11; // columnas A..K

// Columnas que se guardan como texto (1-based) por hoja
var CATU_COLS_TEXTO = {
  CONV: [2, 3, 4, 5, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
  TOPICOS: [2, 3, 4, 5],
  AGG_DIARIO: [1],
  AGG_TOPICOS: [1, 2, 7],
  AGG_SENT: [1, 2],
  AGG_TOP_DIA: [1, 2],
  LOG: [1, 2, 7]
};

// =================================================================================
// PUESTA EN MARCHA
// =================================================================================

function inicializar() {
  setupCatu();
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('CATU_TOKEN');
  if (!token) {
    token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
    props.setProperty('CATU_TOKEN', token);
    Logger.log('Token generado.');
  }
  Logger.log('CATU_GAS_TOKEN=' + token + '   ← copiar a .env.local y a Vercel');
  sincronizarCatu();
  crearTriggerCatu();
  Logger.log('inicializar() completado. Falta desplegar como Aplicación web.');
}

function setupCatu() {
  var ss = SpreadsheetApp.openById(CATU.SHEET_ID);
  for (var clave in CATU_HOJAS) {
    var nombre = CATU_HOJAS[clave];
    var hoja = ss.getSheetByName(nombre) || ss.insertSheet(nombre);
    var headers = CATU_HEADERS[clave];
    if (hoja.getLastRow() === 0) {
      hoja.getRange(1, 1, 1, headers.length).setValues([headers])
        .setFontWeight('bold').setBackground('#ea580c').setFontColor('#ffffff');
      hoja.setFrozenRows(1);
    }
    _formatoTexto(hoja, CATU_COLS_TEXTO[clave]);
  }
  // Borrar la hoja vacía por defecto si quedó
  var hoja1 = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1');
  if (hoja1 && ss.getSheets().length > 1 && hoja1.getLastRow() === 0) ss.deleteSheet(hoja1);
  Logger.log('setupCatu() completado');
}

function crearTriggerCatu() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'sincronizarCatu') {
      Logger.log('El trigger horario ya existe.');
      return;
    }
  }
  ScriptApp.newTrigger('sincronizarCatu').timeBased().everyHours(1).create();
  Logger.log('Trigger horario creado.');
}

// =================================================================================
// EXTRACCIÓN DEL PANEL
// =================================================================================

function catuDescargarPanel() {
  var resp = UrlFetchApp.fetch(CATU.PANEL_URL, { muteHttpExceptions: true, followRedirects: true });
  if (resp.getResponseCode() !== 200) {
    throw new Error('El panel de Catu devolvió status ' + resp.getResponseCode());
  }
  return catuExtraerConversaciones(resp.getContentText());
}

/** Extrae el array `conversationsData` del HTML respetando strings (corchetes dentro de textos). */
function catuExtraerConversaciones(html) {
  var m = /(?:const|let|var)\s+conversationsData\s*=\s*\[/.exec(html);
  if (!m) throw new Error('conversationsData no encontrado en el HTML del panel');
  var inicio = m.index + m[0].length - 1;
  var prof = 0, enString = false, escape = false, fin = -1;
  for (var i = inicio; i < html.length; i++) {
    var ch = html.charAt(i);
    if (enString) {
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === '"') enString = false;
      continue;
    }
    if (ch === '"') enString = true;
    else if (ch === '[') prof++;
    else if (ch === ']') { prof--; if (prof === 0) { fin = i; break; } }
  }
  if (fin === -1) throw new Error('No se encontró el cierre del array conversationsData');
  var datos = JSON.parse(html.substring(inicio, fin + 1));
  if (!Array.isArray(datos)) throw new Error('conversationsData no es un array');
  return datos;
}

// =================================================================================
// NORMALIZACIÓN
// =================================================================================

function _sinTildes(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function catuClaveTexto(s) {
  return _sinTildes(s).toLowerCase().replace(/\s+/g, ' ').replace(/^[\s"'.,;:¿?¡!-]+|[\s"'.,;:¿?¡!-]+$/g, '').trim();
}

var CATU_SENT_MAPA = {
  'positivo': 'Positivo', 'positive': 'Positivo', 'contento': 'Positivo', 'satisfecho': 'Positivo',
  'entusiasmado': 'Positivo', 'agradecido': 'Positivo', 'feliz': 'Positivo',
  'negativo': 'Negativo', 'negative': 'Negativo', 'frustrado': 'Negativo', 'frustrated': 'Negativo',
  'decepcionado': 'Negativo', 'enojado': 'Negativo', 'molesto': 'Negativo',
  'neutral': 'Neutral', 'neutro': 'Neutral', 'curioso': 'Neutral', 'confundido': 'Neutral',
  'directo': 'Neutral', 'mixto': 'Neutral', 'mixed': 'Neutral',
  'neutral a positivo': 'Neutral', 'neutral to positive': 'Neutral', 'neutral a negativo': 'Neutral'
};

function catuNormalizarSentimiento(valor) {
  if (valor === null || valor === undefined || typeof valor !== 'string') return 'Sin dato';
  var clave = catuClaveTexto(valor);
  return CATU_SENT_MAPA[clave] || 'Sin dato';
}

/** Fecha local yyyy-MM-dd (hora Argentina) a partir de un ISO UTC. */
function catuFechaLocal(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return Utilities.formatDate(d, CATU.TZ, 'yyyy-MM-dd');
}

function _texto(v) {
  if (v === null || v === undefined) return '';
  return typeof v === 'string' ? v : JSON.stringify(v);
}

function catuFilaConversacion(c, ahora) {
  var sent = c.user_sentiment || {};
  var topicos = Array.isArray(c.consulted_topics) ? c.consulted_topics : [];
  return [
    c.id,
    _texto(c.session_id),
    catuFechaLocal(c.start_timestamp),
    _texto(c.start_timestamp),
    _texto(c.end_timestamp),
    Number(c.message_count) || 0,
    (typeof c.conversation_score === 'number') ? c.conversation_score : '',
    c.is_resolved === true,
    c.needs_notification === true,
    c.missing_information === true,
    catuNormalizarSentimiento(sent.overall),
    _texto(sent.overall),
    _texto(c.notification_reason),
    _texto(c.conversation_title),
    _texto(c.executive_summary),
    _texto(c.missing_information_details || '{}'),
    JSON.stringify(Array.isArray(sent.tags) ? sent.tags : []),
    JSON.stringify(topicos),
    _texto(c.analysis_per_turn || {}).substring(0, 49000),
    ahora
  ];
}

// =================================================================================
// SINCRONIZACIÓN
// =================================================================================

function sincronizarCatu() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    Logger.log('sincronizarCatu: otra ejecución en curso');
    return;
  }
  var t0 = Date.now();
  var ss = SpreadsheetApp.openById(CATU.SHEET_ID);
  var hojaConv = ss.getSheetByName(CATU_HOJAS.CONV);
  var hojaLog = ss.getSheetByName(CATU_HOJAS.LOG);
  var estado = 'ok', errorMsg = '', nuevos = 0, actualizados = 0, totalPanel = 0;

  try {
    if (!hojaConv || !hojaLog) throw new Error('Faltan hojas: ejecutar setupCatu()');

    var conversaciones = catuDescargarPanel();
    totalPanel = conversaciones.length;
    var ahora = Utilities.formatDate(new Date(), CATU.TZ, "yyyy-MM-dd'T'HH:mm:ssXXX");

    // Existentes: solo columnas livianas
    var nExist = Math.max(hojaConv.getLastRow() - 1, 0);
    var existentes = nExist > 0 ? hojaConv.getRange(2, 1, nExist, CC_LIVIANAS).getValues() : [];
    var filaPorId = {};
    for (var i = 0; i < existentes.length; i++) filaPorId[String(existentes[i][CC.ID])] = i;

    var filasNuevas = [];
    var cambios = []; // { fila (0-based en existentes), datos }
    for (var j = 0; j < conversaciones.length; j++) {
      var c = conversaciones[j];
      if (c === null || c.id === undefined) continue;
      var fila = catuFilaConversacion(c, ahora);
      var idx = filaPorId[String(c.id)];
      if (idx === undefined) {
        filasNuevas.push(fila);
        filaPorId[String(c.id)] = -1; // evita duplicados dentro del mismo panel
      } else if (idx >= 0) {
        var e = existentes[idx];
        if (e[CC.SCORE] !== fila[CC.SCORE] || e[CC.RESUELTA] !== fila[CC.RESUELTA] ||
            e[CC.ATENCION] !== fila[CC.ATENCION] || e[CC.FALTANTE] !== fila[CC.FALTANTE] ||
            e[CC.SENT] !== fila[CC.SENT]) {
          cambios.push({ fila: idx, datos: fila });
        }
      }
    }

    // Altas en lotes
    var proxima = hojaConv.getLastRow() + 1;
    for (var k = 0; k < filasNuevas.length; k += CATU.LOTE_ESCRITURA) {
      var lote = filasNuevas.slice(k, k + CATU.LOTE_ESCRITURA);
      hojaConv.getRange(proxima, 1, lote.length, CATU_HEADERS.CONV.length).setValues(lote);
      proxima += lote.length;
    }
    nuevos = filasNuevas.length;

    // Actualizaciones (fila completa, por si cambió el análisis)
    for (var u = 0; u < cambios.length; u++) {
      hojaConv.getRange(cambios[u].fila + 2, 1, 1, CATU_HEADERS.CONV.length).setValues([cambios[u].datos]);
    }
    actualizados = cambios.length;

    SpreadsheetApp.flush();
    catuRecalcularAgregados(ss);
    CacheService.getScriptCache().remove(CATU.CACHE_KEY);
    Logger.log('Sync OK: ' + nuevos + ' nuevas, ' + actualizados + ' actualizadas, panel ' + totalPanel);
  } catch (err) {
    estado = 'error';
    errorMsg = String(err && err.stack ? err.stack : err).substring(0, 1000);
    Logger.log('ERROR sincronizarCatu: ' + errorMsg);
    _alertarError(errorMsg);
  } finally {
    if (hojaLog) {
      hojaLog.appendRow([
        Utilities.formatDate(new Date(), CATU.TZ, "yyyy-MM-dd'T'HH:mm:ssXXX"),
        estado, totalPanel, nuevos, actualizados, Date.now() - t0, errorMsg
      ]);
    }
    lock.releaseLock();
  }
}

function _alertarError(msg) {
  try {
    var props = PropertiesService.getScriptProperties();
    var ultima = Number(props.getProperty('CATU_ULTIMA_ALERTA') || 0);
    if (Date.now() - ultima < CATU.HORAS_ENTRE_ALERTAS * 3600 * 1000) return;
    MailApp.sendEmail(CATU.EMAIL_ALERTAS, '[Catu Analytics] Error en la sincronización', msg);
    props.setProperty('CATU_ULTIMA_ALERTA', String(Date.now()));
  } catch (e) {
    Logger.log('No se pudo enviar la alerta: ' + e);
  }
}

// =================================================================================
// AGREGADOS (se recalculan desde la planilla, no desde el panel)
// =================================================================================

function catuRecalcularAgregados(ss) {
  var hojaConv = ss.getSheetByName(CATU_HOJAS.CONV);
  var n = Math.max(hojaConv.getLastRow() - 1, 0);
  var liv = n > 0 ? hojaConv.getRange(2, 1, n, CC_LIVIANAS).getValues() : [];
  var tops = n > 0 ? hojaConv.getRange(2, CC.TOPICOS + 1, n, 1).getValues() : [];

  // ── Diario ──
  var dias = {};
  // ── Sentimiento por año ──
  var sent = { todos: {} };
  // ── Tópicos ──
  var filasTop = [];
  var topAgg = { todos: {} };
  var variantes = {}; // clave → { texto: cuenta }
  var topDia = {};    // fecha|clave → agregado

  for (var i = 0; i < liv.length; i++) {
    var r = liv[i];
    var fecha = String(r[CC.FECHA] || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) continue;
    var anio = fecha.substring(0, 4);
    var score = (r[CC.SCORE] === '' || r[CC.SCORE] === null) ? null : Number(r[CC.SCORE]);
    var resuelta = r[CC.RESUELTA] === true;

    var d = dias[fecha] || (dias[fecha] = { conv: 0, msg: 0, scoreSuma: 0, scoreN: 0, res: 0, aten: 0, falt: 0,
                                            sent: { 'Positivo': 0, 'Neutral': 0, 'Negativo': 0, 'Sin dato': 0 } });
    d.conv++;
    d.msg += Number(r[CC.MSG]) || 0;
    if (score !== null && !isNaN(score)) { d.scoreSuma += score; d.scoreN++; }
    if (resuelta) d.res++;
    if (r[CC.ATENCION] === true) d.aten++;
    if (r[CC.FALTANTE] === true) d.falt++;

    var s = String(r[CC.SENT] || 'Sin dato');
    if (!d.sent.hasOwnProperty(s)) s = 'Sin dato';
    d.sent[s]++;
    sent.todos[s] = (sent.todos[s] || 0) + 1;
    sent[anio] = sent[anio] || {};
    sent[anio][s] = (sent[anio][s] || 0) + 1;

    var lista = [];
    try { lista = JSON.parse(tops[i][0] || '[]'); } catch (e) { lista = []; }
    var vistos = {};
    for (var t = 0; t < lista.length; t++) {
      var original = String(lista[t] || '').trim();
      var clave = catuClaveTexto(original);
      if (!clave || vistos[clave]) continue; // un tópico cuenta una vez por conversación
      vistos[clave] = true;
      variantes[clave] = variantes[clave] || {};
      variantes[clave][original] = (variantes[clave][original] || 0) + 1;
      filasTop.push([r[CC.ID], fecha, anio, clave, original, score === null ? '' : score, resuelta]);
      var kd = fecha + '|' + clave;
      var td = topDia[kd] || (topDia[kd] = { fecha: fecha, clave: clave, total: 0, res: 0, scoreSuma: 0, scoreN: 0 });
      td.total++;
      if (resuelta) td.res++;
      if (score !== null && !isNaN(score)) { td.scoreSuma += score; td.scoreN++; }
      var ambitos = ['todos', anio];
      for (var a = 0; a < ambitos.length; a++) {
        var amb = ambitos[a];
        topAgg[amb] = topAgg[amb] || {};
        var x = topAgg[amb][clave] || (topAgg[amb][clave] = { total: 0, res: 0, scoreSuma: 0, scoreN: 0, ultima: '' });
        x.total++;
        if (resuelta) x.res++;
        if (score !== null && !isNaN(score)) { x.scoreSuma += score; x.scoreN++; }
        if (fecha > x.ultima) x.ultima = fecha;
      }
    }
  }

  // Texto a mostrar por tópico = variante más frecuente
  var mostrar = {};
  for (var cl in variantes) {
    var mejor = '', max = -1;
    for (var v in variantes[cl]) if (variantes[cl][v] > max) { max = variantes[cl][v]; mejor = v; }
    mostrar[cl] = mejor;
  }
  for (var f = 0; f < filasTop.length; f++) filasTop[f][3] = mostrar[filasTop[f][3]];

  // Escribir diario
  var filasDia = Object.keys(dias).sort().map(function (k) {
    var x = dias[k];
    return [k, x.conv, x.msg, x.scoreSuma, x.scoreN, x.scoreN ? Math.round(x.scoreSuma / x.scoreN * 10) / 10 : '',
            x.res, x.aten, x.falt, x.sent['Positivo'], x.sent['Neutral'], x.sent['Negativo'], x.sent['Sin dato']];
  });
  _reescribir(ss, 'AGG_DIARIO', filasDia);

  // Tópicos por día (para cualquier período en el tablero)
  var filasTopDia = Object.keys(topDia).sort().map(function (k) {
    var x = topDia[k];
    return [x.fecha, mostrar[x.clave], x.total, x.res, x.scoreSuma, x.scoreN];
  });
  _reescribir(ss, 'AGG_TOP_DIA', filasTopDia);

  // Escribir tópicos (detalle)
  _reescribir(ss, 'TOPICOS', filasTop);

  // Escribir top tópicos por ámbito
  var filasAggTop = [];
  Object.keys(topAgg).sort().forEach(function (amb) {
    var arr = Object.keys(topAgg[amb]).map(function (k) {
      var x = topAgg[amb][k];
      return [amb, mostrar[k], x.total, x.res, x.total - x.res,
              x.scoreN ? Math.round(x.scoreSuma / x.scoreN * 10) / 10 : '', x.ultima];
    });
    arr.sort(function (p, q) { return q[2] - p[2]; });
    filasAggTop = filasAggTop.concat(arr.slice(0, CATU.TOP_TOPICOS));
  });
  _reescribir(ss, 'AGG_TOPICOS', filasAggTop);

  // Escribir sentimiento por ámbito
  var orden = { 'Positivo': 0, 'Neutral': 1, 'Negativo': 2, 'Sin dato': 3 };
  var filasSent = [];
  Object.keys(sent).sort().forEach(function (amb) {
    var total = 0;
    for (var k in sent[amb]) total += sent[amb][k];
    Object.keys(sent[amb]).sort(function (p, q) { return (orden[p] ?? 9) - (orden[q] ?? 9); })
      .forEach(function (k) {
        filasSent.push([amb, k, sent[amb][k], total ? Math.round(sent[amb][k] / total * 1000) / 10 : 0]);
      });
  });
  _reescribir(ss, 'AGG_SENT', filasSent);
}

function _reescribir(ss, clave, filas) {
  var hoja = ss.getSheetByName(CATU_HOJAS[clave]) || ss.insertSheet(CATU_HOJAS[clave]);
  var headers = CATU_HEADERS[clave];
  hoja.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold').setBackground('#ea580c').setFontColor('#ffffff');
  var ultima = hoja.getLastRow();
  if (ultima > 1) hoja.getRange(2, 1, ultima - 1, Math.max(hoja.getLastColumn(), headers.length)).clearContent();
  _formatoTexto(hoja, CATU_COLS_TEXTO[clave]);
  for (var k = 0; k < filas.length; k += 2000) {
    var lote = filas.slice(k, k + 2000);
    hoja.getRange(k + 2, 1, lote.length, headers.length).setValues(lote);
  }
}

function _formatoTexto(hoja, cols) {
  if (!cols) return;
  var filas = Math.max(hoja.getMaxRows() - 1, 1);
  for (var i = 0; i < cols.length; i++) hoja.getRange(2, cols[i], filas, 1).setNumberFormat('@');
}

// =================================================================================
// WEB APP
// =================================================================================

function doGet(e) {
  try {
    var esperado = PropertiesService.getScriptProperties().getProperty('CATU_TOKEN');
    var recibido = (e && e.parameter && e.parameter.apiKey) || '';
    if (!esperado || recibido !== esperado) return _json({ success: false, error: 'No autorizado' });

    var accion = e.parameter.action || 'dashboard';
    if (accion === 'dashboard') return _json(catuDashboard());
    if (accion === 'estado_sync') return _json({ success: true, data: catuUltimoLog() });
    return _json({ success: false, error: 'Acción no reconocida: ' + accion });
  } catch (err) {
    Logger.log('ERROR doGet: ' + err);
    return _json({ success: false, error: 'Error interno: ' + err.message });
  }
}

function catuDashboard() {
  var cache = CacheService.getScriptCache();
  var enCache = cache.get(CATU.CACHE_KEY);
  if (enCache) return JSON.parse(enCache);

  var ss = SpreadsheetApp.openById(CATU.SHEET_ID);
  var serie = _objetos(ss.getSheetByName(CATU_HOJAS.AGG_DIARIO));
  var hojaTD = ss.getSheetByName(CATU_HOJAS.AGG_TOP_DIA);
  var topDia = hojaTD ? _objetos(hojaTD) : [];

  // Formato compacto: diccionarios de días y tópicos + filas numéricas
  var dias = [], idxDia = {}, nombres = [], idxTop = {}, filas = [];
  topDia.forEach(function (r) {
    var f = String(r.fecha), t = String(r.topico);
    if (!(f in idxDia)) { idxDia[f] = dias.length; dias.push(f); }
    if (!(t in idxTop)) { idxTop[t] = nombres.length; nombres.push(t); }
    filas.push([idxDia[f], idxTop[t], Number(r.total) || 0, Number(r.resueltas) || 0,
                Number(r.score_suma) || 0, Number(r.score_n) || 0]);
  });

  var log = catuUltimoLog();
  var respuesta = {
    success: true,
    version: 2,
    serie_diaria: serie.map(function (r) {
      return {
        fecha: String(r.fecha), conversaciones: Number(r.conversaciones) || 0,
        mensajes_total: Number(r.mensajes_total) || 0, score_suma: Number(r.score_suma) || 0,
        score_n: Number(r.score_n) || 0,
        resueltas: Number(r.resueltas) || 0, requieren_atencion: Number(r.requieren_atencion) || 0,
        info_faltante: Number(r.info_faltante) || 0,
        sent_positivo: Number(r.sent_positivo) || 0, sent_neutral: Number(r.sent_neutral) || 0,
        sent_negativo: Number(r.sent_negativo) || 0, sent_sin_dato: Number(r.sent_sin_dato) || 0
      };
    }),
    topicos_diarios: { dias: dias, nombres: nombres, filas: filas },
    ultima_sync: log ? String(log.timestamp) : null,
    ultima_sync_estado: log ? String(log.estado) : null
  };
  try { cache.put(CATU.CACHE_KEY, JSON.stringify(respuesta), CATU.CACHE_SEG); } catch (e) { /* >100 KB: sin caché */ }
  return respuesta;
}

function catuUltimoLog() {
  var hoja = SpreadsheetApp.openById(CATU.SHEET_ID).getSheetByName(CATU_HOJAS.LOG);
  var ultima = hoja.getLastRow();
  if (ultima < 2) return null;
  var h = CATU_HEADERS.LOG, v = hoja.getRange(ultima, 1, 1, h.length).getValues()[0], o = {};
  for (var i = 0; i < h.length; i++) o[h[i]] = v[i];
  return o;
}

function _objetos(hoja) {
  var datos = hoja.getDataRange().getValues();
  if (datos.length < 2) return [];
  var h = datos[0];
  return datos.slice(1).map(function (fila) {
    var o = {};
    for (var i = 0; i < h.length; i++) o[h[i]] = fila[i];
    return o;
  });
}

function _json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
